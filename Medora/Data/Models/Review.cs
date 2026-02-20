using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public enum ReviewTargetType : byte
    {
        Doctor = 1,
        Pharmacy = 2
    }
    public class Review
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string ReviewerUserId { get; set; } = default!;

        [ForeignKey(nameof(ReviewerUserId))]
        public AppUser Reviewer { get; set; } = default!;

        [Required]
        public ReviewTargetType TargetType { get; set; }

        public int? DoctorId { get; set; }
        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile? Doctor { get; set; }

        public int? PharmacyId { get; set; }
        [ForeignKey(nameof(PharmacyId))]
        public PharmacyProfile? Pharmacy { get; set; }

        [Range(1, 5)]
        public byte Rating { get; set; }

        [MaxLength(1000)]
        public string? Comment { get; set; }

        public bool Verified { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
