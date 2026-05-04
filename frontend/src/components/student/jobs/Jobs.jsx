import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../services/queryKeys';
import jobService from '../../../services/jobService';
import {
    Briefcase, MapPin, Clock, ChevronRight, Search, Building2, Banknote,
    GraduationCap, Sparkles, TrendingUp, Globe, DollarSign, Zap,
    ArrowUpRight, ShieldCheck, Calendar, Layout, Activity,
} from 'lucide-react';

const Jobs = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: jobs, isLoading, error } = useQuery({
        queryKey: queryKeys.jobs.all(),
        queryFn: jobService.getAllJobs
    });

    const filteredJobs = jobs?.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="flex-1 flex items-center justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div></div>;

    return (
        <div className="flex-1 flex flex-col min-h-0 space-y-6 animate-in fade-in duration-500">
            {/* Properly Sized Header */}
            <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight">
                        Job Portal
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Identify and deploy into elite technical roles within the network.
                    </p>
                </div>

                <div className="relative max-w-md w-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Locate role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg-input)] border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none transition-all placeholder:text-gray-500 shadow-inner dark:shadow-none"
                    />
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                {[
                    { label: 'Active Listings', value: filteredJobs?.length || 0, icon: <Layout className="w-4 h-4" /> },
                    {
                        label: 'Markets',
                        value: [...new Set(jobs?.map(j => j.location))].length || 0,
                        icon: <Globe className="w-4 h-4" />
                    },
                    {
                        label: 'Partner Brands',
                        value: [...new Set(jobs?.map(j => j.company))].length || 0,
                        icon: <ShieldCheck className="w-4 h-4" />
                    },
                    {
                        label: 'New Drops',
                        value: jobs?.filter(j => new Date(j.posted_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0,
                        icon: <Activity className="w-4 h-4" />
                    },
                ].map((stat, i) => (
                    <div key={i} className="bg-[var(--color-bg-card)] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm group hover:border-primary-500/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-primary-50 dark:bg-primary-900/10 rounded-lg text-primary-600 group-hover:scale-110 transition-transform">
                                {stat.icon}
                            </div>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <div className="text-xl text-gray-900 dark:text-white tracking-tight">
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Job Cards */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                    {filteredJobs?.map((job, idx) => (
                        <div key={job.id} className="group bg-[var(--color-bg-card)] rounded-xl p-6 border border-gray-100 dark:border-gray-800 hover:border-primary-500/30 transition-all duration-300 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
                            {/* Static Ambient Glow - Mimicking CodeTyper effect */}
                            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-60" 
                                 style={{
                                     background: `radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.20), transparent 70%)`
                                 }} 
                            />
                            
                            <div className="relative z-10 flex flex-col h-full flex-1 justify-between">
                            <div className="space-y-5">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 bg-[var(--color-bg-surface)] dark:bg-gray-900 rounded-xl flex items-center justify-center border border-gray-100 dark:border-gray-800 group-hover:border-primary-500/20 transition-all">
                                        <Building2 className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <span className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 text-[10px] font-semibold px-3 py-1 rounded-full border border-primary-100 dark:border-primary-900/30 uppercase tracking-wider">
                                        {job.job_type || 'Contract'}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-lg text-gray-900 dark:text-white leading-tight tracking-tight group-hover:text-primary-600 transition-colors">{job.title}</h3>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="text-primary-600 text-xs">{job.company}</span>
                                        <span className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase tracking-wider">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {job.location || 'Remote'}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-50 dark:border-gray-800/50">
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Exp</div>
                                        <div className="text-[11px] text-gray-700 dark:text-gray-300 uppercase">{job.experience || 'Fresher'}</div>
                                    </div>
                                    <div className="space-y-1 border-x border-gray-50 dark:border-gray-800/50 px-4 text-center">
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">CTC</div>
                                        <div className="text-[11px] text-gray-700 dark:text-gray-300 uppercase">{job.salary || 'Competitive'}</div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Closing</div>
                                        <div className="text-[11px] text-gray-700 dark:text-gray-300">{new Date(job.expiresAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => window.open(job.apply_link, '_blank')}
                                className="w-full mt-6 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-500 hover:to-primary-700 text-white px-6 py-2.5 rounded-lg transition-all duration-300 shadow-sm text-[13px] active:scale-[0.98] border border-primary-500/20"
                            >
                                Application Deployment
                            </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Jobs;








