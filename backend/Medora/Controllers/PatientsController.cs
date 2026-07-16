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

[Route("api/patients")]
[ApiController]
[Authorize]
public class PatientsController : ControllerBase
{
	private readonly AppDbContext _db;

	public PatientsController(AppDbContext db)
	{
		_db = db;
	}

	[HttpGet("favorites/doctors")]
	public async Task<IActionResult> GetFavoriteDoctors()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		return Ok(await (from f in _db.FavoriteDoctors.AsNoTracking()
			where f.UserId == userId && f.Doctor.IsActive
			orderby f.CreatedAt descending
			select new
			{
				doctorId = f.DoctorId,
				fullName = f.Doctor.FullName,
				specialtyNameAr = f.Doctor.Specialty.NameAr,
				specialtyNameEn = f.Doctor.Specialty.NameEn,
				profileImageUrl = f.Doctor.ProfileImageUrl,
				avgRating = f.Doctor.Reviews.Where(r => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0,
				reviewsCount = f.Doctor.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				createdAt = f.CreatedAt
			}).ToListAsync());
	}

	[HttpPost("favorites/doctors/{doctorId:int}")]
	public async Task<IActionResult> AddFavoriteDoctor(int doctorId)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (!(await _db.DoctorProfiles.AnyAsync((DoctorProfile d) => d.Id == doctorId && d.IsActive)))
		{
			return NotFound(new
			{
				message = "Doctor not found"
			});
		}
		if (!(await _db.FavoriteDoctors.AnyAsync((FavoriteDoctor f) => f.UserId == userId && f.DoctorId == doctorId)))
		{
			_db.FavoriteDoctors.Add(new FavoriteDoctor
			{
				UserId = userId,
				DoctorId = doctorId,
				CreatedAt = DateTime.UtcNow
			});
			await _db.SaveChangesAsync();
		}
		return Ok(new
		{
			message = "Doctor added to favorites"
		});
	}

	[HttpDelete("favorites/doctors/{doctorId:int}")]
	public async Task<IActionResult> RemoveFavoriteDoctor(int doctorId)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		FavoriteDoctor favoriteDoctor = await _db.FavoriteDoctors.FirstOrDefaultAsync((FavoriteDoctor f) => f.UserId == userId && f.DoctorId == doctorId);
		if (favoriteDoctor == null)
		{
			return NotFound(new
			{
				message = "Favorite doctor not found"
			});
		}
		_db.FavoriteDoctors.Remove(favoriteDoctor);
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Doctor removed from favorites"
		});
	}

	[HttpGet("favorites/pharmacies")]
	public async Task<IActionResult> GetFavoritePharmacies()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		return Ok(await (from f in _db.FavoritePharmacies.AsNoTracking()
			where f.UserId == userId && f.Pharmacy.IsActive
			orderby f.CreatedAt descending
			select new
			{
				pharmacyId = f.PharmacyId,
				pharmacyName = f.Pharmacy.PharmacyName,
				governorateAr = f.Pharmacy.Governorate.NameAr,
				governorateEn = f.Pharmacy.Governorate.NameEn,
				cityAr = f.Pharmacy.City.NameAr,
				cityEn = f.Pharmacy.City.NameEn,
				profileImageUrl = f.Pharmacy.ProfileImageUrl,
				avgRating = f.Pharmacy.Reviews.Where(r => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0,
				reviewsCount = f.Pharmacy.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				createdAt = f.CreatedAt
			}).ToListAsync());
	}

	[HttpPost("favorites/pharmacies/{pharmacyId:int}")]
	public async Task<IActionResult> AddFavoritePharmacy(int pharmacyId)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (!(await _db.PharmacyProfiles.AnyAsync((PharmacyProfile p) => p.Id == pharmacyId && p.IsActive)))
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		if (!(await _db.FavoritePharmacies.AnyAsync((FavoritePharmacy f) => f.UserId == userId && f.PharmacyId == pharmacyId)))
		{
			_db.FavoritePharmacies.Add(new FavoritePharmacy
			{
				UserId = userId,
				PharmacyId = pharmacyId,
				CreatedAt = DateTime.UtcNow
			});
			await _db.SaveChangesAsync();
		}
		return Ok(new
		{
			message = "Pharmacy added to favorites"
		});
	}

	[HttpDelete("favorites/pharmacies/{pharmacyId:int}")]
	public async Task<IActionResult> RemoveFavoritePharmacy(int pharmacyId)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		FavoritePharmacy favoritePharmacy = await _db.FavoritePharmacies.FirstOrDefaultAsync((FavoritePharmacy f) => f.UserId == userId && f.PharmacyId == pharmacyId);
		if (favoritePharmacy == null)
		{
			return NotFound(new
			{
				message = "Favorite pharmacy not found"
			});
		}
		_db.FavoritePharmacies.Remove(favoritePharmacy);
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Pharmacy removed from favorites"
		});
	}

	[HttpGet("favorites/medicines")]
	public async Task<IActionResult> GetFavoriteMedicines()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		return Ok(await (from f in _db.FavoriteMedicines.AsNoTracking()
			where f.UserId == userId && !f.Medicine.IsArchived
			orderby f.CreatedAt descending
			select new
			{
				medicineId = f.MedicineId,
				name = f.Medicine.Name,
				company = f.Medicine.Company,
				imageUrl = f.Medicine.ImageUrl,
				activeIngredient = f.Medicine.ActiveIngredient,
				form = f.Medicine.Form,
				strength = f.Medicine.Strength,
				category = f.Medicine.Category,
				minPrice = f.Medicine.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.IsAvailable && pm.Pharmacy.IsActive && pm.Price.HasValue).Min((PharmacyMedicine pm) => pm.Price),
				createdAt = f.CreatedAt
			}).ToListAsync());
	}

	[HttpPost("favorites/medicines/{medicineId:int}")]
	public async Task<IActionResult> AddFavoriteMedicine(int medicineId)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (!(await _db.Medicines.AnyAsync((Medicine m) => m.Id == medicineId && !m.IsArchived)))
		{
			return NotFound(new
			{
				message = "Medicine not found"
			});
		}
		if (!(await _db.FavoriteMedicines.AnyAsync((FavoriteMedicine f) => f.UserId == userId && f.MedicineId == medicineId)))
		{
			_db.FavoriteMedicines.Add(new FavoriteMedicine
			{
				UserId = userId,
				MedicineId = medicineId,
				CreatedAt = DateTime.UtcNow
			});
			await _db.SaveChangesAsync();
		}
		return Ok(new
		{
			message = "Medicine added to favorites"
		});
	}

	[HttpDelete("favorites/medicines/{medicineId:int}")]
	public async Task<IActionResult> RemoveFavoriteMedicine(int medicineId)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		FavoriteMedicine favoriteMedicine = await _db.FavoriteMedicines.FirstOrDefaultAsync((FavoriteMedicine f) => f.UserId == userId && f.MedicineId == medicineId);
		if (favoriteMedicine == null)
		{
			return NotFound(new
			{
				message = "Favorite medicine not found"
			});
		}
		_db.FavoriteMedicines.Remove(favoriteMedicine);
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Medicine removed from favorites"
		});
	}

	[HttpGet("recently-viewed")]
	public async Task<IActionResult> GetRecentlyViewed()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		return Ok(await (from x in (from x in _db.RecentlyViewedItems.AsNoTracking()
				where x.UserId == userId
				orderby x.ViewedAt descending
				select x).Take(30)
			select new { x.Id, x.TargetType, x.TargetId, x.ViewedAt }).ToListAsync());
	}

	[HttpGet("my-reviews")]
	public async Task<IActionResult> GetMyReviews()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		return Ok(await (from r in _db.Reviews.AsNoTracking()
			where r.ReviewerUserId == userId && !r.IsDeleted
			orderby r.CreatedAt descending
			select new
			{
				Id = r.Id,
				targetType = r.TargetType.ToString(),
				DoctorId = r.DoctorId,
				doctorName = ((r.Doctor != null) ? r.Doctor.FullName : null),
				PharmacyId = r.PharmacyId,
				pharmacyName = ((r.Pharmacy != null) ? r.Pharmacy.PharmacyName : null),
				MedicineId = r.MedicineId,
				medicineName = ((r.Medicine != null) ? r.Medicine.Name : null),
				MedicineOrderId = r.MedicineOrderId,
				Rating = r.Rating,
				Comment = r.Comment,
				Reply = r.Reply,
				ReplyCreatedAt = r.ReplyCreatedAt,
				Verified = r.Verified,
				IsHidden = r.IsHidden,
				CreatedAt = r.CreatedAt
			}).ToListAsync());
	}
}
