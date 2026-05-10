import React, { useState, useEffect } from 'react';
import { 
    CreditCard, Search, Filter, Calendar, 
    CheckCircle, XCircle, Clock, Users, 
    ArrowUpRight, Download, Loader2, Mail,
    Zap, Shield, ExternalLink, RefreshCw, Tag, ChevronDown
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

const SubscriptionManager = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    
    const [plans, setPlans] = useState([]);
    const [durationMode, setDurationMode] = useState('preset'); // 'preset' or 'custom'
    
    // Assign Plan Form State
    const [assignData, setAssignData] = useState({
        email: '',
        plan: '', // Name for legacy
        planId: '', // ID for created plans
        durationMonths: 12
    });

    useEffect(() => {
        fetchSubscriptions();
        fetchStats();
        fetchPlans();
    }, [statusFilter]);

    const fetchPlans = async () => {
        try {
            const response = await apiClient.get('/plans');
            setPlans(response.data.plans || []);
        } catch (error) {
            console.error('Failed to fetch plans');
        }
    };

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
            const response = await apiClient.get(`/admin/subscriptions?limit=100${statusParam}`);
            setSubscriptions(response.data.subscriptions || []);
        } catch (error) {
            toast.error('Failed to fetch subscriptions');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await apiClient.get('/admin/analytics');
            setStats(response.data.analytics.subscriptions || { total: 0, pending: 0 });
        } catch (error) {
            console.error('Stats fetch failed');
        }
    };

    const handleAssignPlan = async (e) => {
        e.preventDefault();
        try {
            // Prepare data: if it's a legacy plan string, send 'plan'. If it's a planId, send 'planId'.
            const payload = { ...assignData };
            
            // Validation
            if (!payload.plan && !payload.planId) {
                return toast.error('Please select a plan');
            }

            const response = await apiClient.post('/admin/users/assign-plan', payload);
            if (response.data.success) {
                toast.success(response.data.message);
                setAssignModalOpen(false);
                setAssignData({ email: '', plan: '', planId: '', durationMonths: 12 });
                setDurationMode('preset');
                fetchSubscriptions();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to assign plan');
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400';
            case 'PENDING': return 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
            case 'FAILED': return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
            default: return 'bg-gray-50 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400';
        }
    };

    const filteredSubs = subscriptions.filter(sub => 
        sub.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.razorpayOrderId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <CreditCard className="text-[var(--color-accent)]" />
                        Subscription Management
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor revenue, track orders, and manually assign plans to users.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => fetchSubscriptions()}
                        className="p-3 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-500 hover:text-[var(--color-accent)] transition-all shadow-sm"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button 
                        onClick={() => setAssignModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white rounded-2xl font-bold hover:opacity-90 shadow-lg shadow-[var(--color-accent)]/20 transition-all"
                    >
                        <Zap size={20} />
                        Assign Manual Plan
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {[
                    { label: 'Active Subscriptions', value: stats.total, icon: <CheckCircle />, color: 'green' },
                    { label: 'Pending Orders', value: stats.pending, icon: <Clock />, color: 'yellow' },
                    { label: 'Total Revenue', value: `₹${(subscriptions.filter(s => s.status === 'COMPLETED').reduce((acc, s) => acc + s.amount, 0)).toLocaleString()}`, icon: <Shield />, color: 'purple' }
                ].map((stat, i) => (
                    <div key={i} className="p-6 bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-${stat.color}-500/10 text-${stat.color}-500`}>
                            {stat.icon}
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by email or Order ID..."
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'COMPLETED', 'PENDING', 'FAILED'].map(s => (
                        <button 
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-5 py-3 rounded-2xl text-sm font-bold capitalize transition-all ${
                                statusFilter === s 
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md' 
                                    : 'bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {s === 'all' ? 'All Orders' : s.toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xl shadow-black/5">
                {loading ? (
                    <div className="p-20 flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-[var(--color-accent)]" size={40} />
                        <p className="text-gray-500 font-medium">Fetching Subscriptions...</p>
                    </div>
                ) : filteredSubs.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <CreditCard size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">No subscriptions found</h3>
                        <p className="text-gray-500 mt-2">Try adjusting your filters or search term.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">User</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Plan Details</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Transaction</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredSubs.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50/30 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    <Mail size={18} className="text-gray-400" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-900 dark:text-white block">
                                                        {sub.user?.firstName} {sub.user?.lastName}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{sub.user?.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                                    sub.planType === 'PRO' ? 'bg-indigo-100 text-indigo-600' :
                                                    sub.planType === 'PLUS' ? 'bg-purple-100 text-purple-600' :
                                                    'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {sub.planType}
                                                </span>
                                                <span className="font-bold text-gray-900 dark:text-white text-sm">₹{sub.amount.toLocaleString()}</span>
                                            </div>
                                            {sub.couponCode && (
                                                <p className="text-[10px] text-green-500 font-medium mt-1 flex items-center gap-1">
                                                    <Tag size={10} /> Coupon: {sub.couponCode}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-xs font-mono text-gray-500 block truncate max-w-[120px]" title={sub.razorpayOrderId}>
                                                {sub.razorpayOrderId}
                                            </span>
                                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-medium">Razorpay Order ID</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(sub.status)}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {new Date(sub.createdAt).toLocaleDateString()}
                                            </span>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Assign Plan Modal */}
            {assignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0f0f0f] w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    <Zap className="text-yellow-500" />
                                    Assign Manual Plan
                                </h2>
                                <button onClick={() => setAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAssignPlan} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Student Email</label>
                                    <input 
                                        type="email" 
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                                        placeholder="user@example.com"
                                        value={assignData.email}
                                        onChange={(e) => setAssignData({...assignData, email: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Select Plan</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] appearance-none font-bold"
                                                value={assignData.planId || assignData.plan}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Check if it's a planId (usually UUID or MongoDB ID length)
                                                    if (val.length > 10) {
                                                        setAssignData({...assignData, planId: val, plan: ''});
                                                    } else {
                                                        setAssignData({...assignData, planId: '', plan: val});
                                                    }
                                                }}
                                                required
                                            >
                                                <option value="">Choose a plan...</option>
                                                <optgroup label="Created Plans">
                                                    {plans.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Legacy/Simple Roles">
                                                    <option value="BASIC">BASIC</option>
                                                    <option value="PLUS">PLUS</option>
                                                    <option value="PRO">PRO</option>
                                                </optgroup>
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <ChevronDown size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2 ml-1">
                                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">Duration</label>
                                            <button 
                                                type="button"
                                                onClick={() => setDurationMode(durationMode === 'preset' ? 'custom' : 'preset')}
                                                className="text-[10px] font-black uppercase text-[var(--color-accent)] hover:underline"
                                            >
                                                {durationMode === 'preset' ? 'Custom Months' : 'Preset Options'}
                                            </button>
                                        </div>
                                        
                                        {durationMode === 'preset' ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { label: '1 Mo', value: 1 },
                                                    { label: '3 Mo', value: 3 },
                                                    { label: '6 Mo', value: 6 },
                                                    { label: '1 Year', value: 12 },
                                                    { label: '2 Year', value: 24 },
                                                    { label: 'Lifetime', value: 1200 }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setAssignData({...assignData, durationMonths: opt.value})}
                                                        className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                                                            assignData.durationMonths === opt.value
                                                                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20'
                                                                : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-[var(--color-accent)]/50'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] font-bold"
                                                    placeholder="Enter number of months..."
                                                    value={assignData.durationMonths}
                                                    onChange={(e) => setAssignData({...assignData, durationMonths: parseInt(e.target.value) || 0})}
                                                    min="1"
                                                />
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold uppercase tracking-widest">
                                                    Months
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setAssignModalOpen(false)}
                                        className="flex-1 px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-[2] px-10 py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-2xl font-bold hover:opacity-90 shadow-xl shadow-black/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Zap size={18} />
                                        Assign Plan
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionManager;
