using Medora.Data.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Medora.Data
{
    public class AppDbContext : IdentityDbContext<AppUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<DoctorProfile> DoctorProfiles => Set<DoctorProfile>();
        public DbSet<DoctorVerification> DoctorVerifications => Set<DoctorVerification>();
        public DbSet<Clinic> Clinics => Set<Clinic>();
        public DbSet<ClinicWorkingHour> ClinicWorkingHours => Set<ClinicWorkingHour>();
        public DbSet<Specialty> Specialties => Set<Specialty>();
        public DbSet<EmailOtp> EmailOtps => Set<EmailOtp>();
        public DbSet<PasswordResetOtp> PasswordResetOtps => Set<PasswordResetOtp>();

        public DbSet<Governorate> Governorates => Set<Governorate>();
        public DbSet<City> Cities => Set<City>();
        public DbSet<PharmacyProfile> PharmacyProfiles => Set<PharmacyProfile>();
        public DbSet<PharmacyVerification> PharmacyVerifications => Set<PharmacyVerification>();

        public DbSet<Medicine> Medicines => Set<Medicine>();
        public DbSet<PharmacyMedicine> PharmacyMedicines => Set<PharmacyMedicine>();
        public DbSet<PharmacyMedicineBatch> PharmacyMedicineBatches => Set<PharmacyMedicineBatch>();

        public DbSet<Review> Reviews => Set<Review>();

        public DbSet<Article> Articles => Set<Article>();
        public DbSet<FavoriteDoctor> FavoriteDoctors => Set<FavoriteDoctor>();
        public DbSet<FavoritePharmacy> FavoritePharmacies => Set<FavoritePharmacy>();
        public DbSet<RecentlyViewedItem> RecentlyViewedItems => Set<RecentlyViewedItem>();
        public DbSet<UserReport> UserReports => Set<UserReport>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
        public DbSet<SearchLog> SearchLogs => Set<SearchLog>();
        public DbSet<Appointment> Appointments => Set<Appointment>();
        public DbSet<Prescription> Prescriptions => Set<Prescription>();
        public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();
        public DbSet<MedicineOrder> MedicineOrders => Set<MedicineOrder>();
        public DbSet<MedicineOrderItem> MedicineOrderItems => Set<MedicineOrderItem>();
        public DbSet<DeliveryTask> DeliveryTasks => Set<DeliveryTask>();
        public DbSet<FavoriteMedicine> FavoriteMedicines => Set<FavoriteMedicine>();
        public DbSet<UserSession> UserSessions => Set<UserSession>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<AppUser>()
                .Property(x => x.IsActive)
                .HasDefaultValue(true);

            builder.Entity<AppUser>()
                .Property(x => x.CreatedAt)
                .HasDefaultValueSql("GETUTCDATE()");

            builder.Entity<DoctorProfile>()
                .Property(x => x.AvailabilityStatus)
                .HasDefaultValue("available");

            builder.Entity<PharmacyProfile>()
                .Property(x => x.Status)
                .HasDefaultValue("open");

            builder.Entity<DoctorProfile>()
                .HasIndex(x => x.UserId)
                .IsUnique();

            builder.Entity<PharmacyProfile>()
                .HasIndex(x => x.UserId)
                .IsUnique();

            builder.Entity<DoctorVerification>()
                .HasIndex(x => x.DoctorId)
                .IsUnique();

            builder.Entity<Clinic>()
                .HasOne(x => x.Doctor)
                .WithMany(d => d.Clinics)
                .HasForeignKey(x => x.DoctorId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ClinicWorkingHour>()
                .HasOne(x => x.Clinic)
                .WithMany(c => c.WorkingHours)
                .HasForeignKey(x => x.ClinicId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<PharmacyVerification>()
                .HasIndex(x => x.PharmacyId)
                .IsUnique();

            builder.Entity<Specialty>()
                .HasIndex(x => x.NameAr)
                .IsUnique();

            builder.Entity<Medicine>()
                .HasIndex(x => x.NormalizedName);

            builder.Entity<PharmacyMedicine>()
                .HasIndex(x => new { x.PharmacyId, x.MedicineId })
                .IsUnique();

            builder.Entity<PharmacyMedicine>()
                .Property(x => x.ReorderLevel)
                .HasDefaultValue(5);

            builder.Entity<MedicineOrder>()
                .HasIndex(x => x.OrderNumber)
                .IsUnique();

            builder.Entity<Prescription>()
                .HasIndex(x => x.PrescriptionNumber)
                .IsUnique();

            builder.Entity<Prescription>()
                .HasIndex(x => x.AppointmentId)
                .IsUnique()
                .HasFilter("[AppointmentId] IS NOT NULL");

            builder.Entity<DoctorProfile>()
                .HasIndex(x => x.LicenseNumber)
                .IsUnique();

            builder.Entity<PharmacyProfile>()
                .HasIndex(x => x.LicenseNumber)
                .IsUnique();

            builder.Entity<Review>()
                .HasOne(r => r.Reviewer)
                .WithMany()
                .HasForeignKey(r => r.ReviewerUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Review>()
                .HasOne(r => r.Doctor)
                .WithMany(d => d.Reviews)
                .HasForeignKey(r => r.DoctorId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<Review>()
                .HasOne(r => r.Pharmacy)
                .WithMany(p => p.Reviews)
                .HasForeignKey(r => r.PharmacyId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<Review>()
                .HasOne(r => r.Appointment)
                .WithMany()
                .HasForeignKey(r => r.AppointmentId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<Review>()
                .HasOne(r => r.Medicine)
                .WithMany(m => m.Reviews)
                .HasForeignKey(r => r.MedicineId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<Review>()
                .HasOne(r => r.MedicineOrder)
                .WithMany()
                .HasForeignKey(r => r.MedicineOrderId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<Article>()
                .HasOne(a => a.AuthorDoctor)
                .WithMany(d => d.Articles)
                .HasForeignKey(a => a.AuthorDoctorId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<FavoriteDoctor>()
                .HasIndex(x => new { x.UserId, x.DoctorId })
                .IsUnique();

            builder.Entity<FavoriteDoctor>()
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<FavoriteDoctor>()
                .HasOne(x => x.Doctor)
                .WithMany()
                .HasForeignKey(x => x.DoctorId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<FavoritePharmacy>()
                .HasIndex(x => new { x.UserId, x.PharmacyId })
                .IsUnique();

            builder.Entity<FavoritePharmacy>()
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<FavoritePharmacy>()
                .HasOne(x => x.Pharmacy)
                .WithMany()
                .HasForeignKey(x => x.PharmacyId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<FavoriteMedicine>()
                .HasIndex(x => new { x.UserId, x.MedicineId })
                .IsUnique();

            builder.Entity<FavoriteMedicine>()
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<FavoriteMedicine>()
                .HasOne(x => x.Medicine)
                .WithMany()
                .HasForeignKey(x => x.MedicineId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<RecentlyViewedItem>()
                .HasIndex(x => new { x.UserId, x.TargetType, x.TargetId })
                .IsUnique();

            builder.Entity<UserReport>()
                .HasOne(x => x.Reporter)
                .WithMany()
                .HasForeignKey(x => x.ReporterUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Notification>()
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<AuditLog>()
                .HasOne(x => x.Actor)
                .WithMany()
                .HasForeignKey(x => x.ActorUserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<SearchLog>()
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Appointment>()
                .HasOne(x => x.Patient)
                .WithMany()
                .HasForeignKey(x => x.PatientUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Appointment>()
                .HasOne(x => x.Doctor)
                .WithMany()
                .HasForeignKey(x => x.DoctorId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Appointment>()
                .HasOne(x => x.Clinic)
                .WithMany()
                .HasForeignKey(x => x.ClinicId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<UserSession>()
                .HasIndex(x => x.TokenId)
                .IsUnique();

            builder.Entity<UserSession>()
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<PharmacyProfile>()
                .HasOne(p => p.Governorate)
                .WithMany()
                .HasForeignKey(p => p.GovernorateId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<PharmacyProfile>()
                .HasOne(p => p.City)
                .WithMany()
                .HasForeignKey(p => p.CityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Clinic>()
                .HasOne(c => c.Governorate)
                .WithMany()
                .HasForeignKey(c => c.GovernorateId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Clinic>()
                .HasOne(c => c.City)
                .WithMany()
                .HasForeignKey(c => c.CityId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
