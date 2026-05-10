import React, { useState, useEffect } from 'react';
import { Check, X, Layout, Database, ClipboardCheck, Trophy, Sparkles, Terminal, Play, FileText, Code2, Users, Briefcase, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';
import Navbar from '../shared/Navbar';
import CheckoutModal from '../student/subscriptions/CheckoutModal';
import { cn } from '../../lib/utils';

const Badge = ({ children, className }) => (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-sm", className)}>
        {children}
    </span>
);

const Pricing = () => {
    const { user } = useAuth();
    const [plans, setPlans] = useState([]);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedDurations, setSelectedDurations] = useState({});

    useEffect(() => {
        if (plans.length > 0) {
            const initialDurations = {};
            plans.forEach(p => {
                initialDurations[p.id] = p.pricingOptions?.[0]?.duration || p.durationInDays;
            });
            setSelectedDurations(initialDurations);
        }
    }, [plans]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansRes, currentPlanRes] = await Promise.all([
                apiClient.get('/plans/active'),
                apiClient.get('/subscriptions/plan')
            ]);
            setPlans(plansRes.data.plans);
            setCurrentPlan(currentPlanRes.data);
        } catch (error) {
            console.error('Error fetching pricing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlanClick = (plan) => {
        if (!user) {
            toast.error('Please login to subscribe');
            return;
        }
        setSelectedPlan(plan);
        setIsCheckoutOpen(true);
    };

    const mainPlanNames = ['BASIC PLAN', 'PLUS PLAN', 'PRO PLAN'];
    const mainPlans = plans.filter(p => mainPlanNames.includes(p.name.toUpperCase()));
    const extraPlans = plans.filter(p => !mainPlanNames.includes(p.name.toUpperCase()));

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0a0a0c]">
                <Navbar />
                <div className="flex justify-center items-center h-[60vh]">
                    <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    const PlanCard = ({ plan, compact = false }) => {
        const selectedDuration = selectedDurations[plan.id] || (plan.pricingOptions?.[0]?.duration || plan.durationInDays);
        const activeOption = plan.pricingOptions?.find(o => o.duration === selectedDuration) || { price: plan.price, duration: plan.durationInDays, label: `${plan.durationInDays / 30} Months` };
        
        const isPro = plan.name.toUpperCase().includes('PRO');
        const isPlus = plan.name.toUpperCase().includes('PLUS');
        const isPopular = isPro;
        const currentPrice = currentPlan?.price || currentPlan?.planDetails?.price || 0;
        
        const tierRanking = { 'FREE': 0, 'BASIC': 1, 'PLUS': 2, 'PRO': 3 };
        const getTierStr = (name) => {
            const upper = (name || '').toUpperCase();
            if (upper.includes('PRO')) return 'PRO';
            if (upper.includes('PLUS')) return 'PLUS';
            if (upper.includes('BASIC')) return 'BASIC';
            return 'FREE';
        };
        
        const currentTierLevel = tierRanking[getTierStr(currentPlan?.plan)];
        const thisTierLevel = tierRanking[getTierStr(plan.name)];
        
        const isCurrentTier = currentPlan && currentPlan.plan !== 'FREE' && currentTierLevel === thisTierLevel && currentTierLevel > 0;
        const isUpgradeTier = thisTierLevel > currentTierLevel;
        const isLowerTier = currentPlan && currentPlan.plan !== 'FREE' && thisTierLevel < currentTierLevel;
        const buttonDisabled = isCurrentTier || isLowerTier;
        const isLifetime = activeOption.duration >= 3600; // Treat 10+ years as lifetime

        return (
            <div 
                className={cn(
                    "bg-white dark:bg-[#111117] rounded-2xl border flex flex-col relative transition-all duration-300",
                    isCurrentTier 
                        ? cn("border-primary-500 ring-4 ring-primary-500/10 shadow-2xl shadow-primary-500/5", compact ? "p-5" : "p-[24px]") 
                        : isPopular
                            ? cn("border-primary-500/50 ring-2 ring-primary-500/5 shadow-lg", compact ? "p-5" : "p-[24px]")
                            : cn("border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md", compact ? "p-5" : "p-[24px]")
                )}
            >
                <div className="absolute top-6 right-6 flex flex-col gap-2 items-end z-10">
                    {isCurrentTier && (
                        <div className="px-3 py-1 bg-primary-500 text-white text-[10px] font-black rounded-full tracking-wider shadow-sm">
                            Active
                        </div>
                    )}
                    {isPopular && (
                        <div className="px-3 py-1 bg-gray-100 dark:bg-white/10 text-[10px] font-black rounded-full tracking-wider border border-gray-200 dark:border-white/10 shadow-sm">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">Popular</span>
                        </div>
                    )}
                </div>

                <div className={compact ? "mb-3" : "mb-4"}>
                    <h3 className={cn("font-bold text-gray-900 dark:text-white mb-1", compact ? "text-lg" : "text-xl")}>
                        {plan.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                    </h3>
                    <p className={cn("text-gray-500 dark:text-gray-400 leading-tight", compact ? "text-[13px]" : "text-sm")}>{plan.description || (isLifetime ? "Lifetime access plan." : activeOption.duration === 30 ? "Monthly paid plan." : `${Math.round(activeOption.duration / 30)} Month paid plan.`)}</p>
                </div>

                <div className={compact ? "mb-3" : "mb-4"}>
                    <div className="flex items-baseline gap-1">
                        <span className={cn("font-black text-gray-900 dark:text-white", compact ? "text-2xl" : "text-3xl")}>₹{isLifetime ? activeOption.price.toLocaleString() : Math.round(activeOption.price / Math.max(1, Math.round(activeOption.duration / 30))).toLocaleString()}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold tracking-wider">
                            {isLifetime ? '/lifetime' : '/month'}
                        </span>
                    </div>
                    {!isLifetime && activeOption.duration > 30 && (
                        <p className={cn("text-gray-400 dark:text-gray-500 mt-0.5 font-medium", compact ? "text-[12px]" : "text-[13px]")}>
                            ₹{activeOption.price.toLocaleString()} for {Math.round(activeOption.duration / 30)} months
                        </p>
                    )}
                    {isLifetime && (
                        <p className={cn("text-gray-400 dark:text-gray-500 mt-0.5 font-medium", compact ? "text-[12px]" : "text-[13px]")}>
                            One-time payment
                        </p>
                    )}
                    
                    {isUpgradeTier && currentPlan && currentPlan.plan !== 'FREE' && currentPrice > 0 && activeOption.price > currentPrice && (
                        <p className={cn("font-bold text-primary-600 dark:text-primary-400 leading-tight", compact ? "text-sm mt-2" : "text-sm mt-4")}>
                            {isLifetime ? `Upgrade for just ₹${(activeOption.price - currentPrice).toLocaleString()}` : `Upgrade for just ₹${Math.round((activeOption.price - currentPrice) / Math.max(1, Math.round(activeOption.duration / 30))).toLocaleString()}/month`} 
                            {!compact && <br />}
                            <span className="text-gray-400 dark:text-gray-600 font-normal"> (₹{activeOption.price.toLocaleString()} - ₹{currentPrice.toLocaleString()})</span>
                        </p>
                    )}
                </div>

                {/* Duration Selection Tabs */}
                {plan.pricingOptions?.length > 1 && (
                    <div className={cn("flex gap-1.5 bg-gray-200 dark:bg-white/10 p-0.5 rounded-xl border border-transparent dark:border-white/5 shadow-inner", compact ? "mb-3" : "mb-4")}>
                        {plan.pricingOptions.map((opt) => (
                            <button
                                key={opt.duration}
                                onClick={() => setSelectedDurations(prev => ({...prev, [plan.id]: opt.duration}))}
                                className={cn(
                                    "flex-1 font-bold rounded-lg transition-all",
                                    compact ? "py-1.5 text-sm" : "py-2 text-xs",
                                    selectedDuration === opt.duration 
                                        ? "bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-black/5 dark:ring-white/10" 
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}

                <button
                    onClick={() => handlePlanClick({ ...plan, selectedDuration })}
                    disabled={buttonDisabled}
                    className={cn(
                        "w-full rounded-2xl font-bold transition-all shadow-lg text-white btn-primary shadow-primary-500/20",
                        compact ? "py-1.5 text-[12px] mb-3" : "py-2 text-[13px] mb-5",
                        buttonDisabled 
                            ? "opacity-50 cursor-not-allowed"
                            : "active:scale-[0.98] hover:opacity-90"
                    )}
                >
                    {isCurrentTier ? "Subscription Active" : isLowerTier ? "Subscribe" : currentPlan && currentPlan.plan !== 'FREE' ? "Upgrade Plan" : "Subscribe"}
                </button>

                <div>
                    <h4 className={cn("font-bold text-gray-400 dark:text-gray-500", compact ? "text-[12px] mb-2" : "text-[13px] mb-3")}>This plan includes:</h4>
                    <div className={compact ? "space-y-1.5" : "space-y-2"}>
                        {(compact ? plan.features.slice(0, 4) : [
                            { icon: Layout, label: "All Course Access (DSA + more)" },
                            { icon: Database, label: "Core CS Subjects" },
                            { icon: ClipboardCheck, label: "Mock Tests" },
                            { icon: Trophy, label: "Coding Contest" },
                            { icon: Sparkles, label: `AI Tokens (${Math.round((plan.aiTokensLimit || 0) / 1000)}K/day)` },
                            { icon: Terminal, label: `Compiler (${plan.compilerLimit || 0}/day)` },
                            { icon: Play, label: `Run/Submit (${plan.submissionsLimit || 0}/day)` },
                            { icon: FileText, label: "DSA Sheet" },
                            { icon: Code2, label: "400+ Coding Problems" },
                            { icon: Users, label: "Live Group Sessions" },
                            { icon: Briefcase, label: "Interview Experience" },
                            { icon: Users, label: `AI Interviews (${plan.aiInterviewsLimit || 0}/day)` },
                            { icon: BookOpen, label: "Article & Tutorials" }
                        ]).map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                                {typeof item === 'string' ? (
                                    <Check size={14} className="text-primary-500 shrink-0" />
                                ) : (
                                    <item.icon size={compact ? 14 : 16} className="text-gray-400 dark:text-gray-500 shrink-0" />
                                )}
                                <span className={cn("text-gray-600 dark:text-gray-400 leading-tight", compact ? "text-[14px]" : "text-[15px]")}>
                                    {typeof item === 'string' ? item : item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0c] text-gray-900 dark:text-white font-sans transition-colors">
            <Navbar />
            
            <div className="max-w-[1220px] mx-auto px-4 py-12">
                {/* Main Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 mt-8">
                    {mainPlans.sort((a, b) => {
                        const order = { 'BASIC PLAN': 1, 'PRO PLAN': 2, 'PLUS PLAN': 3 };
                        return (order[a.name.toUpperCase()] || 99) - (order[b.name.toUpperCase()] || 99);
                    }).map((plan) => (
                        <PlanCard key={plan.id} plan={plan} />
                    ))}
                </div>

                {/* Comparison Table */}
                <div className="mb-16">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold mb-2">Plans Comparison</h2>
                        <p className="text-gray-500 dark:text-gray-500 text-sm">Compare features across different subscription plans</p>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/5">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10">
                                    <th className="py-4 px-6 font-bold text-gray-700 dark:text-gray-300 text-[15px]">Features</th>
                                    <th className="py-4 px-6 font-bold text-gray-700 dark:text-gray-300 text-center text-[15px]">Free Plan</th>
                                    <th className="py-4 px-6 font-bold text-gray-700 dark:text-gray-300 text-center text-[15px]">Basic Plan</th>
                                    <th className="py-4 px-6 font-bold text-gray-700 dark:text-gray-300 text-center text-[15px]">Plus Plan</th>
                                    <th className="py-4 px-6 font-bold text-gray-700 dark:text-gray-300 text-center text-[15px]">Pro Plan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {(() => {
                                    const basic = mainPlans.find(p => p.name.toUpperCase().includes('BASIC')) || {};
                                    const plus = mainPlans.find(p => p.name.toUpperCase().includes('PLUS')) || {};
                                    const pro = mainPlans.find(p => p.name.toUpperCase().includes('PRO')) || {};
                                    const formatLimit = (limit) => limit >= 100000 ? "Unlimited" : `${limit || 0}/day`;

                                    return [
                                        { f: "Access to all courses", v: [false, true, true, true] },
                                        { f: "New course access", v: [false, false, false, true] },
                                        { f: "DSA sheets & resources", v: [true, true, true, true] },
                                        { f: "Contest participation", v: [false, true, true, true] },
                                        { f: "Interview experiences", v: [true, true, true, true] },
                                        { f: "Articles & tutorials", v: [true, true, true, true] },
                                        { f: "Community support", v: [true, true, true, true] },
                                        { f: "Priority support", v: [false, false, true, true] },
                                        { f: "AI Tokens", v: ["5000/day", formatLimit(basic.aiTokensLimit), formatLimit(plus.aiTokensLimit), formatLimit(pro.aiTokensLimit)] },
                                        { f: "Quick Compiler", v: ["20/day", formatLimit(basic.compilerLimit), formatLimit(plus.compilerLimit), formatLimit(pro.compilerLimit)] },
                                        { f: "Code Run/Submit", v: ["20/day", formatLimit(basic.submissionsLimit), formatLimit(plus.submissionsLimit), formatLimit(pro.submissionsLimit)] },
                                        { f: "AI Interviews", v: ["0/day", formatLimit(basic.aiInterviewsLimit), formatLimit(plus.aiInterviewsLimit), formatLimit(pro.aiInterviewsLimit)] },
                                    ].map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="py-3 px-6 text-gray-600 dark:text-gray-400 text-[15px] font-medium">{row.f}</td>
                                        {row.v.map((val, j) => (
                                            <td key={j} className="py-3 px-6 text-center">
                                                {typeof val === 'boolean' ? (
                                                    val ? <Check size={18} className="mx-auto text-green-600 dark:text-white/80" /> : <X size={18} className="mx-auto text-gray-400 dark:text-white/20" />
                                                ) : (
                                                    <span className="text-gray-700 dark:text-gray-300 text-[15px] font-bold">{val}</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))})()}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Specialized Admin Tracks */}
                {extraPlans.length > 0 && (
                    <div className="mb-20">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-2">Specialized Tracks</h2>
                            <p className="text-gray-500 text-sm">Custom learning tracks for specific technical paths.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {extraPlans.map((plan) => (
                                <PlanCard key={plan.id} plan={plan} compact={true} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {selectedPlan && (
                <CheckoutModal 
                    isOpen={isCheckoutOpen}
                    onClose={() => setIsCheckoutOpen(false)}
                    plan={selectedPlan}
                    user={user}
                    currentPlan={currentPlan}
                    onPaymentSuccess={fetchData}
                />
            )}
        </div>
    );
};

export default Pricing;
