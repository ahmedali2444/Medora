using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class UserReport
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string ReporterUserId { get; set; } = default!;

        [ForeignKey(nameof(ReporterUserId))]
        public AppUser Reporter { get; set; } = default!;

        [Required, MaxLength(30)]
        public string TargetType { get; set; } = default!;

        public int TargetId { get; set; }

        [Required, MaxLength(1000)]
        public string Reason { get; set; } = default!;

        [Required, MaxLength(30)]
        public string Status { get; set; } = "pending";

        [MaxLength(1000)]
        public string? Resolution { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}
