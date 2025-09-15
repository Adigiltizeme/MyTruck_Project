import { ResponsiveContainer, LineChart, Line, XAxis} from 'recharts';

interface ChartData {
  date: string;
  value: number;
}

export const SmallMetricChart: React.FC<{ data: ChartData[]; color?: string }> = ({ 
  data,
  color = "#3B82F6"
}) => (
  <ResponsiveContainer width="100%" height={50}>
    <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
      <XAxis
        dataKey="date"
        tick={{ fontSize: 8 }}
        angle={-45}
        textAnchor="end"
        hide={true}
      />
      <Line
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={1.5}
        dot={false}
        // isAnimationActive={false}
      />
    </LineChart>
  </ResponsiveContainer>
);