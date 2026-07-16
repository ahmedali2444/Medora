import React from 'react';
import { useLang } from '../../../context/LanguageContext';
import { formatLocalizedNumber, getLocalizedText, localizedText } from '../../../utils/localization';

const COPY = {
  loading: localizedText('جارٍ تحميل البيانات...', 'Loading data...'),
  previous: localizedText('السابق', 'Previous'),
  next: localizedText('التالي', 'Next'),
  page: localizedText('صفحة', 'Page'),
  of: localizedText('من', 'of'),
};

function alignmentClasses(align = 'start') {
  if (align === 'center') {
    return {
      text: 'text-center',
      content: 'justify-center text-center',
    };
  }

  if (align === 'end') {
    return {
      text: 'text-end',
      content: 'justify-end text-end',
    };
  }

  return {
    text: 'text-start',
    content: 'justify-start text-start',
  };
}

function getColumnWidths(columns) {
  const weights = columns.map((column) => {
    const value = Number.parseFloat(column.width);
    return Number.isFinite(value) && value > 0 ? value : 1;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map((value) => `${(value / total) * 100}%`);
}

export default function DataTable({
  columns,
  rows,
  onRowClick,
  empty,
  keyField = 'id',
  loading = false,
  error = '',
  pagination,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId,
}) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const emptyText = empty || (isRtl ? 'لا توجد بيانات' : 'No data available');
  const hintText = isRtl
    ? 'جرّب تغيير الفلاتر أو البحث عن شيء آخر.'
    : 'Try adjusting the filters or search for something else.';
  const columnWidths = getColumnWidths(columns);
  const tableMinWidth = Math.max(columns.length * 110 + (selectable ? 48 : 0), 680);
  const resolveRowId = (row) => (getRowId ? getRowId(row) : row[keyField]);
  const pageRowIds = rows.map(resolveRowId);
  const selectedKeySet = new Set(selectedIds.map((id) => String(id)));
  const allPageSelected = selectable && pageRowIds.length > 0 && pageRowIds.every((id) => selectedKeySet.has(String(id)));

  const updateSelection = (nextIds) => {
    onSelectionChange?.(nextIds);
  };

  const toggleRow = (row, checked) => {
    const rowId = resolveRowId(row);
    const current = new Map(selectedIds.map((id) => [String(id), id]));
    if (checked) current.set(String(rowId), rowId);
    else current.delete(String(rowId));
    updateSelection(Array.from(current.values()));
  };

  const togglePage = (checked) => {
    const current = new Map(selectedIds.map((id) => [String(id), id]));
    pageRowIds.forEach((id) => {
      if (checked) current.set(String(id), id);
      else current.delete(String(id));
    });
    updateSelection(Array.from(current.values()));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4eeee]">
      {loading ? (
        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#14b8a6] border-t-transparent" />
          <div className="text-[12px] font-bold text-[#486466]">{getLocalizedText(COPY.loading, lang)}</div>
        </div>
      ) : error ? (
        <div className="px-4 py-10 text-center">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-700">
            {error}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
          <div className="text-[13px] font-bold text-[#084036]">{emptyText}</div>
          <div className="text-[11px] text-slate-500">{hintText}</div>
        </div>
      ) : (
        <>
          <div className="lg:hidden">
            {rows.map((row) => (
              <div
                key={row[keyField]}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onRowClick(row);
                  }
                } : undefined}
                className={`grid grid-cols-1 gap-2 border-b border-[#f1f7f7] bg-white px-4 py-3 text-[12px] last:border-b-0 ${
                  onRowClick ? 'transition hover:bg-[#f7fbfb]' : ''
                }`}
              >
                {selectable && (
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-[#eef5f5] bg-[#fbfefe] px-3 py-2 text-[11px] font-bold text-[#486466]">
                    <span>{isRtl ? 'اختيار الصف' : 'Select row'}</span>
                    <input
                      type="checkbox"
                      checked={selectedKeySet.has(String(resolveRowId(row)))}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => toggleRow(row, event.target.checked)}
                    />
                  </label>
                )}
                {columns.map((col) => (
                  <div key={col.key} className="flex min-w-0 items-start justify-between gap-3">
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {getLocalizedText(col.label, lang, col.label)}
                    </span>
                    <div className="min-w-0 max-w-[68%] break-words text-start">
                      {col.render ? col.render(row) : row[col.key]}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full table-fixed border-collapse" style={{ minWidth: tableMinWidth }}>
              <colgroup>
                {selectable && <col style={{ width: 48 }} />}
                {columns.map((column, index) => (
                  <col key={column.key} style={{ width: columnWidths[index] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-[#e4eeee] bg-[#f7fbfb]">
                  {selectable && (
                    <th scope="col" className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={(event) => togglePage(event.target.checked)}
                        aria-label={isRtl ? 'اختيار كل الصفوف في الصفحة' : 'Select all rows on this page'}
                      />
                    </th>
                  )}
                  {columns.map((col) => {
                    const alignment = alignmentClasses(col.align);
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        className={`px-3 py-3 text-[11px] font-bold text-[#486466] ${alignment.text}`}
                      >
                        {getLocalizedText(col.label, lang, col.label)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row[keyField]}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`border-b border-[#f1f7f7] bg-white text-[12px] last:border-b-0 ${
                      onRowClick ? 'transition hover:bg-[#f7fbfb]' : ''
                    }`}
                  >
                    {selectable && (
                      <td className="px-3 py-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={selectedKeySet.has(String(resolveRowId(row)))}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => toggleRow(row, event.target.checked)}
                          aria-label={isRtl ? 'اختيار الصف' : 'Select row'}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const alignment = alignmentClasses(col.align);
                      return (
                        <td key={col.key} className={`min-w-0 px-3 py-3 align-middle ${alignment.text}`}>
                          <div className={`flex w-full min-w-0 items-center break-words ${alignment.content}`}>
                            {col.render ? col.render(row) : row[col.key]}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {pagination && !loading && !error && (
        <div className="flex flex-col gap-3 border-t border-[#f1f7f7] bg-[#fbfefe] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] font-bold text-[#486466]">
            {getLocalizedText(COPY.page, lang)} {formatLocalizedNumber(pagination.page, lang)} {getLocalizedText(COPY.of, lang)}{' '}
            {formatLocalizedNumber(Math.max(pagination.totalPages || 1, 1), lang)}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange?.(pagination.page - 1)}
              className="rounded-xl border border-[#d7ece8] bg-white px-3 py-2 text-[11px] font-bold text-[#119a8a] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {getLocalizedText(COPY.previous, lang)}
            </button>
            <button
              type="button"
              disabled={pagination.page >= (pagination.totalPages || 1)}
              onClick={() => pagination.onPageChange?.(pagination.page + 1)}
              className="rounded-xl border border-[#d7ece8] bg-white px-3 py-2 text-[11px] font-bold text-[#119a8a] transition hover:border-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {getLocalizedText(COPY.next, lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
