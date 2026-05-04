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

    // Dynamic bar width based on number of points
    const barSize = displayData.length > 15 ? 12 : 35;
    const interval = displayData.length > 10 ? Math.ceil(displayData.length / 10) : 0;

    return (
        <div className="w-full h-[320px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData} margin={{ top: 10, right: 0, left: -25, bottom: 25 }}>
                    <CartesianGrid 
                        strokeDasharray="3 3" 
                        vertical={false} 
                        stroke="currentColor" 
                        className="text-gray-200 dark:text-gray-800"
                        opacity={0.5}
                    />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 500 }}
                        dy={15}
                        interval={interval}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                        domain={[0, 'auto']}
                        allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                    
                    <Bar 
                        dataKey="score" 
                        radius={[4, 4, 4, 4]} 
                        barSize={barSize}
                    >
                        {displayData.map((entry, index) => (
                            <Cell 
                                key={`cell-score-${index}`} 
                                fill={index === displayData.length - 1 ? '#a78bfa' : '#a78bfa40'}
                            />
                        ))}
                    </Bar>

                    <Bar 
                        dataKey="rank" 
                        radius={[2, 2, 2, 2]} 
                        barSize={Math.max(barSize - 4, 4)}
                    >
                        {displayData.map((entry, index) => (
                            <Cell 
                                key={`cell-rank-${index}`} 
                                fill={index === displayData.length - 1 ? '#3b82f6' : '#3b82f640'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RankScoreChart;








