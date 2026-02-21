using Medora.Auth;
using Medora.Data;
using Medora.Data.Models;
using Medora.DTOs;
using Medora.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Medora.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly AppDbContext _db;
        private readonly JwtSettings _jwt;
        private readonly IEmailOtpSender _otpSender;
        public AccountController(
            UserManager<AppUser> userManager,
            AppDbContext db,
            IOptions<JwtSettings> jwtOptions,
            IEmailOtpSender otpSender)
        {
            _userManager = userManager;
            _db = db;
            _jwt = jwtOptions.Value;
            _otpSender = otpSender;
        }

        private string GenerateOtpCode() => Random.Shared.Next(100000, 999999).ToString();
        private async Task<AuthResponseDto> GenerateJwtAsync(AppUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var userClaims = await _userManager.GetClaimsAsync(user);

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id),
                new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
                new(ClaimTypes.NameIdentifier, user.Id),
                new(ClaimTypes.Name, user.UserName ?? user.Email ?? user.Id),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            foreach (var role in roles)
                claims.Add(new Claim(ClaimTypes.Role, role));

            claims.AddRange(userClaims);
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddMinutes(_jwt.ExpMinutes);

            var token = new JwtSecurityToken(
                issuer: _jwt.Issuer,
                audience: _jwt.Audience,
                claims: claims,
                expires: expires,
                signingCredentials: creds
            );
            return new AuthResponseDto
            {
                Token = new JwtSecurityTokenHandler().WriteToken(token),
                ExpiresAtUtc = expires,
                UserId = user.Id,
                Email = user.Email ?? "",
                UserName = user.UserName,
                Roles = roles.ToList()
            };
        }
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var role = (dto.AccountType ?? "").Trim().ToLowerInvariant();
            if (role is not ("doctor" or "pharmacy" or "patient"))
                return BadRequest(new { message = "AccountType must be: doctor, pharmacy, patient" });

            if (role == "patient" && string.IsNullOrWhiteSpace(dto.PhoneNumber))
                return BadRequest(new { message = "PhoneNumber is required for patient" });

            var existing = await _userManager.FindByEmailAsync(dto.Email);
            if (existing is not null)
                return Conflict(new { message = "Email already exists" });

            var user = new AppUser
            {
                UserName = dto.Email,
                Email = dto.Email,
                PhoneNumber = role == "patient" ? dto.PhoneNumber : null
            };

            if (!string.IsNullOrWhiteSpace(dto.FullName))
                user.FullName = dto.FullName;

            var create = await _userManager.CreateAsync(user, dto.Password);
            if (!create.Succeeded)
                return BadRequest(new { message = "Registration failed", errors = create.Errors.Select(e => e.Description) });

            var addRole = await _userManager.AddToRoleAsync(user, role);
            if (!addRole.Succeeded)
                return BadRequest(new { message = "Failed to assign role", errors = addRole.Errors.Select(e => e.Description) });

            var code = GenerateOtpCode();
            var oldOtps = await _db.EmailOtps
                .Where(x => x.UserId == user.Id && !x.IsUsed)
                .ToListAsync();

            foreach (var o in oldOtps)
                o.IsUsed = true;

            _db.EmailOtps.Add(new EmailOtp
            {
                UserId = user.Id,
                Code = code,
                ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10)
            });

            await _db.SaveChangesAsync();
            var subject = "Medora - Verification Code\n";
            var body = $"رمز التحقق الخاص بك هو: {code}\nالرمز صالح لمدة 10 دقائق";
            await _otpSender.SendOtpAsync(user.Email!, subject, body);
            return Ok(new
            {
                message = "OTP sent to email",
                userId = user.Id,
                role = role,
                needsProfileCompletion = role is "doctor" or "pharmacy"
            });
        }


        [HttpPost("verifyEmail")]
        public async Task<ActionResult<AuthResponseDto>> VerifyOtp([FromBody] VerifyOtpDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user is null)
                return BadRequest(new { message = "Invalid email" });

            var otp = await _db.EmailOtps
                .Where(x => x.UserId == user.Id && !x.IsUsed)
                .OrderByDescending(x => x.Id)
                .FirstOrDefaultAsync();

            if (otp is null)
                return BadRequest(new { message = "OTP not found" });

            if (otp.ExpiresAtUtc < DateTime.UtcNow)
                return BadRequest(new { message = "OTP expired" });

            otp.Attempts++;
            if (otp.Attempts > 5)
            {
                otp.IsUsed = true;
                await _db.SaveChangesAsync();
                return BadRequest(new { message = "Too many attempts" });
            }

            if (otp.Code != dto.Code)
            {
                await _db.SaveChangesAsync();
                return BadRequest(new { message = "Invalid OTP" });
            }

            otp.IsUsed = true;
            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);
            await _db.SaveChangesAsync();

            var auth = await GenerateJwtAsync(user);
            return Ok(auth);
        }

        [HttpPost("resendOtp")]
        public async Task<IActionResult> ResendOtp([FromBody] ResendOtpDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user is null)
                return BadRequest(new { message = "Invalid email" });

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault()?.ToLowerInvariant();

            var code = GenerateOtpCode();

            var oldOtps = await _db.EmailOtps
                .Where(x => x.UserId == user.Id && !x.IsUsed)
                .ToListAsync();

            foreach (var o in oldOtps)
                o.IsUsed = true;

            _db.EmailOtps.Add(new EmailOtp
            {
                UserId = user.Id,
                Code = code,
                ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10)
            });

            await _db.SaveChangesAsync();

            var subject = "Medora - Verification Code\n";
            var body = $"رمز التحقق الخاص بك هو: {code}\nالرمز صالح لمدة 10 دقائق";
            await _otpSender.SendOtpAsync(user.Email!, subject, body);

            return Ok(new { message = "OTP resent" });
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user is null)
                return Unauthorized(new { message = "Invalid email or password" });

            var passwordOk = await _userManager.CheckPasswordAsync(user, dto.Password);
            if (!passwordOk)
                return Unauthorized(new { message = "Invalid email or password" });

            if (!user.EmailConfirmed)
                return Unauthorized(new { message = "Email not verified. Please verify OTP first" });
            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault()?.ToLowerInvariant();

            var auth = await GenerateJwtAsync(user);
            return Ok(auth);
        }

        [HttpPost("forgotPassword")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userManager.FindByEmailAsync(dto.Email);

            if (user is null)
                return Ok(new { message = "Email not exists" });

            var code = GenerateOtpCode();
            var resetToken = Guid.NewGuid().ToString("N");

            var old = await _db.PasswordResetOtps
                .Where(x => x.UserId == user.Id && !x.IsUsed)
                .ToListAsync();

            foreach (var x in old)
                x.IsUsed = true;

            _db.PasswordResetOtps.Add(new PasswordResetOtp
            {
                UserId = user.Id,
                Code = code,
                ResetToken = resetToken,
                ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10)
            });

            await _db.SaveChangesAsync();

            var subject = "Medora - Reset Password Code\n";
            var body = $"رمز إعادة تعيين كلمة المرور هو: {code}\nالرمز صالح لمدة 10 دقائق";

            await _otpSender.SendOtpAsync(user.Email!, subject, body);

            return Ok(new { message = "OTP has been sent" });
        }

        [HttpPost("forgotPassword/verify")]
        public async Task<IActionResult> VerifyForgotPassword([FromBody] ForgotPasswordVerifyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user is null)
                return BadRequest(new { message = "Email not exists" });

            var rec = await _db.PasswordResetOtps
                .Where(x => x.UserId == user.Id && !x.IsUsed)
                .OrderByDescending(x => x.Id)
                .FirstOrDefaultAsync();

            if (rec is null)
                return BadRequest(new { message = "Invalid code" });

            if (rec.ExpiresAtUtc < DateTime.UtcNow)
                return BadRequest(new { message = "OTP expired" });

            rec.Attempts++;
            if (rec.Attempts > 5)
            {
                rec.IsUsed = true;
                await _db.SaveChangesAsync();
                return BadRequest(new { message = "Too many attempts" });
            }

            if (rec.Code != dto.Code)
            {
                await _db.SaveChangesAsync();
                return BadRequest(new { message = "Invalid code" });
            }

            await _db.SaveChangesAsync();
            return Ok(new { resetToken = rec.ResetToken });
        }

        [HttpPost("resetPassword")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user is null)
                return BadRequest(new { message = "Invalid request" });

            var rec = await _db.PasswordResetOtps
                .Where(x => x.UserId == user.Id && !x.IsUsed)
                .OrderByDescending(x => x.Id)
                .FirstOrDefaultAsync();

            if (rec is null)
                return BadRequest(new { message = "Invalid request" });

            if (rec.ExpiresAtUtc < DateTime.UtcNow)
                return BadRequest(new { message = "Reset token expired" });

            if (!string.Equals(rec.ResetToken, dto.ResetToken, StringComparison.Ordinal))
                return BadRequest(new { message = "Invalid request" });

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);

            if (!result.Succeeded)
                return BadRequest(new { message = "Failed to reset password", errors = result.Errors.Select(e => e.Description) });

            rec.IsUsed = true;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Password updated successfully" });
        }

    }
}
