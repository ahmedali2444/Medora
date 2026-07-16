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

namespace Medora.Services;

public class FilePlatformSettingsStore : IPlatformSettingsStore
{
	private readonly SemaphoreSlim _mutex = new SemaphoreSlim(1, 1);

	private readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
	{
		PropertyNameCaseInsensitive = true,
		WriteIndented = true
	};

	private readonly string _filePath;

	public FilePlatformSettingsStore(IWebHostEnvironment environment)
	{
		string text = Path.Combine(environment.ContentRootPath, "App_Data");
		Directory.CreateDirectory(text);
		_filePath = Path.Combine(text, "platform-settings.json");
	}

	public async Task<PlatformSettingsDto> GetAsync(CancellationToken cancellationToken = default(CancellationToken))
	{
		await _mutex.WaitAsync(cancellationToken);
		try
		{
			PlatformSettingsDto settings = await LoadUnsafeAsync(cancellationToken);
			if (!File.Exists(_filePath))
			{
				await SaveUnsafeAsync(settings, cancellationToken);
			}
			return settings;
		}
		finally
		{
			_mutex.Release();
		}
	}

	public async Task<PlatformSettingsDto> SaveAsync(PlatformSettingsDto settings, CancellationToken cancellationToken = default(CancellationToken))
	{
		await _mutex.WaitAsync(cancellationToken);
		try
		{
			PlatformSettingsDto normalized = Normalize(settings);
			await SaveUnsafeAsync(normalized, cancellationToken);
			return normalized;
		}
		finally
		{
			_mutex.Release();
		}
	}

	private async Task<PlatformSettingsDto> LoadUnsafeAsync(CancellationToken cancellationToken)
	{
		if (!File.Exists(_filePath))
		{
			return Normalize(new PlatformSettingsDto());
		}
		PlatformSettingsDto result;
		await using (FileStream stream = File.OpenRead(_filePath))
		{
			result = Normalize(await JsonSerializer.DeserializeAsync<PlatformSettingsDto>((Stream)stream, _jsonOptions, cancellationToken));
		}
		return result;
	}

	private async Task SaveUnsafeAsync(PlatformSettingsDto settings, CancellationToken cancellationToken)
	{
		string tempPath = _filePath + ".tmp";
		await using (FileStream stream = File.Create(tempPath))
		{
			await JsonSerializer.SerializeAsync((Stream)stream, settings, _jsonOptions, cancellationToken);
		}
		File.Move(tempPath, _filePath, overwrite: true);
	}

	private static PlatformSettingsDto Normalize(PlatformSettingsDto? settings)
	{
		if (settings == null)
		{
			settings = new PlatformSettingsDto();
		}
		PlatformSettingsDto platformSettingsDto = settings;
		if (platformSettingsDto.General == null)
		{
			PlatformGeneralSettingsDto platformGeneralSettingsDto = (platformSettingsDto.General = new PlatformGeneralSettingsDto());
		}
		platformSettingsDto = settings;
		if (platformSettingsDto.Security == null)
		{
			PlatformSecuritySettingsDto platformSecuritySettingsDto = (platformSettingsDto.Security = new PlatformSecuritySettingsDto());
		}
		platformSettingsDto = settings;
		if (platformSettingsDto.Billing == null)
		{
			PlatformBillingSettingsDto platformBillingSettingsDto = (platformSettingsDto.Billing = new PlatformBillingSettingsDto());
		}
		platformSettingsDto = settings;
		if (platformSettingsDto.Email == null)
		{
			PlatformEmailSettingsDto platformEmailSettingsDto = (platformSettingsDto.Email = new PlatformEmailSettingsDto());
		}
		platformSettingsDto = settings;
		if (platformSettingsDto.Features == null)
		{
			PlatformFeaturesSettingsDto platformFeaturesSettingsDto = (platformSettingsDto.Features = new PlatformFeaturesSettingsDto());
		}
		settings.General.PlatformName = NormalizeText(settings.General.PlatformName, "Medora");
		settings.General.Tagline = NormalizeText(settings.General.Tagline, "منصتك الطبية الشاملة");
		settings.General.SupportEmail = NormalizeText(settings.General.SupportEmail, "support@medora.com");
		settings.General.SupportPhone = NormalizeText(settings.General.SupportPhone, "+20 19011");
		settings.General.About = NormalizeText(settings.General.About, "ميدورا منصة طبية متكاملة تجمع المرضى بالأطباء والصيدليات في مكان واحد.");
		settings.Billing.DoctorCommission = Clamp(settings.Billing.DoctorCommission, 0m, 100m, 10m);
		settings.Billing.PharmacyCommission = Clamp(settings.Billing.PharmacyCommission, 0m, 100m, 7m);
		settings.Billing.DeliveryFee = Clamp(settings.Billing.DeliveryFee, 0m, 1000000m, 15m);
		settings.Billing.Currency = NormalizeText(settings.Billing.Currency, "EGP").ToUpperInvariant();
		settings.Billing.TaxRate = Clamp(settings.Billing.TaxRate, 0m, 100m, 14m);
		return settings;
	}

	private static string NormalizeText(string? value, string fallback)
	{
		string text = value?.Trim();
		if (!string.IsNullOrWhiteSpace(text))
		{
			return text;
		}
		return fallback;
	}

	private static decimal Clamp(decimal value, decimal min, decimal max, decimal fallback)
	{
		if (value < min || value > max)
		{
			return fallback;
		}
		return value;
	}
}
