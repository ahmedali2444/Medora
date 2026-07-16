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

public static class ProtectedUploadAuthorization
{
	public static async Task<bool> CanAccessAsync(ClaimsPrincipal user, string relativePath, AppDbContext db, CancellationToken cancellationToken = default(CancellationToken))
	{
		if (user == null || user.Identity?.IsAuthenticated != true)
		{
			return false;
		}
		if (user.IsInRole("admin"))
		{
			return true;
		}
		string userId = user.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (string.IsNullOrWhiteSpace(userId))
		{
			return false;
		}
		string text = relativePath.Replace('\\', '/').TrimStart('/');
		string fileName = Path.GetFileName(text);
		if (text.StartsWith("verification/", StringComparison.OrdinalIgnoreCase))
		{
			if (await db.DoctorVerifications.AsNoTracking().AnyAsync((DoctorVerification doctorVerification) => doctorVerification.Doctor.UserId == userId && ((doctorVerification.CardImageUrl != null && doctorVerification.CardImageUrl.Contains(fileName)) || (doctorVerification.SelfieWithCardUrl != null && doctorVerification.SelfieWithCardUrl.Contains(fileName))), cancellationToken))
			{
				return true;
			}
			return await db.PharmacyVerifications.AsNoTracking().AnyAsync((PharmacyVerification pharmacyVerification) => pharmacyVerification.Pharmacy.UserId == userId && ((pharmacyVerification.LicenseImageUrl != null && pharmacyVerification.LicenseImageUrl.Contains(fileName)) || (pharmacyVerification.PharmacistIdCardUrl != null && pharmacyVerification.PharmacistIdCardUrl.Contains(fileName))), cancellationToken);
		}
		text.StartsWith("prescription/", StringComparison.OrdinalIgnoreCase);
		return false;
	}
}
