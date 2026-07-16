import React, { useEffect, useMemo, useState } from 'react';
import { ScanSearch as Search, Users } from 'lucide-react';
import PharmacyLayout from '../../components/pharmacy/layout/PharmacyLayout';
import SectionCard from '../../components/pharmacy/shared/SectionCard';
import DataTable from '../../components/pharmacy/shared/DataTable';
import { useLocalizedContent } from '../../hooks/useLocalizedContent';
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  localizedText,
} from '../../utils/localization';
import PaginationBar from '../../components/shared/PaginationBar';
import { medoraApi } from '../../api/medoraApi';

const COPY = {
  title: localizedText('العملاء', 'Customers'),
  subtitle: localizedText('عرض قاعدة العملاء وسجل تعاملهم مع الصيدلية', 'View your customer base and their order history'),
  totalCustomers: localizedText('إجمالي العملاء', 'Total customers'),
  customerBase: localizedText('قاعدة العملاء', 'Customer base'),
  customerCount: localizedText('عميل', 'customers'),
  searchPlaceholder: localizedText('ابحث بالاسم أو الهاتف...', 'Search by name or phone...'),
  customer: localizedText('العميل', 'Customer'),
  orders: localizedText('عدد الطلبات', 'Orders'),
  totalSpent: localizedText('إجمالي الإنفاق', 'Total spend'),
  lastOrder: localizedText('آخر طلب', 'Last order'),
};

const PAGE_SIZE = 20;

function StatBox({ label, value, tone, Icon }) {
  const { text } = useLocalizedContent();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e4eeee] bg-white p-4 shadow-[0_8px_22px_rgba(41,93,96,0.06)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${tone}1a`, color: tone }}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      <div>
        <div className="text-[18px] font-black text-[#084036]">{value}</div>
        <div className="text-[11px] text-[#486466]">{text(label)}</div>
      </div>
    </div>
  );
}

export default function PharmacyCustomers() {
  const { lang, text, isRtl } = useLocalizedContent();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [ui, setUi] = useState({ loading: true, error: '' });
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setUi({ loading: true, error: '' });
    });
    const timer = setTimeout(() => {
      medoraApi.pharmacyCustomers({ page, pageSize: PAGE_SIZE, search: query.trim() || undefined })
        .then((data) => {
          if (!mounted) return;
          const items = Array.isArray(data?.items) ? data.items : [];
          setCustomers(items.map((item) => ({
            id: item.id || item.phone,
            name: localizedText(item.name || '', item.name || ''),
            phone: item.phone || '',
            orders: Number(item.orders || 0),
            totalSpent: Number(item.totalSpent || 0),
            lastOrder: item.lastOrder?.slice(0, 10) || '',
          })));
          setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length);
          setUi({ loading: false, error: '' });
        })
        .catch((error) => {
          if (!mounted) return;
          setCustomers([]);
          setTotal(0);
          setUi({ loading: false, error: error.message || 'Unable to load customers' });
        });
    }, 300);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query, page]);

  const filtered = useMemo(() => {
    return customers;
  }, [customers]);

  const columns = [
    {
      key: 'name',
      label: COPY.customer,
      width: '1fr',
      render: (row) => (
        <div className="w-full">
          <div className="text-[12px] font-bold text-[#084036]">{text(row.name)}</div>
          <div dir="ltr" className={`w-full text-[10px] text-slate-500 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{row.phone}</div>
        </div>
      ),
    },
    {
      key: 'orders',
      label: COPY.orders,
      width: '0.8fr',
      align: 'center',
      render: (row) => <span className="text-[12px] font-black text-[#119a8a]">{row.orders}</span>,
    },
    {
      key: 'totalSpent',
      label: COPY.totalSpent,
      width: '0.9fr',
      align: 'center',
      render: (row) => (
        <span className="text-[12px] font-extrabold text-[#084036]">
          {formatLocalizedCurrency(row.totalSpent, lang)}
        </span>
      ),
    },
    {
      key: 'lastOrder',
      label: COPY.lastOrder,
      width: '0.8fr',
      align: 'center',
      render: (row) => <span className="text-[11px] text-slate-600">{formatLocalizedDate(row.lastOrder, lang)}</span>,
    },
  ];

  return (
    <PharmacyLayout title={COPY.title} subtitle={COPY.subtitle}>
      <div className="mb-5 max-w-sm">
        <StatBox label={COPY.totalCustomers} value={total || customers.length} Icon={Users} tone="#14b8a6" />
      </div>

      <SectionCard
        title={COPY.customerBase}
        description={`${filtered.length} ${text(COPY.customerCount)}`}
        icon={Users}
      >
        {ui.error && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">{ui.error}</div>}
        {ui.loading && <div className="mb-4 rounded-xl bg-[#e6f7f7] px-4 py-3 text-xs font-semibold text-[#0e7c6e]">...</div>}
        <div className="relative mb-4">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={text(COPY.searchPlaceholder)}
            className="h-10 w-full rounded-full border border-[#e4eeee] bg-white pr-9 pl-4 text-[12px] outline-none transition focus:border-[#14b8a6]"
          />
          <Search size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#14b8a6]" />
        </div>
        {filtered.length > 0 && <DataTable columns={columns} rows={filtered} />}
        <PaginationBar
          page={page}
          totalPages={totalPages}
          loading={ui.loading}
          onPageChange={setPage}
          isRtl={isRtl}
          text={text}
        />
        {filtered.length === 0 && !ui.loading && (
          <div className="mt-4 rounded-2xl border border-dashed border-[#cfe4e2] bg-[#f7fbfb] p-6 text-center text-[12px] font-bold text-[#486466]">
            {text(localizedText('لا يوجد عملاء حتى الآن.', 'No customers yet.'))}
          </div>
        )}
      </SectionCard>
    </PharmacyLayout>
  );
}
