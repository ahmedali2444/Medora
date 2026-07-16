using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Medora.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicAppointmentDurationMinutes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AppointmentDurationMinutes",
                table: "Clinics",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppointmentDurationMinutes",
                table: "Clinics");
        }
    }
}
