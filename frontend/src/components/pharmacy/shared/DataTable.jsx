import React from 'react';
import { useLang } from '../../../context/LanguageContext';
import { getLocalizedText } from '../../../utils/localization';

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

export default function DataTable({ columns, rows, onRowClick, empty, keyField = 'id' }) {
  const { lang } = useLang();
  const isRtl = lang !== 'en';
  const emptyText = empty || (isRtl ? 'لا توجد بيانات' : 'No data available');
  const hintText = isRtl
    ? 'جرّب تغيير الفلاتر أو البحث.'
    : 'Try adjusting the filters or search.';
  const columnWidths = getColumnWidths(columns);
  const tableMinWidth = Math.max(columns.length * 110, 680);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4eeee]">
      {rows.length === 0 ? (
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
                {columns.map((col) => {
                  if (col.key === 'actions') {
                    return (
                      <div key={col.key} className="mt-1 flex w-full items-center justify-end border-t border-[#f1f7f7] pt-2">
                        {col.render ? col.render(row) : row[col.key]}
                      </div>
                    );
                  }
                  return (
                    <div key={col.key} className="flex min-w-0 items-start justify-between gap-3">
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {getLocalizedText(col.label, lang, col.label)}
                      </span>
                      <div className="min-w-0 max-w-[68%] break-words text-start">
                        {col.render ? col.render(row) : row[col.key]}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full table-fixed border-collapse" style={{ minWidth: tableMinWidth }}>
              <colgroup>
                {columns.map((column, index) => (
                  <col key={column.key} style={{ width: columnWidths[index] }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-[#e4eeee] bg-[#f7fbfb]">
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
    </div>
  );
}
