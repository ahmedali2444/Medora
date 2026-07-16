import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  Phone,
  User,
  FileText,
  AlertCircle
} from 'lucide-react';
import { medoraApi } from '../../api/medoraApi';
import { getNextOrderStatuses } from '../../utils/orderStatus';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import PharmacyLayout from '../../components/pharmacy/layout/PharmacyLayout';

export default function PharmacyOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isRtl } = useLocalizedContent();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await medoraApi.getPharmacyOrderById(id);
      setOrder(data);
    } catch {
      setError(isRtl ? 'حدث خطأ أثناء تحميل تفاصيل الطلب' : 'Error loading order details');
    } finally {
      setLoading(false);
    }
  }, [id, isRtl]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setIsUpdating(true);
      await medoraApi.pharmacyUpdateOrderStatus(id, { status: newStatus });
      await fetchOrderDetails();
    } catch {
      alert(isRtl ? 'فشل تحديث حالة الطلب' : 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <PharmacyLayout title={isRtl ? 'تفاصيل الطلب' : 'Order Details'}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </PharmacyLayout>
    );
  }

  if (error || !order) {
    return (
      <PharmacyLayout title={isRtl ? 'تفاصيل الطلب' : 'Order Details'}>
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error || 'Order not found'}</span>
        </div>
      </PharmacyLayout>
    );
  }

  const renderActionButtons = () => {
    let nextStatuses = getNextOrderStatuses(order.status);
    if (order.status === 'Preparing') {
      nextStatuses = order.fulfillment === 'Pickup'
        ? ['ReadyForPickup', 'Cancelled']
        : ['OutForDelivery', 'Cancelled'];
    }

    const labels = {
      Accepted: isRtl ? 'قبول الطلب' : 'Accept Order',
      Preparing: isRtl ? 'بدء التجهيز' : 'Start Preparing',
      ReadyForPickup: isRtl ? 'جاهز للاستلام' : 'Ready for Pickup',
      OutForDelivery: isRtl ? 'خرج للتوصيل' : 'Out for Delivery',
      Delivered: isRtl ? 'اكتمل' : 'Complete',
      Cancelled: isRtl ? 'إلغاء الطلب' : 'Cancel Order',
    };

    if (!nextStatuses.length) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusUpdate(status)}
            disabled={isUpdating}
            className={`px-4 py-2 rounded-lg disabled:opacity-50 ${
              status === 'Cancelled'
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            {labels[status] || status}
          </button>
        ))}
      </div>
    );
  };

  return (
    <PharmacyLayout 
      title={isRtl ? 'تفاصيل الطلب' : 'Order Details'} 
      subtitle={isRtl ? `طلب #${order.orderNumber}` : `Order #${order.orderNumber}`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/pharmacy/orders')}
            className="p-2 hover:bg-white/50 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft className={isRtl ? 'rotate-180' : ''} size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isRtl ? 'طلب #' : 'Order #'}{order.orderNumber}
            </h1>
            <p className="text-slate-500">
              {new Date(order.createdAt).toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
            </p>
          </div>
        </div>
        {renderActionButtons()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {isRtl ? 'حالة الطلب' : 'Order Status'}
            </h3>
            <div className="flex items-center gap-4 text-teal-600 bg-teal-50 p-4 rounded-xl font-medium">
              <Clock size={24} />
              <span className="text-lg">
                {order.status} - {order.fulfillment}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Package size={20} className="text-teal-600" />
              {isRtl ? 'الأدوية' : 'Medicines'}
            </h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-white" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Package size={20} />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.form || 'Medicine'} x {item.quantity}</p>
                    </div>
                  </div>
                  <div className="font-bold text-slate-800">
                    EGP {item.lineTotal.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prescription Reference */}
          {order.prescription && (
            <div className="bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                {isRtl ? 'وصفة طبية مرتبطة' : 'Linked Prescription'}
              </h3>
              <div className="bg-blue-50/50 p-4 rounded-xl space-y-3">
                <p className="font-medium text-slate-800">{isRtl ? 'المريض: ' : 'Patient: '} {order.patientName}</p>
                {order.prescription.diagnosis && (
                  <p className="text-slate-600 text-sm">{isRtl ? 'التشخيص: ' : 'Diagnosis: '} {order.prescription.diagnosis}</p>
                )}
                {order.prescription.notes && (
                  <p className="text-slate-600 text-sm">{isRtl ? 'ملاحظات: ' : 'Notes: '} {order.prescription.notes}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <User size={20} className="text-teal-600" />
              {isRtl ? 'بيانات المريض' : 'Customer Info'}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                <User size={18} />
                <span>{order.patientName}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={18} />
                <a href={`tel:${order.patientPhone}`} className="hover:text-teal-600">{order.patientPhone}</a>
              </div>
              {order.fulfillment === 'Delivery' && (
                <div className="flex items-start gap-3 text-slate-600">
                  <MapPin size={18} className="mt-1 shrink-0" />
                  <span className="text-sm">{order.deliveryAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-teal-600" />
              {isRtl ? 'ملخص الدفع' : 'Payment Summary'}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>{isRtl ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span>EGP {order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{isRtl ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                <span>EGP {order.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between font-bold text-lg text-slate-800">
                <span>{isRtl ? 'الإجمالي' : 'Total'}</span>
                <span className="text-teal-600">EGP {order.total.toFixed(2)}</span>
              </div>
              <div className="pt-3">
                <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                  order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </PharmacyLayout>
  );
}
