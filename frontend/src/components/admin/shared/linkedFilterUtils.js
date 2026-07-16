import { localizedText } from '../../../utils/localization';

export const LINKED_FILTER_KEYS = ['userId', 'doctorId', 'pharmacyId', 'clinicId', 'actorUserId', 'entityType', 'entityId', 'paymentStatus', 'fulfillment', 'dateFrom', 'dateTo', 'sortBy', 'sortDir'];

export const LINKED_FILTER_LABELS = {
  userId: localizedText('المستخدم', 'User'),
  doctorId: localizedText('الطبيب', 'Doctor'),
  pharmacyId: localizedText('الصيدلية', 'Pharmacy'),
  clinicId: localizedText('العيادة', 'Clinic'),
  actorUserId: localizedText('منفذ الإجراء', 'Actor'),
  entityType: localizedText('نوع الكيان', 'Entity type'),
  entityId: localizedText('معرّف الكيان', 'Entity ID'),
  paymentStatus: localizedText('حالة الدفع', 'Payment status'),
  fulfillment: localizedText('طريقة التسليم', 'Fulfillment'),
  dateFrom: localizedText('من تاريخ', 'From'),
  dateTo: localizedText('إلى تاريخ', 'To'),
  sortBy: localizedText('ترتيب حسب', 'Sort by'),
  sortDir: localizedText('اتجاه الترتيب', 'Sort direction'),
};

export function readLinkedFilters(searchParams) {
  return LINKED_FILTER_KEYS.reduce((filters, key) => {
    const value = searchParams.get(key);
    if (value) filters[key] = value;
    return filters;
  }, {});
}
