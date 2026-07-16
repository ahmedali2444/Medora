using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Medora.Migrations
{
    public partial class AddMedicineMetadata : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Medicines",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Company",
                table: "Medicines",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DosageAr",
                table: "Medicines",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DosageEn",
                table: "Medicines",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InteractionsJson",
                table: "Medicines",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SymptomsJson",
                table: "Medicines",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UsagesJson",
                table: "Medicines",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WarningsJson",
                table: "Medicines",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Category", table: "Medicines");
            migrationBuilder.DropColumn(name: "Company", table: "Medicines");
            migrationBuilder.DropColumn(name: "DosageAr", table: "Medicines");
            migrationBuilder.DropColumn(name: "DosageEn", table: "Medicines");
            migrationBuilder.DropColumn(name: "InteractionsJson", table: "Medicines");
            migrationBuilder.DropColumn(name: "SymptomsJson", table: "Medicines");
            migrationBuilder.DropColumn(name: "UsagesJson", table: "Medicines");
            migrationBuilder.DropColumn(name: "WarningsJson", table: "Medicines");
        }
    }
}
