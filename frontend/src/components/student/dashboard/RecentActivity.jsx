import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MessageSquare, Code2, Trophy } from 'lucide-react';

const RecentActivity = ({ submissions = [] }) => {
    if (!submissions || submissions.length === 0) {
        return (
            <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 h-full">
                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight mb-6">Recent Activity</h3>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-800">
                        <MessageSquare className="text-gray-300 dark:text-gray-700" size={32} />
                    </div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">No recent activity</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 max-w-[200px]">Solve problems or participate in contests to see your activity here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Recent Activity</h3>
                <Link to="/home" className="text-[10px] font-bold text-primary-600 hover:underline uppercase tracking-widest">
                    View All
                </Link>
            </div>

            <div className="space-y-4">
                {submissions.map((sub, idx) => {
                    const isAccepted = sub.verdict === 'Accepted';
                    const date = new Date(sub.submittedAt || sub.createdAt);

                    return (
                        <div key={idx} className="flex gap-4 group">
                            <div className="relative flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                                    isAccepted 
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600' 
                                    : 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600'
                                }`}>
                                    <Code2 size={18} />
                                </div>
                                {idx !== submissions.length - 1 && (
                                    <div className="w-px h-full bg-gray-100 dark:bg-gray-800 my-2"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                                        {sub.problemTitle || 'Solved Problem'}
                                    </h4>
                                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap ml-2">
                                        {format(date, 'hh:mm a')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-tight ${isAccepted ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {sub.verdict}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-700">•</span>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                        {sub.language || 'N/A'}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-700">•</span>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                        {format(date, 'dd MMM')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RecentActivity;








