import React, { useEffect, useMemo, useRef, useState } from 'react';
// import { AirtableService } from '../../services/airtable.service'; // ✅ SUPPRIMÉ - Migration vers backend My Truck
import { CommandeMetier } from '../../types/business.types';
import Pagination from '../../components/Pagination';
import CommandeDetails from '../../components/CommandeDetails';
import { useAuth } from '../../contexts/AuthContext';
// import { useAirtable } from '../../hooks/useAirtable';
import { RoleSelector } from '../../components/RoleSelector';
import { getStatutCommandeStyle, getStatutLivraisonStyle } from '../../styles/getStatus';
import { useSearch } from '../../hooks/useSearch';
import { useSort } from '../../hooks/useSort';
import { usePagination } from '../../hooks/usePagination';
import { DateRange, SortableFields } from '../../types/hooks.types';
import { dateFormatter } from '../../utils/formatters';
import { Modal } from '../../components/Modal';
import AjoutCommande from '../../components/AjoutCommande';
import { useDraftStorage } from '../../hooks/useDraftStorage';
import { simpleBackendService } from '../../services/simple-backend.service';
import { useOffline } from '../../contexts/OfflineContext';
import { useCommandeExpiration } from '../../hooks/useCommandeExpiration';
import { isAdminRole } from '../../utils/role-helpers';
import { cessionService } from '../../services/cession.service';

// Extend the Window interface to include debugDeliveries for TypeScript
declare global {
    interface Window {
        debugDeliveries?: () => void;
    }
}

interface DeliveriesProps {
    /** Type de commande à afficher : undefined=toutes, 'CLIENT'=livraisons, 'INTER_MAGASIN'=cessions */
    type?: 'CLIENT' | 'INTER_MAGASIN';
}

const Deliveries: React.FC<DeliveriesProps> = ({ type }) => {
    const { user } = useAuth();
    const { dataService, isOnline } = useOffline();
    // const airtable = useAirtable();

    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [data, setData] = useState<CommandeMetier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>({
        start: null,
        end: null,
        mode: 'range',
        singleDate: null
    });
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // ✅ NOUVEAUX ÉTATS pour suppression multiple
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // ✅ NOUVEL ÉTAT pour filtres temporels
    const [temporalFilter, setTemporalFilter] = useState<'all' | 'today' | 'upcoming' | 'history'>('all');

    // Filtrer les données selon le rôle de l'utilisateur
    const filteredByRoleData = useMemo(() => {
        // Si c'est un admin, pas de filtrage
        if (isAdminRole(user?.role)) return data;

        // Si c'est un magasin, filtrer par storeId
        if (user?.role === 'magasin' && user.storeId) {
            return data.filter(item => {
                // Pour les commandes normales : vérifier magasin.id
                const isNormalCommande = item.magasin?.id === user.storeId;

                // Pour les cessions : vérifier AUSSI magasinDestination.id (le magasin demandeur)
                const isCessionDemandeur = item.magasinDestination?.id === user.storeId;

                // Garder si le magasin est soit le magasin normal, soit le demandeur de la cession
                return isNormalCommande || isCessionDemandeur;
            });
        }

        // Si c'est un chauffeur, filtrer par driverId
        if (user?.role === 'chauffeur' && user.driverId) {
            return data.filter(item =>
                item.chauffeurs?.some(chauffeur => chauffeur.id === user.driverId)
            );
        }

        // Par défaut, retourner toutes les données
        return data;
    }, [data, user?.role, user?.storeId, user?.driverId]);

    // ✅ FILTRAGE TEMPOREL après le filtrage par rôle
    const filteredByTemporalData = useMemo(() => {
        console.log('🔍 DEBUG - Filtre temporel actuel:', temporalFilter);

        if (temporalFilter === 'all') return filteredByRoleData;

        // Utiliser le fuseau horaire français pour les livraisons
        const todayFrance = new Date().toLocaleDateString('en-CA', {
            timeZone: 'Europe/Paris'
        });
        const todayStr = todayFrance; // Format YYYY-MM-DD

        const filtered = filteredByRoleData.filter(item => {
            const livraisonDate = item.dates?.livraison || item.dateLivraison;
            if (!livraisonDate) return false;

            const itemDate = new Date(livraisonDate);
            const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                timeZone: 'Europe/Paris'
            });

            switch (temporalFilter) {
                case 'today':
                    return itemDateStr === todayStr;

                case 'upcoming':
                    // À venir : commandes datées après aujourd'hui (peu importe le statut)
                    return itemDateStr > todayStr;

                case 'history':
                    // Historique : TOUTES les commandes dont les dates sont passées
                    return itemDateStr < todayStr;

                default:
                    return true;
            }
        });

        console.log(`🔍 DEBUG - Résultats filtrés (${temporalFilter}):`, filtered.length, 'sur', filteredByRoleData.length);
        return filtered;
    }, [filteredByRoleData, temporalFilter]);

    // Filtrer par date après le filtrage par rôle et temporel
    const filteredData: CommandeMetier[] = useMemo(() => {
        return filteredByTemporalData.filter(item => {
            if (!dateRange.start || !dateRange.end) return true;
            const itemDate = new Date(item.dates.livraison);
            return itemDate >= new Date(dateRange.start) &&
                itemDate <= new Date(dateRange.end);
        });
    }, [filteredByTemporalData, dateRange]);

    // ✅ COMPTEURS basés sur la MÊME logique que le filtrage
    const temporalCounts = useMemo(() => {
        // Utiliser le fuseau horaire français pour les livraisons
        const todayFrance = new Date().toLocaleDateString('en-CA', {
            timeZone: 'Europe/Paris'
        });
        const todayStr = todayFrance; // Format YYYY-MM-DD

        const counts = {
            all: filteredByRoleData.length,
            today: 0,
            upcoming: 0,
            history: 0
        };

        // Utiliser EXACTEMENT la même logique que le filtrage
        filteredByRoleData.forEach((item, index) => {
            const livraisonDate = item.dates?.livraison || item.dateLivraison;
            if (!livraisonDate) return; // Même condition que le filtrage

            const itemDate = new Date(livraisonDate);
            const itemDateStr = itemDate.toLocaleDateString('en-CA', {
                timeZone: 'Europe/Paris'
            });

            // Debug détaillé pour les premières commandes
            if (index < 10) {
                console.log(`📅 Commande ${index + 1} (${item.numeroCommande}):`, {
                    dateBrute: livraisonDate,
                    dateObjet: itemDate.toString(),
                    dateISO: itemDateStr,
                    aujourdhui: todayStr,
                    comparaison: {
                        isToday: itemDateStr === todayStr,
                        isUpcoming: itemDateStr > todayStr,
                        isHistory: itemDateStr < todayStr
                    }
                });
            }

            if (itemDateStr === todayStr) {
                counts.today++;
            } else if (itemDateStr > todayStr) {
                counts.upcoming++;
            } else if (itemDateStr < todayStr) {
                counts.history++;
            }
        });

        // Debug fuseau horaire
        const nowLocal = new Date();
        const nowUTC = new Date();
        console.log('🕒 DEBUG FUSEAU HORAIRE:');
        console.log('  - Heure locale actuelle:', nowLocal.toString());
        console.log('  - Heure UTC actuelle:', nowUTC.toISOString());
        console.log('  - Date locale (YYYY-MM-DD):', nowLocal.toLocaleDateString('en-CA')); // Format ISO local
        console.log('  - Date UTC (YYYY-MM-DD):', nowUTC.toISOString().split('T')[0]);
        console.log('  - Fuseau horaire système:', Intl.DateTimeFormat().resolvedOptions().timeZone);
        console.log('  - Décalage UTC (minutes):', nowLocal.getTimezoneOffset());

        console.log('🔍 DEBUG - Compteurs unifiés:', counts);
        return counts;
    }, [filteredByRoleData]);

    const { clearDraft } = useDraftStorage();

    const isCreatingCommandeRef = useRef(false);

    // ✅ Clés de recherche complètes pour tous les types (livraisons + cessions)
    const searchKeys: Array<keyof CommandeMetier | string> = [
        // Commun à tous
        'numeroCommande',
        'dates.livraison',
        'statuts.livraison',
        'statuts.commande',
        'livraison.creneau',
        'livraison.vehicule',
        'livraison.remarques',
        'chauffeurs',
        'financier.tarifHT',
        'articles.dimensions',

        // Magasin (présent pour tous)
        'magasin.name',
        'magasin.address',

        // Client (pour livraisons classiques)
        'client.nom',
        'client.prenom',
        'client.nomComplet',
        'client.adresse.ligne1',
        'client.adresse.type',
        'client.telephone.principal',
        'client.telephone.secondaire',
        'livraison.reserve',

        // Cessions inter-magasins
        'magasinDestination.name',
        'magasinDestination.address',
        'magasinDestination.phone',
        'magasinDestination.email',
        'cession.motif',
        'cession.priorite',
    ];

    const { search, setSearch, filteredItems: searchedItems } = useSearch({
        items: filteredData,
        searchKeys
    });

    const { sortConfig, setSortConfig, sortedItems } = useSort(searchedItems, 'dates');

    const { currentPage, setCurrentPage, paginatedItems, totalPages } = usePagination({
        items: sortedItems,
        itemsPerPage: rowsPerPage
    });

    // ✅ HOOK EXPIRATION AUTOMATIQUE
    const { checkExpiredCommandes } = useCommandeExpiration({
        commandes: data,
        onCommandesUpdated: () => fetchData(),
        enabled: isAdminRole(user?.role) // Seuls les admins peuvent déclencher l'expiration
    });

    // ✅ Réinitialiser la pagination quand la recherche change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, setCurrentPage]);

    useEffect(() => {
        const loadCommandesFromBackend = async () => {
            try {
                setLoading(true);
                setError(null);

                const commandes = await simpleBackendService.getCommandes(type);

                console.log(`✅ ${type === 'INTER_MAGASIN' ? 'Cessions' : 'Commandes'} chargées:`, commandes.length);

                // ✅ FILTRAGE SÉCURISÉ côté frontend selon le type de page
                const filteredCommandes = type
                    ? commandes.filter(cmd => {
                        // Pour page /cessions : ne garder QUE les cessions (type INTER_MAGASIN OU magasinDestination présent)
                        if (type === 'INTER_MAGASIN') {
                            return cmd.magasinDestination != null;
                        }
                        // Pour page /deliveries : ne garder QUE les commandes CLIENT (PAS de magasinDestination)
                        if (type === 'CLIENT') {
                            return cmd.magasinDestination == null;
                        }
                        return true;
                    })
                    : commandes; // Si pas de type spécifié, tout afficher

                console.log(`🔍 Après filtrage frontend: ${filteredCommandes.length} ${type === 'INTER_MAGASIN' ? 'cessions' : 'commandes'}`);

                setData(filteredCommandes);
            } catch (err) {
                console.error('❌ Erreur chargement Backend:', err);
                setError(`Erreur: ${err}`);
                // Fallback vers données vides pour éviter le crash
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        loadCommandesFromBackend();
    }, []);

    useEffect(() => {
        fetchData();
    }, [user]);

    // Réagir aux changements de rôle/magasin
    useEffect(() => {
        const handleRoleChange = (event: Event) => {
            // Recharger les données
            fetchData();
            // Réinitialiser la pagination
            setCurrentPage(1);
        };

        window.addEventListener('rolechange', handleRoleChange);
        window.addEventListener('storechange', handleRoleChange);

        return () => {
            window.removeEventListener('rolechange', handleRoleChange);
            window.removeEventListener('storechange', handleRoleChange);
        };
    }, []);

    useEffect(() => {
        // Debug automatique en dev
        if (process.env.NODE_ENV === 'development') {
            window.debugDeliveries = () => dataService.debugDeliversPage();
            console.log('💡 Debug disponible: window.debugDeliveries()');
        }
    }, []);

    const fetchData = async (contextToPreserve?: {
        page: number;
        expandedRow: string | null;
        scrollPosition: number;
    }) => {
        setLoading(true);
        try {
            const records = await simpleBackendService.getCommandes(type);

            // ✅ FILTRAGE SÉCURISÉ côté frontend selon le type de page
            const filteredRecords = type
                ? records.filter(cmd => {
                    if (type === 'INTER_MAGASIN') {
                        return cmd.magasinDestination != null;
                    }
                    if (type === 'CLIENT') {
                        return cmd.magasinDestination == null;
                    }
                    return true;
                })
                : records;

            setData(filteredRecords);

            // ✅ Restaurer contexte après chargement SI fourni
            if (contextToPreserve) {
                console.log('🔄 Restauration contexte:', contextToPreserve);

                // Restaurer pagination APRÈS le rendu
                setTimeout(() => {
                    setCurrentPage(contextToPreserve.page);
                    setExpandedRow(contextToPreserve.expandedRow);

                    // Restaurer scroll après pagination
                    setTimeout(() => {
                        window.scrollTo({
                            top: contextToPreserve.scrollPosition,
                            behavior: 'smooth'
                        });
                    }, 100);
                }, 50);
            }

        } catch (err) {
            console.error('❌ fetchData erreur:', err);
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const refreshWithContext = async () => {
        // 1. Sauvegarder contexte AVANT refresh
        const contextToPreserve = {
            page: currentPage,
            expandedRow: expandedRow,
            scrollPosition: window.scrollY
        };

        console.log('💾 Sauvegarde contexte avant refresh:', contextToPreserve);

        // 2. Refresh avec préservation
        await fetchData(contextToPreserve);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
            try {
                await dataService.deleteCommande(id);
                setData(prevData => prevData.filter(commande => commande.id !== id));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression');
            }
        }
    };

    // ✅ NOUVELLES FONCTIONS : Gestion sélection multiple
    const handleSelectRow = (id: string, checked: boolean) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Sélectionner toutes les commandes visibles (après filtres)
            const allVisibleIds = new Set((paginatedItems as CommandeMetier[]).map(commande => commande.id));
            setSelectedRows(allVisibleIds);
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleMultipleDelete = async () => {
        if (selectedRows.size === 0) return;

        const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${selectedRows.size} commande(s) sélectionnée(s) ? Cette action est irréversible.`;

        if (!window.confirm(confirmMessage)) return;

        setIsDeleting(true);
        try {
            const idsToDelete = Array.from(selectedRows);
            console.log('🗑️ Début suppression multiple:', idsToDelete);

            const results = await dataService.deleteMultipleCommandes(idsToDelete);

            // Mettre à jour les données locales avec seulement les suppressions réussies
            setData(prevData =>
                prevData.filter(commande => !results.success.includes(commande.id))
            );

            // Vider la sélection
            setSelectedRows(new Set());

            // Afficher les résultats
            if (results.errors.length === 0) {
                // Toutes les suppressions ont réussi
                console.log(`✅ ${results.success.length} commande(s) supprimée(s) avec succès`);
            } else {
                // Certaines suppressions ont échoué
                const errorMessage = `${results.success.length} commande(s) supprimée(s), ${results.errors.length} échec(s):\n` +
                    results.errors.map(e => `• ${e.id}: ${e.error}`).join('\n');
                alert(errorMessage);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression multiple';
            setError(errorMessage);
            console.error('❌ Erreur suppression multiple:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const [showNewCommandeModal, setShowNewCommandeModal] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [prefilledData, setPrefilledData] = useState<any>(null);

    // ✅ Modal de choix lors du renouvellement (affichée APRÈS détection changements)
    const [showRenewalChoiceModal, setShowRenewalChoiceModal] = useState(false);
    const [pendingCommandeData, setPendingCommandeData] = useState<any>(null); // Données en attente de confirmation
    const [originalClientData, setOriginalClientData] = useState<any>(null); // Client original pour comparaison

    // ✅ Charger données pré-remplies depuis localStorage (approche ContactsManagement.tsx)
    useEffect(() => {
        const storedData = localStorage.getItem('commandeFromContact');
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                console.log('✅ Deliveries - Données contact chargées depuis localStorage:', parsedData);
                setPrefilledData(parsedData);
                setShowNewCommandeModal(true);
                // Nettoyer le localStorage après récupération
                localStorage.removeItem('commandeFromContact');
            } catch (error) {
                console.error('❌ Erreur parsing données contact:', error);
                localStorage.removeItem('commandeFromContact');
            }
        }
    }, []);

    const handleCreateCommande = async (commande: Partial<CommandeMetier>) => {
        // Éviter les créations multiples
        if (loading || isCreatingCommandeRef.current) {
            console.log('Création déjà en cours, blocage');
            return;
        }

        // 🔍 DÉTECTION CHANGEMENTS CLIENT (renouvellement uniquement)
        // ⚠️ Ne PAS détecter si le flag _forceNewClient est déjà présent (venant de la modal)
        const alreadyDecided = (commande as any)._forceNewClient !== undefined;

        if (originalClientData && commande.client && !alreadyDecided) {
            const clientChanged = (
                originalClientData.nom !== commande.client.nom ||
                originalClientData.prenom !== commande.client.prenom ||
                originalClientData.telephone?.principal !== commande.client.telephone?.principal ||
                originalClientData.telephone?.secondaire !== commande.client.telephone?.secondaire ||
                originalClientData.adresse?.ligne1 !== commande.client.adresse?.ligne1 ||
                originalClientData.adresse?.batiment !== commande.client.adresse?.batiment ||
                originalClientData.adresse?.etage !== commande.client.adresse?.etage ||
                originalClientData.adresse?.interphone !== commande.client.adresse?.interphone ||
                originalClientData.adresse?.ascenseur !== commande.client.adresse?.ascenseur ||
                originalClientData.adresse?.type !== commande.client.adresse?.type
            );

            if (clientChanged) {
                console.log('⚠️ Changements détectés dans les données client → Affichage modal de choix');
                setPendingCommandeData(commande);
                setShowRenewalChoiceModal(true);
                return; // ⚠️ Ne pas créer tout de suite
            } else {
                console.log('✅ Aucun changement client détecté → Création directe');
            }
        }

        setLoading(true);
        isCreatingCommandeRef.current = true;
        console.log('=== DÉBUT CRÉATION COMMANDE/CESSION ===');
        console.log('📦 Type:', type, '| Type commande:', commande.type);

        try {
            // ✅ CESSIONS : Utiliser le service dédié
            if (type === 'INTER_MAGASIN' || commande.type === 'INTER_MAGASIN') {
                console.log('🔄 Création CESSION inter-magasins');

                // Transformer CommandeMetier → CessionFormData
                // Extraire articles depuis dimensions
                const articlesArray = commande.articles?.dimensions?.map((dim: any) => ({
                    nom: dim.nom || 'Article',
                    reference: dim.reference || dim.nom || '',
                    type: dim.type || 'Autre',
                    quantite: dim.quantite || 1,
                    hauteur: dim.hauteur,
                    largeur: dim.largeur,
                    longueur: dim.profondeur || dim.longueur,
                    poids: dim.poids,
                    autresArticles: commande.articles?.autresArticles || 0
                })) || [];

                const cessionData: any = {
                    // ✅ CORRECTION : magasin_destination_id = demandeur (étape 1)
                    magasin_destination_id: commande.magasin?.id || user?.storeId || '',
                    date_livraison_souhaitee: commande.dates?.livraison || new Date().toISOString().split('T')[0],
                    articles: articlesArray,
                    motif: commande.cession?.motif || '',
                    priorite: commande.cession?.priorite || 'Normale',
                    remarques: commande.livraison?.remarques || '',
                    creneau: commande.livraison?.creneau || '',
                    vehicule: commande.livraison?.vehicule || '',
                    equipiers: commande.livraison?.equipiers || 0,
                    tarifHT: commande.financier?.tarifHT || 0,
                    prenom_vendeur: commande.magasin?.manager || '' // ✅ Vendeur du magasin demandeur
                };

                // ✅ Magasin origine (cédant) : mode liste OU mode manuel (étape 2)
                if (commande.magasinDestination?.id) {
                    cessionData.magasin_origine_id = commande.magasinDestination.id;
                    console.log('📋 Mode LISTE - Cédant ID:', commande.magasinDestination.id);
                } else if (commande.magasinDestination?.name && commande.magasinDestination?.address) {
                    cessionData.magasin_externe = {
                        nom: commande.magasinDestination.name,
                        adresse: commande.magasinDestination.address,
                        telephone: commande.magasinDestination.phone || '',
                        email: commande.magasinDestination.email || ''
                    };
                    console.log('✍️ Mode MANUEL - Cédant:', cessionData.magasin_externe);
                }

                console.log('📦 CessionFormData préparée:', cessionData);

                // Appeler le service de cession
                await cessionService.createCession(cessionData, user?.id || '');

                console.log('✅ Cession créée avec succès');
            } else {
                // ✅ COMMANDES NORMALES : Utiliser le service standard
                console.log('📦 Création COMMANDE CLIENT standard');

                // ⚠️ COPIE PROFONDE pour éviter de modifier la commande originale lors de renouvellements
                let commandeToCreate = JSON.parse(JSON.stringify(commande));

                if (user?.role === 'magasin' && user.storeId && (!commande.magasin?.id || commande.magasin.id === '')) {
                    console.log('Ajout des informations du magasin à la commande');
                    commandeToCreate.magasin = {
                        ...(commandeToCreate.magasin || {}),
                        id: user.storeId,
                        name: user.storeName || '',
                        address: user.storeAddress || '',
                        phone: commande.magasin?.phone || '',
                        status: commande.magasin?.status || '',
                        enseigne: commande.magasin?.enseigne || user.storeName || ''
                    };
                }

                // Appel unique à dataService.createCommande
                console.log('Appel à createCommande (UNIQUE)');
                await dataService.createCommande(commandeToCreate);
            }

            // Nettoyer après création réussie
            console.log('Commande créée, nettoyage...');
            // La commande a été créée avec succès, maintenant on peut supprimer le brouillon
            await clearDraft();

            window.dispatchEvent(new CustomEvent('commandeCreated'));

            setShowNewCommandeModal(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            await fetchData(); // Recharge les données
        } catch (error) {
            if (error instanceof Error && error.message.includes('Token')) {
                console.error('Erreur d\'authentification Airtable. Vérifiez votre token.');
                // Afficher un message à l'utilisateur
            } else {
                console.error('Erreur lors de la création:', error);
            }
        } finally {
            console.log('=== FIN CRÉATION COMMANDE ===');
            setLoading(false);
            // Réinitialiser le drapeau après un délai de sécurité
            setTimeout(() => {
                isCreatingCommandeRef.current = false;
            }, 1000);
        }
    };

    // ✅ Renouveler une commande : Ouvrir formulaire + stocker client original pour détection changements
    const handleRenewCommande = (commande: CommandeMetier) => {
        // Préparer les données de renouvellement
        const renewalData: Partial<CommandeMetier> = {
            type: commande.type,
            client: commande.client ? JSON.parse(JSON.stringify(commande.client)) : undefined,
            articles: {
                nombre: commande.articles?.nombre || 0,
                details: commande.articles?.details,
                categories: commande.articles?.categories ? JSON.parse(JSON.stringify(commande.articles.categories)) : undefined,
                dimensions: commande.articles?.dimensions ? JSON.parse(JSON.stringify(commande.articles.dimensions)) : [],
                canBeTilted: commande.articles?.canBeTilted,
                autresArticles: commande.articles?.autresArticles,
            },
            livraison: {
                vehicule: commande.livraison?.vehicule || '',
                equipiers: commande.livraison?.equipiers || 0,
                remarques: commande.livraison?.remarques || '',
                details: commande.livraison?.details,
                creneau: '',
                reserve: false,
                chauffeurs: [],
            },
            magasin: commande.magasin ? JSON.parse(JSON.stringify(commande.magasin)) : undefined,
            magasinDestination: commande.magasinDestination ? JSON.parse(JSON.stringify(commande.magasinDestination)) : undefined,
            cession: commande.cession ? JSON.parse(JSON.stringify(commande.cession)) : undefined,
            dates: {
                commande: new Date().toISOString(),
                livraison: '',
                misAJour: { commande: new Date().toISOString(), livraison: '' }
            },
            financier: {
                tarifHT: commande.financier?.tarifHT || 0,
            },
            statuts: {
                commande: 'En attente',
                livraison: 'EN ATTENTE',
            },
        };

        // 🔑 Stocker les données client ORIGINALES pour comparaison ultérieure
        if (commande.client) {
            setOriginalClientData(JSON.parse(JSON.stringify(commande.client)));
            console.log('📋 Client original stocké pour détection changements:', commande.client);
        } else {
            setOriginalClientData(null);
        }

        // Ouvrir le formulaire avec les données pré-remplies
        setPrefilledData(renewalData);
        setShowNewCommandeModal(true);
    };

    const sortableFields: SortableFields[] = [
        'dates',
        'creneau',
        'statuts',
        ...(isAdminRole(user?.role) ? ['tarifHT' as SortableFields] : [])
    ];

    const getClientName = (commande: any): string => {
        if (commande.client?.nom && commande.client?.prenom) {
            return `${commande.client.prenom} ${commande.client.nom}`;
        }
        if (commande.client?.nom) return commande.client.nom;
        if (commande.client?.prenom) return commande.client.prenom;
        return commande.numeroCommande || 'Client inconnu';
    };

    const formatDateValue = (dateValue: any): string => {
        if (!dateValue) return 'N/A';
        try {
            if (typeof dateValue === 'string') {
                return dateFormatter.forDisplay(dateValue);
            }
            if (dateValue instanceof Date) {
                return dateFormatter.forDisplay(dateValue.toISOString());
            }
            return 'N/A';
        } catch {
            return 'N/A';
        }
    };

    const formatDisplayValue = (value: any): string => {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'string') return value || 'N/A';
        if (Array.isArray(value)) return value[0] || 'N/A';
        if (typeof value === 'object' && value.nom) return value.nom;
        return String(value) || 'N/A';
    };

    return (
        <div className="p-4 sm:p-6">
            {/* Indicateur de mode hors ligne - sans l'OfflineIndicator qui est déjà dans App */}
            {/* {!isOnline && (
                <div className="mb-4 bg-yellow-100 text-yellow-800 p-3 rounded">
                    Vous êtes en mode hors ligne. Les données seront synchronisées lorsque vous serez à nouveau connecté.
                </div>
            )} */}

            {import.meta.env.DEV && (
                <div className="mb-6">
                    <RoleSelector />
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-xl sm:text-2xl font-bold">
                    {type === 'INTER_MAGASIN' ? (
                        <>
                            {isAdminRole(user?.role) && 'Direction My Truck - Toutes les cessions'}
                            {user?.role === 'magasin' && `Cessions ${user.storeName || 'du magasin'}`}
                            {user?.role === 'chauffeur' && `Mes Cessions - ${user.driverName || 'Chauffeur'}`}
                        </>
                    ) : (
                        <>
                            {isAdminRole(user?.role) && 'Direction My Truck - Toutes les commandes'}
                            {user?.role === 'magasin' && `Commandes ${user.storeName || 'du magasin'}`}
                            {user?.role === 'chauffeur' && `Mes Livraisons - ${user.driverName || 'Chauffeur'}`}
                        </>
                    )}
                </h1>
                <select
                    className="border rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 w-full sm:w-auto"
                    value={rowsPerPage}
                    onChange={(e) => {
                        setCurrentPage(1);
                        setRowsPerPage(Number(e.target.value));
                    }}
                >
                    <option value={10}>10 par page</option>
                    <option value={25}>25 par page</option>
                    <option value={50}>50 par page</option>
                    <option value={100}>100 par page</option>
                </select>
            </div>

            {loading && <div className='secondary'>Chargement...</div>}
            {error && <div className="text-red-500">Erreur: {error}</div>}

            <div className="mb-8">
                {/* Barre de recherche */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher..."
                            className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                        />
                        {search && (
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                onClick={() => setSearch("")}
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        {user?.role !== 'chauffeur' && (
                            <button
                                onClick={() => setShowNewCommandeModal(true)}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 whitespace-nowrap"
                            >
                                <span className="sm:hidden">{type === 'INTER_MAGASIN' ? 'Nouvelle cession' : 'Nouvelle commande'}</span>
                                <span className="hidden sm:inline">{type === 'INTER_MAGASIN' ? 'Nouvelle cession' : 'Nouvelle commande'}</span>
                            </button>
                        )}

                        {isAdminRole(user?.role) && (
                            <button
                                onClick={checkExpiredCommandes}
                                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 whitespace-nowrap"
                                title="Vérifier et traiter les commandes expirées"
                            >
                                <span className="sm:hidden">Expirées</span>
                                <span className="hidden sm:inline">Traiter les expirées</span>
                            </button>
                        )}
                    </div>

                    <Modal
                        isOpen={showNewCommandeModal}
                        onClose={() => {
                            // Nettoyer complètement lors de la fermeture
                            setShowNewCommandeModal(false);
                            setPrefilledData(null);
                            // Utiliser un court délai pour s'assurer que le modal est bien fermé
                            // setTimeout(() => {
                            //     clearDraft().catch(err => console.error('Erreur lors du nettoyage du brouillon:', err));
                            // }, 100);
                        }}
                    >
                        <AjoutCommande
                            key={prefilledData ? JSON.stringify(prefilledData) : 'new'}
                            onSubmit={handleCreateCommande}
                            onCancel={() => {
                                setShowNewCommandeModal(false);
                                setPrefilledData(null);
                            }}
                            commande={prefilledData || ({} as CommandeMetier)}
                            isEditing={false}
                            initialData={prefilledData || ({} as CommandeMetier)}
                            isCession={type === 'INTER_MAGASIN'}
                            isRenewal={!!prefilledData}
                        />
                    </Modal>
                </div>

                {/* ✅ FILTRES TEMPORELS - Onglets de filtrage */}
                <div className="mb-6">
                    <div className="grid grid-cols-2 sm:flex sm:space-x-1 gap-1 sm:gap-0 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        {[
                            { key: 'all', label: `Toutes (${temporalCounts.all})`, shortLabel: `Toutes`, desc: 'Toutes les commandes' },
                            { key: 'today', label: `Aujourd'hui (${temporalCounts.today})`, shortLabel: `Aujourd'hui`, desc: 'Commandes du jour' },
                            { key: 'upcoming', label: `À venir (${temporalCounts.upcoming})`, shortLabel: `À venir`, desc: 'Commandes à venir' },
                            { key: 'history', label: `Historique (${temporalCounts.history})`, shortLabel: `Historique`, desc: 'Commandes terminées' },
                        ].map(({ key, label, shortLabel, desc }) => (
                            <button
                                key={key}
                                onClick={() => setTemporalFilter(key as typeof temporalFilter)}
                                className={`flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors text-center ${temporalFilter === key
                                    ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                    }`}
                                title={desc}
                            >
                                <span className="sm:hidden">{shortLabel}</span>
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sélecteur de dates */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                    <span className="text-sm text-gray-500 shrink-0">Date:</span>
                    <select
                        value={dateRange.mode}
                        onChange={(e) => setDateRange(prev => ({
                            ...prev,
                            mode: e.target.value as 'range' | 'single',
                            // Réinitialiser les valeurs lors du changement de mode
                            start: null,
                            end: null,
                            singleDate: null
                        }))}
                        className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 w-full sm:w-auto"
                    >
                        <option value="range">Période</option>
                        <option value="single">Date unique</option>
                    </select>

                    {dateRange.mode === 'single' ? (
                        <input
                            type="date"
                            value={dateRange.singleDate || ''}
                            onChange={e => setDateRange(prev => ({
                                ...prev,
                                singleDate: e.target.value,
                                start: e.target.value,
                                end: e.target.value
                            }))}
                            className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 w-full sm:w-auto"
                        />
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="date"
                                value={dateRange.start || ''}
                                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 w-full sm:w-auto"
                            />
                            <span className="text-gray-500 text-center sm:content-center dark:text-gray-100">à</span>
                            <input
                                type="date"
                                value={dateRange.end || ''}
                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 w-full sm:w-auto"
                            />
                        </div>
                    )}

                    {((dateRange.mode === 'single' && dateRange.singleDate) ||
                        (dateRange.mode === 'range' && (dateRange.start || dateRange.end))) && (
                            <button
                                onClick={() => setDateRange({
                                    start: null,
                                    end: null,
                                    mode: dateRange.mode,
                                    singleDate: null
                                })}
                                className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
                            >
                                Réinitialiser
                            </button>
                        )}
                </div>

                {/* Système de tri */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm text-gray-500 shrink-0">Trier par:</span>
                    <div className="flex flex-wrap gap-2">
                        {sortableFields.map((key) => {
                            const handleClick = () => setSortConfig({
                                key,
                                direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                            });

                            return (
                                <button
                                    key={key}
                                    onClick={handleClick}
                                    className={`px-3 py-1 rounded-lg text-sm ${sortConfig.key === key ? 'bg-red-100 text-red-800' : 'bg-gray-100 dark:bg-gray-800'
                                        }`}
                                >
                                    {key.charAt(0).toUpperCase() + key.slice(1)}
                                    {sortConfig.key === key && (
                                        <span className="ml-1">
                                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {data.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden dark:bg-gray-800">
                    {/* Afficher le nombre de résultats filtrés */}
                    <div className="mb-2 text-sm text-gray-500 dark:bg-gray-800 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                {filteredByRoleData.length !== data.length && (
                                    <div>
                                        Affichage de {filteredByRoleData.length} commandes
                                        {user?.role === 'magasin' && ` pour ${user.storeName || 'ce magasin'}`}
                                        {user?.role === 'chauffeur' && ` assignées à ${user.driverName || 'ce chauffeur'}`}
                                    </div>
                                )}
                            </div>
                            {/* 💰 Total HT pour admin et magasin (uniquement commandes LIVREE) */}
                            {(isAdminRole(user?.role) || user?.role === 'magasin') && (
                                <div className="flex items-center space-x-4">
                                    <div className="bg-green-50 dark:bg-green-900 px-4 py-2 rounded-lg border-2 border-green-300 dark:border-green-600">
                                        <span className="text-xs font-medium text-green-600 dark:text-green-300 mr-2">
                                            Total HT affiché{user?.role === 'magasin' && user.storeName ? ` (${user.storeName})` : ''} :
                                        </span>
                                        <span className="text-lg font-bold text-green-700 dark:text-green-200">
                                            {(paginatedItems as CommandeMetier[])
                                                .filter(cmd =>
                                                    cmd.statuts?.livraison === 'LIVREE' &&
                                                    cmd.financier?.tarifHT &&
                                                    typeof cmd.financier.tarifHT === 'number'
                                                )
                                                .reduce((sum, cmd) => sum + (cmd.financier?.tarifHT || 0), 0)
                                                .toFixed(2)}€
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                            ({(paginatedItems as CommandeMetier[]).filter(cmd => cmd.statuts?.livraison === 'LIVREE').length} livrées)
                                        </span>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900 px-4 py-2 rounded-lg border-2 border-blue-300 dark:border-blue-600">
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-300 mr-2">
                                            Total général{user?.role === 'magasin' && user.storeName ? ` (${user.storeName})` : ''} :
                                        </span>
                                        <span className="text-lg font-bold text-blue-700 dark:text-blue-200">
                                            {filteredByRoleData
                                                .filter(cmd =>
                                                    cmd.statuts?.livraison === 'LIVREE' &&
                                                    cmd.financier?.tarifHT &&
                                                    typeof cmd.financier.tarifHT === 'number'
                                                )
                                                .reduce((sum, cmd) => sum + (cmd.financier?.tarifHT || 0), 0)
                                                .toFixed(2)}€
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                            ({filteredByRoleData.filter(cmd => cmd.statuts?.livraison === 'LIVREE').length} livrées)
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* ✅ BARRE D'ACTIONS Suppression multiple */}
                    {selectedRows.size > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    {selectedRows.size} commande(s) sélectionnée(s)
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setSelectedRows(new Set())}
                                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                    Annuler la sélection
                                </button>
                                <button
                                    onClick={handleMultipleDelete}
                                    disabled={isDeleting}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm flex items-center space-x-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                            <span>Suppression...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>🗑️</span>
                                            <span>Supprimer ({selectedRows.size})</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Version mobile - cartes */}
                    <div className="block sm:hidden space-y-4">
                        {(paginatedItems as CommandeMetier[]).map((commande: CommandeMetier) => (
                            <div key={commande.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                            {commande.numeroCommande || 'N/A'}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {type === 'INTER_MAGASIN' ? (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-blue-600 font-medium text-xs">{commande.magasinDestination?.name || 'N/A'}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="text-green-600 font-medium text-xs">{commande.magasin?.name || 'N/A'}</span>
                                                </span>
                                            ) : (
                                                commande.client ? `${commande.client.nom?.toUpperCase() || ''} ${commande.client.prenom || ''}`.trim() : 'N/A'
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {user?.role !== 'chauffeur' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRenewCommande(commande); }}
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-lg"
                                                title="Renouveler cette commande"
                                            >
                                                🔄
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setExpandedRow(
                                                expandedRow === commande.id ? null : (commande.id || null)
                                            )}
                                            className="text-gray-500 hover:text-gray-700 p-1"
                                        >
                                            {expandedRow === commande.id ? '▼' : '▶'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">Date:</span>
                                        <div className="font-medium">
                                            {(commande.dates?.livraison) ?
                                                formatDateValue(commande.dates?.livraison) : 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Créneau:</span>
                                        <div className="font-medium">{commande.livraison?.creneau || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Statut commande:</span>
                                        <div>
                                            <span className={getStatutCommandeStyle(commande.statuts?.commande || 'En attente')}>
                                                {commande.statuts?.commande || 'En attente'}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Statut livraison:</span>
                                        <div>
                                            <span className={getStatutLivraisonStyle(commande.statuts?.livraison || 'EN ATTENTE')}>
                                                {commande.statuts?.livraison || 'EN ATTENTE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {expandedRow === commande.id && (
                                    <div className="mt-4 pt-4 border-t">
                                        <CommandeDetails
                                            commande={commande}
                                            onUpdate={(updatedCommande) => {
                                                setData(prevData => prevData.map(c => c.id === updatedCommande.id ? updatedCommande : c));
                                            }}
                                            onRefresh={refreshWithContext}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Version desktop - tableau */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="w-16 px-4 py-2"></th>
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                    >
                                        Numéro {sortConfig.key === 'numeroCommande' && (
                                            sortConfig.direction === 'asc' ? '↑' : '↓'
                                        )}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {type === 'INTER_MAGASIN' ? 'Demandeur → Cédant' : 'Client'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date livraison</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Statut commande</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Statut livraison</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Créneau</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Véhicule</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Réserve</th>
                                    {(isAdminRole(user?.role) || user?.role === 'magasin') && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tarif HT</th>
                                    )}
                                    {user?.role !== 'magasin' && type !== 'INTER_MAGASIN' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Magasin</th>
                                    )}
                                    {user?.role !== 'chauffeur' && (
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Renouveler
                                        </th>
                                    )}
                                    {isAdminRole(user?.role) && (
                                        <th className="w-16 px-4 py-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.size > 0 && selectedRows.size === (paginatedItems as CommandeMetier[]).length}
                                                ref={(checkbox) => {
                                                    if (checkbox) {
                                                        const visibleSelected = (paginatedItems as CommandeMetier[]).filter(item => selectedRows.has(item.id)).length;
                                                        checkbox.indeterminate = visibleSelected > 0 && visibleSelected < (paginatedItems as CommandeMetier[]).length;
                                                    }
                                                }}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                title="Tout sélectionner"
                                            />
                                        </th>
                                    )}

                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {(paginatedItems as CommandeMetier[]).map((commande: CommandeMetier) => (
                                    <React.Fragment key={commande.id}>
                                        <tr className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                <button
                                                    onClick={() => setExpandedRow(
                                                        expandedRow === commande.id ? null : (commande.id || null)
                                                    )}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    {expandedRow === commande.id ? '▼' : '▶'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {commande.numeroCommande || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {type === 'INTER_MAGASIN' ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-blue-600 font-medium">{commande.magasinDestination?.name || 'N/A'}</span>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="text-green-600 font-medium">{commande.magasin?.name || 'N/A'}</span>
                                                    </div>
                                                ) : (
                                                    commande.client ? `${commande.client.nom?.toUpperCase() || ''} ${commande.client.prenom || ''}`.trim() : 'N/A'
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium secondary">
                                                {(commande.dates?.livraison) ?
                                                    formatDateValue(commande.dates?.livraison) : 'N/A'}
                                                {/* dateFormatter.forDisplay(commande.dates?.livraison) : 'N/A'} */}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                <span className={getStatutCommandeStyle(commande.statuts?.commande || 'En attente')}>
                                                    {commande.statuts?.commande || 'En attente'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                <span className={getStatutLivraisonStyle(commande.statuts?.livraison || 'EN ATTENTE')}>
                                                    {commande.statuts?.livraison || 'EN ATTENTE'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{commande.livraison?.creneau || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{commande.livraison?.vehicule || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {/* ✅ Affichage intelligent de la réserve */}
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${(commande.reserve || commande.livraison?.reserve)
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {(commande.reserve || commande.livraison?.reserve) ? 'OUI' : 'NON'}
                                                </span>
                                            </td>
                                            {(isAdminRole(user?.role) || user?.role === 'magasin') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {commande.financier?.tarifHT ? `${commande.financier.tarifHT.toFixed(2)}€` : 'N/A'}
                                                </td>
                                            )}
                                            {user?.role !== 'magasin' && type !== 'INTER_MAGASIN' && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium secondary">
                                                    {commande.magasin?.name || 'N/A'}
                                                </td>
                                            )}
                                            {user?.role !== 'chauffeur' && (
                                                <td className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRenewCommande(commande); }}
                                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                                        title="Renouveler cette commande"
                                                    >
                                                        🔄
                                                    </button>
                                                </td>
                                            )}
                                            {isAdminRole(user?.role) && (
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRows.has(commande.id)}
                                                            onChange={(e) => handleSelectRow(commande.id, e.target.checked)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                        {expandedRow === commande.id && (
                                            <tr className="bg-gray-50 dark:bg-gray-700">
                                                <td colSpan={10} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    <div className="border-l-4 border-blue-500 pl-4">
                                                        <CommandeDetails
                                                            commande={commande}
                                                            onUpdate={(updatedCommande) => {
                                                                setData(prevData => prevData.map(c => c.id === updatedCommande.id ? updatedCommande : c));
                                                            }}
                                                            onRefresh={refreshWithContext}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showSuccess && (
                <div className="fixed bottom-5 left-5 bg-green-400 text-white px-6 py-3 rounded shadow-lg z-50">
                    Commande créée avec succès !
                </div>
            )}

            {/* ✅ Modal de choix : Même client ou Nouveau client (affichée APRÈS détection changements) */}
            <Modal
                isOpen={showRenewalChoiceModal}
                onClose={() => {
                    setShowRenewalChoiceModal(false);
                    setPendingCommandeData(null);
                }}
            >
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                        ⚠️ Changements détectés
                    </h2>
                    <p className="mb-6 text-gray-600 dark:text-gray-400">
                        Vous avez modifié les informations du client <span className="font-semibold">{pendingCommandeData?.client?.nom} {pendingCommandeData?.client?.prenom}</span>.
                        <br />
                        <br />
                        Que souhaitez-vous faire ?
                    </p>

                    <div className="space-y-3">
                        {/* Option 1 : Mettre à jour le client existant */}
                        <button
                            onClick={async () => {
                                setShowRenewalChoiceModal(false);
                                // Ne pas ajouter le flag _forceNewClient → Met à jour le client existant
                                await handleCreateCommande(pendingCommandeData);
                                setPendingCommandeData(null);
                                setOriginalClientData(null);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-left"
                        >
                            <div className="flex items-start">
                                <span className="text-2xl mr-3">👤</span>
                                <div>
                                    <div className="font-semibold">Mettre à jour le client existant</div>
                                    <div className="text-sm text-blue-100 mt-1">
                                        Les informations du client seront mises à jour dans la base de données.
                                        <br />
                                        <span className="text-xs">⚠️ Toutes les commandes de ce client afficheront les nouvelles informations.</span>
                                    </div>
                                </div>
                            </div>
                        </button>

                        {/* Option 2 : Créer un nouveau client */}
                        <button
                            onClick={async () => {
                                setShowRenewalChoiceModal(false);
                                // Ajouter le flag pour forcer création nouveau client
                                const commandeWithFlag = { ...pendingCommandeData, _forceNewClient: true };
                                await handleCreateCommande(commandeWithFlag);
                                setPendingCommandeData(null);
                                setOriginalClientData(null);
                            }}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-left"
                        >
                            <div className="flex items-start">
                                <span className="text-2xl mr-3">✨</span>
                                <div>
                                    <div className="font-semibold">Créer un nouveau client</div>
                                    <div className="text-sm text-green-100 mt-1">
                                        Un nouveau client sera créé avec ces informations.
                                        <br />
                                        <span className="text-xs">✅ Les anciennes commandes resteront inchangées.</span>
                                    </div>
                                </div>
                            </div>
                        </button>

                        {/* Bouton Annuler */}
                        <button
                            onClick={() => {
                                setShowRenewalChoiceModal(false);
                                setPendingCommandeData(null);
                            }}
                            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </Modal>

            <div className="px-4 py-3 border-t">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    paginatedItems={paginatedItems}
                    data={sortedItems}
                />
            </div>
        </div>
    );
};

export default Deliveries;