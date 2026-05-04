import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MetricChart = ({ title, data = [], color = "#7d63f2" }) => {
    return (
        <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 h-full">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-2xl font-medium text-gray-900 dark:text-white tracking-tight">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-1">An exciting exercise is waiting for you</p>
                </div>
                <select className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-1.5 text-xs font-normal text-gray-500 outline-none">
                    <option>This Month</option>

                </select>
            </div>

            <div className="h-[180px] w-full">
                {data.some(d => d.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#000', 
                                    border: '1px solid #333', 
                                    borderRadius: '12px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    color: '#fff'
                                }}
                                cursor={{ fill: 'rgba(125, 99, 242, 0.05)' }}
                            />
                            <Bar 
                                dataKey="count" 
                                fill={color} 
                                radius={[4, 4, 0, 0]} 
                                barSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-800">
                            <div className="w-6 h-6 border-2 border-[var(--color-border-interactive)] border-t-primary-500 rounded-full animate-spin"></div>
                        </div>
                        <h4 className="text-xl font-medium text-gray-900 dark:text-white mb-2">nothing to show here</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[250px] font-normal leading-relaxed">There is no data to show here right now, either you haven't using it yet or haven't done something in this section</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricChart;








