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

[Route("api/search")]
[ApiController]
public class SearchController : ControllerBase
{
	private readonly AppDbContext _db;

	private readonly IPlatformSettingsStore _settingsStore;

	public SearchController(AppDbContext db, IPlatformSettingsStore settingsStore)
	{
		_db = db;
		_settingsStore = settingsStore;
	}

	[EnableRateLimiting("search")]
	[HttpGet]
	public async Task<IActionResult> Search([FromQuery] UnifiedSearchQueryDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		string value = dto.Query.Trim().ToLowerInvariant();
		string category = dto.Category.Trim().ToLowerInvariant();
		int limit = Math.Clamp(dto.Limit, 1, 50);
		PlatformSettingsDto settings = await _settingsStore.GetAsync();
		_db.SearchLogs.Add(new SearchLog
		{
			UserId = userId,
			Query = dto.Query.Trim(),
			Category = category,
			CreatedAt = DateTime.UtcNow
		});
		await _db.SaveChangesAsync();
		string text = category;
		bool flag = ((text == "all" || text == "doctors") ? true : false);
		bool flag2 = flag;
		text = category;
		flag = ((text == "all" || text == "pharmacies") ? true : false);
		bool includePharmacies = flag;
		text = category;
		flag = ((text == "all" || text == "medicines") ? true : false);
		bool includeMedicines = flag;
		text = category;
		flag = ((text == "all" || text == "articles") ? true : false);
		bool includeArticles = flag && (settings.Features?.Articles ?? true);
		bool hasLocation = GeoLocation.HasValidPair(dto.Lat, dto.Lng);
		IQueryable<Clinic> source = from c in _db.Clinics.AsNoTracking()
			where c.IsActive && c.Doctor.IsActive && (c.Doctor.FullName.ToLower().Contains(value) || c.Doctor.Specialty.NameAr.ToLower().Contains(value) || (c.Doctor.Specialty.NameEn != null && c.Doctor.Specialty.NameEn.ToLower().Contains(value)) || (c.NameAr != null && c.NameAr.ToLower().Contains(value)) || (c.NameEn != null && c.NameEn.ToLower().Contains(value)) || c.AddressLine.ToLower().Contains(value))
			select c;
		if (hasLocation)
		{
			decimal lat = dto.Lat.Value;
			decimal lng = dto.Lng.Value;
			source = from c in source
				orderby (c.Latitude.HasValue && c.Longitude.HasValue && c.Latitude.Value >= -90m && c.Latitude.Value <= 90m && c.Longitude.Value >= -180m && c.Longitude.Value <= 180m && !(c.Latitude.Value == 0m && c.Longitude.Value == 0m)) ? 0 : 1, (c.Latitude.HasValue && c.Longitude.HasValue && c.Latitude.Value >= -90m && c.Latitude.Value <= 90m && c.Longitude.Value >= -180m && c.Longitude.Value <= 180m && !(c.Latitude.Value == 0m && c.Longitude.Value == 0m)) ? ((c.Latitude.Value - lat) * (c.Latitude.Value - lat) + (c.Longitude.Value - lng) * (c.Longitude.Value - lng)) : decimal.MaxValue, c.Doctor.IsFeatured descending, c.NameAr ?? c.NameEn ?? c.AddressLine
				select c;
		}
		else
		{
			source = from c in source
				orderby c.Doctor.IsFeatured descending, c.Doctor.FullName, c.NameAr ?? c.NameEn ?? c.AddressLine
				select c;
		}
		IEnumerable<object> enumerable = ((!flag2) ? Enumerable.Empty<object>() : (await (from c in source.Take(limit)
			select new
			{
				type = "clinic",
				id = c.Id,
				clinicId = c.Id,
				doctorId = c.Doctor.Id,
				title = (c.NameAr ?? c.NameEn ?? c.AddressLine),
				subtitle = c.Doctor.FullName,
				specialty = c.Doctor.Specialty.NameAr,
				address = c.AddressLine,
				city = ((c.City != null) ? c.City.NameAr : null),
				governorate = c.Governorate.NameAr,
				imageUrl = c.Doctor.ProfileImageUrl,
				latitude = c.Latitude,
				longitude = c.Longitude,
				consultationFee = c.ConsultationFee,
				rating = (c.Doctor.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0)
			}).ToListAsync()).Select(c => new
		{
			type = c.type,
			id = c.id,
			clinicId = c.clinicId,
			doctorId = c.doctorId,
			title = c.title,
			subtitle = c.subtitle,
			specialty = c.specialty,
			address = c.address,
			city = c.city,
			governorate = c.governorate,
			imageUrl = c.imageUrl,
			latitude = c.latitude,
			longitude = c.longitude,
			consultationFee = c.consultationFee,
			rating = c.rating,
			distanceKm = (hasLocation ? GeoLocation.DistanceKm(dto.Lat, dto.Lng, c.latitude, c.longitude) : ((double?)null))
		}).Cast<object>());
		IEnumerable<object> doctors = enumerable;
		IEnumerable<object> enumerable2 = ((!includePharmacies) ? Enumerable.Empty<object>() : (await (from p in (from p in _db.PharmacyProfiles.AsNoTracking()
				where p.IsActive && p.PharmacyName.ToLower().Contains(value)
				orderby p.IsFeatured descending, p.PharmacyName
				select p).Take(limit)
			select new
			{
				type = "pharmacy",
				id = p.Id,
				title = p.PharmacyName,
				subtitle = p.City.NameAr,
				imageUrl = p.ProfileImageUrl,
				rating = (p.Reviews.Where((Review r) => r.Verified && !r.IsHidden && !r.IsDeleted).Average(r => (double?)r.Rating) ?? 0.0)
			}).ToListAsync()).Cast<object>());
		IEnumerable<object> pharmacies = enumerable2;
		IEnumerable<object> enumerable3 = ((!includeMedicines) ? Enumerable.Empty<object>() : (await (from m in (from m in _db.Medicines.AsNoTracking()
				where !m.IsArchived && (m.NormalizedName.Contains(value) || (m.ActiveIngredient != null && m.ActiveIngredient.ToLower().Contains(value)) || (m.Company != null && m.Company.ToLower().Contains(value)) || (m.Category != null && m.Category.ToLower().Contains(value)))
				orderby m.Name
				select m).Take(limit)
			select new
			{
				type = "medicine",
				id = m.Id,
				title = m.Name,
				subtitle = m.ActiveIngredient,
				imageUrl = ((m.ImageUrl != null && m.ImageUrl != "") ? m.ImageUrl : (from pm in m.PharmacyMedicines
					where pm.ImageUrl != null && pm.ImageUrl != "" && pm.IsAvailable && pm.Pharmacy.IsActive
					select pm.ImageUrl).FirstOrDefault()),
				company = m.Company,
				category = m.Category
			}).ToListAsync()).Cast<object>());
		IEnumerable<object> medicines = enumerable3;
		IEnumerable<object> enumerable4 = ((!includeArticles) ? Enumerable.Empty<object>() : (await (from a in (from a in _db.Articles.AsNoTracking()
				where !a.IsDeleted && a.Status == ArticleStatus.Published && a.ModerationStatus == ArticleModerationStatus.Approved && a.Title.ToLower().Contains(value)
				orderby a.PublishedAt descending
				select a).Take(limit)
			select new
			{
				type = "article",
				id = a.Id,
				title = a.Title,
				subtitle = a.AuthorDoctor.FullName,
				imageUrl = a.CoverImageUrl
			}).ToListAsync()).Cast<object>());
		IEnumerable<object> articles = enumerable4;
		return Ok(new { doctors, pharmacies, medicines, articles });
	}

	[EnableRateLimiting("search")]
	[HttpGet("suggestions")]
	public async Task<IActionResult> Suggestions([FromQuery] string query, [FromQuery] int limit = 10)
	{
		if (string.IsNullOrWhiteSpace(query))
		{
			return BadRequest(new
			{
				message = "Query is required"
			});
		}
		string value = query.Trim().ToLowerInvariant();
		limit = Math.Clamp(limit, 1, 30);
		bool articlesEnabled = (await _settingsStore.GetAsync()).Features?.Articles ?? true;
		List<string> doctorTerms = await (from d in (from d in _db.DoctorProfiles.AsNoTracking()
				where d.IsActive && (d.FullName.ToLower().Contains(value) || d.Specialty.NameAr.ToLower().Contains(value) || (d.Specialty.NameEn != null && d.Specialty.NameEn.ToLower().Contains(value)))
				orderby d.FullName
				select d).Take(limit)
			select d.FullName.ToLower().Contains(value) ? d.FullName : (d.Specialty.NameAr.ToLower().Contains(value) ? d.Specialty.NameAr : d.Specialty.NameEn)).ToListAsync();
		List<string> pharmacyNames = await (from p in (from p in _db.PharmacyProfiles.AsNoTracking()
				where p.IsActive && p.PharmacyName.ToLower().Contains(value)
				orderby p.PharmacyName
				select p).Take(limit)
			select p.PharmacyName).ToListAsync();
		List<string> medicineNames = await (from m in (from m in _db.Medicines.AsNoTracking()
				where !m.IsArchived && (m.NormalizedName.Contains(value) || (m.ActiveIngredient != null && m.ActiveIngredient.ToLower().Contains(value)) || (m.Company != null && m.Company.ToLower().Contains(value)) || (m.Category != null && m.Category.ToLower().Contains(value)))
				orderby m.Name
				select m).Take(limit)
			select m.Name).ToListAsync();
		List<string> second = await (from a in (from a in _db.Articles.AsNoTracking()
				where articlesEnabled && !a.IsDeleted && a.Status == ArticleStatus.Published && a.ModerationStatus == ArticleModerationStatus.Approved && a.Title.ToLower().Contains(value)
				orderby a.Title
				select a).Take(limit)
			select a.Title).ToListAsync();
		return Ok(doctorTerms.Where((string term) => !string.IsNullOrWhiteSpace(term)).Concat(pharmacyNames).Concat(medicineNames)
			.Concat(second)
			.Distinct()
			.Take(limit));
	}

	[EnableRateLimiting("search")]
	[HttpGet("popular")]
	public async Task<IActionResult> Popular([FromQuery] int limit = 10)
	{
		limit = Math.Clamp(limit, 1, 50);
		return Ok(await (from s in _db.SearchLogs.AsNoTracking()
			select new
			{
				normalized = s.Query.Trim().ToLower(),
				display = s.Query.Trim(),
				CreatedAt = s.CreatedAt
			} into s
			group s by s.normalized into g
			select new
			{
				query = ((from x in g
					orderby x.CreatedAt descending
					select x.display).FirstOrDefault() ?? g.Key),
				count = g.Count(),
				lastSearchedAt = g.Max(x => x.CreatedAt)
			} into x
			orderby x.count descending, x.lastSearchedAt descending
			select x).Take(limit).ToListAsync());
	}
}
