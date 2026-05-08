import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import courseLeaderboardService from '../../services/courseLeaderboardService';
import toast from 'react-hot-toast';
import { 
    Trophy, Download, RefreshCw, Search, Flame
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const getRankStyle = (rank) => {
    if (rank === 1) return 'text-yellow-500 font-extrabold text-base';
    if (rank === 2) return 'text-slate-400 font-extrabold text-base';
    if (rank === 3) return 'text-orange-400 font-extrabold text-base';
    return 'text-gray-500 dark:text-gray-400 font-bold text-sm';
};

const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
};

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
        if (courseId) fetchLeaderboard();
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
            entry.rank, entry.name, entry.username, entry.overallScore
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
        <div className="transition-colors font-sans">
            {/* Page Header */}
            <header className="page-header-container animate-in fade-in slide-in-from-top-4 duration-700">
                <div>
                    <h1 className="page-header-title">{courseName} Leaderboard</h1>
                    <p className="page-header-desc">Track your progress and compete with peers in this course.</p>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    {/* Search */}
                    <div className="relative group w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#111117] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        />
                    </div>
                    {/* Refresh */}
                    <button
                        onClick={fetchLeaderboard}
                        disabled={loading}
                        title="Refresh"
                        className="btn-secondary !p-2 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {/* Download */}
                    <button
                        onClick={handleExportCSV}
                        title="Download CSV"
                        className="btn-secondary !p-2"
                    >
                        <Download size={16} />
                    </button>
                </div>
            </header>

            {/* My Rank Banner */}
            {myEntry && !loading && (
                <div className="mx-auto max-w-7xl px-6 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className={`flex items-center justify-between px-5 py-3 rounded-2xl border ${isDark ? 'bg-primary-900/20 border-primary-700/30' : 'bg-primary-50 border-primary-200'}`}>
                        <div className="flex items-center gap-3">
                            <Trophy size={16} className="text-primary-500" />
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
                </div>
            )}

            {/* Table */}
            <div className="max-w-7xl mx-auto px-6 pb-10">
                <div className="card !p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className={`border-b ${isDark ? 'border-gray-800 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/70'}`}>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest w-16">Rank</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Current Streak</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Max Streak</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Score</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                {loading ? (
                                    [...Array(10)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 w-8 bg-gray-200 dark:bg-gray-800 rounded" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800" />
                                                    <div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center"><div className="h-4 w-10 bg-gray-200 dark:bg-gray-800 rounded mx-auto" /></td>
                                            <td className="px-6 py-4 text-center"><div className="h-4 w-10 bg-gray-200 dark:bg-gray-800 rounded mx-auto" /></td>
                                            <td className="px-6 py-4 text-right"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : filteredLeaderboard.length > 0 ? (
                                    filteredLeaderboard.map((entry) => {
                                        const isMe = entry.studentId && user && String(entry.studentId) === String(user._id || user.id || user.userId);
                                        return (
                                            <tr
                                                key={entry.studentId}
                                                className={`group transition-all ${
                                                    isMe
                                                        ? isDark
                                                            ? 'bg-primary-900/10 border-l-2 border-l-primary-500'
                                                            : 'bg-primary-50/60 border-l-2 border-l-primary-500'
                                                        : isDark
                                                            ? 'hover:bg-white/[0.02]'
                                                            : 'hover:bg-gray-50/60'
                                                }`}
                                            >
                                                {/* Rank */}
                                                <td className="px-6 py-4">
                                                    <span className={getRankStyle(entry.rank)}>
                                                        {getRankBadge(entry.rank)}
                                                    </span>
                                                </td>

                                                {/* Student */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                                                            {entry.profileImage ? (
                                                                <img src={entry.profileImage} alt={entry.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-sm font-extrabold text-gray-500 dark:text-gray-400">
                                                                    {(entry.name || '?').charAt(0).toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-bold transition-colors ${isMe ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
                                                                {entry.name}
                                                                {isMe && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-primary-500 bg-primary-100 dark:bg-primary-900/30 px-1.5 py-0.5 rounded-full">You</span>}
                                                            </p>
                                                            {entry.username && (
                                                                <p className="text-[11px] text-gray-400 font-medium">@{entry.username}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Current Streak */}
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400">
                                                        <Flame size={13} className="text-orange-400" />
                                                        <span className="text-sm font-bold">{entry.currentStreak ?? 0}</span>
                                                    </div>
                                                </td>

                                                {/* Max Streak */}
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                                        {entry.maxStreak ?? 0}
                                                    </span>
                                                </td>

                                                {/* Score */}
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
                                        <td colSpan="5" className="px-8 py-20 text-center">
                                            <Trophy size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">No leaderboard data yet</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer count */}
                    {!loading && filteredLeaderboard.length > 0 && (
                        <div className={`px-6 py-3 border-t ${isDark ? 'border-gray-800 bg-white/[0.01]' : 'border-gray-100 bg-gray-50/50'} flex items-center justify-between`}>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                {filteredLeaderboard.length} student{filteredLeaderboard.length !== 1 ? 's' : ''}
                                {searchQuery && ` matching "${searchQuery}"`}
                            </p>
                            <p className="text-[11px] text-gray-400">
                                Showing {filteredLeaderboard.length} of {leaderboard.length} total
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseLeaderboard;
