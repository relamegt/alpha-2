import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Target,
    Clock,
    Trophy, 
    CheckCircle2,
    AlertCircle,
    Calendar
} from 'lucide-react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer
} from 'recharts';
import { cn } from '../../utils/interviewUtils';
import { patchInterviewSession } from '../../services/interviewSessionService';

export default function InterviewDebrief({ session, onBack }) {
    const [regenerating, setRegenerating] = useState(false);
    const [data, setData] = useState(session.debrief);

    const chartData = [
        { subject: 'Communication', A: data?.scores?.communication || 0, fullMark: 100 },
        { subject: 'Technical', A: data?.scores?.technical || 0, fullMark: 100 },
        { subject: 'Clarity', A: data?.scores?.clarity || 0, fullMark: 100 },
        { subject: 'Confidence', A: data?.scores?.confidence || 0, fullMark: 100 },
        { subject: 'Problem Solving', A: data?.scores?.problem_solving || 0, fullMark: 100 },
    ];

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            // In a real app, this would call a backend function to re-process the transcript
            // For now, we'll just simulate a delay
            await new Promise(r => setTimeout(r, 2000));
            // Simulated update
            const newDebrief = { ...data, scores: { ...data.scores, overall: Math.min(100, (data.scores?.overall || 0) + 2) } };
            await patchInterviewSession(session.id, { debrief: newDebrief });
            setData(newDebrief);
        } catch (err) {
            console.error(err);
        } finally {
            setRegenerating(false);
        }
    };

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-6 text-center animate-in fade-in zoom-in duration-700">
                <div className="w-16 h-16 bg-[var(--color-bg-card)] rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-300 mx-auto shadow-sm">
                    <AlertCircle size={32} strokeWidth={1} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Feed Terminated</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium max-w-xs mx-auto leading-relaxed">
                        There is no debrief for this session. This usually occurs if the simulation was ended prematurely.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onBack}
                    className="btn-primary !px-4 !py-1.5 !text-xs"
                >
                    Return to Feed
                </button>
            </div>
        );
    }

    const summary = data.session_summary || {};
    const strengths = Array.isArray(data.strengths) ? data.strengths : [];
    const improvements = Array.isArray(data.improvements) ? data.improvements : [];
    const plan = Array.isArray(data.practice_plan_7_days) ? data.practice_plan_7_days : [];
    const checklist = Array.isArray(data.next_interview_checklist) ? data.next_interview_checklist : [];

    return (
        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-800 shrink-0 mb-8">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                        Assessment Report
                    </h1>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                        {summary.company || 'Standard'} • {summary.interview_type || 'Mock'} • {summary.difficulty || 'Advanced'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="btn-secondary !px-4 !py-1.5 !text-xs"
                    >
                        <ArrowLeft size={12} />
                        Exit Report
                    </button>
                </div>
            </header>

            {/* Summary Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-7 bg-[var(--color-bg-card)] p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center"
                >
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                <PolarGrid stroke="rgba(125, 99, 242, 0.1)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10, fontWeight: '600' }} />
                                <Radar name="Score" dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.1} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center mt-4">
                        <div className="text-3xl font-bold tracking-tight text-primary-600 tabular-nums">{data.scores?.overall ?? 0}%</div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mt-1">Overall Mastery</p>
                    </div>
                </motion.div>

                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-primary-600 p-8 rounded-2xl shadow-xl shadow-primary-600/20 text-white flex flex-col justify-between h-full relative overflow-hidden">
                        <div className="space-y-4 relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Candidate Profile</h3>
                            <p className="text-xl font-semibold leading-tight">{summary.role_guess || 'Candidate'}</p>
                        </div>
                        <div className="mt-8 space-y-4 relative z-10">
                            <div className="flex items-center justify-between border-t border-white/20 pt-6">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Duration</div>
                                    <div className="flex items-center gap-2 font-bold text-sm mt-1">
                                        <Clock size={14} className="opacity-70" />
                                        {summary.actual_duration_minutes || summary.duration_mins || 0}m
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Difficulty</div>
                                    <div className="flex items-center gap-2 font-bold text-sm mt-1">
                                        <Trophy size={14} className="opacity-70" />
                                        {summary.difficulty || 'Medium'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--color-bg-card)] p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
                                <CheckCircle2 size={16} />
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Key Strengths</h4>
                        </div>
                        <div className="space-y-4">
                            {strengths.slice(0, 3).map((s, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <div className="space-y-1.5">
                                        <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold leading-relaxed">
                                            {typeof s === 'object'
                                                ? (s.title || (typeof s.evidence === 'object' ? s.evidence.quote : s.evidence))
                                                : s}
                                        </p>
                                        {typeof s === 'object' && s.why_it_matters && (
                                            <p className="text-[10px] text-gray-400 leading-relaxed italic">
                                                {s.why_it_matters}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Growth & Plan */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-1 bg-amber-500 rounded-full" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Improvements</h3>
                    </div>
                    <div className="space-y-4">
                        {improvements.slice(0, 3).map((item, i) => (
                            <div key={i} className="bg-[var(--color-bg-card)] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm border-l-4 border-l-amber-500">
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                                        {typeof item === 'object' ? item.title || item.issue : 'Growth Area'}
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                        {typeof item === 'object'
                                            ? (typeof item.evidence === 'object' ? item.evidence.quote : (item.evidence || item.micro_exercise))
                                            : item}
                                    </p>
                                    {typeof item === 'object' && item.better_answer_example && (
                                        <div className="mt-4 p-4 bg-[var(--color-bg-surface)] dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-2 tracking-wider">Recommendation</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed">{item.better_answer_example}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6 md:pt-4"> {/* Increased spacing and alignment offset */}
                    <div className="flex items-center gap-3 mt-8 md:mt-0">
                        <div className="h-4 w-1 bg-primary-600 rounded-full" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">7-Day Mastery</h3>
                    </div>
                    <div className="space-y-3">
                        {plan.slice(0, 3).map((item, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-[var(--color-bg-card)] rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary-500/20 transition-all group">
                                <div className="w-8 h-8 rounded-xl bg-[var(--color-bg-surface)] dark:bg-gray-900 flex items-center justify-center text-[11px] font-bold text-gray-400 shrink-0 group-hover:bg-primary-600 group-hover:text-white transition-all">
                                    0{i + 1}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-relaxed pt-1.5 flex-1">
                                    {typeof item === 'object'
                                        ? `${item.day || ''}: ${item.focus || ''} - ${Array.isArray(item.tasks) ? item.tasks.join(', ') : (typeof item.tasks === 'object' ? JSON.stringify(item.tasks) : (item.tasks || ''))}`
                                        : item}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}








