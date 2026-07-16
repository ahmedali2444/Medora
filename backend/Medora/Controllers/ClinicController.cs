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

[Route("api/clinic")]
[ApiController]
[Authorize(Roles = "doctor")]
public class ClinicController : ControllerBase
{
	private readonly AppDbContext _db;

	public ClinicController(AppDbContext db)
	{
		_db = db;
	}

	[HttpGet]
	public async Task<IActionResult> GetMyClinics()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		DoctorProfile doctor = await _db.DoctorProfiles.AsNoTracking().FirstOrDefaultAsync((DoctorProfile d) => d.UserId == userId);
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		return Ok(await (from c in _db.Clinics.AsNoTracking()
			where c.DoctorId == doctor.Id && c.IsActive
			select new ClinicSearchResultDto
			{
				ClinicId = c.Id,
				NameAr = c.NameAr,
				NameEn = c.NameEn,
				GovernorateAr = c.Governorate.NameAr,
				GovernorateEn = c.Governorate.NameEn,
				CityAr = ((c.City != null) ? c.City.NameAr : null),
				CityEn = ((c.City != null) ? c.City.NameEn : null),
				AddressLine = c.AddressLine,
				Phone = c.Phone,
				ConsultationFee = c.ConsultationFee,
				ReconsultationFee = c.ReconsultationFee,
				Latitude = c.Latitude,
				Longitude = c.Longitude,
				AppointmentDurationMinutes = c.AppointmentDurationMinutes,
				WorkingHours = c.WorkingHours.Select((ClinicWorkingHour h) => new ClinicWorkingHourDto
				{
					DayOfWeek = h.DayOfWeek,
					OpenFrom = h.OpenFrom,
					OpenTo = h.OpenTo,
					IsClosed = h.IsClosed
				})
			}).ToListAsync());
	}

	[HttpGet("{id:int}")]
	public async Task<IActionResult> GetClinic(int id)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		DoctorProfile doctor = await _db.DoctorProfiles.AsNoTracking().FirstOrDefaultAsync((DoctorProfile d) => d.UserId == userId);
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		ClinicSearchResultDto clinicSearchResultDto = await (from c in _db.Clinics.AsNoTracking()
			where c.Id == id && c.DoctorId == doctor.Id && c.IsActive
			select new ClinicSearchResultDto
			{
				ClinicId = c.Id,
				NameAr = c.NameAr,
				NameEn = c.NameEn,
				GovernorateAr = c.Governorate.NameAr,
				GovernorateEn = c.Governorate.NameEn,
				CityAr = ((c.City != null) ? c.City.NameAr : null),
				CityEn = ((c.City != null) ? c.City.NameEn : null),
				AddressLine = c.AddressLine,
				Phone = c.Phone,
				ConsultationFee = c.ConsultationFee,
				ReconsultationFee = c.ReconsultationFee,
				Latitude = c.Latitude,
				Longitude = c.Longitude,
				AppointmentDurationMinutes = c.AppointmentDurationMinutes,
				WorkingHours = c.WorkingHours.Select((ClinicWorkingHour h) => new ClinicWorkingHourDto
				{
					DayOfWeek = h.DayOfWeek,
					OpenFrom = h.OpenFrom,
					OpenTo = h.OpenTo,
					IsClosed = h.IsClosed
				})
			}).FirstOrDefaultAsync();
		if (clinicSearchResultDto == null)
		{
			return NotFound(new
			{
				message = "Clinic not found"
			});
		}
		return Ok(clinicSearchResultDto);
	}

	[HttpPost]
	public async Task<IActionResult> CreateClinic([FromBody] CreateClinicDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		if (!GeoLocation.HasValidPair(dto.Latitude, dto.Longitude))
		{
			return BadRequest(new
			{
				message = "Clinic location is required"
			});
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		DoctorProfile doctor = await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.UserId == userId);
		if (doctor == null)
		{
			return BadRequest(new
			{
				message = "Doctor profile not found"
			});
		}
		if (!(await _db.Governorates.AnyAsync((Governorate x) => x.Id == dto.GovernorateId && !x.IsArchived)))
		{
			return BadRequest(new
			{
				message = "Governorate not found"
			});
		}
		if (dto.CityId.HasValue && !(await _db.Cities.AnyAsync((City x) => x.Id == dto.CityId.Value && x.GovernorateId == dto.GovernorateId && !x.IsArchived)))
		{
			return BadRequest(new
			{
				message = "City not found in the selected governorate"
			});
		}
		Clinic clinic = new Clinic
		{
			DoctorId = doctor.Id,
			NameAr = dto.NameAr,
			NameEn = dto.NameEn,
			GovernorateId = dto.GovernorateId,
			CityId = dto.CityId,
			AddressLine = dto.AddressLine,
			Latitude = dto.Latitude,
			Longitude = dto.Longitude,
			Phone = dto.Phone,
			ConsultationFee = dto.ConsultationFee,
			ReconsultationFee = dto.ReconsultationFee,
			AppointmentDurationMinutes = ((dto.AppointmentDurationMinutes > 0) ? dto.AppointmentDurationMinutes : 15),
			IsActive = true,
			CreatedAt = DateTime.UtcNow,
			UpdatedAt = DateTime.UtcNow
		};
		if (dto.WorkingHours != null && dto.WorkingHours.Any())
		{
			foreach (ClinicWorkingHourDto workingHour in dto.WorkingHours)
			{
				clinic.WorkingHours.Add(new ClinicWorkingHour
				{
					DayOfWeek = workingHour.DayOfWeek,
					OpenFrom = workingHour.OpenFrom,
					OpenTo = workingHour.OpenTo,
					IsClosed = workingHour.IsClosed
				});
			}
		}
		_db.Clinics.Add(clinic);
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Clinic created successfully",
			clinicId = clinic.Id
		});
	}

	[HttpPut("{id:int}")]
	public async Task<IActionResult> UpdateClinic(int id, [FromBody] UpdateClinicDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		if (dto.Latitude.HasValue != dto.Longitude.HasValue)
		{
			return BadRequest(new
			{
				message = "Latitude and longitude must be updated together"
			});
		}
		if (dto.Latitude.HasValue && !GeoLocation.HasValidPair(dto.Latitude, dto.Longitude))
		{
			return BadRequest(new
			{
				message = "Clinic location must be valid coordinates"
			});
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		DoctorProfile doctor = await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.UserId == userId);
		if (doctor == null)
		{
			return BadRequest(new
			{
				message = "Doctor profile not found"
			});
		}
		Clinic clinic = await _db.Clinics.Include((Clinic c) => c.WorkingHours).FirstOrDefaultAsync((Clinic c) => c.Id == id && c.DoctorId == doctor.Id);
		if (clinic == null)
		{
			return NotFound(new
			{
				message = "Clinic not found"
			});
		}
		if (dto.GovernorateId.HasValue)
		{
			if (!(await _db.Governorates.AnyAsync((Governorate x) => x.Id == dto.GovernorateId.Value && !x.IsArchived)))
			{
				return BadRequest(new
				{
					message = "Governorate not found"
				});
			}
			clinic.GovernorateId = dto.GovernorateId.Value;
			clinic.CityId = null;
			if (dto.CityId.HasValue)
			{
				if (!(await _db.Cities.AnyAsync((City x) => x.Id == dto.CityId.Value && x.GovernorateId == clinic.GovernorateId && !x.IsArchived)))
				{
					return BadRequest(new
					{
						message = "City not found in the selected governorate"
					});
				}
				clinic.CityId = dto.CityId.Value;
			}
		}
		else if (dto.CityId.HasValue)
		{
			if (!(await _db.Cities.AnyAsync((City x) => x.Id == dto.CityId.Value && x.GovernorateId == clinic.GovernorateId && !x.IsArchived)))
			{
				return BadRequest(new
				{
					message = "City not found in the selected governorate"
				});
			}
			clinic.CityId = dto.CityId.Value;
		}
		if (dto.NameAr != null)
		{
			clinic.NameAr = dto.NameAr;
		}
		if (dto.NameEn != null)
		{
			clinic.NameEn = dto.NameEn;
		}
		if (dto.AddressLine != null)
		{
			clinic.AddressLine = dto.AddressLine;
		}
		if (dto.Phone != null)
		{
			clinic.Phone = dto.Phone;
		}
		if (dto.Latitude.HasValue)
		{
			clinic.Latitude = dto.Latitude;
		}
		if (dto.Longitude.HasValue)
		{
			clinic.Longitude = dto.Longitude;
		}
		if (dto.ConsultationFee.HasValue)
		{
			clinic.ConsultationFee = dto.ConsultationFee;
		}
		if (dto.ReconsultationFee.HasValue)
		{
			clinic.ReconsultationFee = dto.ReconsultationFee;
		}
		if (dto.AppointmentDurationMinutes.HasValue && dto.AppointmentDurationMinutes.Value > 0)
		{
			clinic.AppointmentDurationMinutes = dto.AppointmentDurationMinutes.Value;
		}
		if (dto.WorkingHours != null)
		{
			_db.ClinicWorkingHours.RemoveRange(clinic.WorkingHours);
			_db.ClinicWorkingHours.AddRange(dto.WorkingHours.Select((ClinicWorkingHourDto h) => new ClinicWorkingHour
			{
				ClinicId = clinic.Id,
				DayOfWeek = h.DayOfWeek,
				OpenFrom = h.OpenFrom,
				OpenTo = h.OpenTo,
				IsClosed = h.IsClosed
			}));
		}
		clinic.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Clinic updated successfully"
		});
	}

	[HttpDelete("{id:int}")]
	public async Task<IActionResult> DeleteClinic(int id)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		DoctorProfile doctor = await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.UserId == userId);
		if (doctor == null)
		{
			return BadRequest(new
			{
				message = "Doctor profile not found"
			});
		}
		Clinic clinic = await _db.Clinics.FirstOrDefaultAsync((Clinic c) => c.Id == id && c.DoctorId == doctor.Id);
		if (clinic == null)
		{
			return NotFound(new
			{
				message = "Clinic not found"
			});
		}
		clinic.IsActive = false;
		clinic.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Clinic deleted successfully"
		});
	}
}
