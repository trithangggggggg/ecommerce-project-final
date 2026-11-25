import React from 'react';

export interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
}) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage || 1), safeTotalPages);
  const hasItems = totalItems > 0;
  const startRecord = hasItems ? Math.min((safeCurrentPage - 1) * itemsPerPage + 1, totalItems) : 0;
  const endRecord = hasItems ? Math.min(safeCurrentPage * itemsPerPage, totalItems) : 0;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible + 2) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (safeCurrentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safeCurrentPage < safeTotalPages - 2) {
        pages.push('...');
      }

      pages.push(safeTotalPages);
    }

    return pages;
  };

  const navBtnClass =
    'px-2.5 h-8 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer';

  return (
    <div className="px-4 py-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-sans bg-white select-none shrink-0">
      <div className="text-slate-500 font-medium tabular-nums">
        Hiển thị <span className="font-bold text-slate-800">{startRecord}</span> -{' '}
        <span className="font-bold text-slate-800">{endRecord}</span> /{' '}
        <span className="font-bold text-slate-900">{totalItems}</span> bản ghi ({itemsPerPage} dòng/trang)
      </div>

      <div className="flex items-center flex-wrap justify-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={!hasItems || safeCurrentPage <= 1}
          className={navBtnClass}
          aria-label="Trang đầu"
        >
          Đầu
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={!hasItems || safeCurrentPage <= 1}
          className={navBtnClass}
          aria-label="Trang trước"
        >
          Trước
        </button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-1 text-slate-400 font-medium select-none"
                >
                  ...
                </span>
              );
            }

            const pNum = page as number;
            const isActive = pNum === safeCurrentPage;

            return (
              <button
                key={`page-${pNum}`}
                type="button"
                disabled={!hasItems}
                onClick={() => hasItems && onPageChange(pNum)}
                className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold tabular-nums transition flex items-center justify-center ${
                  !hasItems
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : isActive
                      ? 'bg-blue-600 text-white shadow-xs cursor-pointer'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 cursor-pointer'
                }`}
              >
                {pNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={!hasItems || safeCurrentPage >= safeTotalPages}
          className={navBtnClass}
          aria-label="Trang kế tiếp"
        >
          Sau
        </button>

        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={!hasItems || safeCurrentPage >= safeTotalPages}
          className={navBtnClass}
          aria-label="Trang cuối"
        >
          Cuối
        </button>
      </div>
    </div>
  );
};

export default AdminPagination;
