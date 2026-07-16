using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public enum MedicineOrderStatus : byte
    {
        Pending = 0,
        Accepted = 1,
        Preparing = 2,
        ReadyForPickup = 3,
        OutForDelivery = 4,
        Delivered = 5,
        Cancelled = 6
    }

    public enum MedicineOrderFulfillment : byte
    {
        Delivery = 1,
        Pickup = 2
    }

    public enum MedicineOrderPaymentMethod : byte
    {
        Cash = 1
    }

    public enum MedicineOrderPaymentStatus : byte
    {
        Unpaid = 0,
        Paid = 1
    }

    public class MedicineOrder
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(30)]
        public string OrderNumber { get; set; } = default!;

        [Required]
        public string PatientUserId { get; set; } = default!;

        [ForeignKey(nameof(PatientUserId))]
        public AppUser Patient { get; set; } = default!;

        [Required]
        public int PharmacyId { get; set; }

        [ForeignKey(nameof(PharmacyId))]
        public PharmacyProfile Pharmacy { get; set; } = default!;

        public int? PrescriptionId { get; set; }

        [ForeignKey(nameof(PrescriptionId))]
        public Prescription? Prescription { get; set; }

        [Required]
        public MedicineOrderStatus Status { get; set; } = MedicineOrderStatus.Pending;

        [Required]
        public MedicineOrderFulfillment Fulfillment { get; set; } = MedicineOrderFulfillment.Delivery;

        [Required]
        public MedicineOrderPaymentMethod PaymentMethod { get; set; } = MedicineOrderPaymentMethod.Cash;

        [Required]
        public MedicineOrderPaymentStatus PaymentStatus { get; set; } = MedicineOrderPaymentStatus.Unpaid;

        [Required, MaxLength(200)]
        public string ContactName { get; set; } = default!;

        [Required, MaxLength(30)]
        public string ContactPhone { get; set; } = default!;

        [MaxLength(500)]
        public string? DeliveryAddress { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal Subtotal { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal DeliveryFee { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal Total { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeliveredAt { get; set; }

        public ICollection<MedicineOrderItem> Items { get; set; } = new List<MedicineOrderItem>();
        public DeliveryTask? DeliveryTask { get; set; }
    }
}
