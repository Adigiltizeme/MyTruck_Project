export interface TimeSlot {
    id: string;
    startTime: string; // Format "07h"
    endTime: string;   // Format "09h"
    displayName: string; // Format "07h-09h"
    isActive: boolean;
    maxCapacity?: number; // Nombre max de livraisons
    currentBookings?: number; // Nombre actuel de réservations
}

export interface SlotRestriction {
    id: string;
    date: string; // YYYY-MM-DD
    slotId: string;
    isBlocked: boolean;
    reason?: string; // Raison du blocage
    blockedBy: string; // ID de l'admin qui a bloqué
    blockedAt: string; // Date de blocage
    temporaryUntil?: string; // Blocage temporaire jusqu'à cette date
}

export interface SlotAvailability {
    date: string;
    slot: {
        id: string;
        displayName: string;
        startTime: string;
        endTime: string;
        isActive: boolean;
        maxCapacity: number;
    };
    isAvailable: boolean;
    reason?: string;
    bookingsCount: number;
    maxCapacity: number;
}