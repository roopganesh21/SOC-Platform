import { memo } from 'react';

function StatCard({ title, value, icon: Icon, color = 'from-teal-500/20 via-teal-500/10 to-slate-900' }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm transition-transform transition-shadow duration-150 hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${color} opacity-70`}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">{value}</p>
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-teal-300 ring-1 ring-teal-500/40">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(StatCard);
