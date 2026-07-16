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

[Route("api/reviews")]
[ApiController]
public class ReviewsController : ControllerBase
{
	private readonly AppDbContext _db;

	private readonly IPlatformSettingsStore _settingsStore;

	public ReviewsController(AppDbContext db, IPlatformSettingsStore settingsStore)
	{
		_db = db;
		_settingsStore = settingsStore;
	}

	[Authorize]
	[HttpPost]
	public async Task<IActionResult> Create([FromBody] CreateReviewDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		PlatformFeaturesSettingsDto? features = (await _settingsStore.GetAsync()).Features;
		if (features != null && !features.Reviews)
		{
			return BadRequest(new
			{
				message = "Reviews are currently disabled"
			});
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (userId == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		switch (dto.TargetType.Trim().ToLowerInvariant())
		{
		case "doctor":
		{
			if (!dto.DoctorId.HasValue || dto.PharmacyId.HasValue)
			{
				return BadRequest(new
				{
					message = "DoctorId is required for doctor reviews"
				});
			}
			if (!(await _db.DoctorProfiles.AnyAsync((DoctorProfile d) => d.Id == dto.DoctorId.Value && d.IsActive)))
			{
				return NotFound(new
				{
					message = "Doctor not found"
				});
			}
			Appointment completedAppointment;
			if (dto.AppointmentId.HasValue)
			{
				completedAppointment = await _db.Appointments.FirstOrDefaultAsync((Appointment a) => a.Id == dto.AppointmentId.Value && a.PatientUserId == userId && a.DoctorId == dto.DoctorId.Value);
				if (completedAppointment == null)
				{
					return NotFound(new
					{
						message = "Appointment not found"
					});
				}
				if (!ReviewEligibilityRules.CanReviewDoctor(completedAppointment.Status))
				{
					return BadRequest(new
					{
						message = "You can review a doctor only after a completed appointment"
					});
				}
				if (await _db.Reviews.AnyAsync((Review r) => r.AppointmentId == (int?)completedAppointment.Id && !r.IsDeleted))
				{
					return Conflict(new
					{
						message = "You already reviewed this appointment"
					});
				}
			}
			else
			{
				completedAppointment = await (from a in _db.Appointments
					where a.PatientUserId == userId && a.DoctorId == dto.DoctorId.Value && a.Status == AppointmentStatus.Completed
					where !_db.Reviews.Any((Review r) => r.AppointmentId == (int?)a.Id && !r.IsDeleted)
					orderby a.ScheduledAt descending
					select a).FirstOrDefaultAsync();
				if (!ReviewEligibilityRules.CanReviewDoctor(completedAppointment?.Status))
				{
					return BadRequest(new
					{
						message = "You can review a doctor only after a completed appointment"
					});
				}
			}
			Review review = new Review
			{
				ReviewerUserId = userId,
				TargetType = ReviewTargetType.Doctor,
				DoctorId = dto.DoctorId.Value,
				AppointmentId = completedAppointment.Id,
				Rating = (byte)dto.Rating,
				Comment = dto.Comment?.Trim(),
				CreatedAt = DateTime.UtcNow
			};
			_db.Reviews.Add(review);
			await _db.SaveChangesAsync();
			return Ok(new
			{
				message = "Review added successfully",
				reviewId = review.Id
			});
		}
		case "pharmacy":
		{
			if (!dto.PharmacyId.HasValue || dto.DoctorId.HasValue)
			{
				return BadRequest(new
				{
					message = "PharmacyId is required for pharmacy reviews"
				});
			}
			if (!(await _db.PharmacyProfiles.AnyAsync((PharmacyProfile p) => p.Id == dto.PharmacyId.Value && p.IsActive)))
			{
				return NotFound(new
				{
					message = "Pharmacy not found"
				});
			}
			MedicineOrder deliveredOrder2;
			if (dto.MedicineOrderId.HasValue)
			{
				deliveredOrder2 = await _db.MedicineOrders.FirstOrDefaultAsync((MedicineOrder o) => o.Id == dto.MedicineOrderId.Value && o.PatientUserId == userId && o.PharmacyId == dto.PharmacyId.Value);
				if (deliveredOrder2 == null)
				{
					return NotFound(new
					{
						message = "Order not found"
					});
				}
				if (!ReviewEligibilityRules.CanReviewPharmacy(deliveredOrder2.Status))
				{
					return BadRequest(new
					{
						message = "You can review a pharmacy only after a delivered order"
					});
				}
				if (await _db.Reviews.AnyAsync((Review r) => r.MedicineOrderId == (int?)deliveredOrder2.Id && r.TargetType == ReviewTargetType.Pharmacy && !r.IsDeleted))
				{
					return Conflict(new
					{
						message = "You already reviewed this order"
					});
				}
			}
			else
			{
				deliveredOrder2 = await (from o in _db.MedicineOrders
					where o.PatientUserId == userId && o.PharmacyId == dto.PharmacyId.Value && o.Status == MedicineOrderStatus.Delivered
					where !_db.Reviews.Any((Review r) => r.MedicineOrderId == (int?)o.Id && r.TargetType == ReviewTargetType.Pharmacy && !r.IsDeleted)
					orderby o.DeliveredAt ?? o.UpdatedAt descending
					select o).FirstOrDefaultAsync();
				if (!ReviewEligibilityRules.CanReviewPharmacy(deliveredOrder2?.Status))
				{
					return BadRequest(new
					{
						message = "You can review a pharmacy only after a delivered order"
					});
				}
			}
			Review review = new Review
			{
				ReviewerUserId = userId,
				TargetType = ReviewTargetType.Pharmacy,
				PharmacyId = dto.PharmacyId.Value,
				MedicineOrderId = deliveredOrder2.Id,
				Rating = (byte)dto.Rating,
				Comment = dto.Comment?.Trim(),
				CreatedAt = DateTime.UtcNow
			};
			_db.Reviews.Add(review);
			await _db.SaveChangesAsync();
			return Ok(new
			{
				message = "Review added successfully",
				reviewId = review.Id
			});
		}
		case "medicine":
		{
			if (!dto.MedicineId.HasValue || !dto.MedicineOrderId.HasValue)
			{
				return BadRequest(new
				{
					message = "MedicineId and MedicineOrderId are required for medicine reviews"
				});
			}
			if (dto.DoctorId.HasValue || dto.PharmacyId.HasValue)
			{
				return BadRequest(new
				{
					message = "DoctorId and PharmacyId must not be set for medicine reviews"
				});
			}
			if (!(await _db.Medicines.AnyAsync((Medicine m) => m.Id == dto.MedicineId.Value && !m.IsArchived)))
			{
				return NotFound(new
				{
					message = "Medicine not found"
				});
			}
			MedicineOrder deliveredOrder = await _db.MedicineOrders.Include((MedicineOrder o) => o.Items).FirstOrDefaultAsync((MedicineOrder o) => o.Id == dto.MedicineOrderId.Value && o.PatientUserId == userId);
			if (deliveredOrder == null)
			{
				return NotFound(new
				{
					message = "Order not found"
				});
			}
			if (!ReviewEligibilityRules.CanReviewMedicine(deliveredOrder.Status))
			{
				return BadRequest(new
				{
					message = "You can review a medicine only after a delivered order"
				});
			}
			if (!deliveredOrder.Items.Any((MedicineOrderItem i) => i.MedicineId == dto.MedicineId.Value))
			{
				return BadRequest(new
				{
					message = "This medicine was not part of the order"
				});
			}
			if (await _db.Reviews.AnyAsync((Review r) => r.MedicineOrderId == (int?)deliveredOrder.Id && r.MedicineId == (int?)dto.MedicineId.Value && r.TargetType == ReviewTargetType.Medicine && !r.IsDeleted))
			{
				return Conflict(new
				{
					message = "You already reviewed this medicine for this order"
				});
			}
			Review review = new Review
			{
				ReviewerUserId = userId,
				TargetType = ReviewTargetType.Medicine,
				MedicineId = dto.MedicineId.Value,
				MedicineOrderId = deliveredOrder.Id,
				Rating = (byte)dto.Rating,
				Comment = dto.Comment?.Trim(),
				CreatedAt = DateTime.UtcNow
			};
			_db.Reviews.Add(review);
			await _db.SaveChangesAsync();
			return Ok(new
			{
				message = "Review added successfully",
				reviewId = review.Id
			});
		}
		default:
			return BadRequest(new
			{
				message = "TargetType must be doctor, pharmacy, or medicine"
			});
		}
	}

	[HttpGet("doctor/{doctorId:int}")]
	public async Task<IActionResult> GetDoctorReviews(int doctorId)
	{
		PlatformFeaturesSettingsDto? features = (await _settingsStore.GetAsync()).Features;
		if (features != null && !features.Reviews)
		{
			return Ok(Array.Empty<PublicReviewItemDto>());
		}
		if (!(await _db.DoctorProfiles.AnyAsync((DoctorProfile d) => d.Id == doctorId && d.IsActive)))
		{
			return NotFound(new
			{
				message = "Doctor not found"
			});
		}
		return Ok(await (from r in _db.Reviews.AsNoTracking()
			where r.TargetType == ReviewTargetType.Doctor && r.DoctorId == (int?)doctorId && r.Verified && !r.IsHidden && !r.IsDeleted
			orderby r.CreatedAt descending
			select new PublicReviewItemDto
			{
				Id = r.Id,
				ReviewerName = r.Reviewer.FullName,
				Rating = r.Rating,
				Comment = r.Comment,
				Reply = r.Reply,
				ReplyCreatedAt = r.ReplyCreatedAt,
				CreatedAt = r.CreatedAt
			}).ToListAsync());
	}

	[HttpGet("pharmacy/{pharmacyId:int}")]
	public async Task<IActionResult> GetPharmacyReviews(int pharmacyId)
	{
		PlatformFeaturesSettingsDto? features = (await _settingsStore.GetAsync()).Features;
		if (features != null && !features.Reviews)
		{
			return Ok(Array.Empty<PublicReviewItemDto>());
		}
		if (!(await _db.PharmacyProfiles.AnyAsync((PharmacyProfile p) => p.Id == pharmacyId && p.IsActive)))
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		return Ok(await (from r in _db.Reviews.AsNoTracking()
			where r.TargetType == ReviewTargetType.Pharmacy && r.PharmacyId == (int?)pharmacyId && r.Verified && !r.IsHidden && !r.IsDeleted
			orderby r.CreatedAt descending
			select new PublicReviewItemDto
			{
				Id = r.Id,
				ReviewerName = r.Reviewer.FullName,
				Rating = r.Rating,
				Comment = r.Comment,
				Reply = r.Reply,
				ReplyCreatedAt = r.ReplyCreatedAt,
				CreatedAt = r.CreatedAt
			}).ToListAsync());
	}

	[HttpGet("medicine/{medicineId:int}")]
	public async Task<IActionResult> GetMedicineReviews(int medicineId)
	{
		PlatformFeaturesSettingsDto? features = (await _settingsStore.GetAsync()).Features;
		if (features != null && !features.Reviews)
		{
			return Ok(Array.Empty<PublicReviewItemDto>());
		}
		if (!(await _db.Medicines.AnyAsync((Medicine m) => m.Id == medicineId && !m.IsArchived)))
		{
			return NotFound(new
			{
				message = "Medicine not found"
			});
		}
		return Ok(await (from r in _db.Reviews.AsNoTracking()
			where r.TargetType == ReviewTargetType.Medicine && r.MedicineId == (int?)medicineId && r.Verified && !r.IsHidden && !r.IsDeleted
			orderby r.CreatedAt descending
			select new PublicReviewItemDto
			{
				Id = r.Id,
				ReviewerName = r.Reviewer.FullName,
				Rating = r.Rating,
				Comment = r.Comment,
				Reply = r.Reply,
				ReplyCreatedAt = r.ReplyCreatedAt,
				CreatedAt = r.CreatedAt
			}).ToListAsync());
	}

	[Authorize]
	[HttpDelete("{id:int}")]
	public async Task<IActionResult> Delete(int id)
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (userId == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		Review review = await _db.Reviews.FirstOrDefaultAsync((Review r) => r.Id == id && r.ReviewerUserId == userId && !r.IsDeleted);
		if (review == null)
		{
			return NotFound(new
			{
				message = "Review not found"
			});
		}
		review.IsDeleted = true;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Review deleted successfully"
		});
	}

	[Authorize(Roles = "doctor,pharmacy")]
	[HttpPost("{id:int}/reply")]
	public async Task<IActionResult> Reply(int id, [FromBody] ReplyToReviewDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (userId == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		Review review = await _db.Reviews.Include((Review r) => r.Doctor).Include((Review r) => r.Pharmacy).FirstOrDefaultAsync((Review r) => r.Id == id && !r.IsDeleted);
		if (review == null)
		{
			return NotFound(new
			{
				message = "Review not found"
			});
		}
		if (review.TargetType == ReviewTargetType.Doctor)
		{
			if (review.Doctor?.UserId != userId)
			{
				return Forbid();
			}
		}
		else if (review.TargetType == ReviewTargetType.Pharmacy && review.Pharmacy?.UserId != userId)
		{
			return Forbid();
		}
		if (review.Reply != null)
		{
			return Conflict(new
			{
				message = "A reply already exists for this review. Replies cannot be overwritten."
			});
		}
		review.Reply = dto.Reply.Trim();
		review.ReplyCreatedAt = DateTime.UtcNow;
		await _db.SaveChangesAsync();
		return Ok(new
		{
			message = "Reply added successfully"
		});
	}
}
