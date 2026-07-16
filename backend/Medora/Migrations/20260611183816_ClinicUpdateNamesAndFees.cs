using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Medora.Migrations
{
    /// <inheritdoc />
    public partial class ClinicUpdateNamesAndFees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WhatsApp",
                table: "Clinics");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Clinics",
                newName: "NameEn");

            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Clinics",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ReconsultationFee",
                table: "Clinics",
                type: "decimal(10,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "ReconsultationFee",
                table: "Clinics");

            migrationBuilder.RenameColumn(
                name: "NameEn",
                table: "Clinics",
                newName: "Name");

            migrationBuilder.AddColumn<string>(
                name: "WhatsApp",
                table: "Clinics",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);
        }
    }
}
