import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Calendar, Shield, Zap, ArrowRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SubscriptionSettings = () => {
    const [subData, setSubData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            const token = Cookies.get('accessToken');
            const response = await axios.get(`${API_URL}/subscriptions/plan`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubData(response.data);
        } catch (error) {
            console.error('Error fetching subscription:', error);
            // Default to FREE if request fails or unauthorized
            setSubData({
                plan: 'FREE',
                details: {
                    name: 'Free Learner',
                    tagline: 'Unlock premium courses and AI support.',
                    displayFeatures: [
                        'Access to 5,000 AI Tokens daily',
                        '20 Compiler runs per day',
                        '20 Code submissions per day',
                        'Access to Free courses',
                        'Community Support'
                    ]
                },
                usage: { aiTokens: 0, compiler: 0, submissions: 0 },
                expiresAt: null
            });
            
            if (error.response?.status !== 401) {
                toast.error('Failed to load subscription details');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading || !subData) {
        return (
            <div className="flex justify-center py-12">
                <div className="spinner border-indigo-500"></div>
            </div>
        );
    }

    const { plan, details, expiresAt } = subData;
    const isFree = plan === 'FREE';
    const expiryDate = expiresAt ? new Date(expiresAt) : null;
    const daysLeft = expiryDate ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Active Plan Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600/5 to-purple-600/5 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-[2.5rem] border border-indigo-100/50 dark:border-indigo-500/20 p-8">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Shield size={120} className="text-indigo-600 dark:text-indigo-400" />
                </div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                    isFree 
                                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' 
                                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                }`}>
                                    Current Plan
                                </span>
                                {!isFree && (
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                                        <CheckCircle size={12} /> Active
                                    </span>
                                )}
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {details?.name || 'Free Learner'}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                {isFree ? 'Unlock premium courses and AI support.' : details?.tagline}
                            </p>
                        </div>

                        {!isFree && expiryDate && !isNaN(expiryDate.getTime()) && (
                            <div className="bg-white/80 dark:bg-black/20 backdrop-blur-md rounded-3xl p-6 border border-white dark:border-white/5 shadow-xl shadow-black/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Valid Until</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {expiryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${daysLeft < 7 ? 'bg-red-500' : 'bg-indigo-500'}`}
                                            style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-bold ${daysLeft < 7 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {daysLeft} days left
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <Link 
                            to="/pricing" 
                            className="btn-primary flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg shadow-indigo-600/20"
                        >
                            {isFree ? 'Upgrade Plan' : 'Manage Subscription'}
                            <ArrowRight size={18} />
                        </Link>
                        {isFree && (
                            <button className="btn-secondary px-6 py-3 rounded-2xl">
                                View Billing History
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Plan Benefits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[var(--color-bg-primary)] p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Zap size={18} className="text-amber-500" />
                        Plan Benefits
                    </h3>
                    <div className="space-y-4">
                        {(subData.details?.displayFeatures || [
                            'Access to basic course materials',
                            'Limited community support',
                            'Free participation in public contests',
                            'Basic coding compiler'
                        ]).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="p-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle size={14} />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[var(--color-bg-primary)] p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Clock size={18} className="text-blue-500" />
                        Next Renewal
                    </h3>
                    <div className="space-y-6">
                        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mb-1">Status</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {isFree || !expiryDate || isNaN(expiryDate.getTime())
                                    ? "No active subscription found. You are currently on the Free plan." 
                                    : `Your ${details?.name} will auto-renew on ${expiryDate?.toLocaleDateString()}.`}
                            </p>
                        </div>
                        
                        {!isFree && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10">
                                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    To avoid service interruption, please ensure your payment method is up to date 
                                    at least 2 days before the renewal date.
                                </p>
                            </div>
                        )}

                        <button className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-2">
                            Update Payment Method <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionSettings;
