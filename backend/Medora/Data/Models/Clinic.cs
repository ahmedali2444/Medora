using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class Clinic
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int DoctorId { get; set; }

        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile Doctor { get; set; } = default!;

        [Required]
        public int GovernorateId { get; set; }

        [ForeignKey(nameof(GovernorateId))]
        public Governorate Governorate { get; set; } = default!;

        public int? CityId { get; set; }

        [ForeignKey(nameof(CityId))]
        public City? City { get; set; }

        [NotMapped]
        [MaxLength(200)]
        public string? Name { get; set; }

        [MaxLength(200)]
        public string? NameAr { get; set; }

        [MaxLength(200)]
        public string? NameEn { get; set; }

        [Required, MaxLength(300)]
        public string AddressLine { get; set; } = default!;

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(9,6)")]
        public decimal? Longitude { get; set; }

        [MaxLength(30)]
        public string? Phone { get; set; }

        [NotMapped]
        [MaxLength(30)]
        public string? WhatsApp { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? ConsultationFee { get; set; }



        [Column(TypeName = "decimal(10,2)")]
        public decimal? ReconsultationFee { get; set; }

        /// <summary>Duration of each appointment slot in minutes (e.g. 15, 20, 30, 45, 60).</summary>
        public int AppointmentDurationMinutes { get; set; } = 15;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ClinicWorkingHour> WorkingHours { get; set; } = new List<ClinicWorkingHour>();
    }
}
