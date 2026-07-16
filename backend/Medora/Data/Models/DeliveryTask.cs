using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public enum DeliveryTaskStatus : byte
    {
        Pending = 0,
        OutForDelivery = 1,
        Delivered = 2,
        Cancelled = 3
    }

    public class DeliveryTask
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int MedicineOrderId { get; set; }

        [ForeignKey(nameof(MedicineOrderId))]
        public MedicineOrder MedicineOrder { get; set; } = default!;

        [Required]
        public int PharmacyId { get; set; }

        [ForeignKey(nameof(PharmacyId))]
        public PharmacyProfile Pharmacy { get; set; } = default!;

        [Required]
        public DeliveryTaskStatus Status { get; set; } = DeliveryTaskStatus.Pending;

        [MaxLength(120)]
        public string? CourierName { get; set; }

        [MaxLength(30)]
        public string? CourierPhone { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal? DistanceKm { get; set; }

        public int? EtaMinutes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
