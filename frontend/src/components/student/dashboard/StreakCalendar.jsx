import React from 'react';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    addMonths, 
    subMonths,
    isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const StreakCalendar = ({ activeDates = [] }) => {
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-6">
                <h4 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                    {format(currentMonth, 'MMMM yyyy')}
                </h4>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-400 transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button 
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-400 transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        return (
            <div className="grid grid-cols-7 mb-2">
                {days.map((day, i) => (
                    <div key={i} className="text-center text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const calendarDays = eachDayOfInterval({
            start: startDate,
            end: endDate,
        });

        return (
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                    const isActive = activeDates.some(ad => isSameDay(new Date(ad), day));
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayDate = isToday(day);

                    return (
                        <div 
                            key={i} 
                            className={`
                                aspect-square flex items-center justify-center text-[12px] font-semibold rounded-xl transition-all relative
                                ${!isCurrentMonth ? 'text-gray-300 dark:text-[#2a2a35]' : 'text-gray-700 dark:text-gray-300'}
                                ${isActive ? '!bg-primary-500/20 !border !border-primary-500/50 !text-white' : ''}
                                ${isTodayDate && !isActive ? 'border border-primary-500/50 !text-white bg-primary-500/5' : ''}
                                hover:bg-gray-50 dark:hover:bg-white/5 cursor-default
                            `}
                        >
                            {format(day, 'd')}
                            {isTodayDate && (
                                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 flex-1 shadow-sm flex flex-col">
                <div className="mb-8">
                    <h3 className="text-2xl font-medium text-gray-900 dark:text-white tracking-tight">Streak</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mt-1">Consistency is the key to mastery</p>
                </div>
                {renderHeader()}
                {renderDays()}
                {renderCells()}
            </div>
        </div>
    );
};


export default StreakCalendar;








