import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getInterviewGeminiApiKey } from '../lib/interviewGemini';
import InterviewPulseDashboard from '../components/interview/InterviewPulseDashboard';
import InterviewSetupWizard from '../components/interview/InterviewSetupWizard';
import InterviewRoom from '../components/interview/InterviewRoom';
import InterviewDebrief from '../components/interview/InterviewDebrief';
import { Mic, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '../utils/interviewUtils';
import '../styles/interviewPulse.css';

/**
 * Resume-based voice mock interviews (InterviewPulse) integrated with AlphaKnowledge login
 * and Supabase-backed session storage via the SQL API.
 */
export default function AIInterviewer() {
    const { user, loading } = useAuth();
    const [screen, setScreen] = useState('dashboard');
    const [activeSession, setActiveSession] = useState(null);

    const geminiKey = getInterviewGeminiApiKey();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in fade-in duration-1000 bg-[var(--color-bg-primary)]">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary-600/20 blur-2xl rounded-full animate-pulse" />
                    <Loader2 className="w-12 h-12 animate-spin text-primary-600 relative z-10" strokeWidth={1.5} />
                </div>
                <div className="space-y-1 text-center">
                    <p className="text-xs font-bold text-gray-900 dark:text-white tracking-tight">Synchronizing Simulation...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden animate-in fade-in duration-500">
            <div className={cn(
                "w-full flex-1 flex flex-col min-h-0 overflow-hidden",
                screen === 'interview' ? "max-w-none px-0" : "p-8 space-y-8 bg-[var(--color-bg-primary)]"
            )}>
                {/* HEADER SECTION - Standardized to match Jobs/Sheets */}
                {screen !== 'interview' && (
                    <header className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-8">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                                AI Interviewer
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                Voice-first mock interviews powered by the Gemini engine.
                            </p>
                        </div>
                    </header>
                )}

                {!geminiKey && (
                    <div className="shrink-0">
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-[10px] text-amber-600 flex items-center gap-2 font-semibold uppercase tracking-wider">
                            <AlertCircle size={14} />
                            <span>System Warning: API Key Missing</span>
                        </div>
                    </div>
                )}

                {/* CONTENT AREA */}
                <div className={cn(
                    "flex-1 flex flex-col min-h-0 relative",
                    screen === 'interview' ? "overflow-hidden" : "overflow-y-auto"
                )}>
                    {screen === 'dashboard' && (
                        <InterviewPulseDashboard
                            onStart={() => setScreen('setup')}
                            onViewSession={(s) => {
                                setActiveSession(s);
                                setScreen('debrief');
                            }}
                        />
                    )}

                    {screen === 'setup' && (
                        <InterviewSetupWizard
                            onComplete={(session) => {
                                setActiveSession(session);
                                setScreen('interview');
                            }}
                            onBack={() => setScreen('dashboard')}
                        />
                    )}

                    {screen === 'interview' && activeSession && (
                        <InterviewRoom
                            session={activeSession}
                            user={user}
                            onEnd={(updated) => {
                                setActiveSession(updated);
                                setScreen('debrief');
                            }}
                        />
                    )}

                    {screen === 'debrief' && activeSession && (
                        <InterviewDebrief session={activeSession} onBack={() => setScreen('dashboard')} />
                    )}
                </div>
            </div>
        </div>
    );
}








