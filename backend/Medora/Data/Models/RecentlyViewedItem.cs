using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class RecentlyViewedItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; } = default!;

        [ForeignKey(nameof(UserId))]
        public AppUser User { get; set; } = default!;

        [Required, MaxLength(30)]
        public string TargetType { get; set; } = default!;

        public int TargetId { get; set; }
        public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
    }
}
