using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Medora.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewReplyAndNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Reply",
                table: "Reviews",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReplyCreatedAt",
                table: "Reviews",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NotificationPreferences",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Reply",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "ReplyCreatedAt",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "NotificationPreferences",
                table: "AspNetUsers");
        }
    }
}
