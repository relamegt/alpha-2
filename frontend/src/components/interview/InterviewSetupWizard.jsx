import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    Upload,
    Link as LinkIcon,
    Trophy,
    Clock,
    Mic,
    Settings,
    CheckCircle2,
    AlertCircle,
    Play,
    Pause,
    Loader2
} from 'lucide-react';
import { cn } from '../../utils/interviewUtils';
import { AI_VOICES } from '../../lib/interviewGemini';
import { createInterviewSession, parseResumePdf } from '../../services/interviewSessionService';

const STEPS = [
    { id: 'company', title: 'Company', description: 'What are you aiming for?' },
    { id: 'Input', title: 'Input', description: 'Resume & job details' },
    { id: 'mode', title: 'Mode', description: 'Simulation setup' },
];

export default function InterviewSetupWizard({ onComplete, onBack }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [companyName, setCompanyName] = useState('');
    const [website, setWebsite] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [interviewType, setInterviewType] = useState('HR');
    const [difficulty, setDifficulty] = useState('Medium');
    const [duration, setDuration] = useState(30);
    const [resumeFile, setResumeFile] = useState(null);
    const [voiceName, setVoiceName] = useState('Puck');
    const [playingVoice, setPlayingVoice] = useState(null);
    const playingAudioRef = useRef(null);

    useEffect(() => {
        return () => {
            if (playingAudioRef.current) {
                playingAudioRef.current.pause();
                playingAudioRef.current = null;
            }
        };
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const name = (file.name || '').toLowerCase();
        const type = (file.type || '').toLowerCase();
        const looksLikeDocx =
            type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx');
        const looksLikeDoc = type === 'application/msword' || name.endsWith('.doc');

        if (looksLikeDocx || looksLikeDoc) {
            setResumeFile(null);
            setError('DOC/DOCX is not supported yet. Please upload PDF or TXT.');
            return;
        }

        setResumeFile(file);
        setError(null);
    };

    const handlePreviewVoice = (e, vid) => {
        e.stopPropagation();
        if (playingVoice === vid) {
            if (playingAudioRef.current) {
                playingAudioRef.current.pause();
                playingAudioRef.current = null;
            }
            setPlayingVoice(null);
            return;
        }

        if (playingAudioRef.current) {
            playingAudioRef.current.pause();
        }

        setPlayingVoice(vid);
        const audio = new Audio(`/voices/${vid}.wav`);
        playingAudioRef.current = audio;
        
        audio.play().catch(err => {
            console.error('Failed to play preview:', err);
            setPlayingVoice(null);
        });

        audio.onended = () => {
            setPlayingVoice(null);
            playingAudioRef.current = null;
        };
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
            setError(null);
        } else finalize();
    };

    const finalize = async () => {
        if (playingAudioRef.current) {
            playingAudioRef.current.pause();
            playingAudioRef.current = null;
        }
        setPlayingVoice(null);

        setLoading(true);
        setError(null);
        try {
            let resumeText = '';
            if (resumeFile) {
                const name = (resumeFile.name || '').toLowerCase();
                const type = (resumeFile.type || '').toLowerCase();
                const looksLikePdf = type === 'application/pdf' || name.endsWith('.pdf');

                if (looksLikePdf) {
                    resumeText = await parseResumePdf(resumeFile);
                } else {
                    resumeText = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result || '');
                        reader.onerror = () => resolve('');
                        reader.readAsText(resumeFile);
                    });
                    resumeText = String(resumeText).slice(0, 15000);

                    if (resumeText.startsWith('%PDF-')) {
                        throw new Error('This file looks like a PDF. Please upload it as .pdf (not renamed to .txt).');
                    }
                }
            }

            const session = await createInterviewSession({
                companyName,
                website,
                jobDescription,
                interviewType,
                difficulty,
                plannedDuration: duration,
                voiceName,
                resumeUrl: '',
                resumeText,
            });

            onComplete(session);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || 'Could not create session.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col min-h-0">
                <header className="shrink-0 mb-6">
                    <div className="flex items-center justify-between gap-3 px-2">
                        {STEPS.map((s, idx) => (
                            <div key={s.id} className="flex-1 flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={cn(
                                            'w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all',
                                            idx <= currentStep
                                                ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                                                : 'border-[var(--color-border-interactive)] text-gray-400 bg-[var(--color-bg-surface)]'
                                        )}
                                    >
                                        {idx < currentStep ? <CheckCircle2 size={12} /> : idx + 1}
                                    </div>
                                    <div className="hidden sm:block">
                                        <div
                                            className={cn(
                                                'text-[10px] font-bold uppercase tracking-wider',
                                                idx <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                                            )}
                                        >
                                            {s.title}
                                        </div>
                                    </div>
                                </div>
                                <div className={cn(
                                    'h-0.5 rounded-full',
                                    idx <= currentStep ? 'bg-primary-600' : 'bg-gray-100 dark:bg-gray-800'
                                )} />
                            </div>
                        ))}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-hide">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[var(--color-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-10 shadow-sm space-y-8 min-h-[400px]"
                        >
                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-[10px] flex items-center gap-2 font-bold uppercase tracking-widest">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {currentStep === 0 && (
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">Target Company Context</h2>
                                        <p className="text-sm text-gray-500 font-medium">Define your target company for behavioral research.</p>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Target Company</label>
                                            <input
                                                type="text"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                placeholder="e.g. Google, Microsoft"
                                                className="w-full bg-[var(--color-bg-input)] border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all text-sm font-semibold text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Official Website</label>
                                            <div className="relative">
                                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                <input
                                                    type="url"
                                                    value={website}
                                                    onChange={(e) => setWebsite(e.target.value)}
                                                    placeholder="https://company.com"
                                                    className="w-full bg-[var(--color-bg-input)] border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2.5 pl-10 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all text-sm font-semibold text-gray-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">Input Assets</h2>
                                        <p className="text-sm text-gray-500 font-medium">Sync your background with the AI engine.</p>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="bg-[var(--color-bg-card)] p-8 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-primary-500/50 transition-all cursor-pointer relative group flex flex-col items-center justify-center text-center">
                                            <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/10 flex items-center justify-center mb-3">
                                                <Upload size={18} className="text-primary-600" />
                                            </div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{resumeFile ? resumeFile.name : 'Upload resume'}</div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1 font-bold">PDF / TXT</div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Job Description</label>
                                            <textarea
                                                value={jobDescription}
                                                onChange={(e) => setJobDescription(e.target.value)}
                                                placeholder="Paste the job description..."
                                                className="w-full bg-[var(--color-bg-input)] border border-gray-300 dark:border-white/10 rounded-lg p-3 min-h-[140px] focus:ring-1 focus:ring-primary-500/50 outline-none transition-all text-xs font-medium leading-relaxed scrollbar-hide text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">Simulation Tuning</h2>
                                        <p className="text-sm text-gray-500 font-medium">Optimize behavioral parameters.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                         <div className="space-y-2">
                                             <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Type</label>
                                             <div className="flex flex-wrap gap-2">
                                                 {['HR', 'Technical', 'Coding', 'Situational'].map((type) => (
                                                     <button
                                                         key={type}
                                                         type="button"
                                                         onClick={() => setInterviewType(type)}
                                                         className={cn(
                                                             'px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all',
                                                             interviewType === type
                                                                 ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                                                                 : 'border-gray-300 dark:border-white/10 bg-white dark:bg-[var(--color-bg-card)] text-gray-500 hover:border-primary-500/30'
                                                         )}
                                                     >
                                                         {type}
                                                     </button>
                                                 ))}
                                             </div>
                                         </div>

                                         <div className="space-y-2">
                                             <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Difficulty</label>
                                             <div className="flex flex-wrap gap-2">
                                                 {['Easy', 'Medium', 'Hard'].map((diff) => (
                                                     <button
                                                         key={diff}
                                                         type="button"
                                                         onClick={() => setDifficulty(diff)}
                                                         className={cn(
                                                             'px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all',
                                                             difficulty === diff
                                                                 ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                                                                 : 'border-gray-300 dark:border-white/10 bg-white dark:bg-[var(--color-bg-card)] text-gray-500 hover:border-primary-500/30'
                                                         )}
                                                     >
                                                         {diff}
                                                     </button>
                                                 ))}
                                             </div>
                                         </div>
                                     </div>

                                     <div className="p-4 rounded-xl border border-gray-300 dark:border-white/10 flex items-center justify-between">
                                         <div className="flex items-center gap-2">
                                             <Clock size={14} className="text-primary-500" />
                                             <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Duration</span>
                                         </div>
                                         <div className="flex items-center gap-3 flex-1 max-w-[140px] ml-6">
                                             <input
                                                 type="range"
                                                 min="5"
                                                 max="60"
                                                 step="5"
                                                 value={duration}
                                                 onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                                                 className="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full cursor-pointer accent-primary-600"
                                             />
                                             <span className="text-xs font-bold whitespace-nowrap text-gray-900 dark:text-white">{duration} mins</span>
                                         </div>
                                     </div>

                                     <div className="space-y-3">
                                         <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">AI Voice Persona</label>
                                         <div className="grid grid-cols-3 gap-3">
                                             {AI_VOICES.map((v) => (
                                                <div key={v.id} className="relative group">
                                                    <button
                                                        type="button"
                                                        onClick={() => setVoiceName(v.id)}
                                                        className={cn(
                                                            'w-full flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center',
                                                            voiceName === v.id
                                                                ? 'border-primary-600 bg-primary-600/10'
                                                                : 'border-gray-300 dark:border-white/10 bg-[var(--color-bg-card)] hover:border-primary-500/30'
                                                        )}
                                                    >
                                                        <div className="mb-10" />
                                                        <span className={cn('text-[10px] font-bold uppercase tracking-wider', voiceName === v.id ? 'text-primary-600' : 'text-gray-500')}>{v.name}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handlePreviewVoice(e, v.id)}
                                                        className={cn(
                                                            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-8px] w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg z-20",
                                                            playingVoice === v.id 
                                                               ? "bg-primary-600 text-white animate-pulse" 
                                                               : "bg-white dark:bg-gray-800 text-primary-600 border border-gray-100 dark:border-gray-700 hover:scale-110 active:scale-95"
                                                        )}
                                                    >
                                                        {playingVoice === v.id ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                                                    </button>
                                                </div>
                                             ))}
                                         </div>
                                     </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <footer className="shrink-0 pt-6">
                    <div className="flex items-center justify-end gap-3 w-full">
                        <button
                            type="button"
                            disabled={currentStep === 0}
                            onClick={() => setCurrentStep(currentStep - 1)}
                            className="btn-secondary !px-4 !py-1.5 !text-xs disabled:opacity-0 whitespace-nowrap"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={loading}
                            className="btn-primary !px-4 !py-1.5 !text-xs disabled:opacity-50 whitespace-nowrap"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : currentStep === STEPS.length - 1 ? 'Start Interview' : 'Continue'}
                            {!loading && <ArrowRight size={12} />}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}








