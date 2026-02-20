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
        public DbSet<DoctorSpecialty> DoctorSpecialties => Set<DoctorSpecialty>();

        public DbSet<EmailOtp> EmailOtps => Set<EmailOtp>();
        public DbSet<PharmacyProfile> PharmacyProfiles => Set<PharmacyProfile>();
        public DbSet<PharmacyVerification> PharmacyVerifications => Set<PharmacyVerification>();

        public DbSet<Medicine> Medicines => Set<Medicine>();
        public DbSet<PharmacyMedicine> PharmacyMedicines => Set<PharmacyMedicine>();

        public DbSet<Review> Reviews => Set<Review>();

        public DbSet<Article> Articles => Set<Article>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

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

            builder.Entity<DoctorSpecialty>()
                .HasKey(x => new { x.DoctorId, x.SpecialtyId });

            builder.Entity<Specialty>()
                .HasIndex(x => x.NameAr)
                .IsUnique();

            builder.Entity<Medicine>()
                .HasIndex(x => x.NormalizedName);

            builder.Entity<PharmacyMedicine>()
                .HasIndex(x => new { x.PharmacyId, x.MedicineId })
                .IsUnique();

        }
    }
}
