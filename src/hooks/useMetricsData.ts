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
        console.log('🔄 useMetricsData useEffect déclenché avec filtres:', JSON.stringify(filters));
        
        const fetchMetrics = async () => {
            setLoading(true);
            setError(null);
            
            try {
                console.log('📊 Récupération métriques avec filtres:', filters);
                
                // ✅ UTILISER simpleBackendService comme dans Deliveries.tsx
                const [commandes, magasins] = await Promise.all([
                    simpleBackendService.getCommandes(),
                    simpleBackendService.getMagasins()
                ]);
                console.log(`📈 ${commandes.length} commandes récupérées pour calcul métriques`);
                console.log(`🏪 ${magasins.length} magasins récupérés`);
                
                // Calculer les métriques à partir des commandes
                const metricsData = await calculateMetricsFromCommandes(commandes, filters, magasins);
                
                setData(metricsData);
                console.log('✅ Métriques calculées:', metricsData);
                
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des métriques';
                setError(errorMessage);
                console.error('❌ Erreur métriques:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [memoizedFilters, dataService]);

    return { data, loading, error };
};

// ✅ FONCTION : Créer données historiques dynamiques selon la période
function createHistoricalData(commandes: any[], dateRange: string, nowFrance: string): any[] {
    console.log(`📊 createHistoricalData appelée avec ${commandes.length} commandes pour période: ${dateRange}`);
    
    switch (dateRange) {
        case 'day':
            // ✅ CORRIGÉ: Horaires 7h-20h et arrêt à l'heure actuelle
            const now = new Date();
            const currentHour = now.getHours();
            
            // Génération des créneaux de 7h à 20h
            const allHeures = [];
            for (let h = 7; h <= 20; h++) {
                allHeures.push(`${h}h`);
            }
            
            // Ne garder que les heures jusqu'à l'heure actuelle (ou +1h pour inclusion)
            const heuresValidees = allHeures.filter(heure => {
                const heureNum = parseInt(heure);
                return heureNum <= currentHour + 1; // +1h pour inclure l'heure en cours
            });
            
            console.log(`📊 Heures validées pour aujourd'hui: ${heuresValidees.join(', ')}`);
            
            return heuresValidees.map(heure => {
                const heureNum = parseInt(heure);
                
                // ✅ FILTRAGE CORRECT : Commandes d'aujourd'hui avec créneau horaire correspondant
                const commandesHeure = commandes.filter(c => {
                    // 1. D'abord vérifier que c'est aujourd'hui
                    const dateLivraison = c.dates?.livraison || c.dateLivraison;
                    if (!dateLivraison) return false;
                    
                    const itemDate = new Date(dateLivraison);
                    const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                        timeZone: 'Europe/Paris'
                    });
                    
                    if (itemDateStr !== nowFrance) return false; // Pas aujourd'hui
                    
                    // 2. Ensuite vérifier le créneau horaire
                    const creneau = c.livraison?.creneau;
                    if (!creneau) return false;
                    
                    // Extraction de l'heure du créneau (ex: "14h-16h" -> 14)
                    let creneauHeure;
                    if (typeof creneau === 'string') {
                        const match = creneau.match(/(\d+)h/);
                        if (match) {
                            creneauHeure = parseInt(match[1]);
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                    
                    // Correspondance exacte avec l'heure
                    return creneauHeure === heureNum;
                });
                
                return {
                    date: heure,
                    totalLivraisons: commandesHeure.filter(c => c.statuts?.livraison === 'LIVREE').length, // ✅ CORRIGÉ: seulement LIVREE
                    enCours: commandesHeure.filter(c => ['EN COURS DE LIVRAISON', 'ENLEVEE'].includes(c.statuts?.livraison)).length, // ✅ CORRIGÉ: sans CONFIRMEE
                    enAttente: commandesHeure.filter(c => ['EN ATTENTE', 'CONFIRMEE'].includes(c.statuts?.livraison)).length, // ✅ CORRIGÉ: CONFIRMEE = attente
                    chiffreAffaires: commandesHeure.filter(c => c.statuts?.livraison === 'LIVREE').reduce((sum, c) => sum + (c.financier?.tarifHT || 0), 0),
                    performance: commandesHeure.length > 0 ? Math.round((commandesHeure.filter(c => c.statuts?.livraison === 'LIVREE').length / commandesHeure.length) * 100) : 0
                };
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
                
                // ✅ FILTRAGE CORRECT : Commandes de cette semaine pour ce jour spécifique
                const commandesJour = commandes.filter(c => {
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
            // Fallback : données par défaut
            return [
                { 
                    date: 'Données', 
                    totalLivraisons: commandes.filter(c => c.statuts?.livraison === 'LIVREE').length, 
                    enCours: commandes.filter(c => ['EN COURS DE LIVRAISON', 'ENLEVEE'].includes(c.statuts?.livraison)).length, 
                    enAttente: commandes.filter(c => ['EN ATTENTE', 'CONFIRMEE'].includes(c.statuts?.livraison)).length,
                    chiffreAffaires: commandes.filter(c => c.statuts?.livraison === 'LIVREE').reduce((sum, c) => sum + (c.financier?.tarifHT || 0), 0),
                    performance: commandes.length > 0 ? Math.round((commandes.filter(c => c.statuts?.livraison === 'LIVREE').length / commandes.length) * 100) : 0 
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
    
    switch (filters.dateRange) {
        case 'day':
            filteredCommandes = commandes.filter(c => {
                const dateLivraison = c.dates?.livraison || c.dateLivraison;
                if (!dateLivraison) return false;
                
                const itemDate = new Date(dateLivraison);
                const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                    timeZone: 'Europe/Paris'
                });
                
                return itemDateStr === nowFrance;
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
                const dateLivraison = c.dates?.livraison || c.dateLivraison;
                if (!dateLivraison) return false;
                
                const itemDate = new Date(dateLivraison);
                const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                    timeZone: 'Europe/Paris'
                });
                
                return itemDateStr >= weekAgoStr && itemDateStr <= nowFrance;
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
                const dateLivraison = c.dates?.livraison || c.dateLivraison;
                if (!dateLivraison) return false;
                
                const itemDate = new Date(dateLivraison);
                const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                    timeZone: 'Europe/Paris'
                });
                
                return itemDateStr >= monthStartStr && itemDateStr <= nowFrance;
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
                const dateLivraison = c.dates?.livraison || c.dateLivraison;
                if (!dateLivraison) return false;
                
                const itemDate = new Date(dateLivraison);
                const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                    timeZone: 'Europe/Paris'
                });
                
                return itemDateStr >= yearStartStr && itemDateStr <= nowFrance;
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
    // ✅ IMPORTANT : Passer TOUTES les commandes pour que createHistoricalData fasse son propre filtrage
    const historique = createHistoricalData(commandes, filters.dateRange, nowFrance);
    
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