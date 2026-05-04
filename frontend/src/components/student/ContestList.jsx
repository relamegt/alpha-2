import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import contestService from '../../services/contestService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Trophy, Calendar, Clock, ArrowRight, CheckCircle, BookOpen, BarChart2, Search, Zap } from 'lucide-react';

const ContestList = () => {
    const { user } = useAuth();
    const [contests, setContests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.batchId) {
            fetchContests();
        }
    }, [user]);

    const fetchContests = async () => {
        try {
            setLoading(true);
            const data = await contestService.getContestsByBatch(user.batchId, null);
            // Filter out Solo contests - they only show up in courses
            const filtered = (data.contests || []).filter(c => !c.isSolo);
            setContests(filtered);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch contests');
        } finally {
            setLoading(false);
        }
    };

    const getContestStatus = (contest) => {
        const now = new Date();
        const start = new Date(contest.startTime);
        const end = new Date(contest.endTime);

        if (now < start) return 'upcoming';
        if (now >= start && now <= end) return 'active';
        return 'past';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-bg-primary)] pb-20 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
                    {/* Header Skeleton */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                                <div className="w-64 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
                            </div>
                            <div className="w-96 h-5 bg-gray-200 dark:bg-gray-800 rounded mt-4 ml-1"></div>
                        </div>
                    </div>

                    {/* Contests Section Skeleton */}
                    <section className="animate-pulse">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-gray-300 rounded-full"></div>
                            <div className="w-48 h-6 bg-gray-200 rounded"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col h-64 shadow-sm">
                                    <div className="w-3/4 h-6 bg-gray-200 rounded mb-4"></div>
                                    <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                                    <div className="w-5/6 h-4 bg-gray-200 rounded mb-6"></div>
                                    <div className="mt-auto space-y-3 bg-gray-50 rounded-xl p-4">
                                        <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                                        <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    const filteredContests = contests.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const status = getContestStatus(c);
        if (statusFilter === 'all') return matchesSearch;
        return matchesSearch && status === statusFilter;
    });

    const activeContests = filteredContests.filter(c => getContestStatus(c) === 'active');
    const pastContests = filteredContests.filter(c => getContestStatus(c) === 'past');
    const upcomingContests = filteredContests.filter(c => getContestStatus(c) === 'upcoming');

    return (
        <div className="transition-colors">
            <div>

                {/* Header Section */}
                <header className="page-header-container animate-in fade-in slide-in-from-top-4 duration-700">
                    <h1 className="page-header-title">Internal Contests</h1>
                    <p className="page-header-desc">
                        Compete with your batchmates, test your knowledge, and climb the leaderboard. Master your skills through competition.
                    </p>
                </header>

                {/* Tabs & Search */}
                <div className="page-tabs-container">
                    <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full w-max shadow-sm">
                        {[
                            { id: 'all', label: 'All Contests' },
                            { id: 'active', label: 'Live Now' },
                            { id: 'upcoming', label: 'Upcoming' },
                            { id: 'past', label: 'Past' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusFilter(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${statusFilter === tab.id
                                        ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]'
                                        : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors z-10" size={16} />
                        <input
                            type="text"
                            placeholder="Search contests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all bg-[var(--color-bg-input)] border border-transparent dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:bg-white dark:focus:bg-[var(--color-bg-card)] focus:ring-2 focus:ring-primary-500/20 shadow-sm placeholder:text-gray-500"
                        />
                    </div>
                </div>

                {/* Active Contests Section */}
                {activeContests.length > 0 && (
                    <section className="animate-fade-in-up">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Live Now</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {activeContests.map(contest => (
                                <ContestCard key={contest._id} contest={contest} status="active" />
                            ))}
                        </div>
                    </section>
                )}

                {/* Past Contests Section */}
                <section>
                    {/* <div className="flex items-center gap-3 mb-6">
                        <div className="w-1.5 h-6 bg-gray-400 rounded-full"></div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Past Contests</h2>
                    </div> */}
                    {pastContests.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {pastContests.map(contest => (
                                <ContestCard key={contest._id} contest={contest} status="past" />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                            <Trophy size={48} className="mx-auto text-gray-200 dark:text-gray-800 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No contests available.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

const ContestCard = ({ contest, status }) => {
    const isLive = status === 'active';
    const isPast = status === 'past';
    const isSubmitted = contest.isSubmitted;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatShortDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className={`group relative bg-[var(--color-bg-card)] rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col h-full hover:-translate-y-1 hover:scale-[1.01] ${isLive
            ? 'border-green-200 dark:border-green-900/30 shadow-xl shadow-green-50 dark:shadow-none ring-1 ring-green-100 dark:ring-green-900/20'
            : 'border-[var(--color-border-interactive)] shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-none hover:border-indigo-100 dark:hover:border-gray-700'
            }`}>
            {/* Status Strip */}
            {isLive && (
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 animate-gradient-x"></div>
            )}
            {isPast && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
            )}

            <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4 gap-4">
                    {/* Title */}
                    {isPast ? (
                        <Link
                            to={`/contests/${contest.slug || contest._id}/leaderboard`}
                            className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight hover:text-indigo-600 transition-colors flex-1"
                        >
                            {contest.title}
                        </Link>
                    ) : (
                        <Link
                            to={isLive ? (!isSubmitted ? `/contests/${contest.slug || contest._id}` : `/contests/${contest.slug || contest._id}/leaderboard`) : `/contests/${contest.slug || contest._id}/practice`}
                            className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight hover:text-indigo-600 transition-colors"
                        >
                            {contest.title}
                        </Link>
                    )}
                    {isSubmitted && (
                        <span className="flex-shrink-0 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <CheckCircle size={12} className="mr-1" /> Submitted
                        </span>
                    )}
                </div>

                {contest.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 flex-1">
                        {contest.description}
                    </p>
                )}

                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 bg-[var(--color-bg-surface)] p-4 rounded-xl border border-gray-50 dark:border-gray-800/50 mt-auto">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                            <Calendar size={12} /> Start
                        </div>
                        <div className="font-medium text-gray-800 dark:text-gray-200 ml-5">
                            {formatDate(contest.startTime)}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                            <Clock size={12} /> End
                        </div>
                        <div className="font-medium text-gray-800 dark:text-gray-200 ml-5">
                            {formatDate(contest.endTime)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom action area */}
            <div className="border-t border-[var(--color-border-interactive)]">
                {isLive ? (
                    <div className="p-4">
                        {!isSubmitted ? (
                            <Link
                                to={`/contests/${contest.slug || contest._id}`}
                                className="btn-primary flex w-full items-center justify-center py-3 gap-2 text-sm transform hover:-translate-y-0.5"
                            >
                                Enter Contest <ArrowRight size={16} />
                            </Link>
                        ) : (
                            <Link
                                to={`/contests/${contest.slug || contest._id}/leaderboard`}
                                target="_blank"
                                className="btn-secondary flex w-full items-center justify-center py-2.5 text-sm gap-2"
                            >
                                View Live Leaderboard
                            </Link>
                        )}
                    </div>
                ) : (
                    /* Past contest: side by side colored links */
                    <div className="flex divide-x divide-gray-100 bg-gray-50/30">
                        <Link
                            to={`/contests/${contest.slug || contest._id}/practice`}
                            className="flex-1 flex items-center justify-center gap-2 p-4 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors group"
                        >
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-200 transition-colors">
                                <BookOpen size={18} />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">Practice</span>
                        </Link>
                        <Link
                            to={`/contests/${contest.slug || contest._id}/leaderboard`}
                            className="flex-1 flex items-center justify-center gap-2 p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors group"
                        >
                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-200 transition-colors">
                                <BarChart2 size={18} />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">Leaderboard</span>
                        </Link>
                    </div>
                )}
            </div>
        </div >
    );
};

export default ContestList;









