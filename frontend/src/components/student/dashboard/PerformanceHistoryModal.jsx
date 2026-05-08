import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Trophy, TrendingUp, Calendar, 
    AreaChart as AreaChartIcon, AlertCircle,
    ChevronDown
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer 
} from 'recharts';
import CustomDropdown from '../../shared/CustomDropdown';
import { useTheme } from '../../../contexts/ThemeContext';

const PerformanceHistoryModal = ({ isOpen, onClose, type, data, title, subtitle }) => {
    const { isDark } = useTheme();
    const [range, setRange] = useState('month');

    const chartData = useMemo(() => {
        if (!data || !data[range]) return [];
        return data[range].dailyHistory || data[range].chartData || [];
    }, [data, range]);

    const isRank = type === 'rank';
    
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-8"
            >
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal Container */}
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-4xl bg-white dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-8 pb-0 flex items-start justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                                {isRank ? <Trophy className="text-primary-500" /> : <TrendingUp className="text-primary-500" />}
                                {title}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{subtitle || 'Track your progress over time'}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <CustomDropdown
                                options={[
                                    { value: 'week', label: 'Week' },
                                    { value: 'month', label: 'Month' },
                                    { value: 'year', label: 'Year' },
                                    { value: 'all', label: 'All Time' }
                                ]}
                                value={range}
                                onChange={(val) => setRange(val)}
                                size="small"
                                width="w-32"
                                className="!bg-gray-50 dark:!bg-[#1a1a24] !border-gray-100 dark:!border-gray-800"
                            />
                            
                            <button 
                                onClick={onClose}
                                className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Chart Body */}
                    <div className="p-8">
                        {chartData.length > 0 ? (
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={chartData}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={isRank ? "#8B5CF6" : "#F59E0B"} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={isRank ? "#8B5CF6" : "#F59E0B"} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid 
                                            strokeDasharray="3 3" 
                                            vertical={false} 
                                            stroke="currentColor" 
                                            className="text-gray-200 dark:text-gray-800"
                                            opacity={0.3} 
                                        />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 11 }}
                                            minTickGap={30}
                                        />
                                        <YAxis 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 11 }}
                                            domain={['auto', 'auto']}
                                            allowDecimals={false}
                                            reversed={isRank}
                                        />
                                        <Tooltip 
                                            content={<CustomTooltip isRank={isRank} isDark={isDark} />}
                                            cursor={{ stroke: isRank ? '#8B5CF6' : '#F59E0B', strokeWidth: 1, strokeDasharray: '5 5' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey={isRank ? "rank" : "score"}
                                            stroke={isRank ? "#8B5CF6" : "#F59E0B"}
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorPerf)"
                                            animationDuration={1000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-full">
                                    <AlertCircle size={40} className="text-gray-400 dark:text-gray-600" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">No data available</h4>
                                    <p className="text-gray-500 text-sm">There is no data to show for the selected period.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const CustomTooltip = ({ active, payload, label, isRank, isDark }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-[#1a1a24] border border-gray-100 dark:border-gray-800 p-4 rounded-2xl shadow-2xl min-w-[140px]">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">{label}</p>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">{isRank ? 'Rank' : 'Score'}</span>
                    <span className={`text-sm font-bold ${isRank ? 'text-purple-500' : 'text-amber-500'}`}>
                        {payload[0].value}
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

export default PerformanceHistoryModal;
