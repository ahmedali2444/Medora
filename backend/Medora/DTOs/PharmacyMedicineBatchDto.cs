using System;

namespace Medora.DTOs
{
    public class PharmacyMedicineBatchDto
    {
        public int Id { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public int Quantity { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
