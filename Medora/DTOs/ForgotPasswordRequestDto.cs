using System.ComponentModel.DataAnnotations;

namespace Medora.DTOs
{
    public class ForgotPasswordRequestDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = default!;
    }
}
