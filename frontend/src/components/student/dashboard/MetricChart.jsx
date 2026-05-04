import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MetricChart = ({ title, data = [], color = "#7d63f2", range = 'month' }) => {
    return (
        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 h-full shadow-sm">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-2xl font-medium text-gray-900 dark:text-white tracking-tight">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-1">Activity over time</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-lg text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                        {range === 'week' ? 'Weekly' : range === 'year' ? 'Yearly' : 'Monthly'}
                    </div>
                </div>
            </div>

            <div className="h-[200px] w-full">
                {data.some(d => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200 dark:text-gray-800" opacity={0.5} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 500, fill: '#9CA3AF' }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 500, fill: '#9CA3AF' }}
                                allowDecimals={false}
                            />
                            <Tooltip 
                                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                contentStyle={{ 
                                    backgroundColor: 'var(--color-bg-card)', 
                                    border: '1px solid var(--color-border-subtle)', 
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    color: 'inherit'
                                }}
                                itemStyle={{ color: color }}
                            />
                            <Bar 
                                dataKey="count" 
                                fill={color} 
                                radius={[4, 4, 0, 0]} 
                                barSize={data.length > 15 ? 15 : 30}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-4">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center mb-3 border border-gray-100 dark:border-gray-800">
                             <div className="w-5 h-5 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
                        </div>
                        <h4 className="text-base font-medium text-gray-900 dark:text-white mb-1">Nothing to show</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] font-normal leading-tight">Complete activities to see your progress metrics here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricChart;








