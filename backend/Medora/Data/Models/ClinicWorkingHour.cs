using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class ClinicWorkingHour
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ClinicId { get; set; }

        [ForeignKey(nameof(ClinicId))]
        public Clinic Clinic { get; set; } = default!;

        [Required]
        public byte DayOfWeek { get; set; } = default!;

        public TimeOnly? OpenFrom { get; set; }
        public TimeOnly? OpenTo { get; set; }

        public bool IsClosed { get; set; } = false;
    }
}
