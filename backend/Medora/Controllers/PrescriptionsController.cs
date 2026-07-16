using System;
using System.CodeDom.Compiler;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Data;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Linq.Expressions;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.Mail;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.Versioning;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using System.Threading;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Google.Apis.Auth;
using Medora.Auth;
using Medora.DTOs;
using Medora.Data;
using Medora.Data.Models;
using Medora.Hubs;
using Medora.Middleware;
using Medora.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Microsoft.EntityFrameworkCore.Migrations.Operations.Builders;
using Microsoft.EntityFrameworkCore.Query;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

namespace Medora.Controllers;

[Route("api")]
[ApiController]
[Authorize]
public class PrescriptionsController : ControllerBase
{
	private readonly AppDbContext _db;

	public PrescriptionsController(AppDbContext db)
	{
		_db = db;
	}

	[Authorize(Roles = "doctor")]
	[HttpPost("prescriptions")]
	public async Task<IActionResult> Create([FromBody] CreatePrescriptionDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		if (dto.Items == null || dto.Items.Count == 0)
		{
			return BadRequest(new
			{
				message = "At least one prescription item is required"
			});
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		DoctorProfile doctor = await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.UserId == userId);
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		Appointment appointment = await _db.Appointments.FirstOrDefaultAsync((Appointment a) => a.Id == dto.AppointmentId && a.DoctorId == doctor.Id);
		if (appointment == null)
		{
			return NotFound(new
			{
				message = "Appointment not found"
			});
		}
		if (!PrescriptionWorkflow.CanCreateFromAppointment(appointment.Status, hasExistingPrescription: false))
		{
			return BadRequest(new
			{
				message = "Prescription can only be created for confirmed or completed appointments"
			});
		}
		IActionResult result;
		await using (IDbContextTransaction transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable))
		{
			bool hasExistingPrescription = await _db.Prescriptions.AnyAsync((Prescription p) => p.AppointmentId == (int?)appointment.Id);
			if (!PrescriptionWorkflow.CanCreateFromAppointment(appointment.Status, hasExistingPrescription))
			{
				result = Conflict(new
				{
					message = "Prescription already exists for this appointment"
				});
			}
			else
			{
				Prescription prescription = await BuildPrescriptionAsync(doctor.Id, appointment, dto.Diagnosis, dto.Notes, dto.Items);
				_db.Prescriptions.Add(prescription);
				if (appointment.Status != AppointmentStatus.Completed)
				{
					appointment.Status = AppointmentStatus.Completed;
					appointment.UpdatedAt = DateTime.UtcNow;
				}
				_db.Notifications.Add(new Notification
				{
					UserId = appointment.PatientUserId,
					Title = "New prescription",
					Body = "Your doctor added a new prescription",
					Type = "prescription",
					CreatedAt = DateTime.UtcNow
				});
				await _db.SaveChangesAsync();
				await transaction.CommitAsync();
				result = Ok(new
				{
					message = "Prescription created successfully",
					prescriptionId = prescription.Id,
					prescriptionNumber = prescription.PrescriptionNumber
				});
			}
		}
		return result;
	}

	[Authorize(Roles = "doctor")]
	[HttpPost("appointments/{appointmentId:int}/prescription")]
	public async Task<IActionResult> CreateForAppointment(int appointmentId, [FromBody] CreateAppointmentPrescriptionDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		if (dto.Items == null || dto.Items.Count == 0)
		{
			return BadRequest(new
			{
				message = "At least one prescription item is required"
			});
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		DoctorProfile doctor = await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.UserId == userId);
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		IActionResult result;
		await using (IDbContextTransaction transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable))
		{
			Appointment appointment = await _db.Appointments.FirstOrDefaultAsync((Appointment a) => a.Id == appointmentId && a.DoctorId == doctor.Id);
			if (appointment == null)
			{
				result = NotFound(new
				{
					message = "Appointment not found"
				});
			}
			else if (!PrescriptionWorkflow.IsAppointmentOwnedByDoctor(appointment, doctor.Id))
			{
				result = Forbid();
			}
			else
			{
				bool flag = await _db.Prescriptions.AnyAsync((Prescription p) => p.AppointmentId == (int?)appointment.Id);
				if (!PrescriptionWorkflow.CanCreateFromAppointment(appointment.Status, flag))
				{
					result = ((!flag) ? ((ObjectResult)BadRequest(new
					{
						message = "Prescription can only be created for confirmed or completed appointments"
					})) : ((ObjectResult)Conflict(new
					{
						message = "Prescription already exists for this appointment"
					})));
				}
				else
				{
					Prescription prescription = await BuildPrescriptionAsync(doctor.Id, appointment, dto.Diagnosis, dto.Notes, dto.Items);
					_db.Prescriptions.Add(prescription);
					if (appointment.Status != AppointmentStatus.Completed)
					{
						appointment.Status = AppointmentStatus.Completed;
						appointment.UpdatedAt = DateTime.UtcNow;
					}
					_db.Notifications.Add(new Notification
					{
						UserId = appointment.PatientUserId,
						Title = "New prescription",
						Body = "Your doctor added a new prescription",
						Type = "prescription",
						CreatedAt = DateTime.UtcNow
					});
					await _db.SaveChangesAsync();
					await transaction.CommitAsync();
					result = Ok(new
					{
						message = "Prescription created successfully",
						prescriptionId = prescription.Id,
						prescriptionNumber = prescription.PrescriptionNumber,
						appointmentId = appointment.Id,
						appointmentStatus = appointment.Status.ToString()
					});
				}
			}
		}
		return result;
	}

	[Authorize(Roles = "doctor")]
	[HttpGet("doctor/prescriptions")]
	public async Task<IActionResult> GetDoctorPrescriptions([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		int? doctorId = await _db.DoctorProfiles.Where((DoctorProfile d) => d.UserId == userId).Select((Expression<Func<DoctorProfile, int?>>)((DoctorProfile d) => d.Id)).FirstOrDefaultAsync();
		if (!doctorId.HasValue)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 100);
		IQueryable<Prescription> query = from p in _db.Prescriptions.AsNoTracking()
			where p.DoctorId == ((int?)doctorId).Value
			select p;
		if (!string.IsNullOrWhiteSpace(search))
		{
			string term = search.Trim();
			query = query.Where((Prescription p) => (p.PrescriptionNumber != null && p.PrescriptionNumber.Contains(term)) || (p.Patient.FullName != null && p.Patient.FullName.Contains(term)) || (p.Diagnosis != null && p.Diagnosis.Contains(term)));
		}
		DateTime weekStart = DateTime.UtcNow.AddDays(-7.0);
		DateTime monthStart = DateTime.UtcNow.AddDays(-30.0);
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			weekCount = await query.CountAsync((Prescription p) => p.CreatedAt >= weekStart),
			monthCount = await query.CountAsync((Prescription p) => p.CreatedAt >= monthStart),
			items = await (from p in query.OrderByDescending((Prescription p) => p.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = p.Id,
					PrescriptionNumber = p.PrescriptionNumber,
					AppointmentId = p.AppointmentId,
					PatientUserId = p.PatientUserId,
					PharmacyId = p.PharmacyId,
					patientName = p.Patient.FullName,
					appointment = ((p.Appointment == null) ? null : new
					{
						Id = p.Appointment.Id,
						ContactName = p.Appointment.ContactName,
						ContactPhone = p.Appointment.ContactPhone,
						ScheduledAt = p.Appointment.ScheduledAt,
						status = p.Appointment.Status.ToString(),
						Reason = p.Appointment.Reason,
						clinicName = ((p.Appointment.Clinic != null) ? p.Appointment.Clinic.NameAr : null)
					}),
					status = p.Status.ToString(),
					Diagnosis = p.Diagnosis,
					Notes = p.Notes,
					CreatedAt = p.CreatedAt,
					items = p.Items.Select((PrescriptionItem i) => new { i.Id, i.MedicineId, i.MedicineName, i.Dosage, i.Instructions, i.Quantity })
				}).ToListAsync()
		});
	}

	[Authorize]
	[HttpGet("patient/prescriptions")]
	public async Task<IActionResult> GetPatientPrescriptions([FromQuery] int page = 1, [FromQuery] int pageSize = 25, [FromQuery] string? search = null)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (userId == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 100);
		IQueryable<Prescription> query = from p in _db.Prescriptions.AsNoTracking()
			where p.PatientUserId == userId
			select p;
		if (!string.IsNullOrWhiteSpace(search))
		{
			string term = search.Trim().ToLowerInvariant();
			query = query.Where((Prescription p) => (p.Diagnosis != null && p.Diagnosis.ToLower().Contains(term)) || p.PrescriptionNumber.ToLower().Contains(term) || p.Items.Any((PrescriptionItem i) => i.MedicineName != null && i.MedicineName.ToLower().Contains(term)));
		}
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			items = await (from p in query.OrderByDescending((Prescription p) => p.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = p.Id,
					PrescriptionNumber = p.PrescriptionNumber,
					AppointmentId = p.AppointmentId,
					PatientUserId = p.PatientUserId,
					PharmacyId = p.PharmacyId,
					patientName = p.Patient.FullName,
					doctorName = p.Doctor.FullName,
					appointment = ((p.Appointment == null) ? null : new
					{
						Id = p.Appointment.Id,
						ContactName = p.Appointment.ContactName,
						ContactPhone = p.Appointment.ContactPhone,
						ScheduledAt = p.Appointment.ScheduledAt,
						status = p.Appointment.Status.ToString(),
						Reason = p.Appointment.Reason,
						clinicName = ((p.Appointment.Clinic != null) ? p.Appointment.Clinic.NameAr : null)
					}),
					status = p.Status.ToString(),
					Diagnosis = p.Diagnosis,
					Notes = p.Notes,
					CreatedAt = p.CreatedAt,
					items = p.Items.Select((PrescriptionItem i) => new { i.Id, i.MedicineId, i.MedicineName, i.Dosage, i.Instructions, i.Quantity })
				}).ToListAsync()
		});
	}

	[Authorize]
	[HttpGet("patient/prescriptions/{id:int}/pharmacies")]
	public async Task<IActionResult> GetPrescriptionPharmacies(int id, [FromQuery] decimal? lat, [FromQuery] decimal? lng)
	{
		if ((lat.HasValue || lng.HasValue) && !GeoLocation.HasValidPair(lat, lng))
		{
			return BadRequest(new
			{
				message = "Both lat and lng must be valid coordinates"
			});
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (userId == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		Prescription prescription = await _db.Prescriptions.AsNoTracking().Include((Prescription p) => p.Items).FirstOrDefaultAsync((Prescription p) => p.Id == id && p.PatientUserId == userId);
		if (prescription == null)
		{
			return NotFound(new
			{
				message = "Prescription not found"
			});
		}
		if (prescription.Status == PrescriptionStatus.Rejected)
		{
			return BadRequest(new
			{
				message = "Rejected prescriptions cannot be ordered"
			});
		}
		if (prescription.PharmacyId.HasValue)
		{
			return BadRequest(new
			{
				message = "This prescription has already been sent to a pharmacy"
			});
		}
		var list = (from i in prescription.Items
			where !i.MedicineId.HasValue
			select new { i.Id, i.MedicineName }).ToList();
		if (list.Count > 0)
		{
			return Ok(new
			{
				canOrder = false,
				message = "Some prescription medicines are not linked to the medicine catalogue",
				unmatchedItems = list,
				items = prescription.Items.Select((PrescriptionItem i) => new { i.MedicineId, i.MedicineName, i.Quantity }),
				pharmacies = Array.Empty<object>()
			});
		}
		Dictionary<int, int> requested = (from i in prescription.Items
			group i by i.MedicineId.Value).ToDictionary((IGrouping<int, PrescriptionItem> group) => group.Key, (IGrouping<int, PrescriptionItem> group) => group.Sum((PrescriptionItem i) => i.Quantity));
		List<int> medicineIds = requested.Keys.ToList();
		var pharmacies = (from record in await (from pm in _db.PharmacyMedicines.AsNoTracking()
				where pm.Pharmacy.IsActive && pm.IsAvailable && pm.Price.HasValue && !pm.Medicine.IsArchived && medicineIds.Contains(pm.MedicineId)
				select new
				{
					pharmacyId = pm.PharmacyId,
					pharmacyName = pm.Pharmacy.PharmacyName,
					AddressLine = pm.Pharmacy.AddressLine,
					cityAr = pm.Pharmacy.City.NameAr,
					cityEn = pm.Pharmacy.City.NameEn,
					Phone = pm.Pharmacy.Phone,
					OpenFrom = pm.Pharmacy.OpenFrom,
					OpenTo = pm.Pharmacy.OpenTo,
					Is24Hours = pm.Pharmacy.Is24Hours,
					status = pm.Pharmacy.Status,
					latitude = pm.Pharmacy.Latitude,
					longitude = pm.Pharmacy.Longitude,
					MedicineId = pm.MedicineId,
					medicineName = pm.Medicine.Name,
					Quantity = pm.Quantity,
					price = pm.Price.Value
				}).ToListAsync()
			group record by new
			{
				record.pharmacyId, record.pharmacyName, record.AddressLine, record.cityAr, record.cityEn, record.Phone, record.OpenFrom, record.OpenTo, record.Is24Hours, record.status,
				record.latitude, record.longitude
			} into @group
			where requested.All((KeyValuePair<int, int> required) => @group.Any(record => record.MedicineId == required.Key && (!record.Quantity.HasValue || record.Quantity.Value >= required.Value)))
			select new
			{
				pharmacyId = @group.Key.pharmacyId,
				pharmacyName = @group.Key.pharmacyName,
				AddressLine = @group.Key.AddressLine,
				cityAr = @group.Key.cityAr,
				cityEn = @group.Key.cityEn,
				Phone = @group.Key.Phone,
				OpenFrom = @group.Key.OpenFrom,
				OpenTo = @group.Key.OpenTo,
				Is24Hours = @group.Key.Is24Hours,
				status = @group.Key.status,
				latitude = @group.Key.latitude,
				longitude = @group.Key.longitude,
				distanceKm = GeoLocation.DistanceKm(lat, lng, @group.Key.latitude, @group.Key.longitude),
				subtotal = @group.Where(record => requested.ContainsKey(record.MedicineId)).Sum(record => record.price * (decimal)requested[record.MedicineId]),
				items = (from record in @group
					where requested.ContainsKey(record.MedicineId)
					select new
					{
						MedicineId = record.MedicineId,
						medicineName = record.medicineName,
						quantity = requested[record.MedicineId],
						price = record.price
					} into item
					orderby item.medicineName
					select item).ToList()
			} into pharmacy
			orderby pharmacy.distanceKm ?? double.MaxValue, pharmacy.pharmacyName
			select pharmacy).Take(30).ToList();
		return Ok(new
		{
			canOrder = true,
			items = prescription.Items.Select((PrescriptionItem i) => new { i.MedicineId, i.MedicineName, i.Quantity }),
			pharmacies = pharmacies
		});
	}

	[Authorize]
	[HttpGet("pharmacy/prescriptions")]
	public async Task<IActionResult> GetPharmacyPrescriptions([FromQuery] string? status, [FromQuery] string? search, [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
	{
		PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 100);
		IQueryable<Prescription> query = from p in _db.Prescriptions.AsNoTracking()
			where p.PharmacyId == (int?)pharmacy.Id
			select p;
		if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PrescriptionStatus>(status.Trim(), ignoreCase: true, out var parsedStatus))
		{
			query = query.Where((Prescription p) => p.Status == parsedStatus);
		}
		if (!string.IsNullOrWhiteSpace(search))
		{
			string value = search.Trim().ToLowerInvariant();
			query = query.Where((Prescription p) => p.PrescriptionNumber.ToLower().Contains(value) || (p.Patient != null && p.Patient.FullName != null && p.Patient.FullName.ToLower().Contains(value)) || (p.Doctor != null && p.Doctor.FullName != null && p.Doctor.FullName.ToLower().Contains(value)));
		}
		if (dateFrom.HasValue)
		{
			DateTime from = ClinicTimeZone.ToUtcFromClinicLocal(dateFrom.Value.Date);
			query = query.Where((Prescription p) => p.CreatedAt >= from);
		}
		if (dateTo.HasValue)
		{
			DateTime toExclusive = ClinicTimeZone.ToUtcFromClinicLocal(dateTo.Value.Date.AddDays(1.0));
			query = query.Where((Prescription p) => p.CreatedAt < toExclusive);
		}
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			items = await (from p in query.OrderByDescending((Prescription p) => p.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = p.Id,
					PrescriptionNumber = p.PrescriptionNumber,
					patientName = ((p.Patient != null) ? p.Patient.FullName : null),
					doctorName = ((p.Doctor != null) ? p.Doctor.FullName : null),
					status = p.Status.ToString(),
					Diagnosis = p.Diagnosis,
					Notes = p.Notes,
					CreatedAt = p.CreatedAt,
					items = p.Items.Select((PrescriptionItem i) => new { i.Id, i.MedicineId, i.MedicineName, i.Dosage, i.Instructions, i.Quantity })
				}).ToListAsync()
		});
	}

	[Authorize]
	[HttpPut("pharmacy/prescriptions/{id:int}/status")]
	public async Task<IActionResult> UpdatePharmacyPrescriptionStatus(int id, [FromBody] UpdatePrescriptionStatusDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		if (!OrderWorkflow.TryParsePrescriptionStatus(dto.Status, out var next))
		{
			return BadRequest(new
			{
				message = "Invalid prescription status"
			});
		}
		Prescription prescription = await _db.Prescriptions.FirstOrDefaultAsync((Prescription p) => p.Id == id && p.PharmacyId == (int?)pharmacy.Id);
		if (prescription == null)
		{
			return NotFound(new
			{
				message = "Prescription not found"
			});
		}
		if (!OrderWorkflow.CanTransition(prescription.Status, next))
		{
			return BadRequest(new
			{
				message = "Prescription status cannot be changed to the requested status"
			});
		}
		if (next == PrescriptionStatus.Rejected && await _db.MedicineOrders.AnyAsync((MedicineOrder o) => o.PrescriptionId == (int?)prescription.Id && o.Status != MedicineOrderStatus.Cancelled && o.Status != MedicineOrderStatus.Delivered))
		{
			return BadRequest(new
			{
				message = "Cannot reject a prescription with an active order"
			});
		}
		prescription.Status = next;
		prescription.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Prescription status updated successfully"
		});
	}

	private async Task<PharmacyProfile?> GetCurrentPharmacyAsync()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		return await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.UserId == userId);
	}

	private async Task<Prescription> BuildPrescriptionAsync(int doctorId, Appointment appointment, string diagnosis, string? notes, IEnumerable<CreatePrescriptionItemDto> items)
	{
		List<CreatePrescriptionItemDto> itemList = items.ToList();
		List<string> unlinkedNames = (from item in itemList
			where !item.MedicineId.HasValue
			select NormalizeMedicineName(item.MedicineName) into name
			where !string.IsNullOrEmpty(name)
			select name).Distinct().ToList();
		if (unlinkedNames.Count > 0)
		{
			Dictionary<string, int> dictionary = (from medicine in await (from medicine in _db.Medicines.AsNoTracking()
					where !medicine.IsArchived && unlinkedNames.Contains(medicine.NormalizedName)
					select new { medicine.Id, medicine.NormalizedName }).ToListAsync()
				group medicine by medicine.NormalizedName into @group
				where @group.Count() == 1
				select @group).ToDictionary(group => group.Key, group => group.Single().Id);
			foreach (CreatePrescriptionItemDto item in itemList.Where((CreatePrescriptionItemDto item) => !item.MedicineId.HasValue))
			{
				if (dictionary.TryGetValue(NormalizeMedicineName(item.MedicineName), out var value))
				{
					item.MedicineId = value;
				}
			}
		}
		Prescription prescription = new Prescription
		{
			PrescriptionNumber = GeneratePrescriptionNumber(),
			DoctorId = doctorId,
			PatientUserId = appointment.PatientUserId,
			AppointmentId = appointment.Id,
			Diagnosis = diagnosis.Trim(),
			Notes = notes?.Trim(),
			CreatedAt = DateTime.UtcNow,
			UpdatedAt = DateTime.UtcNow
		};
		foreach (CreatePrescriptionItemDto item2 in itemList)
		{
			prescription.Items.Add(new PrescriptionItem
			{
				MedicineId = item2.MedicineId,
				MedicineName = item2.MedicineName.Trim(),
				Dosage = item2.Dosage?.Trim(),
				Instructions = item2.Instructions?.Trim(),
				Quantity = item2.Quantity
			});
		}
		return prescription;
	}

	private static string NormalizeMedicineName(string? value)
	{
		return value?.Trim().ToLowerInvariant() ?? string.Empty;
	}

	private static string GeneratePrescriptionNumber()
	{
		int @int = RandomNumberGenerator.GetInt32(1000, 10000);
		return $"RX-{DateTime.UtcNow:yyyyMMddHHmmss}-{@int}";
	}
}
