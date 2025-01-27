import { useMemo, useState } from "react";
import { getNestedPropertyValue } from "../helpers/getNestedValue";
import { DateRange, UseDateRangeProps, UseDateRangeReturn } from "../types/hooks.types";
import { endOfDay, format, startOfDay } from "date-fns";

export function useDateRange<T>({ items, dateKey }: UseDateRangeProps<T>): UseDateRangeReturn<T> {
    const [dateRange, setDateRange] = useState<DateRange>({
        start: null,
        end: null,
        mode: 'range',
        singleDate: null
    });

    const filteredItems = useMemo(() => {
        if (dateRange.mode === 'single' && dateRange.singleDate) {
            const targetDate = format(new Date(dateRange.singleDate), 'yyyy-MM-dd');
            return items.filter(item => {
                const itemDate = getNestedPropertyValue(item, dateKey);
                if (!itemDate) return false;
                return format(new Date(itemDate), 'yyyy-MM-dd') === targetDate;
            });
        }

        if (dateRange.start && dateRange.end) {
            const start = startOfDay(new Date(dateRange.start));
            const end = endOfDay(new Date(dateRange.end));
            return items.filter(item => {
                const itemDate = new Date(getNestedPropertyValue(item, dateKey));
                return itemDate >= start && itemDate <= end;
            });
        }

        return items;
    }, [items, dateRange, dateKey]);

    return { dateRange, setDateRange, filteredItems };
}