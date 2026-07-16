using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public enum PrescriptionStatus : byte
    {
        New = 0,
        Reviewing = 1,
        Approved = 2,
        Rejected = 3,
        Fulfilled = 4
    }

    public class Prescription
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(30)]
        public string PrescriptionNumber { get; set; } = default!;

        [Required]
        public int DoctorId { get; set; }

        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile Doctor { get; set; } = default!;

        [Required]
        public string PatientUserId { get; set; } = default!;

        [ForeignKey(nameof(PatientUserId))]
        public AppUser Patient { get; set; } = default!;

        public int? AppointmentId { get; set; }

        [ForeignKey(nameof(AppointmentId))]
        public Appointment? Appointment { get; set; }

        public int? PharmacyId { get; set; }

        [ForeignKey(nameof(PharmacyId))]
        public PharmacyProfile? Pharmacy { get; set; }

        [Required]
        public PrescriptionStatus Status { get; set; } = PrescriptionStatus.New;

        [Required, MaxLength(500)]
        public string Diagnosis { get; set; } = default!;

        [MaxLength(1000)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<PrescriptionItem> Items { get; set; } = new List<PrescriptionItem>();
    }
}
