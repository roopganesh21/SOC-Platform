import SeverityBadge from '../SeverityBadge';

const HEADERS = [
  { key: 'created_at', label: 'Timestamp' },
  { key: 'title', label: 'Type' },
  { key: 'severity', label: 'Severity' },
  { key: 'ip', label: 'IP' },
  { key: 'user', label: 'User' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', sortable: false },
];

const SEVERITY_OPTIONS = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS = ['ALL', 'OPEN', 'ACKNOWLEDGED', 'CLOSED'];

function LoadingRow() {
  return (
    <tr className="animate-pulse border-b border-slate-800/80">
      <td className="px-3 py-3" colSpan={7}>
        <div className="h-4 w-1/3 rounded bg-slate-700/60" />
      </td>
    </tr>
  );
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
        No incidents found. Adjust filters or try again later.
      </td>
    </tr>
  );
}

export default function IncidentTable({
  incidents,
  loading,
  page,
  pageSize,
  total,
  sortKey,
  sortDir,
  severityFilter,
  statusFilter,
  onSortChange,
  onSeverityFilterChange,
  onStatusFilterChange,
  onPageChange,
  onRowClick,
  onRefresh,
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 10)));

  const handleSort = (key) => {
    if (!onSortChange) return;
    if (sortKey === key) {
      onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key, 'asc');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <label className="flex items-center gap-1">
            <span className="text-slate-400">Severity:</span>
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              value={severityFilter}
              onChange={(e) => onSeverityFilterChange?.(e.target.value)}
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt === 'ALL' ? '' : opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400">Status:</span>
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange?.(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt === 'ALL' ? '' : opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-700"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {HEADERS.map((h) => {
                const sortable = h.sortable !== false && h.key !== 'actions' && h.key !== 'ip' && h.key !== 'user';
                const isActive = sortKey === h.key;
                const direction = isActive ? (sortDir === 'asc' ? '↑' : '↓') : '';
                return (
                  <th
                    key={h.key}
                    scope="col"
                    className="cursor-pointer px-3 py-2 text-left font-medium"
                    onClick={sortable ? () => handleSort(h.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {h.label}
                      {direction && <span>{direction}</span>}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {loading && (!incidents || incidents.length === 0) && (
              <>
                <LoadingRow />
                <LoadingRow />
                <LoadingRow />
              </>
            )}
            {!loading && incidents && incidents.length === 0 && <EmptyState />}
            {!loading &&
              incidents &&
              incidents.map((incident) => (
                <tr
                  key={incident.id}
                  className="group cursor-pointer hover:bg-slate-900/80"
                  onClick={() => onRowClick?.(incident.id)}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-300">
                    {incident.created_at
                      ? new Date(incident.created_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-slate-100">
                    {incident.title || 'Incident'}
                  </td>
                  <td className="px-3 py-2">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {incident.ip || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {incident.user || '—'}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-slate-200">
                    {incident.status}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-teal-300">
                    <span className="hidden group-hover:inline">View →</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <div>
          Page {page} of {totalPages} • {total || 0} incidents
        </div>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-md border border-slate-700 px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-700 px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
