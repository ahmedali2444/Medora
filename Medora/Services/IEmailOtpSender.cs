namespace Medora.Services
{
    public interface IEmailOtpSender
    {
        Task SendOtpAsync(
            string toEmail,
            string subject,
            string message,
            CancellationToken ct = default);
    }
}
