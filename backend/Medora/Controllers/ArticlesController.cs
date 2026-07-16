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

[Route("api/articles")]
[ApiController]
public class ArticlesController : ControllerBase
{
	private readonly AppDbContext _db;

	private readonly IPlatformSettingsStore _settingsStore;

	public ArticlesController(AppDbContext db, IPlatformSettingsStore settingsStore)
	{
		_db = db;
		_settingsStore = settingsStore;
	}

	[Authorize(Roles = "doctor")]
	[HttpPost]
	public async Task<IActionResult> Create([FromBody] CreateArticleDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		if (!(await ArticlesEnabledAsync()))
		{
			return BadRequest(new
			{
				message = "Articles are currently disabled"
			});
		}
		DoctorProfile doctorProfile = await GetCurrentDoctorAsync();
		if (doctorProfile == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		Article article = new Article
		{
			AuthorDoctorId = doctorProfile.Id,
			Title = dto.Title.Trim(),
			Content = dto.Content,
			CoverImageUrl = dto.CoverImageUrl,
			Status = ArticleStatus.Draft,
			ModerationStatus = ArticleModerationStatus.Pending,
			CreatedAt = DateTime.UtcNow,
			UpdatedAt = DateTime.UtcNow
		};
		_db.Articles.Add(article);
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Article created successfully",
			articleId = article.Id
		});
	}

	[HttpGet]
	public async Task<IActionResult> GetPublished([FromQuery] string? search, [FromQuery] int? doctorId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
	{
		if (!(await ArticlesEnabledAsync()))
		{
			return Ok(new
			{
				page = Math.Max(page, 1),
				pageSize = Math.Clamp(pageSize, 1, 100),
				total = 0,
				items = Array.Empty<ArticleListItemDto>()
			});
		}
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 100);
		IQueryable<Article> query = from a in _db.Articles.AsNoTracking()
			where !a.IsDeleted && a.Status == ArticleStatus.Published && a.ModerationStatus == ArticleModerationStatus.Approved
			select a;
		if (!string.IsNullOrWhiteSpace(search))
		{
			string value = search.Trim().ToLower();
			query = query.Where((Article a) => a.Title.ToLower().Contains(value) || a.Content.ToLower().Contains(value));
		}
		if (doctorId.HasValue)
		{
			query = query.Where((Article a) => a.AuthorDoctorId == ((int?)doctorId).Value);
		}
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			items = await (from a in query.OrderByDescending((Article a) => a.PublishedAt).Skip((page - 1) * pageSize).Take(pageSize)
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

	[HttpGet("{id:int}")]
	public async Task<IActionResult> GetById(int id)
	{
		if (!(await ArticlesEnabledAsync()))
		{
			return NotFound(new
			{
				message = "Article not found"
			});
		}
		ArticleDetailsDto article = await (from a in _db.Articles.AsNoTracking()
			where a.Id == id && !a.IsDeleted && a.Status == ArticleStatus.Published && a.ModerationStatus == ArticleModerationStatus.Approved
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
		if (article == null)
		{
			return NotFound(new
			{
				message = "Article not found"
			});
		}
		await TrackViewAsync(id);
		return Ok(article);
	}

	[Authorize(Roles = "doctor")]
	[HttpPut("{id:int}")]
	public async Task<IActionResult> Update(int id, [FromBody] UpdateArticleDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		if (!(await ArticlesEnabledAsync()))
		{
			return BadRequest(new
			{
				message = "Articles are currently disabled"
			});
		}
		DoctorProfile doctor = await GetCurrentDoctorAsync();
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		Article article = await _db.Articles.FirstOrDefaultAsync((Article a) => a.Id == id && a.AuthorDoctorId == doctor.Id && !a.IsDeleted);
		if (article == null)
		{
			return NotFound(new
			{
				message = "Article not found"
			});
		}
		bool flag = false;
		if (!string.IsNullOrWhiteSpace(dto.Title) && dto.Title.Trim() != article.Title)
		{
			article.Title = dto.Title.Trim();
			flag = true;
		}
		if (dto.Content != null && dto.Content != article.Content)
		{
			article.Content = dto.Content;
			flag = true;
		}
		if (dto.CoverImageUrl != null && dto.CoverImageUrl != article.CoverImageUrl)
		{
			article.CoverImageUrl = dto.CoverImageUrl;
			flag = true;
		}
		bool requiresReReview = false;
		if (flag)
		{
			article.ModerationStatus = ArticleModerationStatus.Pending;
			article.RejectReason = null;
			if (article.Status == ArticleStatus.Published)
			{
				article.Status = ArticleStatus.Draft;
				article.PublishedAt = null;
				requiresReReview = true;
			}
		}
		article.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = (requiresReReview ? "Article updated. It has been moved to draft and requires re-approval before being visible." : "Article updated successfully"),
			requiresReReview = requiresReReview
		});
	}

	[Authorize(Roles = "doctor")]
	[HttpDelete("{id:int}")]
	public async Task<IActionResult> Delete(int id)
	{
		DoctorProfile doctor = await GetCurrentDoctorAsync();
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		Article article = await _db.Articles.FirstOrDefaultAsync((Article a) => a.Id == id && a.AuthorDoctorId == doctor.Id && !a.IsDeleted);
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
		return Ok(new
		{
			message = "Article deleted successfully"
		});
	}

	[Authorize(Roles = "doctor")]
	[HttpPut("{id:int}/publish")]
	public async Task<IActionResult> Publish(int id, [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] PublishArticleDto? dto)
	{
		if (!(await ArticlesEnabledAsync()))
		{
			return BadRequest(new
			{
				message = "Articles are currently disabled"
			});
		}
		DoctorProfile doctor = await GetCurrentDoctorAsync();
		if (doctor == null)
		{
			return NotFound(new
			{
				message = "Doctor profile not found"
			});
		}
		Article article = await _db.Articles.FirstOrDefaultAsync((Article a) => a.Id == id && a.AuthorDoctorId == doctor.Id && !a.IsDeleted);
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
		if (publish && article.ModerationStatus == ArticleModerationStatus.Rejected)
		{
			article.ModerationStatus = ArticleModerationStatus.Pending;
			article.RejectReason = null;
		}
		article.UpdatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = (publish ? "Article published successfully" : "Article unpublished successfully"),
			isPublished = publish
		});
	}

	private async Task<DoctorProfile?> GetCurrentDoctorAsync()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (userId == null)
		{
			return null;
		}
		return await _db.DoctorProfiles.FirstOrDefaultAsync((DoctorProfile d) => d.UserId == userId);
	}

	private async Task TrackViewAsync(int articleId)
	{
		await _db.Articles.Where((Article a) => a.Id == articleId).ExecuteUpdateAsync(delegate(UpdateSettersBuilder<Article> s)
		{
			s.SetProperty((Article a) => a.ViewCount, (Article a) => a.ViewCount + 1);
		});
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (userId != null && base.User.IsInRole("patient"))
		{
			RecentlyViewedItem recentlyViewedItem = await _db.RecentlyViewedItems.FirstOrDefaultAsync((RecentlyViewedItem x) => x.UserId == userId && x.TargetType == "article" && x.TargetId == articleId);
			if (recentlyViewedItem == null)
			{
				_db.RecentlyViewedItems.Add(new RecentlyViewedItem
				{
					UserId = userId,
					TargetType = "article",
					TargetId = articleId,
					ViewedAt = DateTime.UtcNow
				});
			}
			else
			{
				recentlyViewedItem.ViewedAt = DateTime.UtcNow;
			}
		}
		await _db.SaveChangesAsync();
	}

	private async Task<bool> ArticlesEnabledAsync()
	{
		return (await _settingsStore.GetAsync()).Features?.Articles ?? true;
	}
}
