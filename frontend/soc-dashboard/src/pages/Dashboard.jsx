import { useEffect, useState } from 'react';
import {
  ExclamationTriangleIcon,
  FireIcon,
  SignalIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import StatCard from '../components/StatCard';
import SeverityPieChart from '../components/charts/SeverityPieChart';
import TrendLineChart from '../components/charts/TrendLineChart';
import TopIPsBarChart from '../components/charts/TopIPsBarChart';
import api from '../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, bySeverity: [], byStatus: [] });
  const [trendPoints, setTrendPoints] = useState([]);
  const [topIps, setTopIps] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statsData, trendsData, topIpsData] = await Promise.all([
          api.getStats(),
          api.getTrends(30),
          api.getTopIps(5),
        ]);

        if (!isMounted) return;

        setStats({
          total: statsData.total || 0,
          bySeverity: statsData.bySeverity || [],
          byStatus: statsData.byStatus || [],
        });

        setTrendPoints(trendsData.points || []);
        setTopIps(topIpsData.items || []);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load stats:', err);
        setError('Failed to load statistics.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const highSeverityCount = stats.bySeverity.find((s) => s.severity === 'HIGH')?.count || 0;

  const openCount = stats.byStatus.find((s) => s.status === 'OPEN')?.count || 0;
  const acknowledgedCount =
    stats.byStatus.find((s) => s.status === 'ACKNOWLEDGED')?.count || 0;
  const activeCount = openCount + acknowledgedCount;

  const resolvedCount = stats.byStatus.find((s) => s.status === 'CLOSED')?.count || 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            High-level overview of incidents, activity, and system health.
          </p>
        </div>
        {loading && (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Loading statistics...
          </span>
        )}
      </header>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-900/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Incidents"
          value={stats.total}
          icon={ExclamationTriangleIcon}
          color="from-sky-500/20 via-sky-500/10 to-slate-900"
        />
        <StatCard
          title="High Severity"
          value={highSeverityCount}
          icon={FireIcon}
          color="from-red-500/20 via-red-500/10 to-slate-900"
        />
        <StatCard
          title="Active (Open + Ack)"
          value={activeCount}
          icon={SignalIcon}
          color="from-amber-500/20 via-amber-500/10 to-slate-900"
        />
        <StatCard
          title="Resolved"
          value={resolvedCount}
          icon={CheckCircleIcon}
          color="from-emerald-500/20 via-emerald-500/10 to-slate-900"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm font-medium text-slate-400">Incidents over time</p>
          <div className="mt-4">
            <TrendLineChart
              data={trendPoints.map((p) => ({ date: p.date, count: p.count }))}
            />
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm font-medium text-slate-400">Severity distribution</p>
          <div className="mt-4">
            <SeverityPieChart data={stats.bySeverity} />
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 lg:col-span-2">
          <p className="text-sm font-medium text-slate-400">Top attacking IPs</p>
          <div className="mt-4">
            <TopIPsBarChart data={topIps} />
          </div>
        </div>
      </div>
    </div>
  );
}
