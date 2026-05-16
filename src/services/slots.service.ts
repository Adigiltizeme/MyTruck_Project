import { SlotAvailability, SlotRestriction, TimeSlot } from "../types/slots.types";

export class SlotsService {
    private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

    // Créneaux par défaut (fallback si backend indisponible)
    private static readonly DEFAULT_SLOTS: TimeSlot[] = [
        { id: '1', startTime: '07h', endTime: '09h', displayName: '07h-09h', isActive: true, maxCapacity: 10 },
        { id: '2', startTime: '08h', endTime: '10h', displayName: '08h-10h', isActive: true, maxCapacity: 10 },
        { id: '3', startTime: '09h', endTime: '11h', displayName: '09h-11h', isActive: true, maxCapacity: 10 },
        { id: '4', startTime: '10h', endTime: '12h', displayName: '10h-12h', isActive: true, maxCapacity: 10 },
        { id: '5', startTime: '11h', endTime: '13h', displayName: '11h-13h', isActive: true, maxCapacity: 10 },
        { id: '6', startTime: '12h', endTime: '14h', displayName: '12h-14h', isActive: true, maxCapacity: 10 },
        { id: '7', startTime: '13h', endTime: '15h', displayName: '13h-15h', isActive: true, maxCapacity: 10 },
        { id: '8', startTime: '14h', endTime: '16h', displayName: '14h-16h', isActive: true, maxCapacity: 10 },
        { id: '9', startTime: '15h', endTime: '17h', displayName: '15h-17h', isActive: true, maxCapacity: 10 },
        { id: '10', startTime: '16h', endTime: '18h', displayName: '16h-18h', isActive: true, maxCapacity: 10 },
        { id: '11', startTime: '17h', endTime: '19h', displayName: '17h-19h', isActive: true, maxCapacity: 10 },
        { id: '12', startTime: '18h', endTime: '20h', displayName: '18h-20h', isActive: true, maxCapacity: 10 }
    ];

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const token = localStorage.getItem('authToken');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> | undefined)
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn('⚠️ Aucun token d\'authentification trouvé');
            throw new Error('Authentification requise');
        }

        console.log('🔍 Requête slots:', endpoint, { hasToken: !!token });

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur API Slots:', {
                status: response.status,
                endpoint,
                error: errorText
            });
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    // 🔍 RÉCUPÉRATION DES CRÉNEAUX (avec filtrage optionnel par magasin)
    async getTimeSlots(magasinId?: string): Promise<TimeSlot[]> {
        try {
            const params = magasinId ? `?magasinId=${magasinId}` : '';
            return await this.request<TimeSlot[]>(`/slots${params}`);
        } catch (error) {
            console.warn('Fallback vers créneaux par défaut:', error);
            return SlotsService.DEFAULT_SLOTS;
        }
    }

    // 📅 DISPONIBILITÉ POUR UNE DATE DONNÉE
    async getAvailabilityForDate(date: string, magasinId?: string): Promise<SlotAvailability[]> {
        console.log('🔍 Récupération disponibilité créneaux pour:', date, 'magasinId:', magasinId);

        try {
            const params = magasinId ? `?magasinId=${magasinId}` : '';
            return await this.request<SlotAvailability[]>(`/slots/availability/${date}${params}`);
        } catch (error) {
            console.warn('Erreur récupération disponibilités:', error);
            // Fallback : tous les créneaux disponibles
            const slots = await this.getTimeSlots();
            return slots.map(slot => ({
                date,
                slot: { ...slot, maxCapacity: slot.maxCapacity !== undefined ? slot.maxCapacity : 10 },
                // ✅ CORRECTION: Passer startTime (heure de début) pour vérifier le délai de prévenance
                isAvailable: slot.isActive && !this.isSlotPassed(date, slot.startTime),
                isBlocked: false,
                bookingsCount: 0,
                maxCapacity: slot.maxCapacity !== undefined ? slot.maxCapacity : 10
            }));
        }
    }

    // ⏰ VÉRIFIER SI UN CRÉNEAU EST PASSÉ (avec délai de prévenance 2h)
    private isSlotPassed(date: string, endTime: string): boolean {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
        // Si la date n'est pas aujourd'hui, le créneau n'est pas passé
        if (date !== today) return false;

        // ✅ DÉLAI DE PRÉVENANCE 2H : Utiliser startTime au lieu de endTime
        // Pour "14h-16h", on vérifie l'heure de DÉBUT (14h) avec 2h de prévenance
        // Note: endTime passé en paramètre devrait être startTime
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinutes;

        // Extraire l'heure du créneau (endTime est mal nommé, c'est en fait le format "XXh")
        const slotHour = parseInt(endTime.replace('h', ''));
        const slotTimeInMinutes = slotHour * 60;

        // Calculer le délai en minutes
        const delaiEnMinutes = slotTimeInMinutes - currentTimeInMinutes;

        // ✅ INDISPONIBLE si début dans moins de 2h (120 minutes)
        return delaiEnMinutes < 120;
    }

    // 🚫 BLOQUER UN CRÉNEAU (ADMIN SEULEMENT)
    async blockSlot(date: string, slotId: string, reason?: string, temporaryUntil?: string, magasinId?: string): Promise<void> {
        // 🔧 Vérifier l'utilisateur connecté
        const user = this.getCurrentUser();
        if (!user) {
            throw new Error('Utilisateur non connecté');
        }

        const restriction: Partial<SlotRestriction> & { magasinId?: string } = {
            date,
            slotId,
            isBlocked: true,
            reason: reason || 'Bloqué par administration',
            temporaryUntil,
            magasinId: magasinId || undefined,  // 🏪 ID magasin (undefined = global)
        };

        console.log('🚫 Blocage créneau:', restriction);

        await this.request<void>('/slots/restrictions', {
            method: 'POST',
            body: JSON.stringify(restriction)
        });
    }

    // 🔧 Helper pour récupérer l'utilisateur actuel
    private getCurrentUser() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Erreur parsing user:', error);
            return null;
        }
    }

    // ✅ DÉBLOQUER UN CRÉNEAU (ADMIN SEULEMENT)
    async unblockSlot(date: string, slotId: string, magasinId?: string): Promise<void> {
        const params = magasinId ? `?magasinId=${magasinId}` : '';
        await this.request<void>(`/slots/restrictions/${date}/${slotId}${params}`, {
            method: 'DELETE'
        });
    }

    // 🚀 FORCER LA DISPONIBILITÉ D'UN CRÉNEAU (ADMIN SEULEMENT - override délai 2h)
    async forceSlotAvailable(date: string, slotId: string, magasinId?: string): Promise<void> {
        await this.request<void>('/slots/force-available', {
            method: 'POST',
            body: JSON.stringify({
                date,
                slotId,
                magasinId: magasinId || undefined
            })
        });
    }

    // 📊 OBTENIR LES RESTRICTIONS ACTIVES
    async getActiveRestrictions(startDate?: string, endDate?: string, magasinId?: string): Promise<SlotRestriction[]> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (magasinId) params.append('magasinId', magasinId);  // ✅ Ajouter filtrage par magasin

        const query = params.toString() ? `?${params.toString()}` : '';
        return await this.request<SlotRestriction[]>(`/slots/restrictions${query}`);
    }

    // 🔄 MISE À JOUR CONFIGURATION CRÉNEAU
    async updateSlot(slotId: string, updates: Partial<TimeSlot>): Promise<TimeSlot> {
        return await this.request<TimeSlot>(`/slots/${slotId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }
}