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

public static class NotificationMessages
{
	private static string FormatClinicDateTime(DateTime clinicLocal)
	{
		return clinicLocal.ToString("yyyy-MM-dd HH:mm");
	}

	public static (string Title, string Body) AppointmentCreatedForDoctor(string patientName, DateTime clinicLocal, string? language)
	{
		if (UserLanguageHelper.IsEnglish(language))
		{
			return (Title: "New appointment request", Body: $"You have a new appointment request from {patientName.Trim()} on {FormatClinicDateTime(clinicLocal)}.");
		}
		return (Title: "طلب حجز موعد جديد", Body: $"لديك طلب حجز جديد من {patientName.Trim()} بتاريخ {FormatClinicDateTime(clinicLocal)}.");
	}

	public static (string Title, string Body) AppointmentCreatedForPatient(string doctorName, DateTime clinicLocal, string? language)
	{
		if (UserLanguageHelper.IsEnglish(language))
		{
			return (Title: "Appointment request submitted", Body: $"Your appointment request with Dr. {doctorName.Trim()} on {FormatClinicDateTime(clinicLocal)} was submitted.");
		}
		return (Title: "تم إرسال طلب الحجز", Body: $"تم إرسال طلب حجزك مع د. {doctorName.Trim()} بتاريخ {FormatClinicDateTime(clinicLocal)}.");
	}

	public static (string Title, string Body) AppointmentConfirmedForPatient(string doctorName, DateTime clinicLocal, string? language)
	{
		if (UserLanguageHelper.IsEnglish(language))
		{
			return (Title: "Appointment confirmed", Body: $"Your appointment with Dr. {doctorName.Trim()} on {FormatClinicDateTime(clinicLocal)} has been confirmed.");
		}
		return (Title: "تم تأكيد الموعد", Body: $"تم تأكيد موعدك مع د. {doctorName.Trim()} بتاريخ {FormatClinicDateTime(clinicLocal)}.");
	}

	public static (string Title, string Body) AppointmentCompletedForPatient(string doctorName, DateTime clinicLocal, string? language)
	{
		if (UserLanguageHelper.IsEnglish(language))
		{
			return (Title: "Appointment completed", Body: $"Your appointment with Dr. {doctorName.Trim()} on {FormatClinicDateTime(clinicLocal)} has been completed.");
		}
		return (Title: "اكتمل الموعد", Body: $"تم إكمال موعدك مع د. {doctorName.Trim()} بتاريخ {FormatClinicDateTime(clinicLocal)}.");
	}

	public static (string Title, string Body) AppointmentCancelledForDoctor(string patientName, DateTime clinicLocal, string? language, string? reason = null)
	{
		if (UserLanguageHelper.IsEnglish(language))
		{
			string body = $"Patient {patientName.Trim()} cancelled the appointment scheduled for {FormatClinicDateTime(clinicLocal)}.";
			if (!string.IsNullOrWhiteSpace(reason)) body += $" Reason: {reason.Trim()}";
			return (Title: "Appointment cancelled", Body: body);
		}
		string bodyAr = $"ألغى المريض {patientName.Trim()} الموعد المحدد بتاريخ {FormatClinicDateTime(clinicLocal)}.";
		if (!string.IsNullOrWhiteSpace(reason)) bodyAr += $" السبب: {reason.Trim()}";
		return (Title: "تم إلغاء موعد", Body: bodyAr);
	}

	public static (string Title, string Body) AppointmentCancelledForPatient(string doctorName, DateTime clinicLocal, string? language, string? reason = null)
	{
		if (UserLanguageHelper.IsEnglish(language))
		{
			string body = $"Your appointment with Dr. {doctorName.Trim()} on {FormatClinicDateTime(clinicLocal)} was cancelled.";
			if (!string.IsNullOrWhiteSpace(reason)) body += $" Reason: {reason.Trim()}";
			return (Title: "Appointment cancelled", Body: body);
		}
		string bodyAr = $"تم إلغاء موعدك مع د. {doctorName.Trim()} بتاريخ {FormatClinicDateTime(clinicLocal)}.";
		if (!string.IsNullOrWhiteSpace(reason)) bodyAr += $" السبب: {reason.Trim()}";
		return (Title: "تم إلغاء الموعد", Body: bodyAr);
	}

	public static (string Title, string Body) OrderCreatedForPharmacy(string orderNumber, string? language)
	{
		if (UserLanguageHelper.IsEnglish(language))
		{
			return (Title: "New medicine order", Body: "Order " + orderNumber + " is waiting for review.");
		}
		return (Title: "طلب دواء جديد", Body: "الطلب " + orderNumber + " بانتظار المراجعة.");
	}

	public static (string Title, string Body) OrderCreatedForPatient(string orderNumber, string? language)
	{
		if (UserLanguageHelper.IsEnglish(language))
		{
			return (Title: "Order submitted", Body: "Your order " + orderNumber + " was submitted successfully.");
		}
		return (Title: "تم إرسال الطلب", Body: "تم إرسال طلبك رقم " + orderNumber + " بنجاح.");
	}

	public static (string Title, string Body) OrderStatusUpdatedForPatient(string orderNumber, string statusLabel, string? language)
	{
		if (UserLanguageHelper.IsEnglish(language))
		{
			return (Title: "Order status updated", Body: $"Your order {orderNumber} is now: {statusLabel}.");
		}
		return (Title: "تحديث حالة الطلب", Body: $"أصبحت حالة طلبك رقم {orderNumber}: {statusLabel}.");
	}

	public static string OrderStatusLabel(MedicineOrderStatus status, string? language)
	{
		if (UserLanguageHelper.IsEnglish(language))
		{
			return status switch
			{
				MedicineOrderStatus.Pending => "Pending review", 
				MedicineOrderStatus.Accepted => "Accepted", 
				MedicineOrderStatus.Preparing => "Preparing", 
				MedicineOrderStatus.ReadyForPickup => "Ready for pickup", 
				MedicineOrderStatus.OutForDelivery => "Out for delivery", 
				MedicineOrderStatus.Delivered => "Delivered", 
				MedicineOrderStatus.Cancelled => "Cancelled", 
				_ => status.ToString(), 
			};
		}
		return status switch
		{
			MedicineOrderStatus.Pending => "قيد المراجعة", 
			MedicineOrderStatus.Accepted => "مقبول", 
			MedicineOrderStatus.Preparing => "قيد التحضير", 
			MedicineOrderStatus.ReadyForPickup => "جاهز للاستلام", 
			MedicineOrderStatus.OutForDelivery => "في الطريق", 
			MedicineOrderStatus.Delivered => "تم التسليم", 
			MedicineOrderStatus.Cancelled => "ملغي", 
			_ => status.ToString(), 
		};
	}
}
