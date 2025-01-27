import { useState } from "react";

export const DateSelector = () => {
    const [dateRange, setDateRange] = useState<{
      start: string | null;
      end: string | null;
    }>({
      start: null,
      end: null
    });
  
    return (
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-gray-500">Période:</span>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start || ''}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="border rounded-lg px-3 py-2"
          />
          <span className="text-gray-500">à</span>
          <input
            type="date"
            value={dateRange.end || ''}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="border rounded-lg px-3 py-2"
          />
        </div>
        <button
          onClick={() => setDateRange({ start: null, end: null })}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Réinitialiser
        </button>
      </div>
    );
  };