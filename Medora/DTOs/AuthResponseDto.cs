namespace Medora.DTOs
{

    public class AuthResponseDto
    {
        public string Token { get; set; } = default!;
        public DateTime ExpiresAtUtc { get; set; }

        public string UserId { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string? UserName { get; set; }

        public List<string> Roles { get; set; } = new();
    }

}
