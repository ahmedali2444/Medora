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

[Route("api/admin")]
[ApiController]
[Authorize(Roles = "admin")]
public class AdminController : ControllerBase
{
	private static readonly string[] AdminAssignableRoles = new string[4] { "admin", "patient", "doctor", "pharmacy" };

	private readonly AppDbContext _db;

	private readonly IPlatformSettingsStore _platformSettingsStore;

	private readonly UserManager<AppUser> _userManager;

	private readonly RoleManager<IdentityRole> _roleManager;

	private readonly IConfiguration _configuration;

	private readonly IWebHostEnvironment _environment;

	public AdminController(AppDbContext db, UserManager<AppUser> userManager, RoleManager<IdentityRole> roleManager, IPlatformSettingsStore platformSettingsStore, IConfiguration configuration, IWebHostEnvironment environment)
	{
		_db = db;
		_userManager = userManager;
		_roleManager = roleManager;
		_platformSettingsStore = platformSettingsStore;
		_configuration = configuration;
		_environment = environment;
	}

	[HttpGet("dashboard/stats")]
	public async Task<IActionResult> DashboardStats()
	{
		var value = new
		{
			users = await _db.Users.CountAsync((AppUser u) => !u.IsDeleted),
			activeUsers = await _db.Users.CountAsync((AppUser u) => !u.IsDeleted && u.IsActive),
			patients = await CountUsersInRoleAsync("patient"),
			doctors = await _db.DoctorProfiles.CountAsync(),
			activeDoctors = await _db.DoctorProfiles.CountAsync((DoctorProfile d) => d.IsActive),
			pharmacies = await _db.PharmacyProfiles.CountAsync(),
			activePharmacies = await _db.PharmacyProfiles.CountAsync((PharmacyProfile p) => p.IsActive),
			clinics = await _db.Clinics.CountAsync(),
			articles = await _db.Articles.CountAsync((Article a) => !a.IsDeleted),
			publishedArticles = await _db.Articles.CountAsync((Article a) => !a.IsDeleted && a.Status == ArticleStatus.Published),
			reviews = await _db.Reviews.CountAsync((Review r) => !r.IsDeleted),
			medicines = await _db.Medicines.CountAsync((Medicine m) => !m.IsArchived),
			archivedMedicines = await _db.Medicines.CountAsync((Medicine m) => m.IsArchived),
			pendingDoctorVerifications = await _db.DoctorVerifications.CountAsync((DoctorVerification doctorVerification) => doctorVerification.Status == VerificationStatus.Pending),
			pendingPharmacyVerifications = await _db.PharmacyVerifications.CountAsync((PharmacyVerification pharmacyVerification) => pharmacyVerification.Status == VerificationStatus.Pending),
			pendingReports = await _db.UserReports.CountAsync((UserReport r) => r.Status == "pending"),
			pendingAppointments = await _db.Appointments.CountAsync((Appointment a) => a.Status == AppointmentStatus.Pending),
			orders = await _db.MedicineOrders.CountAsync(),
			pendingOrders = await _db.MedicineOrders.CountAsync((MedicineOrder o) => o.Status == MedicineOrderStatus.Pending),
			deliveredOrders = await _db.MedicineOrders.CountAsync((MedicineOrder o) => o.Status == MedicineOrderStatus.Delivered)
		};
		return Ok(value);
	}

	[HttpGet("settings")]
	public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
	{
		return Ok(await _platformSettingsStore.GetAsync(cancellationToken));
	}

	[HttpGet("system/health")]
	public async Task<IActionResult> SystemHealth(CancellationToken cancellationToken)
	{
		bool databaseOk = false;
		string databaseError = null;
		try
		{
			databaseOk = await _db.Database.CanConnectAsync(cancellationToken);
		}
		catch (Exception ex)
		{
			databaseError = ex.Message;
		}
		bool settingsOk = false;
		string settingsError = null;
		try
		{
			await _platformSettingsStore.GetAsync(cancellationToken);
			settingsOk = true;
		}
		catch (Exception ex2)
		{
			settingsError = ex2.Message;
		}
		string path = _configuration["Uploads:RootPath"] ?? Path.Combine(_environment.ContentRootPath, "uploads");
		bool flag = Directory.Exists(path);
		bool flag2 = !string.IsNullOrWhiteSpace(_configuration["Email:Host"]) && !string.IsNullOrWhiteSpace(_configuration["Email:Username"]) && !string.IsNullOrWhiteSpace(_configuration["Email:AppPassword"]) && !string.IsNullOrWhiteSpace(_configuration["Email:FromEmail"]);
		var components = new
		{
			database = new
			{
				ok = databaseOk,
				error = databaseError
			},
			settings = new
			{
				ok = settingsOk,
				error = settingsError
			},
			uploads = new
			{
				ok = flag,
				path = path
			},
			email = new
			{
				ok = flag2,
				host = _configuration["Email:Host"]
			}
		};
		bool ok = databaseOk && settingsOk && flag && flag2;
		return Ok(new
		{
			ok = ok,
			environment = _environment.EnvironmentName,
			checkedAtUtc = DateTime.UtcNow,
			components = components
		});
	}

	[HttpPut("settings")]
	public async Task<IActionResult> UpdateSettings([FromBody] PlatformSettingsDto dto, CancellationToken cancellationToken)
	{
		PlatformSettingsDto settings = await _platformSettingsStore.SaveAsync(dto, cancellationToken);
		await LogAsync("update", "platform-settings", "global", null);
		return Ok(settings);
	}

	[HttpGet("roles")]
	public async Task<IActionResult> GetRoles()
	{
		return Ok(await (from r in _roleManager.Roles.AsNoTracking()
			where r.Name != null && AdminAssignableRoles.Contains(r.Name.ToLower())
			orderby r.Name
			select r.Name).ToListAsync());
	}

	[HttpPost("users")]
	public async Task<IActionResult> CreateUser([FromBody] AdminCreateUserDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		List<string> roles = NormalizeRoles(dto.Roles);
		if (roles.Count == 0)
		{
			return BadRequest(new
			{
				message = "At least one role is required"
			});
		}
		IActionResult actionResult = await ValidateRolesAsync(roles);
		if (actionResult != null)
		{
			return actionResult;
		}
		string email = dto.Email.Trim();
		if (await _userManager.FindByEmailAsync(email) != null)
		{
			return Conflict(new
			{
				message = "Email already exists"
			});
		}
		AppUser user = new AppUser
		{
			UserName = email,
			Email = email,
			FullName = dto.FullName?.Trim(),
			PhoneNumber = dto.PhoneNumber?.Trim(),
			EmailConfirmed = dto.EmailConfirmed,
			IsActive = dto.IsActive,
			CreatedAt = DateTime.UtcNow
		};
		IdentityResult identityResult = await _userManager.CreateAsync(user, dto.Password);
		if (!identityResult.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to create user",
				errors = identityResult.Errors.Select((IdentityError e) => e.Description)
			});
		}
		IdentityResult identityResult2 = await _userManager.AddToRolesAsync(user, roles);
		if (!identityResult2.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to assign roles",
				errors = identityResult2.Errors.Select((IdentityError e) => e.Description)
			});
		}
		await LogAsync("create", "user", user.Id, string.Join(",", roles));
		return Ok(new
		{
			message = "User created successfully",
			userId = user.Id
		});
	}

	[HttpGet("users")]
	public async Task<IActionResult> GetUsers([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<AppUser> query = ((dto.IncludeArchived || string.Equals(dto.Status, "archived", StringComparison.OrdinalIgnoreCase)) ? _db.Users.IgnoreQueryFilters().AsNoTracking().AsQueryable() : (from u in _db.Users.AsNoTracking()
			where !u.IsDeleted
			select u));
		if (!string.IsNullOrWhiteSpace(dto.UserId))
		{
			query = query.Where((AppUser u) => u.Id == dto.UserId);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((AppUser u) => (u.Email != null && u.Email.ToLower().Contains(value)) || (u.FullName != null && u.FullName.ToLower().Contains(value)) || (u.PhoneNumber != null && u.PhoneNumber.Contains(value)));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status))
		{
			IQueryable<AppUser> queryable;
			switch (dto.Status.Trim().ToLowerInvariant())
			{
			case "active":
				queryable = query.Where((AppUser u) => !u.IsDeleted && u.IsActive);
				break;
			case "disabled":
			case "suspended":
				queryable = query.Where((AppUser u) => !u.IsDeleted && !u.IsActive);
				break;
			case "archived":
				queryable = query.Where((AppUser u) => u.IsDeleted);
				break;
			default:
				queryable = query;
				break;
			}
			query = queryable;
		}
		if (dto.DateFrom.HasValue)
		{
			query = query.Where((AppUser u) => u.CreatedAt >= dto.DateFrom.Value);
		}
		if (dto.DateTo.HasValue)
		{
			query = query.Where((AppUser u) => u.CreatedAt <= dto.DateTo.Value);
		}
		if (!string.IsNullOrWhiteSpace(dto.Role))
		{
			string roleName = dto.Role.Trim().ToLowerInvariant();
			IdentityRole role = await _db.Roles.AsNoTracking().FirstOrDefaultAsync((IdentityRole r) => r.Name != null && r.Name.ToLower() == roleName);
			if (role == null)
			{
				return Ok(new
				{
					page = page,
					pageSize = pageSize,
					total = 0,
					items = Array.Empty<object>()
				});
			}
			query = query.Where((AppUser u) => _db.UserRoles.Any((IdentityUserRole<string> ur) => ur.UserId == u.Id && ur.RoleId == role.Id));
		}
		int total = await query.CountAsync();
		query = SortUsers(query, dto);
		List<AppUser> users = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
		List<string> userIds = users.Select((AppUser u) => u.Id).ToList();
		Dictionary<string, List<string>> rolesByUser = (from x in await (from ur in _db.UserRoles
				join r in _db.Roles on ur.RoleId equals r.Id
				where userIds.Contains(ur.UserId)
				select new { ur.UserId, r.Name }).ToListAsync()
			group x by x.UserId).ToDictionary(g => g.Key, g => g.Select(x => x.Name).ToList());
		List<object> items = ((IEnumerable<AppUser>)users).Select((Func<AppUser, object>)((AppUser user) => new
		{
			Id = user.Id,
			Email = user.Email,
			UserName = user.UserName,
			FullName = user.FullName,
			PhoneNumber = user.PhoneNumber,
			IsActive = user.IsActive,
			IsDeleted = user.IsDeleted,
			EmailConfirmed = user.EmailConfirmed,
			CreatedAt = user.CreatedAt,
			LastLoginAt = user.LastLoginAt,
			DeletedAt = user.DeletedAt,
			roles = (rolesByUser.TryGetValue(user.Id, out var value2) ? value2 : new List<string>())
		})).ToList();
		return Ok(new { page, pageSize, total, items });
	}

	[HttpGet("users/{id}")]
	public async Task<IActionResult> GetUser(string id)
	{
		AppUser user = await _db.Users.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync((AppUser u) => u.Id == id);
		if (user == null)
		{
			return NotFound(new
			{
				message = "User not found"
			});
		}
		IList<string> roles = await _userManager.GetRolesAsync(user);
		int? doctorProfileId = await _db.DoctorProfiles.Where((DoctorProfile d) => d.UserId == id).Select((Expression<Func<DoctorProfile, int?>>)((DoctorProfile d) => d.Id)).FirstOrDefaultAsync();
		int? pharmacyProfileId = await _db.PharmacyProfiles.Where((PharmacyProfile p) => p.UserId == id).Select((Expression<Func<PharmacyProfile, int?>>)((PharmacyProfile p) => p.Id)).FirstOrDefaultAsync();
		return Ok(new
		{
			user.Id, user.Email, user.UserName, user.FullName, user.PhoneNumber, user.IsActive, user.IsDeleted, user.EmailConfirmed, user.CreatedAt, user.LastLoginAt,
			user.DeletedAt, roles, doctorProfileId, pharmacyProfileId
		});
	}

	[HttpGet("users/{id}/activity")]
	public async Task<IActionResult> GetUserActivity(string id)
	{
		AppUser user = await _db.Users.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync((AppUser u) => u.Id == id);
		if (user == null)
		{
			return NotFound(new
			{
				message = "User not found"
			});
		}
		IList<string> roles = await _userManager.GetRolesAsync(user);
		var doctorProfile = await (from d in _db.DoctorProfiles.AsNoTracking()
			where d.UserId == id
			select new
			{
				Id = d.Id,
				FullName = d.FullName,
				Phone = d.Phone,
				LicenseNumber = d.LicenseNumber,
				specialtyNameAr = d.Specialty.NameAr,
				specialtyNameEn = d.Specialty.NameEn,
				IsActive = d.IsActive,
				IsFeatured = d.IsFeatured,
				AvailabilityStatus = d.AvailabilityStatus,
				ViewCount = d.ViewCount,
				verificationStatus = ((d.Verification != null) ? d.Verification.Status.ToString() : "NotSubmitted"),
				CreatedAt = d.CreatedAt
			}).FirstOrDefaultAsync();
		var pharmacyProfile = await (from p in _db.PharmacyProfiles.AsNoTracking()
			where p.UserId == id
			select new
			{
				Id = p.Id,
				PharmacyName = p.PharmacyName,
				Phone = p.Phone,
				LicenseNumber = p.LicenseNumber,
				governorateAr = p.Governorate.NameAr,
				governorateEn = p.Governorate.NameEn,
				cityAr = p.City.NameAr,
				cityEn = p.City.NameEn,
				IsActive = p.IsActive,
				IsFeatured = p.IsFeatured,
				Status = p.Status,
				ViewCount = p.ViewCount,
				verificationStatus = ((p.Verification != null) ? p.Verification.Status.ToString() : "NotSubmitted"),
				CreatedAt = p.CreatedAt
			}).FirstOrDefaultAsync();
		DateTime now = DateTime.UtcNow;
		int orders = await _db.MedicineOrders.CountAsync((MedicineOrder o) => o.PatientUserId == id);
		int appointments = await _db.Appointments.CountAsync((Appointment a) => a.PatientUserId == id);
		int prescriptions = await _db.Prescriptions.CountAsync((Prescription p) => p.PatientUserId == id);
		int reviews = await _db.Reviews.CountAsync((Review r) => r.ReviewerUserId == id && !r.IsDeleted);
		int reports = await _db.UserReports.CountAsync((UserReport r) => r.ReporterUserId == id);
		int notifications = await _db.Notifications.CountAsync((Notification n) => n.UserId == id);
		int unreadNotifications = await _db.Notifications.CountAsync((Notification n) => n.UserId == id && !n.IsRead);
		int activeSessions = await _db.UserSessions.CountAsync((UserSession s) => s.UserId == id && !s.IsRevoked && s.ExpiresAt > now);
		int favoriteDoctors = await _db.FavoriteDoctors.CountAsync((FavoriteDoctor f) => f.UserId == id);
		int favoritePharmacies = await _db.FavoritePharmacies.CountAsync((FavoritePharmacy f) => f.UserId == id);
		int recentlyViewed = await _db.RecentlyViewedItems.CountAsync((RecentlyViewedItem recentlyViewedItem) => recentlyViewedItem.UserId == id);
		int doctorClinics = ((doctorProfile != null) ? (await _db.Clinics.CountAsync((Clinic c) => c.DoctorId == doctorProfile.Id)) : 0);
		int doctorArticles = ((doctorProfile != null) ? (await _db.Articles.CountAsync((Article a) => a.AuthorDoctorId == doctorProfile.Id && !a.IsDeleted)) : 0);
		var counts = new
		{
			orders, appointments, prescriptions, reviews, reports, notifications, unreadNotifications, activeSessions, favoriteDoctors, favoritePharmacies,
			recentlyViewed, doctorClinics, doctorArticles
		};
		var latestOrders = await (from o in (from o in _db.MedicineOrders.AsNoTracking()
				where o.PatientUserId == id
				orderby o.CreatedAt descending
				select o).Take(5)
			select new
			{
				Id = o.Id,
				OrderNumber = o.OrderNumber,
				pharmacy = o.Pharmacy.PharmacyName,
				status = o.Status.ToString(),
				fulfillment = o.Fulfillment.ToString(),
				paymentStatus = o.PaymentStatus.ToString(),
				Total = o.Total,
				CreatedAt = o.CreatedAt
			}).ToListAsync();
		var latestAppointments = await (from a in (from a in _db.Appointments.AsNoTracking()
				where a.PatientUserId == id || (doctorProfile != null && a.DoctorId == doctorProfile.Id)
				orderby a.ScheduledAt descending
				select a).Take(5)
			select new
			{
				Id = a.Id,
				PatientUserId = a.PatientUserId,
				patientName = a.Patient.FullName,
				DoctorId = a.DoctorId,
				doctorName = a.Doctor.FullName,
				clinicName = ((a.Clinic != null) ? a.Clinic.NameAr : null),
				ScheduledAt = a.ScheduledAt,
				status = a.Status.ToString()
			}).ToListAsync();
		var latestPrescriptions = await (from p in (from p in _db.Prescriptions.AsNoTracking()
				where p.PatientUserId == id || (doctorProfile != null && p.DoctorId == doctorProfile.Id) || (pharmacyProfile != null && p.PharmacyId == (int?)pharmacyProfile.Id)
				orderby p.CreatedAt descending
				select p).Take(5)
			select new
			{
				Id = p.Id,
				PrescriptionNumber = p.PrescriptionNumber,
				doctorName = p.Doctor.FullName,
				pharmacyName = ((p.Pharmacy != null) ? p.Pharmacy.PharmacyName : null),
				status = p.Status.ToString(),
				Diagnosis = p.Diagnosis,
				CreatedAt = p.CreatedAt
			}).ToListAsync();
		var latestReviews = await (from r in (from r in _db.Reviews.AsNoTracking()
				where !r.IsDeleted && (r.ReviewerUserId == id || (doctorProfile != null && r.DoctorId == (int?)doctorProfile.Id) || (pharmacyProfile != null && r.PharmacyId == (int?)pharmacyProfile.Id))
				orderby r.CreatedAt descending
				select r).Take(5)
			select new
			{
				Id = r.Id,
				ReviewerUserId = r.ReviewerUserId,
				reviewerName = r.Reviewer.FullName,
				targetType = r.TargetType.ToString(),
				doctorName = ((r.Doctor != null) ? r.Doctor.FullName : null),
				pharmacyName = ((r.Pharmacy != null) ? r.Pharmacy.PharmacyName : null),
				Rating = r.Rating,
				Comment = r.Comment,
				Verified = r.Verified,
				IsHidden = r.IsHidden,
				CreatedAt = r.CreatedAt
			}).ToListAsync();
		var latestReports = await (from r in (from r in _db.UserReports.AsNoTracking()
				where r.ReporterUserId == id
				orderby r.CreatedAt descending
				select r).Take(5)
			select new { r.Id, r.TargetType, r.TargetId, r.Reason, r.Status, r.Resolution, r.CreatedAt, r.ResolvedAt }).ToListAsync();
		var notifications2 = await (from n in (from n in _db.Notifications.AsNoTracking()
				where n.UserId == id
				orderby n.CreatedAt descending
				select n).Take(5)
			select new { n.Id, n.Title, n.Body, n.Type, n.IsRead, n.CreatedAt, n.ReadAt }).ToListAsync();
		var sessions = await (from s in (from s in _db.UserSessions.AsNoTracking()
				where s.UserId == id
				orderby s.CreatedAt descending
				select s).Take(5)
			select new
			{
				Id = s.Id,
				IpAddress = s.IpAddress,
				UserAgent = s.UserAgent,
				CreatedAt = s.CreatedAt,
				ExpiresAt = s.ExpiresAt,
				IsRevoked = s.IsRevoked,
				RevokedAt = s.RevokedAt,
				isActive = (!s.IsRevoked && s.ExpiresAt > now)
			}).ToListAsync();
		var favoriteDoctors2 = await (from f in (from f in _db.FavoriteDoctors.AsNoTracking()
				where f.UserId == id
				orderby f.CreatedAt descending
				select f).Take(5)
			select new
			{
				Id = f.Id,
				DoctorId = f.DoctorId,
				doctorName = f.Doctor.FullName,
				specialtyNameAr = f.Doctor.Specialty.NameAr,
				specialtyNameEn = f.Doctor.Specialty.NameEn,
				CreatedAt = f.CreatedAt
			}).ToListAsync();
		var favoritePharmacies2 = await (from f in (from f in _db.FavoritePharmacies.AsNoTracking()
				where f.UserId == id
				orderby f.CreatedAt descending
				select f).Take(5)
			select new
			{
				Id = f.Id,
				PharmacyId = f.PharmacyId,
				pharmacyName = f.Pharmacy.PharmacyName,
				cityAr = f.Pharmacy.City.NameAr,
				cityEn = f.Pharmacy.City.NameEn,
				CreatedAt = f.CreatedAt
			}).ToListAsync();
		var recentlyViewed2 = await (from recentlyViewedItem in (from recentlyViewedItem in _db.RecentlyViewedItems.AsNoTracking()
				where recentlyViewedItem.UserId == id
				orderby recentlyViewedItem.ViewedAt descending
				select recentlyViewedItem).Take(10)
			select new { recentlyViewedItem.Id, recentlyViewedItem.TargetType, recentlyViewedItem.TargetId, recentlyViewedItem.ViewedAt }).ToListAsync();
		object doctorClinics2 = Array.Empty<object>();
		object doctorArticles2 = Array.Empty<object>();
		if (doctorProfile != null)
		{
			doctorClinics2 = await (from c in (from c in _db.Clinics.AsNoTracking()
					where c.DoctorId == doctorProfile.Id
					orderby c.CreatedAt descending
					select c).Take(5)
				select new
				{
					Id = c.Id,
					name = (c.NameAr ?? c.NameEn),
					governorateAr = c.Governorate.NameAr,
					governorateEn = c.Governorate.NameEn,
					cityAr = ((c.City != null) ? c.City.NameAr : null),
					cityEn = ((c.City != null) ? c.City.NameEn : null),
					Phone = c.Phone,
					IsActive = c.IsActive,
					CreatedAt = c.CreatedAt
				}).ToListAsync();
			doctorArticles2 = await (from a in (from a in _db.Articles.AsNoTracking()
					where a.AuthorDoctorId == doctorProfile.Id && !a.IsDeleted
					orderby a.CreatedAt descending
					select a).Take(5)
				select new
				{
					Id = a.Id,
					Title = a.Title,
					status = a.Status.ToString(),
					moderationStatus = a.ModerationStatus.ToString(),
					ViewCount = a.ViewCount,
					CreatedAt = a.CreatedAt,
					PublishedAt = a.PublishedAt
				}).ToListAsync();
		}
		return Ok(new
		{
			user = new
			{
				user.Id, user.Email, user.UserName, user.FullName, user.PhoneNumber, user.IsActive, user.IsDeleted, user.EmailConfirmed, user.CreatedAt, user.LastLoginAt,
				user.DeletedAt, roles
			},
			doctorProfile = doctorProfile,
			pharmacyProfile = pharmacyProfile,
			counts = counts,
			latestOrders = latestOrders,
			latestAppointments = latestAppointments,
			latestPrescriptions = latestPrescriptions,
			latestReviews = latestReviews,
			latestReports = latestReports,
			notifications = notifications2,
			sessions = sessions,
			favoriteDoctors = favoriteDoctors2,
			favoritePharmacies = favoritePharmacies2,
			recentlyViewed = recentlyViewed2,
			doctorClinics = doctorClinics2,
			doctorArticles = doctorArticles2
		});
	}

	[HttpPost("users/{id}/revoke-sessions")]
	public async Task<IActionResult> RevokeUserSessions(string id)
	{
		AppUser user = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync((AppUser u) => u.Id == id);
		if (user == null || user.IsDeleted)
		{
			return NotFound(new
			{
				message = "User not found"
			});
		}
		IList<string> source = await _userManager.GetRolesAsync(user);
		bool flag = user.IsActive && source.Any((string r) => string.Equals(r, "admin", StringComparison.OrdinalIgnoreCase));
		bool flag2 = flag;
		bool flag3 = flag2;
		if (flag3)
		{
			flag3 = await CountActiveAdminsAsync(id) == 0;
		}
		if (flag3)
		{
			return BadRequest(new
			{
				message = "You cannot revoke sessions for the last active admin account"
			});
		}
		List<UserSession> activeSessions = await _db.UserSessions.Where((UserSession s) => s.UserId == id && !s.IsRevoked && s.ExpiresAt > DateTime.UtcNow).ToListAsync();
		foreach (UserSession item in activeSessions)
		{
			item.IsRevoked = true;
			item.RevokedAt = DateTime.UtcNow;
		}
		await _db.SaveChangesAsync();
		await LogAsync("revoke-sessions", "user", id, $"Revoked={activeSessions.Count}");
		return Ok(new
		{
			message = "User sessions revoked successfully",
			revoked = activeSessions.Count
		});
	}

	[HttpPut("users/{id}")]
	public async Task<IActionResult> UpdateUser(string id, [FromBody] AdminUpdateUserDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		AppUser user = await _userManager.FindByIdAsync(id);
		if (user == null || user.IsDeleted)
		{
			return NotFound(new
			{
				message = "User not found"
			});
		}
		string callerId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		bool flag = (await _userManager.GetRolesAsync(user)).Any((string r) => string.Equals(r, "admin", StringComparison.OrdinalIgnoreCase));
		if (dto.IsActive.HasValue && !dto.IsActive.Value)
		{
			if (callerId == id)
			{
				return BadRequest(new
				{
					message = "You cannot disable your own admin account"
				});
			}
			bool flag2 = flag;
			bool flag3 = flag2;
			if (flag3)
			{
				flag3 = await CountActiveAdminsAsync(id) == 0;
			}
			if (flag3)
			{
				return BadRequest(new
				{
					message = "You cannot disable the last active admin account"
				});
			}
		}
		if (!string.IsNullOrWhiteSpace(dto.Email) && !string.Equals(dto.Email.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))
		{
			string email = dto.Email.Trim();
			AppUser appUser = await _userManager.FindByEmailAsync(email);
			if (appUser != null && appUser.Id != id)
			{
				return Conflict(new
				{
					message = "Email already exists"
				});
			}
			user.Email = email;
			user.UserName = email;
			user.NormalizedEmail = _userManager.NormalizeEmail(email);
			user.NormalizedUserName = _userManager.NormalizeName(email);
			user.EmailConfirmed = dto.EmailConfirmed == true;
		}
		else if (dto.EmailConfirmed.HasValue)
		{
			user.EmailConfirmed = dto.EmailConfirmed.Value;
		}
		if (dto.FullName != null)
		{
			user.FullName = dto.FullName.Trim();
		}
		if (dto.PhoneNumber != null)
		{
			user.PhoneNumber = dto.PhoneNumber.Trim();
		}
		if (dto.IsActive.HasValue)
		{
			user.IsActive = dto.IsActive.Value;
		}
		IdentityResult identityResult = await _userManager.UpdateAsync(user);
		if (!identityResult.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to update user",
				errors = identityResult.Errors.Select((IdentityError e) => e.Description)
			});
		}
		if (dto.IsActive == false)
		{
			await RevokeUserSessionsAsync(user.Id);
		}
		await LogAsync("update", "user", user.Id, null);
		return Ok(new
		{
			message = "User updated successfully"
		});
	}

	[HttpPut("users/{id}/roles")]
	public async Task<IActionResult> UpdateUserRoles(string id, [FromBody] AdminUpdateRolesDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		List<string> roles = NormalizeRoles(dto.Roles);
		if (roles.Count == 0)
		{
			return BadRequest(new
			{
				message = "At least one role is required"
			});
		}
		IActionResult actionResult = await ValidateRolesAsync(roles);
		if (actionResult != null)
		{
			return actionResult;
		}
		AppUser user = await _userManager.FindByIdAsync(id);
		if (user == null || user.IsDeleted)
		{
			return NotFound(new
			{
				message = "User not found"
			});
		}
		string callerId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		List<string> currentRolesRaw = (await _userManager.GetRolesAsync(user)).ToList();
		List<string> currentRoles = currentRolesRaw.Select((string r) => r.ToLowerInvariant()).ToList();
		bool flag = roles.Contains("admin");
		if (currentRoles.Contains("admin") && !flag)
		{
			if (callerId == id)
			{
				return BadRequest(new
				{
					message = "You cannot remove your own admin role"
				});
			}
			if (await CountActiveAdminsAsync(id) == 0)
			{
				return BadRequest(new
				{
					message = "You cannot remove the last active admin role"
				});
			}
		}
		List<string> remove = currentRoles.Except(roles).ToList();
		List<string> add = roles.Except(currentRoles).ToList();
		if (remove.Count > 0)
		{
			List<string> roles2 = currentRolesRaw.Where((string r) => remove.Contains(r.ToLowerInvariant())).ToList();
			IdentityResult identityResult = await _userManager.RemoveFromRolesAsync(user, roles2);
			if (!identityResult.Succeeded)
			{
				return BadRequest(new
				{
					message = "Failed to remove roles",
					errors = identityResult.Errors.Select((IdentityError e) => e.Description)
				});
			}
		}
		if (add.Count > 0)
		{
			IdentityResult identityResult2 = await _userManager.AddToRolesAsync(user, add);
			if (!identityResult2.Succeeded)
			{
				return BadRequest(new
				{
					message = "Failed to add roles",
					errors = identityResult2.Errors.Select((IdentityError e) => e.Description)
				});
			}
		}
		await RevokeUserSessionsAsync(user.Id);
		await LogAsync("update-roles", "user", user.Id, string.Join(",", roles));
		return Ok(new
		{
			message = "User roles updated successfully",
			roles = roles
		});
	}

	[HttpPut("users/{id}/status")]
	public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] UpdateStatusDto dto)
	{
		AppUser user = await _userManager.FindByIdAsync(id);
		if (user == null || user.IsDeleted)
		{
			return NotFound(new
			{
				message = "User not found"
			});
		}
		string text = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (text == id && !dto.IsActive)
		{
			return BadRequest(new
			{
				message = "You cannot disable your own admin account"
			});
		}
		IList<string> source = await _userManager.GetRolesAsync(user);
		bool flag = !dto.IsActive && source.Any((string r) => string.Equals(r, "admin", StringComparison.OrdinalIgnoreCase));
		bool flag2 = flag;
		if (flag2)
		{
			flag2 = await CountActiveAdminsAsync(id) == 0;
		}
		if (flag2)
		{
			return BadRequest(new
			{
				message = "You cannot disable the last active admin account"
			});
		}
		user.IsActive = dto.IsActive;
		await _userManager.UpdateAsync(user);
		await RevokeUserSessionsAsync(user.Id);
		await LogAsync("update-status", "user", user.Id, $"IsActive={dto.IsActive}");
		return Ok(new
		{
			message = "User status updated successfully"
		});
	}

	[HttpDelete("users/{id}")]
	public async Task<IActionResult> DeleteUser(string id)
	{
		AppUser user = await _userManager.FindByIdAsync(id);
		if (user == null || user.IsDeleted)
		{
			return NotFound(new
			{
				message = "User not found"
			});
		}
		string text = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (text == id)
		{
			return BadRequest(new
			{
				message = "You cannot delete your own admin account"
			});
		}
		bool flag = (await _userManager.GetRolesAsync(user)).Any((string r) => string.Equals(r, "admin", StringComparison.OrdinalIgnoreCase));
		bool flag2 = flag;
		if (flag2)
		{
			flag2 = await CountActiveAdminsAsync(id) == 0;
		}
		if (flag2)
		{
			return BadRequest(new
			{
				message = "You cannot delete the last active admin account"
			});
		}
		string text2 = BuildDeletedUserIdentity(user.Id);
		user.IsDeleted = true;
		user.IsActive = false;
		user.EmailConfirmed = false;
		user.DeletedAt = DateTime.UtcNow;
		user.Email = text2;
		user.UserName = text2;
		user.NormalizedEmail = _userManager.NormalizeEmail(text2);
		user.NormalizedUserName = _userManager.NormalizeName(text2);
		user.PhoneNumber = null;
		user.SecurityStamp = Guid.NewGuid().ToString();
		IdentityResult identityResult = await _userManager.UpdateAsync(user);
		if (!identityResult.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to delete user",
				errors = identityResult.Errors.Select((IdentityError e) => e.Description)
			});
		}
		foreach (DoctorProfile item in await _db.DoctorProfiles.Where((DoctorProfile d) => d.UserId == id && d.IsActive).ToListAsync())
		{
			item.IsActive = false;
			item.UpdatedAt = DateTime.UtcNow;
		}
		foreach (PharmacyProfile item2 in await _db.PharmacyProfiles.Where((PharmacyProfile p) => p.UserId == id && p.IsActive).ToListAsync())
		{
			item2.IsActive = false;
			item2.UpdatedAt = DateTime.UtcNow;
		}
		foreach (EmailOtp item3 in await _db.EmailOtps.Where((EmailOtp x) => x.UserId == id && !x.IsUsed).ToListAsync())
		{
			item3.IsUsed = true;
		}
		foreach (PasswordResetOtp item4 in await _db.PasswordResetOtps.Where((PasswordResetOtp x) => x.UserId == id && !x.IsUsed).ToListAsync())
		{
			item4.IsUsed = true;
		}
		await _db.SaveChangesAsync();
		await RevokeUserSessionsAsync(user.Id);
		await LogAsync("delete", "user", user.Id, null);
		return Ok(new
		{
			message = "User deleted successfully"
		});
	}

	[HttpGet("doctors")]
	public async Task<IActionResult> GetDoctors([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<DoctorProfile> query = _db.DoctorProfiles.AsNoTracking().AsQueryable();
		if (!string.IsNullOrWhiteSpace(dto.UserId))
		{
			query = query.Where((DoctorProfile d) => d.UserId == dto.UserId);
		}
		if (dto.DoctorId.HasValue)
		{
			query = query.Where((DoctorProfile d) => d.Id == dto.DoctorId.Value);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((DoctorProfile d) => d.FullName.ToLower().Contains(value) || d.LicenseNumber.ToLower().Contains(value) || d.Specialty.NameAr.ToLower().Contains(value) || (d.Specialty.NameEn != null && d.Specialty.NameEn.ToLower().Contains(value)));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status))
		{
			IQueryable<DoctorProfile> queryable;
			switch (dto.Status.Trim().ToLowerInvariant())
			{
			case "active":
				queryable = query.Where((DoctorProfile d) => d.IsActive);
				break;
			case "disabled":
			case "suspended":
				queryable = query.Where((DoctorProfile d) => !d.IsActive);
				break;
			case "featured":
				queryable = query.Where((DoctorProfile d) => d.IsFeatured);
				break;
			case "pending":
				queryable = query.Where((DoctorProfile d) => d.Verification != null && d.Verification.Status == VerificationStatus.Pending);
				break;
			case "rejected":
				queryable = query.Where((DoctorProfile d) => d.Verification != null && d.Verification.Status == VerificationStatus.Rejected);
				break;
			case "verified":
				queryable = query.Where((DoctorProfile d) => d.IsActive && d.Verification != null && d.Verification.Status == VerificationStatus.Approved);
				break;
			default:
				queryable = query;
				break;
			}
			query = queryable;
		}
		if (dto.DateFrom.HasValue)
		{
			query = query.Where((DoctorProfile d) => d.CreatedAt >= dto.DateFrom.Value);
		}
		if (dto.DateTo.HasValue)
		{
			query = query.Where((DoctorProfile d) => d.CreatedAt <= dto.DateTo.Value);
		}
		int total = await query.CountAsync();
		query = SortDoctors(query, dto);
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = total,
			items = await (from d in query.Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = d.Id,
					UserId = d.UserId,
					FullName = d.FullName,
					Phone = d.Phone,
					LicenseNumber = d.LicenseNumber,
					ExperienceYears = d.ExperienceYears,
					Languages = d.Languages,
					ProfileImageUrl = d.ProfileImageUrl,
					specialtyNameAr = d.Specialty.NameAr,
					specialtyNameEn = d.Specialty.NameEn,
					IsActive = d.IsActive,
					IsFeatured = d.IsFeatured,
					AvailabilityStatus = d.AvailabilityStatus,
					ViewCount = d.ViewCount,
					reviewsCount = d.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
					avgRating = (d.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0),
					verificationStatus = ((d.Verification != null) ? d.Verification.Status.ToString() : "NotSubmitted"),
					CreatedAt = d.CreatedAt,
					UpdatedAt = d.UpdatedAt
				}).ToListAsync()
		});
	}

	[HttpGet("doctors/{id:int}")]
	public async Task<IActionResult> GetDoctor(int id)
	{
		var doctor = await (from d in _db.DoctorProfiles.AsNoTracking()
			where d.Id == id
			select new
			{
				Id = d.Id,
				UserId = d.UserId,
				FullName = d.FullName,
				Phone = d.Phone,
				LicenseNumber = d.LicenseNumber,
				ExperienceYears = d.ExperienceYears,
				Languages = d.Languages,
				Bio = d.Bio,
				ProfileImageUrl = d.ProfileImageUrl,
				IsActive = d.IsActive,
				IsFeatured = d.IsFeatured,
				AvailabilityStatus = d.AvailabilityStatus,
				ViewCount = d.ViewCount,
				specialtyNameAr = d.Specialty.NameAr,
				specialtyNameEn = d.Specialty.NameEn,
				CreatedAt = d.CreatedAt,
				UpdatedAt = d.UpdatedAt
			}).FirstOrDefaultAsync();
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor not found"
			});
		}
		DoctorVerification doctorVerification = await _db.DoctorVerifications.AsNoTracking().FirstOrDefaultAsync((DoctorVerification doctorVerification2) => doctorVerification2.DoctorId == id);
		return Ok(new
		{
			Id = doctor.Id,
			UserId = doctor.UserId,
			FullName = doctor.FullName,
			Phone = doctor.Phone,
			LicenseNumber = doctor.LicenseNumber,
			ExperienceYears = doctor.ExperienceYears,
			Languages = doctor.Languages,
			Bio = doctor.Bio,
			ProfileImageUrl = doctor.ProfileImageUrl,
			IsActive = doctor.IsActive,
			IsFeatured = doctor.IsFeatured,
			AvailabilityStatus = doctor.AvailabilityStatus,
			ViewCount = doctor.ViewCount,
			specialtyNameAr = doctor.specialtyNameAr,
			specialtyNameEn = doctor.specialtyNameEn,
			verificationStatus = ((doctorVerification != null) ? doctorVerification.Status.ToString() : "NotSubmitted"),
			syndicateCardImageUrl = doctorVerification?.CardImageUrl,
			selfieWithCardUrl = doctorVerification?.SelfieWithCardUrl,
			CreatedAt = doctor.CreatedAt,
			UpdatedAt = doctor.UpdatedAt
		});
	}

	[HttpGet("doctors/{id:int}/activity")]
	public async Task<IActionResult> GetDoctorActivity(int id)
	{
		var doctor = await (from d in _db.DoctorProfiles.AsNoTracking()
			where d.Id == id
			select new
			{
				Id = d.Id,
				UserId = d.UserId,
				FullName = d.FullName,
				Phone = d.Phone,
				LicenseNumber = d.LicenseNumber,
				ExperienceYears = d.ExperienceYears,
				Languages = d.Languages,
				Bio = d.Bio,
				ProfileImageUrl = d.ProfileImageUrl,
				IsActive = d.IsActive,
				IsFeatured = d.IsFeatured,
				AvailabilityStatus = d.AvailabilityStatus,
				ViewCount = d.ViewCount,
				specialtyNameAr = d.Specialty.NameAr,
				specialtyNameEn = d.Specialty.NameEn,
				verificationStatus = ((d.Verification != null) ? d.Verification.Status.ToString() : "NotSubmitted"),
				syndicateCardImageUrl = ((d.Verification != null) ? d.Verification.CardImageUrl : null),
				selfieWithCardUrl = ((d.Verification != null) ? d.Verification.SelfieWithCardUrl : null),
				CreatedAt = d.CreatedAt,
				UpdatedAt = d.UpdatedAt
			}).FirstOrDefaultAsync();
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor not found"
			});
		}
		var user = await (from u in _db.Users.IgnoreQueryFilters().AsNoTracking()
			where u.Id == doctor.UserId
			select new
			{
				u.Id, u.Email, u.UserName, u.FullName, u.PhoneNumber, u.IsActive, u.IsDeleted, u.EmailConfirmed, u.CreatedAt, u.LastLoginAt,
				u.DeletedAt
			}).FirstOrDefaultAsync();
		var counts = new
		{
			clinics = await _db.Clinics.CountAsync((Clinic c) => c.DoctorId == id),
			appointments = await _db.Appointments.CountAsync((Appointment a) => a.DoctorId == id),
			patients = await (from a in _db.Appointments
				where a.DoctorId == id
				select a.PatientUserId).Distinct().CountAsync(),
			prescriptions = await _db.Prescriptions.CountAsync((Prescription p) => p.DoctorId == id),
			articles = await _db.Articles.CountAsync((Article a) => a.AuthorDoctorId == id && !a.IsDeleted),
			reviews = await _db.Reviews.CountAsync((Review r) => r.DoctorId == (int?)id && !r.IsDeleted),
			reports = await _db.UserReports.CountAsync((UserReport r) => r.TargetId == id && r.TargetType.ToLower() == "doctor")
		};
		var clinics = await (from c in (from c in _db.Clinics.AsNoTracking()
				where c.DoctorId == id
				orderby c.CreatedAt descending
				select c).Take(8)
			select new
			{
				Id = c.Id,
				name = (c.NameAr ?? c.NameEn),
				AddressLine = c.AddressLine,
				governorateAr = c.Governorate.NameAr,
				governorateEn = c.Governorate.NameEn,
				cityAr = ((c.City != null) ? c.City.NameAr : null),
				cityEn = ((c.City != null) ? c.City.NameEn : null),
				Phone = c.Phone,
				ConsultationFee = c.ConsultationFee,
				ReconsultationFee = c.ReconsultationFee,
				IsActive = c.IsActive,
				CreatedAt = c.CreatedAt
			}).ToListAsync();
		var source = await (from a in (from a in _db.Appointments.AsNoTracking()
				where a.DoctorId == id
				orderby a.ScheduledAt descending
				select a).Take(100)
			select new
			{
				Id = a.Id,
				PatientUserId = a.PatientUserId,
				patientName = a.Patient.FullName,
				patientEmail = a.Patient.Email,
				ContactName = a.ContactName,
				ContactPhone = a.ContactPhone,
				clinicName = ((a.Clinic != null) ? (a.Clinic.NameAr ?? a.Clinic.NameEn) : null),
				ScheduledAt = a.ScheduledAt,
				status = a.Status.ToString(),
				Reason = a.Reason,
				Notes = a.Notes,
				CreatedAt = a.CreatedAt
			}).ToListAsync();
		var latestAppointments = source.Take(5).ToList();
		var latestPatients = (from a in (from a in source
				group a by a.PatientUserId into @group
				select @group.First()).Take(8)
			select new
			{
				PatientUserId = a.PatientUserId,
				patientName = (a.patientName ?? a.ContactName),
				patientEmail = a.patientEmail,
				ContactPhone = a.ContactPhone,
				lastAppointmentAt = a.ScheduledAt,
				lastStatus = a.status
			}).ToList();
		var latestPrescriptions = await (from p in (from p in _db.Prescriptions.AsNoTracking()
				where p.DoctorId == id
				orderby p.CreatedAt descending
				select p).Take(5)
			select new
			{
				Id = p.Id,
				PrescriptionNumber = p.PrescriptionNumber,
				PatientUserId = p.PatientUserId,
				patientName = p.Patient.FullName,
				pharmacyName = ((p.Pharmacy != null) ? p.Pharmacy.PharmacyName : null),
				status = p.Status.ToString(),
				Diagnosis = p.Diagnosis,
				CreatedAt = p.CreatedAt
			}).ToListAsync();
		var latestArticles = await (from a in (from a in _db.Articles.AsNoTracking()
				where a.AuthorDoctorId == id && !a.IsDeleted
				orderby a.CreatedAt descending
				select a).Take(5)
			select new
			{
				Id = a.Id,
				Title = a.Title,
				status = a.Status.ToString(),
				moderationStatus = a.ModerationStatus.ToString(),
				ViewCount = a.ViewCount,
				CreatedAt = a.CreatedAt,
				PublishedAt = a.PublishedAt
			}).ToListAsync();
		var latestReviews = await (from r in (from r in _db.Reviews.AsNoTracking()
				where r.DoctorId == (int?)id && !r.IsDeleted
				orderby r.CreatedAt descending
				select r).Take(5)
			select new
			{
				Id = r.Id,
				ReviewerUserId = r.ReviewerUserId,
				reviewerName = r.Reviewer.FullName,
				Rating = r.Rating,
				Comment = r.Comment,
				Verified = r.Verified,
				IsHidden = r.IsHidden,
				CreatedAt = r.CreatedAt
			}).ToListAsync();
		var latestReports = await (from r in (from r in _db.UserReports.AsNoTracking()
				where r.TargetId == id && r.TargetType.ToLower() == "doctor"
				orderby r.CreatedAt descending
				select r).Take(5)
			select new
			{
				Id = r.Id,
				ReporterUserId = r.ReporterUserId,
				reporterName = r.Reporter.FullName,
				TargetType = r.TargetType,
				TargetId = r.TargetId,
				Reason = r.Reason,
				Status = r.Status,
				Resolution = r.Resolution,
				CreatedAt = r.CreatedAt,
				ResolvedAt = r.ResolvedAt
			}).ToListAsync();
		return Ok(new { doctor, user, counts, clinics, latestPatients, latestAppointments, latestPrescriptions, latestArticles, latestReviews, latestReports });
	}

	[HttpPut("doctors/{id:int}")]
	public async Task<IActionResult> UpdateDoctor(int id, [FromBody] UpdateDoctorProfileDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		DoctorProfile doctor = await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.Id == id);
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor not found"
			});
		}
		if (!string.IsNullOrWhiteSpace(dto.Specialty))
		{
			Specialty specialty = await _db.Specialties.FirstOrDefaultAsync((Specialty s) => !s.IsArchived && (s.NameAr == dto.Specialty || s.NameEn == dto.Specialty));
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
		await LogAsync("update", "doctor", doctor.Id.ToString(), null);
		return Ok(new
		{
			message = "Doctor updated successfully"
		});
	}

	[HttpPut("doctors/{id:int}/status")]
	public async Task<IActionResult> UpdateDoctorStatus(int id, [FromBody] UpdateStatusDto dto)
	{
		DoctorProfile doctorProfile = await _db.DoctorProfiles.Include((DoctorProfile d) => d.Verification).FirstOrDefaultAsync((DoctorProfile d) => d.Id == id);
		if (doctorProfile == null)
		{
			return NotFound(new
			{
				message = "Doctor not found"
			});
		}
		if (dto.IsActive && !ProfessionalVerificationRules.CanActivate(doctorProfile.Verification?.Status))
		{
			return BadRequest(new
			{
				message = "Doctor must be approved before activation"
			});
		}
		doctorProfile.IsActive = dto.IsActive;
		doctorProfile.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("update-status", "doctor", id.ToString(), $"IsActive={dto.IsActive}");
		return Ok(new
		{
			message = "Doctor status updated successfully"
		});
	}

	[HttpPut("doctors/{id:int}/feature")]
	public async Task<IActionResult> FeatureDoctor(int id, [FromBody] FeatureDto dto)
	{
		DoctorProfile doctorProfile = await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.Id == id);
		if (doctorProfile == null)
		{
			return NotFound(new
			{
				message = "Doctor not found"
			});
		}
		doctorProfile.IsFeatured = dto.IsFeatured;
		doctorProfile.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("feature", "doctor", id.ToString(), $"IsFeatured={dto.IsFeatured}");
		return Ok(new
		{
			message = "Doctor feature status updated successfully"
		});
	}

	[HttpPut("doctors/{id:int}/archive")]
	public async Task<IActionResult> ArchiveDoctor(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminArchiveDto? dto)
	{
		DoctorProfile doctor = await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.Id == id);
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor not found"
			});
		}
		doctor.IsActive = false;
		doctor.IsFeatured = false;
		doctor.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await RevokeUserSessionsAsync(doctor.UserId);
		await LogAsync("archive", "doctor", id.ToString(), dto?.Reason);
		return Ok(new
		{
			message = "Doctor archived safely"
		});
	}

	[HttpGet("pharmacies")]
	public async Task<IActionResult> GetPharmacies([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<PharmacyProfile> query = _db.PharmacyProfiles.AsNoTracking().AsQueryable();
		if (!string.IsNullOrWhiteSpace(dto.UserId))
		{
			query = query.Where((PharmacyProfile p) => p.UserId == dto.UserId);
		}
		if (dto.PharmacyId.HasValue)
		{
			query = query.Where((PharmacyProfile p) => p.Id == dto.PharmacyId.Value);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((PharmacyProfile p) => p.PharmacyName.ToLower().Contains(value) || p.LicenseNumber.ToLower().Contains(value) || p.Governorate.NameAr.ToLower().Contains(value) || p.Governorate.NameEn.ToLower().Contains(value) || p.City.NameAr.ToLower().Contains(value) || p.City.NameEn.ToLower().Contains(value));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status))
		{
			IQueryable<PharmacyProfile> queryable;
			switch (dto.Status.Trim().ToLowerInvariant())
			{
			case "active":
				queryable = query.Where((PharmacyProfile p) => p.IsActive);
				break;
			case "disabled":
			case "suspended":
				queryable = query.Where((PharmacyProfile p) => !p.IsActive);
				break;
			case "featured":
				queryable = query.Where((PharmacyProfile p) => p.IsFeatured);
				break;
			case "pending":
				queryable = query.Where((PharmacyProfile p) => p.Verification != null && p.Verification.Status == VerificationStatus.Pending);
				break;
			case "rejected":
				queryable = query.Where((PharmacyProfile p) => p.Verification != null && p.Verification.Status == VerificationStatus.Rejected);
				break;
			case "verified":
				queryable = query.Where((PharmacyProfile p) => p.IsActive && p.Verification != null && p.Verification.Status == VerificationStatus.Approved);
				break;
			default:
				queryable = query;
				break;
			}
			query = queryable;
		}
		if (dto.DateFrom.HasValue)
		{
			query = query.Where((PharmacyProfile p) => p.CreatedAt >= dto.DateFrom.Value);
		}
		if (dto.DateTo.HasValue)
		{
			query = query.Where((PharmacyProfile p) => p.CreatedAt <= dto.DateTo.Value);
		}
		int total = await query.CountAsync();
		query = SortPharmacies(query, dto);
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = total,
			items = await (from p in query.Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = p.Id,
					UserId = p.UserId,
					PharmacyName = p.PharmacyName,
					Phone = p.Phone,
					LicenseNumber = p.LicenseNumber,
					ProfileImageUrl = p.ProfileImageUrl,
					governorateAr = p.Governorate.NameAr,
					governorateEn = p.Governorate.NameEn,
					cityAr = p.City.NameAr,
					cityEn = p.City.NameEn,
					IsActive = p.IsActive,
					IsFeatured = p.IsFeatured,
					Status = p.Status,
					ViewCount = p.ViewCount,
					reviewsCount = p.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
					avgRating = (p.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0),
					verificationStatus = ((p.Verification != null) ? p.Verification.Status.ToString() : "NotSubmitted"),
					CreatedAt = p.CreatedAt,
					UpdatedAt = p.UpdatedAt
				}).ToListAsync()
		});
	}

	[HttpGet("pharmacies/{id:int}")]
	public async Task<IActionResult> GetPharmacy(int id)
	{
		var pharmacy = await (from p in _db.PharmacyProfiles.AsNoTracking()
			where p.Id == id
			select new
			{
				Id = p.Id,
				UserId = p.UserId,
				PharmacyName = p.PharmacyName,
				LicenseNumber = p.LicenseNumber,
				Bio = p.Bio,
				Phone = p.Phone,
				ProfileImageUrl = p.ProfileImageUrl,
				AddressLine = p.AddressLine,
				Latitude = p.Latitude,
				Longitude = p.Longitude,
				OpenFrom = p.OpenFrom,
				OpenTo = p.OpenTo,
				Is24Hours = p.Is24Hours,
				IsActive = p.IsActive,
				IsFeatured = p.IsFeatured,
				Status = p.Status,
				ViewCount = p.ViewCount,
				governorateAr = p.Governorate.NameAr,
				governorateEn = p.Governorate.NameEn,
				cityAr = p.City.NameAr,
				cityEn = p.City.NameEn,
				CreatedAt = p.CreatedAt,
				UpdatedAt = p.UpdatedAt
			}).FirstOrDefaultAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		PharmacyVerification pharmacyVerification = await _db.PharmacyVerifications.AsNoTracking().FirstOrDefaultAsync((PharmacyVerification pharmacyVerification2) => pharmacyVerification2.PharmacyId == id);
		return Ok(new
		{
			Id = pharmacy.Id,
			UserId = pharmacy.UserId,
			PharmacyName = pharmacy.PharmacyName,
			LicenseNumber = pharmacy.LicenseNumber,
			Bio = pharmacy.Bio,
			Phone = pharmacy.Phone,
			ProfileImageUrl = pharmacy.ProfileImageUrl,
			AddressLine = pharmacy.AddressLine,
			Latitude = pharmacy.Latitude,
			Longitude = pharmacy.Longitude,
			OpenFrom = pharmacy.OpenFrom,
			OpenTo = pharmacy.OpenTo,
			Is24Hours = pharmacy.Is24Hours,
			IsActive = pharmacy.IsActive,
			IsFeatured = pharmacy.IsFeatured,
			Status = pharmacy.Status,
			ViewCount = pharmacy.ViewCount,
			governorateAr = pharmacy.governorateAr,
			governorateEn = pharmacy.governorateEn,
			cityAr = pharmacy.cityAr,
			cityEn = pharmacy.cityEn,
			verificationStatus = ((pharmacyVerification != null) ? pharmacyVerification.Status.ToString() : "NotSubmitted"),
			licenseImageUrl = pharmacyVerification?.LicenseImageUrl,
			pharmacistIdCardUrl = pharmacyVerification?.PharmacistIdCardUrl,
			CreatedAt = pharmacy.CreatedAt,
			UpdatedAt = pharmacy.UpdatedAt
		});
	}

	[HttpGet("pharmacies/{id:int}/activity")]
	public async Task<IActionResult> GetPharmacyActivity(int id)
	{
		var pharmacy = await (from p in _db.PharmacyProfiles.AsNoTracking()
			where p.Id == id
			select new
			{
				Id = p.Id,
				UserId = p.UserId,
				PharmacyName = p.PharmacyName,
				LicenseNumber = p.LicenseNumber,
				Bio = p.Bio,
				Phone = p.Phone,
				ProfileImageUrl = p.ProfileImageUrl,
				AddressLine = p.AddressLine,
				Latitude = p.Latitude,
				Longitude = p.Longitude,
				OpenFrom = p.OpenFrom,
				OpenTo = p.OpenTo,
				Is24Hours = p.Is24Hours,
				IsActive = p.IsActive,
				IsFeatured = p.IsFeatured,
				Status = p.Status,
				ViewCount = p.ViewCount,
				governorateAr = p.Governorate.NameAr,
				governorateEn = p.Governorate.NameEn,
				cityAr = p.City.NameAr,
				cityEn = p.City.NameEn,
				verificationStatus = ((p.Verification != null) ? p.Verification.Status.ToString() : "NotSubmitted"),
				licenseImageUrl = ((p.Verification != null) ? p.Verification.LicenseImageUrl : null),
				pharmacistIdCardUrl = ((p.Verification != null) ? p.Verification.PharmacistIdCardUrl : null),
				CreatedAt = p.CreatedAt,
				UpdatedAt = p.UpdatedAt
			}).FirstOrDefaultAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		var user = await (from u in _db.Users.IgnoreQueryFilters().AsNoTracking()
			where u.Id == pharmacy.UserId
			select new
			{
				u.Id, u.Email, u.UserName, u.FullName, u.PhoneNumber, u.IsActive, u.IsDeleted, u.EmailConfirmed, u.CreatedAt, u.LastLoginAt,
				u.DeletedAt
			}).FirstOrDefaultAsync();
		var counts = new
		{
			orders = await _db.MedicineOrders.CountAsync((MedicineOrder o) => o.PharmacyId == id),
			medicines = await _db.PharmacyMedicines.CountAsync((PharmacyMedicine pm) => pm.PharmacyId == id),
			availableMedicines = await _db.PharmacyMedicines.CountAsync((PharmacyMedicine pm) => pm.PharmacyId == id && pm.IsAvailable),
			lowStockMedicines = await _db.PharmacyMedicines.CountAsync((PharmacyMedicine pm) => pm.PharmacyId == id && pm.Quantity.HasValue && pm.Quantity.Value <= 5),
			prescriptions = await _db.Prescriptions.CountAsync((Prescription p) => p.PharmacyId == (int?)id),
			reviews = await _db.Reviews.CountAsync((Review r) => r.PharmacyId == (int?)id && !r.IsDeleted),
			reports = await _db.UserReports.CountAsync((UserReport r) => r.TargetId == id && r.TargetType.ToLower() == "pharmacy")
		};
		var medicines = await (from pm in (from pm in _db.PharmacyMedicines.AsNoTracking()
				where pm.PharmacyId == id
				orderby (pm.IsAvailable && pm.Quantity.HasValue && pm.Quantity.Value <= 5) ? 0 : 1, pm.LastUpdatedAt descending
				select pm).Take(10)
			select new
			{
				Id = pm.Id,
				MedicineId = pm.MedicineId,
				medicineName = pm.Medicine.Name,
				ActiveIngredient = pm.Medicine.ActiveIngredient,
				Form = pm.Medicine.Form,
				Strength = pm.Medicine.Strength,
				ImageUrl = pm.Medicine.ImageUrl,
				IsAvailable = pm.IsAvailable,
				Quantity = pm.Quantity,
				Price = pm.Price,
				LastUpdatedAt = pm.LastUpdatedAt,
				isLowStock = (pm.Quantity.HasValue && pm.Quantity.Value <= 5)
			}).ToListAsync();
		var latestOrders = await (from o in (from o in _db.MedicineOrders.AsNoTracking()
				where o.PharmacyId == id
				orderby o.CreatedAt descending
				select o).Take(5)
			select new
			{
				Id = o.Id,
				OrderNumber = o.OrderNumber,
				PatientUserId = o.PatientUserId,
				patientName = o.Patient.FullName,
				customer = o.ContactName,
				phone = o.ContactPhone,
				status = o.Status.ToString(),
				fulfillment = o.Fulfillment.ToString(),
				paymentStatus = o.PaymentStatus.ToString(),
				itemsCount = o.Items.Sum((MedicineOrderItem i) => i.Quantity),
				Total = o.Total,
				CreatedAt = o.CreatedAt
			}).ToListAsync();
		var latestPrescriptions = await (from p in (from p in _db.Prescriptions.AsNoTracking()
				where p.PharmacyId == (int?)id
				orderby p.CreatedAt descending
				select p).Take(5)
			select new
			{
				Id = p.Id,
				PrescriptionNumber = p.PrescriptionNumber,
				PatientUserId = p.PatientUserId,
				patientName = p.Patient.FullName,
				doctorName = p.Doctor.FullName,
				status = p.Status.ToString(),
				Diagnosis = p.Diagnosis,
				CreatedAt = p.CreatedAt
			}).ToListAsync();
		var latestReviews = await (from r in (from r in _db.Reviews.AsNoTracking()
				where r.PharmacyId == (int?)id && !r.IsDeleted
				orderby r.CreatedAt descending
				select r).Take(5)
			select new
			{
				Id = r.Id,
				ReviewerUserId = r.ReviewerUserId,
				reviewerName = r.Reviewer.FullName,
				Rating = r.Rating,
				Comment = r.Comment,
				Verified = r.Verified,
				IsHidden = r.IsHidden,
				CreatedAt = r.CreatedAt
			}).ToListAsync();
		var latestReports = await (from r in (from r in _db.UserReports.AsNoTracking()
				where r.TargetId == id && r.TargetType.ToLower() == "pharmacy"
				orderby r.CreatedAt descending
				select r).Take(5)
			select new
			{
				Id = r.Id,
				ReporterUserId = r.ReporterUserId,
				reporterName = r.Reporter.FullName,
				TargetType = r.TargetType,
				TargetId = r.TargetId,
				Reason = r.Reason,
				Status = r.Status,
				Resolution = r.Resolution,
				CreatedAt = r.CreatedAt,
				ResolvedAt = r.ResolvedAt
			}).ToListAsync();
		return Ok(new { pharmacy, user, counts, medicines, latestOrders, latestPrescriptions, latestReviews, latestReports });
	}

	[HttpPut("pharmacies/{id:int}")]
	public async Task<IActionResult> UpdatePharmacy(int id, [FromBody] UpdatePharmacyProfileDto dto)
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
				message = "Pharmacy location must be valid coordinates"
			});
		}
		PharmacyProfile pharmacy = await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.Id == id);
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		if (!string.IsNullOrWhiteSpace(dto.PharmacyName))
		{
			pharmacy.PharmacyName = dto.PharmacyName.Trim();
		}
		if (dto.Bio != null)
		{
			pharmacy.Bio = dto.Bio;
		}
		if (!string.IsNullOrWhiteSpace(dto.Phone))
		{
			pharmacy.Phone = dto.Phone.Trim();
		}
		if (dto.ProfileImageUrl != null)
		{
			pharmacy.ProfileImageUrl = dto.ProfileImageUrl;
		}
		if (!string.IsNullOrWhiteSpace(dto.AddressLine))
		{
			pharmacy.AddressLine = dto.AddressLine.Trim();
		}
		if (!string.IsNullOrWhiteSpace(dto.Governorate))
		{
			string governorateName = dto.Governorate.Trim();
			Governorate governorate = await _db.Governorates.FirstOrDefaultAsync((Governorate g) => !g.IsArchived && (g.NameAr == governorateName || g.NameEn == governorateName));
			if (governorate == null)
			{
				return BadRequest(new
				{
					message = "Governorate not found"
				});
			}
			pharmacy.GovernorateId = governorate.Id;
		}
		if (!string.IsNullOrWhiteSpace(dto.City))
		{
			string cityName = dto.City.Trim();
			City city = await _db.Cities.FirstOrDefaultAsync((City c) => !c.IsArchived && !c.Governorate.IsArchived && c.GovernorateId == pharmacy.GovernorateId && (c.NameAr == cityName || c.NameEn == cityName));
			if (city == null)
			{
				return BadRequest(new
				{
					message = "City not found in this governorate"
				});
			}
			pharmacy.CityId = city.Id;
		}
		if (dto.Latitude.HasValue)
		{
			pharmacy.Latitude = dto.Latitude;
		}
		if (dto.Longitude.HasValue)
		{
			pharmacy.Longitude = dto.Longitude;
		}
		if (dto.OpenFrom.HasValue)
		{
			pharmacy.OpenFrom = dto.OpenFrom;
		}
		if (dto.OpenTo.HasValue)
		{
			pharmacy.OpenTo = dto.OpenTo;
		}
		if (dto.Is24Hours.HasValue)
		{
			pharmacy.Is24Hours = dto.Is24Hours.Value;
		}
		pharmacy.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("update", "pharmacy", id.ToString(), null);
		return Ok(new
		{
			message = "Pharmacy updated successfully"
		});
	}

	[HttpPut("pharmacies/{id:int}/status")]
	public async Task<IActionResult> UpdatePharmacyStatus(int id, [FromBody] UpdateStatusDto dto)
	{
		PharmacyProfile pharmacyProfile = await _db.PharmacyProfiles.Include((PharmacyProfile p) => p.Verification).FirstOrDefaultAsync((PharmacyProfile p) => p.Id == id);
		if (pharmacyProfile == null)
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		if (dto.IsActive && !ProfessionalVerificationRules.CanActivate(pharmacyProfile.Verification?.Status))
		{
			return BadRequest(new
			{
				message = "Pharmacy must be approved before activation"
			});
		}
		pharmacyProfile.IsActive = dto.IsActive;
		pharmacyProfile.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("update-status", "pharmacy", id.ToString(), $"IsActive={dto.IsActive}");
		return Ok(new
		{
			message = "Pharmacy status updated successfully"
		});
	}

	[HttpPut("pharmacies/{id:int}/feature")]
	public async Task<IActionResult> FeaturePharmacy(int id, [FromBody] FeatureDto dto)
	{
		PharmacyProfile pharmacyProfile = await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.Id == id);
		if (pharmacyProfile == null)
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		pharmacyProfile.IsFeatured = dto.IsFeatured;
		pharmacyProfile.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("feature", "pharmacy", id.ToString(), $"IsFeatured={dto.IsFeatured}");
		return Ok(new
		{
			message = "Pharmacy feature status updated successfully"
		});
	}

	[HttpPut("pharmacies/{id:int}/archive")]
	public async Task<IActionResult> ArchivePharmacy(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminArchiveDto? dto)
	{
		PharmacyProfile pharmacy = await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.Id == id);
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		pharmacy.IsActive = false;
		pharmacy.IsFeatured = false;
		pharmacy.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await RevokeUserSessionsAsync(pharmacy.UserId);
		await LogAsync("archive", "pharmacy", id.ToString(), dto?.Reason);
		return Ok(new
		{
			message = "Pharmacy archived safely"
		});
	}

	[HttpGet("reviews")]
	public async Task<IActionResult> GetReviews([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<Review> query = from r in _db.Reviews.AsNoTracking()
			where !r.IsDeleted
			select r;
		if (!string.IsNullOrWhiteSpace(dto.UserId))
		{
			query = query.Where((Review r) => r.ReviewerUserId == dto.UserId);
		}
		if (dto.DoctorId.HasValue)
		{
			query = query.Where((Review r) => r.DoctorId == (int?)dto.DoctorId.Value);
		}
		if (dto.PharmacyId.HasValue)
		{
			query = query.Where((Review r) => r.PharmacyId == (int?)dto.PharmacyId.Value);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((Review r) => (r.Comment != null && r.Comment.ToLower().Contains(value)) || (r.Reviewer.FullName != null && r.Reviewer.FullName.ToLower().Contains(value)) || (r.Doctor != null && r.Doctor.FullName.ToLower().Contains(value)) || (r.Pharmacy != null && r.Pharmacy.PharmacyName.ToLower().Contains(value)));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status))
		{
			query = dto.Status.Trim().ToLowerInvariant() switch
			{
				"hidden" => query.Where((Review r) => r.IsHidden), 
				"flagged" => query.Where((Review r) => r.IsHidden), 
				"visible" => query.Where((Review r) => !r.IsHidden), 
				"verified" => query.Where((Review r) => r.Verified), 
				"approved" => query.Where((Review r) => r.Verified && !r.IsHidden), 
				"unverified" => query.Where((Review r) => !r.Verified), 
				"pending" => query.Where((Review r) => !r.Verified && !r.IsHidden), 
				_ => query, 
			};
		}
		if (dto.DateFrom.HasValue)
		{
			query = query.Where((Review r) => r.CreatedAt >= dto.DateFrom.Value);
		}
		if (dto.DateTo.HasValue)
		{
			query = query.Where((Review r) => r.CreatedAt <= dto.DateTo.Value);
		}
		int total = await query.CountAsync();
		query = SortReviews(query, dto);
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = total,
			items = await (from r in query.Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = r.Id,
					targetType = r.TargetType.ToString(),
					DoctorId = r.DoctorId,
					doctorName = ((r.Doctor != null) ? r.Doctor.FullName : null),
					PharmacyId = r.PharmacyId,
					pharmacyName = ((r.Pharmacy != null) ? r.Pharmacy.PharmacyName : null),
					ReviewerUserId = r.ReviewerUserId,
					reviewerName = r.Reviewer.FullName,
					Rating = r.Rating,
					Comment = r.Comment,
					Verified = r.Verified,
					IsHidden = r.IsHidden,
					CreatedAt = r.CreatedAt
				}).ToListAsync()
		});
	}

	[HttpPut("reviews/{id:int}/hide")]
	public async Task<IActionResult> HideReview(int id, [FromBody] UpdateStatusDto? dto)
	{
		Review review = await _db.Reviews.FirstOrDefaultAsync((Review r) => r.Id == id && !r.IsDeleted);
		if (review == null)
		{
			return NotFound(new
			{
				message = "Review not found"
			});
		}
		review.IsHidden = dto?.IsActive ?? true;
		await _db.SaveChangesAsync();
		await LogAsync("hide", "review", id.ToString(), $"IsHidden={review.IsHidden}");
		return Ok(new
		{
			message = "Review visibility updated successfully"
		});
	}

	[HttpPut("reviews/{id:int}/approve")]
	public async Task<IActionResult> ApproveReview(int id)
	{
		Review review = await _db.Reviews.FirstOrDefaultAsync((Review r) => r.Id == id && !r.IsDeleted);
		if (review == null)
		{
			return NotFound(new
			{
				message = "Review not found"
			});
		}
		review.Verified = true;
		review.IsHidden = false;
		await _db.SaveChangesAsync();
		await LogAsync("approve", "review", id.ToString(), null);
		return Ok(new
		{
			message = "Review approved successfully"
		});
	}

	[HttpDelete("reviews/{id:int}")]
	public async Task<IActionResult> DeleteReview(int id)
	{
		Review review = await _db.Reviews.FirstOrDefaultAsync((Review r) => r.Id == id && !r.IsDeleted);
		if (review == null)
		{
			return NotFound(new
			{
				message = "Review not found"
			});
		}
		review.IsDeleted = true;
		await _db.SaveChangesAsync();
		await LogAsync("delete", "review", id.ToString(), null);
		return Ok(new
		{
			message = "Review deleted successfully"
		});
	}

	[HttpPut("reviews/{id:int}/archive")]
	public async Task<IActionResult> ArchiveReview(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminArchiveDto? dto)
	{
		Review review = await _db.Reviews.FirstOrDefaultAsync((Review r) => r.Id == id && !r.IsDeleted);
		if (review == null)
		{
			return NotFound(new
			{
				message = "Review not found"
			});
		}
		review.IsDeleted = true;
		await _db.SaveChangesAsync();
		await LogAsync("archive", "review", id.ToString(), dto?.Reason);
		return Ok(new
		{
			message = "Review archived successfully"
		});
	}

	[HttpGet("articles")]
	public async Task<IActionResult> GetArticles([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<Article> query = from a in _db.Articles.AsNoTracking()
			where !a.IsDeleted
			select a;
		if (!string.IsNullOrWhiteSpace(dto.UserId))
		{
			query = query.Where((Article a) => a.AuthorDoctor.UserId == dto.UserId);
		}
		if (dto.DoctorId.HasValue)
		{
			query = query.Where((Article a) => a.AuthorDoctorId == dto.DoctorId.Value);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((Article a) => a.Title.ToLower().Contains(value) || a.Content.ToLower().Contains(value) || a.AuthorDoctor.FullName.ToLower().Contains(value) || a.AuthorDoctor.Specialty.NameAr.ToLower().Contains(value) || (a.AuthorDoctor.Specialty.NameEn != null && a.AuthorDoctor.Specialty.NameEn.ToLower().Contains(value)));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status))
		{
			query = dto.Status.Trim().ToLowerInvariant() switch
			{
				"draft" => query.Where((Article a) => a.Status == ArticleStatus.Draft), 
				"published" => query.Where((Article a) => a.Status == ArticleStatus.Published), 
				"pending" => query.Where((Article a) => a.ModerationStatus == ArticleModerationStatus.Pending), 
				"review" => query.Where((Article a) => a.ModerationStatus == ArticleModerationStatus.Pending), 
				"approved" => query.Where((Article a) => a.ModerationStatus == ArticleModerationStatus.Approved), 
				"rejected" => query.Where((Article a) => a.ModerationStatus == ArticleModerationStatus.Rejected), 
				_ => query, 
			};
		}
		if (dto.DateFrom.HasValue)
		{
			query = query.Where((Article a) => a.CreatedAt >= dto.DateFrom.Value);
		}
		if (dto.DateTo.HasValue)
		{
			query = query.Where((Article a) => a.CreatedAt <= dto.DateTo.Value);
		}
		int total = await query.CountAsync();
		query = SortArticles(query, dto);
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = total,
			items = await (from a in query.Skip((page - 1) * pageSize).Take(pageSize)
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
				}).ToListAsync()
		});
	}

	[HttpGet("articles/{id:int}")]
	public async Task<IActionResult> GetArticle(int id)
	{
		ArticleDetailsDto articleDetailsDto = await (from a in _db.Articles.AsNoTracking()
			where a.Id == id && !a.IsDeleted
			select new ArticleDetailsDto
			{
				Id = a.Id,
				Title = a.Title,
				Content = a.Content,
				CoverImageUrl = a.CoverImageUrl,
				Status = a.Status.ToString(),
				ModerationStatus = a.ModerationStatus.ToString(),
				RejectReason = a.RejectReason,
				ViewCount = a.ViewCount,
				PublishedAt = a.PublishedAt,
				CreatedAt = a.CreatedAt,
				UpdatedAt = a.UpdatedAt,
				AuthorDoctorId = a.AuthorDoctorId,
				AuthorName = a.AuthorDoctor.FullName,
				SpecialtyNameAr = a.AuthorDoctor.Specialty.NameAr,
				SpecialtyNameEn = a.AuthorDoctor.Specialty.NameEn
			}).FirstOrDefaultAsync();
		if (articleDetailsDto == null)
		{
			return NotFound(new
			{
				message = "Article not found"
			});
		}
		return Ok(articleDetailsDto);
	}

	[HttpPut("articles/{id:int}")]
	public async Task<IActionResult> UpdateArticle(int id, [FromBody] UpdateArticleDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		Article article = await _db.Articles.FirstOrDefaultAsync((Article a) => a.Id == id && !a.IsDeleted);
		if (article == null)
		{
			return NotFound(new
			{
				message = "Article not found"
			});
		}
		if (!string.IsNullOrWhiteSpace(dto.Title))
		{
			article.Title = dto.Title.Trim();
		}
		if (dto.Content != null)
		{
			article.Content = dto.Content;
		}
		if (dto.CoverImageUrl != null)
		{
			article.CoverImageUrl = dto.CoverImageUrl.Trim();
		}
		article.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("update", "article", id.ToString(), null);
		return Ok(new
		{
			message = "Article updated successfully"
		});
	}

	[HttpPut("articles/{id:int}/publish")]
	public async Task<IActionResult> PublishArticle(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] PublishArticleDto? dto)
	{
		Article article = await _db.Articles.FirstOrDefaultAsync((Article a) => a.Id == id && !a.IsDeleted);
		if (article == null)
		{
			return NotFound(new
			{
				message = "Article not found"
			});
		}
		bool publish = dto?.IsPublished ?? (article.Status != ArticleStatus.Published);
		article.Status = (publish ? ArticleStatus.Published : ArticleStatus.Draft);
		article.PublishedAt = (publish ? new DateTime?(DateTime.UtcNow) : ((DateTime?)null));
		if (publish)
		{
			article.ModerationStatus = ArticleModerationStatus.Approved;
			article.RejectReason = null;
		}
		article.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync(publish ? "publish" : "unpublish", "article", id.ToString(), null);
		return Ok(new
		{
			message = (publish ? "Article published successfully" : "Article unpublished successfully"),
			isPublished = publish
		});
	}

	[HttpPut("articles/{id:int}/approve")]
	public async Task<IActionResult> ApproveArticle(int id)
	{
		Article article = await _db.Articles.Include((Article a) => a.AuthorDoctor).FirstOrDefaultAsync((Article a) => a.Id == id && !a.IsDeleted);
		if (article == null)
		{
			return NotFound(new
			{
				message = "Article not found"
			});
		}
		article.ModerationStatus = ArticleModerationStatus.Approved;
		article.RejectReason = null;
		article.UpdatedAt = DateTime.UtcNow;
		await NotifyAsync(article.AuthorDoctor.UserId, "Article approved", "Your article has been approved", "article");
		await _db.SaveChangesAsync();
		await LogAsync("approve", "article", id.ToString(), null);
		return Ok(new
		{
			message = "Article approved successfully"
		});
	}

	[HttpPut("articles/{id:int}/reject")]
	public async Task<IActionResult> RejectArticle(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] RejectVerificationDto? dto)
	{
		Article article = await _db.Articles.Include((Article a) => a.AuthorDoctor).FirstOrDefaultAsync((Article a) => a.Id == id && !a.IsDeleted);
		if (article == null)
		{
			return NotFound(new
			{
				message = "Article not found"
			});
		}
		article.ModerationStatus = ArticleModerationStatus.Rejected;
		article.RejectReason = dto?.Reason;
		article.Status = ArticleStatus.Draft;
		article.PublishedAt = null;
		article.UpdatedAt = DateTime.UtcNow;
		await NotifyAsync(article.AuthorDoctor.UserId, "Article rejected", dto?.Reason ?? "Your article has been rejected", "article");
		await _db.SaveChangesAsync();
		await LogAsync("reject", "article", id.ToString(), dto?.Reason);
		return Ok(new
		{
			message = "Article rejected successfully"
		});
	}

	[HttpDelete("articles/{id:int}")]
	public async Task<IActionResult> DeleteArticle(int id)
	{
		Article article = await _db.Articles.FirstOrDefaultAsync((Article a) => a.Id == id && !a.IsDeleted);
		if (article == null)
		{
			return NotFound(new
			{
				message = "Article not found"
			});
		}
		article.IsDeleted = true;
		article.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("delete", "article", id.ToString(), null);
		return Ok(new
		{
			message = "Article deleted successfully"
		});
	}

	[HttpPut("articles/{id:int}/archive")]
	public async Task<IActionResult> ArchiveArticle(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminArchiveDto? dto)
	{
		Article article = await _db.Articles.FirstOrDefaultAsync((Article a) => a.Id == id && !a.IsDeleted);
		if (article == null)
		{
			return NotFound(new
			{
				message = "Article not found"
			});
		}
		article.IsDeleted = true;
		article.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("archive", "article", id.ToString(), dto?.Reason);
		return Ok(new
		{
			message = "Article archived successfully"
		});
	}

	[HttpGet("audit-logs")]
	public async Task<IActionResult> GetAuditLogs([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<AuditLog> query = _db.AuditLogs.AsNoTracking();
		if (!string.IsNullOrWhiteSpace(dto.ActorUserId))
		{
			query = query.Where((AuditLog l) => l.ActorUserId == dto.ActorUserId);
		}
		if (!string.IsNullOrWhiteSpace(dto.EntityType))
		{
			string entityType = dto.EntityType.Trim().ToLowerInvariant();
			query = query.Where((AuditLog l) => l.EntityType.ToLower() == entityType);
		}
		if (!string.IsNullOrWhiteSpace(dto.EntityId))
		{
			query = query.Where((AuditLog l) => l.EntityId == dto.EntityId.Trim());
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((AuditLog l) => l.Action.ToLower().Contains(value) || l.EntityType.ToLower().Contains(value) || (l.Details != null && l.Details.ToLower().Contains(value)));
		}
		if (dto.DateFrom.HasValue)
		{
			query = query.Where((AuditLog l) => l.CreatedAt >= dto.DateFrom.Value);
		}
		if (dto.DateTo.HasValue)
		{
			query = query.Where((AuditLog l) => l.CreatedAt <= dto.DateTo.Value);
		}
		int total = await query.CountAsync();
		query = SortAuditLogs(query, dto);
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = total,
			items = await (from l in query.Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = l.Id,
					ActorUserId = l.ActorUserId,
					actorEmail = ((l.Actor != null) ? l.Actor.Email : null),
					Action = l.Action,
					EntityType = l.EntityType,
					EntityId = l.EntityId,
					Details = l.Details,
					CreatedAt = l.CreatedAt
				}).ToListAsync()
		});
	}

	[HttpGet("reports")]
	public async Task<IActionResult> GetReports([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<UserReport> query = _db.UserReports.AsNoTracking().AsQueryable();
		if (!string.IsNullOrWhiteSpace(dto.UserId))
		{
			query = query.Where((UserReport r) => r.ReporterUserId == dto.UserId);
		}
		if (!string.IsNullOrWhiteSpace(dto.EntityType))
		{
			string entityType = dto.EntityType.Trim().ToLowerInvariant();
			query = query.Where((UserReport r) => r.TargetType.ToLower() == entityType);
		}
		if (!string.IsNullOrWhiteSpace(dto.EntityId) && int.TryParse(dto.EntityId, out var reportTargetId))
		{
			query = query.Where((UserReport r) => r.TargetId == reportTargetId);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((UserReport r) => r.Reason.ToLower().Contains(value) || (r.Resolution != null && r.Resolution.ToLower().Contains(value)) || r.TargetType.ToLower().Contains(value) || (r.Reporter.FullName != null && r.Reporter.FullName.ToLower().Contains(value)) || (r.Reporter.Email != null && r.Reporter.Email.ToLower().Contains(value)));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status))
		{
			string status = dto.Status.Trim().ToLowerInvariant();
			query = query.Where((UserReport r) => r.Status == status);
		}
		if (dto.DateFrom.HasValue)
		{
			query = query.Where((UserReport r) => r.CreatedAt >= dto.DateFrom.Value);
		}
		if (dto.DateTo.HasValue)
		{
			query = query.Where((UserReport r) => r.CreatedAt <= dto.DateTo.Value);
		}
		int total = await query.CountAsync();
		query = SortReports(query, dto);
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = total,
			items = await (from r in query.Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = r.Id,
					ReporterUserId = r.ReporterUserId,
					reporterName = r.Reporter.FullName,
					reporterEmail = r.Reporter.Email,
					TargetType = r.TargetType,
					TargetId = r.TargetId,
					Reason = r.Reason,
					Status = r.Status,
					Resolution = r.Resolution,
					CreatedAt = r.CreatedAt,
					ResolvedAt = r.ResolvedAt
				}).ToListAsync()
		});
	}

	[HttpPost("reports/{id:int}/resolve")]
	public async Task<IActionResult> ResolveReport(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ResolveReportDto? dto)
	{
		UserReport userReport = await _db.UserReports.FirstOrDefaultAsync((UserReport r) => r.Id == id);
		if (userReport == null)
		{
			return NotFound(new
			{
				message = "Report not found"
			});
		}
		if (userReport.Status == "resolved")
		{
			return BadRequest(new
			{
				message = "Report is already resolved"
			});
		}
		userReport.Status = "resolved";
		userReport.Resolution = dto?.Resolution;
		userReport.ResolvedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("resolve", "report", id.ToString(), dto?.Resolution);
		return Ok(new
		{
			message = "Report resolved successfully"
		});
	}

	[HttpGet("appointments")]
	public async Task<IActionResult> GetAppointments([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<Appointment> query = _db.Appointments.AsNoTracking().AsQueryable();
		if (!string.IsNullOrWhiteSpace(dto.UserId))
		{
			query = query.Where((Appointment a) => a.PatientUserId == dto.UserId);
		}
		if (dto.DoctorId.HasValue)
		{
			query = query.Where((Appointment a) => a.DoctorId == dto.DoctorId.Value);
		}
		if (dto.ClinicId.HasValue)
		{
			query = query.Where((Appointment a) => a.ClinicId == (int?)dto.ClinicId.Value);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((Appointment a) => (a.Patient.FullName != null && a.Patient.FullName.ToLower().Contains(value)) || a.Doctor.FullName.ToLower().Contains(value) || (a.Clinic != null && a.Clinic.NameAr != null && a.Clinic.NameAr.ToLower().Contains(value)));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status) && Enum.TryParse<AppointmentStatus>(dto.Status.Trim(), ignoreCase: true, out var status))
		{
			query = query.Where((Appointment a) => a.Status == status);
		}
		if (dto.DateFrom.HasValue)
		{
			query = query.Where((Appointment a) => a.ScheduledAt >= dto.DateFrom.Value);
		}
		if (dto.DateTo.HasValue)
		{
			query = query.Where((Appointment a) => a.ScheduledAt <= dto.DateTo.Value);
		}
		int total = await query.CountAsync();
		query = SortAppointments(query, dto);
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = total,
			items = await (from a in query.Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = a.Id,
					PatientUserId = a.PatientUserId,
					patientName = a.Patient.FullName,
					patientEmail = a.Patient.Email,
					ContactName = a.ContactName,
					ContactPhone = a.ContactPhone,
					DoctorId = a.DoctorId,
					doctorName = a.Doctor.FullName,
					doctorPhone = a.Doctor.Phone,
					ClinicId = a.ClinicId,
					clinicName = ((a.Clinic != null) ? a.Clinic.NameAr : null),
					ScheduledAt = a.ScheduledAt,
					status = a.Status.ToString(),
					Reason = a.Reason,
					Notes = a.Notes,
					CreatedAt = a.CreatedAt
				}).ToListAsync()
		});
	}

	[HttpGet("appointments/{id:int}")]
	public async Task<IActionResult> GetAppointment(int id)
	{
		var anon = await (from a in _db.Appointments.AsNoTracking()
			where a.Id == id
			select new
			{
				Id = a.Id,
				PatientUserId = a.PatientUserId,
				patientName = a.Patient.FullName,
				patientEmail = a.Patient.Email,
				ContactName = a.ContactName,
				ContactPhone = a.ContactPhone,
				DoctorId = a.DoctorId,
				doctorName = a.Doctor.FullName,
				doctorPhone = a.Doctor.Phone,
				ClinicId = a.ClinicId,
				clinicName = ((a.Clinic != null) ? a.Clinic.NameAr : null),
				ScheduledAt = a.ScheduledAt,
				status = a.Status.ToString(),
				Reason = a.Reason,
				Notes = a.Notes,
				CreatedAt = a.CreatedAt,
				UpdatedAt = a.UpdatedAt
			}).FirstOrDefaultAsync();
		if (anon == null)
		{
			return NotFound(new
			{
				message = "Appointment not found"
			});
		}
		return Ok(anon);
	}

	[HttpGet("orders")]
	public async Task<IActionResult> GetOrders([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<MedicineOrder> query = _db.MedicineOrders.AsNoTracking().AsQueryable();
		if (!string.IsNullOrWhiteSpace(dto.UserId))
		{
			query = query.Where((MedicineOrder o) => o.PatientUserId == dto.UserId);
		}
		if (dto.PharmacyId.HasValue)
		{
			query = query.Where((MedicineOrder o) => o.PharmacyId == dto.PharmacyId.Value);
		}
		if (!string.IsNullOrWhiteSpace(dto.Status) && Enum.TryParse<MedicineOrderStatus>(dto.Status.Trim(), ignoreCase: true, out var status))
		{
			query = query.Where((MedicineOrder o) => o.Status == status);
		}
		if (!string.IsNullOrWhiteSpace(dto.PaymentStatus) && Enum.TryParse<MedicineOrderPaymentStatus>(dto.PaymentStatus.Trim(), ignoreCase: true, out var paymentStatus))
		{
			query = query.Where((MedicineOrder o) => o.PaymentStatus == paymentStatus);
		}
		if (!string.IsNullOrWhiteSpace(dto.Fulfillment) && Enum.TryParse<MedicineOrderFulfillment>(dto.Fulfillment.Trim(), ignoreCase: true, out var fulfillment))
		{
			query = query.Where((MedicineOrder o) => o.Fulfillment == fulfillment);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string search = dto.Search.Trim().ToLower();
			query = query.Where((MedicineOrder o) => o.OrderNumber.ToLower().Contains(search) || o.ContactName.ToLower().Contains(search) || o.ContactPhone.ToLower().Contains(search) || o.Pharmacy.PharmacyName.ToLower().Contains(search) || (o.Patient.Email != null && o.Patient.Email.ToLower().Contains(search)));
		}
		if (dto.DateFrom.HasValue)
		{
			query = query.Where((MedicineOrder o) => o.CreatedAt >= dto.DateFrom.Value);
		}
		if (dto.DateTo.HasValue)
		{
			query = query.Where((MedicineOrder o) => o.CreatedAt <= dto.DateTo.Value);
		}
		int total = await query.CountAsync();
		query = SortOrders(query, dto);
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = total,
			items = await (from o in query.Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = o.Id,
					OrderNumber = o.OrderNumber,
					customer = o.ContactName,
					phone = o.ContactPhone,
					pharmacyId = o.PharmacyId,
					pharmacy = o.Pharmacy.PharmacyName,
					status = o.Status.ToString(),
					fulfillment = o.Fulfillment.ToString(),
					paymentStatus = o.PaymentStatus.ToString(),
					itemsCount = o.Items.Sum((MedicineOrderItem i) => i.Quantity),
					Subtotal = o.Subtotal,
					DeliveryFee = o.DeliveryFee,
					Total = o.Total,
					CreatedAt = o.CreatedAt,
					DeliveredAt = o.DeliveredAt
				}).ToListAsync()
		});
	}

	[HttpGet("orders/{id:int}")]
	public async Task<IActionResult> GetOrder(int id)
	{
		var anon = await (from o in _db.MedicineOrders.AsNoTracking()
			where o.Id == id
			select new
			{
				Id = o.Id,
				OrderNumber = o.OrderNumber,
				PatientUserId = o.PatientUserId,
				patientName = o.Patient.FullName,
				patientEmail = o.Patient.Email,
				customer = o.ContactName,
				phone = o.ContactPhone,
				DeliveryAddress = o.DeliveryAddress,
				Notes = o.Notes,
				pharmacyId = o.PharmacyId,
				pharmacy = o.Pharmacy.PharmacyName,
				pharmacyPhone = o.Pharmacy.Phone,
				status = o.Status.ToString(),
				fulfillment = o.Fulfillment.ToString(),
				paymentMethod = o.PaymentMethod.ToString(),
				paymentStatus = o.PaymentStatus.ToString(),
				Subtotal = o.Subtotal,
				DeliveryFee = o.DeliveryFee,
				Total = o.Total,
				CreatedAt = o.CreatedAt,
				UpdatedAt = o.UpdatedAt,
				DeliveredAt = o.DeliveredAt,
				deliveryTask = ((o.DeliveryTask == null) ? null : new
				{
					Id = o.DeliveryTask.Id,
					status = o.DeliveryTask.Status.ToString(),
					CourierName = o.DeliveryTask.CourierName,
					CourierPhone = o.DeliveryTask.CourierPhone,
					DistanceKm = o.DeliveryTask.DistanceKm,
					EtaMinutes = o.DeliveryTask.EtaMinutes,
					CreatedAt = o.DeliveryTask.CreatedAt,
					UpdatedAt = o.DeliveryTask.UpdatedAt
				}),
				items = o.Items.Select((MedicineOrderItem i) => new
				{
					Id = i.Id,
					MedicineId = i.MedicineId,
					medicineName = i.Medicine.Name,
					Quantity = i.Quantity,
					UnitPrice = i.UnitPrice,
					LineTotal = i.LineTotal
				})
			}).FirstOrDefaultAsync();
		if (anon == null)
		{
			return NotFound(new
			{
				message = "Order not found"
			});
		}
		return Ok(anon);
	}

	[HttpPut("orders/{id:int}/status")]
	public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		if (!OrderWorkflow.TryParseOrderStatus(dto.Status, out var next))
		{
			return BadRequest(new
			{
				message = "Invalid order status"
			});
		}
		MedicineOrder order = await _db.MedicineOrders.Include((MedicineOrder o) => o.DeliveryTask).Include((MedicineOrder o) => o.Items).Include((MedicineOrder o) => o.Prescription)
			.FirstOrDefaultAsync((MedicineOrder o) => o.Id == id);
		if (order == null)
		{
			return NotFound(new
			{
				message = "Order not found"
			});
		}
		if (!OrderWorkflow.CanTransition(order.Status, next, order.Fulfillment))
		{
			return BadRequest(new
			{
				message = "Order status cannot be changed to the requested status"
			});
		}
		List<int> medicineIds = order.Items.Select((MedicineOrderItem i) => i.MedicineId).ToList();
		Dictionary<int, PharmacyMedicine> stockRecords = await _db.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.PharmacyId == order.PharmacyId && medicineIds.Contains(pm.MedicineId)).ToDictionaryAsync((PharmacyMedicine pm) => pm.MedicineId);
		Dictionary<int, int> dictionary = ((!order.PrescriptionId.HasValue) ? new Dictionary<int, int>() : (await OrderQueryHelper.GetDeliveredPrescriptionQuantitiesAsync(_db, order.PrescriptionId.Value, order.Id)));
		Dictionary<int, int> alreadyDeliveredQuantities = dictionary;
		OrderWorkflow.ApplyOrderStatus(order, next, stockRecords, alreadyDeliveredQuantities);
		string note = dto.Notes?.Trim();
		if (!string.IsNullOrWhiteSpace(note))
		{
			string text = $"[Admin {DateTime.UtcNow:O}] {note}";
			order.Notes = (string.IsNullOrWhiteSpace(order.Notes) ? text : (order.Notes + "\n" + text));
		}
		await _db.SaveChangesAsync();
		await LogAsync("update-status", "medicine-order", order.Id.ToString(), string.IsNullOrWhiteSpace(note) ? next.ToString() : $"{next}: {note}");
		return Ok(new
		{
			message = "Order status updated successfully"
		});
	}

	[HttpPut("appointments/{id:int}/confirm")]
	public async Task<IActionResult> ConfirmAppointment(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AppointmentActionDto? dto)
	{
		return await UpdateAdminAppointmentStatus(id, AppointmentStatus.Confirmed, dto?.Notes, "Appointment confirmed successfully");
	}

	[HttpPut("appointments/{id:int}/cancel")]
	public async Task<IActionResult> CancelAppointment(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AppointmentActionDto? dto)
	{
		return await UpdateAdminAppointmentStatus(id, AppointmentStatus.Cancelled, dto?.Notes, "Appointment cancelled successfully");
	}

	[HttpPut("appointments/{id:int}/complete")]
	public async Task<IActionResult> CompleteAppointment(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AppointmentActionDto? dto)
	{
		return await UpdateAdminAppointmentStatus(id, AppointmentStatus.Completed, dto?.Notes, "Appointment completed successfully");
	}

	[HttpGet("medicines")]
	public async Task<IActionResult> GetMedicines([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		string search = dto.Search?.Trim().ToLower();
		IQueryable<Medicine> baseQuery = _db.Medicines.AsNoTracking().AsQueryable();
		if (!dto.IncludeArchived && !string.Equals(dto.Status, "archived", StringComparison.OrdinalIgnoreCase))
		{
			baseQuery = baseQuery.Where((Medicine m) => !m.IsArchived);
		}
		if (!string.IsNullOrWhiteSpace(search))
		{
			baseQuery = baseQuery.Where((Medicine m) => m.Name.ToLower().Contains(search) || (m.ActiveIngredient != null && m.ActiveIngredient.ToLower().Contains(search)) || (m.Company != null && m.Company.ToLower().Contains(search)) || (m.Category != null && m.Category.ToLower().Contains(search)) || (m.Form != null && m.Form.ToLower().Contains(search)) || (m.Strength != null && m.Strength.ToLower().Contains(search)));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status))
		{
			baseQuery = dto.Status.Trim().ToLowerInvariant() switch
			{
				"archived" => baseQuery.Where((Medicine m) => m.IsArchived), 
				"active" => baseQuery.Where((Medicine m) => !m.IsArchived && (m.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.IsAvailable).Sum((PharmacyMedicine pm) => pm.Quantity) ?? 0) > 20), 
				"low-stock" => baseQuery.Where((Medicine m) => !m.IsArchived && (m.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.IsAvailable).Sum((PharmacyMedicine pm) => pm.Quantity) ?? 0) > 0 && (m.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.IsAvailable).Sum((PharmacyMedicine pm) => pm.Quantity) ?? 0) <= 20), 
				"out-of-stock" => baseQuery.Where((Medicine m) => !m.IsArchived && (m.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.IsAvailable).Sum((PharmacyMedicine pm) => pm.Quantity) ?? 0) <= 0), 
				_ => baseQuery, 
			};
		}
		if (dto.DateFrom.HasValue)
		{
			baseQuery = baseQuery.Where((Medicine m) => !m.ArchivedAt.HasValue || m.ArchivedAt >= dto.DateFrom.Value);
		}
		if (dto.DateTo.HasValue)
		{
			baseQuery = baseQuery.Where((Medicine m) => !m.ArchivedAt.HasValue || m.ArchivedAt <= dto.DateTo.Value);
		}
		int total = await baseQuery.CountAsync();
		var source = baseQuery.Select((Medicine m) => new
		{
			Id = m.Id,
			Name = m.Name,
			ActiveIngredient = m.ActiveIngredient,
			Form = m.Form,
			Strength = m.Strength,
			Company = m.Company,
			Category = m.Category,
			SymptomsJson = m.SymptomsJson,
			UsagesJson = m.UsagesJson,
			WarningsJson = m.WarningsJson,
			InteractionsJson = m.InteractionsJson,
			DosageAr = m.DosageAr,
			DosageEn = m.DosageEn,
			ImageUrl = m.ImageUrl,
			IsArchived = m.IsArchived,
			ArchivedAt = m.ArchivedAt,
			stock = (m.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.IsAvailable).Sum((PharmacyMedicine pm) => pm.Quantity) ?? 0),
			pharmaciesCount = m.PharmacyMedicines.Count((PharmacyMedicine pm) => pm.IsAvailable),
			minPrice = (from pm in m.PharmacyMedicines
				where pm.IsAvailable && pm.Price.HasValue
				orderby pm.Price
				select pm.Price).FirstOrDefault()
		});
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = total,
			items = await source.OrderBy(m => m.Name).Skip((page - 1) * pageSize).Take(pageSize)
				.ToListAsync()
		});
	}

	[HttpPut("medicines/{id:int}")]
	public async Task<IActionResult> UpdateMedicine(int id, [FromBody] UpdateMedicineDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		Medicine medicine = await _db.Medicines.FirstOrDefaultAsync((Medicine m) => m.Id == id);
		if (medicine == null)
		{
			return NotFound(new
			{
				message = "Medicine not found"
			});
		}
		if (!string.IsNullOrWhiteSpace(dto.Name))
		{
			string name = dto.Name.Trim();
			string normalizedName = name.ToLowerInvariant();
			if (await _db.Medicines.AnyAsync((Medicine m) => m.Id != id && m.NormalizedName == normalizedName))
			{
				return Conflict(new
				{
					message = "Medicine already exists"
				});
			}
			medicine.Name = name;
			medicine.NormalizedName = normalizedName;
		}
		if (dto.ActiveIngredient != null)
		{
			medicine.ActiveIngredient = dto.ActiveIngredient.Trim();
		}
		if (dto.Form != null)
		{
			medicine.Form = dto.Form.Trim();
		}
		if (dto.Strength != null)
		{
			medicine.Strength = dto.Strength.Trim();
		}
		if (dto.Company != null)
		{
			medicine.Company = dto.Company.Trim();
		}
		if (dto.Category != null)
		{
			medicine.Category = dto.Category.Trim();
		}
		if (dto.SymptomsJson != null)
		{
			medicine.SymptomsJson = dto.SymptomsJson.Trim();
		}
		if (dto.UsagesJson != null)
		{
			medicine.UsagesJson = dto.UsagesJson.Trim();
		}
		if (dto.WarningsJson != null)
		{
			medicine.WarningsJson = dto.WarningsJson.Trim();
		}
		if (dto.InteractionsJson != null)
		{
			medicine.InteractionsJson = dto.InteractionsJson.Trim();
		}
		if (dto.DosageAr != null)
		{
			medicine.DosageAr = dto.DosageAr.Trim();
		}
		if (dto.DosageEn != null)
		{
			medicine.DosageEn = dto.DosageEn.Trim();
		}
		if (dto.ImageUrl != null)
		{
			medicine.ImageUrl = dto.ImageUrl.Trim();
		}
		if (medicine.IsArchived)
		{
			medicine.IsArchived = false;
			medicine.ArchivedAt = null;
		}
		await _db.SaveChangesAsync();
		await LogAsync("update", "medicine", medicine.Id.ToString(), medicine.Name);
		return Ok(new
		{
			message = "Medicine updated successfully"
		});
	}

	[HttpDelete("medicines/{id:int}")]
	public async Task<IActionResult> DeleteMedicine(int id)
	{
		Medicine medicine = await _db.Medicines.FirstOrDefaultAsync((Medicine m) => m.Id == id);
		if (medicine == null)
		{
			return NotFound(new
			{
				message = "Medicine not found"
			});
		}
		if (await _db.PharmacyMedicines.AnyAsync((PharmacyMedicine pm) => pm.MedicineId == id))
		{
			medicine.IsArchived = true;
			medicine.ArchivedAt = DateTime.UtcNow;
			await _db.SaveChangesAsync();
			await LogAsync("archive", "medicine", medicine.Id.ToString(), medicine.Name);
			return Ok(new
			{
				message = "Medicine archived because it is linked to pharmacies"
			});
		}
		_db.Medicines.Remove(medicine);
		await _db.SaveChangesAsync();
		await LogAsync("delete", "medicine", medicine.Id.ToString(), medicine.Name);
		return Ok(new
		{
			message = "Medicine deleted successfully"
		});
	}

	[HttpPut("medicines/{id:int}/archive")]
	public async Task<IActionResult> ArchiveMedicine(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminArchiveDto? dto)
	{
		Medicine medicine = await _db.Medicines.FirstOrDefaultAsync((Medicine m) => m.Id == id);
		if (medicine == null)
		{
			return NotFound(new
			{
				message = "Medicine not found"
			});
		}
		medicine.IsArchived = true;
		medicine.ArchivedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("archive", "medicine", id.ToString(), dto?.Reason ?? medicine.Name);
		return Ok(new
		{
			message = "Medicine archived successfully"
		});
	}

	[HttpPut("medicines/{id:int}/restore")]
	public async Task<IActionResult> RestoreMedicine(int id)
	{
		Medicine medicine = await _db.Medicines.FirstOrDefaultAsync((Medicine m) => m.Id == id);
		if (medicine == null)
		{
			return NotFound(new
			{
				message = "Medicine not found"
			});
		}
		medicine.IsArchived = false;
		medicine.ArchivedAt = null;
		await _db.SaveChangesAsync();
		await LogAsync("restore", "medicine", id.ToString(), medicine.Name);
		return Ok(new
		{
			message = "Medicine restored successfully"
		});
	}

	[HttpGet("analytics/users-growth")]
	public async Task<IActionResult> UsersGrowth()
	{
		var value = (await (from u in _db.Users.AsNoTracking()
			where !u.IsDeleted
			group u by new
			{
				u.CreatedAt.Year,
				u.CreatedAt.Month,
				u.CreatedAt.Day
			} into g
			select new
			{
				Year = g.Key.Year,
				Month = g.Key.Month,
				Day = g.Key.Day,
				count = g.Count()
			} into x
			orderby x.Year, x.Month, x.Day
			select x).ToListAsync()).Select(x => new
		{
			date = new DateTime(x.Year, x.Month, x.Day),
			count = x.count
		});
		return Ok(value);
	}

	[HttpGet("analytics/top-doctors")]
	public async Task<IActionResult> TopDoctors([FromQuery] int limit = 10)
	{
		limit = Math.Clamp(limit, 1, 100);
		return Ok(await (from d in (from d in _db.DoctorProfiles.AsNoTracking()
				where d.IsActive
				orderby d.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0 descending, d.ViewCount descending
				select d).Take(limit)
			select new
			{
				Id = d.Id,
				FullName = d.FullName,
				ViewCount = d.ViewCount,
				reviewsCount = d.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				avgRating = (d.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0)
			}).ToListAsync());
	}

	[HttpGet("analytics/top-pharmacies")]
	public async Task<IActionResult> TopPharmacies([FromQuery] int limit = 10)
	{
		limit = Math.Clamp(limit, 1, 100);
		return Ok(await (from p in (from p in _db.PharmacyProfiles.AsNoTracking()
				where p.IsActive
				orderby p.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0 descending, p.ViewCount descending
				select p).Take(limit)
			select new
			{
				Id = p.Id,
				PharmacyName = p.PharmacyName,
				ViewCount = p.ViewCount,
				reviewsCount = p.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				avgRating = (p.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0)
			}).ToListAsync());
	}

	[HttpGet("analytics/searches")]
	public async Task<IActionResult> SearchAnalytics([FromQuery] int limit = 20)
	{
		limit = Math.Clamp(limit, 1, 100);
		return Ok(await (from s in _db.SearchLogs.AsNoTracking()
			group s by new { s.Query, s.Category } into g
			select new
			{
				Query = g.Key.Query,
				Category = g.Key.Category,
				count = g.Count(),
				lastSearchedAt = g.Max((SearchLog s) => s.CreatedAt)
			} into x
			orderby x.count descending, x.lastSearchedAt descending
			select x).Take(limit).ToListAsync());
	}

	[HttpGet("analytics/medicine-demand")]
	public async Task<IActionResult> MedicineDemand([FromQuery] int limit = 20)
	{
		limit = Math.Clamp(limit, 1, 100);
		return Ok(await (from pm in _db.PharmacyMedicines.AsNoTracking()
			where !pm.Medicine.IsArchived
			group pm by new
			{
				pm.MedicineId,
				pm.Medicine.Name
			} into g
			select new
			{
				medicineId = g.Key.MedicineId,
				medicineName = g.Key.Name,
				pharmaciesCount = g.Count(),
				availablePharmaciesCount = g.Count((PharmacyMedicine x) => x.IsAvailable),
				totalQuantity = g.Sum((PharmacyMedicine x) => x.Quantity ?? 0)
			} into x
			orderby x.availablePharmaciesCount descending, x.totalQuantity descending
			select x).Take(limit).ToListAsync());
	}

	[HttpGet("export/users")]
	public async Task<IActionResult> ExportUsers()
	{
		List<AppUser> list = await (from u in _db.Users.AsNoTracking()
			where !u.IsDeleted
			orderby u.Email
			select u).ToListAsync();
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("Id,Email,FullName,PhoneNumber,IsActive,EmailConfirmed,CreatedAt,LastLoginAt");
		foreach (AppUser item in list)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(7, 8, stringBuilder2);
			handler.AppendFormatted(Csv(item.Id));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Email));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.FullName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.PhoneNumber));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.IsActive);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.EmailConfirmed);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.CreatedAt, "o");
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.LastLoginAt?.ToString("o"));
			stringBuilder2.AppendLine(ref handler);
		}
		return File(Encoding.UTF8.GetBytes(stringBuilder.ToString()), "text/csv", "users.csv");
	}

	[HttpGet("export/doctors")]
	public async Task<IActionResult> ExportDoctors()
	{
		List<DoctorProfile> list = await (from d in _db.DoctorProfiles.AsNoTracking().Include((DoctorProfile d) => d.Specialty)
			orderby d.FullName
			select d).ToListAsync();
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("Id,FullName,Phone,LicenseNumber,Specialty,IsActive,IsFeatured,ViewCount,CreatedAt");
		foreach (DoctorProfile item in list)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(8, 9, stringBuilder2);
			handler.AppendFormatted(item.Id);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.FullName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Phone));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.LicenseNumber));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Specialty.NameAr));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.IsActive);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.IsFeatured);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.ViewCount);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.CreatedAt, "o");
			stringBuilder2.AppendLine(ref handler);
		}
		return File(Encoding.UTF8.GetBytes(stringBuilder.ToString()), "text/csv", "doctors.csv");
	}

	[HttpGet("export/pharmacies")]
	public async Task<IActionResult> ExportPharmacies()
	{
		List<PharmacyProfile> list = await (from p in _db.PharmacyProfiles.AsNoTracking().Include((PharmacyProfile p) => p.Governorate).Include((PharmacyProfile p) => p.City)
			orderby p.PharmacyName
			select p).ToListAsync();
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("Id,PharmacyName,Phone,LicenseNumber,Governorate,City,IsActive,IsFeatured,Status,ViewCount,CreatedAt");
		foreach (PharmacyProfile item in list)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(10, 11, stringBuilder2);
			handler.AppendFormatted(item.Id);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.PharmacyName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Phone));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.LicenseNumber));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Governorate.NameAr));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.City.NameAr));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.IsActive);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.IsFeatured);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Status));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.ViewCount);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.CreatedAt, "o");
			stringBuilder2.AppendLine(ref handler);
		}
		return File(Encoding.UTF8.GetBytes(stringBuilder.ToString()), "text/csv", "pharmacies.csv");
	}

	[HttpGet("export/medicines")]
	public async Task<IActionResult> ExportMedicines()
	{
		List<Medicine> list = await (from m in _db.Medicines.AsNoTracking()
			orderby m.Name
			select m).ToListAsync();
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("Id,Name,ActiveIngredient,Form,Strength,Company,Category,ImageUrl,IsArchived,ArchivedAt");
		foreach (Medicine item in list)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(9, 10, stringBuilder2);
			handler.AppendFormatted(item.Id);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Name));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.ActiveIngredient));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Form));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Strength));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Company));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Category));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.ImageUrl));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.IsArchived);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.ArchivedAt?.ToString("o"));
			stringBuilder2.AppendLine(ref handler);
		}
		return File(Encoding.UTF8.GetBytes(stringBuilder.ToString()), "text/csv", "medicines.csv");
	}

	[HttpGet("export/orders")]
	public async Task<IActionResult> ExportOrders()
	{
		List<MedicineOrder> list = await (from o in _db.MedicineOrders.AsNoTracking().Include((MedicineOrder o) => o.Pharmacy)
			orderby o.CreatedAt descending
			select o).ToListAsync();
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("Id,OrderNumber,Customer,Phone,Pharmacy,Status,Fulfillment,PaymentStatus,Subtotal,DeliveryFee,Total,CreatedAt,DeliveredAt");
		foreach (MedicineOrder item in list)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(12, 13, stringBuilder2);
			handler.AppendFormatted(item.Id);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.OrderNumber));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.ContactName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.ContactPhone));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Pharmacy.PharmacyName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.Status);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.Fulfillment);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.PaymentStatus);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.Subtotal);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.DeliveryFee);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.Total);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.CreatedAt, "o");
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.DeliveredAt?.ToString("o"));
			stringBuilder2.AppendLine(ref handler);
		}
		return File(Encoding.UTF8.GetBytes(stringBuilder.ToString()), "text/csv", "orders.csv");
	}

	[HttpGet("export/appointments")]
	public async Task<IActionResult> ExportAppointments()
	{
		List<Appointment> list = await (from a in _db.Appointments.AsNoTracking().Include((Appointment a) => a.Patient).Include((Appointment a) => a.Doctor)
				.Include((Appointment a) => a.Clinic)
			orderby a.ScheduledAt descending
			select a).ToListAsync();
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("Id,Patient,PatientEmail,ContactName,ContactPhone,Doctor,Clinic,ScheduledAt,Status,Reason,Notes,CreatedAt");
		foreach (Appointment item in list)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(11, 12, stringBuilder2);
			handler.AppendFormatted(item.Id);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Patient.FullName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Patient.Email));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.ContactName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.ContactPhone));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Doctor.FullName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Clinic?.NameAr));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.ScheduledAt, "o");
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.Status);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Reason));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Notes));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.CreatedAt, "o");
			stringBuilder2.AppendLine(ref handler);
		}
		return File(Encoding.UTF8.GetBytes(stringBuilder.ToString()), "text/csv", "appointments.csv");
	}

	[HttpGet("export/articles")]
	public async Task<IActionResult> ExportArticles()
	{
		List<Article> list = await (from a in _db.Articles.AsNoTracking().Include((Article a) => a.AuthorDoctor)
			where !a.IsDeleted
			orderby a.CreatedAt descending
			select a).ToListAsync();
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("Id,Title,Author,Status,ModerationStatus,ViewCount,PublishedAt,CreatedAt,UpdatedAt");
		foreach (Article item in list)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(8, 9, stringBuilder2);
			handler.AppendFormatted(item.Id);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Title));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.AuthorDoctor.FullName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.Status);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.ModerationStatus);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.ViewCount);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.PublishedAt?.ToString("o"));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.CreatedAt, "o");
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.UpdatedAt, "o");
			stringBuilder2.AppendLine(ref handler);
		}
		return File(Encoding.UTF8.GetBytes(stringBuilder.ToString()), "text/csv", "articles.csv");
	}

	[HttpGet("export/reviews")]
	public async Task<IActionResult> ExportReviews()
	{
		List<Review> list = await (from r in _db.Reviews.AsNoTracking().Include((Review r) => r.Reviewer).Include((Review r) => r.Doctor)
				.Include((Review r) => r.Pharmacy)
			where !r.IsDeleted
			orderby r.CreatedAt descending
			select r).ToListAsync();
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("Id,TargetType,Target,Reviewer,Rating,Verified,IsHidden,Comment,CreatedAt");
		foreach (Review item in list)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(8, 9, stringBuilder2);
			handler.AppendFormatted(item.Id);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.TargetType);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Doctor?.FullName ?? item.Pharmacy?.PharmacyName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Reviewer.FullName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.Rating);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.Verified);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.IsHidden);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Comment));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.CreatedAt, "o");
			stringBuilder2.AppendLine(ref handler);
		}
		return File(Encoding.UTF8.GetBytes(stringBuilder.ToString()), "text/csv", "reviews.csv");
	}

	[HttpGet("export/reports")]
	public async Task<IActionResult> ExportReports()
	{
		List<UserReport> list = await (from r in _db.UserReports.AsNoTracking().Include((UserReport r) => r.Reporter)
			orderby r.CreatedAt descending
			select r).ToListAsync();
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("Id,Reporter,ReporterEmail,TargetType,TargetId,Reason,Status,Resolution,CreatedAt,ResolvedAt");
		foreach (UserReport item in list)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(9, 10, stringBuilder2);
			handler.AppendFormatted(item.Id);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Reporter.FullName));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Reporter.Email));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.TargetType));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.TargetId);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Reason));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Status));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.Resolution));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.CreatedAt, "o");
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.ResolvedAt?.ToString("o"));
			stringBuilder2.AppendLine(ref handler);
		}
		return File(Encoding.UTF8.GetBytes(stringBuilder.ToString()), "text/csv", "reports.csv");
	}

	[HttpGet("export/lookups")]
	public async Task<IActionResult> ExportLookups()
	{
		List<Specialty> specialties = await (from s in _db.Specialties.AsNoTracking()
			orderby s.NameAr
			select s).ToListAsync();
		List<Governorate> governorates = await (from g in _db.Governorates.AsNoTracking()
			orderby g.NameAr
			select g).ToListAsync();
		List<City> list = await (from c in _db.Cities.AsNoTracking().Include((City c) => c.Governorate)
			orderby c.Governorate.NameAr, c.NameAr
			select c).ToListAsync();
		StringBuilder stringBuilder = new StringBuilder();
		stringBuilder.AppendLine("Type,Id,ParentId,ParentName,NameAr,NameEn,IsArchived,ArchivedAt");
		foreach (Specialty item in specialties)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder stringBuilder3 = stringBuilder2;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(16, 5, stringBuilder2);
			handler.AppendLiteral("specialty,");
			handler.AppendFormatted(item.Id);
			handler.AppendLiteral(",,,");
			handler.AppendFormatted(Csv(item.NameAr));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item.NameEn));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.IsArchived);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item.ArchivedAt?.ToString("o"));
			stringBuilder3.AppendLine(ref handler);
		}
		foreach (Governorate item2 in governorates)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder stringBuilder4 = stringBuilder2;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(18, 5, stringBuilder2);
			handler.AppendLiteral("governorate,");
			handler.AppendFormatted(item2.Id);
			handler.AppendLiteral(",,,");
			handler.AppendFormatted(Csv(item2.NameAr));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item2.NameEn));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item2.IsArchived);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item2.ArchivedAt?.ToString("o"));
			stringBuilder4.AppendLine(ref handler);
		}
		foreach (City item3 in list)
		{
			StringBuilder stringBuilder2 = stringBuilder;
			StringBuilder stringBuilder5 = stringBuilder2;
			StringBuilder.AppendInterpolatedStringHandler handler = new StringBuilder.AppendInterpolatedStringHandler(11, 7, stringBuilder2);
			handler.AppendLiteral("city,");
			handler.AppendFormatted(item3.Id);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item3.GovernorateId);
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item3.Governorate.NameAr));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item3.NameAr));
			handler.AppendLiteral(",");
			handler.AppendFormatted(Csv(item3.NameEn));
			handler.AppendLiteral(",");
			handler.AppendFormatted(item3.IsArchived);
			handler.AppendLiteral(",");
			handler.AppendFormatted(item3.ArchivedAt?.ToString("o"));
			stringBuilder5.AppendLine(ref handler);
		}
		return File(Encoding.UTF8.GetBytes(stringBuilder.ToString()), "text/csv", "lookups.csv");
	}

	[HttpGet("verifications/pending")]
	public async Task<IActionResult> GetPendingVerifications()
	{
		return Ok(new
		{
			doctors = await (from doctorVerification in _db.DoctorVerifications.AsNoTracking()
				where doctorVerification.Status == VerificationStatus.Pending
				select new
				{
					type = "doctor",
					verificationId = doctorVerification.Id,
					doctorId = doctorVerification.DoctorId,
					fullName = doctorVerification.Doctor.FullName,
					licenseNumber = doctorVerification.Doctor.LicenseNumber,
					specialtyAr = doctorVerification.Doctor.Specialty.NameAr,
					specialtyEn = doctorVerification.Doctor.Specialty.NameEn,
					cardImageUrl = doctorVerification.CardImageUrl,
					selfieWithCardUrl = doctorVerification.SelfieWithCardUrl
				}).ToListAsync(),
			pharmacies = await (from pharmacyVerification in _db.PharmacyVerifications.AsNoTracking()
				where pharmacyVerification.Status == VerificationStatus.Pending
				select new
				{
					type = "pharmacy",
					verificationId = pharmacyVerification.Id,
					pharmacyId = pharmacyVerification.PharmacyId,
					pharmacyName = pharmacyVerification.Pharmacy.PharmacyName,
					licenseNumber = pharmacyVerification.Pharmacy.LicenseNumber,
					governorateAr = pharmacyVerification.Pharmacy.Governorate.NameAr,
					governorateEn = pharmacyVerification.Pharmacy.Governorate.NameEn,
					cityAr = pharmacyVerification.Pharmacy.City.NameAr,
					cityEn = pharmacyVerification.Pharmacy.City.NameEn,
					licenseImageUrl = pharmacyVerification.LicenseImageUrl,
					pharmacistIdCardUrl = pharmacyVerification.PharmacistIdCardUrl
				}).ToListAsync()
		});
	}

	[HttpPost("doctors/{id:int}/approve")]
	public async Task<IActionResult> ApproveDoctor(int id)
	{
		DoctorVerification doctorVerification = await _db.DoctorVerifications.Include((DoctorVerification doctorVerification2) => doctorVerification2.Doctor).FirstOrDefaultAsync((DoctorVerification doctorVerification2) => doctorVerification2.DoctorId == id);
		if (doctorVerification == null)
		{
			return NotFound(new
			{
				message = "Doctor verification not found"
			});
		}
		if (!ProfessionalVerificationRules.CanReview(doctorVerification.Status))
		{
			return BadRequest(new
			{
				message = "Only pending doctor verifications can be approved"
			});
		}
		doctorVerification.Status = VerificationStatus.Approved;
		doctorVerification.ReviewedAt = DateTime.UtcNow;
		doctorVerification.RejectReason = null;
		doctorVerification.Doctor.IsActive = true;
		doctorVerification.Doctor.UpdatedAt = DateTime.UtcNow;
		await NotifyAsync(doctorVerification.Doctor.UserId, "Doctor verification approved", "Your doctor profile has been approved", "verification");
		await _db.SaveChangesAsync();
		await LogAsync("approve", "doctor-verification", id.ToString(), null);
		return Ok(new
		{
			message = "Doctor approved successfully"
		});
	}

	[HttpPost("doctors/{id:int}/reject")]
	public async Task<IActionResult> RejectDoctor(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] RejectVerificationDto? dto)
	{
		DoctorVerification doctorVerification = await _db.DoctorVerifications.Include((DoctorVerification doctorVerification2) => doctorVerification2.Doctor).FirstOrDefaultAsync((DoctorVerification doctorVerification2) => doctorVerification2.DoctorId == id);
		if (doctorVerification == null)
		{
			return NotFound(new
			{
				message = "Doctor verification not found"
			});
		}
		if (!ProfessionalVerificationRules.CanReview(doctorVerification.Status))
		{
			return BadRequest(new
			{
				message = "Only pending doctor verifications can be rejected"
			});
		}
		doctorVerification.Status = VerificationStatus.Rejected;
		doctorVerification.ReviewedAt = DateTime.UtcNow;
		doctorVerification.RejectReason = dto?.Reason;
		doctorVerification.Doctor.IsActive = false;
		doctorVerification.Doctor.UpdatedAt = DateTime.UtcNow;
		await NotifyAsync(doctorVerification.Doctor.UserId, "Doctor verification rejected", dto?.Reason ?? "Your doctor verification has been rejected", "verification");
		await _db.SaveChangesAsync();
		await LogAsync("reject", "doctor-verification", id.ToString(), dto?.Reason);
		return Ok(new
		{
			message = "Doctor rejected successfully"
		});
	}

	[HttpPost("pharmacies/{id:int}/approve")]
	public async Task<IActionResult> ApprovePharmacy(int id)
	{
		PharmacyVerification pharmacyVerification = await _db.PharmacyVerifications.Include((PharmacyVerification pharmacyVerification2) => pharmacyVerification2.Pharmacy).FirstOrDefaultAsync((PharmacyVerification pharmacyVerification2) => pharmacyVerification2.PharmacyId == id);
		if (pharmacyVerification == null)
		{
			return NotFound(new
			{
				message = "Pharmacy verification not found"
			});
		}
		if (!ProfessionalVerificationRules.CanReview(pharmacyVerification.Status))
		{
			return BadRequest(new
			{
				message = "Only pending pharmacy verifications can be approved"
			});
		}
		pharmacyVerification.Status = VerificationStatus.Approved;
		pharmacyVerification.ReviewedAt = DateTime.UtcNow;
		pharmacyVerification.RejectReason = null;
		pharmacyVerification.Pharmacy.IsActive = true;
		pharmacyVerification.Pharmacy.UpdatedAt = DateTime.UtcNow;
		await NotifyAsync(pharmacyVerification.Pharmacy.UserId, "Pharmacy verification approved", "Your pharmacy profile has been approved", "verification");
		await _db.SaveChangesAsync();
		await LogAsync("approve", "pharmacy-verification", id.ToString(), null);
		return Ok(new
		{
			message = "Pharmacy approved successfully"
		});
	}

	[HttpPost("pharmacies/{id:int}/reject")]
	public async Task<IActionResult> RejectPharmacy(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] RejectVerificationDto? dto)
	{
		PharmacyVerification pharmacyVerification = await _db.PharmacyVerifications.Include((PharmacyVerification pharmacyVerification2) => pharmacyVerification2.Pharmacy).FirstOrDefaultAsync((PharmacyVerification pharmacyVerification2) => pharmacyVerification2.PharmacyId == id);
		if (pharmacyVerification == null)
		{
			return NotFound(new
			{
				message = "Pharmacy verification not found"
			});
		}
		if (!ProfessionalVerificationRules.CanReview(pharmacyVerification.Status))
		{
			return BadRequest(new
			{
				message = "Only pending pharmacy verifications can be rejected"
			});
		}
		pharmacyVerification.Status = VerificationStatus.Rejected;
		pharmacyVerification.ReviewedAt = DateTime.UtcNow;
		pharmacyVerification.RejectReason = dto?.Reason;
		pharmacyVerification.Pharmacy.IsActive = false;
		pharmacyVerification.Pharmacy.UpdatedAt = DateTime.UtcNow;
		await NotifyAsync(pharmacyVerification.Pharmacy.UserId, "Pharmacy verification rejected", dto?.Reason ?? "Your pharmacy verification has been rejected", "verification");
		await _db.SaveChangesAsync();
		await LogAsync("reject", "pharmacy-verification", id.ToString(), dto?.Reason);
		return Ok(new
		{
			message = "Pharmacy rejected successfully"
		});
	}

	[HttpPost("specialties")]
	public async Task<IActionResult> CreateSpecialty([FromBody] CreateSpecialtyDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string nameAr = dto.NameAr.Trim();
		string nameEn = dto.NameEn?.Trim();
		if (await _db.Specialties.AnyAsync((Specialty s) => s.NameAr == nameAr || (nameEn != null && s.NameEn == nameEn)))
		{
			return Conflict(new
			{
				message = "Specialty already exists"
			});
		}
		Specialty specialty = new Specialty
		{
			NameAr = nameAr,
			NameEn = nameEn
		};
		_db.Specialties.Add(specialty);
		await _db.SaveChangesAsync();
		await LogAsync("create", "specialty", specialty.Id.ToString(), nameAr);
		return Ok(new
		{
			message = "Specialty created successfully",
			specialtyId = specialty.Id
		});
	}

	[HttpGet("specialties")]
	public async Task<IActionResult> GetSpecialties([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<Specialty> query = _db.Specialties.AsNoTracking().AsQueryable();
		if (!dto.IncludeArchived && !string.Equals(dto.Status, "archived", StringComparison.OrdinalIgnoreCase))
		{
			query = query.Where((Specialty s) => !s.IsArchived);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((Specialty s) => s.NameAr.ToLower().Contains(value) || (s.NameEn != null && s.NameEn.ToLower().Contains(value)));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status))
		{
			string text = dto.Status.Trim().ToLowerInvariant();
			IQueryable<Specialty> queryable = ((text == "archived") ? query.Where((Specialty s) => s.IsArchived) : ((!(text == "active")) ? query : query.Where((Specialty s) => !s.IsArchived)));
			query = queryable;
		}
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			items = await (from s in query.OrderBy((Specialty s) => s.NameAr).Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = s.Id,
					NameAr = s.NameAr,
					NameEn = s.NameEn,
					IsArchived = s.IsArchived,
					ArchivedAt = s.ArchivedAt,
					doctorsCount = ((s.Id == 0) ? 0 : _db.DoctorProfiles.Count((DoctorProfile d) => d.SpecialtyId == s.Id))
				}).ToListAsync()
		});
	}

	[HttpPut("specialties/{id:int}")]
	public async Task<IActionResult> UpdateSpecialty(int id, [FromBody] UpdateSpecialtyDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		Specialty specialty = await _db.Specialties.FirstOrDefaultAsync((Specialty s) => s.Id == id);
		if (specialty == null)
		{
			return NotFound(new
			{
				message = "Specialty not found"
			});
		}
		string nameAr = dto.NameAr.Trim();
		string nameEn = dto.NameEn?.Trim();
		if (await _db.Specialties.AnyAsync((Specialty s) => s.Id != id && (s.NameAr == nameAr || (nameEn != null && s.NameEn == nameEn))))
		{
			return Conflict(new
			{
				message = "Specialty already exists"
			});
		}
		specialty.NameAr = nameAr;
		specialty.NameEn = nameEn;
		if (specialty.IsArchived)
		{
			specialty.IsArchived = false;
			specialty.ArchivedAt = null;
		}
		await _db.SaveChangesAsync();
		await LogAsync("update", "specialty", id.ToString(), nameAr);
		return Ok(new
		{
			message = "Specialty updated successfully"
		});
	}

	[HttpPut("specialties/{id:int}/archive")]
	public async Task<IActionResult> ArchiveSpecialty(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminArchiveDto? dto)
	{
		Specialty specialty = await _db.Specialties.FirstOrDefaultAsync((Specialty s) => s.Id == id);
		if (specialty == null)
		{
			return NotFound(new
			{
				message = "Specialty not found"
			});
		}
		int num = await _db.DoctorProfiles.CountAsync((DoctorProfile d) => d.SpecialtyId == id);
		if (num > 0)
		{
			return Conflict(new
			{
				message = "Specialty cannot be archived while assigned to doctors",
				linkedDoctors = num
			});
		}
		specialty.IsArchived = true;
		specialty.ArchivedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("archive", "specialty", id.ToString(), dto?.Reason);
		return Ok(new
		{
			message = "Specialty archived successfully"
		});
	}

	[HttpPut("specialties/{id:int}/restore")]
	public async Task<IActionResult> RestoreSpecialty(int id)
	{
		Specialty specialty = await _db.Specialties.FirstOrDefaultAsync((Specialty s) => s.Id == id);
		if (specialty == null)
		{
			return NotFound(new
			{
				message = "Specialty not found"
			});
		}
		specialty.IsArchived = false;
		specialty.ArchivedAt = null;
		await _db.SaveChangesAsync();
		await LogAsync("restore", "specialty", id.ToString(), specialty.NameAr);
		return Ok(new
		{
			message = "Specialty restored successfully"
		});
	}

	[HttpPost("medicines")]
	public async Task<IActionResult> CreateMedicine([FromBody] CreateMedicineDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string name = dto.Name.Trim();
		string normalizedName = name.ToLowerInvariant();
		if (await _db.Medicines.AnyAsync((Medicine m) => m.NormalizedName == normalizedName))
		{
			return Conflict(new
			{
				message = "Medicine already exists"
			});
		}
		Medicine medicine = new Medicine
		{
			Name = name,
			NormalizedName = normalizedName,
			ActiveIngredient = dto.ActiveIngredient?.Trim(),
			Form = dto.Form?.Trim(),
			Strength = dto.Strength?.Trim(),
			Company = dto.Company?.Trim(),
			Category = dto.Category?.Trim(),
			SymptomsJson = dto.SymptomsJson?.Trim(),
			UsagesJson = dto.UsagesJson?.Trim(),
			WarningsJson = dto.WarningsJson?.Trim(),
			InteractionsJson = dto.InteractionsJson?.Trim(),
			DosageAr = dto.DosageAr?.Trim(),
			DosageEn = dto.DosageEn?.Trim(),
			ImageUrl = (dto.ImageUrl?.Trim() ?? "")
		};
		_db.Medicines.Add(medicine);
		await _db.SaveChangesAsync();
		await LogAsync("create", "medicine", medicine.Id.ToString(), name);
		return Ok(new
		{
			message = "Medicine created successfully",
			medicineId = medicine.Id
		});
	}

	[HttpPost("governorates")]
	public async Task<IActionResult> CreateGovernorate([FromBody] CreateGovernorateDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string nameAr = dto.NameAr.Trim();
		string nameEn = dto.NameEn.Trim();
		if (await _db.Governorates.AnyAsync((Governorate g) => g.NameAr == nameAr || g.NameEn == nameEn))
		{
			return Conflict(new
			{
				message = "Governorate already exists"
			});
		}
		Governorate governorate = new Governorate
		{
			NameAr = nameAr,
			NameEn = nameEn
		};
		_db.Governorates.Add(governorate);
		await _db.SaveChangesAsync();
		await LogAsync("create", "governorate", governorate.Id.ToString(), nameAr);
		return Ok(new
		{
			message = "Governorate created successfully",
			governorateId = governorate.Id
		});
	}

	[HttpGet("governorates")]
	public async Task<IActionResult> GetGovernorates([FromQuery] AdminPagedQueryDto dto)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<Governorate> query = _db.Governorates.AsNoTracking().AsQueryable();
		if (!dto.IncludeArchived && !string.Equals(dto.Status, "archived", StringComparison.OrdinalIgnoreCase))
		{
			query = query.Where((Governorate g) => !g.IsArchived);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((Governorate g) => g.NameAr.ToLower().Contains(value) || g.NameEn.ToLower().Contains(value));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status))
		{
			string text = dto.Status.Trim().ToLowerInvariant();
			IQueryable<Governorate> queryable = ((text == "archived") ? query.Where((Governorate g) => g.IsArchived) : ((!(text == "active")) ? query : query.Where((Governorate g) => !g.IsArchived)));
			query = queryable;
		}
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			items = await (from g in query.OrderBy((Governorate g) => g.NameAr).Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = g.Id,
					NameAr = g.NameAr,
					NameEn = g.NameEn,
					IsArchived = g.IsArchived,
					ArchivedAt = g.ArchivedAt,
					citiesCount = g.Cities.Count,
					pharmaciesCount = _db.PharmacyProfiles.Count((PharmacyProfile p) => p.GovernorateId == g.Id),
					clinicsCount = _db.Clinics.Count((Clinic c) => c.GovernorateId == g.Id)
				}).ToListAsync()
		});
	}

	[HttpPut("governorates/{id:int}")]
	public async Task<IActionResult> UpdateGovernorate(int id, [FromBody] UpdateGovernorateDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		Governorate governorate = await _db.Governorates.FirstOrDefaultAsync((Governorate g) => g.Id == id);
		if (governorate == null)
		{
			return NotFound(new
			{
				message = "Governorate not found"
			});
		}
		string nameAr = dto.NameAr.Trim();
		string nameEn = dto.NameEn.Trim();
		if (await _db.Governorates.AnyAsync((Governorate g) => g.Id != id && (g.NameAr == nameAr || g.NameEn == nameEn)))
		{
			return Conflict(new
			{
				message = "Governorate already exists"
			});
		}
		governorate.NameAr = nameAr;
		governorate.NameEn = nameEn;
		if (governorate.IsArchived)
		{
			governorate.IsArchived = false;
			governorate.ArchivedAt = null;
		}
		await _db.SaveChangesAsync();
		await LogAsync("update", "governorate", id.ToString(), nameAr);
		return Ok(new
		{
			message = "Governorate updated successfully"
		});
	}

	[HttpPut("governorates/{id:int}/archive")]
	public async Task<IActionResult> ArchiveGovernorate(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminArchiveDto? dto)
	{
		Governorate governorate = await _db.Governorates.FirstOrDefaultAsync((Governorate g) => g.Id == id);
		if (governorate == null)
		{
			return NotFound(new
			{
				message = "Governorate not found"
			});
		}
		int linkedPharmacies = await _db.PharmacyProfiles.CountAsync((PharmacyProfile p) => p.GovernorateId == id);
		int linkedClinics = await _db.Clinics.CountAsync((Clinic c) => c.GovernorateId == id);
		int num = await _db.Cities.CountAsync((City c) => c.GovernorateId == id && !c.IsArchived);
		if (linkedPharmacies + linkedClinics + num > 0)
		{
			return Conflict(new
			{
				message = "Governorate cannot be archived while linked data exists",
				linkedPharmacies = linkedPharmacies,
				linkedClinics = linkedClinics,
				activeCities = num
			});
		}
		governorate.IsArchived = true;
		governorate.ArchivedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("archive", "governorate", id.ToString(), dto?.Reason);
		return Ok(new
		{
			message = "Governorate archived successfully"
		});
	}

	[HttpPut("governorates/{id:int}/restore")]
	public async Task<IActionResult> RestoreGovernorate(int id)
	{
		Governorate governorate = await _db.Governorates.FirstOrDefaultAsync((Governorate g) => g.Id == id);
		if (governorate == null)
		{
			return NotFound(new
			{
				message = "Governorate not found"
			});
		}
		governorate.IsArchived = false;
		governorate.ArchivedAt = null;
		await _db.SaveChangesAsync();
		await LogAsync("restore", "governorate", id.ToString(), governorate.NameAr);
		return Ok(new
		{
			message = "Governorate restored successfully"
		});
	}

	[HttpPost("governorates/{id:int}/cities")]
	public async Task<IActionResult> CreateCity(int id, [FromBody] CreateCityDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		if (!(await _db.Governorates.AnyAsync((Governorate g) => g.Id == id && !g.IsArchived)))
		{
			return NotFound(new
			{
				message = "Governorate not found"
			});
		}
		string nameAr = dto.NameAr.Trim();
		string nameEn = dto.NameEn.Trim();
		if (await _db.Cities.AnyAsync((City c) => c.GovernorateId == id && (c.NameAr == nameAr || c.NameEn == nameEn)))
		{
			return Conflict(new
			{
				message = "City already exists in this governorate"
			});
		}
		City city = new City
		{
			GovernorateId = id,
			NameAr = nameAr,
			NameEn = nameEn
		};
		_db.Cities.Add(city);
		await _db.SaveChangesAsync();
		await LogAsync("create", "city", city.Id.ToString(), nameAr);
		return Ok(new
		{
			message = "City created successfully",
			cityId = city.Id
		});
	}

	[HttpGet("cities")]
	public async Task<IActionResult> GetCities([FromQuery] AdminPagedQueryDto dto, [FromQuery] int? governorateId)
	{
		int page = Math.Max(dto.Page, 1);
		int pageSize = Math.Clamp(dto.PageSize, 1, 100);
		IQueryable<City> query = _db.Cities.AsNoTracking().AsQueryable();
		if (governorateId.HasValue)
		{
			query = query.Where((City c) => c.GovernorateId == ((int?)governorateId).Value);
		}
		if (!dto.IncludeArchived && !string.Equals(dto.Status, "archived", StringComparison.OrdinalIgnoreCase))
		{
			query = query.Where((City c) => !c.IsArchived && !c.Governorate.IsArchived);
		}
		if (!string.IsNullOrWhiteSpace(dto.Search))
		{
			string value = dto.Search.Trim().ToLower();
			query = query.Where((City c) => c.NameAr.ToLower().Contains(value) || c.NameEn.ToLower().Contains(value) || c.Governorate.NameAr.ToLower().Contains(value) || c.Governorate.NameEn.ToLower().Contains(value));
		}
		if (!string.IsNullOrWhiteSpace(dto.Status))
		{
			string text = dto.Status.Trim().ToLowerInvariant();
			IQueryable<City> queryable = ((text == "archived") ? query.Where((City c) => c.IsArchived) : ((!(text == "active")) ? query : query.Where((City c) => !c.IsArchived && !c.Governorate.IsArchived)));
			query = queryable;
		}
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			items = await (from c in (from c in query
					orderby c.Governorate.NameAr, c.NameAr
					select c).Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = c.Id,
					GovernorateId = c.GovernorateId,
					governorateAr = c.Governorate.NameAr,
					governorateEn = c.Governorate.NameEn,
					governorateArchived = c.Governorate.IsArchived,
					NameAr = c.NameAr,
					NameEn = c.NameEn,
					IsArchived = c.IsArchived,
					ArchivedAt = c.ArchivedAt,
					pharmaciesCount = _db.PharmacyProfiles.Count((PharmacyProfile p) => p.CityId == c.Id),
					clinicsCount = _db.Clinics.Count((Clinic cl) => cl.CityId == (int?)c.Id)
				}).ToListAsync()
		});
	}

	[HttpPut("cities/{id:int}")]
	public async Task<IActionResult> UpdateCity(int id, [FromBody] UpdateCityDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		City city = await _db.Cities.FirstOrDefaultAsync((City c) => c.Id == id);
		if (city == null)
		{
			return NotFound(new
			{
				message = "City not found"
			});
		}
		int governorateId = dto.GovernorateId ?? city.GovernorateId;
		if (!(await _db.Governorates.AnyAsync((Governorate g) => g.Id == governorateId && !g.IsArchived)))
		{
			return NotFound(new
			{
				message = "Governorate not found"
			});
		}
		string nameAr = dto.NameAr.Trim();
		string nameEn = dto.NameEn.Trim();
		if (await _db.Cities.AnyAsync((City c) => c.Id != id && c.GovernorateId == governorateId && (c.NameAr == nameAr || c.NameEn == nameEn)))
		{
			return Conflict(new
			{
				message = "City already exists in this governorate"
			});
		}
		city.GovernorateId = governorateId;
		city.NameAr = nameAr;
		city.NameEn = nameEn;
		if (city.IsArchived)
		{
			city.IsArchived = false;
			city.ArchivedAt = null;
		}
		await _db.SaveChangesAsync();
		await LogAsync("update", "city", id.ToString(), nameAr);
		return Ok(new
		{
			message = "City updated successfully"
		});
	}

	[HttpPut("cities/{id:int}/archive")]
	public async Task<IActionResult> ArchiveCity(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminArchiveDto? dto)
	{
		City city = await _db.Cities.FirstOrDefaultAsync((City c) => c.Id == id);
		if (city == null)
		{
			return NotFound(new
			{
				message = "City not found"
			});
		}
		int linkedPharmacies = await _db.PharmacyProfiles.CountAsync((PharmacyProfile p) => p.CityId == id);
		int num = await _db.Clinics.CountAsync((Clinic c) => c.CityId == (int?)id);
		if (linkedPharmacies + num > 0)
		{
			return Conflict(new
			{
				message = "City cannot be archived while linked data exists",
				linkedPharmacies = linkedPharmacies,
				linkedClinics = num
			});
		}
		city.IsArchived = true;
		city.ArchivedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("archive", "city", id.ToString(), dto?.Reason);
		return Ok(new
		{
			message = "City archived successfully"
		});
	}

	[HttpPut("cities/{id:int}/restore")]
	public async Task<IActionResult> RestoreCity(int id)
	{
		City city = await _db.Cities.Include((City c) => c.Governorate).FirstOrDefaultAsync((City c) => c.Id == id);
		if (city == null)
		{
			return NotFound(new
			{
				message = "City not found"
			});
		}
		if (city.Governorate.IsArchived)
		{
			return BadRequest(new
			{
				message = "Restore the governorate before restoring this city"
			});
		}
		city.IsArchived = false;
		city.ArchivedAt = null;
		await _db.SaveChangesAsync();
		await LogAsync("restore", "city", id.ToString(), city.NameAr);
		return Ok(new
		{
			message = "City restored successfully"
		});
	}

	private static List<string> NormalizeRoles(IEnumerable<string>? roles)
	{
		return (from r in roles ?? Enumerable.Empty<string>()
			select r.Trim().ToLowerInvariant() into r
			where !string.IsNullOrWhiteSpace(r)
			select r).Distinct().ToList();
	}

	private async Task<IActionResult?> ValidateRolesAsync(IReadOnlyCollection<string> roles)
	{
		List<string> list = roles.Where((string r) => !AdminAssignableRoles.Contains(r)).ToList();
		if (list.Count > 0)
		{
			return BadRequest(new
			{
				message = "Invalid roles",
				roles = list
			});
		}
		foreach (string role in roles)
		{
			if (!(await _roleManager.RoleExistsAsync(role)))
			{
				return BadRequest(new
				{
					message = "Role does not exist: " + role
				});
			}
		}
		return null;
	}

	private IQueryable<AppUser> SortUsers(IQueryable<AppUser> query, AdminPagedQueryDto dto)
	{
		bool flag = !string.Equals(dto.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
		return dto.SortBy?.Trim().ToLowerInvariant() switch
		{
			"email" => flag ? query.OrderByDescending((AppUser u) => u.Email) : query.OrderBy((AppUser u) => u.Email), 
			"name" => flag ? query.OrderByDescending((AppUser u) => u.FullName) : query.OrderBy((AppUser u) => u.FullName), 
			"lastlogin" => flag ? query.OrderByDescending((AppUser u) => u.LastLoginAt) : query.OrderBy((AppUser u) => u.LastLoginAt), 
			"status" => flag ? query.OrderByDescending((AppUser u) => u.IsActive) : query.OrderBy((AppUser u) => u.IsActive), 
			_ => flag ? query.OrderByDescending((AppUser u) => u.CreatedAt) : query.OrderBy((AppUser u) => u.CreatedAt), 
		};
	}

	private static IQueryable<DoctorProfile> SortDoctors(IQueryable<DoctorProfile> query, AdminPagedQueryDto dto)
	{
		bool flag = !string.Equals(dto.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
		return dto.SortBy?.Trim().ToLowerInvariant() switch
		{
			"name" => flag ? query.OrderByDescending((DoctorProfile d) => d.FullName) : query.OrderBy((DoctorProfile d) => d.FullName), 
			"views" => flag ? query.OrderByDescending((DoctorProfile d) => d.ViewCount) : query.OrderBy((DoctorProfile d) => d.ViewCount), 
			"featured" => flag ? query.OrderByDescending((DoctorProfile d) => d.IsFeatured) : query.OrderBy((DoctorProfile d) => d.IsFeatured), 
			"status" => flag ? query.OrderByDescending((DoctorProfile d) => d.IsActive) : query.OrderBy((DoctorProfile d) => d.IsActive), 
			_ => flag ? query.OrderByDescending((DoctorProfile d) => d.CreatedAt) : query.OrderBy((DoctorProfile d) => d.CreatedAt), 
		};
	}

	private static IQueryable<PharmacyProfile> SortPharmacies(IQueryable<PharmacyProfile> query, AdminPagedQueryDto dto)
	{
		bool flag = !string.Equals(dto.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
		return dto.SortBy?.Trim().ToLowerInvariant() switch
		{
			"name" => flag ? query.OrderByDescending((PharmacyProfile p) => p.PharmacyName) : query.OrderBy((PharmacyProfile p) => p.PharmacyName), 
			"views" => flag ? query.OrderByDescending((PharmacyProfile p) => p.ViewCount) : query.OrderBy((PharmacyProfile p) => p.ViewCount), 
			"featured" => flag ? query.OrderByDescending((PharmacyProfile p) => p.IsFeatured) : query.OrderBy((PharmacyProfile p) => p.IsFeatured), 
			"status" => flag ? query.OrderByDescending((PharmacyProfile p) => p.IsActive) : query.OrderBy((PharmacyProfile p) => p.IsActive), 
			_ => flag ? query.OrderByDescending((PharmacyProfile p) => p.CreatedAt) : query.OrderBy((PharmacyProfile p) => p.CreatedAt), 
		};
	}

	private static IQueryable<Review> SortReviews(IQueryable<Review> query, AdminPagedQueryDto dto)
	{
		bool flag = !string.Equals(dto.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
		string text = dto.SortBy?.Trim().ToLowerInvariant();
		if (!(text == "rating"))
		{
			if (text == "status")
			{
				return flag ? (from r in query
					orderby r.Verified descending, r.IsHidden
					select r) : (from r in query
					orderby r.Verified, r.IsHidden
					select r);
			}
			return flag ? query.OrderByDescending((Review r) => r.CreatedAt) : query.OrderBy((Review r) => r.CreatedAt);
		}
		return flag ? query.OrderByDescending((Review r) => r.Rating) : query.OrderBy((Review r) => r.Rating);
	}

	private static IQueryable<Article> SortArticles(IQueryable<Article> query, AdminPagedQueryDto dto)
	{
		bool flag = !string.Equals(dto.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
		return dto.SortBy?.Trim().ToLowerInvariant() switch
		{
			"title" => flag ? query.OrderByDescending((Article a) => a.Title) : query.OrderBy((Article a) => a.Title), 
			"views" => flag ? query.OrderByDescending((Article a) => a.ViewCount) : query.OrderBy((Article a) => a.ViewCount), 
			"status" => flag ? (from a in query
				orderby a.Status descending, a.ModerationStatus descending
				select a) : (from a in query
				orderby a.Status, a.ModerationStatus
				select a), 
			"published" => flag ? query.OrderByDescending((Article a) => a.PublishedAt) : query.OrderBy((Article a) => a.PublishedAt), 
			_ => flag ? query.OrderByDescending((Article a) => a.CreatedAt) : query.OrderBy((Article a) => a.CreatedAt), 
		};
	}

	private static IQueryable<AuditLog> SortAuditLogs(IQueryable<AuditLog> query, AdminPagedQueryDto dto)
	{
		bool flag = !string.Equals(dto.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
		return dto.SortBy?.Trim().ToLowerInvariant() switch
		{
			"action" => flag ? query.OrderByDescending((AuditLog l) => l.Action) : query.OrderBy((AuditLog l) => l.Action), 
			"entity" => flag ? (from l in query
				orderby l.EntityType descending, l.EntityId descending
				select l) : (from l in query
				orderby l.EntityType, l.EntityId
				select l), 
			"actor" => flag ? query.OrderByDescending((AuditLog l) => l.ActorUserId) : query.OrderBy((AuditLog l) => l.ActorUserId), 
			_ => flag ? query.OrderByDescending((AuditLog l) => l.CreatedAt) : query.OrderBy((AuditLog l) => l.CreatedAt), 
		};
	}

	private static IQueryable<UserReport> SortReports(IQueryable<UserReport> query, AdminPagedQueryDto dto)
	{
		bool flag = !string.Equals(dto.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
		string text = dto.SortBy?.Trim().ToLowerInvariant();
		if (!(text == "status"))
		{
			if (text == "target")
			{
				return flag ? (from r in query
					orderby r.TargetType descending, r.TargetId descending
					select r) : (from r in query
					orderby r.TargetType, r.TargetId
					select r);
			}
			return flag ? query.OrderByDescending((UserReport r) => r.CreatedAt) : query.OrderBy((UserReport r) => r.CreatedAt);
		}
		return flag ? query.OrderByDescending((UserReport r) => r.Status) : query.OrderBy((UserReport r) => r.Status);
	}

	private static IQueryable<Appointment> SortAppointments(IQueryable<Appointment> query, AdminPagedQueryDto dto)
	{
		bool flag = !string.Equals(dto.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
		string text = dto.SortBy?.Trim().ToLowerInvariant();
		if (!(text == "status"))
		{
			if (text == "created")
			{
				return flag ? query.OrderByDescending((Appointment a) => a.CreatedAt) : query.OrderBy((Appointment a) => a.CreatedAt);
			}
			return flag ? query.OrderByDescending((Appointment a) => a.ScheduledAt) : query.OrderBy((Appointment a) => a.ScheduledAt);
		}
		return flag ? query.OrderByDescending((Appointment a) => a.Status) : query.OrderBy((Appointment a) => a.Status);
	}

	private static IQueryable<MedicineOrder> SortOrders(IQueryable<MedicineOrder> query, AdminPagedQueryDto dto)
	{
		bool flag = !string.Equals(dto.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
		return dto.SortBy?.Trim().ToLowerInvariant() switch
		{
			"total" => flag ? query.OrderByDescending((MedicineOrder o) => o.Total) : query.OrderBy((MedicineOrder o) => o.Total), 
			"status" => flag ? query.OrderByDescending((MedicineOrder o) => o.Status) : query.OrderBy((MedicineOrder o) => o.Status), 
			"payment" => flag ? query.OrderByDescending((MedicineOrder o) => o.PaymentStatus) : query.OrderBy((MedicineOrder o) => o.PaymentStatus), 
			"delivered" => flag ? query.OrderByDescending((MedicineOrder o) => o.DeliveredAt) : query.OrderBy((MedicineOrder o) => o.DeliveredAt), 
			_ => flag ? query.OrderByDescending((MedicineOrder o) => o.CreatedAt) : query.OrderBy((MedicineOrder o) => o.CreatedAt), 
		};
	}

	private async Task<int> CountActiveAdminsAsync(string? excludingUserId = null)
	{
		return await (from ur in _db.UserRoles
			join r in _db.Roles on ur.RoleId equals r.Id
			join u in _db.Users on ur.UserId equals u.Id
			where r.Name == "admin" && u.IsActive && !u.IsDeleted && (excludingUserId == null || u.Id != excludingUserId)
			select u.Id).Distinct().CountAsync();
	}

	private async Task<int> CountUsersInRoleAsync(string role)
	{
		return await (from ur in _db.UserRoles
			join r in _db.Roles on ur.RoleId equals r.Id
			join u in _db.Users on ur.UserId equals u.Id
			where r.Name == role && !u.IsDeleted
			select u.Id).CountAsync();
	}

	private async Task<IActionResult> UpdateAdminAppointmentStatus(int id, AppointmentStatus status, string? notes, string message)
	{
		Appointment appointment = await _db.Appointments.FirstOrDefaultAsync((Appointment a) => a.Id == id);
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
		appointment.Notes = notes;
		appointment.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		await LogAsync("update-status", "appointment", appointment.Id.ToString(), status.ToString());
		return Ok(new { message });
	}

	private async Task RevokeUserSessionsAsync(string userId)
	{
		foreach (UserSession item in await _db.UserSessions.Where((UserSession s) => s.UserId == userId && !s.IsRevoked).ToListAsync())
		{
			item.IsRevoked = true;
			item.RevokedAt = DateTime.UtcNow;
		}
		await _db.SaveChangesAsync();
	}

	private static string BuildDeletedUserIdentity(string userId)
	{
		return $"deleted-{DateTime.UtcNow:yyyyMMddHHmmss}-{userId}@deleted.local";
	}

	private async Task NotifyAsync(string userId, string title, string body, string type)
	{
		_db.Notifications.Add(new Notification
		{
			UserId = userId,
			Title = title,
			Body = body,
			Type = type,
			CreatedAt = DateTime.UtcNow
		});
		await _db.SaveChangesAsync();
	}

	private async Task LogAsync(string action, string entityType, string? entityId, string? details)
	{
		_db.AuditLogs.Add(new AuditLog
		{
			ActorUserId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"),
			Action = action,
			EntityType = entityType,
			EntityId = entityId,
			Details = details,
			CreatedAt = DateTime.UtcNow
		});
		await _db.SaveChangesAsync();
	}

	private static string Csv(string? value)
	{
		if (value == null)
		{
			value = "";
		}
		return "\"" + value.Replace("\"", "\"\"") + "\"";
	}
}
