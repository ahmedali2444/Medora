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

        public async Task SendOtpAsync(string toEmail, string code, CancellationToken ct = default)
        {
            using var client = new SmtpClient(_settings.Host, _settings.Port)
            {
                EnableSsl = _settings.EnableSsl,
                Credentials = new NetworkCredential(_settings.Username, _settings.AppPassword)
            };

            var subject = "Medora OTP Verification Code";
            var body = $@"
رمز التحقق الخاص بك هو: {code}

الرمز صالح لمدة 10 دقائق.
إذا لم تطلب هذا الرمز تجاهل الرسالة.
";

            using var msg = new MailMessage
            {
                From = new MailAddress(_settings.FromEmail, _settings.FromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = false
            };
            msg.To.Add(toEmail);

            await client.SendMailAsync(msg);
        }
    }
}
