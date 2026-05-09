import React, { useState,useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, X, Zap, Lock, Brain, Bug,
    CheckCircle, Copy, RotateCcw, ChevronRight,
    Loader2, AlertCircle, Code2, Lightbulb,
    Trophy, Clock, Database, FileText, Target,
    CircleDot, ShieldCheck, ShieldAlert, ShieldX
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';

const API_BASE = '/ai';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fadeSlide = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
    exit: { opacity: 0, y: -16, transition: { duration: 0.2 } }
};

/**
 * Returns label variants based on problem type.
 * isCodingType: true  → competitive / algo coding
 * isCodingType: 'sql' → SQL
 * isCodingType: 'web' → Web Dev
 * isCodingType: false → generic
 */
const getTypeLabels = (isCodingType) => {
    if (isCodingType === 'sql') {
        return {
            analyzeBtn: 'Analyze My Query',
            thinkingLabel: 'Analyzing your query...',
            thinkingSubLabel: 'AI is reviewing your SQL logic',
            solutionLabel: 'Optimized Query',
        };
    }
    if (isCodingType === 'web') {
        return {
            analyzeBtn: 'Analyze My Code',
            thinkingLabel: 'Analyzing your code...',
            thinkingSubLabel: 'AI is reviewing your implementation',
            solutionLabel: 'Optimized Solution',
        };
    }
    // default: algo/competitive coding (isCodingType === true)
    return {
        analyzeBtn: 'Analyze My Code',
        thinkingLabel: 'Analyzing your code...',
        thinkingSubLabel: 'AI is thinking through your logic',
        solutionLabel: 'Optimized Solution',
    };
};
// ─── Sub-components ──────────────────────────────────────────────────────────

const SeverityBadge = ({ severity }) => {
    const map = {
        error: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        'edge-case': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    };
    return (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${map[severity] ?? map.warning}`}>
            {severity}
        </span>
    );
};

const ComplexityBadge = ({ icon: Icon, label, value, color }) => (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold ${color}`}>
        <Icon size={12} />
        <span className="text-zinc-400">{label}:</span>
        <span>{value}</span>
    </div>
);

// const VerdictBadge = ({ verdict }) => {
//     const map = {
//         correct: {
//             icon: ShieldCheck,
//             cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
//             label: 'Correct'
//         },
//         partially_correct: {
//             icon: ShieldAlert,
//             cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
//             label: 'Partially Correct'
//         },
//         incorrect: {
//             icon: ShieldX,
//             cls: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
//             label: 'Incorrect'
//         },
//     };
//     const config = map[verdict] ?? map.incorrect;
//     const Icon = config.icon;
//     return (
//         <span className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider ${config.cls}`}>
//             <Icon size={11} />
//             {config.label}
//         </span>
//     );
// };

const StageIndicator = ({ current, total }) => (
    <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
            <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i < current ? 'bg-violet-500 w-5' :
                    i === current ? 'bg-violet-400 w-3' :
                        'bg-zinc-700 w-2'
                    }`}
            />
        ))}
    </div>
);

const OptimizationList = ({ items }) => (
    <div className="space-y-2">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Zap size={11} className="text-amber-400" /> Optimizations
        </p>
        {items.map((opt, i) => (
            <div key={i} className="flex gap-3 p-3.5 bg-zinc-800/40 border border-zinc-700/40 rounded-xl">
                <Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 leading-relaxed">{opt}</p>
            </div>
        ))}
    </div>
);

// ─── Stage 1 — Code Analysis Summary ────────────────────────────────────────

const VerdictBadge = ({ verdict }) => {
    const map = {
        correct: {
            icon: ShieldCheck,
            cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
            label: 'Correct'
        },
        partially_correct: {
            icon: ShieldAlert,
            cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
            label: 'Partially Correct'
        },
        incorrect: {
            icon: ShieldX,
            cls: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
            label: 'Incorrect'
        },
    };
    const config = map[verdict] ?? map.incorrect;
    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider ${config.cls}`}>
            <Icon size={11} />
            {config.label}
        </span>
    );
};

const Stage1 = ({ aiResult, onNext }) => {
    const { codeSummary } = aiResult;

    return (
        <motion.div key="s1" {...fadeSlide} className="space-y-4">

            {/* Header */}
            <div className="flex items-start gap-3 p-4 bg-violet-500/8 border border-violet-500/20 rounded-xl">
                <FileText className="text-violet-400 shrink-0 mt-0.5" size={18} />
                <div>
                    <p className="text-sm font-bold text-zinc-100">Code Analysis</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Here's a breakdown of your code vs. the problem.
                    </p>
                </div>
                <VerdictBadge verdict={codeSummary.verdict} />
            </div>

            {/* Section 1 — What the problem asks */}
            <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                    <Target size={12} className="text-blue-400" />
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                        What the problem asks
                    </p>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">
                    {codeSummary.problemExpects}
                </p>
            </div>

            {/* Section 2 — What you wrote + how it differs */}
            <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <CircleDot size={12} className="text-violet-400" />
                    <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">
                        What your code does
                    </p>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">
                    {codeSummary.whatUserWrote}
                </p>

                {/* Differs row */}
                <div className="flex gap-2.5 items-start pt-1 border-t border-zinc-700/50">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300 leading-relaxed">
                        {codeSummary.howItDiffers}
                    </p>
                </div>
            </div>

            {/* Section 3 — What's missed */}
            <div className="bg-rose-500/6 border border-rose-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <AlertCircle size={12} className="text-rose-400" />
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                        What's missing / incorrect
                    </p>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                    {codeSummary.whatIsMissed}
                </p>
            </div>

            <button
                onClick={onNext}
                className="w-full btn-primary py-3.5"
            >
                See detailed bug diagnosis <ChevronRight size={16} />
            </button>
        </motion.div>
    );
};

// ─── Stage 2 — Bug Diagnosis ─────────────────────────────────────────────────

const Stage2 = ({ aiResult, onNext, onNobugs }) => (
    <motion.div key="s2" {...fadeSlide} className="space-y-5">
        <div className="flex items-center gap-2">
            <Bug className="text-rose-400" size={18} />
            <h3 className="font-bold text-zinc-100 text-sm">Code Diagnosis</h3>
            <span className="ml-auto text-[10px] font-bold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                {aiResult.bugs.length} issue{aiResult.bugs.length !== 1 ? 's' : ''} found
            </span>
        </div>

        {aiResult.bugs.length === 0 ? (
            <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 p-6 bg-emerald-500/8 border border-emerald-500/25 rounded-xl text-center">
                    <CheckCircle size={36} className="text-emerald-500" />
                    <div>
                        <p className="font-bold text-emerald-400">No bugs found</p>
                        <p className="text-xs text-zinc-500 mt-1">Your logic is solid. Let's look at optimizations.</p>
                    </div>
                </div>
                <OptimizationList items={aiResult.optimizations} />
                <button
                    onClick={onNobugs}
                    className="w-full btn-primary py-3.5"
                >
                    View optimized solution →
                </button>
            </div>
        ) : (
            <div className="space-y-3">
                {aiResult.bugs.map((bug, i) => (
                    <div key={i} className="bg-zinc-800/70 border border-zinc-700/60 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <SeverityBadge severity={bug.severity} />
                            {bug.line && (
                                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                                    Line {bug.line}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-zinc-200">{bug.diagnosis}</p>
                        <div className="relative overflow-hidden rounded-lg">
                            <div className="blur-sm select-none pointer-events-none text-xs p-3 bg-emerald-950/40 border border-emerald-500/15 text-emerald-400 opacity-50">
                                Fix hidden — revealed in guided mode
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 bg-zinc-900/90 border border-zinc-700 px-3 py-1 rounded-full">
                                    <Lock size={9} /> Fix revealed next
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                <button
                    onClick={onNext}
                    className="w-full btn-primary py-3.5"
                >
                    Walk me through the fixes <ChevronRight size={16} />
                </button>
            </div>
        )}
    </motion.div>
);

// ─── Stage 3 — Guided Fixes ──────────────────────────────────────────────────

const Stage3 = ({ aiResult, fixIndex, setFixIndex, onShowSolution }) => (
    <motion.div key="s3" {...fadeSlide} className="space-y-5">
        <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-400" size={18} />
            <h3 className="font-bold text-zinc-100 text-sm">Guided Fixes</h3>
            <span className="ml-auto text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                {fixIndex + 1} / {aiResult.bugs.length}
            </span>
        </div>

        <div className="space-y-3">
            {aiResult.bugs.slice(0, fixIndex + 1).map((bug, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gray-50 dark:bg-zinc-800/70 border-l-2 border-l-emerald-500 border border-gray-200 dark:border-zinc-700/50 rounded-xl p-4 space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <SeverityBadge severity={bug.severity} />
                        {bug.line && <span className="text-[10px] font-bold text-zinc-500">Line {bug.line}</span>}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Problem</p>
                        <p className="text-sm text-gray-700 dark:text-zinc-300">{bug.diagnosis}</p>
                    </div>
                    <div className="p-3.5 bg-emerald-500/8 border border-emerald-500/25 rounded-xl">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">✅ Fix</p>
                        <p className="text-sm text-emerald-300 leading-relaxed font-medium">{bug.fix}</p>
                    </div>
                </motion.div>
            ))}
        </div>

        {fixIndex < aiResult.bugs.length - 1 ? (
            <button
                onClick={() => setFixIndex(p => p + 1)}
                className="w-full btn-secondary py-2 text-xs"
            >
                Next issue <ChevronRight size={14} />
            </button>
        ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-2">
                <OptimizationList items={aiResult.optimizations} />
                <div className="p-4 bg-violet-500/8 border border-violet-500/20 rounded-xl text-center">
                    <p className="text-xs text-violet-300 font-medium">
                        💪 Try fixing your code yourself before viewing the solution
                    </p>
                </div>
                <button
                    onClick={onShowSolution}
                    className="w-full btn-primary py-2 text-xs"
                >
                    View full optimized solution →
                </button>
            </motion.div>
        )}
    </motion.div>
);

// ─── Stage 4 — Full Solution ─────────────────────────────────────────────────

const Stage4 = ({ aiResult, onReset, isCodingType }) => {
    const [copied, setCopied] = useState(false);
    const labels = getTypeLabels(isCodingType);

    const handleCopy = () => {
        navigator.clipboard.writeText(aiResult.fullSolution.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div key="s4" {...fadeSlide} className="space-y-5">
            <div className="flex items-center gap-2">
                <Trophy className="text-amber-400" size={18} />
                <h3 className="font-bold text-zinc-100 text-sm">{labels.solutionLabel}</h3>
            </div>

            {/* ✅ Strictly only for algo/coding problems */}
            {isCodingType === true && (
                <div className="flex flex-wrap gap-2">
                    <ComplexityBadge
                        icon={Clock}
                        label="Time"
                        value={aiResult.fullSolution.timeComplexity}
                        color="bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-300"
                    />
                    <ComplexityBadge
                        icon={Database}
                        label="Space"
                        value={aiResult.fullSolution.spaceComplexity}
                        color="bg-purple-500/10 border-purple-500/25 text-purple-600 dark:text-purple-300"
                    />
                </div>
            )}

            {/* Code Block */}
            <div className="relative group">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-zinc-950 border-x border-t border-gray-200 dark:border-zinc-700 rounded-t-xl">
                    <Code2 size={13} className="text-gray-400 dark:text-zinc-500" />
                    <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Solution</span>
                    <button
                        onClick={handleCopy}
                        className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                    >
                        {copied
                            ? <><CheckCircle size={12} className="text-emerald-500" /> Copied</>
                            : <><Copy size={12} /> Copy</>
                        }
                    </button>
                </div>
                <pre className="bg-gray-100 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-b-xl p-4 overflow-x-auto text-gray-800 dark:text-zinc-100 font-mono text-xs leading-relaxed max-h-80 custom-scrollbar">
                    <code>{aiResult.fullSolution.code}</code>
                </pre>
            </div>

            {/* Explanation */}
            <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Explanation</p>
                <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/40 rounded-xl p-4">
                    {aiResult.fullSolution.explanation}
                </p>
            </div>

            {/* Key Takeaways */}
            <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Key Takeaways</p>
                {aiResult.fullSolution.keyTakeaways.map((t, i) => (
                    <div key={i} className="flex gap-3 p-3.5 bg-gray-50 dark:bg-zinc-800/40 border-l-2 border-l-violet-500 border border-gray-200 dark:border-zinc-700/40 rounded-xl">
                        <span className="text-[11px] font-black text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">0{i + 1}</span>
                        <p className="text-sm text-gray-700 dark:text-zinc-200 leading-relaxed">{t}</p>
                    </div>
                ))}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-zinc-800 flex flex-col items-center gap-3">
                <p className="text-[11px] text-gray-500 dark:text-zinc-600 italic text-center">
                    "Understanding the approach matters more than memorizing code"
                </p>
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                    <RotateCcw size={13} /> Ask another question
                </button>
            </div>
        </motion.div>
    );
};
// ─── Main Component ──────────────────────────────────────────────────────────

const AIChatPanel = ({ problemTitle, problemDescription, language, code, isCodingType }) => {
    const [isOpen, setIsOpen] = useState(() => {
        const saved = localStorage.getItem('ai_chat_open');
        return saved === 'true';
    });
    const [aiResult, setAiResult] = useState(() => {
        const saved = localStorage.getItem('ai_chat_result');
        return saved ? JSON.parse(saved) : null;
    });
    const [currentStage, setCurrentStage] = useState(() => {
        const saved = localStorage.getItem('ai_chat_stage');
        return saved ? parseInt(saved) : 1;
    });
    const [fixIndex, setFixIndex] = useState(() => {
        const saved = localStorage.getItem('ai_chat_fix_index');
        return saved ? parseInt(saved) : 0;
    });
    const [userQuestion, setUserQuestion] = useState(() => {
        const saved = localStorage.getItem('ai_chat_question');
        return saved || '';
    });

    useEffect(() => {
        localStorage.setItem('ai_chat_open', isOpen);
    }, [isOpen]);

    useEffect(() => {
        if (aiResult) localStorage.setItem('ai_chat_result', JSON.stringify(aiResult));
        else localStorage.removeItem('ai_chat_result');
    }, [aiResult]);

    useEffect(() => {
        localStorage.setItem('ai_chat_stage', currentStage);
    }, [currentStage]);

    useEffect(() => {
        localStorage.setItem('ai_chat_fix_index', fixIndex);
    }, [fixIndex]);

    useEffect(() => {
        localStorage.setItem('ai_chat_question', userQuestion);
    }, [userQuestion]);

    const [showSolutionModal, setShowSolutionModal] = useState(false);
    const queryClient = useQueryClient();

    const labels = getTypeLabels(isCodingType);

    const { data: creditsData, isLoading: loadingCredits } = useQuery({
        queryKey: ['aiCredits'],
        queryFn: async () => {
            const res = await apiClient.get(`${API_BASE}/credits`);
            return res.data;
        },
        enabled: isOpen,
        staleTime: 30000,
    });

    const askMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await apiClient.post(`${API_BASE}/ask`, payload, {
                timeout: 120000
            });
            return res.data;
        },
        retry: 0,
        onSuccess: (data) => {
            setAiResult(data.data);
            setCurrentStage(1);
            setFixIndex(0);
            queryClient.invalidateQueries({ queryKey: ['aiCredits'] });
        },
        onError: (err) => {
            const msg = err.response?.data?.message || 'Failed to analyze code. Please try again.';
            toast.error(msg);
        }
    });

    const handleAsk = () => {
        if (!userQuestion.trim()) return toast.error('Please describe what you need help with');
        if (!code?.trim()) return toast.error('No code found to analyze');
        if (creditsData?.remaining <= 0) return toast.error('Daily AI token limit reached. Upgrade for more!');
        askMutation.mutate({ problemTitle, problemDescription, language, code, userQuestion });
    };

    const resetChat = () => {
        setAiResult(null);
        setCurrentStage(1);
        setFixIndex(0);
        setUserQuestion('');
        askMutation.reset();
    };

    const handleShowSolution = () => {
        setShowSolutionModal(false);
        setCurrentStage(4);
    };

    // Floating trigger
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[60] bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-violet-500/20 transition-all active:scale-95 text-sm font-medium"
            >
                <Sparkles size={14} />
                AI Tutor
            </button>
        );
    }

    const totalStages = 4;

    return (
        <>
            <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="fixed right-0 top-0 h-full w-full md:w-[22rem] bg-white dark:bg-[var(--color-bg-sidebar)] border-l border-gray-200 dark:border-zinc-800 shadow-2xl z-[1000] flex flex-col"
            >
                {/* Header */}
                <div className="px-4 py-3.5 bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                            <Sparkles size={14} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 leading-none">AI Tutor</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {aiResult && <StageIndicator current={currentStage - 1} total={totalStages} />}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Credits Bar */}
                <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                    {loadingCredits ? (
                        <Loader2 className="animate-spin text-gray-400 dark:text-zinc-600 mx-auto" size={13} />
                    ) : (
                        <>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                                <span className="font-bold text-violet-600 dark:text-violet-400">
                                    {Math.round(creditsData?.remaining / 1000)}K
                                </span>
                                 / {Math.round(creditsData?.limit / 1000)}K tokens left
                            </p>
                            <div className="w-24 h-1 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-violet-500 rounded-full transition-all"
                                    style={{
                                        width: `${((creditsData?.remaining ?? 0) / (creditsData?.limit || 5000)) * 100}%`
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

                    {/* Input State */}
                    {!aiResult && !askMutation.isPending && (
                        <motion.div {...fadeSlide} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-0.5">
                                    What do you need help with?
                                </label>
                                <textarea
                                    value={userQuestion}
                                    onChange={(e) => setUserQuestion(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handleAsk()}
                                    placeholder="Describe your doubt… e.g. Why is my submission wrong?"
                                    className="w-full bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 rounded-xl p-3.5 text-sm text-gray-900 dark:text-zinc-100 outline-none min-h-[110px] resize-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 transition-all"
                                />
                                <p className="text-[10px] text-gray-400 dark:text-zinc-600 text-right">Ctrl + Enter to submit</p>
                            </div>

                            {creditsData?.remaining <= 0 ? (
                                <div className="flex flex-col items-center gap-3 p-6 bg-zinc-800/50 border border-zinc-700 rounded-xl text-center">
                                    <Lock size={28} className="text-zinc-600" />
                                    <div>
                                        <p className="text-sm font-bold text-zinc-300">Daily tokens exhausted</p>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Your limit resets tomorrow. Upgrade for more tokens!
                                        </p>
                                        <button 
                                            onClick={() => window.location.href = '/dashboard/pricing'}
                                            className="mt-4 text-xs text-violet-400 font-bold hover:underline"
                                        >
                                            Upgrade Plan →
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleAsk}
                                    disabled={!userQuestion.trim()}
                                    className="w-full btn-primary py-2 text-xs"
                                >
                                    <Zap size={14} className="fill-current" />
                                    {labels.analyzeBtn}
                                </button>
                            )}
                            <p className="text-[10px] text-center text-zinc-600">
                                Tokens are used for code analysis · {Math.round(creditsData?.remaining / 1000)}K remaining
                            </p>
                        </motion.div>
                    )}

                    {/* Loading State */}
                    {askMutation.isPending && (
                        <div className="flex flex-col items-center justify-center py-16 gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-violet-500/20 blur-2xl animate-pulse rounded-full" />
                                <div className="relative w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800 border border-violet-500/30 flex items-center justify-center">
                                    <Brain size={32} className="text-violet-600 dark:text-violet-400 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center space-y-1.5">
                                <p className="font-bold text-gray-900 dark:text-zinc-100">{labels.thinkingLabel}</p>
                                <p className="text-xs text-gray-500 dark:text-zinc-500">{labels.thinkingSubLabel}</p>
                                <p className="text-[10px] text-gray-400 dark:text-zinc-600">This may take up to 60 seconds</p>
                            </div>
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <div
                                        key={i}
                                        className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Result Stages */}
                    {aiResult && (
                        <AnimatePresence mode="wait">
                            {currentStage === 1 && <Stage1 aiResult={aiResult} onNext={() => setCurrentStage(2)} />}
                            {currentStage === 2 && <Stage2 aiResult={aiResult} onNext={() => setCurrentStage(3)} onNobugs={() => setCurrentStage(4)} />}
                            {currentStage === 3 && <Stage3 aiResult={aiResult} fixIndex={fixIndex} setFixIndex={setFixIndex} onShowSolution={() => setShowSolutionModal(true)} />}
                            {currentStage === 4 && <Stage4 aiResult={aiResult} onReset={resetChat} isCodingType={isCodingType} />}
                        </AnimatePresence>
                    )}
                </div>

                {/* Footer */}
                {aiResult && (
                    <div className="px-4 py-3 border-t border-zinc-800 shrink-0 flex items-center justify-between bg-zinc-950">
                        <p className="text-[10px] text-zinc-600">Stage {currentStage} of {totalStages}</p>
                        <button
                            onClick={resetChat}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-violet-400 transition-colors"
                        >
                            <RotateCcw size={12} /> New question
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Solution Reveal Modal */}
            <AnimatePresence>
                {showSolutionModal && (
                    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                            onClick={() => setShowSolutionModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative z-10 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5"
                        >
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                                    <AlertCircle size={24} className="text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-100">Reveal full solution?</h3>
                                    <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                                        You'll learn more by attempting the fix first. Are you sure you want to see the answer?
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <button
                                    onClick={handleShowSolution}
                                    className="w-full btn-primary py-3"
                                >
                                    Yes, show solution
                                </button>
                                <button
                                    onClick={() => setShowSolutionModal(false)}
                                    className="w-full btn-secondary py-3"
                                >
                                    Let me try first
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AIChatPanel;








