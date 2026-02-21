using System.ComponentModel.DataAnnotations;

namespace Medora.DTOs
{
    public class ForgotPasswordVerifyDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = default!;

        [Required, MaxLength(10)]
        public string Code { get; set; } = default!;
    }
}
