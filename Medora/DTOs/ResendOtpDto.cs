using System.ComponentModel.DataAnnotations;

namespace Medora.DTOs
{
    public class ResendOtpDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = default!;
    }
}
