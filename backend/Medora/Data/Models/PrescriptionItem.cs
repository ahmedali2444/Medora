using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class PrescriptionItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PrescriptionId { get; set; }

        [ForeignKey(nameof(PrescriptionId))]
        public Prescription Prescription { get; set; } = default!;

        public int? MedicineId { get; set; }

        [ForeignKey(nameof(MedicineId))]
        public Medicine? Medicine { get; set; }

        [Required, MaxLength(200)]
        public string MedicineName { get; set; } = default!;

        [MaxLength(120)]
        public string? Dosage { get; set; }

        [MaxLength(500)]
        public string? Instructions { get; set; }

        [Range(1, 1000)]
        public int Quantity { get; set; } = 1;
    }
}
