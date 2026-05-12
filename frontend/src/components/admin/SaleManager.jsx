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
        <div className="admin-page-wrapper">
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">Flash Sales & Banners</h1>
                        <p className="page-header-desc">Configure global promotion banners with countdown timers</p>
                    </div>
                    {banners.length === 0 && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus size={18} />
                            <span>Create Flash Sale</span>
                        </button>
                    )}
                </div>
            </header>

            {/* List View */}
            <div className="table-wrapper mt-8">
                <table className="admin-custom-table">
                    <thead>
                        <tr>
                            <th>Title & Subtitle</th>
                            <th>Expiry</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="text-center py-10"><div className="spinner"></div></td></tr>
                        ) : banners.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-10 text-gray-500">No active sale banners</td></tr>
                        ) : (
                            banners.map((banner) => (
                                <tr key={banner.id}>
                                    <td className="title-td">
                                        <div className="title-group">
                                            <span className="main-title">{banner.title}</span>
                                            <span className="sub-description">{banner.subtitle}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                                            <Calendar size={12} />
                                            <span>
                                                {banner.endTime ? new Date(banner.endTime).toLocaleString() : 'Permanent'}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${banner.isActive 
                                            ? 'bg-green-500/10 text-green-500' 
                                            : 'bg-gray-500/10 text-gray-500'
                                        }`}>
                                            {banner.isActive ? 'Live' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="actions-td">
                                        <div className="action-row">
                                            <button
                                                onClick={() => handleOpenModal(banner)}
                                                className="icon-btn build"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(banner.id)}
                                                className="icon-btn delete"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingBanner ? 'Edit Sale Banner' : 'Create New Flash Sale'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="modal-close">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-gray-500">Banner Title</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none font-bold"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. MEGA SUMMER SALE! 🔥"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-gray-500">End Date & Time</label>
                                    <input
                                        type="datetime-local" required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>

                             <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Subtitle / Offer Text</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none"
                                    value={formData.subtitle}
                                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                    placeholder="Get 50% OFF..."
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Coupon Code</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none font-mono font-bold uppercase"
                                    value={formData.couponCode}
                                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                                    placeholder="e.g. FLASH50"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-gray-500">Button Text</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none"
                                        value={formData.buttonText}
                                        onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-gray-500">Button Link</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none"
                                        value={formData.buttonLink}
                                        onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Banner Visible</span>
                                </label>
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Save Flash Sale</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaleManager;
