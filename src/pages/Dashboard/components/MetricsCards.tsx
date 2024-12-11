import { DeliveryMetrics } from '../../../types/dashboard';

interface MetricsCardsProps {
    metrics: DeliveryMetrics;
}

const MetricsCards = ({ metrics }: MetricsCardsProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-600 text-sm font-medium">Total Livraisons</div>
                <div className="text-3xl font-bold mt-2">{metrics.total}</div>
                <div className="text-green-600 text-sm mt-2">+5% par rapport à hier</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-600 text-sm font-medium">En cours</div>
                <div className="text-3xl font-bold mt-2">{metrics.enCours}</div>
                <div className="text-blue-600 text-sm mt-2">{metrics.total - metrics.enCours} en attente</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-600 text-sm font-medium">Performance</div>
                <div className="text-3xl font-bold mt-2">{metrics.performance}%</div>
                <div className="text-gray-600 text-sm mt-2">Note: {metrics.satisfactionClient}/5</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-gray-600 text-sm font-medium">Chiffre d'affaires</div>
                <div className="text-3xl font-bold mt-2">{metrics.chiffreAffaires}€</div>
                <div className="text-gray-600 text-sm mt-2">
                    Moy: {Math.round(metrics.chiffreAffaires / metrics.total)}€/livraison
                </div>
            </div>
        </div>
    );
};

export default MetricsCards;