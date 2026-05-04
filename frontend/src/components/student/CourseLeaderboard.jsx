import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import courseLeaderboardService from '../../services/courseLeaderboardService';
import toast from 'react-hot-toast';
import { Trophy, ArrowLeft, Download, RefreshCw, Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const CourseLeaderboard = () => {
    const { courseId } = useParams();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState([]);
    const [courseName, setCourseName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const data = await courseLeaderboardService.getLeaderboard(courseId);
            setLeaderboard(data.leaderboard || []);
            setCourseName(data.courseName || 'Course Leaderboard');
        } catch (error) {
            toast.error(error.message || 'Failed to fetch leaderboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (courseId) {
            fetchLeaderboard();
        }
    }, [courseId]);

    const filteredLeaderboard = useMemo(() => {
        if (!searchQuery.trim()) return leaderboard;
        const query = searchQuery.toLowerCase().trim();
        return leaderboard.filter(entry => 
            (entry.name && entry.name.toLowerCase().includes(query)) ||
            (entry.username && entry.username.toLowerCase().includes(query))
        );
    }, [leaderboard, searchQuery]);

    const myEntry = useMemo(() => {
        const actualUserId = user?._id || user?.id || user?.userId;
        return leaderboard.find(e => e.studentId && actualUserId && String(e.studentId) === String(actualUserId));
    }, [leaderboard, user]);

    const handleExportCSV = () => {
        if (!filteredLeaderboard.length) return;

        const headers = ['Rank', 'Name', 'Username', 'Overall Score'];
        const csvRows = filteredLeaderboard.map(entry => [
            entry.rank,
            entry.name,
            entry.username,
            entry.overallScore
        ]);

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${courseName}_leaderboard.csv`);
        link.click();
    };

    return (
        <div className="space-y-8">
            <div>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className="btn-secondary !p-2.5"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Trophy className="w-6 h-6 text-yellow-500" />
                                <h1 className="page-header-title">{courseName} Leaderboard</h1>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Track your progress and compete with your peers in this course.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchLeaderboard}
                            disabled={loading}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="text-sm font-medium">Refresh</span>
                        </button>
                        <button 
                            onClick={handleExportCSV}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            <span className="text-sm font-medium">Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6 relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#F1F3F4] dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
                    />
                </div>

                {/* Table */}
                <div className="bg-[#F1F3F4] dark:bg-[var(--color-bg-card)] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    {/* User's Current Standing - Pin at top */}
                    {!loading && myEntry && (
                        <div className="bg-primary-600 dark:bg-primary-600 px-6 py-4 flex items-center justify-between text-white border-b border-primary-700">
                           <div className="flex items-center gap-8">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-primary-100 uppercase font-bold tracking-widest opacity-80 mb-0.5">Your Rank</span>
                                    <span className="text-2xl font-bold leading-none">#{myEntry.rank}</span>
                                </div>
                                <div className="h-10 w-px bg-white/20"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-primary-100 uppercase font-bold tracking-widest opacity-80 mb-1">Your Name</span>
                                    <span className="text-base font-semibold leading-none truncate max-w-[150px]">{myEntry.name}</span>
                                </div>
                           </div>

                           <div className="flex items-center gap-8 mt-4 sm:mt-0">
                                {/* Ratings Summary */}
                                <div className="flex gap-4">
                                    {(myEntry.externalScores?.leetcode > 0 || myEntry.leetcodeRating > 0) && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-primary-100 uppercase font-bold opacity-70">LC</span>
                                            <span className="text-sm font-black">{myEntry.externalScores?.leetcode || myEntry.leetcodeRating}</span>
                                        </div>
                                    )}
                                    {(myEntry.externalScores?.codeforces > 0 || myEntry.codeforcesRating > 0) && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-primary-100 uppercase font-bold opacity-70">CF</span>
                                            <span className="text-sm font-black">{myEntry.externalScores?.codeforces || myEntry.codeforcesRating}</span>
                                        </div>
                                    )}
                                    {myEntry.externalScores?.codechef > 0 && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-primary-100 uppercase font-bold opacity-70">CC</span>
                                            <span className="text-sm font-black">{myEntry.externalScores.codechef}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-primary-100 uppercase font-bold tracking-widest opacity-80 mb-0.5">Course Score</span>
                                    <span className="text-2xl font-bold leading-none">{myEntry.overallScore.toLocaleString()}</span>
                                </div>
                           </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-black/20">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Rank</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ratings</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Overall Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 w-8 bg-gray-200 dark:bg-gray-800 rounded"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div></td>
                                            <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredLeaderboard.length > 0 ? (
                                    filteredLeaderboard.map((entry) => (
                                        <tr 
                                            key={entry.studentId} 
                                            className={`hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors ${entry.studentId === (user?.id || user?.userId) ? 'bg-primary-500/5 dark:bg-primary-500/10' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    {entry.rank === 1 ? (
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 font-semibold text-sm shadow-sm ring-2 ring-yellow-500/20">1</div>
                                                    ) : entry.rank === 2 ? (
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-sm shadow-sm ring-2 ring-slate-400/20">2</div>
                                                    ) : entry.rank === 3 ? (
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 font-semibold text-sm shadow-sm ring-2 ring-orange-500/10">3</div>
                                                    ) : (
                                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-2">{entry.rank}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.name}</div>
                                                {entry.studentId === (user?.id || user?.userId) && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mt-1 uppercase tracking-wider">You</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {entry.username ? (
                                                    <a 
                                                        href={`/profile/${entry.username}`} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="text-purple-600 dark:text-purple-400 font-medium hover:text-purple-800 dark:hover:text-purple-300 hover:underline transition-colors flex items-center gap-1 font-mono text-xs"
                                                    >
                                                        {entry.username}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 text-xs font-mono">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-3">
                                                    {(entry.externalScores?.leetcode > 0 || entry.leetcodeRating > 0) && (
                                                        <span className="inline-flex items-center text-[10px] bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/30 px-1.5 py-0.5 rounded font-bold" title="LeetCode Rating">
                                                            LC: {entry.externalScores?.leetcode || entry.leetcodeRating}
                                                        </span>
                                                    )}
                                                    {(entry.externalScores?.codeforces > 0 || entry.codeforcesRating > 0) && (
                                                        <span className="inline-flex items-center text-[10px] bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 px-1.5 py-0.5 rounded font-bold" title="Codeforces Rating">
                                                            CF: {entry.externalScores?.codeforces || entry.codeforcesRating}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{entry.overallScore.toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            No data found for this course.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseLeaderboard;








