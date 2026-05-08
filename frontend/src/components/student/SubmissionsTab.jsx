import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { format } from 'date-fns';
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronRight,
    Calendar,
    Hash,
    Layers,
    Copy,
    History,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';
import submissionService from '../../services/submissionService';

// ── Language display map ─────────────────────────────────────────────────────
const LANG_LABELS = {
    cpp: 'C++',
    java: 'Java',
    python: 'Python',
    javascript: 'JavaScript',
    c: 'C',
    mysql: 'MySQL',
    postgresql: 'PostgreSQL'
};

// ── Status rendering ─────────────────────────────────────────────────────────
const StatusBadge = ({ status, isDark }) => {
    const config = {
        Accepted: {
            icon: CheckCircle2,
            cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        },
        'Wrong Answer': {
            icon: XCircle,
            cls: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        },
        'Time Limit Exceeded': {
            icon: Clock,
            cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        },
        'Runtime Error': {
            icon: AlertCircle,
            cls: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
        },
        'Compilation Error': {
            icon: AlertCircle,
            cls: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
        }
    };

    const cfg = config[status] || config['Wrong Answer'];
    const Icon = cfg.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
            <Icon size={12} />
            {status}
        </span>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
//  Submission Detail Modal
// ═══════════════════════════════════════════════════════════════════════════
const SubmissionModal = ({ sub, onClose, onCopyCode }) => {
    const { isDark } = useTheme();

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => { e.key === 'Escape' && onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[5000] flex items-center justify-center p-4 transition-colors"
            style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={handleBackdrop}
        >
            <div className="bg-white dark:bg-[#0A0A0F] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* ── Header ── */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#111117] transition-colors">
                    <div className="flex items-center gap-4">
                        <StatusBadge status={sub.status} isDark={isDark} />
                        <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1.5"><Calendar size={13} /> {format(new Date(sub.createdAt), 'MMM d, yyyy')}</span>
                            <span className="flex items-center gap-1.5"><Hash size={13} /> {LANG_LABELS[sub.language] || sub.language}</span>
                            <span className="flex items-center gap-1.5"><Clock size={13} /> {sub.executionTime || 0}ms</span>
                            <span className="flex items-center gap-1.5"><Layers size={13} /> {(sub.memoryUsed / 1024).toFixed(1)}KB</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 dark:text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Error Message (if any) */}
                    {(sub.error || sub.compilationOutput) && (
                        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl p-4">
                            <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-2">Error Detail</p>
                            <pre className="text-xs font-mono text-rose-700 dark:text-rose-300 whitespace-pre-wrap break-words leading-relaxed">
                                {sub.error || sub.compilationOutput}
                            </pre>
                        </div>
                    )}

                    {/* Test Case Results */}
                    {sub.testCaseResults && sub.testCaseResults.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sub.testCaseResults.map((tc, idx) => (
                                <div key={idx} className={`p-3 rounded-xl border transition-colors ${
                                    tc.passed 
                                        ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/20' 
                                        : 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/20'
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Case {idx + 1}</span>
                                        {tc.passed ? (
                                            <CheckCircle2 size={12} className="text-emerald-500" />
                                        ) : (
                                            <XCircle size={12} className="text-rose-500" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                        <span>Time: {tc.executionTime || 0}ms</span>
                                        <span>Mem: {((tc.memoryUsed || 0) / 1024).toFixed(1)}KB</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Code Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Submitted Code</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="bg-gray-50 dark:bg-[#111117] px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-gray-500">{LANG_LABELS[sub.language] || sub.language}</span>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(sub.code);
                                        toast.success('Copied to clipboard');
                                    }}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md text-gray-400 dark:text-gray-500 transition-colors"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>
                            <pre className="p-4 bg-gray-50/30 dark:bg-[#0A0A0F] text-xs font-mono text-gray-800 dark:text-gray-300 overflow-x-auto leading-relaxed scrollbar-thin">
                                {sub.code}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#111117] flex justify-end gap-3 shrink-0 transition-colors">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                        Close
                    </button>
                    {onCopyCode && (
                        <button
                            onClick={() => {
                                onCopyCode(sub.code);
                                onClose();
                                toast.success("Code copied to editor!");
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
                        >
                            <Copy size={14} />
                            Copy to Editor
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
//  Main SubmissionsTab
// ═══════════════════════════════════════════════════════════════════════════
const SubmissionsTab = ({ problemId, onCopyCode }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSub, setSelectedSub] = useState(null);

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (!problemId) return;
            setLoading(true);
            try {
                const res = await submissionService.getSubmissionsByProblem(problemId);
                if (res.success) {
                    setSubmissions(res.submissions || []);
                }
            } catch (err) {
                console.error('Failed to fetch submissions:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [problemId]);

    const closeModal = () => setSelectedSub(null);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-gray-400 transition-colors">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4" />
                <p className="text-sm font-medium">Loading history...</p>
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-gray-400 transition-colors">
                <div className="bg-gray-50 dark:bg-[#111117] p-5 rounded-full mb-6">
                    <History size={40} className="opacity-20" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No Submissions Yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[240px] leading-relaxed">
                    Once you submit your code, your history will appear here.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col gap-3 p-4 bg-[var(--color-bg-primary)] min-h-full transition-colors">
                {submissions.map((sub) => {
                    const submittedDate = sub.createdAt ? new Date(sub.createdAt) : null;
                    return (
                        <button
                            key={sub._id}
                            onClick={() => setSelectedSub(sub)}
                            className="group flex items-center justify-between p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl hover:border-primary-500/50 dark:hover:border-primary-500/30 hover:bg-[var(--color-bg-hover)] hover:shadow-md transition-all text-left overflow-hidden"
                        >
                            {/* Left: Status + Language */}
                            <div className="flex items-center gap-4 min-w-0">
                                <StatusBadge status={sub.status} isDark={true} />
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">
                                        {LANG_LABELS[sub.language] || sub.language}
                                    </span>
                                    {submittedDate && (
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 sm:hidden">
                                            {format(submittedDate, 'MMM d, h:mm a')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right: date + chevron */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                                {submittedDate && (
                                    <span className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">
                                        {format(submittedDate, 'MMM d, h:mm a')}
                                    </span>
                                )}
                                <ChevronRight
                                    size={15}
                                    className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors"
                                />
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ── Modal ── */}
            {selectedSub && (
                <SubmissionModal
                    sub={selectedSub}
                    onClose={closeModal}
                    onCopyCode={onCopyCode}
                />
            )}
        </>
    );
};

export default SubmissionsTab;
