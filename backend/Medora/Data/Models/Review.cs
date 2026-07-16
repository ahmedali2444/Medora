using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public enum ReviewTargetType : byte
    {
        Doctor = 1,
        Pharmacy = 2,
        Medicine = 3
    }
    public class Review
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string ReviewerUserId { get; set; } = default!;

        [ForeignKey(nameof(ReviewerUserId))]
        public AppUser Reviewer { get; set; } = default!;

        [Required]
        public ReviewTargetType TargetType { get; set; }

        public int? DoctorId { get; set; }
        [ForeignKey(nameof(DoctorId))]
        public DoctorProfile? Doctor { get; set; }

        public int? PharmacyId { get; set; }
        [ForeignKey(nameof(PharmacyId))]
        public PharmacyProfile? Pharmacy { get; set; }

        public int? AppointmentId { get; set; }
        [ForeignKey(nameof(AppointmentId))]
        public Appointment? Appointment { get; set; }

        public int? MedicineId { get; set; }
        [ForeignKey(nameof(MedicineId))]
        public Medicine? Medicine { get; set; }

        public int? MedicineOrderId { get; set; }
        [ForeignKey(nameof(MedicineOrderId))]
        public MedicineOrder? MedicineOrder { get; set; }

        [Range(1, 5)]
        public byte Rating { get; set; }

        [MaxLength(1000)]
        public string? Comment { get; set; }

        public bool Verified { get; set; } = true;
        public bool IsHidden { get; set; } = false;
        public bool IsDeleted { get; set; } = false;

        [MaxLength(1000)]
        public string? Reply { get; set; }
        public DateTime? ReplyCreatedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
