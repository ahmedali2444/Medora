namespace Medora.DTOs
{
    public class RegisterResponseDto
    {
        public string UserId { get; set; } = default!;
        public string Role { get; set; } = default!;
        public bool NeedsProfileCompletion { get; set; }
        public string Token { get; set; } = default!;
        public DateTime ExpiresAtUtc { get; set; }
    }
}
