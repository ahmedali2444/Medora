using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Medora.Migrations
{
    /// <inheritdoc />
    public partial class AddPreferredLanguageAndMedicineReviewTarget : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bypassed manually because columns already exist in the database
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Medicines_MedicineId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_MedicineId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "MedicineId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "PreferredLanguage",
                table: "AspNetUsers");
        }
    }
}
