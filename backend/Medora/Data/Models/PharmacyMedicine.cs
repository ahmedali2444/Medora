using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class PharmacyMedicine
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PharmacyId { get; set; }

        [ForeignKey(nameof(PharmacyId))]
        public PharmacyProfile Pharmacy { get; set; } = default!;

        [Required]
        public int MedicineId { get; set; }

        [ForeignKey(nameof(MedicineId))]
        public Medicine Medicine { get; set; } = default!;

        public bool IsAvailable { get; set; } = true;

        public int? Quantity { get; set; }

        public int ReorderLevel { get; set; } = 5;

        [Column(TypeName = "decimal(10,2)")]
        public decimal? Price { get; set; }

        public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ExpiryDate { get; set; }

        public string? BatchNumber { get; set; }

        // shared catalog image (Medicine.ImageUrl) when not set.
        public string? ImageUrl { get; set; }

        public ICollection<PharmacyMedicineBatch> Batches { get; set; } = new List<PharmacyMedicineBatch>();
    }
}
