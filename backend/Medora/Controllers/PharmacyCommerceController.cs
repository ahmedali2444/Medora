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

[Route("api/pharmacy")]
[ApiController]
[Authorize(Roles = "pharmacy")]
public class PharmacyCommerceController : ControllerBase
{
	private readonly AppDbContext _db;

	private readonly INotificationDispatcher _notifications;

	public PharmacyCommerceController(AppDbContext db, INotificationDispatcher notifications)
	{
		_db = db;
		_notifications = notifications;
	}

	[HttpGet("orders")]
	public async Task<IActionResult> GetOrders([FromQuery] string? status, [FromQuery] string? search, [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
	{
		PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		page = Math.Max(page, 1);
		pageSize = Math.Clamp(pageSize, 1, 100);
		IQueryable<MedicineOrder> query = from o in _db.MedicineOrders.AsNoTracking()
			where o.PharmacyId == pharmacy.Id
			select o;
		string text = status?.Trim().ToLowerInvariant();
		MedicineOrderStatus parsedStatus;
		if (text == "new")
		{
			query = query.Where((MedicineOrder o) => o.Status == MedicineOrderStatus.Pending || o.Status == MedicineOrderStatus.Accepted);
		}
		else if (!string.IsNullOrWhiteSpace(status) && TryParseUiOrderStatus(status, out parsedStatus))
		{
			query = query.Where((MedicineOrder o) => o.Status == parsedStatus);
		}
		if (!string.IsNullOrWhiteSpace(search))
		{
			string value = search.Trim().ToLowerInvariant();
			query = query.Where((MedicineOrder o) => o.OrderNumber.ToLower().Contains(value) || o.ContactName.ToLower().Contains(value) || o.ContactPhone.Contains(search.Trim()));
		}
		if (dateFrom.HasValue)
		{
			DateTime from = ClinicTimeZone.ToUtcFromClinicLocal(dateFrom.Value.Date);
			query = query.Where((MedicineOrder o) => o.CreatedAt >= from);
		}
		if (dateTo.HasValue)
		{
			DateTime toExclusive = ClinicTimeZone.ToUtcFromClinicLocal(dateTo.Value.Date.AddDays(1.0));
			query = query.Where((MedicineOrder o) => o.CreatedAt < toExclusive);
		}
			var pagedOrders = await (from o in query.OrderByDescending((MedicineOrder o) => o.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
				select new
				{
					Id = o.Id,
					OrderNumber = o.OrderNumber,
					patientName = o.ContactName,
					patientPhone = o.ContactPhone,
					status = o.Status,
					fulfillment = o.Fulfillment,
					paymentStatus = o.PaymentStatus,
					DeliveryAddress = o.DeliveryAddress,
					Notes = o.Notes,
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
				}).ToListAsync();
			var items = pagedOrders.Select(o => new
			{
					Id = o.Id,
					OrderNumber = o.OrderNumber,
					patientName = o.patientName,
					patientPhone = o.patientPhone,
					status = o.status.ToString(),
					fulfillment = o.fulfillment.ToString(),
					paymentStatus = o.paymentStatus.ToString(),
					DeliveryAddress = o.DeliveryAddress,
					Notes = o.Notes,
					Subtotal = o.Subtotal,
					DeliveryFee = o.DeliveryFee,
					Total = o.Total,
					CreatedAt = o.CreatedAt,
					DeliveredAt = o.DeliveredAt,
					items = o.items
			});
		return Ok(new
		{
			page = page,
			pageSize = pageSize,
			total = await query.CountAsync(),
			items = items
		});
	}

	[HttpGet("orders/{id:int}")]
	public async Task<IActionResult> GetOrderById(int id)
	{
		PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		MedicineOrder medicineOrder = await _db.MedicineOrders.AsNoTracking().Include((MedicineOrder o) => o.Items).ThenInclude((MedicineOrderItem i) => i.Medicine)
			.Include((MedicineOrder o) => o.DeliveryTask)
			.Include((MedicineOrder o) => o.Prescription)
			.FirstOrDefaultAsync((MedicineOrder o) => o.Id == id && o.PharmacyId == pharmacy.Id);
		if (medicineOrder == null)
		{
			return NotFound(new
			{
				message = "Order not found"
			});
		}
		return Ok(new
		{
			Id = medicineOrder.Id,
			OrderNumber = medicineOrder.OrderNumber,
			patientName = medicineOrder.ContactName,
			patientPhone = medicineOrder.ContactPhone,
			status = medicineOrder.Status.ToString(),
			fulfillment = medicineOrder.Fulfillment.ToString(),
			paymentStatus = medicineOrder.PaymentStatus.ToString(),
			DeliveryAddress = medicineOrder.DeliveryAddress,
			Notes = medicineOrder.Notes,
			Subtotal = medicineOrder.Subtotal,
			DeliveryFee = medicineOrder.DeliveryFee,
			Total = medicineOrder.Total,
			CreatedAt = medicineOrder.CreatedAt,
			DeliveredAt = medicineOrder.DeliveredAt,
			prescription = ((medicineOrder.Prescription != null) ? new
			{
				Id = medicineOrder.Prescription.Id,
				Diagnosis = medicineOrder.Prescription.Diagnosis,
				Notes = medicineOrder.Prescription.Notes,
				status = medicineOrder.Prescription.Status.ToString()
			} : null),
			deliveryTask = ((medicineOrder.DeliveryTask != null) ? new
			{
				status = medicineOrder.DeliveryTask.Status.ToString(),
				CourierName = medicineOrder.DeliveryTask.CourierName,
				CourierPhone = medicineOrder.DeliveryTask.CourierPhone,
				EtaMinutes = medicineOrder.DeliveryTask.EtaMinutes
			} : null),
			items = medicineOrder.Items.Select((MedicineOrderItem i) => new
			{
				i.MedicineId,
				i.Medicine.Name,
				i.Medicine.ImageUrl,
				i.Medicine.Form,
				i.Quantity,
				i.UnitPrice,
				i.LineTotal
			})
		});
	}

	[HttpGet("customers")]
	public async Task<IActionResult> GetCustomers([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
	{
		try
		{
			PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
			if (pharmacy == null)
			{
				return NotFound(new
				{
					message = "Pharmacy profile not found"
				});
			}
			page = Math.Max(page, 1);
			pageSize = Math.Clamp(pageSize, 1, 100);
			IQueryable<MedicineOrder> source = from o in _db.MedicineOrders.AsNoTracking()
				where o.PharmacyId == pharmacy.Id
				select o;
			if (!string.IsNullOrWhiteSpace(search))
			{
				string value = search.Trim().ToLowerInvariant();
				source = source.Where((MedicineOrder o) => o.ContactName.ToLower().Contains(value) || o.ContactPhone.Contains(search.Trim()));
			}
			var grouped = from o in source
				group o by new { o.ContactPhone, o.ContactName } into g
				select new
				{
					id = g.Key.ContactPhone,
					name = g.Key.ContactName,
					phone = g.Key.ContactPhone,
					orders = g.Count(),
					totalSpent = g.Sum(o => o.Total),
					lastOrder = g.Max(o => o.CreatedAt)
				};
			int total = await grouped.CountAsync();
			var items = await grouped.OrderByDescending(c => c.totalSpent).Skip((page - 1) * pageSize).Take(pageSize)
				.ToListAsync();
			return Ok(new { page, pageSize, total, items });
		}
		catch (Exception)
		{
			return StatusCode(500, new
			{
				message = "Error loading customers."
			});
		}
	}

	[HttpPut("orders/{id:int}/status")]
	public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
	{
		if (!base.ModelState.IsValid)
		{
			return BadRequest(base.ModelState);
		}
		PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		if (!OrderWorkflow.TryParseOrderStatus(dto.Status, out var next))
		{
			return BadRequest(new
			{
				message = "Invalid order status"
			});
		}
		MedicineOrder order = await _db.MedicineOrders.Include((MedicineOrder o) => o.DeliveryTask).Include((MedicineOrder o) => o.Items).Include((MedicineOrder o) => o.Prescription)
			.FirstOrDefaultAsync((MedicineOrder o) => o.Id == id && o.PharmacyId == pharmacy.Id);
		if (order == null)
		{
			return NotFound(new
			{
				message = "Order not found"
			});
		}
		if (!OrderWorkflow.CanTransition(order.Status, next, order.Fulfillment))
		{
			return BadRequest(new
			{
				message = "Order status cannot be changed to the requested status"
			});
		}
		List<int> medicineIds = order.Items.Select((MedicineOrderItem i) => i.MedicineId).ToList();
		Dictionary<int, PharmacyMedicine> stockRecords = await _db.PharmacyMedicines.Where((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && medicineIds.Contains(pm.MedicineId)).ToDictionaryAsync((PharmacyMedicine pm) => pm.MedicineId);
		Dictionary<int, int> dictionary = ((!order.PrescriptionId.HasValue) ? new Dictionary<int, int>() : (await OrderQueryHelper.GetDeliveredPrescriptionQuantitiesAsync(_db, order.PrescriptionId.Value, order.Id)));
		Dictionary<int, int> alreadyDeliveredQuantities = dictionary;
		OrderWorkflow.ApplyOrderStatus(order, next, stockRecords, alreadyDeliveredQuantities);
		if (next == MedicineOrderStatus.Accepted && order.Prescription != null && order.Prescription.Status == PrescriptionStatus.Reviewing && OrderWorkflow.CanTransition(order.Prescription.Status, PrescriptionStatus.Approved))
		{
			order.Prescription.Status = PrescriptionStatus.Approved;
			order.Prescription.UpdatedAt = DateTime.UtcNow;
		}
		Notification patientNotification = await _notifications.CreateForUserAsync(order.PatientUserId, "order", (string lang) => NotificationMessages.OrderStatusUpdatedForPatient(order.OrderNumber, NotificationMessages.OrderStatusLabel(next, lang), lang));
		_db.Notifications.Add(patientNotification);
		await _db.SaveChangesAsync();
		await _notifications.PublishAsync(patientNotification);
		return Ok(new
		{
			message = "Order status updated successfully"
		});
	}

	[HttpGet("delivery")]
	public async Task<IActionResult> GetDelivery()
	{
		PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
		if (pharmacy == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		var dbTasks = await (from d in _db.DeliveryTasks.AsNoTracking()
			where d.PharmacyId == pharmacy.Id && d.MedicineOrder.Status != MedicineOrderStatus.Delivered && d.MedicineOrder.Status != MedicineOrderStatus.Cancelled
			orderby d.CreatedAt descending
			select new
			{
				Id = d.Id,
				orderId = d.MedicineOrderId,
				orderNumber = d.MedicineOrder.OrderNumber,
				customer = d.MedicineOrder.ContactName,
				phone = d.MedicineOrder.ContactPhone,
				address = d.MedicineOrder.DeliveryAddress,
				orderStatus = d.MedicineOrder.Status,
				status = d.Status,
				CourierName = d.CourierName,
				CourierPhone = d.CourierPhone,
				DistanceKm = d.DistanceKm,
				EtaMinutes = d.EtaMinutes,
				CreatedAt = d.CreatedAt
			}).ToListAsync();
		var value = dbTasks.Select(d => new
		{
			Id = d.Id,
			orderId = d.orderId,
			orderNumber = d.orderNumber,
			customer = d.customer,
			phone = d.phone,
			address = d.address,
			orderStatus = d.orderStatus.ToString(),
			status = d.status.ToString(),
			CourierName = d.CourierName,
			CourierPhone = d.CourierPhone,
			courierId = ComputeCourierId(d.CourierName, d.CourierPhone),
			DistanceKm = d.DistanceKm,
			EtaMinutes = d.EtaMinutes,
			CreatedAt = d.CreatedAt
		}).ToList();
		return Ok(value);
	}

	private static string? ComputeCourierId(string? name, string? phone)
	{
		if (string.IsNullOrWhiteSpace(name))
		{
			return null;
		}
		string s = name.Trim().ToLowerInvariant() + "|" + (phone ?? string.Empty).Trim();
		byte[] inArray = SHA256.HashData(Encoding.UTF8.GetBytes(s));
		return Convert.ToHexString(inArray).Substring(0, 16).ToLowerInvariant();
	}

	[HttpGet("inventory/lookup-barcode")]
	public async Task<IActionResult> LookupBarcode([FromQuery] string barcode)
	{
		if (string.IsNullOrWhiteSpace(barcode))
		{
			return BadRequest(new
			{
				message = "Barcode is required"
			});
		}
		if (await GetCurrentPharmacyAsync() == null)
		{
			return NotFound(new
			{
				message = "Pharmacy profile not found"
			});
		}
		Medicine medicine = await _db.Medicines.AsNoTracking().FirstOrDefaultAsync((Medicine m) => m.Barcode == barcode);
		if (medicine == null)
		{
			return NotFound(new
			{
				message = "Medicine not found in global catalog"
			});
		}
		return Ok(new { medicine.Id, medicine.Name, medicine.ActiveIngredient, medicine.Category, medicine.ImageUrl });
	}

	[HttpPost("inventory/medicine/add")]
	public async Task<IActionResult> AddMedicine([FromBody] AddMedicineBarcodeDto dto)
	{
		try
		{
			if (!base.ModelState.IsValid)
			{
				return BadRequest(base.ModelState);
			}
			PharmacyProfile pharmacy = await GetCurrentPharmacyAsync();
			if (pharmacy == null)
			{
				return NotFound(new
				{
					message = "Pharmacy profile not found"
				});
			}
			Medicine medicine = await _db.Medicines.FirstOrDefaultAsync((Medicine m) => m.Barcode == dto.Barcode);
			if (medicine == null)
			{
				return NotFound(new
				{
					message = "Medicine not found in catalog. Contact an administrator to add this barcode."
				});
			}
			string imageUrl = ((!string.IsNullOrWhiteSpace(dto.ImageUrl)) ? dto.ImageUrl.Trim() : null);
			PharmacyMedicine pharmacyMedicine = await _db.PharmacyMedicines.FirstOrDefaultAsync((PharmacyMedicine pm) => pm.PharmacyId == pharmacy.Id && pm.MedicineId == medicine.Id);
			if (pharmacyMedicine == null)
			{
				pharmacyMedicine = new PharmacyMedicine
				{
					PharmacyId = pharmacy.Id,
					MedicineId = medicine.Id,
					Price = dto.Price,
					Quantity = dto.Quantity,
					IsAvailable = (dto.Quantity > 0),
					ReorderLevel = 5,
					ImageUrl = imageUrl,
					LastUpdatedAt = DateTime.UtcNow
				};
				_db.PharmacyMedicines.Add(pharmacyMedicine);
			}
			else
			{
				pharmacyMedicine.Price = dto.Price;
				pharmacyMedicine.Quantity = dto.Quantity;
				pharmacyMedicine.IsAvailable = dto.Quantity > 0;
				if (imageUrl != null)
				{
					pharmacyMedicine.ImageUrl = imageUrl;
				}
				pharmacyMedicine.LastUpdatedAt = DateTime.UtcNow;
			}
			if (dto.Batches != null && dto.Batches.Any())
			{
				foreach(var b in dto.Batches)
				{
					_db.PharmacyMedicineBatches.Add(new PharmacyMedicineBatch
					{
						PharmacyMedicine = pharmacyMedicine,
						BatchNumber = b.BatchNumber,
						ExpiryDate = b.ExpiryDate,
						Quantity = b.Quantity,
						CreatedAt = DateTime.UtcNow
					});
				}
			}
			await _db.SaveChangesAsync();
			return Ok(new
			{
				message = "Medicine added successfully",
				medicineId = medicine.Id
			});
		}
		catch (Exception)
		{
			return StatusCode(500, new
			{
				message = "Error adding medicine."
			});
		}
	}

	private async Task<PharmacyProfile?> GetCurrentPharmacyAsync()
	{
		string userId = base.User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");
		return await _db.PharmacyProfiles.FirstOrDefaultAsync((PharmacyProfile p) => p.UserId == userId);
	}

	private static bool TryParseUiOrderStatus(string value, out MedicineOrderStatus status)
	{
		status = MedicineOrderStatus.Pending;
		string text = value.Trim().ToLowerInvariant();
		status = text switch
		{
			"new" => MedicineOrderStatus.Pending, 
			"ready" => MedicineOrderStatus.ReadyForPickup, 
			"shipping" => MedicineOrderStatus.OutForDelivery, 
			_ => status, 
		};
		bool flag;
		switch (text)
		{
		case "new":
		case "ready":
		case "shipping":
			flag = true;
			break;
		default:
			flag = false;
			break;
		}
		if (!flag)
		{
			return Enum.TryParse<MedicineOrderStatus>(value.Trim(), ignoreCase: true, out status);
		}
		return true;
	}
}
