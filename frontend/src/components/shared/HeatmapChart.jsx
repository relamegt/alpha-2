import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { RiFireFill } from "react-icons/ri";

const HeatmapChart = ({ data, streakDays = 0, maxStreakDays = 0 }) => {
    // Determine the date range (last 365 days)
    const { days, weeks } = useMemo(() => {
        const today = new Date();
        const oneYearAgo = new Date(today);
        oneYearAgo.setDate(today.getDate() - 365);

        // Adjust start date to the previous Sunday to align grid properly
        const dayOfWeek = oneYearAgo.getDay(); // 0 is Sunday
        const startDate = new Date(oneYearAgo);
        startDate.setDate(startDate.getDate() - dayOfWeek);

        const allDays = [];
        let currentDate = new Date(startDate);
        const endLoopDate = new Date(); // Today

        while (currentDate <= endLoopDate) {
            allDays.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Group into weeks for column-major layout (7 rows)
        const totalWeeks = Math.ceil(allDays.length / 7);
        return { days: allDays, weeks: totalWeeks };
    }, []);

    const normalizeDate = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const normalizedData = useMemo(() => {
        const result = {};
        Object.entries(data || {}).forEach(([key, val]) => {
            result[normalizeDate(key)] = val;
        });
        return result;
    }, [data]);

    const getColorClass = (count) => {
        if (!count) return 'bg-[var(--color-activity-level-0)]';
        if (count >= 10) return 'bg-[var(--color-activity-level-4)]';
        if (count >= 5) return 'bg-[var(--color-activity-level-3)]';
        if (count >= 3) return 'bg-[var(--color-activity-level-2)]';
        if (count >= 1) return 'bg-[var(--color-activity-level-1)]';
        return 'bg-[var(--color-activity-level-0)]';
    };

    const monthLabels = useMemo(() => {
        const months = [];
        let currentMonth = -1;
        days.forEach((date, i) => {
            if (date.getMonth() !== currentMonth && i % 7 === 0) {
                months.push({
                    name: date.toLocaleString('default', { month: 'short' }),
                    index: Math.floor(i / 7)
                });
                currentMonth = date.getMonth();
            }
        });
        return months;
    }, [days]);

    return (
        <div className="w-full">
            {/* Header with Streaks */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    Submission Activity
                </h3>

                <div className="flex gap-6 self-start sm:self-auto">
                    <div className="flex items-center gap-3 transition-all hover:scale-105 cursor-default">
                        <RiFireFill size={22} className="text-[var(--color-streak-fire)] fill-[var(--color-streak-fire)]" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Current Streak</span>
                            <span className="font-bold text-sm text-gray-900 dark:text-white">{streakDays} Days</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 transition-all hover:scale-105 cursor-default">
                        <Trophy size={22} className="text-amber-500 fill-amber-500" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Max Streak</span>
                            <span className="font-bold text-sm text-gray-900 dark:text-white">{maxStreakDays} Days</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto pb-2 scrollbar-hide">
                <div className="min-w-[700px]">
                    {/* Month Labels */}
                    <div className="flex mb-2 text-[10px] text-gray-400 dark:text-gray-500 relative h-4">
                        {monthLabels.map((month, idx) => (
                            <span
                                key={idx}
                                style={{ left: `${(month.index / weeks) * 100}%` }}
                                className="absolute font-semibold uppercase tracking-wider"
                            >
                                {month.name}
                            </span>
                        ))}
                    </div>

                    <div className="grid grid-rows-7 grid-flow-col gap-[4px]">
                        {days.map((date, index) => {
                            const dateKey = normalizeDate(date);
                            const count = normalizedData[dateKey] || 0;
                            return (
                                <div
                                    key={index}
                                    title={`${date.toLocaleDateString()}: ${count} submissions`}
                                    className={`w-[11px] h-[11px] rounded-[2px] transition-all hover:ring-2 hover:ring-offset-2 hover:ring-primary-500/50 dark:hover:ring-offset-black ${getColorClass(count)}`}
                                ></div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                <span>Less</span>
                <div className="flex gap-[3px]">
                    <div className="w-3 h-3 bg-[var(--color-activity-level-0)] rounded-[2px]"></div>
                    <div className="w-3 h-3 bg-[var(--color-activity-level-1)] rounded-[2px]"></div>
                    <div className="w-3 h-3 bg-[var(--color-activity-level-2)] rounded-[2px]"></div>
                    <div className="w-3 h-3 bg-[var(--color-activity-level-3)] rounded-[2px]"></div>
                    <div className="w-3 h-3 bg-[var(--color-activity-level-4)] rounded-[2px]"></div>
                </div>
                <span>More</span>
            </div>
        </div>
    );
};

export default HeatmapChart;








