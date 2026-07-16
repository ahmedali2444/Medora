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

[Route("api/medicine")]
[ApiController]
public class MedicineController : ControllerBase
{
	private readonly AppDbContext _context;

	public MedicineController(AppDbContext context)
	{
		_context = context;
	}

	[EnableRateLimiting("search")]
	[HttpGet("search")]
	public async Task<IActionResult> Search([FromQuery] string? query, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
	{
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 1000);
		IQueryable<Medicine> baseQuery = from m in _context.Medicines.AsNoTracking()
			where !m.IsArchived
			select m;
		if (!string.IsNullOrWhiteSpace(query))
		{
			string normalizedQuery = query.Trim().ToLowerInvariant();
			baseQuery = baseQuery.Where((Medicine m) => m.NormalizedName.Contains(normalizedQuery) || (m.ActiveIngredient != null && m.ActiveIngredient.ToLower().Contains(normalizedQuery)) || (m.Company != null && m.Company.ToLower().Contains(normalizedQuery)) || (m.Category != null && m.Category.ToLower().Contains(normalizedQuery)));
		}
		int total = await baseQuery.CountAsync();
		var items = (await (from m in baseQuery.OrderBy((Medicine m) => m.Name).Skip((page - 1) * pageSize).Take(pageSize)
			select new
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
				ImageUrl = ((m.ImageUrl != null && m.ImageUrl != "") ? m.ImageUrl : (from pm in m.PharmacyMedicines
					where pm.ImageUrl != null && pm.ImageUrl != "" && pm.IsAvailable && pm.Pharmacy.IsActive
					select pm.ImageUrl).FirstOrDefault()),
				availablePharmaciesCount = m.PharmacyMedicines.Count((PharmacyMedicine pm) => pm.IsAvailable && pm.Pharmacy.IsActive),
				minPrice = m.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.IsAvailable && pm.Pharmacy.IsActive && pm.Price.HasValue).Min((PharmacyMedicine pm) => pm.Price),
				isAvailable = m.PharmacyMedicines.Any((PharmacyMedicine pm) => pm.IsAvailable && pm.Pharmacy.IsActive),
				avgRating = (m.Reviews.Where((Review r) => r.TargetType == ReviewTargetType.Medicine && r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0),
				reviewCount = m.Reviews.Count((Review r) => r.TargetType == ReviewTargetType.Medicine && r.Verified && !r.IsHidden && !r.IsDeleted)
			}).ToListAsync()).Select(m => new
		{
			Id = m.Id,
			Name = m.Name,
			ActiveIngredient = m.ActiveIngredient,
			Form = m.Form,
			Strength = m.Strength,
			Company = m.Company,
			Category = m.Category,
			ImageUrl = m.ImageUrl,
			symptoms = ParseStringArray(m.SymptomsJson),
			usages = ParseStringArray(m.UsagesJson),
			warnings = ParseStringArray(m.WarningsJson),
			interactions = ParseStringArray(m.InteractionsJson),
			dosage = new
			{
				ar = m.DosageAr,
				en = m.DosageEn
			},
			availablePharmaciesCount = m.availablePharmaciesCount,
			minPrice = m.minPrice,
			isAvailable = m.isAvailable,
			avgRating = Math.Round(m.avgRating, 1),
			reviewCount = m.reviewCount
		});
		return Ok(new { page, pageSize, total, items });
	}

	[HttpGet("{id:int}")]
	public async Task<IActionResult> GetById(int id)
	{
		var anon = await (from m in _context.Medicines.AsNoTracking()
			where m.Id == id && !m.IsArchived
			select new
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
				ImageUrl = ((m.ImageUrl != null && m.ImageUrl != "") ? m.ImageUrl : (from pm in m.PharmacyMedicines
					where pm.ImageUrl != null && pm.ImageUrl != "" && pm.IsAvailable && pm.Pharmacy.IsActive
					select pm.ImageUrl).FirstOrDefault()),
				availablePharmaciesCount = m.PharmacyMedicines.Count((PharmacyMedicine pm) => pm.IsAvailable && pm.Pharmacy.IsActive),
				minPrice = m.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.IsAvailable && pm.Pharmacy.IsActive && pm.Price.HasValue).Min((PharmacyMedicine pm) => pm.Price),
				isAvailable = m.PharmacyMedicines.Any((PharmacyMedicine pm) => pm.IsAvailable && pm.Pharmacy.IsActive),
				avgRating = (m.Reviews.Where((Review r) => r.TargetType == ReviewTargetType.Medicine && r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0),
				reviewCount = m.Reviews.Count((Review r) => r.TargetType == ReviewTargetType.Medicine && r.Verified && !r.IsHidden && !r.IsDeleted)
			}).FirstOrDefaultAsync();
		if (anon == null)
		{
			return NotFound(new
			{
				message = "Medicine not found"
			});
		}
		return Ok(new
		{
			Id = anon.Id,
			Name = anon.Name,
			ActiveIngredient = anon.ActiveIngredient,
			Form = anon.Form,
			Strength = anon.Strength,
			Company = anon.Company,
			Category = anon.Category,
			ImageUrl = anon.ImageUrl,
			symptoms = ParseStringArray(anon.SymptomsJson),
			usages = ParseStringArray(anon.UsagesJson),
			warnings = ParseStringArray(anon.WarningsJson),
			interactions = ParseStringArray(anon.InteractionsJson),
			dosage = new
			{
				ar = anon.DosageAr,
				en = anon.DosageEn
			},
			availablePharmaciesCount = anon.availablePharmaciesCount,
			minPrice = anon.minPrice,
			isAvailable = anon.isAvailable,
			avgRating = Math.Round(anon.avgRating, 1),
			reviewCount = anon.reviewCount
		});
	}

	[HttpGet("{id:int}/pharmacies")]
	public async Task<IActionResult> GetPharmacies(int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] decimal? lat = null, [FromQuery] decimal? lng = null)
	{
		if (!(await _context.Medicines.AsNoTracking().AnyAsync((Medicine m) => m.Id == id && !m.IsArchived)))
		{
			return NotFound(new
			{
				message = "Medicine not found"
			});
		}
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 100);
		IQueryable<PharmacyMedicine> query = from pm in _context.PharmacyMedicines.AsNoTracking()
			where pm.MedicineId == id && pm.IsAvailable && pm.Pharmacy.IsActive
			select pm;
		bool hasLocation = GeoLocation.HasValidPair(lat, lng);
		if (hasLocation)
		{
			decimal userLat = lat.Value;
			decimal userLng = lng.Value;
			query = from pm in query
				orderby (pm.Pharmacy.Latitude.HasValue && pm.Pharmacy.Longitude.HasValue && pm.Pharmacy.Latitude.Value >= -90m && pm.Pharmacy.Latitude.Value <= 90m && pm.Pharmacy.Longitude.Value >= -180m && pm.Pharmacy.Longitude.Value <= 180m && !(pm.Pharmacy.Latitude.Value == 0m && pm.Pharmacy.Longitude.Value == 0m)) ? 0 : 1, (pm.Pharmacy.Latitude.HasValue && pm.Pharmacy.Longitude.HasValue && pm.Pharmacy.Latitude.Value >= -90m && pm.Pharmacy.Latitude.Value <= 90m && pm.Pharmacy.Longitude.Value >= -180m && pm.Pharmacy.Longitude.Value <= 180m && !(pm.Pharmacy.Latitude.Value == 0m && pm.Pharmacy.Longitude.Value == 0m)) ? ((pm.Pharmacy.Latitude.Value - userLat) * (pm.Pharmacy.Latitude.Value - userLat) + (pm.Pharmacy.Longitude.Value - userLng) * (pm.Pharmacy.Longitude.Value - userLng)) : decimal.MaxValue, pm.Price
				select pm;
		}
		else
		{
			query = query.OrderBy((PharmacyMedicine pm) => pm.Price);
		}
		int total = await query.CountAsync();
		var items = (await (from pm in query.Skip((page - 1) * pageSize).Take(pageSize)
			select new
			{
				pm.PharmacyId,
				pm.Pharmacy.PharmacyName,
				pm.Pharmacy.AddressLine,
				pm.Pharmacy.Phone,
				pm.Pharmacy.Latitude,
				pm.Pharmacy.Longitude,
				pm.Pharmacy.OpenFrom,
				pm.Pharmacy.OpenTo,
				pm.Pharmacy.Is24Hours,
				pm.Pharmacy.Status,
				pm.Medicine.Company,
				pm.Medicine.Category,
				pm.Price,
				pm.Quantity,
				pm.LastUpdatedAt
			}).ToListAsync()).Select(pm => new
		{
			PharmacyId = pm.PharmacyId,
			PharmacyName = pm.PharmacyName,
			AddressLine = pm.AddressLine,
			Phone = pm.Phone,
			Latitude = pm.Latitude,
			Longitude = pm.Longitude,
			OpenFrom = pm.OpenFrom,
			OpenTo = pm.OpenTo,
			Is24Hours = pm.Is24Hours,
			Status = pm.Status,
			Company = pm.Company,
			Category = pm.Category,
			Price = pm.Price,
			Quantity = pm.Quantity,
			LastUpdatedAt = pm.LastUpdatedAt,
			DistanceKm = (hasLocation ? GeoLocation.DistanceKm(lat, lng, pm.Latitude, pm.Longitude) : ((double?)null))
		});
		return Ok(new { page, pageSize, total, items });
	}

	private static IReadOnlyList<string> ParseStringArray(string? json)
	{
		if (string.IsNullOrWhiteSpace(json))
		{
			return Array.Empty<string>();
		}
		try
		{
			return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
		}
		catch
		{
			return Array.Empty<string>();
		}
	}
}
