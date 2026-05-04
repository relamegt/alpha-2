import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { History, Play, Activity, ArrowRight, BarChart2, ChevronRight, Mic, Star, Loader2, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listInterviewSessions } from '../../services/interviewSessionService';
import ProgressBar from '../shared/ProgressBar';
import { cn } from '../../utils/interviewUtils';

export default function InterviewPulseDashboard({ onStart, onViewSession }) {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await listInterviewSessions();
                if (!cancelled) setSessions(data);
            } catch (e) {
                console.error(e);
                if (!cancelled) setSessions([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const avgScore =
        sessions.length > 0
            ? Math.round(
                sessions.reduce((acc, s) => acc + (s.debrief?.scores?.overall || 0), 0) / sessions.length
            )
            : 0;

    if (loading) {
        return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 bg-[var(--color-bg-primary)]">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto" />
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Loading Dashboard...</p>
                </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between group">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-primary-50 dark:bg-primary-900/10 rounded-lg text-primary-600">
                            <Activity size={16} />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sprints</span>
                    </div>
                    <div>
                        <div className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">{sessions.length}</div>
                    </div>
                </div>

                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between group">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg text-emerald-600">
                            <BarChart2 size={16} />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Avg</span>
                    </div>
                    <div>
                        <div className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">{avgScore}%</div>
                    </div>
                </div>

                <div className="bg-[var(--color-bg-card)] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between group">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg text-amber-600">
                            <Star size={16} />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Peak</span>
                    </div>
                    <div>
                        <div className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                            {sessions.length > 0 ? `${Math.max(...sessions.map(s => s.debrief?.scores?.overall || 0))}%` : '0%'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end">
                    <button
                        className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-4 py-2 flex items-center gap-2 group shadow-sm transition-all active:scale-[0.98] border border-primary-500/20"
                        onClick={onStart}
                    >
                        <Plus size={14} className="text-white/80" />
                        <span className="text-[10px] font-semibold tracking-widest uppercase">New Simulation</span>
                        <ArrowRight size={12} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--color-bg-card)] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[var(--color-bg-surface)] dark:bg-gray-900 rounded-lg">
                            <History size={14} className="text-gray-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">Session Feed</h3>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/50 scrollbar-hide">
                    {sessions.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-[var(--color-bg-surface)] dark:bg-gray-900 rounded-[2rem] flex items-center justify-center text-gray-300 mx-auto mb-8 border border-gray-100 dark:border-gray-800">
                                <History size={40} strokeWidth={1} />
                            </div>
                            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Silence in the Feed</h4>
                            <p className="text-[10px] text-gray-400 mt-2 font-medium">Your interview history will appear here once you complete a session.</p>
                            <button onClick={onStart} className="mt-8 text-xs font-bold text-primary-600 uppercase tracking-wider hover:tracking-widest transition-all">Launch First Session</button>
                        </div>
                    ) : (
                        sessions.map((s, idx) => (
                            <div
                                key={s.id}
                                className="px-5 py-4 hover:bg-[var(--color-bg-hover)] dark:hover:bg-white/[0.01] transition-all duration-300 group cursor-pointer"
                                onClick={() => onViewSession(s)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm transition-all duration-300",
                                            (s.debrief?.scores?.overall || 0) >= 80 ? "bg-emerald-500/80" :
                                                (s.debrief?.scores?.overall || 0) >= 50 ? "bg-amber-500/80" :
                                                    "bg-gray-400/80"
                                        )}>
                                            {s.debrief?.scores?.overall || 0}%
                                        </div>
                                        <div>
                                            <h4 className="text-base font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
                                                {s.companyName || 'Standard Simulation'}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.interviewType || 'General'}</span>
                                                <div className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                                <span className="text-[10px] font-medium text-gray-400">{s.createdAt ? format(new Date(s.createdAt), 'MMM d, yyyy') : 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden md:flex flex-col items-end">
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Efficiency</div>
                                            <div className="text-xs font-bold text-gray-900 dark:text-white">{s.debrief?.scores?.overall || 0}%</div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}








