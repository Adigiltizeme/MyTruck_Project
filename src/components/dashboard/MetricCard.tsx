// import React from 'react';
// import { SmallMetricChart } from './charts/SmallMetricChart';

// interface MetricCardProps {
//   title: string;
//   value: string | number;
//   subtitle: string;
//   variation: number;
//   chartData?: Array<{ date: string; value: number }>;
//   color?: string;
// }

// export const MetricCard: React.FC<MetricCardProps> = React.memo (({
//   title,
//   value,
//   subtitle,
//   variation,
//   chartData,
//   color
// }) => (
//   <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
//     <div className="flex justify-between items-start mb-3">
//       <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
//       <span 
//         className={`text-sm font-medium px-2 py-1 rounded-full ${
//           variation >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
//         }`}
//       >
//         {variation > 0 ? '+' : ''}{variation}%
//       </span>
//     </div>
//     <p className="text-3xl font-semibold text-gray-900 mb-1">
//       {typeof value === 'number' ? value.toLocaleString() : value}
//     </p>
//     <p className="text-sm text-gray-600 mb-3">{subtitle}</p>
//     {chartData && (
//       <div className="h-[50px] mt-4">
//         <SmallMetricChart data={chartData} color={color} />
//       </div>
//     )}
//   </div>
// ));
import React from 'react';
import { SmallMetricChart } from './charts/SmallMetricChart';
import { MetricCardProps } from '../../types/metrics';

export const MetricCard: React.FC<MetricCardProps> = React.memo(({
  title,
  value,
  subtitle,
  chartData,
  color
}) => {
  const getValueForChart = (point: any) => {
    // Déterminer quelle valeur utiliser selon le titre de la métrique
    if (title.toLowerCase().includes('performance') || title.toLowerCase().includes('taux')) {
      return point.performance || 0;
    } else if (title.toLowerCase().includes('cours')) {
      return point.enCours || 0;
    } else if (title.toLowerCase().includes('chiffre') || title.toLowerCase().includes('affaires')) {
      return point.chiffreAffaires || 0;
    } else {
      return point.totalLivraisons || 0;
    }
  };

  const chartDataPoints = chartData?.map(point => ({
    date: point.date,
    value: getValueForChart(point)
  })) || [];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      </div>
      <p className="text-3xl font-semibold text-gray-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-gray-600 mb-3">{subtitle}</p>
      {chartData && (
        <div className="h-[50px] mt-4">
          <SmallMetricChart data={chartDataPoints} color={color} />
        </div>
      )}
    </div>
  );
});