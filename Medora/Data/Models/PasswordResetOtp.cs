using System.ComponentModel.DataAnnotations;

namespace Medora.Data.Models
{
    public class PasswordResetOtp
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; } = default!;

        [Required, MaxLength(10)]
        public string Code { get; set; } = default!;

        [Required, MaxLength(64)]
        public string ResetToken { get; set; } = default!;

        public DateTime ExpiresAtUtc { get; set; }

        public bool IsUsed { get; set; } = false;

        public int Attempts { get; set; } = 0;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
