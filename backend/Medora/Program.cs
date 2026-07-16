using Medora.Auth;
using Medora.Data;
using Medora.Data.Models;
using Medora.Hubs;
using Medora.Middleware;
using Medora.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.IO;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

ValidateStartupConfiguration(builder);

builder.Services.AddControllers();

builder.Services.AddRateLimiter(options =>
{
    options.AddSlidingWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 4;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    options.AddSlidingWindowLimiter("otp", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(5);
        opt.SegmentsPerWindow = 5;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    options.AddSlidingWindowLimiter("search", opt =>
    {
        opt.PermitLimit = 30;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 4;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    options.RejectionStatusCode = 429;
    options.OnRejected = async (context, _) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync("{\"message\":\"Too many requests. Please try again later.\"}");
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("MedoraCors", policy =>
    {
        policy
            .WithOrigins(
                "https://medora.tigerauto.to",
                "http://medora.tigerauto.to",
                "capacitor://localhost",
                "http://localhost",
                "https://localhost",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4173",
                "http://127.0.0.1:4173",
                "http://localhost:3000",
                "http://localhost:5117"
            )
            .WithHeaders("Content-Type", "Authorization", "Accept", "X-Requested-With", "Origin")
            .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Conn")));
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));
builder.Services.AddScoped<IEmailOtpSender, SmtpEmailOtpSender>();
builder.Services.AddScoped<INotificationDispatcher, NotificationDispatcher>();
builder.Services.AddSingleton<IPlatformSettingsStore, FilePlatformSettingsStore>();
builder.Services.AddSignalR();

var keysPath = builder.Configuration["DataProtection:KeysPath"]
    ?? Environment.GetEnvironmentVariable("MEDORA_DATA_PROTECTION_KEYS_PATH")
    ?? Path.Combine(builder.Environment.ContentRootPath, ".keys");
Directory.CreateDirectory(keysPath);
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(keysPath));

builder.Services
    .AddIdentityCore<AppUser>(opt =>
    {
        opt.User.RequireUniqueEmail = true;
        opt.Password.RequiredLength = 8;
        opt.Password.RequireDigit = true;
        opt.Password.RequireLowercase = true;
        opt.Password.RequireUppercase = true;
        opt.Password.RequireNonAlphanumeric = true;
        opt.Password.RequiredUniqueChars = 1;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()!;

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            },
            OnTokenValidated = async context =>
            {
                var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                var tokenId = context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Jti);
                if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(tokenId))
                {
                    context.Fail("Invalid session");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var session = await db.UserSessions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.UserId == userId && s.TokenId == tokenId);

                if (session == null || session.IsRevoked || session.ExpiresAt <= DateTime.UtcNow)
                {
                    context.Fail("Session expired");
                    return;
                }

                var user = await db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null || !user.IsActive || user.IsDeleted)
                    context.Fail("User inactive");
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
            var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalExceptionHandler");
            logger.LogError(exception, "Unhandled request error. TraceId: {TraceId}, Path: {Path}", context.TraceIdentifier, context.Request.Path);
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                message = "The server could not complete this request. Please try again.",
                traceId = context.TraceIdentifier
            });
        });
    });
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

await SeedRolesAsync(app);
await SeedBootstrapAdminAsync(app);
await SeedUserWithRoleAsync(app, "SeedDoctor", "doctor");
await SeedUserWithRoleAsync(app, "SeedPharmacist", "pharmacy");

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}
else
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseHttpsRedirection();
}

app.UseRateLimiter();
app.UseCors("MedoraCors");
app.UseAuthentication();
app.UseAuthorization();

var uploadsRoot = builder.Configuration["Uploads:RootPath"]
    ?? Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsRoot);
Directory.CreateDirectory(Path.Combine(uploadsRoot, "verification"));
Directory.CreateDirectory(Path.Combine(uploadsRoot, "prescription"));
app.UseMiddleware<ProtectedUploadsMiddleware>();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads"
});

app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapHub<NotificationHub>("/hubs/notifications");
app.MapControllers();
app.Run();

static bool IsMissingOrPlaceholder(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
        return true;
    var trimmed = value.Trim();
    if (trimmed.Equals("CHANGE_ME", StringComparison.OrdinalIgnoreCase) || trimmed.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        return true;
    return trimmed.Contains("placeholder", StringComparison.OrdinalIgnoreCase);
}

static void ValidateStartupConfiguration(WebApplicationBuilder builder)
{
    var configuration = builder.Configuration;
    var connectionString = configuration.GetConnectionString("Conn");
    var jwtKey = configuration["Jwt:Key"];

    if (IsMissingOrPlaceholder(connectionString))
        throw new InvalidOperationException("ConnectionStrings:Conn must be configured.");
    if (IsMissingOrPlaceholder(jwtKey) || jwtKey!.Length < 32)
        throw new InvalidOperationException("Jwt:Key must be configured with at least 32 characters.");

    if (builder.Environment.IsProduction())
    {
        if (connectionString!.Contains("Encrypt=False", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Production SQL connection must not use Encrypt=False.");

        var isLocal = connectionString.Contains("Server=localhost", StringComparison.OrdinalIgnoreCase)
            || connectionString.Contains("Server=127.0.0.1", StringComparison.OrdinalIgnoreCase)
            || connectionString.Contains("Data Source=localhost", StringComparison.OrdinalIgnoreCase);
        if (connectionString.Contains("TrustServerCertificate=True", StringComparison.OrdinalIgnoreCase) && !isLocal)
            throw new InvalidOperationException("Production SQL connection must not use TrustServerCertificate=True for non-local servers.");

        foreach (var key in new[] { "Email:Host", "Email:Username", "Email:AppPassword", "Email:FromEmail", "Jwt:Issuer", "Jwt:Audience" })
        {
            if (IsMissingOrPlaceholder(configuration[key]))
                throw new InvalidOperationException($"{key} must be configured for Production.");
        }

        var keysPath = configuration["DataProtection:KeysPath"] ?? Environment.GetEnvironmentVariable("MEDORA_DATA_PROTECTION_KEYS_PATH");
        if (IsMissingOrPlaceholder(keysPath))
            throw new InvalidOperationException("DataProtection:KeysPath or MEDORA_DATA_PROTECTION_KEYS_PATH must be configured for Production.");
    }
}

static async Task SeedRolesAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

    foreach (var role in new[] { "doctor", "pharmacy", "patient", "admin" })
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole(role));
}

static async Task SeedBootstrapAdminAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

    var email = config["BootstrapAdmin:Email"]?.Trim();
    var password = config["BootstrapAdmin:Password"];
    var fullName = config["BootstrapAdmin:FullName"]?.Trim();

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        return;

    var user = await userManager.FindByEmailAsync(email);
    if (user == null)
    {
        user = new AppUser
        {
            UserName = email,
            Email = email,
            FullName = string.IsNullOrWhiteSpace(fullName) ? "Medora Admin" : fullName,
            EmailConfirmed = true,
            IsActive = true
        };

        var create = await userManager.CreateAsync(user, password);
        if (!create.Succeeded)
            throw new InvalidOperationException($"Failed to create bootstrap admin: {string.Join("; ", create.Errors.Select(e => e.Description))}");
    }
    else
    {
        var changed = false;
        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            changed = true;
        }

        if (!user.IsActive || user.IsDeleted)
        {
            user.IsActive = true;
            user.IsDeleted = false;
            changed = true;
        }

        if (changed)
            await userManager.UpdateAsync(user);
    }

    if (!await userManager.IsInRoleAsync(user, "admin"))
        await userManager.AddToRoleAsync(user, "admin");
}

static async Task SeedUserWithRoleAsync(WebApplication app, string configSection, string role)
{
    using var scope = app.Services.CreateScope();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

    var email = config[$"{configSection}:Email"]?.Trim();
    var password = config[$"{configSection}:Password"];
    var fullName = config[$"{configSection}:FullName"]?.Trim();

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        return;

    var user = await userManager.FindByEmailAsync(email);
    if (user == null)
    {
        user = new AppUser
        {
            UserName = email,
            Email = email,
            FullName = string.IsNullOrWhiteSpace(fullName) ? email : fullName,
            EmailConfirmed = true,
            IsActive = true
        };
        var create = await userManager.CreateAsync(user, password);
        if (!create.Succeeded)
            throw new InvalidOperationException($"Failed to create seed {role}: {string.Join("; ", create.Errors.Select(e => e.Description))}");
    }
    else
    {
        if (!user.EmailConfirmed || !user.IsActive || user.IsDeleted)
        {
            user.EmailConfirmed = true;
            user.IsActive = true;
            user.IsDeleted = false;
            await userManager.UpdateAsync(user);
        }
    }

    if (!await userManager.IsInRoleAsync(user, role))
        await userManager.AddToRoleAsync(user, role);
}
