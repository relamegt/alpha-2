import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Filter, MoreVertical, 
    Edit2, Trash2, Tag, Calendar, 
    CheckCircle, XCircle, Percent, 
    DollarSign, Users, ArrowRight,
    RefreshCw, ChevronLeft, ChevronRight,
    Loader2, AlertCircle
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

const CouponManager = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [editingCoupon, setEditingCoupon] = useState(null);
    
    // Form State
    const [formData, setFormData] = useState({
        code: '',
        discountPercent: 0,
        discountAmount: 0,
        minPurchase: 0,
        expiryDate: '',
        usageLimit: 0,
        isActive: true
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/coupons');
            setCoupons(response.data.coupons || []);
        } catch (error) {
            toast.error('Failed to fetch coupons');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCoupon) {
                await apiClient.put(`/coupons/${editingCoupon.id}`, formData);
                toast.success('Coupon updated successfully');
            } else {
                await apiClient.post('/coupons', formData);
                toast.success('Coupon created successfully');
            }
            setIsModalOpen(false);
            setEditingCoupon(null);
            resetForm();
            fetchCoupons();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this coupon?')) return;
        try {
            await apiClient.delete(`/coupons/${id}`);
            toast.success('Coupon deleted');
            fetchCoupons();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const toggleStatus = async (coupon) => {
        try {
            await apiClient.put(`/coupons/${coupon.id}`, { isActive: !coupon.isActive });
            toast.success(`Coupon ${!coupon.isActive ? 'activated' : 'deactivated'}`);
            fetchCoupons();
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            discountPercent: 0,
            discountAmount: 0,
            minPurchase: 0,
            expiryDate: '',
            usageLimit: 0,
            isActive: true
        });
    };

    const openEditModal = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            discountPercent: coupon.discountPercent || 0,
            discountAmount: coupon.discountAmount || 0,
            minPurchase: coupon.minPurchase || 0,
            expiryDate: coupon.expiryDate ? coupon.expiryDate.split('T')[0] : '',
            usageLimit: coupon.usageLimit || 0,
            isActive: coupon.isActive
        });
        setIsModalOpen(true);
    };

    const filteredCoupons = coupons.filter(coupon => {
        const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase());
        const isExpired = new Date(coupon.expiryDate) < new Date();
        
        if (filterType === 'active') return matchesSearch && coupon.isActive && !isExpired;
        if (filterType === 'inactive') return matchesSearch && (!coupon.isActive || isExpired);
        return matchesSearch;
    });

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Tag className="text-[var(--color-accent)]" />
                        Coupon Management
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Create and manage discount codes for courses and subscriptions.</p>
                </div>
                <button 
                    onClick={() => { resetForm(); setEditingCoupon(null); setIsModalOpen(true); }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white rounded-2xl font-bold hover:opacity-90 shadow-lg shadow-[var(--color-accent)]/20 transition-all"
                >
                    <Plus size={20} />
                    Create New Coupon
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Coupons', value: coupons.length, icon: <Tag />, color: 'blue' },
                    { label: 'Active', value: coupons.filter(c => c.isActive && new Date(c.expiryDate) > new Date()).length, icon: <CheckCircle />, color: 'green' },
                    { label: 'Total Redemptions', value: coupons.reduce((acc, c) => acc + (c.usedCount || 0), 0), icon: <Users />, color: 'purple' },
                    { label: 'Expired/Inactive', value: coupons.filter(c => !c.isActive || new Date(c.expiryDate) < new Date()).length, icon: <AlertCircle />, color: 'orange' }
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

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by coupon code..."
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'active', 'inactive'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`px-5 py-3 rounded-2xl text-sm font-bold capitalize transition-all ${
                                filterType === t 
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md' 
                                    : 'bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Coupons Table */}
            <div className="bg-white dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xl shadow-black/5">
                {loading ? (
                    <div className="p-20 flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-[var(--color-accent)]" size={40} />
                        <p className="text-gray-500 font-medium">Fetching Coupons...</p>
                    </div>
                ) : filteredCoupons.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <Tag size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">No coupons found</h3>
                        <p className="text-gray-500 mt-2">Try adjusting your search or create a new coupon.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Code</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Discount</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Usage</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Expiry</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredCoupons.map((coupon) => {
                                    const isExpired = new Date(coupon.expiryDate) < new Date();
                                    const isInactive = !coupon.isActive || isExpired;
                                    
                                    return (
                                        <tr key={coupon.id} className="hover:bg-gray-50/30 dark:hover:bg-white/[0.01] transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center font-black">
                                                        {coupon.code.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-gray-900 dark:text-white uppercase">{coupon.code}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {coupon.discountPercent ? `${coupon.discountPercent}%` : `₹${coupon.discountAmount}`}
                                                </span>
                                                <p className="text-[10px] text-gray-500 mt-0.5">Min: ₹{coupon.minPurchase}</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full max-w-[60px] overflow-hidden">
                                                        <div 
                                                            className="h-full bg-[var(--color-accent)]" 
                                                            style={{ width: `${Math.min(100, (coupon.usedCount / (coupon.usageLimit || 1)) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                        {coupon.usedCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`text-sm font-medium ${isExpired ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {new Date(coupon.expiryDate).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    isInactive 
                                                        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' 
                                                        : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                                                }`}>
                                                    {isExpired ? 'Expired' : (coupon.isActive ? 'Active' : 'Inactive')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => toggleStatus(coupon)}
                                                        title={coupon.isActive ? 'Deactivate' : 'Activate'}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            coupon.isActive 
                                                                ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' 
                                                                : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                                                        }`}
                                                    >
                                                        {coupon.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                                    </button>
                                                    <button 
                                                        onClick={() => openEditModal(coupon)}
                                                        className="p-2 text-gray-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(coupon.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0f0f0f] w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Coupon Code</label>
                                        <input 
                                            type="text" 
                                            name="code"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] font-bold uppercase tracking-wider"
                                            value={formData.code}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="e.g. SAVE50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Discount Type</label>
                                        <div className="flex gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, discountPercent: 10, discountAmount: 0 }))}
                                                className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                                                    formData.discountPercent > 0 
                                                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20' 
                                                        : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800 text-gray-500'
                                                }`}
                                            >
                                                <Percent size={14} /> Percent
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, discountAmount: 100, discountPercent: 0 }))}
                                                className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                                                    formData.discountAmount > 0 
                                                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20' 
                                                        : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800 text-gray-500'
                                                }`}
                                            >
                                                <DollarSign size={14} /> Amount
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">
                                            {formData.discountPercent > 0 ? 'Percentage' : 'Amount (₹)'}
                                        </label>
                                        <input 
                                            type="number" 
                                            name={formData.discountPercent > 0 ? 'discountPercent' : 'discountAmount'}
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                                            value={formData.discountPercent > 0 ? formData.discountPercent : formData.discountAmount}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Min Purchase (₹)</label>
                                        <input 
                                            type="number" 
                                            name="minPurchase"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                                            value={formData.minPurchase}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Expiry Date</label>
                                        <input 
                                            type="date" 
                                            name="expiryDate"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                                            value={formData.expiryDate}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Usage Limit</label>
                                        <input 
                                            type="number" 
                                            name="usageLimit"
                                            placeholder="0 for unlimited"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                                            value={formData.usageLimit}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 py-2">
                                        <input 
                                            type="checkbox" 
                                            name="isActive"
                                            id="isActive"
                                            className="w-5 h-5 rounded-lg border-gray-200 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                                            checked={formData.isActive}
                                            onChange={handleInputChange}
                                        />
                                        <label htmlFor="isActive" className="text-sm font-bold text-gray-700 dark:text-gray-300">Set as Active</label>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-2 px-10 py-4 bg-[var(--color-accent)] text-white rounded-2xl font-bold hover:opacity-90 shadow-xl shadow-[var(--color-accent)]/20 transition-all"
                                    >
                                        {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
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

export default CouponManager;
