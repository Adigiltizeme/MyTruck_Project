import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Lock, Unlock, Settings } from 'lucide-react';
import { SlotsService } from '../../services/slots.service';
import { SlotAvailability, SlotRestriction, TimeSlot } from '../../types/slots.types';

interface SlotsManagementProps {
    readOnly?: boolean;
}

export const SlotsManagement: React.FC<SlotsManagementProps> = ({ readOnly = false }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [availability, setAvailability] = useState<SlotAvailability[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [restrictions, setRestrictions] = useState<SlotRestriction[]>([]);
    const [showSettings, setShowSettings] = useState(false);

    const slotsService = new SlotsService();

    useEffect(() => {
        loadAvailability();
    }, [selectedDate]);

    useEffect(() => {
        loadTimeSlots();
        loadRestrictions();
    }, []);

    const loadAvailability = async () => {
        setLoading(true);
        try {
            const data = await slotsService.getAvailabilityForDate(selectedDate);
            setAvailability(data);
        } catch (error) {
            console.error('Erreur chargement disponibilités:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTimeSlots = async () => {
        try {
            const slots = await slotsService.getTimeSlots();
            setTimeSlots(slots);
        } catch (error) {
            console.error('Erreur chargement créneaux:', error);
        }
    };

    const loadRestrictions = async () => {
        try {
            const data = await slotsService.getActiveRestrictions();
            setRestrictions(data);
        } catch (error) {
            console.error('Erreur chargement restrictions:', error);
        }
    };

    const handleBlockSlot = async (slotId: string, reason?: string) => {
        try {
            await slotsService.blockSlot(selectedDate, slotId, reason);
            await loadAvailability();
            await loadRestrictions();
        } catch (error) {
            console.error('Erreur blocage créneau:', error);
            alert('Erreur lors du blocage du créneau');
        }
    };

    const handleUnblockSlot = async (slotId: string) => {
        try {
            await slotsService.unblockSlot(selectedDate, slotId);
            await loadAvailability();
            await loadRestrictions();
        } catch (error) {
            console.error('Erreur déblocage créneau:', error);
            alert('Erreur lors du déblocage du créneau');
        }
    };

    const isSlotBlocked = (slotId: string) => {
        return restrictions.some(r =>
            r.date === selectedDate &&
            r.slotId === slotId &&
            r.isBlocked
        );
    };

    const getSlotRestriction = (slotId: string) => {
        return restrictions.find(r =>
            r.date === selectedDate &&
            r.slotId === slotId &&
            r.isBlocked
        );
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* En-tête */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Clock className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {readOnly ? 'Créneaux Disponibles' : 'Gestion des Créneaux'}
                        </h1>
                        <p className="text-gray-600">
                            {readOnly
                                ? 'Consultez les créneaux de livraison disponibles'
                                : 'Bloquer/débloquer les créneaux de livraison'}
                        </p>
                    </div>
                </div>

                {!readOnly && (
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Paramètres
                    </button>
                )}
            </div>

            {/* Sélection de date */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center mb-4">
                    <Calendar className="w-5 h-5 text-gray-600 mr-2" />
                    <h2 className="text-lg font-medium">Sélectionner une date</h2>
                </div>

                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                />
            </div>

            {/* Grille des créneaux */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium mb-4">
                    Créneaux pour le {new Date(selectedDate).toLocaleDateString('fr-FR')}
                </h2>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Chargement...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {availability.map((slot) => {
                            const blocked = isSlotBlocked(slot.slot.id);
                            const restriction = getSlotRestriction(slot.slot.id);

                            return (
                                <div
                                    key={slot.slot.id}
                                    className={`border rounded-lg p-4 ${blocked
                                        ? 'border-red-300 bg-red-50'
                                        : slot.isAvailable
                                            ? 'border-green-300 bg-green-50'
                                            : 'border-gray-300 bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium">{slot.slot.displayName}</h3>
                                        {blocked ? (
                                            <Lock className="w-4 h-4 text-red-600" />
                                        ) : (
                                            <Unlock className="w-4 h-4 text-green-600" />
                                        )}
                                    </div>

                                    <div className="text-sm text-gray-600 mb-3">
                                        <p>Réservations: {slot.bookingsCount}/{slot.maxCapacity}</p>
                                        {!slot.isAvailable && slot.reason && (
                                            <p className="text-red-600">⚠️ {slot.reason}</p>
                                        )}
                                        {restriction?.reason && (
                                            <p className="text-red-600">🚫 {restriction.reason}</p>
                                        )}
                                    </div>

                                    {!readOnly && (
                                        <div className="flex space-x-2">
                                            {blocked ? (
                                                <button
                                                    onClick={() => handleUnblockSlot(slot.slot.id)}
                                                    className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                                >
                                                    Débloquer
                                                </button>
                                            ) : slot.isAvailable ? (
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt('Raison du blocage (optionnel):');
                                                        if (reason !== null) {
                                                            handleBlockSlot(slot.slot.id, reason || undefined);
                                                        }
                                                    }}
                                                    className="flex-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                                >
                                                    Bloquer
                                                </button>
                                            ) : (
                                                <div className="flex-1 px-3 py-1 bg-gray-400 text-white text-sm rounded text-center">
                                                    Indisponible
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Panel de paramètres */}
            {!readOnly && showSettings && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold">Paramètres des Créneaux</h2>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                {timeSlots.map((slot) => (
                                    <div key={slot.id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium">{slot.displayName}</h3>
                                                <p className="text-sm text-gray-600">
                                                    Capacité max: {slot.maxCapacity} livraisons
                                                </p>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <label className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={slot.isActive}
                                                        onChange={async (e) => {
                                                            try {
                                                                await slotsService.updateSlot(slot.id, {
                                                                    isActive: e.target.checked
                                                                });
                                                                await loadTimeSlots();
                                                                await loadAvailability();
                                                            } catch (error) {
                                                                console.error('Erreur mise à jour:', error);
                                                            }
                                                        }}
                                                        className="mr-2"
                                                    />
                                                    Actif
                                                </label>

                                                <input
                                                    type="number"
                                                    value={slot.maxCapacity || 10}
                                                    onChange={async (e) => {
                                                        try {
                                                            await slotsService.updateSlot(slot.id, {
                                                                maxCapacity: parseInt(e.target.value)
                                                            });
                                                            await loadTimeSlots();
                                                            await loadAvailability();
                                                        } catch (error) {
                                                            console.error('Erreur mise à jour:', error);
                                                        }
                                                    }}
                                                    className="w-16 border rounded px-2 py-1"
                                                    min="1"
                                                    max="50"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};