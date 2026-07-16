using System;
using System.ComponentModel.DataAnnotations;

namespace Medora.DTOs
{
    public class AddMedicineBatchDto
    {
        public string? BatchNumber { get; set; }

        public DateTime? ExpiryDate { get; set; }

        [Required]
        [Range(1, 100000)]
        public int Quantity { get; set; }
    }
}
