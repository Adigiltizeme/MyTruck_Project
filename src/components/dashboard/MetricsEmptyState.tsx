import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EmptyStateProps {
  period: 'day' | 'week' | 'month' | 'year';
  onChangePeriod?: () => void;
}

const MetricsEmptyState: React.FC<EmptyStateProps> = ({ period, onChangePeriod }) => {
  const today = new Date();
  const formattedDate = format(today, period === 'day' ? 'dd MMMM yyyy' : 'MMMM yyyy');

  return (
    <div className="bg-white rounded-xl p-6 text-center">
      <div className="text-gray-400 mb-4">
        <svg 
          className="w-12 h-12 mx-auto mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <p className="text-lg font-medium text-gray-600">
          Aucune livraison pour {period === 'day' ? 'le' : 'le mois de'} {formattedDate}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Essayez de sélectionner une autre période ou un autre magasin pour voir les données disponibles.
        </p>
      </div>
      {onChangePeriod && (
        <button
          onClick={onChangePeriod}
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Changer la période
        </button>
      )}
    </div>
  );
};

export default MetricsEmptyState;