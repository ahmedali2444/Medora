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

[Route("api/appointments")]
[ApiController]
[Authorize]
public class AppointmentsController : ControllerBase
{
	private sealed record BookedAppointmentSlot(DateTime ScheduledAt, int DurationMinutes);

	private readonly AppDbContext _db;

	private readonly INotificationDispatcher _notifications;

	private const int CancellationDeadlineHours = 24;

	public AppointmentsController(AppDbContext db, INotificationDispatcher notifications)
	{
		_db = db;
		_notifications = notifications;
	}

	[HttpPost]
	public async Task<IActionResult> Create([FromBody] CreateAppointmentDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string patientUserId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		DateTime scheduledAtUtc = dto.ScheduledAt.Kind switch
		{
			DateTimeKind.Utc => dto.ScheduledAt, 
			DateTimeKind.Local => dto.ScheduledAt.ToUniversalTime(), 
			_ => ClinicTimeZone.ToUtcFromClinicLocal(dto.ScheduledAt), 
		};
		if (scheduledAtUtc <= DateTime.UtcNow)
		{
			return BadRequest(new
			{
				message = "ScheduledAt must be in the future"
			});
		}
		DoctorProfile doctor = await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.Id == dto.DoctorId && d.IsActive);
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor not found"
			});
		}
		int slotMinutes = 15;
		Clinic clinic = await _db.Clinics.Include((Clinic c) => c.WorkingHours).FirstOrDefaultAsync((Clinic c) => c.Id == dto.ClinicId && c.DoctorId == dto.DoctorId && c.IsActive);
		if (clinic == null)
		{
			return BadRequest(new
			{
				message = "Clinic not found for this doctor"
			});
		}
		DateTime localScheduled = ClinicTimeZone.ToClinicLocal(scheduledAtUtc);
		byte dayOfWeek = (byte)localScheduled.DayOfWeek;
		ClinicWorkingHour clinicWorkingHour = clinic.WorkingHours.FirstOrDefault((ClinicWorkingHour h) => h.DayOfWeek == dayOfWeek);
		if (clinicWorkingHour == null || clinicWorkingHour.IsClosed || !clinicWorkingHour.OpenFrom.HasValue || !clinicWorkingHour.OpenTo.HasValue)
		{
			return BadRequest(new
			{
				message = "Clinic is closed on this day"
			});
		}
		TimeOnly timeOnly = TimeOnly.FromDateTime(localScheduled);
		slotMinutes = ((clinic.AppointmentDurationMinutes > 0) ? clinic.AppointmentDurationMinutes : 15);
		TimeOnly timeOnly2 = timeOnly.AddMinutes(slotMinutes);
		TimeOnly value = timeOnly;
		TimeOnly? openFrom = clinicWorkingHour.OpenFrom;
		if (!(value < openFrom))
		{
			value = timeOnly2;
			openFrom = clinicWorkingHour.OpenTo;
			if (!(value > openFrom))
			{
				DateTime slotEndUtc = scheduledAtUtc.AddMinutes(slotMinutes);
				IActionResult result;
				await using (IDbContextTransaction transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable))
				{
					var source = await (from a in _db.Appointments
						where a.Status != AppointmentStatus.Cancelled && a.ScheduledAt < slotEndUtc && a.ScheduledAt.AddMinutes(a.DurationMinutes) > scheduledAtUtc && (a.DoctorId == dto.DoctorId || a.PatientUserId == patientUserId)
						select new { a.DoctorId, a.PatientUserId, a.ScheduledAt, a.DurationMinutes }).ToListAsync();
					if (source.Any(a => a.DoctorId == dto.DoctorId && AppointmentWorkflow.Conflicts(a.ScheduledAt, a.DurationMinutes, scheduledAtUtc, slotMinutes)))
					{
						result = Conflict(new
						{
							message = "This appointment slot conflicts with another booking"
						});
					}
					else if (source.Any(a => a.PatientUserId == patientUserId && AppointmentWorkflow.Conflicts(a.ScheduledAt, a.DurationMinutes, scheduledAtUtc, slotMinutes)))
					{
						result = Conflict(new
						{
							message = "You already have an appointment at this time"
						});
					}
					else if (dto.IsReconsultation && !(await _db.Appointments.AnyAsync((Appointment a) => a.PatientUserId == patientUserId && a.DoctorId == dto.DoctorId && a.Status == AppointmentStatus.Completed)))
					{
						result = BadRequest(new
						{
							message = "لا يمكنك اختيار إعادة كشف لأنك لم تكشف عند هذا الطبيب من قبل."
						});
					}
					else
					{
						Appointment appointment = new Appointment
						{
							PatientUserId = patientUserId,
							DoctorId = dto.DoctorId,
							ClinicId = dto.ClinicId,
							ContactName = dto.ContactName.Trim(),
							ContactPhone = dto.ContactPhone.Trim(),
							ScheduledAt = scheduledAtUtc,
							DurationMinutes = slotMinutes,
							Reason = dto.Reason?.Trim(),
							IsReconsultation = dto.IsReconsultation,
							Status = AppointmentStatus.Pending,
							ConsultationFee = dto.IsReconsultation ? (clinic.ReconsultationFee ?? 0) : (clinic.ConsultationFee ?? 0),
							CreatedAt = DateTime.UtcNow,
							UpdatedAt = DateTime.UtcNow
						};
						_db.Appointments.Add(appointment);
						Notification doctorNotification = await _notifications.CreateForUserAsync(doctor.UserId, "appointment", (string lang) => NotificationMessages.AppointmentCreatedForDoctor(dto.ContactName.Trim(), localScheduled, lang));
						Notification patientNotification = await _notifications.CreateForUserAsync(patientUserId, "appointment", (string lang) => NotificationMessages.AppointmentCreatedForPatient(doctor.FullName, localScheduled, lang));
						_db.Notifications.Add(doctorNotification);
						_db.Notifications.Add(patientNotification);
						await _db.SaveChangesAsync();
						await transaction.CommitAsync();
						await _notifications.PublishAsync(doctorNotification, NotificationEmailPreference.NewAppointment);
						await _notifications.PublishAsync(patientNotification, NotificationEmailPreference.NewAppointment);
						result = Ok(new
						{
							message = "Appointment created successfully",
							appointmentId = appointment.Id
						});
					}
				}
				return result;
			}
		}
		return BadRequest(new
		{
			message = "ScheduledAt is outside clinic working hours"
		});
	}

	[HttpGet("check-previous")]
	public async Task<IActionResult> CheckPreviousAppointment([FromQuery] int doctorId)
	{
		string patientUserId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		int num = await _db.Appointments.CountAsync((Appointment a) => a.PatientUserId == patientUserId && a.DoctorId == doctorId && a.Status == AppointmentStatus.Completed);
		return Ok(new
		{
			hasPreviousAppointment = (num > 0),
			completedCount = num
		});
	}

	[AllowAnonymous]
	[HttpGet("available-slots")]
	public async Task<IActionResult> GetAvailableSlots([FromQuery] int doctorId, [FromQuery] int clinicId, [FromQuery] DateTime date)
	{
		DateTime dateLocal = ClinicTimeZone.ClinicLocalDate(date);
		Clinic clinic = await _db.Clinics.Include((Clinic c) => c.WorkingHours).FirstOrDefaultAsync((Clinic c) => c.Id == clinicId && c.DoctorId == doctorId && c.IsActive);
		if (clinic == null)
		{
			return NotFound(new
			{
				message = "Clinic not found for this doctor"
			});
		}
		byte dayOfWeek = (byte)dateLocal.DayOfWeek;
		ClinicWorkingHour workingHour = clinic.WorkingHours.FirstOrDefault((ClinicWorkingHour h) => h.DayOfWeek == dayOfWeek);
		if (workingHour == null || workingHour.IsClosed || !workingHour.OpenFrom.HasValue || !workingHour.OpenTo.HasValue)
		{
			return Ok(new List<AvailableTimeSlotDto>());
		}
		int slotDuration = ((clinic.AppointmentDurationMinutes > 0) ? clinic.AppointmentDurationMinutes : 15);
		DateTime dateStartUtc = ClinicTimeZone.ToUtcFromClinicLocal(dateLocal);
		DateTime dateEndUtc = ClinicTimeZone.ToUtcFromClinicLocal(dateLocal.AddDays(1.0));
		List<BookedAppointmentSlot> bookedAppointments = await (from a in _db.Appointments
			where a.DoctorId == doctorId && a.ScheduledAt >= dateStartUtc && a.ScheduledAt < dateEndUtc && a.Status != AppointmentStatus.Cancelled
			select new BookedAppointmentSlot(a.ScheduledAt, a.DurationMinutes)).ToListAsync();
		return Ok(BuildAvailableSlots(dateLocal, workingHour, slotDuration, bookedAppointments));
	}

	[AllowAnonymous]
	[HttpGet("available-schedule")]
	public async Task<IActionResult> GetAvailableSchedule([FromQuery] int doctorId, [FromQuery] int clinicId, [FromQuery] int days = 21)
	{
		days = Math.Clamp(days, 1, 31);
		Clinic clinic = await _db.Clinics.Include((Clinic c) => c.WorkingHours).FirstOrDefaultAsync((Clinic c) => c.Id == clinicId && c.DoctorId == doctorId && c.IsActive);
		if (clinic == null)
		{
			return NotFound(new
			{
				message = "Clinic not found for this doctor"
			});
		}
		DateTime startDateLocal = ClinicTimeZone.ToClinicLocal(DateTime.UtcNow).Date;
		DateTime endDateLocal = startDateLocal.AddDays(days);
		int slotDuration = ((clinic.AppointmentDurationMinutes > 0) ? clinic.AppointmentDurationMinutes : 15);
		List<BookedAppointmentSlot> bookedAppointments = await (from a in _db.Appointments
			where a.DoctorId == doctorId && a.ScheduledAt >= ClinicTimeZone.ToUtcFromClinicLocal(startDateLocal) && a.ScheduledAt < ClinicTimeZone.ToUtcFromClinicLocal(endDateLocal) && a.Status != AppointmentStatus.Cancelled
			select new BookedAppointmentSlot(a.ScheduledAt, a.DurationMinutes)).ToListAsync();
		List<AvailableAppointmentDateDto> list = new List<AvailableAppointmentDateDto>();
		DateTime dateTime = startDateLocal;
		while (dateTime < endDateLocal)
		{
			byte dayOfWeek = (byte)dateTime.DayOfWeek;
			ClinicWorkingHour clinicWorkingHour = clinic.WorkingHours.FirstOrDefault((ClinicWorkingHour h) => h.DayOfWeek == dayOfWeek);
			if (clinicWorkingHour != null && !clinicWorkingHour.IsClosed && clinicWorkingHour.OpenFrom.HasValue && clinicWorkingHour.OpenTo.HasValue)
			{
				List<AvailableTimeSlotDto> source = BuildAvailableSlots(dateTime, clinicWorkingHour, slotDuration, bookedAppointments);
				if (source.Any((AvailableTimeSlotDto slot) => slot.IsAvailable))
				{
					list.Add(new AvailableAppointmentDateDto
					{
						Date = dateTime.ToString("yyyy-MM-dd"),
						Slots = source.Where((AvailableTimeSlotDto slot) => slot.IsAvailable).ToList()
					});
				}
			}
			dateTime = dateTime.AddDays(1.0);
		}
		return Ok(list);
	}

	private static List<AvailableTimeSlotDto> BuildAvailableSlots(DateTime dateLocal, ClinicWorkingHour workingHour, int slotDuration, IEnumerable<BookedAppointmentSlot> bookedAppointments)
	{
		List<AvailableTimeSlotDto> list = new List<AvailableTimeSlotDto>();
		TimeOnly timeOnly = workingHour.OpenFrom.Value;
		TimeOnly value = workingHour.OpenTo.Value;
		while (timeOnly < value)
		{
			DateTime localDateTime = DateTime.SpecifyKind(dateLocal.Date.Add(timeOnly.ToTimeSpan()), DateTimeKind.Unspecified);
			DateTime slotDateTimeUtc = ClinicTimeZone.ToUtcFromClinicLocal(localDateTime);
			DateTime dateTime = slotDateTimeUtc.AddMinutes(slotDuration);
			TimeOnly timeOnly2 = timeOnly.AddMinutes(slotDuration);
			if (timeOnly2 > value)
			{
				break;
			}
			if (slotDateTimeUtc > DateTime.UtcNow)
			{
				bool isAvailable = !bookedAppointments.Any((BookedAppointmentSlot appointment) => AppointmentWorkflow.Conflicts(appointment.ScheduledAt, appointment.DurationMinutes, slotDateTimeUtc, slotDuration));
				list.Add(new AvailableTimeSlotDto
				{
					Time = timeOnly.ToString("HH:mm"),
					IsAvailable = isAvailable
				});
			}
			timeOnly = timeOnly.AddMinutes(slotDuration);
		}
		return list;
	}

	[HttpGet("me")]
	public async Task<IActionResult> GetMine([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] DateTime? dateFrom = null, [FromQuery] DateTime? dateTo = null, [FromQuery] DateTime? beforeDate = null, [FromQuery] string? status = null, [FromQuery] string? statuses = null, [FromQuery] string? search = null, [FromQuery] string? sort = null, [FromQuery] string? viewAs = null)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		HashSet<string> hashSet = (from r in base.User.FindAll("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
			select r.Value).ToHashSet<string>(StringComparer.OrdinalIgnoreCase);
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 500);
		IQueryable<Appointment> query = _db.Appointments.AsNoTracking();
		string text = viewAs?.Trim().ToLowerInvariant();
		if (text == "patient")
		{
			query = query.Where((Appointment a) => a.PatientUserId == userId);
		}
		else if (text == "doctor")
		{
			query = query.Where((Appointment a) => a.Doctor.UserId == userId);
		}
		else if (hashSet.Contains("doctor") && !hashSet.Contains("patient"))
		{
			query = query.Where((Appointment a) => a.Doctor.UserId == userId);
		}
		else if (hashSet.Contains("patient") || hashSet.Count == 0)
		{
			query = query.Where((Appointment a) => a.PatientUserId == userId);
		}
		else
		{
			if (!hashSet.Contains("doctor"))
			{
				return Forbid();
			}
			query = query.Where((Appointment a) => a.PatientUserId == userId);
		}
		if (dateFrom.HasValue)
		{
			DateTime from = ClinicTimeZone.ToUtcFromClinicLocal(dateFrom.Value.Date);
			query = query.Where((Appointment a) => a.ScheduledAt >= from);
		}
		if (dateTo.HasValue)
		{
			DateTime toExclusive = ClinicTimeZone.ToUtcFromClinicLocal(dateTo.Value.Date.AddDays(1.0));
			query = query.Where((Appointment a) => a.ScheduledAt < toExclusive);
		}
		if (beforeDate.HasValue)
		{
			DateTime before = ClinicTimeZone.ToUtcFromClinicLocal(beforeDate.Value.Date);
			query = query.Where((Appointment a) => a.ScheduledAt < before);
		}
		if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<AppointmentStatus>(status.Trim(), ignoreCase: true, out var parsedStatus))
		{
			query = query.Where((Appointment a) => a.Status == parsedStatus);
		}
		else if (!string.IsNullOrWhiteSpace(statuses))
		{
			List<AppointmentStatus> parsedStatuses = (from value in statuses.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
				select (!Enum.TryParse<AppointmentStatus>(value, ignoreCase: true, out var result)) ? ((AppointmentStatus?)null) : new AppointmentStatus?(result) into value
				where value.HasValue
				select value.Value).Distinct().ToList();
			if (parsedStatuses.Count > 0)
			{
				query = query.Where((Appointment a) => parsedStatuses.Contains(a.Status));
			}
		}
		if (!string.IsNullOrWhiteSpace(search))
		{
			string term = search.Trim().ToLowerInvariant();
			query = query.Where((Appointment a) => a.ContactName.ToLower().Contains(term) || (a.Reason != null && a.Reason.ToLower().Contains(term)) || (a.Clinic != null && ((a.Clinic.NameAr != null && a.Clinic.NameAr.ToLower().Contains(term)) || (a.Clinic.NameEn != null && a.Clinic.NameEn.ToLower().Contains(term)))));
		}
		int total = await query.CountAsync();
		var statusCounts = await (from a in query
			group a by a.Status into @group
			select new
			{
				status = @group.Key.ToString(),
				count = @group.Count()
			}).ToListAsync();
		IOrderedQueryable<Appointment> source = (string.Equals(sort, "asc", StringComparison.OrdinalIgnoreCase) ? query.OrderBy((Appointment a) => a.ScheduledAt) : query.OrderByDescending((Appointment a) => a.ScheduledAt));
		List<AppointmentItemDto> data = await (from a in source.Skip((page - 1) * pageSize).Take(pageSize)
			select new AppointmentItemDto
			{
				Id = a.Id,
				PatientUserId = a.PatientUserId,
				PatientName = a.ContactName,
				DoctorId = a.DoctorId,
				DoctorName = a.Doctor.FullName,
				DoctorAvatar = a.Doctor.ProfileImageUrl,
				DoctorSpecialty = ((a.Doctor.Specialty != null) ? a.Doctor.Specialty.NameAr : null),
				ClinicId = a.ClinicId,
				ClinicName = ((a.Clinic != null) ? a.Clinic.NameAr : null),
				ConsultationFee = a.ConsultationFee > 0 ? a.ConsultationFee : ((a.Clinic != null) ? a.Clinic.ConsultationFee : ((decimal?)null)),
				ReconsultationFee = ((a.Clinic != null) ? a.Clinic.ReconsultationFee : ((decimal?)null)),
				ContactPhone = a.ContactPhone,
				ScheduledAt = a.ScheduledAt,
				Status = a.Status.ToString(),
				Reason = a.Reason,
				Notes = a.Notes,
				IsReconsultation = a.IsReconsultation,
				HasReview = false,
				CreatedAt = a.CreatedAt
			}).ToListAsync();
		if (data.Count > 0)
		{
			List<int> appointmentIds = data.Select((AppointmentItemDto a) => a.Id).ToList();
			HashSet<int> hashSet2 = (await (from r in _db.Reviews.AsNoTracking()
				where r.AppointmentId.HasValue && appointmentIds.Contains(r.AppointmentId.Value) && !r.IsDeleted
				select r.AppointmentId.Value).Distinct().ToListAsync()).ToHashSet();
			foreach (AppointmentItemDto item in data)
			{
				item.HasReview = hashSet2.Contains(item.Id);
			}
		}
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = total,
			statusCounts = statusCounts,
			items = data
		});
	}

	[Authorize(Roles = "doctor")]
	[HttpPut("{id:int}/confirm")]
	public async Task<IActionResult> Confirm(int id, [FromBody] AppointmentActionDto? dto)
	{
		return await UpdateAppointmentStatus(id, AppointmentStatus.Confirmed, dto?.Notes, "Appointment confirmed");
	}

	[HttpPut("{id:int}/cancel")]
	public async Task<IActionResult> Cancel(int id, [FromBody] AppointmentActionDto? dto)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
		Appointment appointment = await _db.Appointments.Include((Appointment a) => a.Doctor).FirstOrDefaultAsync((Appointment a) => a.Id == id && (a.PatientUserId == userId || a.Doctor.UserId == userId));
		if (appointment == null)
		{
			return NotFound(new
			{
				message = "Appointment not found"
			});
		}
		if (appointment.Status == AppointmentStatus.Cancelled || appointment.Status == AppointmentStatus.Completed)
		{
			return BadRequest(new
			{
				message = "Appointment cannot be cancelled in its current status"
			});
		}
		if (!AppointmentWorkflow.CanTransition(appointment.Status, AppointmentStatus.Cancelled))
		{
			return BadRequest(new
			{
				message = "Appointment cannot be cancelled in its current status"
			});
		}
		bool flag = appointment.PatientUserId == userId;
		if (flag)
		{
			double totalHours = (appointment.ScheduledAt - DateTime.UtcNow).TotalHours;
			if (totalHours < 0)
			{
				return BadRequest(new
				{
					message = "Appointments cannot be cancelled after the scheduled time"
				});
			}
		}
		appointment.Status = AppointmentStatus.Cancelled;
		if (!string.IsNullOrWhiteSpace(dto?.Notes))
		{
			appointment.Notes = dto.Notes;
		}
		appointment.UpdatedAt = DateTime.UtcNow;
		DateTime scheduledLocal = ClinicTimeZone.ToClinicLocal(appointment.ScheduledAt);
		Notification notification;
		if (userId == appointment.PatientUserId)
		{
			notification = await _notifications.CreateForUserAsync(
				appointment.Doctor.UserId, 
				"appointment", 
				(string lang) => NotificationMessages.AppointmentCancelledForDoctor(appointment.ContactName, scheduledLocal, lang, appointment.Notes)
			);
		}
		else
		{
			notification = await _notifications.CreateForUserAsync(
				appointment.PatientUserId, 
				"appointment", 
				(string lang) => NotificationMessages.AppointmentCancelledForPatient(appointment.Doctor.FullName, scheduledLocal, lang, appointment.Notes)
			);
		}
		_db.Notifications.Add(notification);
		await _db.SaveChangesAsync();
		await transaction.CommitAsync();
		await _notifications.PublishAsync(notification, NotificationEmailPreference.Cancellations);
		return Ok(new
		{
			message = "Appointment cancelled successfully"
		});
	}

	[Authorize(Roles = "doctor")]
	[HttpPut("{id:int}/complete")]
	public async Task<IActionResult> Complete(int id, [FromBody] AppointmentActionDto? dto)
	{
		return await UpdateAppointmentStatus(id, AppointmentStatus.Completed, dto?.Notes, "Appointment completed");
	}

	private async Task<IActionResult> UpdateAppointmentStatus(int id, AppointmentStatus status, string? notes, string message)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable);
		Appointment appointment = await _db.Appointments.Include((Appointment a) => a.Doctor).FirstOrDefaultAsync((Appointment a) => a.Id == id && a.Doctor.UserId == userId);
		if (appointment == null)
		{
			return NotFound(new
			{
				message = "Appointment not found"
			});
		}
		if (!AppointmentWorkflow.CanTransition(appointment.Status, status))
		{
			return BadRequest(new
			{
				message = "Appointment status cannot be changed to the requested status"
			});
		}
		appointment.Status = status;
		if (!string.IsNullOrWhiteSpace(notes))
		{
			appointment.Notes = notes;
		}
		appointment.UpdatedAt = DateTime.UtcNow;
		DateTime scheduledLocal = ClinicTimeZone.ToClinicLocal(appointment.ScheduledAt);
		AppointmentStatus appointmentStatus = status;
		if ((appointmentStatus == AppointmentStatus.Confirmed || appointmentStatus == AppointmentStatus.Completed) ? true : false)
		{
			NotificationEmailPreference preference = ((status == AppointmentStatus.Confirmed) ? NotificationEmailPreference.NewAppointment : NotificationEmailPreference.Reminders);
			Notification patientNotification = await _notifications.CreateForUserAsync(appointment.PatientUserId, "appointment", (string lang) => (status != AppointmentStatus.Confirmed) ? NotificationMessages.AppointmentCompletedForPatient(appointment.Doctor.FullName, scheduledLocal, lang) : NotificationMessages.AppointmentConfirmedForPatient(appointment.Doctor.FullName, scheduledLocal, lang));
			_db.Notifications.Add(patientNotification);
			await _db.SaveChangesAsync();
			await transaction.CommitAsync();
			await _notifications.PublishAsync(patientNotification, preference);
			return Ok(new { message });
		}
		await _db.SaveChangesAsync();
		await transaction.CommitAsync();
		return Ok(new { message });
	}
}
