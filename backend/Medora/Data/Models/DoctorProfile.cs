using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class DoctorProfile
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; } = default!;

        [ForeignKey(nameof(UserId))]
        public AppUser User { get; set; } = default!;

        [Required, MaxLength(200)]
        public string FullName { get; set; } = default!;

        [Required]
        public int SpecialtyId { get; set; }

        [ForeignKey(nameof(SpecialtyId))]
        public Specialty Specialty { get; set; } = default!;

        [Required, MaxLength(50)]
        public string LicenseNumber { get; set; } = default!;

        public int ExperienceYears { get; set; } = 0;

        [MaxLength(500)]
        public string? Languages { get; set; }

        public string? Bio { get; set; }

        [Required, MaxLength(30)]
        public string Phone { get; set; } = default!;

        public string? ProfileImageUrl { get; set; }

        public bool IsActive { get; set; } = false;
        public bool IsFeatured { get; set; } = false;
        public string AvailabilityStatus { get; set; } = "available";
        public int ViewCount { get; set; } = 0;
        public DoctorVerification? Verification { get; set; }
        public ICollection<Clinic> Clinics { get; set; } = new List<Clinic>();
        public ICollection<Article> Articles { get; set; } = new List<Article>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
