import React from 'react';

export interface AdminSummaryItem {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  valueClassName?: string;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}

interface AdminSummaryStripProps {
  items: AdminSummaryItem[];
}

/**
 * Compact single-line summary strip replacing tall KPI cards in Admin views
 * so data tables receive maximum vertical viewport height.
 */
export const AdminSummaryStrip: React.FC<AdminSummaryStripProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
      {items.map((item) => {
        const baseClass = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shadow-2xs transition ${
          item.active
            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
            : 'bg-white border-slate-200/80'
        }`;

        const content = (
          <>
            <span className="text-slate-500 font-medium">{item.label}:</span>
            <strong className={`font-bold tabular-nums ${item.valueClassName || 'text-slate-900'}`}>
              {item.value}
            </strong>
            {item.subValue != null && (
              <span className="text-slate-400 tabular-nums">({item.subValue})</span>
            )}
          </>
        );

        if (item.onClick) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              title={item.title}
              className={`${baseClass} hover:border-slate-300 hover:bg-slate-50 cursor-pointer`}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={item.label} title={item.title} className={baseClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
};

export default AdminSummaryStrip;

