using System.ComponentModel.DataAnnotations;

namespace Medora.Data.Models
{
    public class Governorate
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string NameAr { get; set; } = default!;

        [Required, MaxLength(100)]
        public string NameEn { get; set; } = default!;

        public bool IsArchived { get; set; } = false;
        public DateTime? ArchivedAt { get; set; }

        public ICollection<City> Cities { get; set; } = new List<City>();
    }
}
