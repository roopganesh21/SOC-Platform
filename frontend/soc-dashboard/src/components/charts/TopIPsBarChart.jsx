import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

function TopIPsBarChart({ data }) {
  const chartData = useMemo(() => data || [], [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-500">
        No IP data available yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 16, left: 40, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="ip"
          stroke="#64748b"
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value) => [`${value} events`, 'Count']}
          contentStyle={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(51, 65, 85, 0.9)',
            borderRadius: 8,
            color: 'rgba(226, 232, 240, 1)',
            fontSize: 12,
          }}
          labelStyle={{ color: 'rgba(148, 163, 184, 1)' }}
          itemStyle={{ color: 'rgba(226, 232, 240, 1)' }}
        />
        <defs>
          <linearGradient id="ipBarGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#0f172a" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <Bar dataKey="count" fill="url(#ipBarGradient)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(TopIPsBarChart);
