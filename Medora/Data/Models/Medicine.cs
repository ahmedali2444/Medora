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

        [MaxLength(80)]
        public string? Form { get; set; }

        [MaxLength(80)]
        public string? Strength { get; set; }

        [MaxLength(500)]
        public string? ImageUrl { get; set; }
        public ICollection<PharmacyMedicine> PharmacyMedicines { get; set; } = new List<PharmacyMedicine>();
    }
}
