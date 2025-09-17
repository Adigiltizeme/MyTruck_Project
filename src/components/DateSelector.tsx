import { useState } from "react";
import { DateRange } from "../types/hooks.types";

interface DateSelectorProps {
  value?: DateRange;
  onChange?: (dateRange: DateRange) => void;
}

export const DateSelector = ({ value, onChange }: DateSelectorProps) => {
  const [internalDateRange, setInternalDateRange] = useState<DateRange>({
    start: null,
    end: null,
    mode: 'range',
    singleDate: null
  });

  // Utiliser la valeur contrôlée si fournie, sinon l'état interne
  const dateRange = value || internalDateRange;

  // ✅ Fonction helper SIMPLE - comme dans Deliveries.tsx
  const handleDateRangeChange = (newDateRange: DateRange | ((prev: DateRange) => DateRange)) => {
    if (onChange) {
      // Mode contrôlé : TOUJOURS appeler onChange
      const newValue = typeof newDateRange === 'function' ? newDateRange(dateRange) : newDateRange;
      onChange(newValue);
    } else {
      // Mode non-contrôlé : utiliser l'état interne
      setInternalDateRange(newDateRange);
    }
  };

  return (
    <div className="flex items-center gap-4 mb-4">
      <span className="text-sm text-gray-500">Date personnalisée:</span>
      <select
        value={dateRange.mode}
        onChange={(e) => handleDateRangeChange(prev => ({
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
          onChange={e => handleDateRangeChange(prev => ({
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
            onChange={e => handleDateRangeChange(prev => ({ ...prev, start: e.target.value }))}
            className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
          <span className="text-gray-500 content-center dark:text-gray-100">à</span>
          <input
            type="date"
            value={dateRange.end || ''}
            onChange={e => handleDateRangeChange(prev => ({ ...prev, end: e.target.value }))}
            className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
      )}

      {((dateRange.mode === 'single' && dateRange.singleDate) ||
        (dateRange.mode === 'range' && (dateRange.start || dateRange.end))) && (
          <button
            onClick={() => handleDateRangeChange({
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