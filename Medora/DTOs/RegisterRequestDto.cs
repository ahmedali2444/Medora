using System.ComponentModel.DataAnnotations;

namespace Medora.DTOs
{
    public class RegisterRequestDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = default!;

        [Required, MinLength(6)]
        public string Password { get; set; } = default!;

        [Required]
        public string AccountType { get; set; } = default!;

        public string? PhoneNumber { get; set; }

        public string? FullName { get; set; }
    }

}
