import React from 'react';
import { MetricCardProps } from '../types/metrics';

const MetricCard: React.FC<MetricCardProps> = React.memo(({ 
  title, 
  value, 
  subtitle, 
  variation
}) => (
  <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-gray-500 text-sm">{title}</h3>
      <div className={`text-sm ${variation >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {variation > 0 ? '+' : ''}{variation}%
      </div>
    </div>
    <p className="text-3xl font-semibold mb-2">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    <p className="text-gray-500 text-sm">{subtitle}</p>
  </div>
));

MetricCard.displayName = 'MetricCard';

export default MetricCard;