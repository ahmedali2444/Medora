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

[Route("api/pharmacy")]
[ApiController]
public class PharmacyController : ControllerBase
{
	private readonly AppDbContext _db;

	public PharmacyController(AppDbContext db)
	{
		_db = db;
	}

	[EnableRateLimiting("search")]
	[HttpGet("search")]
	public async Task<IActionResult> Search([FromQuery] PharmacySearchFilterDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		IQueryable<PharmacyProfile> query = from p in _db.PharmacyProfiles.AsNoTracking()
			where p.IsActive
			select p;
		if (!string.IsNullOrWhiteSpace(dto.Name))
		{
			string name = dto.Name.Trim().ToLower().Replace("[", "[[]")
				.Replace("%", "[%]")
				.Replace("_", "[_]");
			query = query.Where((PharmacyProfile p) => EF.Functions.Like(p.PharmacyName.ToLower(), $"%{name}%"));
		}
		if (!string.IsNullOrWhiteSpace(dto.Governorate))
		{
			string g = dto.Governorate.Trim();
			query = query.Where((PharmacyProfile p) => p.Governorate.NameAr == g || p.Governorate.NameEn == g);
		}
		if (!string.IsNullOrWhiteSpace(dto.City))
		{
			string cty = dto.City.Trim();
			query = query.Where((PharmacyProfile p) => p.City.NameAr == cty || p.City.NameEn == cty);
		}
		int total = await query.CountAsync();
		bool hasLocation = GeoLocation.HasValidPair(dto.Lat, dto.Lng);
		if (hasLocation)
		{
			decimal lat = dto.Lat.Value;
			decimal lng = dto.Lng.Value;
			query = from p in query
				orderby (p.Latitude.HasValue && p.Longitude.HasValue && p.Latitude.Value >= -90m && p.Latitude.Value <= 90m && p.Longitude.Value >= -180m && p.Longitude.Value <= 180m && !(p.Latitude.Value == 0m && p.Longitude.Value == 0m)) ? 0 : 1, (p.Latitude.HasValue && p.Longitude.HasValue && p.Latitude.Value >= -90m && p.Latitude.Value <= 90m && p.Longitude.Value >= -180m && p.Longitude.Value <= 180m && !(p.Latitude.Value == 0m && p.Longitude.Value == 0m)) ? ((p.Latitude.Value - lat) * (p.Latitude.Value - lat) + (p.Longitude.Value - lng) * (p.Longitude.Value - lng)) : decimal.MaxValue, p.PharmacyName
				select p;
		}
		else
		{
			query = query.OrderBy((PharmacyProfile p) => p.PharmacyName);
		}
		List<PharmacySearchItemDto> list = await (from p in query.Skip((dto.Page - 1) * dto.PageSize).Take(dto.PageSize)
			select new PharmacySearchItemDto
			{
				PharmacyId = p.Id,
				PharmacyName = p.PharmacyName,
				PharmacyNameEn = p.User.FullNameEn,
				GovernorateAr = p.Governorate.NameAr,
				GovernorateEn = p.Governorate.NameEn,
				CityAr = p.City.NameAr,
				CityEn = p.City.NameEn,
				AddressLine = p.AddressLine,
				Phone = p.Phone,
				ProfileImage = p.ProfileImageUrl,
				OpenFrom = p.OpenFrom,
				OpenTo = p.OpenTo,
				Is24Hours = p.Is24Hours,
				Status = p.Status,
				Latitude = p.Latitude,
				Longitude = p.Longitude,
				ReviewsCount = p.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				AvgRating = (p.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0)
			}).ToListAsync();
		if (hasLocation)
		{
			foreach (PharmacySearchItemDto item in list)
			{
				item.DistanceKm = GeoLocation.DistanceKm(dto.Lat, dto.Lng, item.Latitude, item.Longitude);
			}
		}
		return Ok(new
		{
			page = dto.Page,
			pageSize = dto.PageSize,
			total = total,
			items = list
		});
	}

	[HttpGet("{id:int}")]
	public async Task<IActionResult> GetById(int id)
	{
		PharmacyProfileDetailsDto pharmacy = await (from p in _db.PharmacyProfiles.AsNoTracking()
			where p.Id == id && p.IsActive
			select new PharmacyProfileDetailsDto
			{
				PharmacyId = p.Id,
				PharmacyName = p.PharmacyName,
				PharmacyNameEn = p.User.FullNameEn,
				Bio = p.Bio,
				GovernorateAr = p.Governorate.NameAr,
				GovernorateEn = p.Governorate.NameEn,
				CityAr = p.City.NameAr,
				CityEn = p.City.NameEn,
				AddressLine = p.AddressLine,
				Latitude = p.Latitude,
				Longitude = p.Longitude,
				Phone = p.Phone,
				ProfileImageUrl = p.ProfileImageUrl,
				OpenFrom = p.OpenFrom,
				OpenTo = p.OpenTo,
				Is24Hours = p.Is24Hours,
				IsActive = p.IsActive,
				VerificationStatus = ((p.Verification != null) ? p.Verification.Status.ToString() : "NotSubmitted"),
				Status = p.Status,
				ReviewsCount = p.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				AvgRating = (p.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0)
			}).FirstOrDefaultAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		await TrackViewAsync("pharmacy", id);
		return Ok(pharmacy);
	}

	[HttpGet("{id:int}/medicines")]
	public async Task<IActionResult> GetPublicPharmacyMedicines(int id, [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
	{
		if (!(await _db.PharmacyProfiles.AsNoTracking().AnyAsync((PharmacyProfile p) => p.Id == id && p.IsActive)))
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 100);
		IQueryable<PharmacyMedicine> query = from pm in _db.PharmacyMedicines.AsNoTracking()
			where pm.PharmacyId == id && pm.IsAvailable && !pm.Medicine.IsArchived
			select pm;
		if (!string.IsNullOrWhiteSpace(search))
		{
			string value = search.Trim().ToLowerInvariant();
			query = query.Where((PharmacyMedicine pm) => pm.Medicine.Name.ToLower().Contains(value) || (pm.Medicine.ActiveIngredient != null && pm.Medicine.ActiveIngredient.ToLower().Contains(value)) || (pm.Medicine.Company != null && pm.Medicine.Company.ToLower().Contains(value)) || (pm.Medicine.Category != null && pm.Medicine.Category.ToLower().Contains(value)));
		}
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			items = await (from pm in query.OrderBy((PharmacyMedicine pm) => pm.Medicine.Name).Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					id = pm.MedicineId,
					Name = pm.Medicine.Name,
					ActiveIngredient = pm.Medicine.ActiveIngredient,
					Form = pm.Medicine.Form,
					Strength = pm.Medicine.Strength,
					Company = pm.Medicine.Company,
					Category = pm.Medicine.Category,
					ImageUrl = (pm.ImageUrl ?? pm.Medicine.ImageUrl),
					price = pm.Price,
					minPrice = pm.Price,
					isAvailable = pm.IsAvailable,
					quantity = pm.Quantity
				}).ToListAsync()
		});
	}

	[HttpGet("featured")]
	public async Task<IActionResult> GetFeatured()
	{
		return Ok(await (from p in _db.PharmacyProfiles.AsNoTracking()
			where p.IsActive && p.IsFeatured
			orderby p.PharmacyName
			select new PharmacySearchItemDto
			{
				PharmacyId = p.Id,
				PharmacyName = p.PharmacyName,
				PharmacyNameEn = p.User.FullNameEn,
				GovernorateAr = p.Governorate.NameAr,
				GovernorateEn = p.Governorate.NameEn,
				CityAr = p.City.NameAr,
				CityEn = p.City.NameEn,
				AddressLine = p.AddressLine,
				Phone = p.Phone,
				ProfileImage = p.ProfileImageUrl,
				OpenFrom = p.OpenFrom,
				OpenTo = p.OpenTo,
				Is24Hours = p.Is24Hours,
				Status = p.Status,
				Latitude = p.Latitude,
				Longitude = p.Longitude,
				ReviewsCount = p.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				AvgRating = (p.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0)
			}).ToListAsync());
	}

	[Authorize(Roles = "pharmacy")]
	[HttpGet("me")]
	public async Task<IActionResult> GetMe()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		PharmacyProfileDetailsDto pharmacyProfileDetailsDto = await (from p in _db.PharmacyProfiles.AsNoTracking()
			where p.UserId == userId
			select new PharmacyProfileDetailsDto
			{
				PharmacyId = p.Id,
				PharmacyName = p.PharmacyName,
				PharmacyNameEn = p.User.FullNameEn,
				Bio = p.Bio,
				GovernorateAr = p.Governorate.NameAr,
				GovernorateEn = p.Governorate.NameEn,
				CityAr = p.City.NameAr,
				CityEn = p.City.NameEn,
				AddressLine = p.AddressLine,
				Latitude = p.Latitude,
				Longitude = p.Longitude,
				Phone = p.Phone,
				ProfileImageUrl = p.ProfileImageUrl,
				OpenFrom = p.OpenFrom,
				OpenTo = p.OpenTo,
				Is24Hours = p.Is24Hours,
				IsActive = p.IsActive,
				VerificationStatus = ((p.Verification != null) ? p.Verification.Status.ToString() : "NotSubmitted"),
				Status = p.Status,
				ReviewsCount = p.Reviews.Count((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted),
				AvgRating = (p.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0)
			}).FirstOrDefaultAsync();
		if (pharmacyProfileDetailsDto == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		return Ok(pharmacyProfileDetailsDto);
	}

	[Authorize(Roles = "pharmacy")]
	[HttpGet("me/stats")]
	public async Task<IActionResult> GetMyStats([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
	{
		PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		IQueryable<Review> reviewsQuery = from r in _db.Reviews.AsNoTracking()
			where r.PharmacyId == (int?)pharmacy.Id && !r.IsDeleted && !r.IsHidden
			select r;
		IQueryable<MedicineOrder> ordersQuery = from o in _db.MedicineOrders.AsNoTracking()
			where o.PharmacyId == pharmacy.Id
			select o;

		if (startDate.HasValue)
			ordersQuery = ordersQuery.Where(o => o.CreatedAt >= startDate.Value);
		if (endDate.HasValue)
			ordersQuery = ordersQuery.Where(o => o.CreatedAt <= endDate.Value);
		DateTime today = ClinicTimeZone.ToClinicLocal(DateTime.UtcNow).Date;
		DateTime nextDay = ClinicTimeZone.ClinicTomorrowStartUtc();
		DateTime todayStart = ClinicTimeZone.ClinicTodayStartUtc();
		DateTime monthStart = ClinicTimeZone.ToUtcFromClinicLocal(new DateTime(today.Year, today.Month, 1));
		DateTime weekStart = ClinicTimeZone.ToUtcFromClinicLocal(today.AddDays(-6.0));
		var weeklyOrders = await (from o in ordersQuery
			where o.CreatedAt >= weekStart && o.CreatedAt < nextDay
			group o by o.CreatedAt.Date into g
			select new
			{
				date = g.Key,
				orders = g.Count(),
				revenue = g.Sum(o => o.Status == MedicineOrderStatus.Delivered ? o.Total : 0m)
			} into x
			orderby x.date
			select x).ToListAsync();
		var rawMonthly = await (from o in ordersQuery
			where o.CreatedAt >= ((DateTime)monthStart).AddMonths(-5) && o.Status == MedicineOrderStatus.Delivered
			group o by new
			{
				o.CreatedAt.Year,
				o.CreatedAt.Month
			} into g
			select new
			{
				Year = g.Key.Year,
				Month = g.Key.Month,
				value = g.Sum(o => o.Total)
			}).ToListAsync();
		Dictionary<string, decimal> monthlyRevenue = rawMonthly.ToDictionary(
			x => $"{x.Year}-{(x.Month < 10 ? "0" : "")}{x.Month}", 
			x => x.value);
		IQueryable<MedicineOrderItem> itemsQuery = _db.MedicineOrderItems.AsNoTracking()
			.Where(i => i.MedicineOrder.PharmacyId == pharmacy.Id && i.MedicineOrder.Status == MedicineOrderStatus.Delivered);

		if (startDate.HasValue)
			itemsQuery = itemsQuery.Where(i => i.MedicineOrder.CreatedAt >= startDate.Value);
		if (endDate.HasValue)
			itemsQuery = itemsQuery.Where(i => i.MedicineOrder.CreatedAt <= endDate.Value);

		var salesByCategory = await (from i in itemsQuery
			group i by i.Medicine.Category ?? i.Medicine.Form ?? "Uncategorized" into g
			select new
			{
				category = g.Key,
				orders = g.Sum((MedicineOrderItem i) => i.Quantity),
				revenue = g.Sum((MedicineOrderItem i) => i.LineTotal)
			} into x
			orderby x.revenue descending
			select x).Take(10).ToListAsync();
		int id = pharmacy.Id;
		int viewCount = pharmacy.ViewCount;
		string status = pharmacy.Status;
		int ordersCount = await ordersQuery.CountAsync();
		int todayOrdersCount = await ordersQuery.CountAsync((MedicineOrder o) => o.CreatedAt >= todayStart && o.CreatedAt < nextDay);
		int activeOrdersCount = await ordersQuery.CountAsync((MedicineOrder o) => o.Status != MedicineOrderStatus.Delivered && o.Status != MedicineOrderStatus.Cancelled);
		int pendingOrdersCount = await ordersQuery.CountAsync((MedicineOrder o) => o.Status == MedicineOrderStatus.Pending);
		decimal valueOrDefault = await ordersQuery.Where(o => o.CreatedAt >= todayStart && o.CreatedAt < nextDay && o.Status == MedicineOrderStatus.Delivered).SumAsync(o => (decimal?)o.Total) ?? 0m;
		var value = new
		{
			pharmacyId = id,
			ViewCount = viewCount,
			Status = status,
			ordersCount = ordersCount,
			todayOrdersCount = todayOrdersCount,
			activeOrdersCount = activeOrdersCount,
			pendingOrdersCount = pendingOrdersCount,
			todayRevenue = valueOrDefault,
			totalRevenue = await ordersQuery.Where(o => o.Status == MedicineOrderStatus.Delivered).SumAsync(o => (decimal?)o.Total) ?? 0m,
			medicinesCount = await _db.PharmacyMedicines.CountAsync((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id),
			availableMedicinesCount = await _db.PharmacyMedicines.CountAsync((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && pm.IsAvailable),
			lowStockCount = await _db.PharmacyMedicines.CountAsync((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && pm.Quantity.HasValue && pm.Quantity.Value > 0 && pm.Quantity.Value <= pm.ReorderLevel),
			outOfStockCount = await _db.PharmacyMedicines.CountAsync((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && pm.Quantity.HasValue && pm.Quantity.Value == 0),
			expiredCount = await _db.PharmacyMedicines.CountAsync((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && pm.ExpiryDate.HasValue && pm.ExpiryDate.Value < today),
			nearExpiryCount = await _db.PharmacyMedicines.CountAsync((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && pm.ExpiryDate.HasValue && pm.ExpiryDate.Value >= today && pm.ExpiryDate.Value <= ((DateTime)today).AddDays(90.0)),
			reviewsCount = await reviewsQuery.CountAsync(),
			avgRating = await reviewsQuery.Where(r => r.Verified).AverageAsync(r => (double?)r.Rating) ?? 0.0,
			weeklyOrders = weeklyOrders,
			monthlyRevenue = monthlyRevenue,
			salesByCategory = salesByCategory
		};
		return Ok(value);
	}

	[Authorize(Roles = "pharmacy")]
	[HttpGet("me/reviews")]
	public async Task<IActionResult> GetMyReviews()
	{
		PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		return Ok(await (from r in _db.Reviews.AsNoTracking()
			where r.PharmacyId == (int?)pharmacy.Id && !r.IsDeleted
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

	[Authorize(Roles = "pharmacy")]
	[HttpPut("profile")]
	public async Task<IActionResult> UpdateProfile([FromBody] UpdatePharmacyProfileDto dto)
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
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		PharmacyProfile pharmacy = await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.UserId == userId);
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		if (!string.IsNullOrWhiteSpace(dto.Governorate))
		{
			Governorate governorate = await _db.Governorates.FirstOrDefaultAsync((Governorate x) => !x.IsArchived && (x.NameEn.ToLower() == dto.Governorate.ToLower() || x.NameAr == dto.Governorate));
			if (governorate == null)
			{
				return BadRequest(new
				{
					message = "Governorate not found"
				});
			}
			pharmacy.GovernorateId = governorate.Id;
			if (!string.IsNullOrWhiteSpace(dto.City))
			{
				City city = await _db.Cities.FirstOrDefaultAsync((City x) => !x.IsArchived && (x.NameEn.ToLower() == dto.City.ToLower() || x.NameAr == dto.City) && x.GovernorateId == governorate.Id);
				if (city == null)
				{
					return BadRequest(new
					{
						message = "City not found in the selected governorate"
					});
				}
				pharmacy.CityId = city.Id;
			}
		}
		else if (!string.IsNullOrWhiteSpace(dto.City))
		{
			City city2 = await _db.Cities.FirstOrDefaultAsync((City x) => !x.IsArchived && (x.NameEn.ToLower() == dto.City.ToLower() || x.NameAr == dto.City) && x.GovernorateId == pharmacy.GovernorateId);
			if (city2 == null)
			{
				return BadRequest(new
				{
					message = "City not found in the selected governorate"
				});
			}
			pharmacy.CityId = city2.Id;
		}
		if (!string.IsNullOrWhiteSpace(dto.PharmacyName))
		{
			pharmacy.PharmacyName = dto.PharmacyName;
		}
		if (dto.Bio != null)
		{
			pharmacy.Bio = dto.Bio;
		}
		if (!string.IsNullOrWhiteSpace(dto.Phone))
		{
			pharmacy.Phone = dto.Phone;
		}
		if (dto.ProfileImageUrl != null)
		{
			pharmacy.ProfileImageUrl = dto.ProfileImageUrl;
		}
		if (!string.IsNullOrWhiteSpace(dto.AddressLine))
		{
			pharmacy.AddressLine = dto.AddressLine;
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
		return Ok(new
		{
			message = "Profile updated successfully"
		});
	}

	[Authorize(Roles = "pharmacy")]
	[HttpGet("medicines")]
	public async Task<IActionResult> GetMyMedicines([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? search = null, [FromQuery] string status = "all")
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		PharmacyProfile pharmacy = await _db.PharmacyProfiles.AsNoTracking().FirstOrDefaultAsync((PharmacyProfile p) => p.UserId == userId);
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 100);
		string value = search?.Trim().ToLowerInvariant();
		IQueryable<PharmacyMedicine> query = from pm in _db.PharmacyMedicines.AsNoTracking()
			where pm.PharmacyId == pharmacy.Id
			select pm;
		if (!string.IsNullOrWhiteSpace(value))
		{
			query = query.Where((PharmacyMedicine pm) => pm.Medicine.Name.ToLower().Contains(value) || (pm.Medicine.ActiveIngredient != null && pm.Medicine.ActiveIngredient.ToLower().Contains(value)) || (pm.Medicine.Company != null && pm.Medicine.Company.ToLower().Contains(value)) || (pm.Medicine.Category != null && pm.Medicine.Category.ToLower().Contains(value)));
		}
		switch (status)
		{
		case "in-stock":
			query = query.Where((PharmacyMedicine pm) => pm.Quantity > (int?)pm.ReorderLevel);
			break;
		case "low-stock":
			query = query.Where((PharmacyMedicine pm) => pm.Quantity > (int?)0 && pm.Quantity <= (int?)pm.ReorderLevel);
			break;
		case "out-of-stock":
			query = query.Where((PharmacyMedicine pm) => pm.Quantity == (int?)0);
			break;
		}
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			items = await (from pm in query
				select new PharmacyMedicineItemDto
				{
					MedicineId = pm.MedicineId,
					Name = pm.Medicine.Name,
					ActiveIngredient = pm.Medicine.ActiveIngredient,
					Form = pm.Medicine.Form,
					Strength = pm.Medicine.Strength,
					Company = pm.Medicine.Company,
					Category = pm.Medicine.Category,
					ImageUrl = (pm.ImageUrl ?? pm.Medicine.ImageUrl),
					IsAvailable = pm.IsAvailable,
					Quantity = pm.Quantity,
					ReorderLevel = pm.ReorderLevel,
					Price = pm.Price,
					LastUpdatedAt = pm.LastUpdatedAt,
					ExpiryDate = pm.ExpiryDate,
					BatchNumber = pm.BatchNumber,
					Batches = pm.Batches.Select(b => new PharmacyMedicineBatchDto
					{
						Id = b.Id,
						BatchNumber = b.BatchNumber,
						ExpiryDate = b.ExpiryDate,
						Quantity = b.Quantity,
						CreatedAt = b.CreatedAt
					}).ToList()
				} into m
				orderby m.Name
				select m).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync()
		});
	}

	[Authorize(Roles = "pharmacy")]
	[HttpPost("medicines")]
	public async Task<IActionResult> AddMedicine([FromBody] AddPharmacyMedicineDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		PharmacyProfile pharmacy = await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.UserId == userId);
		if (pharmacy == null)
		{
			return BadRequest(new
			{
				message = "Pharmacy profile not found"
			});
		}
		if (!(await _db.Medicines.AnyAsync((Medicine m) => m.Id == dto.MedicineId && !m.IsArchived)))
		{
			return BadRequest(new
			{
				message = "Medicine not found"
			});
		}
		if (await _db.PharmacyMedicines.AnyAsync((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && pm.MedicineId == dto.MedicineId))
		{
			return Conflict(new
			{
				message = "Medicine already added to your pharmacy"
			});
		}
		var pm = new PharmacyMedicine
		{
			PharmacyId = pharmacy.Id,
			MedicineId = dto.MedicineId,
			IsAvailable = dto.IsAvailable,
			Quantity = dto.Quantity,
			ReorderLevel = dto.ReorderLevel,
			Price = dto.Price,
			ExpiryDate = dto.ExpiryDate,
			BatchNumber = dto.BatchNumber,
			LastUpdatedAt = DateTime.UtcNow
		};
		_db.PharmacyMedicines.Add(pm);
		if (dto.Batches != null && dto.Batches.Any())
		{
			foreach (var b in dto.Batches)
			{
				_db.PharmacyMedicineBatches.Add(new PharmacyMedicineBatch
				{
					PharmacyMedicine = pm,
					BatchNumber = b.BatchNumber,
					ExpiryDate = b.ExpiryDate,
					Quantity = b.Quantity,
					CreatedAt = DateTime.UtcNow
				});
			}
		}
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Medicine added successfully"
		});
	}

	[Authorize(Roles = "pharmacy")]
	[HttpPut("medicines/{medicineId:int}")]
	public async Task<IActionResult> UpdateMedicine(int medicineId, [FromBody] UpdatePharmacyMedicineDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		PharmacyProfile pharmacy = await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.UserId == userId);
		if (pharmacy == null)
		{
			return BadRequest(new
			{
				message = "Pharmacy profile not found"
			});
		}
		PharmacyMedicine pharmacyMedicine = await _db.PharmacyMedicines.FirstOrDefaultAsync((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && pm.MedicineId == medicineId);
		if (pharmacyMedicine == null)
		{
			return NotFound(new
			{
				message = "Medicine not found in your pharmacy"
			});
		}
		pharmacyMedicine.IsAvailable = dto.IsAvailable;
		pharmacyMedicine.Quantity = dto.Quantity;
		if (dto.ReorderLevel.HasValue)
		{
			pharmacyMedicine.ReorderLevel = dto.ReorderLevel.Value;
		}
		pharmacyMedicine.Price = dto.Price;
		pharmacyMedicine.ExpiryDate = dto.ExpiryDate;
		pharmacyMedicine.BatchNumber = dto.BatchNumber;
		pharmacyMedicine.LastUpdatedAt = DateTime.UtcNow;
		if (dto.ImageUrl != null)
		{
			string text = dto.ImageUrl.Trim();
			pharmacyMedicine.ImageUrl = ((text.Length == 0) ? null : text);
		}
		if (dto.Batches != null && dto.Batches.Any())
		{
			foreach (var b in dto.Batches)
			{
				_db.PharmacyMedicineBatches.Add(new PharmacyMedicineBatch
				{
					PharmacyMedicine = pharmacyMedicine,
					BatchNumber = b.BatchNumber,
					ExpiryDate = b.ExpiryDate,
					Quantity = b.Quantity,
					CreatedAt = DateTime.UtcNow
				});
			}
		}
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Medicine updated successfully"
		});
	}

	[Authorize(Roles = "pharmacy")]
	[HttpDelete("medicines/{medicineId:int}")]
	public async Task<IActionResult> RemoveMedicine(int medicineId)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		PharmacyProfile pharmacy = await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.UserId == userId);
		if (pharmacy == null)
		{
			return BadRequest(new
			{
				message = "Pharmacy profile not found"
			});
		}
		PharmacyMedicine pharmacyMedicine = await _db.PharmacyMedicines.FirstOrDefaultAsync((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && pm.MedicineId == medicineId);
		if (pharmacyMedicine == null)
		{
			return NotFound(new
			{
				message = "Medicine not found in your pharmacy"
			});
		}
		_db.PharmacyMedicines.Remove(pharmacyMedicine);
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Medicine removed successfully"
		});
	}

	[Authorize(Roles = "pharmacy")]
	[HttpPost("medicines/bulk")]
	public async Task<IActionResult> AddMedicinesBulk([FromBody] BulkPharmacyMedicineDto dto)
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
		List<int> medicineIds = dto.Items.Select((AddPharmacyMedicineDto i) => i.MedicineId).Distinct().ToList();
		List<int> existingMedicines = await (from m in _db.Medicines
			where medicineIds.Contains(m.Id) && !m.IsArchived
			select m.Id).ToListAsync();
		List<int> existingRecords = await (from pm in _db.PharmacyMedicines
			where pm.PharmacyId == pharmacy.Id && medicineIds.Contains(pm.MedicineId)
			select pm.MedicineId).ToListAsync();
		int added = 0;
		foreach (AddPharmacyMedicineDto item in dto.Items.Where((AddPharmacyMedicineDto i) => existingMedicines.Contains(i.MedicineId) && !existingRecords.Contains(i.MedicineId)))
		{
			_db.PharmacyMedicines.Add(new PharmacyMedicine
			{
				PharmacyId = pharmacy.Id,
				MedicineId = item.MedicineId,
				IsAvailable = item.IsAvailable,
				Quantity = item.Quantity,
				ReorderLevel = item.ReorderLevel,
				Price = item.Price,
				ExpiryDate = item.ExpiryDate,
				BatchNumber = item.BatchNumber,
				LastUpdatedAt = DateTime.UtcNow
			});
			added++;
		}
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Bulk medicines added successfully",
			added = added
		});
	}

	[Authorize(Roles = "pharmacy")]
	[HttpPut("medicines/bulk")]
	public async Task<IActionResult> UpdateMedicinesBulk([FromBody] BulkPharmacyMedicineDto dto)
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
		List<int> medicineIds = dto.Items.Select((AddPharmacyMedicineDto i) => i.MedicineId).Distinct().ToList();
		List<PharmacyMedicine> list = await _db.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && medicineIds.Contains(pm.MedicineId)).ToListAsync();
		int updated = 0;
		foreach (PharmacyMedicine record in list)
		{
			AddPharmacyMedicineDto addPharmacyMedicineDto = dto.Items.First((AddPharmacyMedicineDto i) => i.MedicineId == record.MedicineId);
			record.IsAvailable = addPharmacyMedicineDto.IsAvailable;
			record.Quantity = addPharmacyMedicineDto.Quantity;
			if (addPharmacyMedicineDto.ReorderLevel > 0)
			{
				record.ReorderLevel = addPharmacyMedicineDto.ReorderLevel;
			}
			record.Price = addPharmacyMedicineDto.Price;
			record.ExpiryDate = addPharmacyMedicineDto.ExpiryDate;
			record.BatchNumber = addPharmacyMedicineDto.BatchNumber;
			record.LastUpdatedAt = DateTime.UtcNow;
			updated++;
		}
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Bulk medicines updated successfully",
			updated = updated
		});
	}

	[Authorize(Roles = "pharmacy")]
	[HttpGet("medicines/low-stock")]
	public async Task<IActionResult> GetLowStockMedicines()
	{
		PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		return Ok(await (from pm in _db.PharmacyMedicines.AsNoTracking()
			where pm.PharmacyId == pharmacy.Id && pm.Quantity.HasValue && pm.Quantity.Value > 0 && pm.Quantity.Value <= pm.ReorderLevel
			orderby pm.Quantity
			select new PharmacyMedicineItemDto
			{
				MedicineId = pm.MedicineId,
				Name = pm.Medicine.Name,
				ActiveIngredient = pm.Medicine.ActiveIngredient,
				Form = pm.Medicine.Form,
				Strength = pm.Medicine.Strength,
				Company = pm.Medicine.Company,
				Category = pm.Medicine.Category,
				ImageUrl = (pm.ImageUrl ?? pm.Medicine.ImageUrl),
				IsAvailable = pm.IsAvailable,
				Quantity = pm.Quantity,
				ReorderLevel = pm.ReorderLevel,
				Price = pm.Price,
				LastUpdatedAt = pm.LastUpdatedAt,
				ExpiryDate = pm.ExpiryDate,
				BatchNumber = pm.BatchNumber
			}).ToListAsync());
	}

	[Authorize(Roles = "pharmacy")]
	[HttpPut("status")]
	public async Task<IActionResult> UpdateStatus([FromBody] PharmacyStatusDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		PharmacyProfile pharmacyProfile = await GetCurrentPharmacyAsync();
		if (pharmacyProfile == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		pharmacyProfile.Status = dto.Status.Trim().ToLowerInvariant();
		if (dto.Is24Hours.HasValue)
		{
			pharmacyProfile.Is24Hours = dto.Is24Hours.Value;
		}
		pharmacyProfile.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Pharmacy status updated successfully"
		});
	}

	[Authorize(Roles = "pharmacy")]
	[HttpPost("setup")]
	public async Task<IActionResult> SetupProfile([FromBody] SetupPharmacyProfileDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		if (!GeoLocation.HasValidPair(dto.Latitude, dto.Longitude))
		{
			return BadRequest(new
			{
				message = "Pharmacy location is required"
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
		if (await _db.PharmacyProfiles.AnyAsync((PharmacyProfile p) => p.UserId == userId))
		{
			return BadRequest(new
			{
				message = "Pharmacy profile already exists"
			});
		}
		string licenseNumber = dto.LicenseNumber.Trim();
		if (await _db.PharmacyProfiles.AnyAsync((PharmacyProfile p) => p.LicenseNumber == licenseNumber))
		{
			return Conflict(new
			{
				message = "License number already exists"
			});
		}
		Governorate governorate = await _db.Governorates.FirstOrDefaultAsync((Governorate x) => !x.IsArchived && (x.NameAr == dto.Governorate || x.NameEn == dto.Governorate));
		if (governorate == null)
		{
			return BadRequest(new
			{
				message = "Governorate not found"
			});
		}
		City city = await _db.Cities.FirstOrDefaultAsync((City x) => !x.IsArchived && (x.NameAr == dto.City || x.NameEn == dto.City) && x.GovernorateId == governorate.Id);
		if (city == null)
		{
			return BadRequest(new
			{
				message = "City not found in the selected governorate"
			});
		}
		PharmacyProfile entity = new PharmacyProfile
		{
			UserId = userId,
			PharmacyName = dto.PharmacyName.Trim(),
			LicenseNumber = licenseNumber,
			Bio = dto.Bio?.Trim(),
			GovernorateId = governorate.Id,
			CityId = city.Id,
			AddressLine = dto.AddressLine.Trim(),
			Latitude = dto.Latitude,
			Longitude = dto.Longitude,
			Phone = dto.Phone?.Trim(),
			ProfileImageUrl = dto.ProfileImageUrl?.Trim(),
			OpenFrom = dto.OpenFrom,
			OpenTo = dto.OpenTo,
			Is24Hours = dto.Is24Hours,
			IsActive = false,
			CreatedAt = DateTime.UtcNow,
			UpdatedAt = DateTime.UtcNow
		};
		_db.PharmacyProfiles.Add(entity);
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Pharmacy profile created successfully"
		});
	}

	[Authorize(Roles = "pharmacy")]
	[HttpPost("verify")]
	public async Task<IActionResult> UploadVerification([FromBody] PharmacyVerificationDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
		if (pharmacy == null)
		{
			return BadRequest(new
			{
				message = "Pharmacy profile not found"
			});
		}
		PharmacyVerification pharmacyVerification = await _db.PharmacyVerifications.FirstOrDefaultAsync((PharmacyVerification pharmacyVerification2) => pharmacyVerification2.PharmacyId == pharmacy.Id);
		if (pharmacyVerification == null)
		{
			pharmacyVerification = new PharmacyVerification
			{
				PharmacyId = pharmacy.Id,
				LicenseImageUrl = dto.LicenseImageUrl,
				PharmacistIdCardUrl = dto.PharmacistIdCardUrl
			};
			_db.PharmacyVerifications.Add(pharmacyVerification);
		}
		else
		{
			if (!ProfessionalVerificationRules.CanResubmit(pharmacyVerification.Status))
			{
				return BadRequest(new
				{
					message = "Verification already submitted"
				});
			}
			pharmacyVerification.LicenseImageUrl = dto.LicenseImageUrl;
			pharmacyVerification.PharmacistIdCardUrl = dto.PharmacistIdCardUrl;
			pharmacyVerification.Status = VerificationStatus.Pending;
			pharmacyVerification.ReviewedAt = null;
			pharmacyVerification.RejectReason = null;
		}
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Verification uploaded"
		});
	}

	private async Task<PharmacyProfile?> GetCurrentPharmacyAsync()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		return await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.UserId == userId);
	}

	private async Task TrackViewAsync(string targetType, int targetId)
	{
		await _db.PharmacyProfiles.Where((PharmacyProfile p) => p.Id == targetId).ExecuteUpdateAsync(delegate(UpdateSettersBuilder<PharmacyProfile> s)
		{
			s.SetProperty((PharmacyProfile p) => p.ViewCount, (PharmacyProfile p) => p.ViewCount + 1);
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
