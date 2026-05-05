import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { TrendingUp, Trophy, Plus, Users, BookOpen, ArrowRight, Code, Activity, Layers, GraduationCap, Database, Youtube, FileText } from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const data = await adminService.getSystemAnalytics();
                setAnalytics(data.analytics);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="spinner w-8 h-8 text-primary-600 dark:text-primary-400"></div>
            </div>
        );
    }

    // Chart Data Preparation
    const problemData = analytics?.problems?.byDifficulty ? [
        { name: 'Easy', value: analytics.problems.byDifficulty.Easy || 0, color: '#10B981' },
        { name: 'Medium', value: analytics.problems.byDifficulty.Medium || 0, color: '#F59E0B' },
        { name: 'Hard', value: analytics.problems.byDifficulty.Hard || 0, color: '#EF4444' },
    ] : [];

    // Filter out zero values for better pie chart
    const activeProblemData = problemData.filter(d => d.value > 0);

    const userStats = [
        { name: 'Students', value: analytics?.users?.students || 0, fill: '#3B82F6' },
        { name: 'Instructors', value: analytics?.users?.instructors || 0, fill: '#6257E3' },
    ];

    return (
        <div className="admin-page-wrapper">
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">Admin Dashboard</h1>
                        <p className="page-header-desc">
                            Welcome back, {user?.firstName}! Here's what's happening with your platform today.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/admin/reports')}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Activity size={18} />
                            <span>View Reports</span>
                        </button>
                        <button
                            onClick={() => navigate('/admin/batches')}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Users size={18} />
                            <span>Manage Batches</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Users */}
                <div className="p-6 bg-[var(--color-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                        <Users className="w-24 h-24 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Users />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{analytics?.users?.total || 0}</h3>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 w-fit px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800/30">
                        <TrendingUp size={12} className="w-3 h-3" />
                        <span>{analytics?.users?.students || 0} Students</span>
                    </div>
                </div>

                {/* Active Batches */}
                <div className="p-6 bg-[var(--color-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                        <Layers className="w-24 h-24 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                            <GraduationCap />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Batches</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{analytics?.batches?.active || 0}</h3>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 w-fit px-2.5 py-1 rounded-full border border-green-100 dark:border-green-800/30">
                        <span>Total: {analytics?.batches?.total || 0}</span>
                    </div>
                </div>

                {/* Coding Problems */}
                <div className="p-6 bg-[var(--color-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                        <Code className="w-24 h-24 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Code />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Coding Problems</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{analytics?.problems?.coding || 0}</h3>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 w-fit px-2.5 py-1 rounded-full border border-purple-100 dark:border-purple-800/30">
                        <span>Total Practice bank</span>
                    </div>
                </div>

                {/* SQL Problems */}
                <div className="p-6 bg-[var(--color-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                        <Database className="w-24 h-24 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Database />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SQL Problems</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{analytics?.problems?.sql || 0}</h3>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 w-fit px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800/30">
                        <span>Query bank</span>
                    </div>
                </div>
            </div>

            {/* Content Stats Secondary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-[var(--color-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm flex items-center justify-between group hover:border-red-500/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 group-hover:scale-110 transition-transform"><Youtube size={22} /></div>
                        <span className="font-bold text-gray-700 dark:text-gray-200 tracking-tight">Videos</span>
                    </div>
                    <span className="text-2xl font-black text-gray-900 dark:text-white">{analytics?.problems?.videos || 0}</span>
                </div>
                <div className="p-5 bg-[var(--color-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm flex items-center justify-between group hover:border-orange-500/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 group-hover:scale-110 transition-transform"><Layers size={22} /></div>
                        <span className="font-bold text-gray-700 dark:text-gray-200 tracking-tight">Quizzes</span>
                    </div>
                    <span className="text-2xl font-black text-gray-900 dark:text-white">{analytics?.problems?.quizzes || 0}</span>
                </div>
                <div className="p-5 bg-[var(--color-bg-card)] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm flex items-center justify-between group hover:border-teal-500/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400 group-hover:scale-110 transition-transform"><FileText size={22} /></div>
                        <span className="font-bold text-gray-700 dark:text-gray-200 tracking-tight">Articles</span>
                    </div>
                    <span className="text-2xl font-black text-gray-900 dark:text-white">{analytics?.problems?.articles || 0}</span>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Problem Distribution */}
                <div className="bg-[var(--color-bg-card)] p-6 rounded-2xl relative border border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">Problem Distribution</h3>
                    <div className="h-64 flex justify-center items-center">
                        {activeProblemData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={activeProblemData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {activeProblemData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            backgroundColor: isDark ? '#000000' : '#FFFFFF',
                                            color: isDark ? '#F9FAFB' : '#111111'
                                        }}
                                        itemStyle={{ color: isDark ? '#D1D5DB' : '#23232e' }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        wrapperStyle={{ paddingTop: '20px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-gray-400">No problem data available</p>
                        )}
                    </div>
                </div>

                {/* User Distribution */}
                <div className="bg-[var(--color-bg-card)] p-6 rounded-2xl relative border border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">User Demographics</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={userStats}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                barSize={40}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#23232e' : '#E5E7EB'} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9CA3AF' : '#6B7280' }} />
                                <Tooltip
                                    cursor={{ fill: isDark ? '#1c1c26' : '#F3F4F6' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        backgroundColor: isDark ? '#000000' : '#FFFFFF',
                                        color: isDark ? '#F9FAFB' : '#111111'
                                    }}
                                    itemStyle={{ color: isDark ? '#D1D5DB' : '#23232e' }}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1000}>
                                    {userStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[var(--color-bg-card)] p-6 md:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                    <TrendingUp size={24} className="text-primary-500" />
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => navigate('/admin/contests')}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--color-bg-card)] hover:border-blue-200 dark:hover:border-blue-500 hover:shadow-md hover:shadow-blue-50 dark:hover:shadow-none transition-all text-left flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current rounded-bl-full -mr-4 -mt-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform"></div>
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 z-10">
                            <Trophy size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 z-10 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">Create Contest</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 z-10">Host a new coding challenge</p>
                        <div className="mt-auto pt-4 flex justify-end">
                            <ArrowRight size={16} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/problems')}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--color-bg-card)] hover:border-purple-200 dark:hover:border-purple-500 hover:shadow-md hover:shadow-purple-50 dark:hover:shadow-none transition-all text-left flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current rounded-bl-full -mr-4 -mt-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform"></div>
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 z-10">
                            <Code size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 z-10 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">Coding Bank</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 z-10">Manage algorithm problems</p>
                        <div className="mt-auto pt-4 flex justify-end">
                            <ArrowRight size={16} className="text-purple-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/sql-problems')}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--color-bg-card)] hover:border-blue-200 dark:hover:border-blue-500 hover:shadow-md hover:shadow-blue-50 dark:hover:shadow-none transition-all text-left flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current rounded-bl-full -mr-4 -mt-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform"></div>
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 z-10">
                            <Database size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 z-10 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">SQL Bank</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 z-10">Manage database queries</p>
                        <div className="mt-auto pt-4 flex justify-end">
                            <ArrowRight size={16} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/videos')}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--color-bg-card)] hover:border-red-200 dark:hover:border-red-500 hover:shadow-md hover:shadow-red-50 dark:hover:shadow-none transition-all text-left flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current rounded-bl-full -mr-4 -mt-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform"></div>
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 z-10">
                            <Youtube size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 z-10 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">Video Content</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 z-10">Manage educational videos</p>
                        <div className="mt-auto pt-4 flex justify-end">
                            <ArrowRight size={16} className="text-red-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/quizzes')}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--color-bg-card)] hover:border-orange-200 dark:hover:border-orange-500 hover:shadow-md hover:shadow-orange-50 dark:hover:shadow-none transition-all text-left flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current rounded-bl-full -mr-4 -mt-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform"></div>
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 z-10">
                            <Layers size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 z-10 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">Assessments</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 z-10">Manage interactive quizzes</p>
                        <div className="mt-auto pt-4 flex justify-end">
                            <ArrowRight size={16} className="text-orange-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/sheets')}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--color-bg-card)] hover:border-emerald-200 dark:hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-50 dark:hover:shadow-none transition-all text-left flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current rounded-bl-full -mr-4 -mt-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform"></div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 z-10">
                            <BookOpen size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 z-10 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Practical Sheets</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 z-10">Manage practice worksheets</p>
                        <div className="mt-auto pt-4 flex justify-end">
                            <ArrowRight size={16} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/assignments')}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--color-bg-card)] hover:border-amber-200 dark:hover:border-amber-500 hover:shadow-md hover:shadow-amber-50 dark:hover:shadow-none transition-all text-left flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current rounded-bl-full -mr-4 -mt-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform"></div>
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 z-10">
                            <Plus size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 z-10 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">Assignments</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 z-10">Manage course assignments</p>
                        <div className="mt-auto pt-4 flex justify-end">
                            <ArrowRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/editorial-creator')}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--color-bg-card)] hover:border-indigo-200 dark:hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-50 dark:hover:shadow-none transition-all text-left flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current rounded-bl-full -mr-4 -mt-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform"></div>
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 z-10">
                            <FileText size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 z-10 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Editorial Creator</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 z-10">Build solution explanations</p>
                        <div className="mt-auto pt-4 flex justify-end">
                            <ArrowRight size={16} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/users')}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--color-bg-card)] hover:border-indigo-200 dark:hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-50 dark:hover:shadow-none transition-all text-left flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current rounded-bl-full -mr-4 -mt-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform"></div>
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 z-10">
                            <Users size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 z-10 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Manage Users</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 z-10">View and edit user accounts</p>
                        <div className="mt-auto pt-4 flex justify-end">
                            <ArrowRight size={16} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/admin/courses')}
                        className="group p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--color-bg-card)] hover:border-teal-200 dark:hover:border-teal-500 hover:shadow-md hover:shadow-teal-50 dark:hover:shadow-none transition-all text-left flex flex-col h-full relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current rounded-bl-full -mr-4 -mt-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform"></div>
                        <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 z-10">
                            <BookOpen size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1 z-10 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">Courses</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 z-10">Organize curriculum content</p>
                        <div className="mt-auto pt-4 flex justify-end">
                            <ArrowRight size={16} className="text-teal-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;










