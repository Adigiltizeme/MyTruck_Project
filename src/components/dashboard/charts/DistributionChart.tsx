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
    const formattedData = [
        {
            name: 'Distribution',
            'En attente': data[0].enAttente,
            'En cours': data[0].enCours,
            'Terminé': data[0].termine,
            'Échec': data[0].echec
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