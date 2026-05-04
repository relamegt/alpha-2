import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
    Bell, 
    X, 
    Settings, 
    ExternalLink, 
    Clock, 
    CheckCircle2, 
    Megaphone,
    AlertTriangle,
    AlertCircle,
    Info,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { queryKeys } from '../../../services/queryKeys';
import announcementService from '../../../services/announcementService';
import { cn } from '../../../utils/interviewUtils';
import NotificationDetailModal from './NotificationDetailModal';

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
    const [selectedNotification, setSelectedNotification] = useState(null);
    const dropdownRef = useRef(null);
    const queryClient = useQueryClient();

    const { data: announcements = [], isLoading } = useQuery({
        queryKey: queryKeys.announcements.all(),
        queryFn: announcementService.getAnnouncements
    });

    const unreadCount = announcements.filter(a => !a.isRead).length;

    const filteredAnnouncements = activeTab === 'unread' 
        ? announcements.filter(a => !a.isRead)
        : announcements;

    const markAsReadMutation = useMutation({
        mutationFn: announcementService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
        }
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            default: return <Megaphone className="w-4 h-4 text-primary-500" />;
        }
    };

    const getTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(date).toLocaleDateString();
    };

    const [showPromo, setShowPromo] = useState(true);

    const handleEnableNotifications = () => {
        if (!("Notification" in window)) {
            toast.error("This browser does not support desktop notifications");
            return;
        }

        Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
                toast.success("Notifications enabled!");
                setShowPromo(false);
                // Create a test notification
                new Notification("AlphaKnowledge", {
                    body: "You will now receive important updates here.",
                    icon: "/alphalogo.png"
                });
            } else if (permission === "denied") {
                toast.error("Notification permission denied. Please enable in browser settings.");
            }
        });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Trigger */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-xl transition-all duration-300",
                    isOpen 
                        ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600" 
                        : "text-gray-400 hover:text-primary-600 hover:bg-gray-50 dark:hover:bg-[#111117]"
                )}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white border-2 border-white dark:border-[#000000] shadow-sm z-10">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-[360px] bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-base text-gray-900 dark:text-white">Notifications</h3>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                            </div>
                        </div>

                        {/* Tabs Container */}
                        <div className="flex px-4 border-b border-gray-100 dark:border-gray-800">
                            <button 
                                onClick={() => setActiveTab('all')}
                                className={cn(
                                    "px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all relative",
                                    activeTab === 'all' 
                                        ? "text-gray-900 dark:text-white" 
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                )}
                            >
                                All
                                {activeTab === 'all' && (
                                    <motion.div layoutId="notifTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                                )}
                            </button>
                            <button 
                                onClick={() => setActiveTab('unread')}
                                className={cn(
                                    "px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-all relative",
                                    activeTab === 'unread' 
                                        ? "text-gray-900 dark:text-white" 
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                )}
                            >
                                Unread ({unreadCount})
                                {activeTab === 'unread' && (
                                    <motion.div layoutId="notifTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
                                )}
                            </button>
                        </div>

                        {/* Promo Banner - Match reference */}
                        <AnimatePresence>
                            {showPromo && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-3 pt-3 overflow-hidden"
                                >
                                    <div className="bg-primary-50/30 dark:bg-primary-500/5 border border-primary-100/50 dark:border-primary-500/10 rounded-xl p-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <Bell size={14} className="text-primary-500" />
                                            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Get notified even when you're away</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={handleEnableNotifications}
                                                className="text-[10px] font-bold text-primary-600 hover:text-primary-700"
                                            >
                                                Enable
                                            </button>
                                            <X 
                                                size={12} 
                                                className="text-gray-400 hover:text-gray-600 cursor-pointer" 
                                                onClick={() => setShowPromo(false)}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Content */}
                        <div className="max-h-[380px] overflow-y-auto custom-thin-scrollbar">
                            <div className="px-4 pb-4 space-y-1">
                                <div className="py-2 text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">Today</div>
                                
                                {filteredAnnouncements.length === 0 ? (
                                    <div className="py-12 text-center space-y-2">
                                        <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-300">
                                            <Bell size={18} />
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">All caught up</p>
                                    </div>
                                ) : (
                                    filteredAnnouncements.map((ann) => (
                                        <button
                                            key={ann.id}
                                            onClick={() => {
                                                setSelectedNotification(ann);
                                                if (!ann.isRead) markAsReadMutation.mutate(ann.id);
                                            }}
                                            className={cn(
                                                "w-full text-left p-3 rounded-xl transition-all group flex gap-3 items-start",
                                                ann.isRead 
                                                    ? "hover:bg-gray-50 dark:hover:bg-white/5 opacity-60" 
                                                    : "hover:bg-primary-50/20 dark:hover:bg-primary-500/5"
                                            )}
                                        >
                                            <div className={cn(
                                                "shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                                                ann.isRead 
                                                    ? "bg-gray-50 dark:bg-gray-900 border-[var(--color-border-interactive)] text-gray-400" 
                                                    : "bg-primary-50 dark:bg-primary-500/10 border-primary-100 dark:border-primary-500/20 text-primary-600"
                                            )}>
                                                {getIcon(ann.type)}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-0.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="text-[12px] font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                                                        {ann.title}
                                                    </h4>
                                                    <span className="shrink-0 text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 rounded uppercase tracking-wider">
                                                        {ann.type || 'Low'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 leading-normal font-normal">
                                                    {ann.content}
                                                </p>
                                                <div className="flex items-center gap-1 text-[10px] font-normal text-gray-400">
                                                    {getTimeAgo(ann.createdAt)}
                                                </div>
                                            </div>
                                            {!ann.isRead && (
                                                <div className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-600 shadow-sm shadow-primary-600/50" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-[var(--color-border-interactive)] flex items-center justify-between bg-gray-50/30 dark:bg-white/[0.01]">
                            <Link 
                                to="/dashboard/announcements"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                            >
                                <Bell size={12} />
                                View All
                            </Link>
                            <Link 
                                to="/dashboard/settings"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                            >
                                <Settings size={12} />
                                Settings
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail Modal */}
            <NotificationDetailModal 
                notification={selectedNotification} 
                onClose={() => setSelectedNotification(null)} 
            />
        </div>
    );
};

export default NotificationDropdown;








