import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../services/queryKeys';
import announcementService from '../../../services/announcementService';
import { 
  Bell, Info, AlertTriangle, AlertCircle, Calendar, User, Clock, 
  ExternalLink, CheckCircle2, Megaphone, Radio, Sparkles, ArrowRight 
} from 'lucide-react';
import toast from 'react-hot-toast';

const Announcements = () => {
    const queryClient = useQueryClient();

    const { data: announcements, isLoading, error } = useQuery({
        queryKey: queryKeys.announcements.all(),
        queryFn: announcementService.getAnnouncements
    });

    const markAsReadMutation = useMutation({
        mutationFn: announcementService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            toast.success('Alerts cleared');
        }
    });

    if (isLoading) return <div className="flex-1 flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div></div>;

    const getColors = (type) => {
        switch (type) {
            case 'warning': return { icon: <AlertTriangle />, bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-600', border: 'border-amber-100 dark:border-gray-800' };
            case 'error': return { icon: <AlertCircle />, bg: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-600', border: 'border-red-100 dark:border-gray-800' };
            case 'success': return { icon: <CheckCircle2 />, bg: 'bg-emerald-50 dark:bg-emerald-900/10', text: 'text-emerald-600', border: 'border-emerald-100 dark:border-gray-800' };
            default: return { icon: <Megaphone />, bg: 'bg-primary-50 dark:bg-primary-900/10', text: 'text-primary-600', border: 'border-primary-100 dark:border-gray-800' };
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
                {/* Properly Sized Header */}
                <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="page-header-container space-y-1">
                        <h1 className="page-header-title">
                            Announcements
                        </h1>
                        <p className="page-header-desc">
                            Stay updated with important system notifications and campus alerts.
                        </p>
                    </div>
                    <button 
                        onClick={() => markAsReadMutation.mutate()} 
                        className="btn-secondary h-10 flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Acknowledge All
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-4 pb-6 scrollbar-hide">
                    {announcements?.length > 0 ? (
                        announcements.map((ann, idx) => {
                            const theme = getColors(ann.type);
                            return (
                                <div key={ann.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className={`p-6 bg-[var(--color-bg-card)] rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary-500/50 transition-all shadow-sm`}>
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`text-base tracking-tight ${ann.isRead ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>{ann.title}</h3>
                                                        {!ann.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse" />}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[10px] text-gray-400 uppercase tracking-widest">
                                                        <span>{new Date(ann.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</span>
                                                        <span>•</span>
                                                        <span className="text-primary-600">{ann.author}</span>
                                                    </div>
                                                </div>
                                                <div className={`${theme.text} ${theme.bg} px-2 py-1 rounded text-[9px] uppercase tracking-wider border ${theme.border}`}>
                                                    {ann.type || 'info'}
                                                </div>
                                            </div>
                                            
                                            <div className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed whitespace-pre-wrap">
                                                {ann.content}
                                            </div>

                                            {ann.links?.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {ann.links.map((link, lIdx) => (
                                                        <a key={lIdx} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider transition-colors">
                                                            {link.label || 'Reference'}
                                                            <ExternalLink size={10} />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-20 text-center bg-[var(--color-bg-card)] rounded-xl border border-dashed border-[var(--color-border-interactive)] space-y-4">
                            <Radio className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto" />
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">No active signals</h3>
                        </div>
                    )}
                </div>
        </div>
    );
};

export default Announcements;
