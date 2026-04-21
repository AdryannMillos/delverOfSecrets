import { useState } from 'react';

export default function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    page: safePage,
    totalPages,
    slice,
    setPage,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}
