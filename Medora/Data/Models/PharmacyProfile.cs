using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class PharmacyProfile
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; } = default!;

        [ForeignKey(nameof(UserId))]
        public AppUser User { get; set; } = default!;

        [Required, MaxLength(200)]
        public string PharmacyName { get; set; } = default!;

        [Required, MaxLength(50)]
        public string LicenseNumber { get; set; } = default!;

        public string? Bio { get; set; }

        [Required, MaxLength(100)]
        public string Governorate { get; set; } = default!;

        [MaxLength(100)]
        public string? City { get; set; }

        [Required, MaxLength(300)]
        public string AddressLine { get; set; } = default!;

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Longitude { get; set; }

        [MaxLength(30)]
        public string? Phone1 { get; set; }

        [MaxLength(30)]
        public string? Phone2 { get; set; }

        [MaxLength(30)]
        public string? WhatsApp { get; set; }

        [MaxLength(500)]
        public string? ProfileImageUrl { get; set; }

        public TimeOnly? OpenFrom { get; set; }
        public TimeOnly? OpenTo { get; set; }

        public bool Is24Hours { get; set; } = false;
        public bool IsActive { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public PharmacyVerification? Verification { get; set; }
        public ICollection<PharmacyMedicine> PharmacyMedicines { get; set; } = new List<PharmacyMedicine>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }
}
