import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

// Reuse the exact same dashboard components
import EducationCard from '../student/dashboard/EducationCard';
import PlatformRatingCard from '../student/dashboard/PlatformRatingCard';
import GlobalRankGraph from '../student/dashboard/GlobalRankGraph';
import ScoreDistributionChart from '../student/dashboard/ScoreDistributionChart';
import HeatmapChart from '../shared/HeatmapChart';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PLATFORM_COLORS = {
    codechef: '#795548',
    codeforces: '#F44336',
    leetcode: '#FFA116',
    hackerrank: '#2EC866',
    interviewbit: '#008EFF',
    spoj: '#3F51B5'
};

// ─── Private Details Panel (Admins & Instructors only) ────────────────────────
const PrivateDetailsPanel = ({ userData }) => (
    <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 p-6 text-left">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Private Details
            </h3>
            <span
                className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full font-bold uppercase tracking-wider"
                title="Visible only to Admins and Instructors"
            >
                RESTRICTED
            </span>
        </div>
        <div className="space-y-2.5 text-sm">
            {[
                { label: 'Role', value: userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : null },
                { label: 'Email', value: userData.email },
                { label: 'Phone', value: userData.phone },
                { label: 'WhatsApp', value: userData.whatsapp },
                { label: 'Gender', value: userData.gender },
                { label: 'T-Shirt Size', value: userData.tshirtSize },
                { label: 'Date of Birth', value: userData.dob ? new Date(userData.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null },
                { label: 'Joined On', value: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : null },
                { label: 'Last Login', value: userData.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : 'Never' },
            ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">{label}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium text-right">{value || <span className="text-gray-300 dark:text-gray-600 italic text-xs">Not set</span>}</span>
                </div>
            ))}
            {userData.address && Object.values(userData.address).some(v => v) && (
                <div className="flex justify-between items-start py-1">
                    <span className="text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap mr-4">Address</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium text-right text-xs leading-relaxed">
                        {[userData.address.building, userData.address.street, userData.address.city, userData.address.state, userData.address.postalCode]
                            .filter(Boolean).join(', ')}
                    </span>
                </div>
            )}
        </div>
    </div>
);

// ─── Recent Submissions Table ──────────────────────────────────────────────────
const RecentSubmissions = ({ submissions }) => (
    <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Recent Submissions</h3>
        </div>
        <div className="overflow-x-auto">
            {(!submissions || submissions.length === 0) ? (
                <div className="text-center py-12">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">📝</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No submissions yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">This user hasn't solved any problems yet</p>
                </div>
            ) : (
                <table className="w-full text-left table-fixed">
                    <thead className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-4 w-5/12">Title</th>
                            <th className="px-6 py-4 w-2/12 text-center">Status</th>
                            <th className="px-6 py-4 w-2/12 text-center">Language</th>
                            <th className="px-6 py-4 w-3/12 text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {submissions.slice(0, 5).map((submission, idx) => {
                            const isAccepted = submission.verdict === 'Accepted';
                            const problemType = (submission.problemType || 'problem').toLowerCase();
                            const language = (submission.language || '').toLowerCase();
                            const isCodingProblem = problemType === 'problem' && !['text', 'json'].includes(language);
                            const isQuiz = problemType === 'quiz' || language === 'json';

                            return (
                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 text-sm">{submission.problemTitle}</div>
                                        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                                            {isCodingProblem ? (
                                                submission.totalTestCases > 0
                                                    ? `${submission.testCasesPassed}/${submission.totalTestCases} Test Cases`
                                                    : 'Custom Test'
                                            ) : isQuiz ? (
                                                `Score: ${submission.testCasesPassed}/${submission.totalTestCases}`
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {isCodingProblem ? (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${isAccepted ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isAccepted ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                {submission.verdict}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                Completed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {isCodingProblem ? (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-tight border border-gray-200/50 dark:border-gray-700">
                                                {submission.language}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 dark:text-gray-700">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                                        {new Date(submission.submittedAt).toLocaleString('en-US', {
                                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                                        })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const PublicProfile = () => {
    const { username } = useParams();
    const [dashboardData, setDashboardData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { isDark } = useTheme();

    useEffect(() => {
        const fetchPublicProfile = async () => {
            setLoading(true);
            try {
                const token = Cookies.get('accessToken');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const response = await axios.get(`${API_BASE_URL}/public/profile/${username}`, { headers });
                setDashboardData(response.data.dashboard);
                setUserData(response.data.user);
            } catch (err) {
                const msg = err.response?.data?.message || 'Failed to load profile';
                setError(msg);
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        };

        if (username) fetchPublicProfile();
    }, [username]);

    // ── Loading State ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="p-6 bg-[var(--color-bg-primary)] min-h-screen">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[var(--color-bg-card)] rounded-2xl h-64 border border-gray-100 dark:border-gray-800 p-6 flex flex-col items-center justify-center gap-4 shadow-sm">
                            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                            <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-800 rounded"></div>
                            <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[var(--color-bg-card)] rounded-2xl h-96 border border-gray-100 dark:border-gray-800 p-6 shadow-sm"></div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error / Private State ──────────────────────────────────────────────────
    if (error || !userData) {
        const isPrivate = error === 'Private profile cannot be viewed';
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-[var(--color-bg-primary)] p-4">
                <div className="text-center bg-[var(--color-bg-card)] p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 max-w-md w-full">
                    <div className={`w-20 h-20 ${isPrivate ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-red-50 dark:bg-red-900/20 text-red-500'} rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3`}>
                        {isPrivate ? (
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        ) : (
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
                        {isPrivate ? '🔒 Private' : 'Not Found'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 text-base leading-relaxed">
                        {error || "The user you're looking for doesn't exist or hasn't made their profile public."}
                    </p>
                    <Link to="/" className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 inline-block">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    const {
        progress,
        externalContestStats,
        leaderboardStats,
        userSubmissionsHeatMapData,
        recentSubmissions
    } = dashboardData || {};

    const profilePic = userData.profilePicture
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.firstName)}+${encodeURIComponent(userData.lastName)}&background=random`;

    return (
        <div className="p-6 md:p-8 bg-[var(--color-bg-primary)] min-h-screen">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Profile Card */}
                    <div className="bg-[var(--color-bg-card)] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <img
                                src={profilePic}
                                alt={`${userData.firstName} ${userData.lastName}`}
                                className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-xl"
                            />
                            {/* Blue dot = public profile indicator */}
                            <div
                                className="absolute bottom-1 right-1 bg-blue-500 w-5 h-5 rounded-full border-4 border-white dark:border-gray-800 shadow-md"
                                title="Public Profile"
                            />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{userData.firstName} {userData.lastName}</h2>
                        <span className="text-primary-600 dark:text-primary-400 text-sm font-bold bg-primary-50 dark:bg-primary-900/20 px-4 py-1.5 rounded-full mb-6">
                            @{userData.username}
                        </span>

                        {userData.aboutMe && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 border-t border-gray-100 dark:border-gray-800 pt-6 w-full">
                                {userData.aboutMe}
                            </p>
                        )}

                        <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-6">
                            <div className="grid grid-cols-2 gap-6 text-sm">
                                <div className="text-left">
                                    <span className="text-gray-400 dark:text-gray-500 block text-[10px] uppercase font-bold tracking-widest mb-1">Roll Number</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">{userData.education?.rollNumber || 'N/A'}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-gray-400 dark:text-gray-500 block text-[10px] uppercase font-bold tracking-widest mb-1">Branch</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-100">{userData.education?.branch || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Restricted: Admin / Instructor Only Panel */}
                    {userData.canViewPrivateDetails && (
                        <PrivateDetailsPanel userData={userData} />
                    )}

                    {dashboardData && (
                        <>
                            {/* Score Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[var(--color-bg-card)] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center hover:border-primary-500/30 transition-all group">
                                    <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <span className="text-2xl">🏆</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">Overall Score</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">{leaderboardStats?.score || 0}</p>
                                </div>
                                <div className="bg-[var(--color-bg-card)] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center hover:border-primary-500/30 transition-all group">
                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <span className="text-2xl">🌍</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest mb-1">Global Rank</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">#{leaderboardStats?.globalRank || '-'}</p>
                                </div>
                            </div>

                            {/* Education Card */}
                            {userData.education && (
                                <EducationCard education={userData.education} />
                            )}

                            {/* Platform Rating Cards (Codechef, Codeforces, LeetCode, SPOJ) */}
                            {externalContestStats && Object.entries(externalContestStats)
                                .filter(([platform]) => !['hackerrank', 'interviewbit'].includes(platform.toLowerCase()))
                                .map(([platform, stats]) => (
                                    <PlatformRatingCard
                                        key={platform}
                                        platform={platform}
                                        stats={stats}
                                        color={PLATFORM_COLORS[platform] || '#607D8B'}
                                    />
                                ))}
                        </>
                    )}
                </div>

                {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-8">
                    {!dashboardData ? (
                        <div className="bg-[var(--color-bg-card)] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-16 text-center h-full flex flex-col items-center justify-center">
                            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl text-gray-300 dark:text-gray-700">📊</span>
                            </div>
                            <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-3">Dashboard Not Available</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-base leading-relaxed">
                                {userData.role !== 'student'
                                    ? 'Dashboard statistics are only available for student profiles.'
                                    : 'You do not have permission to view the private dashboard statistics for this user.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Global Rank Graph (same as dashboard) */}
                            <GlobalRankGraph externalContestStats={externalContestStats} leaderboardStats={leaderboardStats} />

                            {/* Score Distribution Chart (same as dashboard) */}
                            <ScoreDistributionChart leaderboardDetails={leaderboardStats?.details} />

                            {/* Activity Heatmap */}
                            <div className="bg-[var(--color-bg-card)] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
                                <HeatmapChart
                                    data={userSubmissionsHeatMapData}
                                    streakDays={progress?.streakDays || 0}
                                    maxStreakDays={progress?.maxStreakDays || 0}
                                />
                            </div>

                            {/* Recent Submissions */}
                            <RecentSubmissions submissions={recentSubmissions} />
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default PublicProfile;






