import { useState, useEffect, useMemo } from 'react';
import { FilterOptions, MetricData } from '../types/metrics';
import { useOffline } from '../contexts/OfflineContext';
import { simpleBackendService } from '../services/simple-backend.service';
import { MagasinInfo } from '../types/business.types';


export const useMetricsData = (filters: FilterOptions) => {
    const [data, setData] = useState<MetricData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const { dataService } = useOffline();
    
    // Mémoriser les filtres pour éviter les boucles infinies
    const memoizedFilters = useMemo(() => filters, [
        filters.dateRange,
        filters.store,
        filters.driver,
        filters.startDate,
        filters.endDate
    ]);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            setError(null);

            try {
                console.log('🔄 useMetricsData: Tentative récupération données...');

                // ✅ UTILISER simpleBackendService comme dans Deliveries.tsx
                const [commandes, magasins] = await Promise.all([
                    simpleBackendService.getCommandes(),
                    simpleBackendService.getMagasins()
                ]);

                console.log(`📊 Données récupérées: ${commandes.length} commandes, ${magasins.length} magasins`);

                // Calculer les métriques à partir des commandes
                const metricsData = await calculateMetricsFromCommandes(commandes, filters, magasins);
                setData(metricsData);
                console.log('✅ Métriques calculées avec succès');
                
            } catch (err) {
                console.error('❌ Erreur métriques:', err);

                // ✅ FALLBACK : Essayer avec données locales si l'API échoue
                try {
                    console.log('🔄 Tentative avec données offline...');
                    const localCommandes = await dataService?.getCommandes() || [];
                    const localMagasins = await dataService?.getMagasins() || [];

                    if (localCommandes.length > 0) {
                        console.log(`📊 Utilisation données locales: ${localCommandes.length} commandes`);
                        const metricsData = await calculateMetricsFromCommandes(localCommandes, filters, localMagasins);
                        setData(metricsData);
                        setError('Données locales utilisées (API temporairement indisponible)');
                        return;
                    }
                } catch (fallbackError) {
                    console.error('❌ Fallback local échoué:', fallbackError);
                }

                // ✅ DERNIER RECOURS : Données vides mais interface fonctionnelle
                console.log('🔄 Utilisation données vides par sécurité');
                setData({
                    totalLivraisons: 0,
                    totalCommandes: 0,
                    enCours: 0,
                    enAttente: 0,
                    performance: 0,
                    chiffreAffaires: 0,
                    chauffeursActifs: 0,
                    historique: [{ date: 'Aucune donnée', totalLivraisons: 0, enCours: 0, enAttente: 0 }],
                    statutsDistribution: { enAttente: 0, enCours: 0, termine: 0, echec: 0 },
                    commandes: [],
                    magasins: [{
                        id: 'maintenance',
                        name: 'Service en maintenance',
                        address: 'Reconnexion en cours...',
                        phone: '',
                        email: '',
                        status: 'maintenance',
                        photo: '',
                        manager: ''
                    }],
                    chauffeurs: []
                });
                setError('Service temporairement indisponible - Interface de secours activée');
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [memoizedFilters, dataService]);

    return { data, loading, error };
};

// ✅ FONCTION : Créer données historiques dynamiques selon la période
function createHistoricalData(commandes: any[], filters: FilterOptions, nowFrance: string): any[] {
    console.log(`📊 createHistoricalData appelée avec ${commandes.length} commandes pour période: ${filters.dateRange}`);
    
    switch (filters.dateRange) {
        case 'day':
            // ✅ CORRIGÉ: Horaires 7h-20h et arrêt à l'heure actuelle
            const now = new Date();
            const currentHour = now.getHours();
            
            console.log(`🕒 DEBUG: Heure actuelle: ${currentHour}h`);
            console.log(`📊 DEBUG: Total commandes reçues pour filtrage: ${commandes.length}`);
            
            // ✅ CORRECTION : Génération des créneaux format "07h-08h, 08h-09h..." jusqu'à 20h
            const allCreneaux = [];
            for (let h = 7; h < 20; h++) {
                const heureDebut = h.toString().padStart(2, '0');
                const heureFin = (h + 2).toString().padStart(2, '0');
                allCreneaux.push(`${heureDebut}h-${heureFin}h`);
            }
            
            // ✅ CORRECTION : Pour la vue "day", montrer tous les créneaux de la journée
            // Si c'est après minuit (0h-6h), on affiche la journée complète
            // Si c'est pendant les heures d'activité (7h-20h), on affiche jusqu'à l'heure actuelle
            const creneauxValidees = allCreneaux.filter(creneau => {
                const heureDebut = parseInt(creneau.split('h-')[0]);
                // Si on est en dehors des heures d'activité (0h-6h ou après 20h), montrer toute la journée
                if (currentHour < 7 || currentHour >= 20) {
                    return true; // Montrer tous les créneaux
                }
                // Sinon, montrer jusqu'à l'heure actuelle
                return heureDebut <= currentHour;
            });
            
            console.log(`📊 Créneaux validés pour aujourd'hui: ${creneauxValidees.join(', ')}`);
            console.log(`📅 Date France pour filtrage: ${nowFrance}`);
            
            return creneauxValidees.map(creneau => {
                // Extraire l'heure de début du créneau pour le matching
                const heureDebut = parseInt(creneau.split('h-')[0]);
                
                // ✅ FILTRAGE CORRECT : Commandes d'aujourd'hui avec créneau horaire correspondant + filtre magasin
                const commandesHeure = commandes.filter(c => {
                    try {
                        // 0. ✅ AJOUT : Filtrer par magasin si spécifié
                        if (filters.store && c.magasin?.id !== filters.store) {
                            return false; // Pas le bon magasin
                        }

                        // 1. D'abord vérifier que c'est aujourd'hui
                        const dateLivraison = c.dates?.livraison || c.dateLivraison;
                        if (!dateLivraison) {
                            console.log(`⚠️ Commande ${c.id}: pas de date de livraison`);
                            return false;
                        }

                        const itemDate = new Date(dateLivraison);
                        if (isNaN(itemDate.getTime())) {
                            console.log(`⚠️ Commande ${c.id}: date invalide`);
                            return false;
                        }

                        const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                            timeZone: 'Europe/Paris'
                        });

                        if (itemDateStr !== nowFrance) {
                            console.log(`📅 Commande ${c.id}: date ${itemDateStr} ≠ aujourd'hui ${nowFrance}`);
                            return false; // Pas aujourd'hui
                        }

                        console.log(`✅ Commande ${c.id}: date OK (${itemDateStr})`);

                        // 2. Ensuite vérifier le créneau horaire
                        const creneauCommande = c.livraison?.creneau;
                        if (!creneauCommande) {
                            console.log(`⚠️ Commande ${c.id}: pas de créneau`);
                            return false;
                        }

                        console.log(`🕒 Commande ${c.id}: créneau "${creneauCommande}"`);

                        // ✅ CORRECTION : Correspondance EXACTE pour éviter les doublons
                        if (typeof creneauCommande === 'string') {
                            // Extraction de l'heure de début du créneau de la commande
                            const match = creneauCommande.match(/(\d+)h/);
                            if (match) {
                                const creneauHeureCommande = parseInt(match[1]);
                                const corresponds = creneauHeureCommande === heureDebut;

                                console.log(`🔍 Commande ${c.id}: heure créneau ${creneauHeureCommande} ${corresponds ? '==' : '≠'} heure filtre ${heureDebut}`);

                                // ✅ CORRESPONDANCE EXACTE : L'heure de début de la commande = heure de début du créneau affiché
                                // Ex: Commande "12h-14h" ne correspond QU'AU créneau "12h-14h", pas au "11h-13h"
                                return corresponds;
                            }
                        }

                        return false;
                    } catch (error) {
                        console.warn(`Erreur filtrage commande ${c.id}:`, error);
                        return false;
                    }
                });
                
                
                const result = {
                    date: creneau, // ✅ CORRECTION : Afficher le créneau complet (07h-08h)
                    totalLivraisons: commandesHeure.filter(c => c.statuts?.livraison === 'LIVREE').length,
                    enCours: commandesHeure.filter(c => ['EN COURS DE LIVRAISON', 'ENLEVEE'].includes(c.statuts?.livraison)).length,
                    enAttente: commandesHeure.filter(c => ['EN ATTENTE', 'CONFIRMEE'].includes(c.statuts?.livraison)).length,
                    chiffreAffaires: commandesHeure.filter(c => c.statuts?.livraison === 'LIVREE').reduce((sum, c) => sum + (c.financier?.tarifHT || 0), 0),
                    performance: commandesHeure.length > 0 ? Math.round((commandesHeure.filter(c => c.statuts?.livraison === 'LIVREE').length / commandesHeure.length) * 100) : 0
                };
                
                console.log(`📊 Créneau ${creneau}: ${commandesHeure.length} commandes trouvées, résultat:`, result);
                return result;
            });
            
        case 'week':
            // ✅ CORRIGÉ: Format complet des dates pour la semaine
            console.log(`📊 DEBUG semaine: commandes reçues=${commandes.length}`);
            const joursNoms = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
            const nowWeek = new Date();
            const currentDay = nowWeek.getDay() === 0 ? 7 : nowWeek.getDay(); // Dimanche = 7, Lundi = 1
            console.log(`📊 Jour actuel: ${currentDay} (1=Lundi, 7=Dimanche)`);
            
            return joursNoms.map((jour, index) => {
                const jourDate = new Date(nowWeek);
                jourDate.setDate(nowWeek.getDate() - nowWeek.getDay() + 1 + index); // Lundi = 1
                
                // ✅ CORRECTION : Afficher TOUS les 7 jours (même futurs avec 0 données)
                
                const jourDateStr = jourDate.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
                
                // ✅ Format "Dim 14 sep" demandé
                const jourFormate = jourDate.toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    timeZone: 'Europe/Paris'
                }).replace('.', ''); // Supprimer le point après le mois
                
                // ✅ FILTRAGE CORRECT : Commandes de cette semaine pour ce jour spécifique + filtre magasin
                const commandesJour = commandes.filter(c => {
                    // ✅ AJOUT : Filtrer par magasin si spécifié
                    if (filters.store && c.magasin?.id !== filters.store) {
                        return false; // Pas le bon magasin
                    }

                    const dateLivraison = c.dates?.livraison || c.dateLivraison;
                    if (!dateLivraison) return false;

                    const itemDate = new Date(dateLivraison);
                    const itemDateStr = itemDate.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });

                    // Vérifier que c'est bien dans cette semaine ET ce jour précis
                    return itemDateStr === jourDateStr;
                });
                
                return {
                    date: jourFormate, // ✅ Format complet "Dim 14 sep"
                    totalLivraisons: commandesJour.filter(c => c.statuts?.livraison === 'LIVREE').length, // ✅ CORRIGÉ: seulement LIVREE
                    enCours: commandesJour.filter(c => ['EN COURS DE LIVRAISON', 'ENLEVEE'].includes(c.statuts?.livraison)).length, // ✅ CORRIGÉ
                    enAttente: commandesJour.filter(c => ['EN ATTENTE', 'CONFIRMEE'].includes(c.statuts?.livraison)).length, // ✅ CORRIGÉ
                    chiffreAffaires: commandesJour.filter(c => c.statuts?.livraison === 'LIVREE').reduce((sum, c) => sum + (c.financier?.tarifHT || 0), 0),
                    performance: commandesJour.length > 0 ? Math.round((commandesJour.filter(c => c.statuts?.livraison === 'LIVREE').length / commandesJour.length) * 100) : 0
                };
            }); // ✅ CORRECTION : Garder tous les jours (plus de filter(Boolean))
            
        case 'month':
            // Pour "Ce mois" : Grouper par semaines
            const semaines = ['S1', 'S2', 'S3', 'S4'];
            const nowMonth = new Date();
            const debutMois = new Date(nowMonth.getFullYear(), nowMonth.getMonth(), 1);
            return semaines.map((semaine, index) => {
                const debutSemaine = new Date(debutMois);
                debutSemaine.setDate(1 + (index * 7));
                const finSemaine = new Date(debutSemaine);
                finSemaine.setDate(debutSemaine.getDate() + 6);
                
                const commandesSemaine = commandes.filter(c => {
                    // ✅ AJOUT : Filtrer par magasin si spécifié
                    if (filters.store && c.magasin?.id !== filters.store) {
                        return false; // Pas le bon magasin
                    }

                    const dateLivraison = c.dates?.livraison || c.dateLivraison;
                    if (!dateLivraison) return false;

                    const itemDate = new Date(dateLivraison);
                    return itemDate >= debutSemaine && itemDate <= finSemaine;
                });
                
                return {
                    date: semaine,
                    totalLivraisons: commandesSemaine.filter(c => c.statuts?.livraison === 'LIVREE').length, // ✅ CORRIGÉ: seulement LIVREE
                    enCours: commandesSemaine.filter(c => ['EN COURS DE LIVRAISON', 'ENLEVEE'].includes(c.statuts?.livraison)).length, // ✅ CORRIGÉ: sans CONFIRMEE
                    enAttente: commandesSemaine.filter(c => ['EN ATTENTE', 'CONFIRMEE'].includes(c.statuts?.livraison)).length, // ✅ CORRIGÉ: CONFIRMEE = attente
                    chiffreAffaires: commandesSemaine.filter(c => c.statuts?.livraison === 'LIVREE').reduce((sum, c) => sum + (c.financier?.tarifHT || 0), 0),
                    performance: commandesSemaine.length > 0 ? Math.round((commandesSemaine.filter(c => c.statuts?.livraison === 'LIVREE').length / commandesSemaine.length) * 100) : 0
                };
            });
            
        case 'year':
            // Pour "Cette année" : Grouper par mois
            const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
            const nowYear = new Date();
            return mois.map((moisNom, index) => {
                const commandesMois = commandes.filter(c => {
                    // ✅ AJOUT : Filtrer par magasin si spécifié
                    if (filters.store && c.magasin?.id !== filters.store) {
                        return false; // Pas le bon magasin
                    }

                    const dateLivraison = c.dates?.livraison || c.dateLivraison;
                    if (!dateLivraison) return false;

                    const itemDate = new Date(dateLivraison);
                    return itemDate.getFullYear() === nowYear.getFullYear() && itemDate.getMonth() === index;
                });
                
                return {
                    date: moisNom,
                    totalLivraisons: commandesMois.filter(c => c.statuts?.livraison === 'LIVREE').length, // ✅ CORRIGÉ: seulement LIVREE
                    enCours: commandesMois.filter(c => ['EN COURS DE LIVRAISON', 'ENLEVEE'].includes(c.statuts?.livraison)).length, // ✅ CORRIGÉ: sans CONFIRMEE
                    enAttente: commandesMois.filter(c => ['EN ATTENTE', 'CONFIRMEE'].includes(c.statuts?.livraison)).length, // ✅ CORRIGÉ: CONFIRMEE = attente
                    chiffreAffaires: commandesMois.filter(c => c.statuts?.livraison === 'LIVREE').reduce((sum, c) => sum + (c.financier?.tarifHT || 0), 0),
                    performance: commandesMois.length > 0 ? Math.round((commandesMois.filter(c => c.statuts?.livraison === 'LIVREE').length / commandesMois.length) * 100) : 0
                };
            });
            
        default:
            // Fallback : données par défaut avec filtre magasin
            const commandesFiltered = commandes.filter(c => {
                if (filters.store && c.magasin?.id !== filters.store) {
                    return false; // Pas le bon magasin
                }
                return true;
            });

            return [
                {
                    date: 'Données',
                    totalLivraisons: commandesFiltered.filter(c => c.statuts?.livraison === 'LIVREE').length,
                    enCours: commandesFiltered.filter(c => ['EN COURS DE LIVRAISON', 'ENLEVEE'].includes(c.statuts?.livraison)).length,
                    enAttente: commandesFiltered.filter(c => ['EN ATTENTE', 'CONFIRMEE'].includes(c.statuts?.livraison)).length,
                    chiffreAffaires: commandesFiltered.filter(c => c.statuts?.livraison === 'LIVREE').reduce((sum, c) => sum + (c.financier?.tarifHT || 0), 0),
                    performance: commandesFiltered.length > 0 ? Math.round((commandesFiltered.filter(c => c.statuts?.livraison === 'LIVREE').length / commandesFiltered.length) * 100) : 0
                }
            ];
    }
}


// ✅ FONCTION : Calculer métriques à partir des commandes backend
async function calculateMetricsFromCommandes(commandes: any[], filters: FilterOptions, magasins: MagasinInfo[]): Promise<MetricData> {
    // Utiliser le fuseau horaire français pour les calculs
    const nowFrance = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Europe/Paris'
    });
    
    console.log(`🔍 Filtrage par période: ${filters.dateRange}, aujourd'hui: ${nowFrance}`);
    console.log(`🔍 Total commandes reçues: ${commandes.length}`);
    
    // ✅ DEBUG : Examiner la structure des dates des première commandes
    if (commandes.length > 0) {
        console.log('🔍 DEBUG - Structure dates premières commandes:');
        commandes.slice(0, 3).forEach((c, i) => {
            console.log(`   Commande ${i}:`, {
                id: c.id,
                dates: c.dates,
                dateLivraison: c.dateLivraison,
                statutLivraison: c.statuts?.livraison
            });
        });
    }
    
    // Filtrer par période avec fuseau français
    let filteredCommandes = commandes;

    // Filtrer par période courante
    switch (filters.dateRange) {
        case 'day':
            filteredCommandes = commandes.filter(c => {
                try {
                    const dateLivraison = c.dates?.livraison || c.dateLivraison;
                    if (!dateLivraison) return false;

                    const itemDate = new Date(dateLivraison);
                    if (isNaN(itemDate.getTime())) return false; // Date invalide

                    const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                        timeZone: 'Europe/Paris'
                    });

                    return itemDateStr === nowFrance;
                } catch (error) {
                    console.warn('Erreur filtrage commande:', c.id, error);
                    return false;
                }
            });
            console.log(`📅 Aujourd'hui: ${filteredCommandes.length} commandes`);
            break;
            
        case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = weekAgo.toLocaleDateString('en-CA', {
                timeZone: 'Europe/Paris'
            });

            filteredCommandes = commandes.filter(c => {
                try {
                    const dateLivraison = c.dates?.livraison || c.dateLivraison;
                    if (!dateLivraison) return false;

                    const itemDate = new Date(dateLivraison);
                    if (isNaN(itemDate.getTime())) return false;

                    const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                        timeZone: 'Europe/Paris'
                    });

                    return itemDateStr >= weekAgoStr && itemDateStr <= nowFrance;
                } catch (error) {
                    console.warn('Erreur filtrage commande week:', c.id, error);
                    return false;
                }
            });
            console.log(`📅 Cette semaine: ${filteredCommandes.length} commandes`);
            break;
            
        case 'month':
            const monthStart = new Date();
            monthStart.setDate(1);
            const monthStartStr = monthStart.toLocaleDateString('en-CA', {
                timeZone: 'Europe/Paris'
            });

            filteredCommandes = commandes.filter(c => {
                try {
                    const dateLivraison = c.dates?.livraison || c.dateLivraison;
                    if (!dateLivraison) return false;

                    const itemDate = new Date(dateLivraison);
                    if (isNaN(itemDate.getTime())) return false;

                    const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                        timeZone: 'Europe/Paris'
                    });

                    return itemDateStr >= monthStartStr && itemDateStr <= nowFrance;
                } catch (error) {
                    console.warn('Erreur filtrage commande month:', c.id, error);
                    return false;
                }
            });
            console.log(`📅 Ce mois: ${filteredCommandes.length} commandes`);
            break;
            
        case 'year':
            const yearStart = new Date();
            yearStart.setMonth(0, 1);
            const yearStartStr = yearStart.toLocaleDateString('en-CA', {
                timeZone: 'Europe/Paris'
            });

            filteredCommandes = commandes.filter(c => {
                try {
                    const dateLivraison = c.dates?.livraison || c.dateLivraison;
                    if (!dateLivraison) return false;

                    const itemDate = new Date(dateLivraison);
                    if (isNaN(itemDate.getTime())) return false;

                    const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                        timeZone: 'Europe/Paris'
                    });

                    return itemDateStr >= yearStartStr && itemDateStr <= nowFrance;
                } catch (error) {
                    console.warn('Erreur filtrage commande year:', c.id, error);
                    return false;
                }
            });
            console.log(`📅 Cette année: ${filteredCommandes.length} commandes`);
            break;
            
        default:
            console.log(`📅 Toutes les commandes: ${filteredCommandes.length} commandes`);
    }
    
    // Filtrer par magasin si spécifié
    if (filters.store) {
        console.log(`🏪 ===== DIAGNOSTIC FILTRAGE MAGASIN =====`);
        console.log(`🏪 Filtre demandé: "${filters.store}"`);
        console.log(`🏪 Commandes avant filtrage magasin: ${filteredCommandes.length}`);
        
        // Diagnostic détaillé des structures de magasins
        const exemplesMagasins = filteredCommandes.slice(0, 3).map(c => ({
            id: c.magasin?.id,
            name: c.magasin?.name,
            nom: c.magasin?.nom,
            structure: Object.keys(c.magasin || {})
        }));
        console.log(`🏪 Exemples structures magasins:`, exemplesMagasins);
        
        // Liste unique des magasins présents
        const magasinsPresents = Array.from(new Set<string>(
            filteredCommandes.map(c => c.magasin?.name || c.magasin?.nom || c.magasin?.id)
                .filter(Boolean) as string[]
        ));
        console.log(`🏪 Magasins présents dans les données:`, magasinsPresents);
        
        const beforeCount = filteredCommandes.length;
        filteredCommandes = filteredCommandes.filter(c => {
            const matches = c.magasin?.id === filters.store || 
                           c.magasin?.name === filters.store ||
                           c.magasin?.nom === filters.store;
            
            if (!matches && c.magasin) {
                // Log des non-correspondances pour debugging
                console.log(`🔍 Non-match:`, {
                    filter: filters.store,
                    magasin: { id: c.magasin.id, name: c.magasin.name, nom: c.magasin.nom }
                });
            }
            
            return matches;
        });
        
        console.log(`🏪 Résultat filtrage: ${filteredCommandes.length}/${beforeCount} commandes`);
        console.log(`🏪 ==========================================`);
    }
    
    // ✅ CALCUL MÉTRIQUE CORRIGÉ selon définitions business
    const totalCommandes = filteredCommandes.length; // Total général pour calculs internes
    
    // 🎯 DÉFINITIONS CORRECTES :
    const commandesLivrees = filteredCommandes.filter(c => c.statuts?.livraison === 'LIVREE').length; // ✅ Total Livraisons = LIVREE uniquement
    const commandesEnCours = filteredCommandes.filter(c => 
        ['EN COURS DE LIVRAISON', 'ENLEVEE'].includes(c.statuts?.livraison) // ✅ En cours = ENLEVEE + EN COURS (pas CONFIRMEE)
    ).length;
    const commandesAnnulees = filteredCommandes.filter(c => 
        ['ANNULEE', 'ECHEC'].includes(c.statuts?.livraison)
    ).length;
    const enAttente = filteredCommandes.filter(c => 
        ['EN ATTENTE', 'CONFIRMEE'].includes(c.statuts?.livraison) // ✅ CONFIRMEE = en attente de traitement
    ).length;
    
    // ✅ Chiffre d'affaires = uniquement livraisons réussies (LIVREE)
    const chiffreAffaires = filteredCommandes
        .filter(c => c.statuts?.livraison === 'LIVREE')
        .reduce((sum, c) => sum + (c.financier?.tarifHT || 0), 0);
    
    // ✅ Performance = % de livraisons réussies sur total des commandes
    const tauxLivraison = totalCommandes > 0 ? (commandesLivrees / totalCommandes) * 100 : 0;
    
    // Calculer les chauffeurs actifs
    const chauffeursActifs = new Set<string>(
        filteredCommandes
            .filter(c => ['EN COURS DE LIVRAISON', 'CONFIRMEE', 'ENLEVEE'].includes(c.statuts?.livraison))
            .flatMap(c => c.chauffeurs || [])
            .map(chauffeur => chauffeur.id)
    ).size;
    
    // Créer des données d'historique dynamiques selon la période
    // ✅ IMPORTANT : Passer TOUTES les commandes mais que createHistoricalData applique le filtre magasin
    const historique = createHistoricalData(commandes, filters, nowFrance);
    
    // Calculer la distribution des statuts
    const statutsDistribution = {
        enAttente: totalCommandes > 0 ? enAttente / totalCommandes : 0,
        enCours: totalCommandes > 0 ? commandesEnCours / totalCommandes : 0,
        termine: totalCommandes > 0 ? commandesLivrees / totalCommandes : 0,
        echec: totalCommandes > 0 ? commandesAnnulees / totalCommandes : 0
    };
    
    console.log('✅ Utilisation des magasins récupérés via API:', magasins.length, 'magasins');
    console.log('📋 Exemples:', magasins.slice(0, 2));
    
    return {
        totalLivraisons: commandesLivrees, // ✅ CORRIGÉ: livraisons réussies uniquement (LIVREE)
        totalCommandes, // ✅ AJOUT : Total de toutes les commandes pour format "X sur Y"
        enCours: commandesEnCours,
        enAttente,
        performance: Math.round(tauxLivraison),
        chiffreAffaires,
        chauffeursActifs,
        historique,
        statutsDistribution,
        commandes: filteredCommandes,
        magasins,
        chauffeurs: []
    };
}