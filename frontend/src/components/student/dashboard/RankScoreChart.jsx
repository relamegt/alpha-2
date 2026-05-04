import React from 'react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 p-3 rounded-xl shadow-xl">
                <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
                <div className="space-y-1">
                    <p className="text-sm font-black text-primary-600">
                        Score: {payload[0].value}
                    </p>
                    {payload[1] && (
                        <p className="text-sm font-black text-blue-500">
                            Rank: {payload[1].value}
                        </p>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const RankScoreChart = ({ data = [] }) => {
    // If no data, show placeholders for the last 8 days
    const displayData = data && data.length > 0 ? data : Array.from({ length: 8 }).map((_, i) => {
        const dates = ['26 Apr', '27 Apr', '28 Apr', '29 Apr', '30 Apr', '01 May', '02 May', '03 May'];
        return {
            name: dates[i],
            score: i === 7 ? 4637 : 4500, // Example placeholder data matching image
            rank: i === 7 ? 901 : 0
        };
    });

    return (
        <div className="w-full h-[320px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData} margin={{ top: 10, right: 0, left: -20, bottom: 25 }}>
                    <CartesianGrid 
                        strokeDasharray="0" 
                        vertical={false} 
                        stroke="#282833" 
                        opacity={0.1}
                    />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }}
                        dy={15}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }}
                        domain={[0, 6000]}
                        ticks={[0, 1500, 3000, 4500, 6000]}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    
                    {/* Score Bar */}
                    <Bar 
                        dataKey="score" 
                        radius={[8, 8, 8, 8]} 
                        barSize={45}
                    >
                        {displayData.map((entry, index) => (
                            <Cell 
                                key={`cell-score-${index}`} 
                                fill={index === 7 ? '#a78bfa' : '#a78bfa80'} // Purple matching image
                            />
                        ))}
                    </Bar>

                    {/* Rank Bar (Grouped/Stacked appearance) */}
                    <Bar 
                        dataKey="rank" 
                        radius={[4, 4, 4, 4]} 
                        barSize={35}
                        style={{ transform: 'translateX(-40px)' }} // Shifted as in image
                    >
                        {displayData.map((entry, index) => (
                            <Cell 
                                key={`cell-rank-${index}`} 
                                fill="#3b82f6" 
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RankScoreChart;








