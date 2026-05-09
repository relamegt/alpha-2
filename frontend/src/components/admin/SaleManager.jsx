import {
    Plus, Search, Edit2, Trash2, CheckCircle, XCircle,
    Spotlight, Calendar, Type, Link as LinkIcon, Palette, Eye
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { toast } from 'react-hot-toast';
import { useEffect, useState } from 'react';
const SaleManager = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        buttonText: 'Upgrade Now',
        buttonLink: '/pricing',
        endTime: '',
        isActive: true,
        couponCode: ''
    });

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/sales/active-banner');
            // active-banner returns a single banner or null, but we might want a list for admin
            // For now, let's assume we fetch all banners if we had an admin endpoint
            // Since we only have upsert/delete, we'll treat it as managing the one active banner
            if (response.data.banner) {
                setBanners([response.data.banner]);
            } else {
                setBanners([]);
            }
        } catch (error) {
            console.error('Failed to fetch banners', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (banner = null) => {
        if (banner) {
            setEditingBanner(banner);
            setFormData({
                ...banner,
                endTime: banner.endTime ? new Date(banner.endTime).toISOString().slice(0, 16) : ''
            });
        } else {
            setEditingBanner(null);
            setFormData({
                title: '',
                subtitle: '',
                buttonText: 'Upgrade Now',
                buttonLink: '/pricing',
                endTime: '',
                isActive: true,
                couponCode: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await apiClient.post('/sales/upsert', formData);
            toast.success('Sale banner saved successfully');
            setIsModalOpen(false);
            fetchBanners();
        } catch (error) {
            toast.error('Failed to save sale banner');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this banner?')) return;
        try {
            await apiClient.delete(`/sales/${id}`);
            toast.success('Banner removed');
            fetchBanners();
        } catch (error) {
            toast.error('Failed to remove banner');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Spotlight className="text-amber-500 fill-amber-500" />
                        Flash Sales & Banners
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Configure global promotion banners with countdown timers</p>
                </div>
                {banners.length === 0 && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-600/20 active:scale-95"
                    >
                        <Plus size={20} />
                        Create Flash Sale
                    </button>
                )}
            </div>

            {/* Live Preview of active banner */}
            {banners.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Eye size={14} /> Live Banner Preview
                    </h2>
                    <div
                        className="w-full py-3 px-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-500 bg-[#7d63f2] text-white"
                    >
                        <div className="flex-1 flex items-center gap-4 min-w-0">
                            <div className="animate-pulse hidden sm:block shrink-0">
                                <Spotlight size={24} className="text-white" fill="white" />
                            </div>
                            <div className="flex items-baseline gap-2 min-w-0 truncate">
                                <h3 className="text-lg font-bold text-white shrink-0">{banners[0].title}</h3>
                                {banners[0].subtitle && (
                                    <p className="text-sm text-white/70 font-semibold hidden md:block truncate">{banners[0].subtitle}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex-none flex items-center gap-3">
                            {['Day', 'Hour', 'Minute', 'Second'].map((label, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg border border-white/10">
                                    <span className="text-[10px] font-bold text-white/50">{label}</span>
                                    <span className="text-sm font-bold text-white">00</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex-1 flex items-center justify-end gap-4">
                            {banners[0].couponCode && (
                                <div className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-xl border border-white/20 shrink-0">
                                    <span className="opacity-70">Use Code:</span>
                                    <span className="ml-2 text-amber-400">{banners[0].couponCode}</span>
                                </div>
                            )}
                            <button 
                                className="px-6 py-2 bg-white rounded-2xl font-bold text-[13px] shadow-lg shrink-0"
                                style={{ backgroundColor: 'white' }}
                            >
                                <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                                    {banners[0].buttonText}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* List View */}
            <div className="bg-white dark:bg-[#181820] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white">Active Promotions</h3>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                ) : banners.length === 0 ? (
                    <div className="py-20 text-center">
                        <Spotlight size={48} className="mx-auto text-gray-300 mb-4 opacity-20" />
                        <p className="text-gray-500 font-medium">No active sale banners</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                                    <th className="px-6 py-4">Title & Subtitle</th>
                                    <th className="px-6 py-4">Expiry</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {banners.map((banner) => (
                                    <tr key={banner.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900 dark:text-white">{banner.title}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{banner.subtitle}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                <Calendar size={14} />
                                                <span className="text-sm font-medium">
                                                    {banner.endTime ? new Date(banner.endTime).toLocaleString() : 'Permanent'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {banner.isActive ? (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                                                    <CheckCircle size={14} /> Live
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-gray-400 text-sm font-medium">
                                                    <XCircle size={14} /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(banner)}
                                                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(banner.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#181820] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-[#181820] z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingBanner ? 'Edit Sale Banner' : 'Create New Flash Sale'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Type size={14} /> Banner Title
                                    </label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. MEGA SUMMER SALE! 🔥"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Calendar size={14} /> End Date & Time
                                    </label>
                                    <input
                                        type="datetime-local" required
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>

                             <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Subtitle / Offer Text <span className="text-xs font-normal opacity-50">(Optional)</span></label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                    value={formData.subtitle}
                                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                    placeholder="Get 50% OFF on all PRO plans until midnight!"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Spotlight size={14} className="text-amber-500" /> Optional Coupon Code
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-amber-500/50 transition-all outline-none font-mono tracking-widest"
                                    value={formData.couponCode}
                                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                                    placeholder="e.g. FLASH50"
                                />
                                <p className="text-[10px] text-gray-500">This code will be displayed prominently on the banner for students to use.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Button Text</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl outline-none"
                                        value={formData.buttonText}
                                        onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <LinkIcon size={14} /> Button Link
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl outline-none"
                                        value={formData.buttonLink}
                                        onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <div className={`w-10 h-5 rounded-full transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                                        <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.isActive ? 'translate-x-5' : ''}`} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                        Banner Visible
                                    </span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20 active:scale-95"
                                >
                                    Save Flash Sale
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaleManager;
