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

        [Required]
        public int GovernorateId { get; set; }

        [ForeignKey(nameof(GovernorateId))]
        public Governorate Governorate { get; set; } = default!;

        [Required]
        public int CityId { get; set; }

        [ForeignKey(nameof(CityId))]
        public City City { get; set; } = default!;

        [Required, MaxLength(300)]
        public string AddressLine { get; set; } = default!;

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Longitude { get; set; }

        [MaxLength(30)]
        public string? Phone { get; set; }

        public string? ProfileImageUrl { get; set; }

        public TimeOnly? OpenFrom { get; set; }
        public TimeOnly? OpenTo { get; set; }

        public bool Is24Hours { get; set; } = false;
        public bool IsActive { get; set; } = false;
        public bool IsFeatured { get; set; } = false;
        public string Status { get; set; } = "open";
        public int ViewCount { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public PharmacyVerification? Verification { get; set; }
        public ICollection<PharmacyMedicine> PharmacyMedicines { get; set; } = new List<PharmacyMedicine>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }
}
