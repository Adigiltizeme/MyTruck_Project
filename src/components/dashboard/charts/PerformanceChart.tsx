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

    // Tri des données
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
                    formatter={(value: number, name: string) => {
                        switch (name) {
                            case 'totalLivraisons': return [`${value} livraisons`, 'Total'];
                            case 'enCours': return [`${value} en cours`, 'En cours'];
                            case 'enAttente': return [`${value} en attente`, 'En attente'];
                            default: return [value, name];
                        }
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
            </LineChart>
        </ResponsiveContainer>
    );
};