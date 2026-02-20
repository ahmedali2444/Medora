using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public enum ArticleStatus : byte
    {
        Draft = 0,
        Published = 1
    }

    public class Article
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int AuthorDoctorId { get; set; }

        [ForeignKey(nameof(AuthorDoctorId))]
        public DoctorProfile AuthorDoctor { get; set; } = default!;

        [Required, MaxLength(200)]
        public string Title { get; set; } = default!;

        [Required]
        public string Content { get; set; } = default!;

        [MaxLength(500)]
        public string? CoverImageUrl { get; set; }

        public ArticleStatus Status { get; set; } = ArticleStatus.Draft;

        public DateTime? PublishedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
