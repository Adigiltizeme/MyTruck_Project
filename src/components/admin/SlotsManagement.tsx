import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Lock, Unlock, Settings, Store } from 'lucide-react';
import { SlotsService } from '../../services/slots.service';
import { SlotAvailability, SlotRestriction, TimeSlot } from '../../types/slots.types';
import { apiService } from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';

interface SlotsManagementProps {
    readOnly?: boolean;
}

interface Magasin {
    id: string;
    nom: string;
}

export const SlotsManagement: React.FC<SlotsManagementProps> = ({ readOnly = false }) => {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [availability, setAvailability] = useState<SlotAvailability[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [restrictions, setRestrictions] = useState<SlotRestriction[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    // ✅ Initialiser avec le storeId du user si c'est un magasin, sinon avec la dernière sélection admin
    const [selectedMagasinId, setSelectedMagasinId] = useState<string>(() => {
        if (user?.role === 'magasin') {
            return user.storeId || user.magasin?.id || '';
        }
        // Pour les admins, restaurer la dernière sélection depuis localStorage
        const savedSelection = localStorage.getItem('adminSlotsSelectedMagasin');
        return savedSelection || '';
    });
    const [magasins, setMagasins] = useState<Magasin[]>([]);

    const slotsService = new SlotsService();

    // Charger les magasins au montage
    useEffect(() => {
        loadMagasins();
    }, []);

    // 🏪 Détecter automatiquement le magasinId UNIQUEMENT pour les utilisateurs magasin
    useEffect(() => {
        if (!user) {
            console.log('⚠️ Pas d\'utilisateur connecté');
            return;
        }

        console.log('🔍 Détection magasinId depuis AuthContext:', {
            role: user.role,
            storeId: user.storeId,
            'magasin?.id': user.magasin?.id,
            magasinsLoaded: magasins.length
        });

        const currentRole = user.role;
        const magasinId = user.storeId || user.magasin?.id;

        // ✅ IMPORTANT: Ne forcer le magasinId QUE pour les utilisateurs magasin
        // Les admins peuvent sélectionner manuellement sans que ce useEffect n'interfère
        if (currentRole === 'magasin' && magasinId) {
            // Vérifier que le magasin existe dans la liste
            const magasinExists = magasins.length === 0 || magasins.some(m => m.id === magasinId);
            if (magasinExists) {
                console.log('✅ Application du filtre magasin (utilisateur magasin):', magasinId);
                setSelectedMagasinId(magasinId);
            } else {
                console.warn('⚠️ Magasin non trouvé dans la liste:', magasinId);
            }
        }
        // ⚠️ Ne PAS réinitialiser pour admin/direction - ils gèrent manuellement
    }, [user?.role, user?.storeId, user?.magasin?.id, magasins]);

    useEffect(() => {
        loadAvailability();
    }, [selectedDate]);

    useEffect(() => {
        loadTimeSlots();
        loadAvailability();  // ✅ Recharger aussi les disponibilités quand le magasin change
        loadRestrictions();
    }, [selectedMagasinId]);

    const loadMagasins = async () => {
        try {
            const response = await apiService.get('/magasins') as { data: Magasin[] };
            setMagasins(response.data || []);
        } catch (error) {
            console.error('Erreur chargement magasins:', error);
        }
    };

    const loadAvailability = async () => {
        setLoading(true);
        try {
            const data = await slotsService.getAvailabilityForDate(selectedDate, selectedMagasinId || undefined);
            console.log('📊 Disponibilités reçues du backend:', data.map(slot => ({
                displayName: slot.slot.displayName,
                bookingsCount: slot.bookingsCount,
                maxCapacity: slot.maxCapacity
            })));
            setAvailability(data);
        } catch (error) {
            console.error('Erreur chargement disponibilités:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTimeSlots = async () => {
        try {
            const slots = await slotsService.getTimeSlots(selectedMagasinId || undefined);
            setTimeSlots(slots);
        } catch (error) {
            console.error('Erreur chargement créneaux:', error);
        }
    };

    const loadRestrictions = async () => {
        try {
            const data = await slotsService.getActiveRestrictions(undefined, undefined, selectedMagasinId || undefined);
            setRestrictions(data);
        } catch (error) {
            console.error('Erreur chargement restrictions:', error);
        }
    };

    const handleBlockSlot = async (slotId: string, reason?: string) => {
        try {
            // 🏪 Passer le magasinId sélectionné (ou undefined pour global)
            await slotsService.blockSlot(selectedDate, slotId, reason, undefined, selectedMagasinId || undefined);
            await loadAvailability();
            await loadRestrictions();
        } catch (error) {
            console.error('Erreur blocage créneau:', error);
            alert('Erreur lors du blocage du créneau: sélectionnez le magasin concerné');
        }
    };

    const handleUnblockSlot = async (slotId: string) => {
        try {
            // 🏪 Passer le magasinId sélectionné (ou undefined pour global)
            await slotsService.unblockSlot(selectedDate, slotId, selectedMagasinId || undefined);
            await loadAvailability();
            await loadRestrictions();
        } catch (error) {
            console.error('Erreur déblocage créneau:', error);
            alert('Erreur lors du déblocage du créneau: sélectionnez le magasin concerné');
        }
    };

    const isSlotBlocked = (slotId: string) => {
        return restrictions.some(r =>
            r.date === selectedDate &&
            r.slotId === slotId &&
            r.isBlocked &&
            // Bloqué si restriction globale OU restriction pour le magasin sélectionné
            (r.magasinId === null || r.magasinId === selectedMagasinId || !selectedMagasinId)
        );
    };

    const getSlotRestriction = (slotId: string) => {
        return restrictions.find(r =>
            r.date === selectedDate &&
            r.slotId === slotId &&
            r.isBlocked &&
            // Bloqué si restriction globale OU restriction pour le magasin sélectionné
            (r.magasinId === null || r.magasinId === selectedMagasinId || !selectedMagasinId)
        );
    };

    const getSlotRestrictions = (slotId: string) => {
        return restrictions.filter(r =>
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

                <div className="flex items-center gap-3">
                    {/* Sélecteur de magasin */}
                    {!readOnly && (
                        <div className="flex items-center gap-2">
                            <Store className="w-5 h-5 text-gray-600" />
                            <select
                                value={selectedMagasinId}
                                onChange={(e) => {
                                    const newValue = e.target.value;
                                    setSelectedMagasinId(newValue);
                                    // Sauvegarder la sélection admin pour la restaurer après rafraîchissement
                                    if (user?.role === 'admin' || user?.role === 'direction') {
                                        if (newValue) {
                                            localStorage.setItem('adminSlotsSelectedMagasin', newValue);
                                        } else {
                                            localStorage.removeItem('adminSlotsSelectedMagasin');
                                        }
                                    }
                                }}
                                disabled={user?.role === 'magasin'}
                                className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    user?.role === 'magasin' ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''
                                }`}
                            >
                                {user?.role !== 'magasin' && <option value="">Créneaux globaux</option>}
                                {magasins.map(magasin => (
                                    <option key={magasin.id} value={magasin.id}>
                                        {magasin.nom}
                                    </option>
                                ))}
                            </select>
                            {user?.role === 'magasin' && (
                                <span className="text-xs text-gray-500 italic">
                                    (Votre magasin)
                                </span>
                            )}
                        </div>
                    )}

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
                                        {/* Badge du créneau (global ou spécifique) */}
                                        {slot.slot.magasin ? (
                                            <p className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mb-1">
                                                📅 Créneau: {slot.slot.magasin.nom}
                                            </p>
                                        ) : slot.slot.magasinId === null ? (
                                            <p className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mb-1">
                                                📅 Créneau: Global
                                            </p>
                                        ) : null}

                                        {/* Badge de la restriction (si bloqué) */}
                                        {user?.role !== 'magasin' && blocked && (() => {
                                            const allRestrictions = getSlotRestrictions(slot.slot.id);
                                            const globalRestriction = allRestrictions.find(r => r.magasinId === null);
                                            const magasinRestrictions = allRestrictions.filter(r => r.magasinId !== null);

                                            return (
                                                <>
                                                    {globalRestriction && (
                                                        <p className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded mb-1">
                                                            🚫 Bloqué globalement
                                                        </p>
                                                    )}
                                                    {magasinRestrictions.length > 0 && (
                                                        <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded mb-1">
                                                            🚫 Bloqué pour: {magasinRestrictions.map(r =>
                                                                magasins.find(m => m.id === r.magasinId)?.nom || 'Magasin inconnu'
                                                            ).join(', ')}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}

                                        <p>Réservations: {slot.bookingsCount}/{slot.maxCapacity}</p>
                                        {!slot.isAvailable && slot.reason && (
                                            <p className="text-red-600">⚠️ {slot.reason}</p>
                                        )}
                                        {restriction?.reason && (
                                            <p className="text-red-600">💬 {restriction.reason}</p>
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
                                        <div className="space-y-3">
                                            {/* En-tête avec nom du créneau */}
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

                                            {/* Assignation magasin */}
                                            <div className="flex items-center justify-between pt-2 border-t">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Magasin assigné:
                                                </label>
                                                <select
                                                    value={slot.magasinId || ''}
                                                    onChange={async (e) => {
                                                        try {
                                                            await slotsService.updateSlot(slot.id, {
                                                                magasinId: e.target.value || null
                                                            });
                                                            await loadTimeSlots();
                                                            await loadAvailability();
                                                        } catch (error) {
                                                            console.error('Erreur mise à jour magasin:', error);
                                                        }
                                                    }}
                                                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">🌍 Global (tous magasins)</option>
                                                    {magasins.map(magasin => (
                                                        <option key={magasin.id} value={magasin.id}>
                                                            {magasin.nom}
                                                        </option>
                                                    ))}
                                                </select>
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