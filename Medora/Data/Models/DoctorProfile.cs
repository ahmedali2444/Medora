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
        public string? Bio { get; set; }
        [MaxLength(30)]
        public string? Phone { get; set; }
        [MaxLength(30)]
        public string? WhatsApp { get; set; }
        [MaxLength(500)]
        public string? ProfileImageUrl { get; set; }
        public bool IsActive { get; set; } = false;
        public DoctorVerification? Verification { get; set; }
        public ICollection<Clinic> Clinics { get; set; } = new List<Clinic>();
        public ICollection<DoctorSpecialty> DoctorSpecialties { get; set; } = new List<DoctorSpecialty>();
        public ICollection<Article> Articles { get; set; } = new List<Article>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
