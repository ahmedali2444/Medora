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

[Route("api/orders")]
[ApiController]
[Authorize]
public class OrdersController : ControllerBase
{
	private readonly AppDbContext _db;

	private readonly IPlatformSettingsStore _settingsStore;

	private readonly INotificationDispatcher _notifications;

	public OrdersController(AppDbContext db, IPlatformSettingsStore settingsStore, INotificationDispatcher notifications)
	{
		_db = db;
		_settingsStore = settingsStore;
		_notifications = notifications;
	}

	[AllowAnonymous]
	[HttpGet("checkout-config")]
	public async Task<IActionResult> GetCheckoutConfig()
	{
		PlatformSettingsDto platformSettingsDto = await _settingsStore.GetAsync();
		return Ok(new
		{
			deliveryFee = (platformSettingsDto.Billing?.DeliveryFee ?? 15m),
			deliveryEnabled = (platformSettingsDto.Features?.Delivery ?? true)
		});
	}

	[HttpPost("checkout")]
	public async Task<IActionResult> Checkout([FromBody] CheckoutOrderDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		if (dto.Items.Count == 0)
		{
			return BadRequest(new
			{
				message = "At least one medicine is required"
			});
		}
		if (!TryParseFulfillment(dto.Fulfillment, out var fulfillment))
		{
			return BadRequest(new
			{
				message = "Fulfillment must be delivery or pickup"
			});
		}
		if (fulfillment == MedicineOrderFulfillment.Delivery && string.IsNullOrWhiteSpace(dto.DeliveryAddress))
		{
			return BadRequest(new
			{
				message = "DeliveryAddress is required for delivery orders"
			});
		}
		PlatformSettingsDto settings = await _settingsStore.GetAsync();
		if (fulfillment == MedicineOrderFulfillment.Delivery)
		{
			PlatformFeaturesSettingsDto? features = settings.Features;
			if (features != null && !features.Delivery)
			{
				return BadRequest(new
				{
					message = "Medicine delivery is currently disabled"
				});
			}
		}
		string patientUserId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		if (patientUserId == null)
		{
			return Unauthorized(new
			{
				message = "Invalid token"
			});
		}
		PharmacyProfile pharmacy = await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.Id == dto.PharmacyId && p.IsActive);
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy not found"
			});
		}
		if (string.Equals(pharmacy.Status, "closed", StringComparison.OrdinalIgnoreCase))
		{
			return BadRequest(new
			{
				message = "Pharmacy is currently closed"
			});
		}
		Prescription prescription = null;
		if (dto.PrescriptionId.HasValue)
		{
			prescription = await _db.Prescriptions.Include((Prescription p) => p.Items).FirstOrDefaultAsync((Prescription p) => p.Id == dto.PrescriptionId.Value && p.PatientUserId == patientUserId);
			if (prescription == null)
			{
				return BadRequest(new
				{
					message = "Prescription not found for this patient"
				});
			}
			if (prescription.Status == PrescriptionStatus.Rejected)
			{
				return BadRequest(new
				{
					message = "Rejected prescriptions cannot be used for checkout"
				});
			}
			if (prescription.Status == PrescriptionStatus.Fulfilled)
			{
				return BadRequest(new
				{
					message = "This prescription has already been fulfilled"
				});
			}
			if (prescription.PharmacyId.HasValue && prescription.PharmacyId != dto.PharmacyId)
			{
				return BadRequest(new
				{
					message = "This prescription has already been used at another pharmacy"
				});
			}
		}
		Dictionary<int, int> requested = (from i in dto.Items
			group i by i.MedicineId).ToDictionary((IGrouping<int, CheckoutOrderItemDto> g) => g.Key, (IGrouping<int, CheckoutOrderItemDto> g) => g.Sum((CheckoutOrderItemDto i) => i.Quantity));
		if (prescription != null)
		{
			Dictionary<int, int> alreadyDeliveredQuantities = await OrderQueryHelper.GetDeliveredPrescriptionQuantitiesAsync(_db, prescription.Id);
			if (!OrderWorkflow.PrescriptionItemsWithinRemaining(prescription.Items, alreadyDeliveredQuantities, requested))
			{
				return BadRequest(new
				{
					message = "Requested quantities exceed the remaining prescription allowance"
				});
			}
		}
		List<PharmacyMedicine> pharmacyMedicines = await (from pm in _db.PharmacyMedicines.Include((PharmacyMedicine pm) => pm.Medicine).Include((PharmacyMedicine pm) => pm.Batches)
			where pm.PharmacyId == dto.PharmacyId && requested.Keys.Contains(pm.MedicineId) && !pm.Medicine.IsArchived
			select pm).ToListAsync();
		if (pharmacyMedicines.Count != requested.Count)
		{
			return BadRequest(new
			{
				message = "One or more medicines are not available in this pharmacy"
			});
		}
		foreach (PharmacyMedicine item in pharmacyMedicines)
		{
			if (!item.IsAvailable || !item.Price.HasValue)
			{
				return BadRequest(new
				{
					message = item.Medicine.Name + " is not available for checkout"
				});
			}
			if (item.Quantity.HasValue && item.Quantity.Value < requested[item.MedicineId])
			{
				return BadRequest(new
				{
					message = item.Medicine.Name + " does not have enough stock"
				});
			}
		}
		decimal num = ((fulfillment != MedicineOrderFulfillment.Delivery) ? 0m : (settings.Billing?.DeliveryFee ?? 15m));
		decimal num2 = pharmacyMedicines.Sum((PharmacyMedicine pm) => pm.Price.Value * (decimal)requested[pm.MedicineId]);
		MedicineOrder order = new MedicineOrder
		{
			OrderNumber = GenerateOrderNumber(),
			PatientUserId = patientUserId,
			PharmacyId = pharmacy.Id,
			PrescriptionId = prescription?.Id,
			Fulfillment = fulfillment,
			ContactName = dto.ContactName.Trim(),
			ContactPhone = dto.ContactPhone.Trim(),
			DeliveryAddress = dto.DeliveryAddress?.Trim(),
			Notes = dto.Notes?.Trim(),
			Subtotal = num2,
			DeliveryFee = num,
			Total = num2 + num,
			CreatedAt = DateTime.UtcNow,
			UpdatedAt = DateTime.UtcNow
		};
		foreach (PharmacyMedicine item2 in pharmacyMedicines)
		{
			int num3 = requested[item2.MedicineId];
			order.Items.Add(new MedicineOrderItem
			{
				MedicineId = item2.MedicineId,
				Quantity = num3,
				UnitPrice = item2.Price.Value,
				LineTotal = item2.Price.Value * (decimal)num3
			});
		}
		if (fulfillment == MedicineOrderFulfillment.Delivery)
		{
			order.DeliveryTask = new DeliveryTask
			{
				PharmacyId = pharmacy.Id,
				Status = DeliveryTaskStatus.Pending,
				CreatedAt = DateTime.UtcNow,
				UpdatedAt = DateTime.UtcNow
			};
		}
		IActionResult result;
		await using (IDbContextTransaction tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable))
		{
			try
			{
				if (prescription == null || !(await _db.MedicineOrders.AnyAsync((MedicineOrder o) => o.PrescriptionId == (int?)prescription.Id && o.Status != MedicineOrderStatus.Cancelled && o.Status != MedicineOrderStatus.Delivered)))
				{
					foreach (PharmacyMedicine record in pharmacyMedicines)
					{
						if (!record.Quantity.HasValue)
						{
							continue;
						}
						int num4 = requested[record.MedicineId];
						if (record.Quantity.Value >= num4)
						{
							record.Quantity -= num4;
							if (record.Quantity <= 0)
							{
								record.IsAvailable = false;
							}
							if (record.Batches != null && record.Batches.Any())
							{
								int remainingToDeduct = num4;
								var sortedBatches = record.Batches
									.Where(b => b.Quantity > 0)
									.OrderBy(b => b.ExpiryDate ?? DateTime.MaxValue)
									.ThenBy(b => b.CreatedAt)
									.ToList();
								foreach (var batch in sortedBatches)
								{
									if (remainingToDeduct <= 0) break;
									if (batch.Quantity >= remainingToDeduct)
									{
										batch.Quantity -= remainingToDeduct;
										remainingToDeduct = 0;
									}
									else
									{
										remainingToDeduct -= batch.Quantity;
										batch.Quantity = 0;
									}
								}
							}
							continue;
						}
						await tx.RollbackAsync();
						result = BadRequest(new
						{
							message = record.Medicine.Name + " stock changed during checkout. Please retry."
						});
						goto end_IL_0e15;
					}
					if (prescription != null)
					{
						prescription.PharmacyId = pharmacy.Id;
						if (prescription.Status == PrescriptionStatus.New)
						{
							prescription.Status = PrescriptionStatus.Reviewing;
						}
						prescription.UpdatedAt = DateTime.UtcNow;
					}
					_db.MedicineOrders.Add(order);
					Notification pharmacyNotification = await _notifications.CreateForUserAsync(pharmacy.UserId, "order", (string lang) => NotificationMessages.OrderCreatedForPharmacy(order.OrderNumber, lang));
					Notification patientNotification = await _notifications.CreateForUserAsync(patientUserId, "order", (string lang) => NotificationMessages.OrderCreatedForPatient(order.OrderNumber, lang));
					_db.Notifications.Add(pharmacyNotification);
					_db.Notifications.Add(patientNotification);
					await _db.SaveChangesAsync();
					await tx.CommitAsync();
					await _notifications.PublishAsync(pharmacyNotification);
					await _notifications.PublishAsync(patientNotification);
					goto IL_165c;
				}
				await tx.RollbackAsync();
				result = BadRequest(new
				{
					message = "An active order already exists for this prescription"
				});
				end_IL_0e15:;
			}
			catch
			{
				await tx.RollbackAsync();
				throw;
			}
			goto end_IL_0de1;
			IL_165c:
			result = Ok(new
			{
				message = "Order created successfully",
				orderId = order.Id,
				orderNumber = order.OrderNumber,
				total = order.Total
			});
			end_IL_0de1:;
		}
		return result;
	}

	[HttpGet]
	[HttpGet("me")]
	public async Task<IActionResult> GetMine([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
	{
		string patientUserId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 100);
		IQueryable<MedicineOrder> query = from o in _db.MedicineOrders.AsNoTracking()
			where o.PatientUserId == patientUserId
			select o;
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			items = await (from o in query.OrderByDescending((MedicineOrder o) => o.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = o.Id,
					OrderNumber = o.OrderNumber,
					pharmacyId = o.PharmacyId,
					pharmacyName = o.Pharmacy.PharmacyName,
					status = o.Status.ToString(),
					fulfillment = o.Fulfillment.ToString(),
					paymentStatus = o.PaymentStatus.ToString(),
					Subtotal = o.Subtotal,
					DeliveryFee = o.DeliveryFee,
					Total = o.Total,
					CreatedAt = o.CreatedAt,
					DeliveredAt = o.DeliveredAt,
					items = o.Items.Select((MedicineOrderItem i) => new
					{
						i.MedicineId,
						i.Medicine.Name,
						i.Quantity,
						i.UnitPrice,
						i.LineTotal
					})
				}).ToListAsync()
		});
	}

	private static bool TryParseFulfillment(string value, out MedicineOrderFulfillment fulfillment)
	{
		fulfillment = MedicineOrderFulfillment.Delivery;
		string text = value.Trim().ToLowerInvariant();
		if (text == "delivery")
		{
			fulfillment = MedicineOrderFulfillment.Delivery;
			return true;
		}
		if (text == "pickup")
		{
			fulfillment = MedicineOrderFulfillment.Pickup;
			return true;
		}
		return false;
	}

	private static string GenerateOrderNumber()
	{
		int @int = RandomNumberGenerator.GetInt32(1000, 10000);
		return $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}-{@int}";
	}
}
