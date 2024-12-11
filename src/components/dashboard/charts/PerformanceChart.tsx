import { memo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

import { FC } from 'react';

interface PerformanceChartProps {
  data: { date: string; value: number }[];
  height?: number;
}

export const PerformanceChart: FC<PerformanceChartProps> = memo(({ data, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <XAxis dataKey="date" />
      <YAxis domain={[0, 100]} />
      <Tooltip />
      <Line
        type="monotone"
        dataKey="value"
        stroke="#10B981"
        strokeWidth={2}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  </ResponsiveContainer>
));

// À utiliser comme:
// const metrics = useOptimizedMetrics(data);
// const charts = useOptimizedCharts(metrics);
// return <PerformanceChart data={charts.performance} />;