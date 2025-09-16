import { useState } from "react";
import { DateRange } from "../types/hooks.types";

export const DateSelector = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    mode: 'range',
    singleDate: null
  });

  return (
    <div className="flex items-center gap-4 mb-4">
      <span className="text-sm text-gray-500">Date:</span>
      <select
        value={dateRange.mode}
        onChange={(e) => setDateRange(prev => ({
          ...prev,
          mode: e.target.value as 'range' | 'single',
          // Réinitialiser les valeurs lors du changement de mode
          start: null,
          end: null,
          singleDate: null
        }))}
        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
      >
        <option value="range">Période</option>
        <option value="single">Date unique</option>
      </select>

      {dateRange.mode === 'single' ? (
        <input
          type="date"
          value={dateRange.singleDate || ''}
          onChange={e => setDateRange(prev => ({
            ...prev,
            singleDate: e.target.value,
            start: e.target.value,
            end: e.target.value
          }))}
          className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
      ) : (
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start || ''}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
          <span className="text-gray-500 content-center dark:text-gray-100">à</span>
          <input
            type="date"
            value={dateRange.end || ''}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
      )}

      {((dateRange.mode === 'single' && dateRange.singleDate) ||
        (dateRange.mode === 'range' && (dateRange.start || dateRange.end))) && (
          <button
            onClick={() => setDateRange({
              start: null,
              end: null,
              mode: dateRange.mode,
              singleDate: null
            })}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Réinitialiser
          </button>
        )}
    </div>
  );
};