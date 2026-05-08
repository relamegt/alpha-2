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
    isToday,
    addDays
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RiFireFill } from "react-icons/ri";

const StreakCalendar = ({ activeDates = [], minHeight = "320px" }) => {
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-4">
                <button 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-all active:scale-90 border border-gray-300 dark:border-gray-800"
                >
                    <ChevronLeft size={14} />
                </button>
                <h4 className="text-[14px] font-black text-gray-900 dark:text-white tracking-tight">
                    {format(currentMonth, 'MMMM yyyy')}
                </h4>
                <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-all active:scale-90 border border-gray-300 dark:border-gray-800"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        return (
            <div className="grid grid-cols-7 mb-4">
                {days.map((day, i) => (
                    <div key={i} className="flex justify-center">
                        <div className="w-7 h-5 flex items-center justify-center text-[10px] font-black uppercase tracking-tighter text-gray-500">
                            {day}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const startDate = startOfWeek(monthStart);

        const calendarDays = [];
        let day = startDate;
        for (let i = 0; i < 42; i++) {
            calendarDays.push(day);
            day = addDays(day, 1);
        }

        return (
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                    const isActive = activeDates.some(ad => isSameDay(new Date(ad), day));
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayDate = isToday(day);
                    const isSelected = isSameDay(day, new Date());

                    return (
                        <div 
                            key={i} 
                            className={`
                                aspect-square flex items-center justify-center text-[13px] rounded-lg transition-all relative
                                ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-700 opacity-40' : 'text-gray-900 dark:text-white font-bold'}
                                ${isSelected ? 'border-2 border-primary-500' : ''}
                                ${!isActive && !isSelected && isCurrentMonth ? 'hover:bg-gray-100 dark:hover:bg-white/5' : ''}
                            `}
                        >
                            {isActive ? (
                                <RiFireFill className="text-primary-500 animate-in zoom-in duration-300" size={18} />
                            ) : (
                                <span>{format(day, 'd')}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col" style={{ minHeight }}>
            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 flex-1 shadow-sm flex flex-col transition-all hover:shadow-xl hover:shadow-primary-500/5">
                <div className="mb-2">
                    <h3 className="text-3xl text-gray-900 dark:text-white tracking-tight font-bold">Streak</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                        An exciting exercise is waiting for you
                    </p>
                </div>
                
                <div className="bg-gray-50/50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl px-2 py-2 flex-1 flex flex-col justify-center">
                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}
                </div>
            </div>
        </div>
    );
};

export default StreakCalendar;








