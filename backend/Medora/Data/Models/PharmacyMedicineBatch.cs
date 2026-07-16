using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class PharmacyMedicineBatch
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PharmacyMedicineId { get; set; }

        [ForeignKey(nameof(PharmacyMedicineId))]
        public PharmacyMedicine PharmacyMedicine { get; set; } = default!;

        public string? BatchNumber { get; set; }

        public DateTime? ExpiryDate { get; set; }

        public int Quantity { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
