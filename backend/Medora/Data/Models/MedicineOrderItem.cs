using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Medora.Data.Models
{
    public class MedicineOrderItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int MedicineOrderId { get; set; }

        [ForeignKey(nameof(MedicineOrderId))]
        public MedicineOrder MedicineOrder { get; set; } = default!;

        [Required]
        public int MedicineId { get; set; }

        [ForeignKey(nameof(MedicineId))]
        public Medicine Medicine { get; set; } = default!;

        [Range(1, 1000)]
        public int Quantity { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal UnitPrice { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal LineTotal { get; set; }
    }
}
