import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface DistributionChartProps {
    data: {
        enAttente: number;
        enCours: number;
        termine: number;
        echec: number;
    }[];
}

export const DistributionChart = ({ data }: DistributionChartProps) => {
    // Protection contre les données undefined
    if (!data || !Array.isArray(data) || data.length === 0) {
        return <div className="flex items-center justify-center h-[300px] text-gray-500">Aucune donnée disponible</div>;
    }

    const distribution = data[0] || { enAttente: 0, enCours: 0, termine: 0, echec: 0 };
    
    const formattedData = [
        {
            name: 'Distribution',
            'En attente': Math.round(distribution.enAttente * 100),
            'En cours': Math.round(distribution.enCours * 100),
            'Terminé': Math.round(distribution.termine * 100),
            'Échec': Math.round(distribution.echec * 100)
        }
    ];

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis
                    tickFormatter={value => `${value}%`}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        padding: '8px'
                    }}
                    cursor={false}
                />
                <Bar
                    dataKey="En attente"
                    fill="#3B82F6"
                    name="En attente"
                    animationDuration={500}
                    isAnimationActive={true}
                />
                <Bar
                    dataKey="En cours"
                    fill="#10B981"
                    name="En cours"
                    animationDuration={500}
                    isAnimationActive={true}
                />
                <Bar
                    dataKey="Terminé"
                    fill="#6366F1"
                    name="Terminé"
                    animationDuration={500}
                    isAnimationActive={true}
                />
                <Bar
                    dataKey="Échec"
                    fill="#EF4444"
                    name="Échec"
                    animationDuration={500}
                    isAnimationActive={true}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default DistributionChart;