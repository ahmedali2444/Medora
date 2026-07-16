using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class SearchLog
    {
        [Key]
        public int Id { get; set; }

        public string? UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public AppUser? User { get; set; }

        [Required, MaxLength(200)]
        public string Query { get; set; } = default!;

        [Required, MaxLength(30)]
        public string Category { get; set; } = "all";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
