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
import { useTheme } from '../../../contexts/ThemeContext';

const CustomTooltip = ({ active, payload, label, isDark }) => {
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
    const { isDark } = useTheme();
    const displayData = data;

    // Dynamic bar width based on number of points
    const barSize = displayData.length > 15 ? 12 : 35;
    const interval = displayData.length > 10 ? Math.ceil(displayData.length / 10) : 0;

    return (
        <div className="w-full min-h-[180px] flex-1 mt-4 relative">
            {displayData.some(d => d.score > 0) ? (
                <div className="h-full w-full">
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
                                tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10, fontWeight: 600 }}
                                dy={15}
                                interval={displayData.length > 12 ? Math.floor(displayData.length / 8) : 0}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: isDark ? '#6B7280' : '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                                domain={[0, 'auto']}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                            
                            <Bar 
                                dataKey="score" 
                                radius={[4, 4, 4, 4]} 
                                barSize={barSize}
                            >
                                {displayData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-score-${index}`} 
                                        fill="#a78bfa"
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
                                        fill="#3b82f6"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4 pb-8">
                    <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nothing to show here</div>
                    <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                        There is no data to show here yet either you haven't completed any course or you haven't started any course
                    </p>
                </div>
            )}
        </div>
    );
};

export default RankScoreChart;








