import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Clock, User, Megaphone, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../utils/interviewUtils';

const NotificationDetailModal = ({ notification, onClose }) => {
    if (!notification) return null;

    const getIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            default: return <Megaphone className="w-5 h-5 text-primary-600" />;
        }
    };

    const getIconBg = (type) => {
        switch (type?.toLowerCase()) {
            case 'warning': return 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20';
            case 'error': return 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20';
            case 'success': return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
            default: return 'bg-primary-50 dark:bg-primary-500/10 border-primary-100 dark:border-primary-500/20';
        }
    };

    return createPortal(
        <AnimatePresence>
            {notification && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-white dark:bg-[var(--color-bg-card)] rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header Section */}
                        <div className="p-6 pb-4 flex items-start justify-between gap-4">
                            <div className="flex gap-4">
                                <div className={cn(
                                    "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border",
                                    getIconBg(notification.type)
                                )}>
                                    {getIcon(notification.type)}
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                            {notification.title}
                                        </h2>
                                        {notification.type && (
                                            <span className="shrink-0 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-[8px] font-bold text-gray-500 uppercase rounded border border-gray-100 dark:border-gray-800">
                                                {notification.type}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                        <span>{new Date(notification.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                        <span>•</span>
                                        <span className="text-primary-600">IN-APP</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="shrink-0 p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body - Scrollable if needed */}
                        <div className="px-6 py-2 overflow-y-auto max-h-[40vh] custom-thin-scrollbar">
                            <p className="text-[12px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                                {notification.content}
                            </p>
                        </div>

                        {/* Action Area */}
                        <div className="p-6 pt-4 space-y-4">
                            {notification.links?.length > 0 && notification.links.map((link, idx) => (
                                <a 
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary-600/20 transition-all active:scale-95"
                                >
                                    <ExternalLink size={14} />
                                    {link.label || 'View Details'}
                                </a>
                            ))}

                            {/* Divider Footer */}
                            <div className="pt-4 border-t border-[var(--color-border-interactive)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {notification.author && notification.author !== 'undefined' && (
                                        <>
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                                <User size={10} className="text-primary-500" />
                                                <span>{notification.author}</span>
                                            </div>
                                            <span className="text-gray-300 dark:text-gray-700">|</span>
                                        </>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                        <Clock size={10} className="text-primary-500" />
                                        <span>{new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-white/5 px-2 py-1 rounded">
                                    System
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default NotificationDetailModal;








