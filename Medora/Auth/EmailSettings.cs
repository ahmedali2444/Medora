namespace Medora.Auth
{
    public class EmailSettings
    {
        public string Host { get; set; } = "smtp.gmail.com";
        public int Port { get; set; } = 587;
        public bool EnableSsl { get; set; } = true;

        public string Username { get; set; } = default!;
        public string AppPassword { get; set; } = default!;

        public string FromEmail { get; set; } = default!;
        public string FromName { get; set; } = "Medora";
    }
}
