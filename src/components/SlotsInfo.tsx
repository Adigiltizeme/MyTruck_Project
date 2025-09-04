import React from 'react';
import { Clock, Users, AlertCircle } from 'lucide-react';
import { SlotAvailability } from '../types/slots.types';


interface SlotsInfoProps {
    availability: SlotAvailability[];
    selectedSlot?: string;
}

export const SlotsInfo: React.FC<SlotsInfoProps> = ({
    availability,
    selectedSlot
}) => {
    const totalSlots = availability.length;
    const availableSlots = availability.filter(s => s.isAvailable).length;
    const selectedSlotInfo = availability.find(s => s.slot.displayName === selectedSlot);

    if (totalSlots === 0) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">
                    Aucun créneau disponible
                </p>
            </div>
        );
    }
    
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-3">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-medium text-blue-900">Informations Créneaux</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-blue-800">
                        <strong>Disponibilité:</strong> {availableSlots}/{totalSlots} créneaux
                    </p>

                    {selectedSlotInfo && (
                        <p className="text-blue-800 mt-1">
                            <Users className="w-4 h-4 inline mr-1" />
                            <strong>Créneau sélectionné:</strong> {selectedSlotInfo.bookingsCount}/{selectedSlotInfo.maxCapacity} réservations
                        </p>
                    )}
                </div>

                <div>
                    {availableSlots === 0 && (
                        <div className="flex items-center text-orange-700">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            <span>Tous les créneaux sont complets</span>
                        </div>
                    )}

                    {availableSlots > 0 && availableSlots <= 3 && (
                        <div className="flex items-center text-orange-700">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            <span>Peu de créneaux disponibles</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};