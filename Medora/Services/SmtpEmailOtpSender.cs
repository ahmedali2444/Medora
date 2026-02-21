using Medora.Auth;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;

namespace Medora.Services
{
    public class SmtpEmailOtpSender : IEmailOtpSender
    {
        private readonly EmailSettings _settings;
        public SmtpEmailOtpSender(IOptions<EmailSettings> options)
        {
            _settings = options.Value;
        }
        public async Task SendOtpAsync(
            string toEmail,
            string subject,
            string message
            )
        {
            using var client = new SmtpClient(_settings.Host, _settings.Port)
            {
                EnableSsl = _settings.EnableSsl,
                Credentials = new NetworkCredential(_settings.Username, _settings.AppPassword)
            };
            using var mail = new MailMessage
            {
                From = new MailAddress(_settings.FromEmail, _settings.FromName),
                Subject = subject,
                Body = message,
                IsBodyHtml = false
            };
            mail.To.Add(toEmail);
            await client.SendMailAsync(mail);
        }
    }
}
