using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public enum VerificationStatus : byte
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2
    }
    public class DoctorVerification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int DoctorId { get; set; }

        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile Doctor { get; set; } = default!;

        [Required]
        public string CardImageUrl { get; set; } = null!;

        [Required]
        public string SelfieWithCardUrl { get; set; } = null!;

        [Required]
        public VerificationStatus Status { get; set; } = VerificationStatus.Pending;
        public DateTime? ReviewedAt { get; set; }

        [MaxLength(500)]
        public string? RejectReason { get; set; }
    }
}
