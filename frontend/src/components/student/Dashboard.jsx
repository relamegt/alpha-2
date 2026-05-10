import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import profileService from '../../services/profileService';
import analyticsService from '../../services/analyticsService';
import { useQuery } from '@tanstack/react-query';
import {
    Trophy, Globe, Zap, Layout,
    BarChart3, Bookmark, Calendar as CalendarIcon,
    ChevronRight, ChevronDown, Play, Info, Flame,
    TrendingUp, Star, Search, FileText, Award,
    PieChart, Monitor, CheckCircle, BookOpen,
    ArrowRight, MessageSquare, AreaChart as AreaChartIcon
} from 'lucide-react';

// New Components
import StatCard from './dashboard/StatCard';
import RankScoreChart from './dashboard/RankScoreChart';
import StreakCalendar from './dashboard/StreakCalendar';
import MetricChart from './dashboard/MetricChart';
import HeatmapChart from '../shared/HeatmapChart';
import CustomDropdown from '../shared/CustomDropdown';
import PerformanceHistoryModal from './dashboard/PerformanceHistoryModal';

const Dashboard = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [rankRange, setRankRange] = useState('week');
    const [quizMetricsRange, setQuizMetricsRange] = useState('week');
    const [videoMetricsRange, setVideoMetricsRange] = useState('week');
    const [problemMetricsRange, setProblemMetricsRange] = useState('week');
    const [articleMetricsRange, setArticleMetricsRange] = useState('week');
    const [activeTab, setActiveTab] = useState('summary');
    const [performanceModal, setPerformanceModal] = useState({ isOpen: false, type: 'rank', title: '', subtitle: '' });

    const { data, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
            // Refresh user data to get latest usage stats (matching settings page logic)
            try {
                await refreshUser();
            } catch (e) {
                console.error('Refresh user failed on dashboard mount', e);
            }
            const response = await profileService.getDashboardData();
            return response.dashboard;
        },
        enabled: !!user,
    });

    const dashboardData = data;

    const tabs = [
        { id: 'summary', label: 'Summary', icon: Layout },
        { id: 'metrics', label: 'Metrics', icon: BarChart3 },
        { id: 'leaderboard', label: 'Leaderboard', icon: Globe },
        { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    ];

    if (isLoading) {
        return (
            <div className="p-6 bg-[var(--color-bg-primary)] min-h-screen transition-colors">
                <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
                    <div className="flex items-center justify-between">
                        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
                        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                                <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                                <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                            </div>
                            <div className="h-[400px] bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        </div>
                        <div className="space-y-6">
                            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!dashboardData) return null;

    const {
        progress,
        leaderboardStats,
        recentSubmissions = [],
        assignedCourses = [],
        monthlySheetProgress = [],
        courseContests = [],
        internalContests = []
    } = dashboardData;

    return (
        <div className="transition-colors font-sans">

            {/* Header Section */}
            <header className="page-header-container animate-in fade-in slide-in-from-top-4 duration-700">
                <h1 className="page-header-title">Global Dashboard</h1>
                <p className="page-header-desc">
                    Global dashboard reflecting your stats across all courses.
                </p>
            </header>

            <div className="page-tabs-container">
                <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full w-max shadow-sm">
                    {[
                        { id: 'summary', label: 'Summary' },
                        { id: 'metrics', label: 'Metrics' },
                        { id: 'leaderboard', label: 'Leaderboard' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]'
                                    : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'summary' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {/* Top Stats Cards - 4 Columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div 
                            onClick={() => setPerformanceModal({ 
                                isOpen: true, 
                                type: 'rank', 
                                title: 'Overall Rank', 
                                subtitle: 'Track your global ranking over time' 
                            })}
                            className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Trophy size={14} className="text-primary-500" />
                                    <h4 className="text-[17px] text-gray-400">Overall Rank</h4>
                                </div>
                                <div className="p-1 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <AreaChartIcon size={14} className="text-primary-500" />
                                </div>
                                <ChevronRight size={14} className="text-gray-400 opacity-50" />
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {leaderboardStats?.globalRank || 'N/A'}
                                </p>
                                <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                                    Current rank
                                </p>
                            </div>
                        </div>

                        <div 
                            onClick={() => setPerformanceModal({ 
                                isOpen: true, 
                                type: 'score', 
                                title: 'Overall Score', 
                                subtitle: 'Track your points progression across all courses' 
                            })}
                            className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-primary-500/20 rounded flex items-center justify-center">
                                        <div className="w-2 h-2 bg-primary-500 rounded-sm" />
                                    </div>
                                    <h4 className="text-[17px] text-gray-400">Overall Score</h4>
                                </div>
                                <div className="p-1 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <AreaChartIcon size={14} className="text-primary-500" />
                                </div>
                                <ChevronRight size={14} className="text-gray-400 opacity-50" />
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {leaderboardStats?.score?.toLocaleString() || '0'}
                                </p>
                                <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                                    Total coins earned
                                </p>
                            </div>
                        </div>

                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Flame size={14} className="text-primary-500" />
                                    <h4 className="text-[17px] text-gray-400">Overall Streak</h4>
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {progress?.streakDays || 0}
                                </p>
                                <p className="text-[11px] text-emerald-500">days</p>
                            </div>
                        </div>

                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group border-amber-500/30 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Zap size={14} className="text-primary-500" />
                                    <h4 className="text-[17px] text-gray-400">Daily Challenge</h4>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded-[4px] text-[9px] uppercase tracking-wider font-bold">Hard</span>
                                </div>
                            </div>

                            <div className="mt-1">
                                <h4 className="text-sm text-gray-900 dark:text-white font-bold line-clamp-1 leading-tight">{dashboardData?.dailyChallenge?.title || 'Daily Challenge'}</h4>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-[11px] text-amber-500 font-bold">Earn {dashboardData?.dailyChallenge?.coins || 0} coins</p>
                                    <Link to="/compiler" className="text-[11px] text-primary-500 hover:text-white transition-colors font-bold underline underline-offset-2">Solve →</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Plan & Usage Section */}
                    {user?.role === 'student' && (
                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary-500/10 rounded-2xl text-primary-500">
                                        <Award size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {user.plan || 'FREE'} PLAN
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {user.plan === 'FREE' || !user.subscriptionExpiresAt || isNaN(new Date(user.subscriptionExpiresAt).getTime())
                                                ? 'Upgrade to unlock premium features' 
                                                : `Valid until ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 max-w-4xl">
                                    {/* AI Tokens */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold tracking-wider text-gray-500">
                                            <span>AI Tokens</span>
                                            <span>
                                                {user.dailyAiTokensUsed >= 1000 
                                                    ? `${Math.round(user.dailyAiTokensUsed / 1000)}K` 
                                                    : user.dailyAiTokensUsed || 0} / {user.planInstance?.aiTokensLimit >= 1000 ? `${Math.round(user.planInstance.aiTokensLimit / 1000)}K` : user.planInstance?.aiTokensLimit || (user.plan === 'PRO' ? '75K' : user.plan === 'PLUS' ? '50K' : user.plan === 'BASIC' ? '25K' : '5K')}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-gray-800/80 rounded-full overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.4)]" 
                                                style={{ width: `${Math.min(100, ((user.dailyAiTokensUsed || 0) / (user.planInstance?.aiTokensLimit || (user.plan === 'PRO' ? 75000 : user.plan === 'PLUS' ? 50000 : user.plan === 'BASIC' ? 25000 : 5000))) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Compiler Usage */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold tracking-wider text-gray-500">
                                            <span>Compiler</span>
                                            <span>{user.dailyCompilerUsed || 0} / {user.planInstance?.compilerLimit || (user.plan === 'PRO' ? 300 : user.plan === 'PLUS' ? 100 : user.plan === 'BASIC' ? 50 : 20)}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-gray-800/80 rounded-full overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
                                            <div 
                                                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(168,85,247,0.4)]" 
                                                style={{ width: `${Math.min(100, ((user.dailyCompilerUsed || 0) / (user.planInstance?.compilerLimit || (user.plan === 'PRO' ? 300 : user.plan === 'PLUS' ? 100 : user.plan === 'BASIC' ? 50 : 20))) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Submissions */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold tracking-wider text-gray-500">
                                            <span>Submissions</span>
                                            <span>{user.dailySubmissionsUsed || 0} / {user.planInstance?.submissionsLimit || (user.plan === 'PRO' ? 300 : user.plan === 'PLUS' ? 100 : user.plan === 'BASIC' ? 50 : 20)}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-gray-800/80 rounded-full overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                                style={{ width: `${Math.min(100, ((user.dailySubmissionsUsed || 0) / (user.planInstance?.submissionsLimit || (user.plan === 'PRO' ? 300 : user.plan === 'PLUS' ? 100 : user.plan === 'BASIC' ? 50 : 20))) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* AI Interviews */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold tracking-wider text-gray-500">
                                            <span>AI Interviews</span>
                                            <span>{user.dailyAiInterviewsUsed || 0} / {user.planInstance?.aiInterviewsLimit >= 100000 ? 'Unlimited' : (user.planInstance?.aiInterviewsLimit || 0)}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-gray-800/80 rounded-full overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
                                            <div 
                                                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                                                style={{ width: `${user.planInstance?.aiInterviewsLimit >= 100000 ? 0 : Math.min(100, ((user.dailyAiInterviewsUsed || 0) / Math.max(1, user.planInstance?.aiInterviewsLimit || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {user.plan === 'FREE' && (
                                    <Link to="/pricing" className="btn-primary py-2 px-6">
                                        Upgrade
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Chart & Streak Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                        <div className="lg:col-span-9 bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col min-h-[440px]">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-3xl text-gray-900 dark:text-white tracking-tight font-bold">Rank & Score progress</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">An exciting exercise is waiting for you</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-lg text-[10px] text-blue-500 border border-blue-500/20">
                                            <Trophy size={12} /> Rank: {leaderboardStats?.globalRank || 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 rounded-lg text-[10px] text-purple-500 border border-purple-500/20">
                                            <div className="w-3 h-3 bg-purple-500/20 rounded flex items-center justify-center"><div className="w-1.5 h-1.5 bg-purple-500 rounded-sm" /></div> Score: {leaderboardStats?.score || '0'}
                                        </div>
                                    </div>
                                    <CustomDropdown
                                        options={[
                                            { value: 'week', label: 'Weekly' },
                                            { value: 'month', label: 'Monthly' },
                                            { value: 'year', label: 'Yearly' }
                                        ]}
                                        value={rankRange}
                                        onChange={(val) => setRankRange(val)}
                                        size="small"
                                        width="w-36"
                                    />
                                </div>
                            </div>
                            <RankScoreChart key={activeTab} data={progress?.rangeData?.[rankRange]?.chartData || []} />
                        </div>

                        <div className="lg:col-span-3 flex flex-col h-full">
                            <StreakCalendar
                                activeDates={progress?.activeDateStrings || []}
                                minHeight="440px"
                            />
                        </div>
                    </div>

                    {/* Activity Map (Heatmap) */}
                    <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                        <HeatmapChart
                            data={dashboardData.userSubmissionsHeatMapData || {}}
                            streakDays={progress?.streakDays || 0}
                            maxStreakDays={progress?.maxStreakDays || 0}
                        />
                    </div>

                    {/* Sheets & Monthly Leaderboard Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Sheets</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Monthly progress on practice sheets</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400">
                                        <CalendarIcon size={14} /> This Month
                                    </div>
                                    <Link to="/sheets" className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors">See All</Link>
                                </div>
                            </div>

                            {monthlySheetProgress.length > 0 ? (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {monthlySheetProgress.map((sheet, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => navigate(`/sheets/${sheet.sheetSlug || sheet.sheetId}`)}
                                            className="flex items-center justify-between p-4 bg-[var(--color-bg-primary)] rounded-2xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-primary-500/50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                                    <CheckCircle size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">{sheet.sheetProblem?.title || 'Untitled Problem'}</p>
                                                    <p className="text-[11px] text-gray-500">{new Date(sheet.completedAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] uppercase font-bold tracking-wider">Done</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 bg-[var(--color-bg-surface)] dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 mb-6">
                                        <FileText size={32} />
                                    </div>
                                    <p className="text-xl text-gray-900 dark:text-white">No sheets</p>
                                    <p className="text-sm text-gray-500 mt-2">No sheet progress in this period, or nothing enrolled yet</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Monthly Leaderboard</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Global rankings across all users</p>
                                </div>
                                <button 
                                    onClick={() => setActiveTab('leaderboard')}
                                    className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
                                >
                                    See All
                                </button>
                            </div>

                            <div className="space-y-4">
                                {dashboardData.globalTopPerformers?.length > 0 ? (
                                    dashboardData.globalTopPerformers.slice(0, 10).map((entry, idx) => (
                                        <div key={idx} className={`flex items-center justify-between py-2 transition-all ${entry.studentId === user.id ? 'bg-[#7d63f2]/10 -mx-4 px-4 rounded-lg' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-black text-gray-400 dark:text-gray-500 w-4">{idx + 1}</span>
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
                                                    {entry.profileImage ? (
                                                        <img src={entry.profileImage} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400 dark:text-gray-500">{entry.name?.charAt(0) || entry.username?.charAt(0)}</div>
                                                    )}
                                                </div>
                                                <span className={`text-sm font-medium ${entry.studentId === user.id ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {entry.name || entry.username} {entry.studentId === user.id && '(You)'}
                                                </span>
                                            </div>
                                            <span className={`text-sm font-black ${entry.studentId === user.id ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {(entry.score || entry.overallScore || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                                        <Trophy size={32} className="text-gray-400 dark:text-gray-600 mb-2" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No students ranked yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activities */}
                    <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Recent Activities</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Your latest submissions across all courses</p>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400">
                                <CalendarIcon size={14} /> This Month
                            </div>
                        </div>

                        {recentSubmissions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {recentSubmissions.slice(0, 15).map((sub, idx) => (
                                    <div key={idx} className="p-4 bg-[var(--color-bg-primary)] rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-4">
                                        <div className={`p-2 rounded-xl ${sub.verdict === 'Accepted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                            {sub.problemType === 'video' ? <Play size={18} /> :
                                                sub.problemType === 'quiz' ? <CheckCircle size={18} /> : <Zap size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{sub.problemTitle}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${sub.verdict === 'Accepted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                                    }`}>{sub.verdict}</span>
                                                <span className="text-[10px] text-gray-500">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 bg-[var(--color-bg-surface)] dark:bg-white/5 rounded-3xl flex items-center justify-center text-gray-400 mb-6">
                                    <Zap size={40} />
                                </div>
                                <p className="text-xl text-gray-900 dark:text-white">No recent activities</p>
                                <p className="text-sm text-gray-500 mt-2">Start learning to see your activity history here</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'metrics' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Rank & Score Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div 
                            onClick={() => setPerformanceModal({ 
                                isOpen: true, 
                                type: 'rank', 
                                title: 'Overall Rank', 
                                subtitle: 'Track your global ranking over time' 
                            })}
                            className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Trophy size={14} className="text-primary-500" />
                                    <h4 className="text-[17px] text-gray-400 font-medium">Overall Rank</h4>
                                </div>
                                <AreaChartIcon size={14} className="text-primary-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {leaderboardStats?.globalRank || 'N/A'}
                                </p>
                                <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                                    Current rank
                                </p>
                            </div>
                        </div>

                        <div 
                            onClick={() => setPerformanceModal({ 
                                isOpen: true, 
                                type: 'score', 
                                title: 'Overall Score', 
                                subtitle: 'Track your points progression across all courses' 
                            })}
                            className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-primary-500/20 rounded flex items-center justify-center">
                                        <div className="w-2 h-2 bg-primary-500 rounded-sm" />
                                    </div>
                                    <h4 className="text-[17px] text-gray-400 font-medium">Overall Score</h4>
                                </div>
                                <AreaChartIcon size={14} className="text-primary-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {leaderboardStats?.score?.toLocaleString() || '0'}
                                </p>
                                <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                                    Total coins earned
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Rank & Score Progress Chart */}
                    <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col h-[440px]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-3xl text-gray-900 dark:text-white tracking-tight font-bold">Rank & Score progress</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Detailed performance history and analytics</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-lg text-[10px] text-blue-500 border border-blue-500/20">
                                        <Trophy size={12} /> Rank: {leaderboardStats?.globalRank || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 rounded-lg text-[10px] text-purple-500 border border-purple-500/20">
                                        <div className="w-3 h-3 bg-purple-500/20 rounded flex items-center justify-center"><div className="w-1.5 h-1.5 bg-purple-500 rounded-sm" /></div> Score: {leaderboardStats?.score || '0'}
                                    </div>
                                </div>
                                <CustomDropdown
                                    options={[
                                        { value: 'week', label: 'Weekly' },
                                        { value: 'month', label: 'Monthly' },
                                        { value: 'year', label: 'Yearly' }
                                    ]}
                                    value={rankRange}
                                    onChange={(val) => setRankRange(val)}
                                    size="small"
                                    width="w-36"
                                />
                            </div>
                        </div>
                        <RankScoreChart key={activeTab} data={progress?.rangeData?.[rankRange]?.chartData || []} />
                    </div>

                    {/* Specific Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MetricChart
                            title="Quizzes Passed"
                            data={progress?.rangeData?.[quizMetricsRange]?.metrics?.quizzes || []}
                            color="#10b981"
                            dropdown={
                                <CustomDropdown
                                    options={[
                                        { value: 'week', label: 'Weekly' },
                                        { value: 'month', label: 'Monthly' },
                                        { value: 'year', label: 'Yearly' }
                                    ]}
                                    value={quizMetricsRange}
                                    onChange={(val) => setQuizMetricsRange(val)}
                                    size="small"
                                    width="w-32"
                                />
                            }
                        />
                        <MetricChart
                            title="Videos Watched"
                            data={progress?.rangeData?.[videoMetricsRange]?.metrics?.videos || []}
                            color="#3b82f6"
                            dropdown={
                                <CustomDropdown
                                    options={[
                                        { value: 'week', label: 'Weekly' },
                                        { value: 'month', label: 'Monthly' },
                                        { value: 'year', label: 'Yearly' }
                                    ]}
                                    value={videoMetricsRange}
                                    onChange={(val) => setVideoMetricsRange(val)}
                                    size="small"
                                    width="w-32"
                                />
                            }
                        />
                        <MetricChart
                            title="Problems Solved"
                            data={progress?.rangeData?.[problemMetricsRange]?.metrics?.problems || []}
                            color="#f59e0b"
                            dropdown={
                                <CustomDropdown
                                    options={[
                                        { value: 'week', label: 'Weekly' },
                                        { value: 'month', label: 'Monthly' },
                                        { value: 'year', label: 'Yearly' }
                                    ]}
                                    value={problemMetricsRange}
                                    onChange={(val) => setProblemMetricsRange(val)}
                                    size="small"
                                    width="w-32"
                                />
                            }
                        />
                        <MetricChart
                            title="Articles Read"
                            data={progress?.rangeData?.[articleMetricsRange]?.metrics?.articles || []}
                            color="#7d63f2"
                            dropdown={
                                <CustomDropdown
                                    options={[
                                        { value: 'week', label: 'Weekly' },
                                        { value: 'month', label: 'Monthly' },
                                        { value: 'year', label: 'Yearly' }
                                    ]}
                                    value={articleMetricsRange}
                                    onChange={(val) => setArticleMetricsRange(val)}
                                    size="small"
                                    width="w-32"
                                />
                            }
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Recent Quiz Solved</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Your latest quiz achievements</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {recentSubmissions.filter(a => a.problemType === 'quiz').length > 0 ? (
                                    recentSubmissions.filter(a => a.problemType === 'quiz').slice(0, 5).map((quiz, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-[var(--color-bg-primary)] rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                                    <CheckCircle size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{quiz.problemTitle}</p>
                                                    <p className="text-[11px] text-gray-500">{new Date(quiz.submittedAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] uppercase font-bold tracking-wider">Solved</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nothing to show here</div>
                                        <p className="text-sm text-gray-500 max-w-xs">There is no data to show here yet either you haven't completed any course or you haven't started any course</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Contest Rankings</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Your performance in recent contests</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {dashboardData.contestRankings?.length > 0 ? (
                                    dashboardData.contestRankings.slice(0, 5).map((contest, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-[var(--color-bg-primary)] rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                                                    <Trophy size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{contest.title}</p>
                                                    <p className="text-[11px] text-gray-500">Rank: #{contest.rank} • Score: {contest.score}</p>
                                                </div>
                                            </div>
                                            <span className="px-2 py-1 bg-primary-500/10 text-primary-500 rounded text-[10px] uppercase font-bold tracking-wider">View</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                        <Award size={40} className="text-gray-600 mb-4" />
                                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">No contest rankings</div>
                                        <p className="text-sm text-gray-500">Participate in contests to see your rankings here</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'leaderboard' && (
                <GlobalLeaderboardTab user={user} />
            )}

            {activeTab === 'bookmarks' && (
                <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-20 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-[var(--color-bg-surface)] dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 text-gray-300">
                        <Bookmark size={48} />
                    </div>
                    <h2 className="text-2xl text-gray-900 dark:text-white tracking-tight">Your Bookmarks</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-md mx-auto">Save interesting problems, articles, and discussions to review them later. You haven't bookmarked anything yet.</p>
                    <button className="btn-primary mt-10 px-8 py-3">
                        Explore Content
                    </button>
                </div>
            )}

            <PerformanceHistoryModal 
                isOpen={performanceModal.isOpen}
                onClose={() => setPerformanceModal({ ...performanceModal, isOpen: false })}
                type={performanceModal.type}
                title={performanceModal.title}
                subtitle={performanceModal.subtitle}
                data={progress?.rangeData}
            />
        </div>
    );
};

const GlobalLeaderboardTab = ({ user }) => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const limit = 20;

    const { data, isLoading } = useQuery({
        queryKey: ['globalLeaderboard', page, search],
        queryFn: () => analyticsService.getGlobalLeaderboardPaged(page, limit, search),
        keepPreviousData: true
    });

    const leaderboard = data?.leaderboard || [];
    const pagination = data?.pagination || { totalPages: 1 };

    return (
        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm animate-in fade-in duration-500 min-h-[600px] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight font-bold">Global Leaderboard</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Platform-wide rankings across all users and courses</p>
                </div>
                <div className="relative group max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary-500 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full bg-[var(--color-bg-primary)] border border-gray-100 dark:border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-gray-500"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100 dark:border-gray-800 font-black">
                            <th className="px-6 py-4">Rank</th>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4 text-right">Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-100 dark:bg-gray-800 rounded" /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800" />
                                            <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right"><div className="h-4 w-12 ml-auto bg-gray-100 dark:bg-gray-800 rounded" /></td>
                                </tr>
                            ))
                        ) : leaderboard.length > 0 ? (
                            leaderboard.map((entry) => (
                                <tr 
                                    key={entry.studentId} 
                                    className={`group transition-all hover:bg-gray-50 dark:hover:bg-white/5 ${entry.studentId === user.id ? 'bg-[#7d63f2]/5' : ''}`}
                                >
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-black ${entry.rank <= 3 ? 'text-primary-500' : 'text-gray-400'}`}>
                                            #{entry.rank}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm transition-transform group-hover:scale-105">
                                                {entry.profileImage ? (
                                                    <img src={entry.profileImage} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-sm font-black text-gray-400 dark:text-gray-500">
                                                        {entry.name?.charAt(0) || entry.username?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${entry.studentId === user.id ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {entry.name || entry.username} {entry.studentId === user.id && <span className="ml-1 text-[10px] bg-primary-500/10 text-primary-500 px-1.5 py-0.5 rounded font-black uppercase">You</span>}
                                                </p>
                                                <p className="text-[11px] text-gray-500">@{entry.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-base font-black text-gray-900 dark:text-white">
                                                {entry.score.toLocaleString()}
                                            </span>
                                            <span className="text-[9px] uppercase tracking-widest text-primary-500 font-bold">Coins</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center opacity-50">
                                        <Search size={40} className="text-gray-400 dark:text-gray-600 mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No results found for "{search}"</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
                    <p className="text-xs text-gray-500 font-medium">
                        Showing page {page} of {pagination.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="rotate-180" size={18} />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                            className="p-2 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
