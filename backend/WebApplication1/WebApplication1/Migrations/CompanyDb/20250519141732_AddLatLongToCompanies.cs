using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApplication1.Migrations.CompanyDb
{
    public partial class AddLatLongToCompanies : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Adaugă doar coloanele noi fără modificări la cheia primară sau redenumiri
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "companies",
                type: "double",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "companies",
                type: "double",
                nullable: false,
                defaultValue: 0.0);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Elimină coloanele adăugate în Up()
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "companies");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "companies");
        }
    }
}