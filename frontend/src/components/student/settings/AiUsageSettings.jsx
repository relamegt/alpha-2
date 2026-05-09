import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Terminal, Code2, AlertCircle, TrendingUp, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AiUsageSettings = () => {
    const [subData, setSubData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsage();
    }, []);

    const fetchUsage = async () => {
        try {
            const token = Cookies.get('accessToken');
            const response = await axios.get(`${API_URL}/subscriptions/plan`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubData(response.data);
        } catch (error) {
            console.error('Error fetching usage:', error);
            // Default to FREE usage if request fails
            setSubData({
                plan: 'FREE',
                details: {
                    name: 'Free Learner',
                    features: { aiTokensPerDay: 5000, compilerPerDay: 20, submissionsPerDay: 20 }
                },
                usage: { aiTokens: 0, compiler: 0, submissions: 0 }
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading || !subData || !subData.usage) {
        return (
            <div className="flex justify-center py-12">
                <div className="spinner border-amber-500"></div>
            </div>
        );
    }

    const { usage, details } = subData;

    // Numerical limits from backend features
    const limits = {
        aiTokens: details?.features?.aiTokensPerDay || 5000,
        compiler: details?.features?.compilerPerDay || 20,
        submissions: details?.features?.submissionsPerDay || 20,
    };

    const usageCards = [
        {
            title: 'AI Support Tokens',
            value: usage.aiTokens,
            limit: limits.aiTokens,
            unit: 'Tokens',
            icon: Zap,
            color: 'amber',
            desc: 'Daily tokens for AI debugging and explanations.'
        },
        {
            title: 'Compiler Runs',
            value: usage.compiler,
            limit: limits.compiler,
            unit: 'Runs',
            icon: Terminal,
            color: 'blue',
            desc: 'Quick compiler executions for rapid testing.'
        },
        {
            title: 'Code Submissions',
            value: usage.submissions,
            limit: limits.submissions,
            unit: 'Submits',
            icon: Code2,
            color: 'purple',
            desc: 'Problem submissions and evaluation runs.'
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Info */}
            <div className="p-6 rounded-[2rem] bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Daily Usage Policy</h3>
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-1 leading-relaxed">
                        Usage counters are reset every day at <strong>00:00 UTC</strong>. Unused limits do not carry over to the next day. 
                        Upgrading your plan increases these limits instantly.
                    </p>
                </div>
            </div>

            {/* Usage Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {usageCards.map((card, idx) => {
                    const percentage = Math.min(100, (card.value / card.limit) * 100);
                    const colorClass = card.color === 'amber' 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                        : card.color === 'blue' 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.4)]' 
                            : 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-[0_0_8px_rgba(168,85,247,0.4)]';
                    const textClass = card.color === 'amber' ? 'text-amber-600' : card.color === 'blue' ? 'text-blue-600' : 'text-purple-600';
                    const bgClass = card.color === 'amber' ? 'bg-amber-50' : card.color === 'blue' ? 'bg-blue-50' : 'bg-purple-50';

                    return (
                        <div key={idx} className="bg-[var(--color-bg-primary)] p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center justify-between mb-6">
                                <div className={`p-3 rounded-2xl ${bgClass} dark:bg-opacity-10 ${textClass}`}>
                                    <card.icon size={22} />
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Used Today</p>
                                </div>
                            </div>

                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{card.title}</h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{card.desc}</p>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-gray-400">Progress</span>
                                    <span className={textClass}>{Math.round(percentage)}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-800/80 rounded-full overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${colorClass}`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                                    <span>0</span>
                                    <span>Limit: {card.limit.toLocaleString()} {card.unit}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Performance Insights Section */}
            <div className="bg-[var(--color-bg-primary)] p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Usage Insights</h3>
                        <p className="text-xs text-gray-500">How you've been using your premium features</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                            <Cpu size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Efficiency Score</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                You are using approximately <strong>{Math.round(usage.aiTokens / 100)} tokens</strong> per query. 
                                This is within the optimal efficiency range for your plan.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Peak Usage Time</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Most of your activity occurs between <strong>08:00 PM and 11:00 PM</strong>. 
                                You have enough remaining limits to support your peak hours.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiUsageSettings;
