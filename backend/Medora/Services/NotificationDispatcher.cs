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

public class NotificationDispatcher : INotificationDispatcher
{
	private readonly IHubContext<NotificationHub> _hub;

	private readonly IEmailOtpSender _emailSender;

	private readonly UserManager<AppUser> _userManager;

	private readonly ILogger<NotificationDispatcher> _logger;

	public NotificationDispatcher(IHubContext<NotificationHub> hub, IEmailOtpSender emailSender, UserManager<AppUser> userManager, ILogger<NotificationDispatcher> logger)
	{
		_hub = hub;
		_emailSender = emailSender;
		_userManager = userManager;
		_logger = logger;
	}

	public Notification Create(string userId, string title, string body, string type)
	{
		return new Notification
		{
			UserId = userId,
			Title = title.Trim(),
			Body = body.Trim(),
			Type = type.Trim().ToLowerInvariant(),
			CreatedAt = DateTime.UtcNow
		};
	}

	public async Task<Notification> CreateForUserAsync(string userId, string type, Func<string, (string Title, string Body)> messageFactory)
	{
		var (title, body) = messageFactory(await ResolveLanguageAsync(userId));
		return Create(userId, title, body, type);
	}

	private async Task<string> ResolveLanguageAsync(string userId)
	{
		return UserLanguageHelper.Normalize((await _userManager.FindByIdAsync(userId))?.PreferredLanguage);
	}

	public async Task PublishAsync(Notification notification, NotificationEmailPreference emailPreference = NotificationEmailPreference.Always, CancellationToken cancellationToken = default(CancellationToken))
	{
		var arg = new
		{
			id = notification.Id,
			title = notification.Title,
			body = notification.Body,
			type = notification.Type,
			isRead = notification.IsRead,
			createdAt = notification.CreatedAt
		};
		try
		{
			await _hub.Clients.User(notification.UserId).SendAsync("notification", arg, cancellationToken);
		}
		catch (Exception exception)
		{
			_logger.LogWarning(exception, "SignalR notification push failed for user {UserId}", notification.UserId);
		}
		AppUser appUser = await _userManager.FindByIdAsync(notification.UserId);
		if (string.IsNullOrWhiteSpace(appUser?.Email) || !NotificationPreferencesHelper.ShouldSendEmail(appUser.NotificationPreferences, emailPreference))
		{
			return;
		}
		try
		{
			await _emailSender.SendOtpAsync(appUser.Email, notification.Title, notification.Body);
		}
		catch (Exception exception2)
		{
			_logger.LogWarning(exception2, "Email notification failed for user {UserId}", notification.UserId);
		}
	}
}
