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

[Route("api/account")]
[ApiController]
public class AccountController : ControllerBase
{
	private readonly UserManager<AppUser> _userManager;

	private readonly AppDbContext _db;

	private readonly JwtSettings _jwt;

	private readonly IEmailOtpSender _otpSender;

	private readonly IConfiguration _config;

	private const int OtpLifetimeMinutes = 10;

	private const int MaxOtpAttempts = 5;

	public AccountController(UserManager<AppUser> userManager, AppDbContext db, IOptions<JwtSettings> jwtOptions, IEmailOtpSender otpSender, IConfiguration config)
	{
		_userManager = userManager;
		_db = db;
		_jwt = jwtOptions.Value;
		_otpSender = otpSender;
		_config = config;
	}

	private static string GenerateExternalAuthPassword()
	{
		return $"{Guid.NewGuid():N}Aa1!";
	}

	private static string BuildExternalUserName(string prefix)
	{
		string text = new string(prefix.Where(delegate(char c)
		{
			bool flag = char.IsLetterOrDigit(c);
			bool flag2 = flag;
			if (!flag2)
			{
				bool flag3 = ((c == '-' || c == '.' || c == '_') ? true : false);
				flag2 = flag3;
			}
			return flag2;
		}).ToArray());
		if (string.IsNullOrWhiteSpace(text))
		{
			text = "user";
		}
		if (text.Length > 32)
		{
			text = text.Substring(0, 32);
		}
		return text + "_" + Guid.NewGuid().ToString("N").Substring(0, 5);
	}

	private async Task<AppUser?> FindUserByEmailAnyStateAsync(string email)
	{
		AppUser appUser = await _userManager.FindByEmailAsync(email);
		if (appUser != null)
		{
			return appUser;
		}
		string normalized = _userManager.NormalizeEmail(email);
		return await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync((AppUser u) => u.NormalizedEmail == normalized);
	}

	private async Task<AppUser?> FindActiveUserByPhoneAsync(string phone, string? excludeUserId = null)
	{
		string normalizedPhone = phone.Trim();
		if (string.IsNullOrWhiteSpace(normalizedPhone))
		{
			return null;
		}
		IQueryable<AppUser> source = _db.Users.Where((AppUser u) => u.PhoneNumber == normalizedPhone);
		if (!string.IsNullOrWhiteSpace(excludeUserId))
		{
			source = source.Where((AppUser u) => u.Id != excludeUserId);
		}
		return await source.FirstOrDefaultAsync();
	}

	private async Task<IdentityResult> EnsureExternalLoginLinkedAsync(AppUser user, UserLoginInfo login)
	{
		if ((await _userManager.GetLoginsAsync(user)).Any((UserLoginInfo l) => l.LoginProvider == login.LoginProvider && l.ProviderKey == login.ProviderKey))
		{
			return IdentityResult.Success;
		}
		return await _userManager.AddLoginAsync(user, login);
	}

	private static string ResolveSocialRegisterRole(string? role)
	{
		string text = (role ?? "patient").Trim().ToLowerInvariant();
		bool flag;
		switch (text)
		{
		case "doctor":
		case "pharmacy":
		case "patient":
			flag = true;
			break;
		default:
			flag = false;
			break;
		}
		if (!flag)
		{
			return "patient";
		}
		return text;
	}

	private static bool PatientProfileIncomplete(AppUser user)
	{
		if (!string.IsNullOrWhiteSpace(user.FullName) && !string.IsNullOrWhiteSpace(user.FullNameEn) && !string.IsNullOrWhiteSpace(user.PhoneNumber))
		{
			return !user.DateOfBirth.HasValue;
		}
		return true;
	}

	private static bool ComputeNeedsProfileCompletion(AppUser user, IList<string> roles, int? doctorProfileId, int? pharmacyProfileId)
	{
		return roles.FirstOrDefault()?.ToLowerInvariant() switch
		{
			"patient" => PatientProfileIncomplete(user), 
			"doctor" => !doctorProfileId.HasValue, 
			"pharmacy" => !pharmacyProfileId.HasValue, 
			_ => false, 
		};
	}

	private async Task SendEmailVerificationOtpAsync(AppUser user)
	{
		string code = OtpSecurity.GenerateCode();
		foreach (EmailOtp item in await _db.EmailOtps.Where((EmailOtp x) => x.UserId == user.Id && !x.IsUsed).ToListAsync())
		{
			item.IsUsed = true;
		}
		_db.EmailOtps.Add(new EmailOtp
		{
			UserId = user.Id,
			Code = OtpSecurity.HashCode(user.Id, code),
			ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10.0)
		});
		await _db.SaveChangesAsync();
		string subject = "Medora - Verification Code";
		string message = $"رمز التحقق الخاص بك هو: {code}\nالرمز صالح لمدة {10} دقائق";
		await _otpSender.SendOtpAsync(user.Email, subject, message);
	}

	private async Task<AuthResponseDto> GenerateJwtAsync(AppUser user)
	{
		IList<string> roles = await _userManager.GetRolesAsync(user);
		IList<Claim> collection = await _userManager.GetClaimsAsync(user);
		string tokenId = Guid.NewGuid().ToString("N");
		List<Claim> list = new List<Claim>
		{
			new Claim("sub", user.Id),
			new Claim("email", user.Email ?? ""),
			new Claim("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier", user.Id),
			new Claim("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", user.UserName ?? user.Email ?? user.Id),
			new Claim("jti", tokenId)
		};
		foreach (string item in roles)
		{
			list.Add(new Claim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", item));
		}
		list.AddRange(collection);
		SymmetricSecurityKey key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
		SigningCredentials signingCredentials = new SigningCredentials(key, "HS256");
		DateTime expires = DateTime.UtcNow.AddMinutes(_jwt.ExpMinutes);
		string issuer = _jwt.Issuer;
		string audience = _jwt.Audience;
		DateTime? expires2 = expires;
		SigningCredentials signingCredentials2 = signingCredentials;
		JwtSecurityToken token = new JwtSecurityToken(issuer, audience, list, null, expires2, signingCredentials2);
		_db.UserSessions.Add(new UserSession
		{
			UserId = user.Id,
			TokenId = tokenId,
			IpAddress = base.HttpContext.Connection.RemoteIpAddress?.ToString(),
			UserAgent = base.Request.Headers.UserAgent.ToString(),
			CreatedAt = DateTime.UtcNow,
			ExpiresAt = expires
		});
		user.LastLoginAt = DateTime.UtcNow;
		await _userManager.UpdateAsync(user);
		await _db.SaveChangesAsync();
		int? doctorProfileId = await _db.DoctorProfiles.Where((DoctorProfile d) => d.UserId == user.Id).Select((Expression<Func<DoctorProfile, int?>>)((DoctorProfile d) => d.Id)).FirstOrDefaultAsync();
		int? pharmacyProfileId = await _db.PharmacyProfiles.Where((PharmacyProfile p) => p.UserId == user.Id).Select((Expression<Func<PharmacyProfile, int?>>)((PharmacyProfile p) => p.Id)).FirstOrDefaultAsync();
		return new AuthResponseDto
		{
			Token = new JwtSecurityTokenHandler().WriteToken(token),
			ExpiresAtUtc = expires,
			UserId = user.Id,
			Email = (user.Email ?? ""),
			UserName = user.UserName,
			TokenId = tokenId,
			FullName = user.FullName,
			FullNameEn = user.FullNameEn,
			PhoneNumber = user.PhoneNumber,
			DateOfBirth = user.DateOfBirth,
			DoctorProfileId = doctorProfileId,
			PharmacyProfileId = pharmacyProfileId,
			Roles = roles.ToList(),
			NeedsProfileCompletion = ComputeNeedsProfileCompletion(user, roles, doctorProfileId, pharmacyProfileId)
		};
	}

	[EnableRateLimiting("auth")]
	[HttpPost("register")]
	public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string role = (dto.AccountType ?? "").Trim().ToLowerInvariant();
		bool flag;
		switch (role)
		{
		case "doctor":
		case "pharmacy":
		case "patient":
			flag = true;
			break;
		default:
			flag = false;
			break;
		}
		if (!flag)
		{
			return BadRequest(new
			{
				message = "AccountType must be: doctor, pharmacy, patient"
			});
		}

		if (role == "patient" && string.IsNullOrWhiteSpace(dto.FullName))
		{
			return BadRequest(new
			{
				message = "FullName is required for patient"
			});
		}
		string email = dto.Email.Trim();
		AppUser appUser = await FindUserByEmailAnyStateAsync(email);
		if (appUser != null && !appUser.IsDeleted)
		{
			if (!appUser.EmailConfirmed)
			{
				return Conflict(new
				{
					message = "Email already registered but not verified. Please sign in and verify your email.",
					code = "email_exists_unverified"
				});
			}
			return Conflict(new
			{
				message = "Email already registered. Please sign in instead.",
				code = "email_exists"
			});
		}
		if (appUser != null)
		{
			IdentityResult identityResult = await ArchiveDeletedUserIdentityAsync(appUser);
			if (!identityResult.Succeeded)
			{
				return BadRequest(new
				{
					message = "Failed to prepare deleted account email for reuse",
					errors = identityResult.Errors.Select((IdentityError e) => e.Description)
				});
			}
		}
		if (role == "patient")
		{
			string phone = dto.PhoneNumber?.Trim();
			if (!string.IsNullOrEmpty(phone) && await FindActiveUserByPhoneAsync(phone) != null)
			{
				return Conflict(new
				{
					message = "Phone number already registered. Please sign in instead.",
					code = "phone_exists"
				});
			}
		}
		AppUser user = new AppUser
		{
			UserName = email,
			Email = email,
			FullName = ((!(role == "patient")) ? null : dto.FullName?.Trim()),
			FullNameEn = ((!(role == "patient")) ? null : dto.FullNameEn?.Trim()),
			PhoneNumber = ((!(role == "patient")) ? null : dto.PhoneNumber?.Trim()),
			DateOfBirth = ((role == "patient") ? dto.DateOfBirth : ((DateTime?)null))
		};
		IdentityResult identityResult2 = await _userManager.CreateAsync(user, dto.Password);
		if (!identityResult2.Succeeded)
		{
			return BadRequest(new
			{
				message = "Registration failed",
				errors = identityResult2.Errors.Select((IdentityError e) => e.Description)
			});
		}
		IdentityResult addRole = await _userManager.AddToRoleAsync(user, role);
		if (!addRole.Succeeded)
		{
			await _userManager.DeleteAsync(user);
			return BadRequest(new
			{
				message = "Failed to assign role",
				errors = addRole.Errors.Select((IdentityError e) => e.Description)
			});
		}
		await SendEmailVerificationOtpAsync(user);
		string id = user.Id;
		string role2 = role;
		string text = role;
		flag = ((text == "doctor" || text == "pharmacy") ? true : false);
		return Ok(new
		{
			message = "OTP sent to email",
			userId = id,
			role = role2,
			needsProfileCompletion = flag
		});
	}

	[EnableRateLimiting("otp")]
	[HttpPost("verifyEmail")]
	public async Task<ActionResult<AuthResponseDto>> VerifyOtp([FromBody] VerifyOtpDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		AppUser user = await _userManager.FindByEmailAsync(dto.Email);
		if (user == null || user.IsDeleted)
		{
			return BadRequest(new
			{
				message = "Invalid email"
			});
		}
		EmailOtp emailOtp = await (from x in _db.EmailOtps
			where x.UserId == user.Id && !x.IsUsed
			orderby x.Id descending
			select x).FirstOrDefaultAsync();
		if (emailOtp == null)
		{
			return BadRequest(new
			{
				message = "OTP not found"
			});
		}
		if (emailOtp.ExpiresAtUtc < DateTime.UtcNow)
		{
			return BadRequest(new
			{
				message = "OTP expired"
			});
		}
		emailOtp.Attempts++;
		if (emailOtp.Attempts > 5)
		{
			emailOtp.IsUsed = true;
			await _db.SaveChangesAsync();
			return BadRequest(new
			{
				message = "Too many attempts"
			});
		}
		if (!OtpSecurity.Matches(user.Id, emailOtp.Code, dto.Code))
		{
			await _db.SaveChangesAsync();
			return BadRequest(new
			{
				message = "Invalid OTP"
			});
		}
		emailOtp.IsUsed = true;
		user.EmailConfirmed = true;
		await _userManager.UpdateAsync(user);
		await _db.SaveChangesAsync();
		return Ok(await GenerateJwtAsync(user));
	}

	[EnableRateLimiting("otp")]
	[HttpPost("resendOtp")]
	public async Task<IActionResult> ResendOtp([FromBody] ResendOtpDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		AppUser appUser = await _userManager.FindByEmailAsync(dto.Email);
		if (appUser == null || appUser.IsDeleted)
		{
			return BadRequest(new
			{
				message = "Invalid email"
			});
		}
		await SendEmailVerificationOtpAsync(appUser);
		return Ok(new
		{
			message = "OTP resent"
		});
	}

	[EnableRateLimiting("auth")]
	[HttpPost("login")]
	public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		AppUser user = await _userManager.FindByEmailAsync(dto.Email);
		if (user == null)
		{
			return Unauthorized(new
			{
				message = "Invalid email or password"
			});
		}
		if (!user.IsActive || user.IsDeleted)
		{
			return Unauthorized(new
			{
				message = "Account is disabled"
			});
		}
		if (!(await _userManager.CheckPasswordAsync(user, dto.Password)))
		{
			return Unauthorized(new
			{
				message = "Invalid email or password"
			});
		}
		if (!user.EmailConfirmed)
		{
			return Unauthorized(new
			{
				message = "Email not verified. Please verify OTP first"
			});
		}
		(await _userManager.GetRolesAsync(user)).FirstOrDefault()?.ToLowerInvariant();
		return Ok(await GenerateJwtAsync(user));
	}

	[HttpPost("google-login")]
	public async Task<ActionResult<AuthResponseDto>> GoogleLogin([FromBody] GoogleLoginDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string text = _config["Google:ClientId"];
		if (string.IsNullOrEmpty(text))
		{
			return StatusCode(500, new
			{
				message = "Google Auth is not configured on the server."
			});
		}
		GoogleJsonWebSignature.Payload idToken;
		try
		{
			var handler = new JwtSecurityTokenHandler();
			var jwtToken = handler.ReadJwtToken(dto.IdToken);
			var iat = jwtToken.ValidFrom;

			GoogleJsonWebSignature.ValidationSettings validationSettings = new GoogleJsonWebSignature.ValidationSettings();
			validationSettings.Audience = new string[1] { text };
			validationSettings.Clock = new MockClock { UtcNow = iat.AddSeconds(10) };
			GoogleJsonWebSignature.ValidationSettings validationSettings2 = validationSettings;
			idToken = await GoogleJsonWebSignature.ValidateAsync(dto.IdToken, validationSettings2);
		}
		catch (Exception ex)
		{
			try
			{
				using var http = new HttpClient();
				http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", dto.IdToken);
				var response = await http.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");
				if (!response.IsSuccessStatusCode)
				{
					Console.WriteLine("Google UserInfo API Error: " + response.StatusCode);
					return BadRequest(new { message = "Invalid Google token: " + ex.Message });
				}
				var json = await response.Content.ReadAsStringAsync();
				using var doc = System.Text.Json.JsonDocument.Parse(json);
				var root = doc.RootElement;
				idToken = new GoogleJsonWebSignature.Payload
				{
					Email = root.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : null,
					Subject = root.TryGetProperty("sub", out var subProp) ? subProp.GetString() : null,
					Name = root.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : null
				};
				if (string.IsNullOrEmpty(idToken.Subject))
				{
					return BadRequest(new { message = "Invalid Google token format." });
				}
			}
			catch (Exception ex2)
			{
				Console.WriteLine("Google Login Validation Error: " + ex.Message + " | " + ex2.Message);
				return BadRequest(new { message = "Invalid Google token: " + ex.Message });
			}
		}
		if (string.IsNullOrEmpty(idToken.Email))
		{
			return BadRequest(new
			{
				message = "Failed to retrieve Google user information."
			});
		}
		string subject = idToken.Subject;
		UserLoginInfo googleLogin = new UserLoginInfo("Google", subject, "Google");
		AppUser user = await _userManager.FindByLoginAsync("Google", subject);
		bool isNewUser = false;
		if (user == null)
		{
			user = await FindUserByEmailAnyStateAsync(idToken.Email.Trim());
			if (user?.IsDeleted ?? false)
			{
				return BadRequest(new
				{
					message = "This email belongs to a deactivated account. Please contact support."
				});
			}
		}
		if (user == null)
		{
			string text2 = idToken.Email.Trim();
			string text3 = text2.Split('@')[0];
			string registerRole = ResolveSocialRegisterRole(dto.Role);
			user = new AppUser
			{
				UserName = BuildExternalUserName(text3),
				Email = text2,
				EmailConfirmed = true,
				FullName = (idToken.Name ?? text3)
			};
			IdentityResult identityResult = await _userManager.CreateAsync(user, GenerateExternalAuthPassword());
			if (!identityResult.Succeeded)
			{
				string text4 = string.Join(" ", identityResult.Errors.Select((IdentityError e) => e.Description));
				return BadRequest(new
				{
					message = (string.IsNullOrWhiteSpace(text4) ? "Failed to create user." : text4),
					errors = identityResult.Errors.Select((IdentityError e) => e.Description)
				});
			}
			await _userManager.AddToRoleAsync(user, registerRole);
			await _userManager.AddLoginAsync(user, googleLogin);
			isNewUser = true;
		}
		else
		{
			IdentityResult identityResult2 = await EnsureExternalLoginLinkedAsync(user, googleLogin);
			if (!identityResult2.Succeeded)
			{
				return BadRequest(new
				{
					message = "Failed to link Google account.",
					errors = identityResult2.Errors.Select((IdentityError e) => e.Description)
				});
			}
			if (!user.EmailConfirmed)
			{
				user.EmailConfirmed = true;
				await _userManager.UpdateAsync(user);
			}
			if (!user.IsActive || user.IsDeleted)
			{
				return Unauthorized(new
				{
					message = "Account is disabled"
				});
			}
		}
		AuthResponseDto authResponseDto = await GenerateJwtAsync(user);
		authResponseDto.IsNewGoogleUser = isNewUser;
		authResponseDto.IsExistingUser = !isNewUser;
		if (isNewUser)
		{
			authResponseDto.NeedsProfileCompletion = true;
		}
		return Ok(authResponseDto);
	}

	[HttpPost("facebook-login")]
	public async Task<ActionResult<AuthResponseDto>> FacebookLogin([FromBody] FacebookLoginDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string appId = _config["Facebook:AppId"];
		string text = _config["Facebook:AppSecret"];
		if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(text))
		{
			return StatusCode(500, new
			{
				message = "Facebook Auth is not configured on the server."
			});
		}
		FacebookUserInfoDto payload;
		try
		{
			using HttpClient http = new HttpClient();
			string requestUri = "https://graph.facebook.com/debug_token?input_token=" + Uri.EscapeDataString(dto.AccessToken) + "&access_token=" + Uri.EscapeDataString(appId + "|" + text);
			FacebookDebugTokenResponse facebookDebugTokenResponse = await http.GetFromJsonAsync<FacebookDebugTokenResponse>(requestUri);
			if (facebookDebugTokenResponse == null || facebookDebugTokenResponse.data?.IsValid != true || facebookDebugTokenResponse.data.AppId != appId)
			{
				return BadRequest(new
				{
					message = "Invalid Facebook token."
				});
			}
			string requestUri2 = "https://graph.facebook.com/me?fields=id,name,email&access_token=" + Uri.EscapeDataString(dto.AccessToken);
			payload = await http.GetFromJsonAsync<FacebookUserInfoDto>(requestUri2);
		}
		catch (Exception)
		{
			return BadRequest(new
			{
				message = "Invalid Facebook token."
			});
		}
		if (payload == null || string.IsNullOrEmpty(payload.id))
		{
			return BadRequest(new
			{
				message = "Failed to retrieve Facebook user information."
			});
		}
		UserLoginInfo facebookLogin = new UserLoginInfo("Facebook", payload.id, "Facebook");
		AppUser user = await _userManager.FindByLoginAsync(facebookLogin.LoginProvider, facebookLogin.ProviderKey);
		bool hasRealEmail = !string.IsNullOrWhiteSpace(payload.email);
		bool isNewUser = false;
		if (user == null && hasRealEmail)
		{
			user = await FindUserByEmailAnyStateAsync(payload.email.Trim());
			if (user?.IsDeleted ?? false)
			{
				return BadRequest(new
				{
					message = "This email belongs to a deactivated account. Please contact support."
				});
			}
		}
		if (user == null)
		{
			string email = (hasRealEmail ? payload.email.Trim() : ("fb." + payload.id + "@users.medora.tigerauto.to"));
			string text2 = (hasRealEmail ? payload.email.Split('@')[0] : ("fb" + payload.id));
			string registerRole = ResolveSocialRegisterRole(dto.Role);
			user = new AppUser
			{
				UserName = BuildExternalUserName(text2),
				Email = email,
				EmailConfirmed = hasRealEmail,
				FullName = (payload.name ?? text2)
			};
			IdentityResult identityResult = await _userManager.CreateAsync(user, GenerateExternalAuthPassword());
			if (!identityResult.Succeeded)
			{
				string text3 = string.Join(" ", identityResult.Errors.Select((IdentityError e) => e.Description));
				return BadRequest(new
				{
					message = (string.IsNullOrWhiteSpace(text3) ? "Failed to create user." : text3),
					errors = identityResult.Errors.Select((IdentityError e) => e.Description)
				});
			}
			await _userManager.AddToRoleAsync(user, registerRole);
			await _userManager.AddLoginAsync(user, facebookLogin);
			isNewUser = true;
		}
		else
		{
			IdentityResult identityResult2 = await EnsureExternalLoginLinkedAsync(user, facebookLogin);
			if (!identityResult2.Succeeded)
			{
				return BadRequest(new
				{
					message = "Failed to link Facebook account.",
					errors = identityResult2.Errors.Select((IdentityError e) => e.Description)
				});
			}
			if (hasRealEmail)
			{
				if ((user.Email?.EndsWith("@users.medora.tigerauto.to", StringComparison.OrdinalIgnoreCase) ?? false) || (user.Email?.EndsWith("@facebook.medora.local", StringComparison.OrdinalIgnoreCase) ?? false))
				{
					user.Email = payload.email;
					user.EmailConfirmed = true;
				}
				else if (!user.EmailConfirmed)
				{
					user.EmailConfirmed = true;
				}
				await _userManager.UpdateAsync(user);
			}
			if (!user.IsActive || user.IsDeleted)
			{
				return Unauthorized(new
				{
					message = "Account is disabled"
				});
			}
		}
		AuthResponseDto authResponseDto = await GenerateJwtAsync(user);
		authResponseDto.IsNewFacebookUser = isNewUser;
		authResponseDto.IsExistingUser = !isNewUser;
		if (isNewUser)
		{
			authResponseDto.NeedsProfileCompletion = true;
		}
		return Ok(authResponseDto);
	}

	[EnableRateLimiting("otp")]
	[HttpPost("forgotPassword")]
	public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		OkObjectResult genericResponse = Ok(new
		{
			message = "If an account exists for this email, an OTP has been sent"
		});
		AppUser user = await _userManager.FindByEmailAsync(dto.Email);
		if (user == null || user.IsDeleted)
		{
			return genericResponse;
		}
		string code = OtpSecurity.GenerateCode();
		string resetToken = OtpSecurity.GenerateSecureToken();
		foreach (PasswordResetOtp item in await _db.PasswordResetOtps.Where((PasswordResetOtp x) => x.UserId == user.Id && !x.IsUsed).ToListAsync())
		{
			item.IsUsed = true;
		}
		_db.PasswordResetOtps.Add(new PasswordResetOtp
		{
			UserId = user.Id,
			Code = OtpSecurity.HashCode(user.Id, code),
			ResetToken = resetToken,
			ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10.0)
		});
		await _db.SaveChangesAsync();
		string subject = "Medora - Reset Password Code";
		string message = $"رمز إعادة تعيين كلمة المرور هو: {code}\nالرمز صالح لمدة {10} دقائق";
		await _otpSender.SendOtpAsync(user.Email, subject, message);
		return genericResponse;
	}

	[EnableRateLimiting("otp")]
	[HttpPost("forgotPassword/verify")]
	public async Task<IActionResult> VerifyForgotPassword([FromBody] ForgotPasswordVerifyDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		BadRequestObjectResult genericInvalidResponse = BadRequest(new
		{
			message = "Invalid or expired code"
		});
		AppUser user = await _userManager.FindByEmailAsync(dto.Email);
		if (user == null || user.IsDeleted)
		{
			return genericInvalidResponse;
		}
		PasswordResetOtp rec = await (from x in _db.PasswordResetOtps
			where x.UserId == user.Id && !x.IsUsed
			orderby x.Id descending
			select x).FirstOrDefaultAsync();
		if (rec == null)
		{
			return genericInvalidResponse;
		}
		if (rec.ExpiresAtUtc < DateTime.UtcNow)
		{
			return genericInvalidResponse;
		}
		rec.Attempts++;
		if (rec.Attempts > 5)
		{
			rec.IsUsed = true;
			await _db.SaveChangesAsync();
			return BadRequest(new
			{
				message = "Too many attempts"
			});
		}
		if (!OtpSecurity.Matches(user.Id, rec.Code, dto.Code))
		{
			await _db.SaveChangesAsync();
			return genericInvalidResponse;
		}
		rec.ResetToken = OtpSecurity.GenerateSecureToken();
		rec.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10.0);
		await _db.SaveChangesAsync();
		return Ok(new
		{
			resetToken = rec.ResetToken
		});
	}

	[HttpPost("resetPassword")]
	public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		AppUser user = await _userManager.FindByEmailAsync(dto.Email);
		if (user == null || user.IsDeleted)
		{
			return BadRequest(new
			{
				message = "Invalid request"
			});
		}
		PasswordResetOtp rec = await (from x in _db.PasswordResetOtps
			where x.UserId == user.Id && !x.IsUsed
			orderby x.Id descending
			select x).FirstOrDefaultAsync();
		if (rec == null)
		{
			return BadRequest(new
			{
				message = "Invalid request"
			});
		}
		if (rec.ExpiresAtUtc < DateTime.UtcNow)
		{
			return BadRequest(new
			{
				message = "Reset token expired"
			});
		}
		if (!string.Equals(rec.ResetToken, dto.ResetToken, StringComparison.Ordinal))
		{
			return BadRequest(new
			{
				message = "Invalid request"
			});
		}
		string token = await _userManager.GeneratePasswordResetTokenAsync(user);
		IdentityResult identityResult = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
		if (!identityResult.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to reset password",
				errors = identityResult.Errors.Select((IdentityError e) => e.Description)
			});
		}
		if (!user.EmailConfirmed)
		{
			user.EmailConfirmed = true;
			await _userManager.UpdateAsync(user);
		}
		rec.IsUsed = true;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Password updated successfully"
		});
	}

	[Authorize]
	[HttpGet("session/validate")]
	public IActionResult ValidateSession()
	{
		return Ok(new
		{
			valid = true
		});
	}

	[Authorize]
	[HttpGet("me")]
	public async Task<IActionResult> GetMe()
	{
		string text = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (text == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		AppUser user = await _userManager.FindByIdAsync(text);
		if (user == null)
		{
			return Unauthorized(new
			{
				message = "User not found"
			});
		}
		IList<string> roles = await _userManager.GetRolesAsync(user);
		string role = roles.FirstOrDefault();
		int? doctorProfileId = await _db.DoctorProfiles.Where((DoctorProfile d) => d.UserId == user.Id).Select((Expression<Func<DoctorProfile, int?>>)((DoctorProfile d) => d.Id)).FirstOrDefaultAsync();
		int? pharmacyProfileId = await _db.PharmacyProfiles.Where((PharmacyProfile p) => p.UserId == user.Id).Select((Expression<Func<PharmacyProfile, int?>>)((PharmacyProfile p) => p.Id)).FirstOrDefaultAsync();
		bool needsProfileCompletion = ComputeNeedsProfileCompletion(user, roles, doctorProfileId, pharmacyProfileId);
		return Ok(new
		{
			userId = user.Id,
			email = user.Email,
			userName = user.UserName,
			fullName = user.FullName,
			fullNameEn = user.FullNameEn,
			phoneNumber = user.PhoneNumber,
			dateOfBirth = user.DateOfBirth,
			medicalNotes = user.MedicalNotes,
			role = role,
			roles = roles,
			emailConfirmed = user.EmailConfirmed,
			doctorProfileId = doctorProfileId,
			pharmacyProfileId = pharmacyProfileId,
			needsProfileCompletion = needsProfileCompletion,
			preferredLanguage = user.PreferredLanguage,
			notificationPreferences = (string.IsNullOrEmpty(user.NotificationPreferences) ? null : JsonSerializer.Deserialize<object>(user.NotificationPreferences))
		});
	}

	[Authorize]
	[HttpPut("language")]
	public async Task<IActionResult> UpdateLanguage([FromBody] UpdateLanguageDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string text = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (text == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		AppUser user = await _userManager.FindByIdAsync(text);
		if (user == null)
		{
			return Unauthorized(new
			{
				message = "User not found"
			});
		}
		user.PreferredLanguage = UserLanguageHelper.Normalize(dto.Language);
		IdentityResult identityResult = await _userManager.UpdateAsync(user);
		if (!identityResult.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to update language",
				errors = identityResult.Errors.Select((IdentityError e) => e.Description)
			});
		}
		return Ok(new
		{
			message = "Language updated successfully",
			preferredLanguage = user.PreferredLanguage
		});
	}

	[Authorize]
	[HttpPut("profile")]
	public async Task<IActionResult> UpdatePatientProfile([FromBody] UpdatePatientProfileDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string text = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (text == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		AppUser user = await _userManager.FindByIdAsync(text);
		if (user == null)
		{
			return Unauthorized(new
			{
				message = "User not found"
			});
		}
		user.FullName = dto.FullName?.Trim();
		user.FullNameEn = dto.FullNameEn?.Trim();
		string phone = dto.PhoneNumber?.Trim();
		if (!string.IsNullOrWhiteSpace(phone) && await FindActiveUserByPhoneAsync(phone, user.Id) != null)
		{
			return Conflict(new
			{
				message = "Phone number already registered to another account.",
				code = "phone_exists"
			});
		}
		user.PhoneNumber = phone;
		user.DateOfBirth = dto.DateOfBirth;
		user.MedicalNotes = dto.MedicalNotes?.Trim();
		IdentityResult identityResult = await _userManager.UpdateAsync(user);
		if (!identityResult.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to update profile",
				errors = identityResult.Errors.Select((IdentityError e) => e.Description)
			});
		}
		AuthResponseDto authResponseDto = await GenerateJwtAsync(user);
		return Ok(authResponseDto);
	}

	[Authorize]
	[HttpPut("changePassword")]
	public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		string currentTokenId = base.User.FindFirstValue("jti");
		if (userId == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		AppUser appUser = await _userManager.FindByIdAsync(userId);
		if (appUser == null)
		{
			return Unauthorized(new
			{
				message = "User not found"
			});
		}
		IdentityResult identityResult = await _userManager.ChangePasswordAsync(appUser, dto.CurrentPassword, dto.NewPassword);
		if (!identityResult.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to change password",
				errors = identityResult.Errors.Select((IdentityError e) => e.Description)
			});
		}
		foreach (UserSession item in await _db.UserSessions.Where((UserSession s) => s.UserId == userId && !s.IsRevoked && s.TokenId != currentTokenId).ToListAsync())
		{
			item.IsRevoked = true;
			item.RevokedAt = DateTime.UtcNow;
		}
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Password changed successfully"
		});
	}

	[Authorize]
	[HttpGet("sessions")]
	public async Task<IActionResult> GetSessions()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		string tokenId = base.User.FindFirstValue("jti");
		return Ok(await (from s in _db.UserSessions.AsNoTracking()
			where s.UserId == userId
			orderby s.CreatedAt descending
			select new
			{
				id = s.Id,
				tokenId = s.TokenId,
				ipAddress = s.IpAddress,
				userAgent = s.UserAgent,
				createdAt = s.CreatedAt,
				expiresAt = s.ExpiresAt,
				revokedAt = s.RevokedAt,
				isRevoked = s.IsRevoked,
				isCurrent = (s.TokenId == tokenId)
			}).ToListAsync());
	}

	[Authorize]
	[HttpPost("logout")]
	public async Task<IActionResult> Logout()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		string tokenId = base.User.FindFirstValue("jti");
		UserSession userSession = await _db.UserSessions.FirstOrDefaultAsync((UserSession s) => s.UserId == userId && s.TokenId == tokenId);
		if (userSession != null)
		{
			userSession.IsRevoked = true;
			userSession.RevokedAt = DateTime.UtcNow;
			await _db.SaveChangesAsync();
		}
		return Ok(new
		{
			message = "Logged out successfully"
		});
	}

	[Authorize]
	[HttpPost("logout-all")]
	public async Task<IActionResult> LogoutAll()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		foreach (UserSession item in await _db.UserSessions.Where((UserSession s) => s.UserId == userId && !s.IsRevoked).ToListAsync())
		{
			item.IsRevoked = true;
			item.RevokedAt = DateTime.UtcNow;
		}
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "All sessions revoked successfully"
		});
	}

	[Authorize]
	[HttpPut("email")]
	public async Task<IActionResult> UpdateEmail([FromBody] UpdateEmailDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		string currentTokenId = base.User.FindFirstValue("jti");
		if (userId == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		AppUser user = await _userManager.FindByIdAsync(userId);
		if (user == null)
		{
			return Unauthorized(new
			{
				message = "User not found"
			});
		}
		if (!(await _userManager.CheckPasswordAsync(user, dto.CurrentPassword)))
		{
			return BadRequest(new
			{
				message = "Current password is incorrect"
			});
		}
		AppUser appUser = await _userManager.FindByEmailAsync(dto.Email);
		if (appUser != null && appUser.Id != user.Id && !appUser.IsDeleted)
		{
			return Conflict(new
			{
				message = "Email already exists"
			});
		}
		if (appUser != null && appUser.Id != user.Id)
		{
			IdentityResult identityResult = await ArchiveDeletedUserIdentityAsync(appUser);
			if (!identityResult.Succeeded)
			{
				return BadRequest(new
				{
					message = "Failed to prepare deleted account email for reuse",
					errors = identityResult.Errors.Select((IdentityError e) => e.Description)
				});
			}
		}
		string text = (user.UserName = (user.Email = dto.Email.Trim()));
		user.NormalizedEmail = _userManager.NormalizeEmail(text);
		user.NormalizedUserName = _userManager.NormalizeName(text);
		user.EmailConfirmed = false;
		IdentityResult identityResult2 = await _userManager.UpdateAsync(user);
		if (!identityResult2.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to update email",
				errors = identityResult2.Errors.Select((IdentityError e) => e.Description)
			});
		}
		foreach (UserSession item in await _db.UserSessions.Where((UserSession s) => s.UserId == userId && !s.IsRevoked && s.TokenId != currentTokenId).ToListAsync())
		{
			item.IsRevoked = true;
			item.RevokedAt = DateTime.UtcNow;
		}
		await SendEmailVerificationOtpAsync(user);
		return Ok(new
		{
			message = "Email updated successfully. Please verify your email again"
		});
	}

	[Authorize]
	[HttpPut("phone")]
	public async Task<IActionResult> UpdatePhone([FromBody] UpdatePhoneDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string text = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (text == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		AppUser user = await _userManager.FindByIdAsync(text);
		if (user == null)
		{
			return Unauthorized(new
			{
				message = "User not found"
			});
		}
		string phone = dto.PhoneNumber.Trim();
		if (await FindActiveUserByPhoneAsync(phone, user.Id) != null)
		{
			return Conflict(new
			{
				message = "Phone number already registered to another account.",
				code = "phone_exists"
			});
		}
		user.PhoneNumber = phone;
		IdentityResult identityResult = await _userManager.UpdateAsync(user);
		if (!identityResult.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to update phone",
				errors = identityResult.Errors.Select((IdentityError e) => e.Description)
			});
		}
		return Ok(new
		{
			message = "Phone updated successfully"
		});
	}

	[Authorize]
	[HttpDelete("me")]
	public async Task<IActionResult> DeleteMyAccount()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (userId == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		AppUser user = await _userManager.FindByIdAsync(userId);
		if (user == null || user.IsDeleted)
		{
			return NotFound(new
			{
				message = "Account not found"
			});
		}
		foreach (UserSession item in await _db.UserSessions.Where((UserSession s) => s.UserId == userId && !s.IsRevoked).ToListAsync())
		{
			item.IsRevoked = true;
		}
		IdentityResult identityResult = await ArchiveDeletedUserIdentityAsync(user);
		if (!identityResult.Succeeded)
		{
			return BadRequest(new
			{
				message = "Failed to delete account",
				errors = identityResult.Errors.Select((IdentityError e) => e.Description)
			});
		}
		user.IsDeleted = true;
		user.IsActive = false;
		user.DeletedAt = DateTime.UtcNow;
		await _userManager.UpdateAsync(user);
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Account deleted successfully"
		});
	}

	[Authorize]
	[HttpPost("delete-request")]
	public async Task<IActionResult> DeleteRequest([FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] DeleteAccountRequestDto? dto)
	{
		string text = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (text == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		_db.UserReports.Add(new UserReport
		{
			ReporterUserId = text,
			TargetType = "account-delete",
			TargetId = 0,
			Reason = (dto?.Reason?.Trim() ?? "Account delete request"),
			CreatedAt = DateTime.UtcNow
		});
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Delete account request submitted successfully"
		});
	}

	[Authorize]
	[HttpPut("notifications")]
	public async Task<IActionResult> UpdateNotificationPreferences([FromBody] UpdateNotificationsDto dto)
	{
		string text = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (text == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		AppUser appUser = await _userManager.FindByIdAsync(text);
		if (appUser == null)
		{
			return Unauthorized(new
			{
				message = "User not found"
			});
		}
		appUser.NotificationPreferences = JsonSerializer.Serialize(dto, new JsonSerializerOptions
		{
			PropertyNamingPolicy = JsonNamingPolicy.CamelCase
		});
		await _userManager.UpdateAsync(appUser);
		return Ok(new
		{
			message = "Preferences updated successfully"
		});
	}

	private async Task<IdentityResult> ArchiveDeletedUserIdentityAsync(AppUser user)
	{
		string text = (user.UserName = (user.Email = BuildDeletedUserIdentity(user.Id)));
		user.NormalizedEmail = _userManager.NormalizeEmail(text);
		user.NormalizedUserName = _userManager.NormalizeName(text);
		user.PhoneNumber = null;
		user.SecurityStamp = Guid.NewGuid().ToString();
		return await _userManager.UpdateAsync(user);
	}

	private static string BuildDeletedUserIdentity(string userId)
	{
		return $"deleted-{DateTime.UtcNow:yyyyMMddHHmmss}-{userId}@deleted.local";
	}
}

public class MockClock : Google.Apis.Util.IClock
{
    public DateTime Now => UtcNow.ToLocalTime();
    public DateTime UtcNow { get; set; }
}
