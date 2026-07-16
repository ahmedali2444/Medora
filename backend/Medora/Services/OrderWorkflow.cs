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

public static class OrderWorkflow
{
	public static bool TryParseOrderStatus(string? value, out MedicineOrderStatus status)
	{
		status = MedicineOrderStatus.Pending;
		if (!string.IsNullOrWhiteSpace(value))
		{
			return Enum.TryParse<MedicineOrderStatus>(value.Trim(), ignoreCase: true, out status);
		}
		return false;
	}

	public static bool CanTransition(MedicineOrderStatus current, MedicineOrderStatus next, MedicineOrderFulfillment fulfillment)
	{
		if (current == next)
		{
			return false;
		}
		switch (current)
		{
		case MedicineOrderStatus.Pending:
			if (next == MedicineOrderStatus.Accepted || next == MedicineOrderStatus.Cancelled)
			{
				return true;
			}
			return false;
		case MedicineOrderStatus.Accepted:
			if (next == MedicineOrderStatus.Preparing || next == MedicineOrderStatus.Cancelled)
			{
				return true;
			}
			return false;
		case MedicineOrderStatus.Preparing:
			if (next == MedicineOrderStatus.Cancelled)
			{
				return true;
			}
			if (fulfillment != MedicineOrderFulfillment.Pickup)
			{
				return next == MedicineOrderStatus.OutForDelivery;
			}
			return next == MedicineOrderStatus.ReadyForPickup;
		case MedicineOrderStatus.ReadyForPickup:
		case MedicineOrderStatus.OutForDelivery:
			return next == MedicineOrderStatus.Delivered || next == MedicineOrderStatus.Cancelled;
		default:
			return false;
		}
	}

	public static void ApplyOrderStatus(MedicineOrder order, MedicineOrderStatus next, IDictionary<int, PharmacyMedicine>? stockByMedicineId = null, IReadOnlyDictionary<int, int>? alreadyDeliveredQuantities = null)
	{
		MedicineOrderStatus status = order.Status;
		order.Status = next;
		order.UpdatedAt = DateTime.UtcNow;
		if (next == MedicineOrderStatus.Delivered)
		{
			order.DeliveredAt = DateTime.UtcNow;
			order.PaymentStatus = MedicineOrderPaymentStatus.Paid;
			bool flag = order.Prescription != null;
			bool flag2 = flag;
			if (flag2)
			{
				PrescriptionStatus status2 = order.Prescription.Status;
				bool flag3 = status2 - 1 <= PrescriptionStatus.Reviewing;
				flag2 = flag3;
			}
			if (flag2 && PrescriptionFullyDelivered(order.Prescription.Items, alreadyDeliveredQuantities ?? new Dictionary<int, int>(), order.Items))
			{
				order.Prescription.Status = PrescriptionStatus.Fulfilled;
				order.Prescription.UpdatedAt = DateTime.UtcNow;
			}
		}
		if (status != MedicineOrderStatus.Cancelled && next == MedicineOrderStatus.Cancelled && stockByMedicineId != null)
		{
			RestoreStock(order, stockByMedicineId);
		}
		if (order.DeliveryTask != null)
		{
			order.DeliveryTask.UpdatedAt = DateTime.UtcNow;
			DeliveryTask deliveryTask = order.DeliveryTask;
			deliveryTask.Status = next switch
			{
				MedicineOrderStatus.OutForDelivery => DeliveryTaskStatus.OutForDelivery, 
				MedicineOrderStatus.Delivered => DeliveryTaskStatus.Delivered, 
				MedicineOrderStatus.Cancelled => DeliveryTaskStatus.Cancelled, 
				_ => order.DeliveryTask.Status, 
			};
		}
	}

	private static void RestoreStock(MedicineOrder order, IDictionary<int, PharmacyMedicine> stockByMedicineId)
	{
		foreach (MedicineOrderItem item in order.Items)
		{
			if (stockByMedicineId.TryGetValue(item.MedicineId, out PharmacyMedicine value))
			{
				if (value.Quantity.HasValue)
				{
					value.Quantity += item.Quantity;
				}
				value.IsAvailable = true;
			}
		}
	}

	public static bool TryParsePrescriptionStatus(string? value, out PrescriptionStatus status)
	{
		status = PrescriptionStatus.New;
		if (!string.IsNullOrWhiteSpace(value))
		{
			return Enum.TryParse<PrescriptionStatus>(value.Trim(), ignoreCase: true, out status);
		}
		return false;
	}

	public static bool CanTransition(PrescriptionStatus current, PrescriptionStatus next)
	{
		if (current == next)
		{
			return false;
		}
		switch (current)
		{
		case PrescriptionStatus.New:
			return next == PrescriptionStatus.Reviewing
				|| next == PrescriptionStatus.Approved
				|| next == PrescriptionStatus.Rejected;
		case PrescriptionStatus.Reviewing:
			return next == PrescriptionStatus.Approved || next == PrescriptionStatus.Rejected;
		case PrescriptionStatus.Approved:
			return next == PrescriptionStatus.Fulfilled;
		default:
			return false;
		}
	}

	public static Dictionary<int, int> GetPrescribedQuantities(IEnumerable<PrescriptionItem> prescriptionItems)
	{
		return (from i in prescriptionItems
			where i.MedicineId.HasValue
			group i by i.MedicineId.Value).ToDictionary((IGrouping<int, PrescriptionItem> g) => g.Key, (IGrouping<int, PrescriptionItem> g) => g.Sum((PrescriptionItem i) => i.Quantity));
	}

	public static bool PrescriptionItemsCoverRequest(IEnumerable<PrescriptionItem> prescriptionItems, IReadOnlyDictionary<int, int> requestedQuantities)
	{
		Dictionary<int, int> prescribed = GetPrescribedQuantities(prescriptionItems);
		if (prescribed.Count > 0 && requestedQuantities.Keys.All(prescribed.ContainsKey))
		{
			return requestedQuantities.All((KeyValuePair<int, int> item) => item.Value <= prescribed[item.Key]);
		}
		return false;
	}

	public static bool PrescriptionItemsWithinRemaining(IEnumerable<PrescriptionItem> prescriptionItems, IReadOnlyDictionary<int, int> alreadyDeliveredQuantities, IReadOnlyDictionary<int, int> requestedQuantities)
	{
		Dictionary<int, int> prescribedQuantities = GetPrescribedQuantities(prescriptionItems);
		if (prescribedQuantities.Count == 0)
		{
			return false;
		}
		foreach (KeyValuePair<int, int> requestedQuantity in requestedQuantities)
		{
			if (!prescribedQuantities.TryGetValue(requestedQuantity.Key, out var value))
			{
				return false;
			}
			int valueOrDefault = alreadyDeliveredQuantities.GetValueOrDefault(requestedQuantity.Key);
			if (requestedQuantity.Value <= 0 || valueOrDefault + requestedQuantity.Value > value)
			{
				return false;
			}
		}
		return true;
	}

	public static bool PrescriptionFullyDelivered(IEnumerable<PrescriptionItem> prescriptionItems, IReadOnlyDictionary<int, int> alreadyDeliveredQuantities, IEnumerable<MedicineOrderItem> currentOrderItems)
	{
		Dictionary<int, int> prescribedQuantities = GetPrescribedQuantities(prescriptionItems);
		if (prescribedQuantities.Count == 0)
		{
			return false;
		}
		Dictionary<int, int> delivered = new Dictionary<int, int>(alreadyDeliveredQuantities);
		foreach (MedicineOrderItem currentOrderItem in currentOrderItems)
		{
			delivered[currentOrderItem.MedicineId] = delivered.GetValueOrDefault(currentOrderItem.MedicineId) + currentOrderItem.Quantity;
		}
		return prescribedQuantities.All((KeyValuePair<int, int> item) => delivered.GetValueOrDefault(item.Key) >= item.Value);
	}
}
