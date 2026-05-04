import React from 'react';
import { ChevronRight, ArrowUpRight } from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, link, trend, isDark }) => {
    return (
        <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-[#1e1e1e] rounded-2xl p-6 flex flex-col justify-between group transition-all duration-300 hover:border-gray-200 dark:hover:border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-normal text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    {Icon && <Icon size={16} className="text-primary-600 dark:text-primary-500" />}
                    {title}
                </h3>
                <ArrowUpRight size={16} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="flex items-end justify-between">
                <span className="text-4xl font-medium tracking-tight text-gray-900 dark:text-white">
                    {value}
                </span>
                <div className="flex flex-col items-end">
                    {trend && (
                        <span className="text-xs font-normal text-emerald-500 mb-1">
                            {trend}
                        </span>
                    )}
                    <span className="text-xs font-normal text-emerald-500 dark:text-emerald-400">
                        {subtitle}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default StatCard;








