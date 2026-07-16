import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Package, Star, Store, Truck } from 'lucide-react';
import { medoraApi } from '../../api/medoraApi';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { formatLocalizedCurrency, formatLocalizedDate } from '../../utils/localization';
import PaginationBar from '../../components/shared/PaginationBar';
import PatientNotificationBell from '../../components/patient/PatientNotificationBell';
import AddMedicineReviewModal from '../../components/patient/AddMedicineReviewModal';

const PAGE_SIZE = 10;

const COPY = {
  title: { ar: 'طلباتي', en: 'My Orders' },
  subtitle: { ar: 'متابعة طلبات الأدوية وحالتها', en: 'Track your medicine orders and their status' },
  empty: { ar: 'لا توجد طلبات حتى الآن', en: 'No orders yet' },
  orderNumber: { ar: 'رقم الطلب', en: 'Order' },
  pharmacy: { ar: 'الصيدلية', en: 'Pharmacy' },
  total: { ar: 'الإجمالي', en: 'Total' },
  items: { ar: 'الأصناف', en: 'Items' },
  review: { ar: 'تقييم', en: 'Review' },
  reviewed: { ar: 'تم التقييم', en: 'Reviewed' },
  loadError: { ar: 'تعذر تحميل الطلبات', en: 'Unable to load orders' },
};

const STATUS_COPY = {
  Pending: { ar: 'قيد المراجعة', en: 'Pending' },
  Accepted: { ar: 'مقبول', en: 'Accepted' },
  Preparing: { ar: 'قيد التحضير', en: 'Preparing' },
  ReadyForPickup: { ar: 'جاهز للاستلام', en: 'Ready for pickup' },
  OutForDelivery: { ar: 'في الطريق', en: 'Out for delivery' },
  Delivered: { ar: 'تم التسليم', en: 'Delivered' },
  Cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

function statusLabel(status, lang) {
  return STATUS_COPY[status]?.[lang] || status;
}

function statusClass(status) {
  switch (status) {
    case 'Delivered':
      return 'bg-[#e6f7f7] text-[#0e7c6e]';
    case 'Cancelled':
      return 'bg-red-50 text-red-600';
    case 'Pending':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-[#eef8f7] text-[#295d60]';
  }
}

export default function PatientOrders() {
  const { lang, text, isRtl } = useLocalizedContent();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [medicineReviews, setMedicineReviews] = useState([]);
  const [reviewModal, setReviewModal] = useState(null);

  const reviewedKeys = useMemo(() => {
    const keys = new Set();
    medicineReviews.forEach((review) => {
      if (review.medicineOrderId && review.medicineId) {
        keys.add(`${review.medicineOrderId}:${review.medicineId}`);
      }
    });
    return keys;
  }, [medicineReviews]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ordersRes, reviewsRes] = await Promise.all([
        medoraApi.myOrders({ page, pageSize: PAGE_SIZE }),
        medoraApi.myReviews(),
      ]);
      setOrders(Array.isArray(ordersRes?.items) ? ordersRes.items : []);
      setTotal(Number(ordersRes?.total ?? 0));
      setMedicineReviews(
        (Array.isArray(reviewsRes) ? reviewsRes : []).filter((review) => review.targetType === 'Medicine'),
      );
    } catch (err) {
      setError(err?.message || text(COPY.loadError));
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, text]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleReviewSuccess = (medicineId) => {
    if (!reviewModal) return;
    setMedicineReviews((prev) => [
      ...prev,
      {
        targetType: 'Medicine',
        medicineOrderId: reviewModal.medicineOrderId,
        medicineId,
      },
    ]);
    setReviewModal(null);
  };

  return (
    <div style={{ fontFamily: 'Cairo, sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#084036]">{text(COPY.title)}</h1>
        <p className="mt-1 text-sm text-slate-500">{text(COPY.subtitle)}</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#e4eeee] bg-white p-8 text-center text-sm text-slate-500">
          {isRtl ? 'جارٍ التحميل...' : 'Loading...'}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">{error}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-[#e4eeee] bg-white p-10 text-center">
          <Package size={40} className="mx-auto text-[#14b8a6]" />
          <p className="mt-4 text-sm font-bold text-slate-600">{text(COPY.empty)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-[#e4eeee] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-400">{text(COPY.orderNumber)}</div>
                  <div className="text-base font-black text-[#084036]">{order.orderNumber}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatLocalizedDate(order.createdAt, lang)}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(order.status)}`}>
                  {statusLabel(order.status, lang)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Store size={16} className="text-[#14b8a6]" />
                  <span>{order.pharmacyName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  {order.fulfillment === 'Delivery' ? <Truck size={16} className="text-[#14b8a6]" /> : <Package size={16} className="text-[#14b8a6]" />}
                  <span>{order.fulfillment === 'Delivery' ? (isRtl ? 'توصيل' : 'Delivery') : (isRtl ? 'استلام' : 'Pickup')}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-dashed border-[#e4eeee] pt-4">
                <div className="mb-2 text-xs font-bold text-slate-400">{text(COPY.items)}</div>
                <ul className="space-y-2">
                  {(order.items || []).map((item) => {
                    const reviewKey = `${order.id}:${item.medicineId}`;
                    const canReview = order.status === 'Delivered' && !reviewedKeys.has(reviewKey);
                    const isReviewed = reviewedKeys.has(reviewKey);

                    return (
                      <li key={item.medicineId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f8fcfc] px-3 py-2">
                        <div>
                          <div className="text-sm font-bold text-[#084036]">{item.name}</div>
                          <div className="text-xs text-slate-500">
                            {item.quantity} × {formatLocalizedCurrency(item.unitPrice, lang)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#295d60]">{formatLocalizedCurrency(item.lineTotal, lang)}</span>
                          {canReview && (
                            <button
                              type="button"
                              onClick={() => setReviewModal({
                                medicineOrderId: order.id,
                                medicineId: item.medicineId,
                                medicineName: item.name,
                              })}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#14b8a6] px-2.5 py-1 text-[11px] font-bold text-white"
                            >
                              <Star size={12} />
                              {text(COPY.review)}
                            </button>
                          )}
                          {isReviewed && (
                            <span className="text-[11px] font-bold text-[#0e7c6e]">{text(COPY.reviewed)}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-4 flex justify-between border-t border-[#e4eeee] pt-3 text-sm">
                <span className="font-bold text-slate-500">{text(COPY.total)}</span>
                <span className="text-lg font-black text-[#084036]">{formatLocalizedCurrency(order.total, lang)}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="mt-6">
          <PaginationBar page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}

      {reviewModal && (
        <AddMedicineReviewModal
          medicineOrderId={reviewModal.medicineOrderId}
          medicineId={reviewModal.medicineId}
          medicineName={reviewModal.medicineName}
          onClose={() => setReviewModal(null)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}
