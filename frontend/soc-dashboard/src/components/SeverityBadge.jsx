import { memo } from 'react';

const COLORS = {
  HIGH: 'bg-red-500/10 text-red-300 ring-red-500/40',
  MEDIUM: 'bg-amber-500/10 text-amber-300 ring-amber-500/40',
  LOW: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/40',
  UNKNOWN: 'bg-slate-500/10 text-slate-300 ring-slate-500/40',
};

function SeverityBadge({ severity }) {
  const key = (severity || 'UNKNOWN').toUpperCase();
  const classes = COLORS[key] || COLORS.UNKNOWN;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      {key}
    </span>
  );
}

export default memo(SeverityBadge);
