import React from 'react';

export default function Pagination({ page, totalPages, hasPrev, hasNext, setPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-secondary" onClick={() => setPage(page - 1)} disabled={!hasPrev}>‹</button>
      <span className="pagination-info">{page} / {totalPages}</span>
      <button className="btn btn-secondary" onClick={() => setPage(page + 1)} disabled={!hasNext}>›</button>
    </div>
  );
}
