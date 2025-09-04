import { useState, useEffect } from 'react';
import { SlotsService } from '../services/slots.service';
import { SlotAvailability, TimeSlot } from '../types/slots.types';


export const useSlots = () => {
    const [slotsService] = useState(() => new SlotsService());

    const useAvailableSlots = (date: string) => {
        const [slots, setSlots] = useState<SlotAvailability[]>([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const loadSlots = async () => {
            if (!date) return;
            setLoading(true);
            setError(null);

            try {
                const availability = await slotsService.getAvailabilityForDate(date);
                setSlots(availability.filter(slot => slot.isAvailable));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur chargement');
                setSlots([]);
            } finally {
                setLoading(false);
            }
        };

        return { slots, loading, error, refresh: () => loadSlots() };
    };

    const useAllSlots = () => {
        const [slots, setSlots] = useState<TimeSlot[]>([]);
        const [loading, setLoading] = useState(false);

        useEffect(() => {
            const loadSlots = async () => {
                setLoading(true);
                try {
                    const allSlots = await slotsService.getTimeSlots();
                    setSlots(allSlots);
                } catch (error) {
                    console.error('Erreur chargement tous les créneaux:', error);
                } finally {
                    setLoading(false);
                }
            };

            loadSlots();
        }, []);

        return { slots, loading };
    };

    return {
        slotsService,
        useAvailableSlots,
        useAllSlots
    };
};