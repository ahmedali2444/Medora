namespace Medora.Services
{
    public interface IEmailOtpSender
    {
        Task SendOtpAsync(string toEmail, string code, CancellationToken ct = default);
    }
}
