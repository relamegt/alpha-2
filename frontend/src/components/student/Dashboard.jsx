import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import profileService from '../../services/profileService';
import { useQuery } from '@tanstack/react-query';
import { 
    Trophy, Globe, Zap, Layout, 
    BarChart3, Bookmark, Calendar as CalendarIcon,
    ChevronRight, ChevronDown, Play, Info, Flame,
    TrendingUp, Star, Search, FileText,Award,
    PieChart, Monitor, CheckCircle, BookOpen,
    ArrowRight, MessageSquare
} from 'lucide-react';

// New Components
import StatCard from './dashboard/StatCard';
import RankScoreChart from './dashboard/RankScoreChart';
import StreakCalendar from './dashboard/StreakCalendar';
import MetricChart from './dashboard/MetricChart';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedRange, setSelectedRange] = useState('month'); // week, month, year
    const [activeTab, setActiveTab] = useState('summary');

    const { data, isLoading } = useQuery({
        queryKey: ['dashboard', selectedRange],
        queryFn: async () => {
            const response = await profileService.getDashboardData(selectedRange);
            return response.dashboard;
        },
        enabled: !!user,
    });

    const dashboardData = data;

    const tabs = [
        { id: 'summary', label: 'Summary', icon: Layout },
        { id: 'metrics', label: 'Metrics', icon: BarChart3 },
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
                    <h1 className="page-header-title">Dashboard</h1>
                    <p className="page-header-desc">
                        Welcome back, {user?.firstName || 'Student'}! Track your progress and master your skills.
                    </p>
                </header>

                <div className="page-tabs-container">
                    <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full w-max shadow-sm">
                        {[
                            { id: 'summary', label: 'Summary' },
                            { id: 'metrics', label: 'Metrics' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm transition-all whitespace-nowrap ${
                                    activeTab === tab.id
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
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Top Stats Cards - 4 Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-2">
                                        <Trophy size={14} className="text-gray-400" />
                                        <h4 className="text-[13px] text-gray-400">Overall Rank</h4>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 opacity-50" />
                                </div>
                                <div className="flex items-end justify-between">
                                    <p className="text-4xl text-gray-900 dark:text-white leading-none tracking-tight">
                                        {leaderboardStats?.globalRank || 'N/A'}
                                    </p>
                                    <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                                        Current rank
                                    </p>
                                </div>
                            </div>

                            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-primary-500/20 rounded flex items-center justify-center">
                                            <div className="w-2 h-2 bg-primary-500 rounded-sm" />
                                        </div>
                                        <h4 className="text-[13px] text-gray-400">Overall Score</h4>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 opacity-50" />
                                </div>
                                <div className="flex items-end justify-between">
                                    <p className="text-4xl text-gray-900 dark:text-white leading-none tracking-tight">
                                        {leaderboardStats?.score?.toLocaleString() || 'N/A'}
                                    </p>
                                    <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                                        Total coins earned
                                    </p>
                                </div>
                            </div>

                            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-2">
                                        <Flame size={14} className="text-orange-500" />
                                        <h4 className="text-[13px] text-gray-400">Overall Streak</h4>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between">
                                    <p className="text-4xl text-gray-900 dark:text-white leading-none tracking-tight">
                                        {progress?.streakDays || 0}
                                    </p>
                                    <p className="text-[11px] text-emerald-500">days</p>
                                </div>
                            </div>

                            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 relative overflow-hidden group border-amber-500/30">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Zap size={14} className="text-amber-500" />
                                        <h4 className="text-[13px] text-gray-400">Daily Challenge</h4>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[10px] uppercase tracking-wider">Hard</span>
                                        <span className="px-2 py-0.5 bg-primary-500/10 text-primary-500 rounded text-[10px] uppercase tracking-wider">Problem</span>
                                    </div>
                                </div>
                                <h4 className="text-lg text-gray-900 dark:text-white mb-1">Merge Two BSTs</h4>
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] text-amber-500">Earn 50 coins</p>
                                    <Link to="/dashboard/compiler" className="text-[11px] text-gray-300 hover:text-white transition-colors">Solve Now →</Link>
                                </div>
                            </div>
                        </div>

                        {/* Chart & Streak Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-8 bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Rank & Score progress</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Real-time performance metrics</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-lg text-[10px] text-blue-500 border border-blue-500/20">
                                                <Trophy size={12} /> Rank: {leaderboardStats?.globalRank || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 rounded-lg text-[10px] text-purple-500 border border-purple-500/20">
                                                <div className="w-3 h-3 bg-purple-500/20 rounded flex items-center justify-center"><div className="w-1.5 h-1.5 bg-purple-500 rounded-sm" /></div> Score: {leaderboardStats?.score || 'N/A'}
                                            </div>
                                        </div>
                                        <select 
                                            value={selectedRange}
                                            onChange={(e) => setSelectedRange(e.target.value)}
                                            className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400 outline-none cursor-pointer hover:border-primary-500/50 transition-colors"
                                        >
                                            <option value="week">This Week</option>
                                            <option value="month">This Month</option>
                                            <option value="year">This Year</option>
                                        </select>
                                    </div>
                                </div>
                                <RankScoreChart data={progress?.chartData || []} />
                            </div>

                            <div className="lg:col-span-4 flex flex-col h-full">
                                <StreakCalendar activeDates={progress?.activeDateStrings || []} />
                            </div>
                        </div>

                        {/* Sheets & Monthly Leaderboard Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
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
                                            <div key={idx} className="flex items-center justify-between p-4 bg-[var(--color-bg-primary)] rounded-2xl border border-gray-100 dark:border-gray-800">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                                        <CheckCircle size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{sheet.sheetProblem?.title || 'Untitled Problem'}</p>
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

                            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <div className="mb-8">
                                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Active Contests</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Participate and compete with others</p>
                                </div>
                                
                                {courseContests.length > 0 || internalContests.length > 0 ? (
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {[...courseContests, ...internalContests].slice(0, 5).map((contest, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-[var(--color-bg-primary)] rounded-2xl border border-gray-100 dark:border-gray-800 group hover:border-primary-500/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                                                        <Award size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{contest.title}</p>
                                                        <p className="text-[11px] text-gray-500">{contest.duration} mins • {contest.difficulty || 'Medium'}</p>
                                                    </div>
                                                </div>
                                                <Link 
                                                    to={contest.courseId ? `/course-contest/${contest.id}` : `/contest/${contest.id}`} 
                                                    className="p-2 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-primary-500"
                                                >
                                                    <ArrowRight size={18} />
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-16 h-16 bg-[var(--color-bg-surface)] dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 mb-6">
                                            <Trophy size={32} />
                                        </div>
                                        <p className="text-xl text-gray-900 dark:text-white">No active contests</p>
                                        <p className="text-sm text-gray-500 mt-2">Complete activities to appear on the leaderboard</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Activities */}
                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
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
                                    {recentSubmissions.map((sub, idx) => (
                                        <div key={idx} className="p-4 bg-[var(--color-bg-primary)] rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start gap-4">
                                            <div className={`p-2 rounded-xl ${
                                                sub.verdict === 'Accepted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                                {sub.problemType === 'video' ? <Play size={18} /> : 
                                                 sub.problemType === 'quiz' ? <CheckCircle size={18} /> : <Zap size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{sub.problemTitle}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                        sub.verdict === 'Accepted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
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
                        {/* Rank & Score Progress Chart */}
                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Rank & Score progress</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Detailed performance history</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-lg text-[10px] text-blue-500 border border-blue-500/20">
                                            <Trophy size={12} /> Rank: {leaderboardStats?.globalRank || 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 rounded-lg text-[10px] text-purple-500 border border-purple-500/20">
                                            <div className="w-3 h-3 bg-purple-500/20 rounded flex items-center justify-center"><div className="w-1.5 h-1.5 bg-purple-500 rounded-sm" /></div> Score: {leaderboardStats?.score || 'N/A'}
                                        </div>
                                    </div>
                                    <select 
                                        value={selectedRange}
                                        onChange={(e) => setSelectedRange(e.target.value)}
                                        className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400 outline-none cursor-pointer hover:border-primary-500/50 transition-colors"
                                    >
                                        <option value="week">Last 7 Days</option>
                                        <option value="month">Last 30 Days</option>
                                        <option value="year">Last 12 Months</option>
                                    </select>
                                </div>
                            </div>
                            <RankScoreChart data={progress?.chartData || []} />
                        </div>

                        {/* Specific Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { title: 'Quizzes Passed', icon: CheckCircle, data: progress?.metrics?.quizzes || [] },
                                { title: 'Videos Watched', icon: Play, data: progress?.metrics?.videos || [] },
                                { title: 'Problems Solved', icon: Zap, data: progress?.metrics?.problems || [] },
                                { title: 'Articles Read', icon: FileText, data: progress?.metrics?.articles || [] }
                            ].map((m, i) => (
                                <MetricChart 
                                    key={i}
                                    title={m.title}
                                    data={m.data}
                                    color={i === 0 ? '#10b981' : i === 1 ? '#3b82f6' : i === 2 ? '#f59e0b' : '#7d63f2'}
                                    range={selectedRange}
                                />
                            ))}
                        </div>
                    </div>
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
        </div>
    );
};

export default Dashboard;
