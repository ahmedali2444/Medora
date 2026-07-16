using System.ComponentModel.DataAnnotations;

namespace Medora.Data.Models
{
    public class Medicine
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; } = default!;

        [Required, MaxLength(200)]
        public string NormalizedName { get; set; } = default!;

        [MaxLength(200)]
        public string? ActiveIngredient { get; set; }

        public DateTime? ArchivedAt { get; set; }

        [MaxLength(100)]
        public string? Barcode { get; set; }

        [MaxLength(80)]
        public string? Form { get; set; }

        [MaxLength(80)]
        public string? Strength { get; set; }

        [MaxLength(100)]
        public string ImageUrl { get; set; } = default!;

        [MaxLength(160)]
        public string? Company { get; set; }

        [MaxLength(120)]
        public string? Category { get; set; }

        [MaxLength(1000)]
        public string? DosageAr { get; set; }

        [MaxLength(1000)]
        public string? DosageEn { get; set; }

        [MaxLength(4000)]
        public string? InteractionsJson { get; set; }

        [MaxLength(2000)]
        public string? SymptomsJson { get; set; }

        [MaxLength(4000)]
        public string? UsagesJson { get; set; }

        [MaxLength(4000)]
        public string? WarningsJson { get; set; }

        public bool IsArchived { get; set; } = false;
        public ICollection<PharmacyMedicine> PharmacyMedicines { get; set; } = new List<PharmacyMedicine>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }
}
