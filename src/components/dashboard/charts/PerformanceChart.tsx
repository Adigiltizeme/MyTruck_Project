import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ChartDataPoint {
    date: string;
    totalLivraisons: number;
    enCours: number;
    enAttente: number;
    index?: number;
    rawDate?: number;
}

export const PerformanceChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
    console.log('Chart data before sort:', data);

    // Tri des données avec protection contre undefined
    if (!data || !Array.isArray(data)) {
        return <div className="flex items-center justify-center h-[300px] text-gray-500">Aucune donnée disponible</div>;
    }
    
    const sortedData = [...data].sort((a, b) => {
        if (a.rawDate && b.rawDate) {
            return a.rawDate - b.rawDate;
        }
        if (a.index !== undefined && b.index !== undefined) {
            return a.index - b.index;
        }
        return 0;
    });

    console.log('Chart data after sort:', sortedData);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="date"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                />
                <YAxis
                    allowDecimals={false}
                    domain={[0, 'auto']}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        borderRadius: '6px',
                        padding: '8px',
                        border: '1px solid #E5E7EB'
                    }}
                    formatter={(value: number, name: string, props: any) => {
                        switch (name) {
                            case 'totalLivraisons': return [`${value} livraisons`, 'Livraisons réussies'];
                            case 'enCours': return [`${value} en cours`, 'En cours'];
                            case 'enAttente': return [`${value} en attente`, 'En attente'];
                            case 'chiffreAffaires': return [`${value}€`, 'Chiffre d\'affaires'];
                            default: return [value, name];
                        }
                    }}
                    labelFormatter={(label: string) => {
                        // ✅ AJOUT : Pour "Aujourd'hui", afficher l'heure du créneau
                        if (label && label.includes('h')) {
                            return `Créneau ${label}`;
                        }
                        return label;
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="totalLivraisons"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Total"
                    dot={{ strokeWidth: 2 }}
                />
                <Line
                    type="monotone"
                    dataKey="enCours"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="En cours"
                    dot={{ strokeWidth: 2 }}
                />
                <Line
                    type="monotone"
                    dataKey="enAttente"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="En attente"
                    dot={{ strokeWidth: 2 }}
                />
                <Line
                    type="monotone"
                    dataKey="chiffreAffaires"
                    stroke="#9333EA"
                    strokeWidth={2}
                    name="CA"
                    dot={{ strokeWidth: 2 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};