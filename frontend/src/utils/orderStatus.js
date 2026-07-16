export function normalizeOrderStatus(status) {
  return String(status || '').replace(/\s+/g, '');
}

export function mapOrderStatusForList(status) {
  const value = normalizeOrderStatus(status).toLowerCase();
  if (value === 'pending' || value === 'accepted') return 'new';
  if (value === 'preparing') return 'preparing';
  if (value === 'readyforpickup') return 'ready';
  if (value === 'outfordelivery') return 'shipping';
  if (value === 'delivered') return 'delivered';
  if (value === 'cancelled') return 'cancelled';
  return 'new';
}

export function getNextOrderStatuses(status) {
  const value = normalizeOrderStatus(status);
  switch (value) {
    case 'Pending':
      return ['Accepted', 'Cancelled'];
    case 'Accepted':
      return ['Preparing', 'Cancelled'];
    case 'Preparing':
      return ['ReadyForPickup', 'OutForDelivery', 'Cancelled'];
    case 'ReadyForPickup':
    case 'OutForDelivery':
      return ['Delivered', 'Cancelled'];
    default:
      return [];
  }
}
