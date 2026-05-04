import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    MicOff,
    PhoneOff,
    AlertCircle,
    MessageSquare,
    ChevronRight,
    Send,
    Loader2,
    RefreshCw,
    Trophy,
    ArrowRight
} from 'lucide-react';
import { cn, formatTime } from '../../utils/interviewUtils';
import { INTERVIEWER_SYSTEM_PROMPTS, generateDebrief } from '../../lib/interviewGemini';
import { useInterviewLiveAPI } from '../../hooks/useInterviewLiveAPI';
import { patchInterviewSession } from '../../services/interviewSessionService';

const INTERVIEWER_AVATARS = {
    HR: 'https://img.freepik.com/premium-photo/3d-render-avatar-character_113255-92209.jpg',
    Technical: 'https://img.freepik.com/premium-photo/3d-render-avatar-character_113255-92331.jpg',
    Coding: 'https://img.freepik.com/premium-photo/3d-render-avatar-character_113255-92265.jpg',
    Situational: 'https://img.freepik.com/premium-photo/3d-render-avatar-character_113255-92208.jpg',
    Custom: 'https://img.freepik.com/premium-photo/3d-render-avatar-character_113255-92212.jpg',
};

const USER_AVATAR_FALLBACK = 'https://img.freepik.com/premium-photo/3d-render-avatar-character_113255-92205.jpg';

function promptForType(type, difficulty) {
    const fn = INTERVIEWER_SYSTEM_PROMPTS[type] || INTERVIEWER_SYSTEM_PROMPTS.Custom;
    return fn(difficulty);
}

export default function InterviewRoom({ session, user, onEnd }) {
    const [transcript, setTranscript] = useState(() =>
        Array.isArray(session.transcript) ? session.transcript : []
    );
    const [timeLeft, setTimeLeft] = useState(session.plannedDuration * 60);
    const timeLeftRef = useRef(timeLeft);
    timeLeftRef.current = timeLeft;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open as requested
    const [textInput, setTextInput] = useState('');
    const [ending, setEnding] = useState(false);
    const timeUpSignaledRef = useRef(false);

    const timerRef = useRef(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    const sysInstruction = `
    ${promptForType(session.interviewType, session.difficulty)}

    IMPORTANT: You are a SINGLE interviewer, not a panel. Use "I" instead of "we".

    CRITICAL DATABASE CONTEXT:
    - Target Company: ${session.companyName || 'Not specified'}
    - Job Description: ${session.jobDescription || 'Not specified'}
    - Candidate Resume Data:
    -----------------------
    ${session.resumeText || 'None provided'}
    -----------------------

    INSTRUCTIONS:
    - You MUST use the "Candidate Resume Data" as your ONLY source for the candidate's history.
    - Responses: Keep them conversational (1-3 sentences max).
  `;

    const finalizeTimeoutRef = useRef(null);

    const onTranscriptUpdate = useCallback((turn) => {
        if (turn.text.startsWith('[SYSTEM SIGNAL:')) return;

        // If we were about to finalize but new text came in, cancel finalization
        if (finalizeTimeoutRef.current) {
            clearTimeout(finalizeTimeoutRef.current);
            finalizeTimeoutRef.current = null;
        }

        setTranscript((prev) => {
            if (prev.length === 0) return [turn];
            
            const updated = [...prev];
            const last = updated[updated.length - 1];

            // Merge if same speaker AND not finalized
            if (last.speaker === turn.speaker && !last.isFinalized) {
                if (turn.text.startsWith(last.text)) {
                    last.text = turn.text;
                } else if (last.text.length < turn.text.length && turn.text.includes(last.text)) {
                    last.text = turn.text;
                } else {
                    if (!last.text.endsWith(turn.text)) {
                        last.text = last.text + " " + turn.text;
                    }
                }
                
                last.timestamp_end = turn.timestamp_end;
                return updated;
            }
            
            return [...prev, turn];
        });
    }, []);

    const {
        state,
        error,
        isSpeaking,
        volume,
        isMuted,
        setIsMuted,
        connect,
        disconnect,
        sendMessage,
        forceFallback,
    } = useInterviewLiveAPI({
        systemInstruction: sysInstruction,
        onTranscriptUpdate,
        voiceName: session.voiceName || 'Puck',
    });

    // Finalize the last interviewer turn when they stop speaking (with a debounce)
    useEffect(() => {
        if (!isSpeaking) {
            // Wait 1.2s before finalizing to catch fragmented AI turns
            finalizeTimeoutRef.current = setTimeout(() => {
                setTranscript(prev => {
                    if (prev.length === 0) return prev;
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.speaker === 'interviewer' && !last.isFinalized) {
                        last.isFinalized = true;
                        return updated;
                    }
                    return prev;
                });
                finalizeTimeoutRef.current = null;
            }, 1200);
        } else {
            // AI started speaking again, cancel any pending finalization
            if (finalizeTimeoutRef.current) {
                clearTimeout(finalizeTimeoutRef.current);
                finalizeTimeoutRef.current = null;
            }
        }

        return () => {
            if (finalizeTimeoutRef.current) clearTimeout(finalizeTimeoutRef.current);
        };
    }, [isSpeaking]);

    const sendMessageRef = useRef(sendMessage);
    sendMessageRef.current = sendMessage;
    const hasStartedRef = useRef(false);

    useEffect(() => {
        connect();
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    if (!timeUpSignaledRef.current) {
                        timeUpSignaledRef.current = true;
                        sendMessageRef.current("[SYSTEM SIGNAL: Time is up. Finalize your current point and offer to answer questions.]");
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            disconnect();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        if (state === 'connected' && !hasStartedRef.current) {
            hasStartedRef.current = true;
            setTimeout(() => {
                sendMessage('[SYSTEM SIGNAL: Greet the candidate and ask for an introduction.]');
            }, 1000);
        }
    }, [state, sendMessage]);

    const handleEnd = async () => {
        if (ending) return;
        setEnding(true);
        disconnect();

        const tLeft = timeLeftRef.current;
        try {
            const actualDuration = Math.round((session.plannedDuration * 60 - tLeft) / 60);
            const debrief = await generateDebrief(transcript, {
                ...session,
                actual_duration_minutes: actualDuration,
                session_status: tLeft > 0 ? 'ended_early' : 'completed',
            });

            await patchInterviewSession(session.id, {
                transcript,
                debrief,
                status: tLeft > 0 ? 'ended_early' : 'completed',
                score: debrief?.scores?.overall ?? null,
                durationSeconds: session.plannedDuration * 60 - tLeft,
            });

            onEnd({ ...session, transcript, debrief, status: tLeft > 0 ? 'ended_early' : 'completed' });
        } catch (err) {
            console.error('Failed to end session:', err);
            onEnd({ ...session, transcript, status: 'ended_early' });
        }
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim()) return;
        sendMessage(textInput);
        setTextInput('');
    };

    const avatarImg = user?.profile?.profilePicture || user?.profileImage || USER_AVATAR_FALLBACK;
    const candidateName = user?.firstName || 'Candidate';
    const interviewerImg = INTERVIEWER_AVATARS[session.interviewType] || INTERVIEWER_AVATARS.Custom;

    if (ending) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--color-bg-primary)] min-h-[600px] rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xl">
                <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-primary-600/10 rounded-full" />
                    <div className="absolute inset-0 border-4 border-t-primary-600 rounded-full animate-spin" />
                    <Trophy size={32} className="text-primary-600" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white mb-3">Analyzing Performance</h2>
                <p className="text-gray-500 text-[9px] font-semibold uppercase tracking-[0.3em] animate-pulse">
                    Generating Insights...
                </p>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-[var(--color-bg-primary)] flex flex-col overflow-hidden p-4 lg:p-6">
            <div className="flex-1 flex flex-col bg-[var(--color-bg-card)] rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 relative">
                    {/* Minimal Sub-header for Status */}
                    <div className="h-14 flex-shrink-0 bg-[var(--color-bg-card)] border-b border-gray-100 dark:border-white/5 flex items-center justify-between px-6 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatTime(timeLeft)} remaining</span>
                    </div>
                    <div className="h-4 w-[1px] bg-gray-200 dark:bg-white/5" />
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{session.interviewType} Interview</p>
                    </div>
                </div>
                
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        isSidebarOpen 
                            ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600" 
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    )}
                >
                    <MessageSquare size={14} />
                    {isSidebarOpen ? "Hide Chat" : "Show Chat"}
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Visual Area */}
                <motion.main 
                    layout
                    className="flex-1 relative flex items-center justify-center p-8 overflow-hidden bg-[var(--color-bg-primary)]/30 dark:bg-black/20"
                >
                    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
                        {/* Interviewer Column */}
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative group">
                                <motion.div
                                    animate={{
                                        scale: isSpeaking ? [1, 1.01, 1] : 1,
                                        boxShadow: isSpeaking
                                            ? `0 0 ${volume * 80}px rgba(13, 148, 136, 0.1)`
                                            : '0 10px 30px rgba(0,0,0,0.1)',
                                    }}
                                    transition={{ duration: 0.2, repeat: isSpeaking ? Infinity : 0 }}
                                    className="w-48 h-48 lg:w-64 lg:h-64 rounded-[2.5rem] p-1 overflow-hidden border border-gray-100 dark:border-white/5 relative z-10 bg-[var(--color-bg-card)] shadow-xl"
                                >
                                    <img
                                        src={interviewerImg}
                                        alt="Interviewer"
                                        className="w-full h-full object-cover rounded-[2.4rem] brightness-95"
                                    />
                                    {isSpeaking && (
                                        <div className="absolute inset-0 bg-primary-600/5 flex items-center justify-center backdrop-blur-[1px]">
                                            <div className="flex gap-1">
                                                {[1, 2, 3].map((i) => (
                                                    <motion.div
                                                        key={i}
                                                        animate={{ height: [6, 20, 6] }}
                                                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                                        className="w-1 bg-primary-500 rounded-full"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">AI Interviewer</h3>
                                <p className={cn(
                                    "text-[9px] font-bold uppercase tracking-[0.2em] transition-colors duration-500",
                                    isSpeaking ? "text-primary-500" : "text-gray-400"
                                )}>
                                    {isSpeaking ? "Speaking..." : "Listening"}
                                </p>
                            </div>
                        </div>

                        {/* Candidate Column */}
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                <div className="w-40 h-40 lg:w-56 lg:h-56 rounded-[2.5rem] p-1 overflow-hidden border border-gray-100 dark:border-white/5 relative z-10 bg-[var(--color-bg-card)] shadow-lg opacity-90">
                                    <img
                                        src={avatarImg}
                                        alt={candidateName}
                                        className="w-full h-full object-cover rounded-[2.4rem] grayscale-[10%]"
                                    />
                                </div>
                                <AnimatePresence>
                                    {state === 'connected' && !isSpeaking && volume > 0.02 && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1.1 }}
                                            exit={{ opacity: 0, scale: 1.2 }}
                                            className="absolute inset-0 border-2 border-primary-500/20 rounded-[3rem]"
                                            style={{ transform: `scale(${1 + volume * 1.2})` }}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="text-center space-y-1">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{candidateName}</h3>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Candidate</p>
                            </div>

                            {/* Audio Visualizer Bars */}
                            <div className="h-6 flex items-center gap-1">
                                {Array.from({ length: 8 }).map((_, idx) => (
                                    <motion.div
                                        key={idx}
                                        animate={{
                                            height: state === 'connected' && (volume > 0.02 || isSpeaking)
                                                    ? [3, Math.random() * 18 + 3, 3]
                                                    : 3,
                                        }}
                                        transition={{ duration: 0.5, repeat: Infinity, delay: idx * 0.05 }}
                                        className={cn(
                                            "w-0.5 rounded-full transition-colors",
                                            volume > 0.02 && !isSpeaking ? "bg-primary-500" : "bg-gray-200 dark:bg-white/10"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Floating Controls */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all border",
                                isMuted 
                                    ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-lg shadow-red-500/5" 
                                    : "bg-[var(--color-bg-card)] border-gray-100 dark:border-white/5 text-gray-400 hover:text-primary-500 hover:border-primary-500/30 shadow-md"
                            )}
                        >
                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>

                        <button
                            onClick={handleEnd}
                            disabled={ending}
                            className="btn-primary !bg-red-600 hover:!bg-red-700 !shadow-red-600/10 !px-4 !py-1.5 !text-xs"
                        >
                            {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneOff size={16} />}
                            End Session
                        </button>

                        <button
                            onClick={() => connect()}
                            className="w-12 h-12 rounded-xl bg-[var(--color-bg-card)] border border-gray-100 dark:border-white/5 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-gray-400 shadow-md"
                        >
                            <RefreshCw size={20} className={cn(state === 'connecting' && "animate-spin")} />
                        </button>
                    </div>
                </motion.main>

                {/* Sidebar Chat / Transcript */}
                <AnimatePresence mode="popLayout">
                    {isSidebarOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 380, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.5 }}
                            className="border-l border-gray-100 dark:border-white/5 bg-[var(--color-bg-primary)] flex flex-col relative z-20 shrink-0 overflow-hidden"
                        >
                            <div className="w-[380px] flex flex-col h-full"> {/* Inner wrapper with fixed width prevents wrapping during animation */}
                                <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
                                    <MessageSquare size={16} className="text-primary-500" />
                                    <h3 className="font-bold text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400">Session Transcript</h3>
                                </div>

                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 flex flex-col scroll-smooth">
                                    {transcript.length === 0 && (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                                            <div className="w-10 h-10 rounded-full border border-dashed border-gray-400 flex items-center justify-center">
                                                <Mic size={16} className="text-gray-400" />
                                            </div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Awaiting Signal...</p>
                                        </div>
                                    )}
                                    {transcript.map((turn, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "flex flex-col gap-2",
                                                turn.speaker === 'user' ? "items-end" : "items-start"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 px-1">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {turn.speaker === 'user' ? 'Candidate' : 'AI Assistant'}
                                                </span>
                                                {turn.speaker === 'interviewer' && idx === transcript.length - 1 && isSpeaking && (
                                                    <span className="w-1 h-1 rounded-full bg-primary-500 animate-pulse" />
                                                )}
                                            </div>
                                            <div
                                                className={cn(
                                                    "max-w-[95%] p-4 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm transition-all",
                                                    turn.speaker === 'user'
                                                        ? "bg-primary-600 text-white rounded-tr-none"
                                                        : "bg-[var(--color-bg-card)] text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-tl-none"
                                                )}
                                            >
                                                {turn.text}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="p-5 border-t border-gray-100 dark:border-white/5 bg-white/50 dark:bg-[#000000]/50">
                                    <form onSubmit={handleTextSubmit} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={textInput}
                                            onChange={(e) => setTextInput(e.target.value)}
                                            placeholder="Type a response..."
                                            className="flex-1 bg-[var(--color-bg-input)] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-[11px] outline-none text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary-500/30 transition-all shadow-inner"
                                        />
                                        <button type="submit" className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center shadow-md shadow-primary-600/10 active:scale-95">
                                            <Send size={16} />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>

            {/* Connecting Overlay */}
            <AnimatePresence>
                {state === 'connecting' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[50] flex items-center justify-center bg-white/80 dark:bg-black/90 backdrop-blur-md"
                    >
                        <div className="text-center space-y-6">
                            <div className="relative mx-auto w-16 h-16">
                                <div className="absolute inset-0 border-4 border-primary-600/10 rounded-full" />
                                <div className="absolute inset-0 border-4 border-t-primary-600 rounded-full animate-spin" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-widest">Warming Engine</h2>
                                <p className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em] animate-pulse">Establishing Voice Link...</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Overlay */}
            {state === 'error' && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xs z-[50]">
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500 shadow-2xl">
                        <AlertCircle size={18} className="shrink-0" />
                        <p className="text-[10px] font-bold uppercase tracking-wide">{error}</p>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}








