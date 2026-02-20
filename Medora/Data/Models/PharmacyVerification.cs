using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class PharmacyVerification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PharmacyId { get; set; }

        [ForeignKey(nameof(PharmacyId))]
        public PharmacyProfile Pharmacy { get; set; } = default!;

        [Required, MaxLength(500)]
        public string LicenseImageUrl { get; set; } = default!;

        [MaxLength(500)]
        public string? PharmacistIdCardUrl { get; set; }

        [Required]
        public VerificationStatus Status { get; set; } = VerificationStatus.Pending;
        public DateTime? ReviewedAt { get; set; }

        [MaxLength(500)]
        public string? RejectReason { get; set; }
    }
}
