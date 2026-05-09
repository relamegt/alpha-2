import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Trophy, Target, Flame, CheckCircle2, ChevronRight, ChevronLeft,
    Calendar as CalendarIcon, Info, Search, Filter, Download,
    Clock, Award, BookOpen, Layout, ArrowLeft, BarChart3,
    History, Bookmark, Settings, Zap, Play, FileText,
    ArrowRight, MessageSquare, PieChart, Monitor, CheckCircle, AreaChart as AreaChartIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import analyticsService from '../../services/analyticsService';
import { RiFireFill } from "react-icons/ri";

// Standard Components
import StatCard from './dashboard/StatCard';
import RankScoreChart from './dashboard/RankScoreChart';
import StreakCalendar from './dashboard/StreakCalendar';
import HeatmapChart from '../shared/HeatmapChart';
import MetricChart from './dashboard/MetricChart';
import CustomDropdown from '../shared/CustomDropdown';
import PerformanceHistoryModal from './dashboard/PerformanceHistoryModal';

// ──────────────────────────────────────────────────────────────────────────────
// Leaderboard Tab Sub-Component (proper hook usage)
// ──────────────────────────────────────────────────────────────────────────────
const getRankBadge = (rank) => { if (rank === 1) return '🥇'; if (rank === 2) return '🥈'; if (rank === 3) return '🥉'; return rank; };
const getRankStyle = (rank) => {
    if (rank === 1) return 'text-yellow-500 font-extrabold text-base';
    if (rank === 2) return 'text-slate-400 font-extrabold text-base';
    if (rank === 3) return 'text-orange-400 font-extrabold text-base';
    return 'text-gray-500 dark:text-gray-400 font-bold text-sm';
};

const LeaderboardTab = ({ fullLbData, fullLbLoading, lbPage, setLbPage, user }) => {
    const { isDark } = useTheme();
    const [lbSearch, setLbSearch] = useState('');
    const leaderboard = fullLbData?.leaderboard || [];
    const pagination = fullLbData?.pagination;
    const actualUserId = user?._id || user?.id || user?.userId;
    const myEntry = leaderboard.find(e => e.studentId && actualUserId && String(e.studentId) === String(actualUserId));

    const filtered = lbSearch.trim()
        ? leaderboard.filter(e =>
            (e.name && e.name.toLowerCase().includes(lbSearch.toLowerCase())) ||
            (e.username && e.username.toLowerCase().includes(lbSearch.toLowerCase()))
        )
        : leaderboard;

    const handleExportCSV = () => {
        if (!leaderboard.length) return;
        const headers = ['Rank', 'Name', 'Username', 'Score'];
        const rows = leaderboard.map(e => [e.rank, e.name, e.username || '', e.score || e.overallScore || 0]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `course_leaderboard_page${lbPage}.csv`);
        link.click();
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Controls row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Course Leaderboard</h3>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative group flex-1 sm:w-64">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={lbSearch}
                            onChange={e => setLbSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111117] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                        />
                    </div>
                    <button 
                        onClick={handleExportCSV} 
                        title="Download CSV" 
                        className="p-2.5 bg-white dark:bg-[#111117] border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-500 hover:text-primary-600 hover:border-primary-500/50 transition-all shadow-sm active:scale-95"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* My rank banner */}
            {myEntry && !fullLbLoading && (
                <div className={`flex items-center justify-between px-5 py-3 rounded-2xl border ${isDark ? 'bg-primary-900/20 border-primary-700/30' : 'bg-primary-50 border-primary-200'} animate-in fade-in duration-300`}>
                    <div className="flex items-center gap-2">
                        <Trophy size={15} className="text-primary-500" />
                        <span className="text-sm font-bold text-primary-700 dark:text-primary-400">Your Rank</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Position</p>
                            <p className="text-lg font-extrabold text-gray-900 dark:text-white">#{myEntry.rank}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</p>
                            <p className="text-lg font-extrabold text-primary-600 dark:text-primary-400">{(myEntry.score || myEntry.overallScore || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className={`border-b ${isDark ? 'border-gray-800 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/70'}`}>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest w-16">Rank</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Student</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Score</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                            {fullLbLoading ? (
                                [...Array(8)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 w-8 bg-gray-200 dark:bg-gray-800 rounded" /></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800" /><div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded" /></div></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filtered.length > 0 ? (
                                filtered.map((entry) => {
                                    const isMe = entry.studentId && actualUserId && String(entry.studentId) === String(actualUserId);
                                    return (
                                        <tr
                                            key={entry.studentId}
                                            className={`group transition-all ${isMe
                                                ? isDark ? 'bg-primary-900/10 border-l-2 border-l-primary-500' : 'bg-primary-50/60 border-l-2 border-l-primary-500'
                                                : isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/60'
                                                }`}
                                        >
                                            <td className="px-6 py-4">
                                                <span className={getRankStyle(entry.rank)}>{getRankBadge(entry.rank)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border shrink-0 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                                                        {entry.profileImage ? (
                                                            <img src={entry.profileImage} alt={entry.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-sm font-extrabold text-gray-500 dark:text-gray-400">{(entry.name || '?').charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold transition-colors ${isMe ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
                                                            {entry.name}
                                                            {isMe && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-primary-500 bg-primary-100 dark:bg-primary-900/30 px-1.5 py-0.5 rounded-full">You</span>}
                                                        </p>
                                                        {entry.username && <p className="text-[11px] text-gray-400 font-medium">@{entry.username}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`text-sm font-extrabold transition-colors ${isMe ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
                                                    {(entry.score || entry.overallScore || 0).toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="3" className="px-8 py-20 text-center">
                                        <Trophy size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">No students ranked yet</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {!fullLbLoading && filtered.length > 0 && pagination && pagination.totalPages > 1 && (
                    <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-800 bg-white/[0.01]' : 'border-gray-100 bg-gray-50/50'} flex items-center justify-between`}>
                        <div className="flex flex-col">
                            <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
                                {lbSearch ? `Showing ${filtered.length} matches` : `Showing students ${((lbPage - 1) * (pagination.limit || 10)) + 1} - ${Math.min(lbPage * (pagination.limit || 10), leaderboard.length)}`}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Total {leaderboard.length} students enrolled</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setLbPage(p => Math.max(1, p - 1))}
                                disabled={lbPage === 1}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111117] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-sm active:scale-95"
                            >
                                <ChevronLeft size={14} strokeWidth={3} />
                                Previous
                            </button>

                            <div className="flex items-center gap-1 px-3">
                                <span className="text-xs font-black text-gray-900 dark:text-white">{lbPage}</span>
                                <span className="text-[10px] font-bold text-gray-400">/</span>
                                <span className="text-[10px] font-bold text-gray-500">{pagination.totalPages}</span>
                            </div>

                            <button
                                onClick={() => setLbPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={lbPage === pagination.totalPages}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111117] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-sm active:scale-95"
                            >
                                Next
                                <ChevronRight size={14} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const CourseAnalytics = () => {
    const { courseId, tab } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(tab || 'summary');
    const [rankRange, setRankRange] = useState('week');
    const [quizMetricsRange, setQuizMetricsRange] = useState('week');
    const [videoMetricsRange, setVideoMetricsRange] = useState('week');
    const [problemMetricsRange, setProblemMetricsRange] = useState('week');
    const [articleMetricsRange, setArticleMetricsRange] = useState('week');
    const [lbPage, setLbPage] = useState(1);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [performanceModal, setPerformanceModal] = useState({ isOpen: false, type: 'rank', title: '', subtitle: '' });

    // Sync activeTab with URL tab param
    useEffect(() => {
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [tab]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        navigate(`/courses/${courseId}/analytics/${newTab}`, { replace: true });
    };

    // Fetch Course Analytics Data
    const { data: analyticsData, isLoading } = useQuery({
        queryKey: ['courseAnalytics', courseId],
        queryFn: () => analyticsService.getCourseAnalytics(courseId),
        enabled: !!courseId
    });

    // Fetch Paged Leaderboard
    const { data: fullLbData, isLoading: fullLbLoading } = useQuery({
        queryKey: ['courseLeaderboardPaged', courseId, lbPage],
        queryFn: () => analyticsService.getCourseLeaderboardPaged(courseId, lbPage, 20),
        enabled: isLeaderboardOpen || activeTab === 'leaderboard' || activeTab === 'summary'
    });

    if (isLoading) {
        return (
            <div className="p-6 bg-[var(--color-bg-primary)] min-h-screen transition-colors">
                <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
                    <div className="flex items-center justify-between">
                        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
                        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 h-[400px] bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                        <div className="lg:col-span-4 h-[400px] bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!analyticsData?.success) return null;

    const { analytics } = analyticsData;

    return (
        <div className={`transition-colors font-sans pb-12 ${isLeaderboardOpen ? 'blur-sm' : ''}`}>
            {/* Header Section */}
            <header className="page-header-container animate-in fade-in slide-in-from-top-4 duration-700">
                <h1 className="page-header-title">{analytics.courseTitle || 'Course Analytics'}</h1>
                <p className="page-header-desc">
                    Comprehensive insights and real-time progress for your enrolled course.
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
                            onClick={() => handleTabChange(tab.id)}
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
                                title: 'Course Rank',
                                subtitle: 'Track your ranking within this course over time'
                            })}
                            className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Trophy size={14} className="text-primary-500" />
                                    <h4 className="text-[17px] text-gray-400">Course Rank</h4>
                                </div>
                                <div className="p-1 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <AreaChartIcon size={14} className="text-primary-500" />
                                </div>
                                <ChevronRight size={14} className="text-gray-400 opacity-50" />
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {analytics.stats.rank || 'Unranked'}
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
                                title: 'Course Score',
                                subtitle: 'Track your points progression in this course'
                            })}
                            className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-primary-500/20 rounded flex items-center justify-center">
                                        <div className="w-2 h-2 bg-primary-500 rounded-sm" />
                                    </div>
                                    <h4 className="text-[17px] text-gray-400">Course Score</h4>
                                </div>
                                <div className="p-1 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <AreaChartIcon size={14} className="text-primary-500" />
                                </div>
                                <ChevronRight size={14} className="text-gray-400 opacity-50" />
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {analytics.stats.score?.toLocaleString() || '0'}
                                </p>
                                <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                                    Course points
                                </p>
                            </div>
                        </div>

                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <RiFireFill size={16} className="text-primary-500" />
                                    <h4 className="text-[17px] text-gray-400">Course Streak</h4>
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {analytics.progress.streakDays || 0}
                                </p>
                                <p className="text-[11px] text-emerald-500">days</p>
                            </div>
                        </div>

                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <PieChart size={14} className="text-amber-500" />
                                    <h4 className="text-[17px] text-gray-400">Completion</h4>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="px-2 py-0.5 bg-primary-500/10 text-primary-500 rounded text-[10px] uppercase tracking-wider font-bold">{analytics.progress.solved}/{analytics.progress.total}</span>
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {analytics.progress.percentage}%
                                </p>
                                <div className="mb-1 w-16 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
                                    <div
                                        className="h-full bg-amber-500 transition-all duration-1000"
                                        style={{ width: `${analytics.progress.percentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

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
                                            <Trophy size={12} /> Rank: {analytics.stats.rank || 'Unranked'}
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 rounded-lg text-[10px] text-purple-500 border border-purple-500/20">
                                            <div className="w-3 h-3 bg-purple-500/20 rounded flex items-center justify-center"><div className="w-1.5 h-1.5 bg-purple-500 rounded-sm" /></div> Score: {analytics.stats.score || '0'}
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
                            <RankScoreChart key={activeTab} data={analytics.rangeData?.[rankRange]?.dailyHistory || []} />
                        </div>

                        <div className="lg:col-span-3 flex flex-col h-full">
                            <StreakCalendar
                                activeDates={analytics.progress.activeDateStrings || []}
                                minHeight="440px"
                            />
                        </div>
                    </div>

                    {/* Recent Quiz & Leaderboard Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Recent Quiz Solved</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">An exciting exercise is waiting for you</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {analytics.recentActivity?.filter(a => a.type === 'quiz').length > 0 ? (
                                    analytics.recentActivity.filter(a => a.type === 'quiz').slice(0, 5).map((quiz, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-[var(--color-bg-primary)] rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                                    <CheckCircle size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{quiz.title}</p>
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
                                    <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Monthly Leaderboard</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Top performers in this course</p>
                                </div>
                                <button
                                    onClick={() => handleTabChange('leaderboard')}
                                    className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
                                >
                                    See All
                                </button>
                            </div>

                            <div className="space-y-4">
                                {fullLbLoading ? (
                                    <div className="space-y-4">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : (fullLbData?.leaderboard || []).length > 0 ? (
                                    (fullLbData?.leaderboard || []).slice(0, 10).map((entry, idx) => (
                                        <div key={idx} className={`flex items-center justify-between py-2 transition-all ${entry.studentId === user.id ? 'bg-[#7d63f2]/10 -mx-4 px-4 rounded-lg' : ''}`}>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-black text-gray-400 dark:text-gray-500 w-4">{entry.rank}</span>
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
                                                    {entry.profileImage ? (
                                                        <img src={entry.profileImage} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400 dark:text-gray-500">{entry.name.charAt(0)}</div>
                                                    )}
                                                </div>
                                                <span className={`text-sm font-medium ${entry.studentId === user.id ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {entry.name} {entry.studentId === user.id && '(You)'}
                                                </span>
                                            </div>
                                            <span className={`text-sm font-black ${entry.studentId === user.id ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {(entry.score || 0).toLocaleString()}
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
                        <div className="mb-6">
                            <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Recent Activities</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Your latest progress updates</p>
                        </div>

                        {analytics.recentActivity?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {analytics.recentActivity.slice(0, 15).map((sub, idx) => (
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
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                <Zap size={40} className="text-gray-600 mb-4" />
                                <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">No recent activities</div>
                                <p className="text-sm text-gray-500">Start learning to see your activity history here</p>
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
                                title: 'Course Rank',
                                subtitle: 'Track your ranking within this course over time'
                            })}
                            className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Trophy size={14} className="text-primary-500" />
                                    <h4 className="text-[17px] text-gray-400 font-medium">Course Rank</h4>
                                </div>
                                <AreaChartIcon size={14} className="text-primary-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {analytics.stats.rank || 'Unranked'}
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
                                title: 'Course Score',
                                subtitle: 'Track your points progression in this course'
                            })}
                            className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 min-h-[130px] relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-primary-500/20 rounded flex items-center justify-center">
                                        <div className="w-2 h-2 bg-primary-500 rounded-sm" />
                                    </div>
                                    <h4 className="text-[17px] text-gray-400 font-medium">Course Score</h4>
                                </div>
                                <AreaChartIcon size={14} className="text-primary-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-end justify-between">
                                <p className="text-3xl text-gray-900 dark:text-white leading-none tracking-tight font-bold">
                                    {analytics.stats.score?.toLocaleString() || '0'}
                                </p>
                                <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                                    Course points
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col h-[440px]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-3xl text-gray-900 dark:text-white tracking-tight font-bold">Rank & Score progress</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Detailed performance history and analytics</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 rounded-lg text-[10px] text-blue-500 border border-blue-500/20">
                                        <Trophy size={12} /> Rank: {analytics.stats.rank || 'Unranked'}
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 rounded-lg text-[10px] text-purple-500 border border-purple-500/20">
                                        <div className="w-3 h-3 bg-purple-500/20 rounded flex items-center justify-center"><div className="w-1.5 h-1.5 bg-purple-500 rounded-sm" /></div> Score: {analytics.stats.score || '0'}
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
                        <RankScoreChart key={activeTab} data={analytics.rangeData?.[rankRange]?.dailyHistory || []} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <MetricChart
                            title="Quizzes Passed"
                            data={analytics.rangeData?.[quizMetricsRange]?.metrics?.quizzes || []}
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
                            data={analytics.rangeData?.[videoMetricsRange]?.metrics?.videos || []}
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
                            data={analytics.rangeData?.[problemMetricsRange]?.metrics?.problems || []}
                            color="#8b5cf6"
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
                            data={analytics.rangeData?.[articleMetricsRange]?.metrics?.articles || []}
                            color="#f59e0b"
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

                        <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm min-h-[450px]">
                            <div className="mb-12">
                                <h3 className="text-2xl text-gray-900 dark:text-white tracking-tight">Problem Stats</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Breakdown of solved problems by difficulty level.</p>
                            </div>

                            <div className="flex flex-col items-center justify-center mb-12">
                                <span className="text-4xl font-black text-gray-900 dark:text-white">{analytics.progress.solved}</span>
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">Problem Solved</span>
                            </div>

                            <div className="space-y-6">
                                {['Easy', 'Medium', 'Hard'].map((diff) => {
                                    const stats = analytics.solvedByDifficulty?.[diff.toLowerCase()] || { solved: 0, total: 0 };
                                    const percentage = stats.total > 0 ? (stats.solved / stats.total) * 100 : 0;
                                    return (
                                        <div key={diff}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{diff}</span>
                                                <span className="text-xs font-black text-gray-500">{stats.solved}/{stats.total}</span>
                                            </div>
                                            <div className="h-2 bg-gray-200 dark:bg-gray-800/80 rounded-full overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${diff === 'Easy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                                                        diff === 'Medium' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
                                                            'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                                                        }`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'leaderboard' && (
                <LeaderboardTab
                    fullLbData={fullLbData}
                    fullLbLoading={fullLbLoading}
                    lbPage={lbPage}
                    setLbPage={setLbPage}
                    user={user}
                />
            )}


            {/* Leaderboard Modal (Still available as "See All" trigger from summary leaderboard) */}
            {isLeaderboardOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-300">
                    <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-md" onClick={() => setIsLeaderboardOpen(false)} />
                    <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-[#111117] border border-gray-200 dark:border-gray-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.2)] dark:shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                        {/* Modal Header */}
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Course Leaderboard</h2>
                            <button
                                onClick={() => setIsLeaderboardOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500"
                            >
                                <ChevronRight className="rotate-90" size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                            <div className="bg-gray-50 dark:bg-black/50 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Rank</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Name</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                        {(fullLbData?.leaderboard || []).map((entry) => (
                                            <tr key={entry.studentId} className={`group hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors ${entry.studentId === user.id ? 'bg-[#7d63f2]/10' : ''}`}>
                                                <td className="px-6 py-5 text-sm font-black text-gray-400 dark:text-gray-500">{entry.rank}</td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700">
                                                            {entry.profileImage ? (
                                                                <img src={entry.profileImage} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400 dark:text-gray-500">{entry.name.charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900 dark:text-white">{entry.name} {entry.studentId === user.id && <span className="text-[10px] text-[#7d63f2] ml-1">(You)</span>}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className="text-sm font-black text-gray-900 dark:text-white">{(entry.score || 0).toLocaleString()}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PerformanceHistoryModal
                isOpen={performanceModal.isOpen}
                onClose={() => setPerformanceModal({ ...performanceModal, isOpen: false })}
                type={performanceModal.type}
                title={performanceModal.title}
                subtitle={performanceModal.subtitle}
                data={analytics.rangeData}
            />
        </div>
    );
};

export default CourseAnalytics;
