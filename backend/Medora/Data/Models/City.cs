using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class City
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string NameAr { get; set; } = default!;

        [Required, MaxLength(100)]
        public string NameEn { get; set; }= default!;

        [Required]
        public int GovernorateId { get; set; }

        [ForeignKey(nameof(GovernorateId))]
        public Governorate Governorate { get; set; } = default!;

        public bool IsArchived { get; set; } = false;
        public DateTime? ArchivedAt { get; set; }
    }
}
