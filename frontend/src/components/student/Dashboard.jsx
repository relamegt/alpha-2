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

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('summary');

    const { data, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
            const response = await profileService.getDashboardData();
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
        recentSubmissions,
        assignedCourses = []
    } = dashboardData;

    return (
        <div className="transition-colors font-sans">
            <div className="space-y-10">
                
                {/* Header Section */}
                <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <h1 className="text-3xl tracking-tight mb-2 text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed max-w-4xl">
                        Welcome back, {user?.firstName || 'Student'}! Track your progress and master your skills.
                    </p>
                </header>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
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

                        {/* Courses Section Removed */}

                        {/* Chart & Streak Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-8 bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Rank & Score progress</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">An exciting exercise is waiting for you</p>
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
                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400">
                                            <CalendarIcon size={14} />
                                            This Week
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>
                                <RankScoreChart data={progress?.chartData || []} />
                            </div>

                            <div className="lg:col-span-4 flex flex-col h-full">
                                <StreakCalendar streakData={[]} />
                            </div>
                        </div>

                        {/* Sheets & Monthly Leaderboard Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Sheets</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">An exciting exercise is waiting for you</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400">
                                            <CalendarIcon size={14} /> This Month <ChevronDown size={14} />
                                        </div>
                                        <Link to="/sheets" className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors">See All</Link>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 bg-[var(--color-bg-surface)] dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 mb-6">
                                        <FileText size={32} />
                                    </div>
                                    <p className="text-xl text-gray-900 dark:text-white">No sheets</p>
                                    <p className="text-sm text-gray-500 mt-2">No sheet progress in this period, or nothing enrolled yet</p>
                                </div>
                            </div>

                            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <div className="mb-8">
                                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Monthly Leaderboard</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">An exciting exercise is waiting for you</p>
                                </div>
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 bg-[var(--color-bg-surface)] dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 mb-6">
                                        <Trophy size={32} />
                                    </div>
                                    <p className="text-xl text-gray-900 dark:text-white">No leaderboard data</p>
                                    <p className="text-sm text-gray-500 mt-2">Complete activities to appear on the leaderboard</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activities */}
                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Recent Activities</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">An exciting exercise is waiting for you</p>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400">
                                    <CalendarIcon size={14} /> This Month <ChevronDown size={14} />
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 bg-[var(--color-bg-surface)] dark:bg-white/5 rounded-3xl flex items-center justify-center text-gray-400 mb-6">
                                    <Zap size={40} />
                                </div>
                                <p className="text-xl text-gray-900 dark:text-white">No recent activities</p>
                                <p className="text-sm text-gray-500 mt-2">Start learning to see your activity history here</p>
                            </div>
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
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">An exciting exercise is waiting for you</p>
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
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400">
                                        <CalendarIcon size={14} /> This Week <ChevronDown size={14} />
                                    </div>
                                </div>
                            </div>
                            <RankScoreChart data={progress?.chartData || []} />
                        </div>

                        {/* Specific Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { title: 'Quizzes Passed', icon: CheckCircle },
                                { title: 'Videos Watched', icon: Play },
                                { title: 'Problems Solved', icon: Zap },
                                { title: 'Articles Read', icon: FileText },
                            ].map((m, i) => (
                                <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">{m.title}</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">An exciting exercise is waiting for you</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400">
                                            <CalendarIcon size={14} /> This Month <ChevronDown size={14} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center py-16 text-center opacity-40 grayscale relative overflow-hidden">
                                        <div className="w-full h-24 flex items-end gap-2 mb-8 px-10 relative z-10">
                                            {[30, 50, 40, 60, 45, 70, 55].map((h, idx) => (
                                                <div key={idx} className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-t-lg" style={{ height: `${h}%` }} />
                                            ))}
                                        </div>
                                        <p className="text-xl text-gray-900 dark:text-white relative z-10">Nothing to show here</p>
                                        <p className="text-sm text-gray-500 mt-2 max-w-[280px] relative z-10">There is no data to show here yet either you haven't completed any course or you haven't started any course</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom Row Specific Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-2xl font-medium text-gray-900 dark:text-white tracking-tight">Recent Quiz Solved</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mt-1">An exciting exercise is waiting for you</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400">
                                        <CalendarIcon size={14} /> This Month <ChevronDown size={14} />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-full h-24 mb-8 opacity-10 space-y-2">
                                        <div className="h-4 bg-gray-500 rounded-full w-3/4 mx-auto" />
                                        <div className="h-4 bg-gray-500 rounded-full w-1/2 mx-auto" />
                                        <div className="h-4 bg-gray-500 rounded-full w-2/3 mx-auto" />
                                    </div>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">Nothing to show here</p>
                                    <p className="text-sm text-gray-500 mt-2">There is no data to show here yet either you haven't completed any course or you haven't started any course</p>
                                </div>
                            </div>

                            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-2xl font-medium text-gray-900 dark:text-white tracking-tight">Contest Rankings</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mt-1">An exciting exercise is waiting for you</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-400">
                                        <CalendarIcon size={14} /> This Month <ChevronDown size={14} />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 bg-[var(--color-bg-surface)] dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 mb-6">
                                        <Award size={32} />
                                    </div>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">No contest rankings</p>
                                    <p className="text-sm text-gray-500 mt-2">Participate in contests to see your rankings here</p>
                                </div>
                            </div>
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
                        <button className="mt-10 px-8 py-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20">
                            Explore Content
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;








