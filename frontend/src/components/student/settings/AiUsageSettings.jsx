import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Terminal, Code2, AlertCircle, TrendingUp, Cpu, Users } from 'lucide-react';
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

    const { usage, effectiveLimits } = subData;

    // Numerical limits from backend (DB planDetails has priority over hardcoded details via effectiveLimits)
    const limits = {
        aiTokens: effectiveLimits?.aiTokensLimit ?? 0,
        compiler: effectiveLimits?.compilerLimit ?? 0,
        submissions: effectiveLimits?.submissionsLimit ?? 0,
        aiInterviews: effectiveLimits?.aiInterviewsLimit ?? 0
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
        },
        {
            title: 'AI Mock Interviews',
            value: usage.aiInterviews,
            limit: limits.aiInterviews,
            unit: 'Sessions',
            icon: Users,
            color: 'indigo',
            desc: 'Participate in AI-powered mock interview sessions.'
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {usageCards.map((card, idx) => {
                    const isUnlimited = card.limit >= 100000;
                    const percentage = isUnlimited ? 0 : card.limit > 0 ? Math.min(100, (card.value / card.limit) * 100) : 0;
                    const colorClass = card.color === 'amber' 
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                        : card.color === 'blue' 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.4)]' 
                            : card.color === 'purple'
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                                : 'bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.4)]';
                    
                    const textClass = card.color === 'amber' ? 'text-amber-600' : card.color === 'blue' ? 'text-blue-600' : card.color === 'purple' ? 'text-purple-600' : 'text-indigo-600';
                    const bgClass = card.color === 'amber' ? 'bg-amber-50' : card.color === 'blue' ? 'bg-blue-50' : card.color === 'purple' ? 'bg-purple-50' : 'bg-indigo-50';

                    return (
                        <div key={idx} className="bg-[var(--color-bg-primary)] p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center justify-between mb-6">
                                <div className={`p-3 rounded-2xl ${bgClass} dark:bg-opacity-10 ${textClass}`}>
                                    <card.icon size={22} />
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-gray-400">Used Today</p>
                                </div>
                            </div>

                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{card.title}</h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4 min-h-[30px]">{card.desc}</p>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className="text-gray-400">Progress</span>
                                    <span className={textClass}>{isUnlimited ? 'Unlimited' : card.limit > 0 ? `${Math.round(percentage)}%` : '0%'}</span>
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-800/80 rounded-full overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${colorClass}`}
                                        style={{ width: `${isUnlimited ? 0 : percentage}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                                    <span>0</span>
                                    <span>{isUnlimited ? 'Unlimited' : `Limit: ${card.limit.toLocaleString()}`} {card.unit}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AiUsageSettings;

