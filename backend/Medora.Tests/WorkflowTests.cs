using Medora.Data.Models;
using Medora.Services;

namespace Medora.Tests;

public class WorkflowTests
{
    [Theory]
    [InlineData(MedicineOrderStatus.Pending, MedicineOrderStatus.Accepted, MedicineOrderFulfillment.Delivery, true)]
    [InlineData(MedicineOrderStatus.Pending, MedicineOrderStatus.Cancelled, MedicineOrderFulfillment.Delivery, true)]
    [InlineData(MedicineOrderStatus.Accepted, MedicineOrderStatus.Preparing, MedicineOrderFulfillment.Delivery, true)]
    [InlineData(MedicineOrderStatus.Preparing, MedicineOrderStatus.OutForDelivery, MedicineOrderFulfillment.Delivery, true)]
    [InlineData(MedicineOrderStatus.Preparing, MedicineOrderStatus.ReadyForPickup, MedicineOrderFulfillment.Pickup, true)]
    [InlineData(MedicineOrderStatus.ReadyForPickup, MedicineOrderStatus.Delivered, MedicineOrderFulfillment.Pickup, true)]
    [InlineData(MedicineOrderStatus.OutForDelivery, MedicineOrderStatus.Delivered, MedicineOrderFulfillment.Delivery, true)]
    [InlineData(MedicineOrderStatus.ReadyForPickup, MedicineOrderStatus.Accepted, MedicineOrderFulfillment.Pickup, false)]
    [InlineData(MedicineOrderStatus.OutForDelivery, MedicineOrderStatus.Preparing, MedicineOrderFulfillment.Delivery, false)]
    [InlineData(MedicineOrderStatus.Delivered, MedicineOrderStatus.Cancelled, MedicineOrderFulfillment.Delivery, false)]
    public void CanTransition_OrderStatus_AllowsOnlyForwardOrCancelTransitions(
        MedicineOrderStatus current,
        MedicineOrderStatus next,
        MedicineOrderFulfillment fulfillment,
        bool expected)
    {
        Assert.Equal(expected, OrderWorkflow.CanTransition(current, next, fulfillment));
    }

    [Theory]
    [InlineData(PrescriptionStatus.New, PrescriptionStatus.Reviewing, true)]
    [InlineData(PrescriptionStatus.New, PrescriptionStatus.Approved, true)]
    [InlineData(PrescriptionStatus.New, PrescriptionStatus.Rejected, true)]
    [InlineData(PrescriptionStatus.Reviewing, PrescriptionStatus.Approved, true)]
    [InlineData(PrescriptionStatus.Reviewing, PrescriptionStatus.Rejected, true)]
    [InlineData(PrescriptionStatus.Reviewing, PrescriptionStatus.Fulfilled, false)]
    [InlineData(PrescriptionStatus.Approved, PrescriptionStatus.Fulfilled, true)]
    [InlineData(PrescriptionStatus.Rejected, PrescriptionStatus.Approved, false)]
    public void CanTransition_PrescriptionStatus_BlocksPrematureFulfillment(
        PrescriptionStatus current,
        PrescriptionStatus next,
        bool expected)
    {
        Assert.Equal(expected, OrderWorkflow.CanTransition(current, next));
    }
}
