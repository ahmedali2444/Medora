using Microsoft.AspNetCore.Identity;

namespace Medora.Data.Models
{
    public class AppUser : IdentityUser
    {
        public string? FullName { get; set; }
        public string? FullNameEn { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? MedicalNotes { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }
        public string? NotificationPreferences { get; set; }
        public string PreferredLanguage { get; set; } = "ar";
    }
}
