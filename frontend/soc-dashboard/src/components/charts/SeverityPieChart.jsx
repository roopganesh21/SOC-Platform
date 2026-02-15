import { memo, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const SEVERITY_COLORS = {
  HIGH: '#ef4444', // red-500
  MEDIUM: '#f97316', // orange-500
  LOW: '#22c55e', // green-500
  UNKNOWN: '#64748b', // slate-500
};
function SeverityPieChart({ data }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      name: item.severity || 'UNKNOWN',
      value: item.count || 0,
    }));
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-500">
        No incident data available yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={70}
          innerRadius={35}
          paddingAngle={2}
        >
          {chartData.map((entry, index) => {
            const key = entry.name.toUpperCase();
            const color = SEVERITY_COLORS[key] || SEVERITY_COLORS.UNKNOWN;
            return <Cell key={`cell-${index}`} fill={color} />;
          })}
        </Pie>
        <Tooltip formatter={(value) => [`${value} incidents`, 'Count']} />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default memo(SeverityPieChart);
