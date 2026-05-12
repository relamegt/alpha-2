import React, { useState, useEffect } from 'react';
import { 
    CreditCard, Search, Filter, Calendar, 
    CheckCircle, XCircle, Clock, Users, 
    ArrowUpRight, Download, Loader2, Mail,
    Zap, Shield, ExternalLink, RefreshCw, Tag, ChevronDown, X
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

    const [activeTab, setActiveTab] = useState('all'); // 'all', 'paid', 'manual'
    
    useEffect(() => {
        fetchSubscriptions();
        fetchStats();
        fetchPlans();
    }, [statusFilter]);

    // Helper to identify manual vs paid
    const isManual = (sub) => {
        const id = sub.razorpayOrderId || '';
        return id.startsWith('MANUAL_') || id.startsWith('ADMIN_ASSIGN_');
    };

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
            const response = await apiClient.get(`/admin/subscriptions?limit=150${statusParam}`);
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
            const payload = { ...assignData };
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

    const filteredSubs = subscriptions.filter(sub => {
        const matchesSearch = sub.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             sub.razorpayOrderId?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (activeTab === 'paid') return matchesSearch && !isManual(sub);
        if (activeTab === 'manual') return matchesSearch && isManual(sub);
        return matchesSearch;
    });

    const manualCount = subscriptions.filter(s => isManual(s) && s.status === 'COMPLETED').length;
    const paidRevenue = subscriptions.filter(s => !isManual(s) && s.status === 'COMPLETED').reduce((acc, s) => acc + s.amount, 0);

    return (
        <div className="admin-page-wrapper transition-colors">
            <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title flex items-center gap-3">
                            <CreditCard className="text-primary-600" />
                            Subscription Management
                        </h1>
                        <p className="page-header-desc">Monitor revenue, track orders, and manually assign plans to users.</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => fetchSubscriptions()}
                            className="p-2.5 bg-[var(--color-bg-card)] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 hover:text-primary-600 transition-all shadow-sm"
                            title="Refresh"
                        >
                            <RefreshCw size={20} />
                        </button>
                        <button 
                            onClick={() => setAssignModalOpen(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Zap size={18} />
                            <span>Assign Manual Plan</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Paid Revenue', value: `₹${paidRevenue.toLocaleString()}`, icon: <Shield />, color: 'purple' },
                    { label: 'Manual Allotments', value: manualCount, icon: <Users />, color: 'blue' },
                    { label: 'Active (Paid)', value: stats.total - manualCount, icon: <CheckCircle />, color: 'green' },
                    { label: 'Pending Orders', value: stats.pending, icon: <Clock />, color: 'yellow' }
                ].map((stat, i) => (
                    <div key={i} className="p-6 bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-${stat.color}-500/10 text-${stat.color}-500`}>
                            {stat.icon}
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Tab Switcher & Filters */}
            <div className="space-y-4 mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="page-tab-container overflow-x-auto custom-thin-scrollbar">
                        {[
                            { id: 'all', label: 'All Subscriptions' },
                            { id: 'paid', label: 'Standard Paid' },
                            { id: 'manual', label: 'Manual Assignments' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`page-tab-item ${activeTab === t.id ? 'active' : ''}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="page-search-wrapper w-full lg:w-96">
                        <Search className="page-search-icon" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search email or order..."
                            className="page-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 whitespace-nowrap">Filter Status</span>
                    <div className="page-tab-container overflow-x-auto custom-thin-scrollbar">
                        {['all', 'COMPLETED', 'PENDING', 'FAILED'].map(s => (
                            <button 
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`page-tab-item !px-4 !py-1.5 ${
                                    statusFilter === s 
                                        ? 'active' 
                                        : ''
                                }`}
                            >
                                <span className="text-[11px] font-bold uppercase">{s === 'all' ? 'Show All' : s}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xl shadow-black/5">
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
                <div className="table-wrapper">
                    <table className="admin-custom-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Plan Details</th>
                                <th>Transaction</th>
                                <th>Status</th>
                                <th className="text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                                {filteredSubs.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50/30 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                    <Mail size={18} className="text-gray-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-bold text-gray-900 dark:text-white block truncate">
                                                        {sub.user?.firstName || 'User'} {sub.user?.lastName || ''}
                                                    </span>
                                                    <span className="text-xs text-gray-500 block truncate">{sub.user?.email}</span>
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
                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 mt-2">
                                                 <Clock size={14} />
                                                 <span className="text-sm font-medium">
                                                     {sub.durationMonths >= 1000 ? 'LIFETIME' : `${sub.durationMonths} months`}
                                                 </span>
                                             </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 block break-all leading-relaxed" title={sub.razorpayOrderId}>
                                                {sub.razorpayOrderId}
                                            </span>
                                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-medium">Transaction ID</p>
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

            {assignModalOpen && (
                <div className="modal-backdrop" onClick={() => setAssignModalOpen(false)}>
                    <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title flex items-center gap-3">
                                <Zap className="text-yellow-500" />
                                Assign Manual Plan
                            </h2>
                            <button onClick={() => setAssignModalOpen(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAssignPlan} className="modal-body space-y-6">
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
                                                    { label: 'Lifetime', value: 120000 }
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

                                <div className="modal-footer">
                                    <button 
                                        type="button"
                                        onClick={() => setAssignModalOpen(false)}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="btn-primary"
                                    >
                                        <Zap size={18} />
                                        <span>Assign Plan</span>
                                    </button>
                                </div>
                            </form>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default SubscriptionManager;
