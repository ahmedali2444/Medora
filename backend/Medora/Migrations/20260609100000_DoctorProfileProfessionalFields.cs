using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Medora.Migrations
{
    public partial class DoctorProfileProfessionalFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ExperienceYears",
                table: "DoctorProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Languages",
                table: "DoctorProfiles",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExperienceYears",
                table: "DoctorProfiles");

            migrationBuilder.DropColumn(
                name: "Languages",
                table: "DoctorProfiles");
        }
    }
}
