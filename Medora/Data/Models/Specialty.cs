using System.ComponentModel.DataAnnotations;

namespace Medora.Data.Models
{
    public class Specialty
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(150)]
        public string NameAr { get; set; } = default!;

        [MaxLength(150)]
        public string? NameEn { get; set; }

        public ICollection<DoctorSpecialty> DoctorSpecialties { get; set; } = new List<DoctorSpecialty>();
    }
}
