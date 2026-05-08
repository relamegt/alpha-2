import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../../contexts/ThemeContext';

const MetricChart = ({ title, data = [], color = "#7d63f2", subtitle = "Activity over time", dropdown }) => {
    const { isDark } = useTheme();

    return (
        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 h-full shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">{subtitle}</p>
                </div>
                {dropdown}
            </div>

            <div className="h-[280px] w-full relative">
                <div className={`h-full w-full transition-opacity duration-300 ${!data.some(d => d.count > 0) ? 'opacity-20 pointer-events-none blur-[1px]' : ''}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 10 }}>
                            {data.some(d => d.count > 0) && (
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" opacity={0.3} />
                        )}
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 600, fill: isDark ? '#9CA3AF' : '#6B7280' }}
                                dy={10}
                                interval={data.length > 12 ? Math.floor(data.length / 6) : 0}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 600, fill: isDark ? '#9CA3AF' : '#6B7280' }}
                                allowDecimals={false}
                            />
                            <Tooltip 
                                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                contentStyle={{ 
                                    backgroundColor: isDark ? '#111117' : '#ffffff', 
                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)', 
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                    color: isDark ? '#fff' : '#000'
                                }}
                                itemStyle={{ color: color }}
                            />
                            <Bar 
                                dataKey="count" 
                                fill={color} 
                                radius={[6, 6, 0, 0]} 
                                barSize={data.length > 15 ? 12 : 28}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {!data.some(d => d.count > 0) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4">
                        <div className="text-base font-bold text-gray-900 dark:text-white mb-1.5">Nothing to show here</div>
                        <p className="text-xs text-gray-500 max-w-[250px] leading-relaxed">
                            There is no data to show here yet either you haven't completed any course or you haven't started any course
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricChart;








