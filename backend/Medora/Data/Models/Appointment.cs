using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public enum AppointmentStatus : byte
    {
        Pending = 0,
        Confirmed = 1,
        Cancelled = 2,
        Completed = 3
    }

    public class Appointment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string PatientUserId { get; set; } = default!;

        [ForeignKey(nameof(PatientUserId))]
        public AppUser Patient { get; set; } = default!;

        [Required]
        public int DoctorId { get; set; }

        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile Doctor { get; set; } = default!;

        public int? ClinicId { get; set; }

        [ForeignKey(nameof(ClinicId))]
        public Clinic? Clinic { get; set; }

        [Required, MaxLength(200)]
        public string ContactName { get; set; } = default!;

        [Required, MaxLength(30)]
        public string ContactPhone { get; set; } = default!;

        public DateTime ScheduledAt { get; set; }

        public int DurationMinutes { get; set; } = 15;

        [Column(TypeName = "decimal(18,2)")]
        public decimal ConsultationFee { get; set; } = 0;

        [Required]
        public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;

        [MaxLength(1000)]
        public string? Reason { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        /// <summary>True = إعادة كشف (patient has visited before). Validated server-side.</summary>
        public bool IsReconsultation { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
