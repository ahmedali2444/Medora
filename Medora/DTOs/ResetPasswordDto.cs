using System.ComponentModel.DataAnnotations;

namespace Medora.DTOs
{
    public class ResetPasswordDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = default!;

        [Required, MaxLength(64)]
        public string ResetToken { get; set; } = default!;

        [Required, MinLength(6)]
        public string NewPassword { get; set; } = default!;
    }
}
