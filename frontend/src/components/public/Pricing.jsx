import React, { useState, useEffect } from 'react';
import { Check, Info, ArrowRight, Zap, Shield, HelpCircle, Tag, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import Navbar from '../shared/Navbar';

const Pricing = () => {
    const { user } = useAuth();
    const [currentPlan, setCurrentPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    const plans = [
        {
            id: 'BASIC',
            name: 'Basic Plan',
            tagline: 'Monthly paid plan.',
            price: 499,
            duration: '1 month access',
            color: 'blue',
            features: [
                'All Course Access (DSA + more)',
                'Core CS Subjects',
                'Mock Tests',
                'Coding Contest',
                'AI Support (25K/day Tokens)',
                'Quick Compiler (50/day)',
                'Run/Submit (50/day)',
                'DSA Sheet',
                '400+ Coding Problem',
                'Live Group Sessions',
                'Interview Experience',
                'Article & Tutorials'
            ]
        },
        {
            id: 'PLUS',
            name: 'Plus Plan',
            tagline: 'Yearly paid plan.',
            price: 4999,
            monthlyPrice: 417,
            duration: '1 year access',
            color: 'purple',
            isPopular: true,
            features: [
                'All Course Access (DSA + more)',
                'Core CS Subjects',
                'Mock Tests',
                'Coding Contest',
                'AI Support (50K/day Tokens)',
                'Quick Compiler (100/day)',
                'Run/Submit (100/day)',
                'DSA Sheet',
                '400+ Coding Problem',
                'Live Group Sessions',
                'Interview Experience',
                'Article & Tutorials'
            ]
        },
        {
            id: 'PRO',
            name: 'Pro Plan',
            tagline: 'Two Year paid plan.',
            price: 6999,
            duration: '2 years access',
            color: 'indigo',
            features: [
                'All Course Access (DSA + more)',
                'Core CS Subjects',
                'Mock Tests',
                'Coding Contest',
                'AI Support (75K/day Tokens)',
                'Quick Compiler (300/day)',
                'Run/Submit (300/day)',
                'DSA Sheet',
                '400+ Coding Problem',
                'Live Group Sessions',
                'Interview Experience',
                'Article & Tutorials'
            ]
        }
    ];

    useEffect(() => {
        fetchCurrentPlan();
    }, []);

    const fetchCurrentPlan = async () => {
        try {
            const response = await apiClient.get('/subscriptions/plan');
            setCurrentPlan(response.data);
        } catch (error) {
            console.error('Error fetching plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setValidatingCoupon(true);
        try {
            const response = await apiClient.post('/coupons/validate', {
                code: couponCode,
                amount: 499 // Dummy amount for validation
            });
            setAppliedCoupon(response.data.coupon);
            toast.success('Coupon applied!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid coupon');
            setAppliedCoupon(null);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleSubscribe = async (planId) => {
        if (!user) {
            toast.error('Please login to subscribe');
            return;
        }

        setProcessing(true);
        setSelectedPlanId(planId);
        try {
            // Load Razorpay Script
            const res = await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.body.appendChild(script);
            });

            if (!res) {
                toast.error('Razorpay SDK failed to load. Are you online?');
                setProcessing(false);
                setSelectedPlanId(null);
                return;
            }

            const { data } = await apiClient.post('/subscriptions/create-order', {
                planId,
                couponCode: appliedCoupon?.code
            });

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: data.order.amount,
                currency: data.order.currency,
                name: 'AlphaLearn',
                description: `Subscription to ${data.plan.name}`,
                order_id: data.order.id,
                handler: async (response) => {
                    try {
                        const verifyRes = await apiClient.post('/subscriptions/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (verifyRes.data.success) {
                            toast.success(verifyRes.data.message);
                            fetchCurrentPlan();
                        }
                    } catch (err) {
                        toast.error(err.response?.data?.message || 'Payment verification failed');
                    } finally {
                        setProcessing(false);
                        setSelectedPlanId(null);
                    }
                },
                prefill: {
                    name: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : '',
                    email: user?.email || '',
                },
                theme: { color: '#7d63f2' },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                        setSelectedPlanId(null);
                    }
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Failed to initiate payment';
            toast.error(msg);
            setProcessing(false);
            setSelectedPlanId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg-base)]">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-700">
                {/* Header */}
                <div className="text-center mb-16 mt-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
                        Simple, Transparent <span className="text-[var(--color-accent)]">Pricing</span>
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Choose the plan that fits your learning journey. All plans include access to our premium coding resources and AI support.
                    </p>
                </div>

                {/* Coupon Section */}
                <div className="max-w-md mx-auto mb-12">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Tag size={18} className="text-gray-400 group-focus-within:text-[var(--color-accent)] transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Enter Coupon Code"
                            className="w-full pl-11 pr-24 py-3.5 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] outline-none transition-all shadow-sm"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        />
                        <button
                            onClick={handleApplyCoupon}
                            disabled={validatingCoupon || !couponCode}
                            className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-[var(--color-accent)] text-white rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {validatingCoupon ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Apply'}
                        </button>
                    </div>
                    {appliedCoupon && (
                        <div className="mt-3 flex items-center justify-between px-4 py-2 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-xl animate-in slide-in-from-top-2">
                            <span className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                                <Check size={14} /> Coupon <strong>{appliedCoupon.code}</strong> Applied!
                            </span>
                            <button onClick={() => setAppliedCoupon(null)} className="text-green-700 dark:text-green-400 hover:opacity-70">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    {plans.map((plan) => {
                        const isActive = currentPlan?.plan === plan.id;
                        const isSelected = selectedPlanId === plan.id;
                        const canUpgrade = currentPlan?.plan === 'PLUS' && plan.id === 'PRO';
                        const upgradePrice = 2000;

                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col p-8 bg-white dark:bg-[#0f0f0f] rounded-[2rem] border transition-all duration-300 hover:translate-y-[-8px] hover:shadow-2xl hover:shadow-[var(--color-accent)]/10 ${
                                    plan.isPopular 
                                        ? 'border-[var(--color-accent)] scale-105 z-10' 
                                        : 'border-gray-100 dark:border-gray-800'
                                }`}
                            >
                                {plan.isPopular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[var(--color-accent)] to-[#a78bfa] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{plan.tagline}</p>
                                </div>

                                <div className="mb-8">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-gray-900 dark:text-white">₹{plan.price.toLocaleString()}</span>
                                        {plan.monthlyPrice && <span className="text-gray-500 text-sm">/year</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.duration}</p>
                                    {plan.monthlyPrice && (
                                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl inline-block">
                                            <span className="text-[var(--color-accent)] font-bold text-lg">₹{plan.monthlyPrice}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400"> /month</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={processing || isActive}
                                    className={`w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 mb-8 ${
                                        isActive
                                            ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20 cursor-default'
                                            : plan.isPopular
                                                ? 'bg-[var(--color-accent)] text-white hover:opacity-90 shadow-lg shadow-[var(--color-accent)]/25'
                                                : 'bg-gray-900 dark:bg-white dark:text-gray-900 text-white hover:opacity-90'
                                    }`}
                                >
                                    {isActive ? (
                                        <>Subscription Active</>
                                    ) : isSelected ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : canUpgrade ? (
                                        <>Upgrade for just ₹{upgradePrice.toLocaleString()}</>
                                    ) : (
                                        <>Subscribe <ArrowRight size={16} /></>
                                    )}
                                </button>

                                <div className="space-y-4 flex-grow">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">This plan includes:</p>
                                    {plan.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            <div className="mt-0.5 p-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400">
                                                <Check size={12} />
                                            </div>
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Comparison Table */}
                <div className="mb-20 animate-in slide-in-from-bottom-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Plans Comparison</h2>
                        <p className="text-gray-500 dark:text-gray-400">Compare features across different subscription plans</p>
                    </div>

                    <div className="overflow-hidden bg-white dark:bg-[#0f0f0f] rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-black/5">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                                    <th className="px-8 py-6 text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800">Features</th>
                                    <th className="px-8 py-6 text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 text-center">Free Plan</th>
                                    <th className="px-8 py-6 text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 text-center">Basic Plan</th>
                                    <th className="px-8 py-6 text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 text-center">Plus Plan</th>
                                    <th className="px-8 py-6 text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 text-center">Pro Plan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {[
                                    { name: 'Access to all courses', values: [false, true, true, true], type: 'check' },
                                    { name: 'New course access', values: [false, false, false, true], type: 'check' },
                                    { name: 'DSA sheets & resources', values: [true, true, true, true], type: 'check' },
                                    { name: 'Contest participation', values: [false, true, true, true], type: 'check' },
                                    { name: 'Interview experiences', values: [true, true, true, true], type: 'check' },
                                    { name: 'Articles & tutorials', values: [true, true, true, true], type: 'check' },
                                    { name: 'Community support', values: [true, true, true, true], type: 'check' },
                                    { name: 'Priority support', values: [false, false, true, true], type: 'check' },
                                    { name: 'AI Tokens', values: ['5000/day', '25000/day', '50000/day', '75000/day'], type: 'text' },
                                    { name: 'Quick Compiler', values: ['20/day', '50/day', '100/day', '300/day'], type: 'text' },
                                    { name: 'Code Run/Submit', values: ['20/day', '50/day', '100/day', '300/day'], type: 'text' },
                                ].map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors">
                                        <td className="px-8 py-5 text-sm text-gray-700 dark:text-gray-300">{row.name}</td>
                                        {row.values.map((val, vIdx) => (
                                            <td key={vIdx} className="px-8 py-5 text-center">
                                                {row.type === 'check' ? (
                                                    val ? <Check size={18} className="mx-auto text-green-500" /> : <X size={18} className="mx-auto text-gray-300 dark:text-gray-700" />
                                                ) : (
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{val}</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pricing;
