import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '../../services/queryKeys';
import sheetService from '../../services/sheetService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ProgressBar from '../shared/ProgressBar';
import {
    Plus, Trash2, Search, Layers, Code, Loader2,
    ShieldAlert, Trophy, Database, Activity, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============= ADD SHEET FORM =============
const AddSheetForm = ({ onSubmit, onCancel }) => {
    const [newSheet, setNewSheet] = useState({ name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newSheet.name.trim()) { toast.error('Please enter a sheet name'); return; }
        setSubmitting(true);
        try {
            await onSubmit(newSheet);
            setNewSheet({ name: '', description: '' });
        } catch (error) {
            toast.error('Failed to add sheet. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mb-10 p-6 bg-[var(--color-bg-card)] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                    <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Sheet</h3>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sheet Name *</label>
                        <input
                            type="text" value={newSheet.name} required autoFocus disabled={submitting}
                            onChange={(e) => setNewSheet(p => ({ ...p, name: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[var(--color-bg-input)] border border-gray-100 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-primary-500 dark:text-white text-sm outline-none transition-all"
                            placeholder="e.g., Data Structures & Algorithms"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                        <input
                            type="text" value={newSheet.description} disabled={submitting}
                            onChange={(e) => setNewSheet(p => ({ ...p, description: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-[var(--color-bg-input)] border border-gray-100 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-primary-500 dark:text-white text-sm outline-none transition-all"
                            placeholder="Brief description of the practice sheet..."
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-5 border-t border-[var(--color-border-interactive)] mt-6">
                    <button type="button" onClick={onCancel} disabled={submitting}
                        className="px-4 py-2 font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
                        Cancel
                    </button>
                    <button type="submit" disabled={submitting || !newSheet.name.trim()}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Create Sheet
                    </button>
                </div>
            </form>
        </div>
    );
};

// ============= MAIN SHEET LIST =============
const SheetList = ({ onSheetSelect }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const canManageSheets = user?.role === 'admin';
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const { data: sheets = [], isLoading, error } = useQuery({
        queryKey: queryKeys.sheets.all(),
        queryFn: sheetService.getAllSheets
    });

    const { data: userStats } = useQuery({
        queryKey: ['sheets', 'user-stats'],
        queryFn: sheetService.getUserStats
    });

    const createSheetMutation = useMutation({
        mutationFn: sheetService.createSheet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.sheets.all() });
            setShowAddSheet(false);
            toast.success('Sheet created successfully!');
        }
    });

    const deleteSheetMutation = useMutation({
        mutationFn: async (sheetId) => {
            setDeletingId(sheetId);
            return sheetService.deleteSheet(sheetId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.sheets.all() });
            setDeletingId(null);
            toast.success('Sheet deleted.');
        },
        onError: () => {
            setDeletingId(null);
            toast.error('Failed to delete sheet.');
        }
    });

    const getSheetProgress = (sheetId, sheet) => {
        const total = sheet.totalProblems || sheet.sections?.reduce((acc, s) =>
            acc + s.subsections?.reduce((ac, sub) => ac + (sub.problems?.length || 0), 0), 0) || 0;
        const completed = userStats?.sheetStats?.[sheetId] || 0;
        // Cap completed at total to prevent percentage > 100
        const finalCompleted = Math.min(completed, total);
        return { completed: finalCompleted, total };
    };

    const filteredSheets = sheets.filter(sheet =>
        sheet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center p-12 bg-[var(--color-bg-primary)]">
            <div className="text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto" />
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Loading Practice Sheets...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md w-full p-8 bg-[var(--color-bg-card)] rounded-2xl shadow-sm border border-red-200 dark:border-red-900/30">
                <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Error Loading Sheets</h2>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold text-sm">Retry</button>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
                
                {/* HEADER */}
                <header className="page-header-container animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="page-header-title">
                                Practice Sheets
                            </h1>
                            <p className="page-header-desc">
                                Curated lists of problems to help you build your programming skills
                            </p>
                        </div>

                        {canManageSheets && (
                            <button
                                onClick={() => setShowAddSheet(!showAddSheet)}
                                className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-500 hover:to-primary-700 text-white rounded-xl hover:bg-primary-700 transition-all text-[13px] flex items-center gap-2 shadow-sm active:scale-[0.98] border border-primary-500/20"
                            >
                                <Plus className="w-4 h-4" />
                                Create Sheet
                            </button>
                        )}
                    </div>
                </header>

                {/* SEARCH & FILTERS - Aligned Right */}
                <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-6 mb-10">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#181820] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        </button>
                        <div className="relative w-full sm:w-72 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search practice sheets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all bg-gray-50 dark:bg-[var(--color-bg-card)] border border-transparent dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:bg-white dark:focus:bg-[var(--color-bg-card)] focus:ring-2 focus:ring-primary-500/20 shadow-sm placeholder:text-gray-500"
                            />
                        </div>
                    </div>
                </div>

                {showAddSheet && canManageSheets && (
                    <AddSheetForm
                        onSubmit={(data) => createSheetMutation.mutate(data)}
                        onCancel={() => setShowAddSheet(false)}
                    />
                )}

                {/* GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSheets.map(sheet => {
                        const prog = getSheetProgress(sheet.id, sheet);
                        const percentage = prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;
                        const isDeleting = deletingId === sheet.id;

                        return (
                            <div
                                key={sheet.id}
                                className={`group bg-[var(--color-bg-card)] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col relative ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                                onClick={() => {
                                    const idOrSlug = sheet.slug || sheet.id;
                                    onSheetSelect ? onSheetSelect(idOrSlug) : navigate(`/sheets/${idOrSlug}`);
                                }}
                            >
                                {/* Static Ambient Glow - Mimicking CodeTyper effect */}
                                <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-60" 
                                     style={{
                                         background: `radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.20), transparent 70%)`
                                     }} 
                                />

                                <div className="p-6 flex flex-col h-full relative z-10">
                                    {/* Admin Actions */}
                                    {canManageSheets && (
                                        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Delete "${sheet.name}"?`)) deleteSheetMutation.mutate(sheet.id);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                                title="Delete Sheet"
                                            >
                                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 mb-4 pr-8">
                                        <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center shrink-0">
                                            <Database className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">
                                                {sheet.name}
                                            </h3>
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium line-clamp-2 mb-6 min-h-[40px]">
                                        {sheet.description || 'Practice problem collection'}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                       <div className="px-3 py-2 bg-[var(--color-bg-surface)] rounded-lg border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                          <Code className="w-4 h-4 text-gray-400" />
                                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{prog.total} Problems</span>
                                       </div>
                                       <div className="px-3 py-2 bg-[var(--color-bg-surface)] rounded-lg border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                          <Layers className="w-4 h-4 text-gray-400" />
                                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{sheet.sections?.length || 0} Sections</span>
                                       </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-[var(--color-border-interactive)]">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between text-xs font-semibold">
                                                <span className="text-gray-500">Progress</span>
                                                <span className={percentage === 100 ? 'text-green-600' : 'text-primary-600'}>{percentage}%</span>
                                            </div>
                                            <ProgressBar 
                                                completed={prog.completed}
                                                total={prog.total}
                                                variant="minimal"
                                                size="sm"
                                                color={percentage === 100 ? "green" : "blue"}
                                                showLabels={false}
                                                animated={true}
                                            />
                                            <div className="flex items-center justify-between mt-1">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                                                   {percentage === 100 ? <Trophy className="w-3.5 h-3.5 text-yellow-500" /> : <Activity className="w-3.5 h-3.5 text-gray-400" />}
                                                   <span>
                                                     {percentage === 100 ? 'Completed' : `${prog.completed} completed`}
                                                   </span>
                                                </div>
                                                <span className="text-xs font-semibold text-primary-600 flex items-center gap-1 group-hover:underline">
                                                    View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {!isLoading && filteredSheets.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-sm font-medium">No practice sheets found.</p>
                    </div>
                )}
            </div>
    );
};

export default SheetList;








