using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class AuditLog
    {
        [Key]
        public int Id { get; set; }

        public string? ActorUserId { get; set; }

        [ForeignKey(nameof(ActorUserId))]
        public AppUser? Actor { get; set; }

        [Required, MaxLength(100)]
        public string Action { get; set; } = default!;

        [Required, MaxLength(100)]
        public string EntityType { get; set; } = default!;

        [MaxLength(100)]
        public string? EntityId { get; set; }

        [MaxLength(2000)]
        public string? Details { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
