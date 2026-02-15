import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IncidentTable from '../components/incidents/IncidentTable';
import api from '../services/api';

const PAGE_SIZE = 10;

export default function IncidentsList() {
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');

  const loadIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidents({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });

      setTotal(data.total || 0);

      let items = data.items || [];

      // Simple client-side sort
      if (sortKey) {
        items = [...items].sort((a, b) => {
          const va = a[sortKey] ?? '';
          const vb = b[sortKey] ?? '';
          if (va < vb) return sortDir === 'asc' ? -1 : 1;
          if (va > vb) return sortDir === 'asc' ? 1 : -1;
          return 0;
        });
      }

      // Simple search across title/description
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        items = items.filter((item) => {
          const haystack = `${item.title || ''} ${item.description || ''}`.toLowerCase();
          return haystack.includes(term);
        });
      }

      setIncidents(items);
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setError('Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, severityFilter, statusFilter, sortKey, sortDir]);

  const handleRowClick = (id) => {
    navigate(`/incidents/${id}`);
  };

  const handleSortChange = (key, dir) => {
    setSortKey(key);
    setSortDir(dir);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Incidents</h1>
          <p className="mt-1 text-sm text-slate-400">
            Browse and triage detected security incidents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or description..."
            className="w-56 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              loadIncidents();
            }}
            className="inline-flex items-center rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-700"
          >
            Apply
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-900/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <IncidentTable
        incidents={incidents}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        sortKey={sortKey}
        sortDir={sortDir}
        severityFilter={severityFilter}
        statusFilter={statusFilter}
        onSortChange={handleSortChange}
        onSeverityFilterChange={(value) => {
          setPage(1);
          setSeverityFilter(value);
        }}
        onStatusFilterChange={(value) => {
          setPage(1);
          setStatusFilter(value);
        }}
        onPageChange={(newPage) => setPage(newPage)}
        onRowClick={handleRowClick}
        onRefresh={loadIncidents}
      />
    </div>
  );
}
