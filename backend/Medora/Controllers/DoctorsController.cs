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

[Route("api/doctors")]
[ApiController]
public class DoctorsController : ControllerBase
{
	private readonly AppDbContext _db;

	public DoctorsController(AppDbContext db)
	{
		_db = db;
	}

	[EnableRateLimiting("search")]
	[HttpGet("search")]
	public async Task<IActionResult> Search([FromQuery] DoctorSearchFilterDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		IQueryable<Clinic> query = from c in _db.Clinics.AsNoTracking()
			where c.IsActive && c.Doctor.IsActive
			select c;
		if (!string.IsNullOrWhiteSpace(dto.Name))
		{
			string name = dto.Name.Trim().ToLower().Replace("[", "[[]")
				.Replace("%", "[%]")
				.Replace("_", "[_]");
			query = query.Where((Clinic c) => EF.Functions.Like(c.Doctor.FullName.ToLower(), $"%{name}%") || EF.Functions.Like(c.Doctor.Specialty.NameAr.ToLower(), $"%{name}%") || (c.Doctor.Specialty.NameEn != null && EF.Functions.Like(c.Doctor.Specialty.NameEn.ToLower(), $"%{name}%")) || (c.NameAr != null && EF.Functions.Like(c.NameAr.ToLower(), $"%{name}%")) || (c.NameEn != null && EF.Functions.Like(c.NameEn.ToLower(), $"%{name}%")) || EF.Functions.Like(c.AddressLine.ToLower(), $"%{name}%"));
		}
		if (!string.IsNullOrWhiteSpace(dto.Specialty))
		{
			string sp = dto.Specialty.Trim();
			query = query.Where((Clinic c) => c.Doctor.Specialty.NameAr == sp || (c.Doctor.Specialty.NameEn != null && c.Doctor.Specialty.NameEn == sp));
		}
		if (!string.IsNullOrWhiteSpace(dto.Governorate))
		{
			string g = dto.Governorate.Trim();
			query = query.Where((Clinic c) => c.Governorate.NameAr == g || c.Governorate.NameEn == g);
		}
		if (!string.IsNullOrWhiteSpace(dto.City))
		{
			string cty = dto.City.Trim();
			query = query.Where((Clinic c) => c.City != null && (c.City.NameAr == cty || c.City.NameEn == cty));
		}
		int total = await query.CountAsync();
		bool hasLocation = GeoLocation.HasValidPair(dto.Lat, dto.Lng);
		if (hasLocation)
		{
			decimal lat = dto.Lat.Value;
			decimal lng = dto.Lng.Value;
			query = from c in query
				orderby (c.Latitude.HasValue && c.Longitude.HasValue && c.Latitude.Value >= -90m && c.Latitude.Value <= 90m && c.Longitude.Value >= -180m && c.Longitude.Value <= 180m && !(c.Latitude.Value == 0m && c.Longitude.Value == 0m)) ? 0 : 1, (c.Latitude.HasValue && c.Longitude.HasValue && c.Latitude.Value >= -90m && c.Latitude.Value <= 90m && c.Longitude.Value >= -180m && c.Longitude.Value <= 180m && !(c.Latitude.Value == 0m && c.Longitude.Value == 0m)) ? ((c.Latitude.Value - lat) * (c.Latitude.Value - lat) + (c.Longitude.Value - lng) * (c.Longitude.Value - lng)) : decimal.MaxValue, c.Doctor.IsFeatured descending, c.Doctor.FullName, c.NameAr ?? c.NameEn ?? c.AddressLine
				select c;
		}
		else
		{
			query = from c in query
				orderby c.Doctor.IsFeatured descending, c.Doctor.FullName, c.NameAr ?? c.NameEn ?? c.AddressLine
				select c;
		}
		var source = await (from c in query.Skip((dto.Page - 1) * dto.PageSize).Take(dto.PageSize)
			select new
			{
				DoctorId = c.Doctor.Id,
				FullName = c.Doctor.User.FullName ?? c.Doctor.FullName,
				FullNameEn = c.Doctor.User.FullNameEn,
				SpecialtyId = c.Doctor.SpecialtyId,
				SpecialtyNameAr = c.Doctor.Specialty.NameAr,
				SpecialtyNameEn = c.Doctor.Specialty.NameEn,
				ExperienceYears = c.Doctor.ExperienceYears,
				Bio = c.Doctor.Bio,
				ReviewsCount = c.Doctor.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				AvgRating = (c.Doctor.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0),
				ProfileImage = c.Doctor.ProfileImageUrl,
				Clinic = new ClinicSearchResultDto
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
				}
			}).ToListAsync();
		List<ClinicSearchItemDto> clinicItems = source.Select(c =>
		{
			c.Clinic.DistanceKm = (hasLocation ? GeoLocation.DistanceKm(dto.Lat, dto.Lng, c.Clinic.Latitude, c.Clinic.Longitude) : ((double?)null));
			return new ClinicSearchItemDto
			{
				ClinicId = c.Clinic.ClinicId,
				NameAr = c.Clinic.NameAr,
				NameEn = c.Clinic.NameEn,
				GovernorateAr = c.Clinic.GovernorateAr,
				GovernorateEn = c.Clinic.GovernorateEn,
				CityAr = c.Clinic.CityAr,
				CityEn = c.Clinic.CityEn,
				AddressLine = c.Clinic.AddressLine,
				Phone = c.Clinic.Phone,
				ConsultationFee = c.Clinic.ConsultationFee,
				ReconsultationFee = c.Clinic.ReconsultationFee,
				Latitude = c.Clinic.Latitude,
				Longitude = c.Clinic.Longitude,
				DistanceKm = c.Clinic.DistanceKm,
				AppointmentDurationMinutes = c.Clinic.AppointmentDurationMinutes,
				WorkingHours = c.Clinic.WorkingHours,
				DoctorId = c.DoctorId,
				DoctorName = c.FullName,
				DoctorNameEn = c.FullNameEn,
				SpecialtyId = c.SpecialtyId,
				SpecialtyNameAr = c.SpecialtyNameAr,
				SpecialtyNameEn = c.SpecialtyNameEn,
				ExperienceYears = c.ExperienceYears,
				Bio = c.Bio,
				ReviewsCount = c.ReviewsCount,
				AvgRating = c.AvgRating,
				ProfileImage = c.ProfileImage
			};
		}).ToList();
		List<DoctorSearchItemDto> items = source.Select(c => new DoctorSearchItemDto
		{
			DoctorId = c.DoctorId,
			FullName = c.FullName,
			SpecialtyId = c.SpecialtyId,
			SpecialtyNameAr = c.SpecialtyNameAr,
			SpecialtyNameEn = c.SpecialtyNameEn,
			ExperienceYears = c.ExperienceYears,
			Bio = c.Bio,
			ReviewsCount = c.ReviewsCount,
			AvgRating = c.AvgRating,
			ProfileImage = c.ProfileImage,
			Clinics = new List<ClinicSearchResultDto> { c.Clinic }
		}).ToList();
		return Ok(new
		{
			page = dto.Page,
			pageSize = dto.PageSize,
			total = total,
			clinicItems = clinicItems,
			items = items
		});
	}

	[HttpGet("{id:int}")]
	public async Task<IActionResult> GetById(int id)
	{
		DoctorProfileDetailsDto doctor = await (from d in _db.DoctorProfiles.AsNoTracking()
			where d.Id == id && d.IsActive
			select new DoctorProfileDetailsDto
			{
				DoctorId = d.Id,
				FullName = d.FullName,
				SpecialtyId = d.SpecialtyId,
				SpecialtyNameAr = d.Specialty.NameAr,
				SpecialtyNameEn = d.Specialty.NameEn,
				Bio = d.Bio,
				ProfileImageUrl = d.ProfileImageUrl,
				ExperienceYears = d.ExperienceYears,
				Languages = d.Languages,
				IsActive = d.IsActive,
				VerificationStatus = ((d.Verification != null) ? d.Verification.Status.ToString() : "NotSubmitted"),
				ReviewsCount = d.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				AvgRating = (d.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0),
				Clinics = from c in d.Clinics
					where c.IsActive
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
					}
			}).FirstOrDefaultAsync();
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor not found"
			});
		}
		DoctorProfileDetailsDto doctorProfileDetailsDto = doctor;
		doctorProfileDetailsDto.PatientsCount = await (from a in _db.Appointments
			where a.DoctorId == id && a.Status == AppointmentStatus.Completed
			select a.PatientUserId).Distinct().CountAsync();
		await TrackViewAsync("doctor", id);
		return Ok(doctor);
	}

	[HttpGet("featured")]
	public async Task<IActionResult> GetFeatured()
	{
		return Ok(await (from d in _db.DoctorProfiles.AsNoTracking()
			where d.IsActive && d.IsFeatured
			orderby d.FullName
			select new DoctorSearchItemDto
			{
				DoctorId = d.Id,
				FullName = d.FullName,
				SpecialtyId = d.SpecialtyId,
				SpecialtyNameAr = d.Specialty.NameAr,
				ExperienceYears = d.ExperienceYears,
				Bio = d.Bio,
				ReviewsCount = d.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				AvgRating = (d.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0),
				ProfileImage = d.ProfileImageUrl,
				Clinics = from c in d.Clinics
					where c.IsActive
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
					}
			}).ToListAsync());
	}

	[Authorize(Roles = "doctor")]
	[HttpGet("me")]
	public async Task<IActionResult> GetMe()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		DoctorProfileDetailsDto doctorProfileDetailsDto = await (from d in _db.DoctorProfiles.AsNoTracking()
			where d.UserId == userId
			select new DoctorProfileDetailsDto
			{
				DoctorId = d.Id,
				FullName = d.FullName,
				SpecialtyId = d.SpecialtyId,
				SpecialtyNameAr = d.Specialty.NameAr,
				SpecialtyNameEn = d.Specialty.NameEn,
				Bio = d.Bio,
				ProfileImageUrl = d.ProfileImageUrl,
				Phone = d.Phone,
				Email = d.User.Email,
				LicenseNumber = d.LicenseNumber,
				ExperienceYears = d.ExperienceYears,
				Languages = d.Languages,
				IsActive = d.IsActive,
				VerificationStatus = ((d.Verification != null) ? d.Verification.Status.ToString() : "NotSubmitted"),
				ReviewsCount = d.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				AvgRating = (d.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0),
				Clinics = from c in d.Clinics
					where c.IsActive
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
					}
			}).FirstOrDefaultAsync();
		if (doctorProfileDetailsDto == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		return Ok(doctorProfileDetailsDto);
	}

	[Authorize(Roles = "doctor")]
	[HttpGet("me/stats")]
	public async Task<IActionResult> GetMyStats()
	{
		DoctorProfile doctor = await GetCurrentDoctorAsync();
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		IQueryable<Review> verifiedReviewsQuery = from r in _db.Reviews.AsNoTracking()
			where r.DoctorId == (int?)doctor.Id && !r.IsDeleted && !r.IsHidden && r.Verified
			select r;
		DateTime date = ClinicTimeZone.ToClinicLocal(DateTime.UtcNow).Date;
		DateTime todayStart = ClinicTimeZone.ClinicTodayStartUtc();
		DateTime tomorrowStart = ClinicTimeZone.ClinicTomorrowStartUtc();
		DateTime weekStart = ClinicTimeZone.ToUtcFromClinicLocal(date.AddDays(0 - date.DayOfWeek));
		DateTime nextWeekStart = weekStart.AddDays(7.0);
		DateTime monthStart = ClinicTimeZone.ToUtcFromClinicLocal(new DateTime(date.Year, date.Month, 1));
		DateTime nextMonthStart = monthStart.AddMonths(1);
		IQueryable<Appointment> countedAppointmentsQuery = from a in _db.Appointments.AsNoTracking()
			where a.DoctorId == doctor.Id && (a.Status == AppointmentStatus.Confirmed || a.Status == AppointmentStatus.Completed)
			select a;
		IQueryable<Appointment> completedAppointmentsQuery = from a in _db.Appointments.AsNoTracking()
			where a.DoctorId == doctor.Id && a.Status == AppointmentStatus.Completed
			select a;
		int id = doctor.Id;
		int viewCount = doctor.ViewCount;
		string availabilityStatus = doctor.AvailabilityStatus;
		int clinicsCount = await _db.Clinics.CountAsync((Clinic c) => c.DoctorId == doctor.Id);
		int activeClinicsCount = await _db.Clinics.CountAsync((Clinic c) => c.DoctorId == doctor.Id && c.IsActive);
		int articlesCount = await _db.Articles.CountAsync((Article a) => a.AuthorDoctorId == doctor.Id && !a.IsDeleted);
		int publishedArticlesCount = await _db.Articles.CountAsync((Article a) => a.AuthorDoctorId == doctor.Id && !a.IsDeleted && a.Status == ArticleStatus.Published);
		int reviewsCount = await verifiedReviewsQuery.CountAsync();
		double valueOrDefault = (await verifiedReviewsQuery.AverageAsync((Expression<Func<Review, double?>>)((Review r) => (double)r.Rating), default(CancellationToken))).GetValueOrDefault();
		int appointmentsCount = await _db.Appointments.CountAsync((Appointment a) => a.DoctorId == doctor.Id && a.Status != AppointmentStatus.Cancelled);
		int countedAppointmentsCount = await countedAppointmentsQuery.CountAsync();
		int weeklyAppointmentsCount = await countedAppointmentsQuery.CountAsync((Appointment a) => a.ScheduledAt >= weekStart && a.ScheduledAt < nextWeekStart);
		int todayPatientsCount = await (from a in countedAppointmentsQuery
			where a.ScheduledAt >= todayStart && a.ScheduledAt < tomorrowStart
			select a.PatientUserId).Distinct().CountAsync();
		int uniquePatientsCount = await countedAppointmentsQuery.Select((Appointment a) => a.PatientUserId).Distinct().CountAsync();
		int pendingAppointmentsCount = await _db.Appointments.CountAsync((Appointment a) => a.DoctorId == doctor.Id && a.Status == AppointmentStatus.Pending);
		int completedAppointmentsCount = await completedAppointmentsQuery.CountAsync();
		decimal valueOrDefault2 = (await completedAppointmentsQuery.Where((Appointment a) => a.ScheduledAt >= todayStart && a.ScheduledAt < tomorrowStart).SumAsync((Expression<Func<Appointment, decimal?>>)((Appointment a) => a.ConsultationFee > 0 ? a.ConsultationFee : ((a.Clinic != null) ? (a.Clinic.ConsultationFee ?? 0m) : 0m)), default(CancellationToken))).GetValueOrDefault();
		var value = new
		{
			doctorId = id,
			ViewCount = viewCount,
			AvailabilityStatus = availabilityStatus,
			clinicsCount = clinicsCount,
			activeClinicsCount = activeClinicsCount,
			articlesCount = articlesCount,
			publishedArticlesCount = publishedArticlesCount,
			reviewsCount = reviewsCount,
			avgRating = valueOrDefault,
			appointmentsCount = appointmentsCount,
			countedAppointmentsCount = countedAppointmentsCount,
			weeklyAppointmentsCount = weeklyAppointmentsCount,
			todayPatientsCount = todayPatientsCount,
			uniquePatientsCount = uniquePatientsCount,
			pendingAppointmentsCount = pendingAppointmentsCount,
			completedAppointmentsCount = completedAppointmentsCount,
			todayRevenue = valueOrDefault2,
			monthlyRevenue = (await completedAppointmentsQuery.Where((Appointment a) => a.ScheduledAt >= monthStart && a.ScheduledAt < nextMonthStart).SumAsync((Expression<Func<Appointment, decimal?>>)((Appointment a) => a.ConsultationFee > 0 ? a.ConsultationFee : ((a.Clinic != null) ? (a.Clinic.ConsultationFee ?? 0m) : 0m)), default(CancellationToken))).GetValueOrDefault()
		};
		return Ok(value);
	}

	[Authorize(Roles = "doctor")]
	[HttpGet("me/reviews")]
	public async Task<IActionResult> GetMyReviews()
	{
		DoctorProfile doctor = await GetCurrentDoctorAsync();
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		return Ok(await (from r in _db.Reviews.AsNoTracking()
			where r.DoctorId == (int?)doctor.Id && r.Verified && !r.IsHidden && !r.IsDeleted
			orderby r.CreatedAt descending
			select new ReviewItemDto
			{
				Id = r.Id,
				ReviewerUserId = r.ReviewerUserId,
				ReviewerName = r.Reviewer.FullName,
				Rating = r.Rating,
				Comment = r.Comment,
				Reply = r.Reply,
				ReplyCreatedAt = r.ReplyCreatedAt,
				CreatedAt = r.CreatedAt
			}).ToListAsync());
	}

	[Authorize(Roles = "doctor")]
	[HttpGet("me/articles")]
	public async Task<IActionResult> GetMyArticles()
	{
		DoctorProfile doctor = await GetCurrentDoctorAsync();
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		return Ok(await (from a in _db.Articles.AsNoTracking()
			where a.AuthorDoctorId == doctor.Id && !a.IsDeleted
			orderby a.CreatedAt descending
			select new ArticleListItemDto
			{
				Id = a.Id,
				Title = a.Title,
				CoverImageUrl = a.CoverImageUrl,
				Status = a.Status.ToString(),
				ModerationStatus = a.ModerationStatus.ToString(),
				ViewCount = a.ViewCount,
				PublishedAt = a.PublishedAt,
				CreatedAt = a.CreatedAt,
				AuthorDoctorId = a.AuthorDoctorId,
				AuthorName = a.AuthorDoctor.FullName,
				SpecialtyNameAr = a.AuthorDoctor.Specialty.NameAr,
				SpecialtyNameEn = a.AuthorDoctor.Specialty.NameEn
			}).ToListAsync());
	}

	[Authorize(Roles = "doctor")]
	[HttpPut("me/availability")]
	public async Task<IActionResult> UpdateAvailability([FromBody] DoctorAvailabilityDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		DoctorProfile doctorProfile = await GetCurrentDoctorAsync();
		if (doctorProfile == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		doctorProfile.AvailabilityStatus = dto.Status.Trim().ToLowerInvariant();
		doctorProfile.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Availability updated successfully"
		});
	}

	[Authorize(Roles = "doctor")]
	[HttpPost("me/profile-image")]
	public async Task<IActionResult> UpdateProfileImage([FromBody] ProfileImageDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		DoctorProfile doctorProfile = await GetCurrentDoctorAsync();
		if (doctorProfile == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		doctorProfile.ProfileImageUrl = dto.ImageUrl.Trim();
		doctorProfile.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Profile image updated successfully"
		});
	}

	[Authorize(Roles = "doctor")]
	[HttpPut("profile")]
	public async Task<IActionResult> UpdateProfile([FromBody] UpdateDoctorProfileDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
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
		if (!string.IsNullOrWhiteSpace(dto.Specialty))
		{
			Specialty specialty = await _db.Specialties.FirstOrDefaultAsync((Specialty x) => !x.IsArchived && (x.NameAr == dto.Specialty || (x.NameEn != null && x.NameEn.ToLower() == dto.Specialty.ToLower())));
			if (specialty == null)
			{
				return BadRequest(new
				{
					message = "Specialty not found"
				});
			}
			doctor.SpecialtyId = specialty.Id;
		}
		if (!string.IsNullOrWhiteSpace(dto.FullName))
		{
			doctor.FullName = dto.FullName.Trim();
		}
		if (!string.IsNullOrWhiteSpace(dto.Phone))
		{
			doctor.Phone = dto.Phone.Trim();
		}
		if (!string.IsNullOrWhiteSpace(dto.LicenseNumber))
		{
			string licenseNumber = dto.LicenseNumber.Trim();
			if (await _db.DoctorProfiles.AnyAsync((DoctorProfile d) => d.Id != doctor.Id && d.LicenseNumber == licenseNumber))
			{
				return Conflict(new
				{
					message = "License number already exists"
				});
			}
			doctor.LicenseNumber = licenseNumber;
		}
		if (dto.ExperienceYears.HasValue)
		{
			doctor.ExperienceYears = dto.ExperienceYears.Value;
		}
		if (dto.Languages != null)
		{
			doctor.Languages = dto.Languages.Trim();
		}
		if (dto.Bio != null)
		{
			doctor.Bio = dto.Bio;
		}
		if (dto.ProfileImageUrl != null)
		{
			doctor.ProfileImageUrl = dto.ProfileImageUrl;
		}
		doctor.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Profile updated successfully"
		});
	}

	[Authorize(Roles = "doctor")]
	[HttpPost("setup")]
	public async Task<IActionResult> SetupProfile([FromBody] SetupDoctorProfileDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string userId = base.User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
		if (userId == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		if (await _db.DoctorProfiles.AnyAsync((DoctorProfile x) => x.UserId == userId))
		{
			return BadRequest(new
			{
				message = "Profile already exists"
			});
		}
		Specialty specialty = await _db.Specialties.FirstOrDefaultAsync((Specialty x) => !x.IsArchived && (x.NameAr == dto.Specialty || (x.NameEn != null && x.NameEn.ToLower() == dto.Specialty.ToLower())));
		if (specialty == null)
		{
			return BadRequest(new
			{
				message = "Specialty not found"
			});
		}
		if (await _db.DoctorProfiles.AnyAsync((DoctorProfile x) => x.LicenseNumber == dto.LicenseNumber))
		{
			return BadRequest(new
			{
				message = "License number already exists"
			});
		}
		DoctorProfile entity = new DoctorProfile
		{
			UserId = userId,
			FullName = dto.FullName.Trim(),
			Phone = dto.Phone.Trim(),
			LicenseNumber = dto.LicenseNumber.Trim(),
			SpecialtyId = specialty.Id,
			ExperienceYears = dto.ExperienceYears.GetValueOrDefault(),
			Languages = dto.Languages?.Trim(),
			Bio = dto.Bio,
			ProfileImageUrl = dto.ProfileImageUrl,
			IsActive = false,
			CreatedAt = DateTime.UtcNow,
			UpdatedAt = DateTime.UtcNow
		};
		await _db.DoctorProfiles.AddAsync(entity);
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Doctor profile created successfully"
		});
	}

	[Authorize(Roles = "doctor")]
	[HttpPost("verify")]
	public async Task<IActionResult> UploadVerification([FromBody] DoctorVerificationDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		DoctorProfile doctor = await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile x) => x.UserId == userId);
		if (doctor == null)
		{
			return BadRequest(new
			{
				message = "Doctor profile not found"
			});
		}
		DoctorVerification doctorVerification = await _db.DoctorVerifications.FirstOrDefaultAsync((DoctorVerification x) => x.DoctorId == doctor.Id);
		if (doctorVerification == null)
		{
			doctorVerification = new DoctorVerification
			{
				DoctorId = doctor.Id,
				CardImageUrl = dto.SyndicateCardImageUrl,
				SelfieWithCardUrl = dto.SelfieWithCardUrl
			};
			_db.DoctorVerifications.Add(doctorVerification);
		}
		else
		{
			if (!ProfessionalVerificationRules.CanResubmit(doctorVerification.Status))
			{
				return BadRequest(new
				{
					message = "Verification already submitted"
				});
			}
			doctorVerification.CardImageUrl = dto.SyndicateCardImageUrl;
			doctorVerification.SelfieWithCardUrl = dto.SelfieWithCardUrl;
			doctorVerification.Status = VerificationStatus.Pending;
			doctorVerification.ReviewedAt = null;
			doctorVerification.RejectReason = null;
		}
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Verification uploaded"
		});
	}

	private async Task<DoctorProfile?> GetCurrentDoctorAsync()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		return await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.UserId == userId);
	}

	private async Task TrackViewAsync(string targetType, int targetId)
	{
		await _db.DoctorProfiles.Where((DoctorProfile d) => d.Id == targetId).ExecuteUpdateAsync(delegate(UpdateSettersBuilder<DoctorProfile> s)
		{
			s.SetProperty((DoctorProfile d) => d.ViewCount, (DoctorProfile d) => d.ViewCount + 1);
		});
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (userId != null && base.User.IsInRole("patient"))
		{
			RecentlyViewedItem recentlyViewedItem = await _db.RecentlyViewedItems.FirstOrDefaultAsync((RecentlyViewedItem x) => x.UserId == userId && x.TargetType == targetType && x.TargetId == targetId);
			if (recentlyViewedItem == null)
			{
				_db.RecentlyViewedItems.Add(new RecentlyViewedItem
				{
					UserId = userId,
					TargetType = targetType,
					TargetId = targetId,
					ViewedAt = DateTime.UtcNow
				});
			}
			else
			{
				recentlyViewedItem.ViewedAt = DateTime.UtcNow;
			}
			await _db.SaveChangesAsync();
		}
	}
}
