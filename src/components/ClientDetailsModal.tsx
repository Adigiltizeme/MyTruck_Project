import { ClientGDPR } from "../types/business.types";

interface ClientDetailsModalProps {
    client: ClientGDPR;
    canViewFullDetails: boolean;
    onClose: () => void;
}

export default function ClientDetailsModal({ client, canViewFullDetails, onClose }: ClientDetailsModalProps) {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">
                        Détails client: {client.nomComplet || `${client.prenom || ''} ${client.nom}`}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500">Téléphone</label>
                            <p className="text-sm">{client.telephone?.principal || 'Non renseigné'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Type d'adresse</label>
                            <p className="text-sm">{client.adresse?.type || 'Non spécifié'}</p>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-500">Adresse</label>
                        <p className="text-sm">
                            {canViewFullDetails ? client.adresse?.ligne1 : 'Adresse masquée (RGPD)'}
                        </p>
                    </div>

                    {/* Informations RGPD */}
                    <div className="bg-gray-50 p-3 rounded">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Informations RGPD</h5>
                        <div className="text-xs text-gray-600 space-y-1">
                            <p>Dernière activité: {new Date(client.lastActivityAt).toLocaleDateString()}</p>
                            <p>Conservation jusqu'au: {new Date(client.dataRetentionUntil).toLocaleDateString()}</p>
                            {client.pseudonymized && (
                                <p className="text-orange-600">⚠️ Données pseudonymisées</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 text-right">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}