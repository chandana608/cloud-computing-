import React from 'react';

const statusStyles = {
  Present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Absent: 'bg-rose-100 text-rose-800 border-rose-200',
  Late: 'bg-amber-100 text-amber-800 border-amber-200',
  Excused: 'bg-blue-100 text-blue-800 border-blue-200',
  Finalized: 'bg-purple-100 text-purple-800 border-purple-200',
  Open: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Scheduled: 'bg-slate-100 text-slate-800 border-slate-200',
  Closed: 'bg-slate-200 text-slate-700 border-slate-300',
  Safe: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Warning: 'bg-amber-100 text-amber-800 border-amber-200',
  Defaulter: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse',
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Rejected: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const StatusBadge = ({ status, size = 'sm' }) => {
  const style = statusStyles[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  const sizeClasses = size === 'xs'
    ? 'px-2 py-0.5 text-xs font-medium'
    : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border ${style} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {status || 'Unknown'}
    </span>
  );
};
