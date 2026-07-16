using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Medora.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentIsReconsultation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsReconsultation",
                table: "Appointments",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsReconsultation",
                table: "Appointments");
        }
    }
}
