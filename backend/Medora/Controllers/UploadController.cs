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

[Route("api/upload")]
[ApiController]
[Authorize]
public class UploadController : ControllerBase
{
	private sealed record ImageSignature(string Extension, string ContentType);

	private const long MaxBytes = 5242880L;

	private readonly IConfiguration _config;

	private readonly IWebHostEnvironment _env;

	public UploadController(IConfiguration config, IWebHostEnvironment env)
	{
		_config = config;
		_env = env;
	}

	[HttpPost("image")]
	[RequestSizeLimit(5242880L)]
	public async Task<IActionResult> UploadImage([FromForm] IFormFile? file, [FromForm] string? category)
	{
		if (file == null || file.Length == 0L)
		{
			return BadRequest(new
			{
				message = "No file provided"
			});
		}
		if (file.Length > 5242880)
		{
			return BadRequest(new
			{
				message = "File size exceeds 5 MB"
			});
		}
		string submittedExt = Path.GetExtension(file.FileName);
		if (string.IsNullOrEmpty(submittedExt))
		{
			return BadRequest(new
			{
				message = "Invalid file extension"
			});
		}
		IActionResult result;
		await using (Stream input = file.OpenReadStream())
		{
			using MemoryStream memory = new MemoryStream();
			await input.CopyToAsync(memory);
			byte[] bytes = memory.ToArray();
			ImageSignature imageSignature = DetectImage(bytes);
			if (imageSignature == null)
			{
				result = BadRequest(new
				{
					message = "Invalid image content"
				});
			}
			else if (!ExtensionMatches(submittedExt, imageSignature.Extension))
			{
				result = BadRequest(new
				{
					message = "File extension does not match image content"
				});
			}
			else if (!string.Equals(file.ContentType, imageSignature.ContentType, StringComparison.OrdinalIgnoreCase))
			{
				result = BadRequest(new
				{
					message = "Content-Type does not match image content"
				});
			}
			else
			{
				string text = _config["Uploads:RootPath"] ?? Path.Combine(_env.ContentRootPath, "uploads");
				string subfolder = NormalizeUploadCategory(category);
				string text2 = (string.IsNullOrEmpty(subfolder) ? text : Path.Combine(text, subfolder));
				Directory.CreateDirectory(text2);
				string fileName = $"{Guid.NewGuid():N}{imageSignature.Extension}";
				string path = Path.Combine(text2, fileName);
				await System.IO.File.WriteAllBytesAsync(path, bytes);
				string url = (string.IsNullOrEmpty(subfolder) ? ("/uploads/" + fileName) : ("/uploads/" + subfolder + "/" + fileName));
				result = Ok(new { url });
			}
		}
		return result;
	}

	private static string? NormalizeUploadCategory(string? category)
	{
		if (string.IsNullOrWhiteSpace(category))
		{
			return null;
		}
		string text = category.Trim().ToLowerInvariant();
		if (!(text == "verification"))
		{
			if (text == "prescription")
			{
				return "prescription";
			}
			return null;
		}
		return "verification";
	}

	private static bool ExtensionMatches(string submittedExtension, string detectedExtension)
	{
		if (detectedExtension == ".jpg")
		{
			if (!submittedExtension.Equals(".jpg", StringComparison.OrdinalIgnoreCase))
			{
				return submittedExtension.Equals(".jpeg", StringComparison.OrdinalIgnoreCase);
			}
			return true;
		}
		return submittedExtension.Equals(detectedExtension, StringComparison.OrdinalIgnoreCase);
	}

	private static ImageSignature? DetectImage(byte[] bytes)
	{
		if (bytes.Length >= 3 && bytes[0] == byte.MaxValue && bytes[1] == 216 && bytes[2] == byte.MaxValue)
		{
			return new ImageSignature(".jpg", "image/jpeg");
		}
		if (bytes.Length >= 8 && bytes[0] == 137 && bytes[1] == 80 && bytes[2] == 78 && bytes[3] == 71 && bytes[4] == 13 && bytes[5] == 10 && bytes[6] == 26 && bytes[7] == 10)
		{
			return new ImageSignature(".png", "image/png");
		}
		if (bytes.Length >= 6)
		{
			string text = Encoding.ASCII.GetString(bytes, 0, 6);
			if ((text == "GIF87a" || text == "GIF89a") ? true : false)
			{
				return new ImageSignature(".gif", "image/gif");
			}
		}
		if (bytes.Length >= 12 && bytes[0] == 82 && bytes[1] == 73 && bytes[2] == 70 && bytes[3] == 70 && bytes[8] == 87 && bytes[9] == 69 && bytes[10] == 66 && bytes[11] == 80)
		{
			return new ImageSignature(".webp", "image/webp");
		}
		return null;
	}
}
