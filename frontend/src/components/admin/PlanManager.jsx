import {
    Plus, Search, Edit2, Trash2, CheckCircle, XCircle,
    Layers, DollarSign, Clock, List, Layout, Shield, Zap, Check, X
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { toast } from 'react-hot-toast';
import { useEffect,useState } from 'react';
const PREDEFINED_FEATURES = [
    "Access to all courses",
    "New course access",
    "DSA sheets & resources",
    "Contest participation",
    "Interview experiences",
    "Articles & tutorials",
    "Community support",
    "Priority support"
];

const PlanManager = () => {
    const [plans, setPlans] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        currency: 'INR',
        durationInDays: 30,
        courseAccess: 'ALL',
        linkedCourses: [],
        features: [],
        submissionsLimit: 0,
        aiInterviewsLimit: 0,
        gstEnabled: false,
        pricingOptions: []
    });

    const [newFeature, setNewFeature] = useState('');

    useEffect(() => {
        fetchPlans();
        fetchCourses();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/plans'); // Admin endpoint for all plans
            setPlans(response.data.plans);
        } catch (error) {
            toast.error('Failed to fetch plans');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await apiClient.get('/courses');
            setCourses(response.data.courses);
        } catch (error) {
            console.error('Failed to fetch courses', error);
        }
    };

    const handleOpenModal = (plan = null) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData({
                ...plan,
                linkedCourses: plan.linkedCourses || [],
                features: plan.features || [],
                submissionsLimit: plan.submissionsLimit || plan.submissionLimit || 0,
                aiInterviewsLimit: plan.aiInterviewsLimit || 0
            });
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                currency: 'INR',
                durationInDays: 30,
                courseAccess: 'ALL',
                linkedCourses: [],
                features: [],
                isActive: true,
                aiTokensLimit: 0,
                compilerLimit: 0,
                submissionsLimit: 0,
                aiInterviewsLimit: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPlan) {
                await apiClient.put(`/plans/${editingPlan.id}`, formData);
                toast.success('Plan updated successfully');
            } else {
                await apiClient.post('/plans', formData);
                toast.success('Plan created successfully');
            }
            setIsModalOpen(false);
            fetchPlans();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving plan');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this plan?')) return;
        try {
            await apiClient.delete(`/plans/${id}`);
            toast.success('Plan deleted successfully');
            fetchPlans();
        } catch (error) {
            toast.error('Failed to delete plan');
        }
    };

    const toggleFeature = (feature) => {
        const updatedFeatures = formData.features.includes(feature)
            ? formData.features.filter(f => f !== feature)
            : [...formData.features, feature];
        setFormData({ ...formData, features: updatedFeatures });
    };

    const toggleCourse = (courseId) => {
        const updatedCourses = formData.linkedCourses.includes(courseId)
            ? formData.linkedCourses.filter(id => id !== courseId)
            : [...formData.linkedCourses, courseId];
        setFormData({ ...formData, linkedCourses: updatedCourses });
    };

    const addCustomFeature = () => {
        if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
            setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
            setNewFeature('');
        }
    };

    const removeFeature = (feature) => {
        setFormData({ ...formData, features: formData.features.filter(f => f !== feature) });
    };

    const filteredPlans = plans.filter(plan =>
        plan.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-page-wrapper transition-colors">
            <div className="space-y-8 animate-fade-in">
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-header-title flex items-center gap-3">
                            <Shield className="text-primary-600" />
                            Subscription Plans
                        </h1>
                        <p className="page-header-desc">Manage dynamic pricing and course access tiers</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Create New Plan
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Plans', value: plans.length, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Tiers', value: plans.filter(p => p.isActive).length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Currency', value: 'INR (₹)', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-[var(--color-bg-card)] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg} dark:bg-opacity-10 ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table/List View */}
            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="page-controls-bar">
                    <div className="page-search-wrapper w-full max-w-md">
                        <Search className="page-search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search plans..."
                            className="page-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                ) : filteredPlans.length === 0 ? (
                    <div className="py-20 text-center">
                        <Layout size={48} className="mx-auto text-gray-300 mb-4 opacity-20" />
                        <p className="text-gray-500 font-medium">No plans found</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="admin-custom-table">
                            <thead>
                                <tr>
                                    <th>Plan Name</th>
                                    <th>Price</th>
                                    <th>Duration</th>
                                    <th>Access</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPlans.map((plan) => (
                                    <tr key={plan.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900 dark:text-white">{plan.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{plan.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-900 dark:text-white">₹{plan.price}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                <Clock size={14} />
                                                <span className="text-sm font-medium">{Math.round(plan.durationInDays / 30)} months</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${plan.courseAccess === 'ALL'
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                }`}>
                                                {plan.courseAccess} ACCESS
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {plan.isActive ? (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                                                    <CheckCircle size={14} /> Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-gray-400 text-sm font-medium">
                                                    <XCircle size={14} /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="actions-td">
                                            <div className="action-row">
                                                <button
                                                    onClick={() => handleOpenModal(plan)}
                                                    className="icon-btn build"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(plan.id)}
                                                    className="icon-btn delete"
                                                    title="Delete"
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

            {isModalOpen && (
                <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingPlan ? 'Edit Plan' : 'Create New Subscription Plan'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Plan Name</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Pro Annual Tier"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Price (INR)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                        <input
                                            type="number" required
                                            className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="4999"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Duration (Months)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number" required
                                            disabled={formData.durationInDays >= 365000}
                                            className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none disabled:opacity-50"
                                            value={formData.durationInDays >= 365000 ? 999 : Math.round(formData.durationInDays / 30)}
                                            onChange={(e) => setFormData({ ...formData, durationInDays: parseInt(e.target.value) * 30 })}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({ ...formData, durationInDays: formData.durationInDays >= 365000 ? 365 : 365000 })}
                                            className={`px-4 rounded-xl text-xs font-bold transition-all border ${formData.durationInDays >= 365000 ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-200 dark:border-gray-800 text-gray-500'}`}
                                        >
                                            Lifetime
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Course Access</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                        value={formData.courseAccess}
                                        onChange={(e) => setFormData({ ...formData, courseAccess: e.target.value })}
                                    >
                                        <option value="ALL">All Courses</option>
                                        <option value="SPECIFIC">Specific Courses</option>
                                    </select>
                                </div>
                            </div>

                            {/* Multiple Pricing Options */}
                            <div className="p-5 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign size={14} className="text-primary-500" /> Multi-Duration Pricing Options
                                </p>
                                <div className="space-y-3">
                                    {formData.pricingOptions?.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                            <div className="flex-1 grid grid-cols-3 gap-2">
                                                <input 
                                                    type="text" placeholder="Label (e.g. 12 Months)"
                                                    className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs outline-none"
                                                    value={opt.label}
                                                    onChange={(e) => {
                                                        const newOpts = [...formData.pricingOptions];
                                                        newOpts[idx].label = e.target.value;
                                                        setFormData({...formData, pricingOptions: newOpts});
                                                    }}
                                                />
                                                <div className="relative group">
                                                    <input 
                                                        type="number" placeholder="Months"
                                                        disabled={opt.duration >= 365000}
                                                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs outline-none disabled:opacity-50"
                                                        value={opt.duration >= 365000 ? 999 : Math.round(opt.duration / 30)}
                                                        onChange={(e) => {
                                                            const newOpts = [...formData.pricingOptions];
                                                            newOpts[idx].duration = parseInt(e.target.value) * 30;
                                                            setFormData({...formData, pricingOptions: newOpts});
                                                        }}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const newOpts = [...formData.pricingOptions];
                                                            newOpts[idx].duration = opt.duration >= 365000 ? 365 : 365000;
                                                            newOpts[idx].label = newOpts[idx].duration >= 365000 ? 'Lifetime' : `${Math.round(newOpts[idx].duration / 30)} Months`;
                                                            setFormData({...formData, pricingOptions: newOpts});
                                                        }}
                                                        className={`absolute right-1 top-1 bottom-1 px-3 rounded-lg text-[9px] font-black uppercase transition-all z-10 ${opt.duration >= 365000 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                                    >
                                                        ∞
                                                    </button>
                                                </div>
                                                <input 
                                                    type="number" placeholder="Price (INR)"
                                                    className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs outline-none font-bold"
                                                    value={opt.price}
                                                    onChange={(e) => {
                                                        const newOpts = [...formData.pricingOptions];
                                                        newOpts[idx].price = parseFloat(e.target.value);
                                                        setFormData({...formData, pricingOptions: newOpts});
                                                    }}
                                                />
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({...formData, pricingOptions: formData.pricingOptions.filter((_, i) => i !== idx)})}
                                                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-1.5 rounded-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, pricingOptions: [...(formData.pricingOptions || []), { label: '', duration: 30, price: 0 }]})}
                                        className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-400 hover:text-primary-600 hover:border-primary-600/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} /> Add Pricing Option
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                                <textarea
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none min-h-[100px]"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief summary of what this plan offers..."
                                />
                            </div>

                            {/* Features Section */}
                            <div className="space-y-4">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <List size={16} /> Select Plan Features
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {PREDEFINED_FEATURES.map((feature, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => toggleFeature(feature)}
                                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${formData.features.includes(feature)
                                                    ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
                                                    : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            {feature}
                                            {formData.features.includes(feature) && <Check size={16} />}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Features */}
                                <div className="pt-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Custom Features</label>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl outline-none text-sm"
                                            placeholder="Type custom feature..."
                                            value={newFeature}
                                            onChange={(e) => setNewFeature(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomFeature())}
                                        />
                                        <button
                                            type="button"
                                            onClick={addCustomFeature}
                                            className="px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.features.filter(f => !PREDEFINED_FEATURES.includes(f)).map((feature, idx) => (
                                            <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium border border-amber-100 dark:border-amber-500/20">
                                                {feature}
                                                <button type="button" onClick={() => removeFeature(feature)} className="hover:text-amber-900 dark:hover:text-white">
                                                    <Plus size={12} className="rotate-45" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Course Selection (Only if SPECIFIC access) */}
                            {formData.courseAccess === 'SPECIFIC' && (
                                <div className="space-y-4 p-5 bg-blue-50/50 dark:bg-blue-900/5 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Layout size={16} className="text-blue-500" /> Select Linked Courses
                                    </label>
                                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {courses.map((course) => (
                                            <button
                                                key={course.id}
                                                type="button"
                                                onClick={() => toggleCourse(course.id)}
                                                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${formData.linkedCourses.includes(course.id)
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-800 flex-shrink-0 overflow-hidden">
                                                        {course.thumbnailUrl && <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                                                    </div>
                                                    <span className="truncate max-w-[200px]">{course.title}</span>
                                                </div>
                                                {formData.linkedCourses.includes(course.id) && <CheckCircle size={16} />}
                                            </button>
                                        ))}
                                        {courses.length === 0 && <p className="text-center text-gray-400 py-4 text-xs">No courses available</p>}
                                    </div>
                                    <p className="text-[10px] text-gray-500">Users on this plan will only have access to the {formData.linkedCourses.length} courses selected above.</p>
                                </div>
                            )}

                            {/* Limits Section */}
                            <div className="p-5 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={14} className="text-amber-500" /> Daily Usage Limits
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { label: 'AI Tokens', key: 'aiTokensLimit' },
                                        { label: 'Compiler Runs', key: 'compilerLimit' },
                                        { label: 'Submissions', key: 'submissionsLimit' },
                                        { label: 'AI Interviews', key: 'aiInterviewsLimit' },
                                    ].map(limit => (
                                        <div key={limit.key} className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500">{limit.label}</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500"
                                                value={formData[limit.key]}
                                                onChange={(e) => setFormData({ ...formData, [limit.key]: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    ))}
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
                                        Active Plan
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formData.gstEnabled}
                                            onChange={(e) => setFormData({ ...formData, gstEnabled: e.target.checked })}
                                        />
                                        <div className={`w-10 h-5 rounded-full transition-colors ${formData.gstEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                                        <div className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.gstEnabled ? 'translate-x-5' : ''}`} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                        Apply GST (18%)
                                    </span>
                                </label>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    {editingPlan ? 'Update Plan' : 'Create Plan'}
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

export default PlanManager;
