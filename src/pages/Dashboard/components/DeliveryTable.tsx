import { Delivery } from '../../../types/dashboard';

interface DeliveryTableProps {
  deliveries: Delivery[];
}

const DeliveryTable: React.FC<DeliveryTableProps> = ({ deliveries }) => {
    return (
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Livraisons récentes</h2>
            <button className="text-blue-600 text-sm hover:text-blue-800">
              Voir tout
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Référence</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Magasin</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Chauffeur</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">Statut</th>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3">ETA</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery: Delivery) => (
                  <tr key={delivery.id} className="border-b last:border-0">
                    <td className="py-4 text-sm">{delivery.id}</td>
                    <td className="py-4 text-sm">{delivery.store}</td>
                    <td className="py-4 text-sm">{delivery.driver}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        delivery.status === 'En cours'
                          ? 'bg-amber-100 text-amber-800'
                          : delivery.status === 'Terminée'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {delivery.status}
                      </span>
                    </td>
                    <td className="py-4 text-sm">{delivery.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

export default DeliveryTable;