import React, { useEffect, useState } from 'react';
import { Bike, Clock3, MapPinned, Truck } from 'lucide-react';
import PharmacyLayout from '../../components/pharmacy/layout/PharmacyLayout';
import SectionCard from '../../components/pharmacy/shared/SectionCard';
import DataTable from '../../components/pharmacy/shared/DataTable';
import StatusPill from '../../components/pharmacy/shared/StatusPill';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import { localizedText } from '../../utils/localization';

import {
  DRIVER_STATUS_META,
  ORDER_STATUS_META,
  PENDING_DELIVERY_META,
} from '../../components/pharmacy/data/pharmacyData';
import { medoraApi } from '../../api/medoraApi';

const COPY = {
  title: localizedText('التوصيل', 'Delivery'),
  subtitle: localizedText('إدارة المندوبين والطلبات النشطة أثناء التوصيل', 'Manage couriers and active deliveries'),
  activeDeliveries: localizedText('طلبات قيد التوصيل', 'Active deliveries'),
  deliveryCount: localizedText('عملية', 'deliveries'),
  activeNow: localizedText('نشطة الآن', 'Active now'),
  awaitingAssignment: localizedText('بانتظار إسناد', 'Awaiting assignment'),
  availableDrivers: localizedText('مندوبون متاحون', 'Available couriers'),
  driverStatus: localizedText('حالة المندوبين', 'Courier status'),
  areaCoverage: localizedText('تغطية المناطق الحالية', 'Current coverage areas'),
  order: localizedText('الطلب', 'Order'),
  customer: localizedText('العميل', 'Customer'),
  driver: localizedText('المندوب', 'Courier'),
  distance: localizedText('المسافة', 'Distance'),
  eta: localizedText('الوقت المتوقع', 'ETA'),
  status: localizedText('الحالة', 'Status'),
  awaitingDriver: localizedText('بانتظار الإسناد', 'Awaiting assignment'),
  deliveries: localizedText('توصيل', 'deliveries'),
};

function MiniTile({ label, value, Icon, tone }) {
  const { text } = useLocalizedContent();

  return (
    <div className="rounded-2xl border border-[#e4eeee] bg-white p-4 text-center">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
        {Icon ? <Icon size={15} /> : null}
      </div>
      <div className="text-[18px] font-black text-[#084036]">{value}</div>
      <div className="text-[11px] text-slate-500">{text(label)}</div>
    </div>
  );
}

export default function PharmacyDelivery() {
  const { text } = useLocalizedContent();
  const [deliveries, setDeliveries] = useState([]);
  // BUG-04 FIX: drivers state instead of const [] — extracted from delivery data
  const [drivers, setDrivers] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '' });

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setUi({ loading: true, error: '' });
    });
    medoraApi.pharmacyDelivery()
      .then((data) => {
        if (!mounted) return;
        const deliveryList = Array.isArray(data) ? data : [];
        setDeliveries(deliveryList.map(mapDelivery));
        // BUG-04 FIX: extract unique drivers from delivery data
        const driverMap = new Map();
        deliveryList.forEach((item) => {
          const driverKey = item.courierId || item.courierName;
          if (item.courierName && driverKey && !driverMap.has(driverKey)) {
            driverMap.set(driverKey, {
              id: item.courierId || driverKey,
              name: localizedText(item.courierName, item.courierName),
              phone: item.courierPhone || '',
              status: item.courierStatus || (item.status === 'OutForDelivery' ? 'on-route' : 'available'),
              deliveries: item.courierDeliveries || 0,
              rating: Number(item.courierRating || 0),
              area: localizedText(item.courierArea || '', item.courierArea || ''),
            });
          }
        });
        setDrivers(Array.from(driverMap.values()));
        setUi({ loading: false, error: '' });
      })
      .catch((error) => {
        if (!mounted) return;
        setDeliveries([]);
        setDrivers([]);
        setUi({ loading: false, error: error.message || 'Unable to load deliveries' });
      });

    return () => { mounted = false; };
  }, []);

  const columns = [
    {
      key: 'order',
      label: COPY.order,
      width: '0.8fr',
      align: 'center',
      render: (row) => <span dir="ltr" className="text-[12px] font-extrabold text-[#084036]">{row.order}</span>,
    },
    {
      key: 'customer',
      label: COPY.customer,
      width: '1fr',
      render: (row) => <span className="text-[12px] font-bold text-[#084036]">{text(row.customer)}</span>,
    },
    {
      key: 'driver',
      label: COPY.driver,
      width: '1fr',
      render: (row) => (
        <span className="text-[11px] text-slate-600">
          {row.driver ? text(row.driver) : text(COPY.awaitingDriver)}
        </span>
      ),
    },
    {
      key: 'distance',
      label: COPY.distance,
      width: '0.7fr',
      align: 'center',
      render: (row) => <span className="text-[11px] text-slate-600">{text(row.distance)}</span>,
    },
    {
      key: 'eta',
      label: COPY.eta,
      width: '0.8fr',
      align: 'center',
      render: (row) => <span className="text-[11px] font-bold text-[#119a8a]">{text(row.eta)}</span>,
    },
    {
      key: 'status',
      label: COPY.status,
      width: '0.8fr',
      align: 'center',
      render: (row) => (
        <StatusPill meta={row.status === 'pending' ? PENDING_DELIVERY_META : ORDER_STATUS_META[row.status]} />
      ),
    },
  ];

  return (
    <PharmacyLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title={COPY.activeDeliveries}
          description={`${deliveries.length} ${text(COPY.deliveryCount)}`}
          icon={Truck}
        >
          {ui.error && <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{ui.error}</div>}
          {ui.loading && <div className="mb-3 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <MiniTile
              label={COPY.activeNow}
              value={deliveries.filter((delivery) => delivery.status === 'shipping').length}
              Icon={Truck}
              tone="#14b8a6"
            />
            <MiniTile
              label={COPY.awaitingAssignment}
              value={deliveries.filter((delivery) => !delivery.driver).length}
              Icon={Clock3}
              tone="#f59e0b"
            />
            <MiniTile
              label={COPY.availableDrivers}
              value={drivers.filter((driver) => driver.status === 'available').length}
              Icon={Bike}
              tone="#6366f1"
            />
          </div>
          {deliveries.length > 0 && <DataTable columns={columns} rows={deliveries} />}
          {deliveries.length === 0 && !ui.loading && (
            <div className="mt-4 rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center text-[12px] font-bold text-[#486466]">
              {text(localizedText('لا توجد عمليات توصيل مربوطة بالمنصة حتى الآن.', 'No deliveries are connected to the platform yet.'))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={COPY.driverStatus} description={COPY.areaCoverage} icon={MapPinned}>
          <div className="flex flex-col gap-3">
            {drivers.map((driver) => (
              <div key={driver.id} className="rounded-2xl border border-[#e4eeee] bg-[#f7fbfb] p-4">
                <div className="flex items-center justify-between gap-3">
                  <StatusPill meta={DRIVER_STATUS_META[driver.status]} />
                  <div className="text-start">
                    <div className="text-[13px] font-extrabold text-[#084036]">{text(driver.name)}</div>
                    <div dir="ltr" className="text-[10px] text-slate-500">{driver.phone}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{text(driver.area)}</span>
                  <span>
                    {driver.deliveries} {text(COPY.deliveries)}
                  </span>
                  <span>{driver.rating} ★</span>
                </div>
              </div>
            ))}
            {drivers.length === 0 && !ui.loading && (
              <div className="rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center text-[12px] font-bold text-[#486466]">
                {text(localizedText('لا توجد بيانات مندوبين حتى الآن.', 'No courier data yet.'))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </PharmacyLayout>
  );
}

function mapDeliveryStatus(status, orderStatus) {
  const task = String(status || '').toLowerCase();
  const order = String(orderStatus || '').toLowerCase();
  if (task === 'pending' || order === 'pending' || order === 'accepted' || order === 'preparing') return 'pending';
  if (task === 'outfordelivery' || order === 'outfordelivery') return 'shipping';
  if (task === 'delivered' || order === 'delivered') return 'delivered';
  if (task === 'cancelled' || order === 'cancelled') return 'cancelled';
  return 'pending';
}

function mapDelivery(item) {
  return {
    id: item.id,
    order: item.orderNumber || `ORD-${item.orderId}`,
    customer: localizedText(item.customer || '', item.customer || ''),
    driver: item.courierName ? localizedText(item.courierName, item.courierName) : null,
    distance: localizedText(item.distanceKm ? `${item.distanceKm} كم` : '—', item.distanceKm ? `${item.distanceKm} km` : '—'),
    eta: localizedText(item.etaMinutes ? `${item.etaMinutes} دقيقة` : '—', item.etaMinutes ? `${item.etaMinutes} min` : '—'),
    status: mapDeliveryStatus(item.status, item.orderStatus),
  };
}
