using Microsoft.AspNetCore.Identity;

namespace Medora.Data.Models
{
    public class AppUser : IdentityUser
    {
        public string? FullName { get; set; }
    }
}
