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

namespace Medora.Middleware;

public class ProtectedUploadsMiddleware
{
	private static readonly string[] ProtectedPrefixes = new string[2] { "/uploads/verification/", "/uploads/prescription/" };

	private readonly RequestDelegate _next;

	private readonly string _uploadsRoot;

	private readonly string _normalizedUploadsRoot;

	public ProtectedUploadsMiddleware(RequestDelegate next, IConfiguration config, IWebHostEnvironment env)
	{
		_next = next;
		_uploadsRoot = config["Uploads:RootPath"] ?? Path.Combine(env.ContentRootPath, "uploads");
		_normalizedUploadsRoot = Path.GetFullPath(_uploadsRoot).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
	}

	public async Task InvokeAsync(HttpContext context)
	{
		string text = context.Request.Path.Value ?? "";
		if (!IsProtectedPath(text) || !HttpMethods.IsGet(context.Request.Method))
		{
			await _next(context);
			return;
		}
		if (context.User?.Identity?.IsAuthenticated != true)
		{
			context.Response.StatusCode = 401;
			return;
		}
		string text2 = text;
		int length = "/uploads/".Length;
		string text3 = text2.Substring(length, text2.Length - length).Replace('/', Path.DirectorySeparatorChar);
		string fullPath = Path.GetFullPath(Path.Combine(_normalizedUploadsRoot, text3));
		if (!fullPath.StartsWith(_normalizedUploadsRoot, StringComparison.OrdinalIgnoreCase) || !File.Exists(fullPath))
		{
			context.Response.StatusCode = 404;
			return;
		}
		AppDbContext requiredService = context.RequestServices.GetRequiredService<AppDbContext>();
		if (!(await ProtectedUploadAuthorization.CanAccessAsync(context.User, text3.Replace(Path.DirectorySeparatorChar, '/'), requiredService, context.RequestAborted)))
		{
			context.Response.StatusCode = 403;
			return;
		}
		FileExtensionContentTypeProvider fileExtensionContentTypeProvider = new FileExtensionContentTypeProvider();
		if (!fileExtensionContentTypeProvider.TryGetContentType(fullPath, out string contentType))
		{
			contentType = "application/octet-stream";
		}
		context.Response.ContentType = contentType;
		await context.Response.SendFileAsync(fullPath);
	}

	private static bool IsProtectedPath(string path)
	{
		return ProtectedPrefixes.Any((string prefix) => path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));
	}
}
