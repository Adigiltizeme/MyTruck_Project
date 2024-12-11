import { memo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface DistributionChartProps {
  data: any[];
  height?: number;
}

export const DistributionChart = memo(({ data, height = 300 }: DistributionChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} stackOffset="expand">
      <XAxis hide />
      <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} />
      <Tooltip />
      <Area
        type="monotone"
        dataKey="enAttente"
        stackId="1"
        stroke="#3B82F6"
        fill="#93C5FD"
        isAnimationActive={false}
      />
      <Area
        type="monotone"
        dataKey="enCours"
        stackId="1"
        stroke="#10B981"
        fill="#6EE7B7"
        isAnimationActive={false}
      />
      <Area
        type="monotone"
        dataKey="termine"
        stackId="1"
        stroke="#059669"
        fill="#34D399"
        isAnimationActive={false}
      />
    </AreaChart>
  </ResponsiveContainer>
));

// À utiliser comme:
// const metrics = useOptimizedMetrics(data);
// const charts = useOptimizedCharts(metrics);
// return <PerformanceChart data={charts.performance} />;