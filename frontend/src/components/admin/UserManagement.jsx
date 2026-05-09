import { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';
import {
    Users,
    UserPlus,
    Trash2,
    Upload,
    Search,
    Shield,
    Filter,
    Download,
    X,
    AlertCircle,
    CheckCircle,
    Zap
} from 'lucide-react';
import CustomDropdown from '../../components/shared/CustomDropdown';
import { useTheme } from '../../contexts/ThemeContext';

const UserManagement = () => {
    const [viewMode, setViewMode] = useState('batch'); // 'batch', 'admin', or 'subscription'
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [users, setUsers] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [availableInstructors, setAvailableInstructors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');


    const fetchAvailableInstructors = async () => {
        try {
            const data = await adminService.getAllUsers({ role: 'instructor' });
            setAvailableInstructors(data.users);
        } catch (error) {
            console.error('Failed to fetch instructors', error);
        }
    };

    // Modals
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);

    const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'bulk'

    const [singleUserData, setSingleUserData] = useState({
        email: '',
        role: 'student',
    });

    const [adminFormData, setAdminFormData] = useState({
        email: '',
    });

    const [bulkUploadData, setBulkUploadData] = useState({
        file: null,
        role: 'student',
    });

    const [planFormData, setPlanFormData] = useState({
        email: '',
        planId: 'BASIC',
        durationMonths: 1
    });

    useEffect(() => {
        fetchBatches();
    }, []);

    useEffect(() => {
        if (viewMode === 'batch' && selectedBatch) {
            fetchBatchUsers();
        } else if (viewMode === 'admin') {
            fetchAdmins();
        }
    }, [selectedBatch, viewMode]);

    const fetchBatches = async () => {
        try {
            const data = await adminService.getAllBatches();
            setBatches(data.batches.filter((b) => b.status === 'active'));
            // Auto-select first batch if available and none selected
            if (data.batches.length > 0 && !selectedBatch) {
                // optional: setSelectedBatch(data.batches[0]._id);
            }
        } catch (error) {
            toast.error('Failed to fetch batches');
        }
    };

    const fetchBatchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getBatchUsers(selectedBatch);
            setUsers(data.users);
        } catch (error) {
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const data = await adminService.getAllUsers({ role: 'admin' });
            setAdmins(data.users);
        } catch (error) {
            toast.error('Failed to fetch admins');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSingleUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await adminService.addUserToBatch(selectedBatch, singleUserData);
            toast.success(response.message);
            toast(`Temp Password: ${response.user.tempPassword}`, { duration: 10000 });
            setShowAddUserModal(false);
            setSingleUserData({ email: '', role: 'student' });
            fetchBatchUsers();
        } catch (error) {
            toast.error(error.message || 'Failed to add user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await adminService.createAdminUser(adminFormData.email);
            toast.success(response.message);
            toast(`Temp Password: ${response.user.tempPassword}`, { duration: 10000 });
            setShowAddAdminModal(false);
            setAdminFormData({ email: '' });
            fetchAdmins();
        } catch (error) {
            toast.error(error.message || 'Failed to create admin');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignPlan = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await adminService.assignPlan(planFormData);
            toast.success(response.message);
            setShowAssignPlanModal(false);
            setPlanFormData({ email: '', planId: 'BASIC', durationMonths: 1 });
            if (viewMode === 'batch') fetchBatchUsers();
        } catch (error) {
            toast.error(error.message || 'Failed to assign plan');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAdmin = async (adminId, email) => {
        if (!window.confirm(`Are you sure you want to remove admin access for ${email}? This action cannot be undone.`)) {
            return;
        }

        try {
            // Assuming adminService has a deleteUser function or similar. 
            // If not, we might need to implement it. Usually it's `deleteUser` or `removeUser`.
            // adminService.js likely has deleteUser(userId). Let's check or assume standard crud.
            // If strictly "delete other admins", we ensure we don't delete self? The backend usually handles self-deletion checks.
            await adminService.deleteUser(adminId);
            toast.success('Admin removed successfully');
            fetchAdmins();
        } catch (error) {
            toast.error(error.message || 'Failed to remove admin');
        }
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (!bulkUploadData.file) {
            toast.error('Please select a CSV file');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await adminService.bulkAddUsersToBatch(
                selectedBatch,
                bulkUploadData.file,
                bulkUploadData.role
            );

            toast.success(response.message);

            if (response.created?.length > 0) {
                console.log('Created users:', response.created);
            }

            if (response.errors?.length > 0) {
                toast.error(`${response.errors.length} errors occurred. Check console.`);
                console.error('Upload errors:', response.errors);
            }

            setShowBulkUploadModal(false);
            setBulkUploadData({ file: null, role: 'student' });
            fetchBatchUsers();
        } catch (error) {
            toast.error(error.message || 'Bulk upload failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveUser = async (userId, userName) => {
        if (!window.confirm(`Remove user "${userName}"? This will permanently delete their account and all data.`)) {
            return;
        }

        try {
            await adminService.removeUserFromBatch(selectedBatch, userId);
            toast.success('User removed successfully');
            fetchBatchUsers();
        } catch (error) {
            toast.error(error.message || 'Failed to remove user');
        }
    };

    const downloadSampleCSV = () => {
        const csv = 'email\nstudent1@example.com\nstudent2@example.com\nstudent3@example.com';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_users.csv';
        a.click();
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Prepare options for CustomDropdown
    const batchOptions = batches.map(b => ({ value: b._id, label: b.name }));

    return (
        <div className="admin-page-wrapper">
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">User Management</h1>
                        <p className="page-header-desc">Manage students, instructors, and system administrators</p>
                    </div>

                    <div className="page-tabs-container !m-0">
                        <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full w-max shadow-sm">
                            <button
                                onClick={() => setViewMode('batch')}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'batch'
                                        ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]'
                                        : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'
                                    }`}
                            >
                                <Users size={16} />
                                Batch Users
                            </button>
                            <button
                                onClick={() => setViewMode('admin')}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'admin'
                                        ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]'
                                        : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'
                                    }`}
                            >
                                <Shield size={16} />
                                System Admins
                            </button>
                            <button
                                onClick={() => setViewMode('subscription')}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'subscription'
                                        ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]'
                                        : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'
                                    }`}
                            >
                                <Zap size={16} />
                                Subscriptions
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {viewMode === 'batch' ? (
                <div className="space-y-6">
                    <div className="bg-[var(--color-bg-card)] p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-end justify-between border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="w-full md:w-80 space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">Select Batch</label>
                            <CustomDropdown
                                options={batchOptions}
                                value={selectedBatch}
                                onChange={setSelectedBatch}
                                placeholder="Select a Batch"
                                icon={Filter}
                            />
                        </div>

                        {selectedBatch && (
                            <div className="flex flex-wrap gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => {
                                        setUploadMode('single');
                                        setShowAddUserModal(true);
                                        fetchAvailableInstructors();
                                    }}
                                    className="btn-primary flex items-center gap-2 text-sm"
                                >
                                    <UserPlus size={18} />
                                    Add User
                                </button>
                                <button
                                    onClick={() => {
                                        setUploadMode('bulk');
                                        setShowBulkUploadModal(true);
                                    }}
                                    className="btn-secondary flex items-center gap-2 text-sm"
                                >
                                    <Upload size={18} />
                                    Bulk Upload
                                </button>
                                <button
                                    onClick={downloadSampleCSV}
                                    className="btn-secondary p-2.5"
                                    title="Download Sample CSV"
                                >
                                    <Download size={20} />
                                </button>
                            </div>
                        )}
                    </div>

                    {selectedBatch && (
                        <div className="bg-[var(--color-bg-card)] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 dark:bg-[var(--color-bg-card)]/[0.02]">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    Batch Members
                                    <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs rounded-full border border-blue-100 dark:border-blue-900/50">{users.length}</span>
                                </h2>
                                <div className="page-search-wrapper">
                                    <Search size={16} className="page-search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        className="page-search-input"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-16">
                                    <div className="spinner border-t-blue-500 border-2 w-8 h-8"></div>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="empty-state-container">
                                    <div className="empty-state-icon">
                                        <Users size={32} />
                                    </div>
                                    <p className="empty-state-text">No users found</p>
                                    <p className="empty-state-subtext">Add students or instructors to this batch.</p>
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table className="admin-custom-table">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Role</th>
                                                <th>Status</th>
                                                <th>Profile</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map((user) => (
                                                <tr key={user.id || user._id}>
                                                    <td className="title-td">
                                                        <div className="title-group">
                                                            <span className="main-title">
                                                                {user.firstName && user.lastName
                                                                    ? `${user.firstName} ${user.lastName}`
                                                                    : <span className="text-gray-400 dark:text-gray-500 italic">No Name Set</span>}
                                                            </span>
                                                            <span className="sub-description">{user.email}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${user.role === 'instructor'
                                                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/50'
                                                            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
                                                            }`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                                                            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/50'
                                                            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50'
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                            {user.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {user.isFirstLogin ? (
                                                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded w-fit border border-amber-100 dark:border-amber-900/50">
                                                                <AlertCircle size={14} />
                                                                <span>Pending Login</span>
                                                            </div>
                                                        ) : user.profileCompleted ? (
                                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded w-fit border border-emerald-100 dark:border-emerald-900/50">
                                                                <CheckCircle size={14} />
                                                                <span>Complete</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-gray-500 text-sm italic">Incomplete</span>
                                                        )}
                                                    </td>
                                                    <td className="actions-td">
                                                        <div className="action-row">
                                                            <button
                                                                onClick={() =>
                                                                    handleRemoveUser(
                                                                        user.id || user._id,
                                                                        user.firstName || user.email
                                                                    )
                                                                }
                                                                className="icon-btn delete"
                                                                title="Remove User"
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
                    )}
                </div>
            ) : viewMode === 'admin' ? (
                /* Admin Management View */
                <div className="space-y-6">
                    <div className="bg-[var(--color-bg-card)] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">System Administrators</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage users with elevated privileges</p>
                        </div>
                        <button
                            onClick={() => setShowAddAdminModal(true)}
                            className="btn-primary flex items-center gap-2 text-sm"
                        >
                            <UserPlus size={18} />
                            Create New Admin
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="spinner border-indigo-500"></div>
                        </div>
                    ) : admins.length === 0 ? (
                        <div className="empty-state-container">
                            <div className="empty-state-icon">
                                <Shield size={32} />
                            </div>
                            <p className="empty-state-text">No admins found</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="admin-custom-table">
                                <thead>
                                    <tr>
                                        <th>Admin</th>
                                        <th>Status</th>
                                        <th>Last Login</th>
                                        <th>Access Level</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.map((admin) => (
                                        <tr key={admin.id || admin._id}>
                                            <td className="title-td">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-50 dark:border-indigo-800 shadow-sm">
                                                        {admin.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="title-group">
                                                        <span className="main-title">
                                                            {admin.firstName ? `${admin.firstName} ${admin.lastName}` : 'Unkown Name'}
                                                        </span>
                                                        <span className="sub-description">{admin.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${admin.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                                    {admin.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="flex items-center gap-1.5 text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-full w-fit border border-indigo-100 dark:border-indigo-800">
                                                    <Shield size={12} />
                                                    Full Access
                                                </span>
                                            </td>
                                            <td className="actions-td">
                                                <div className="action-row">
                                                    <button
                                                        onClick={() => handleDeleteAdmin(admin.id || admin._id, admin.email)}
                                                        className="icon-btn delete"
                                                        title="Remove Admin Access"
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
            ) : (
                /* Subscription Management View */
                <div className="space-y-6">
                    <div className="bg-[var(--color-bg-card)] p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Zap size={120} />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Subscription & Financial Aid</h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
                                Manually assign premium plans to students for financial aid, scholarships, or promotional purposes. 
                                This bypasses payment requirements and grants instant access to all premium features.
                            </p>
                            <button
                                onClick={() => setShowAssignPlanModal(true)}
                                className="btn-primary mt-8 flex items-center gap-2 px-8 py-3 rounded-2xl shadow-lg shadow-blue-500/20"
                            >
                                <Zap size={18} className="fill-current" />
                                Assign Premium Plan
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50/50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/50">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-4">
                                <Users size={20} />
                            </div>
                            <h3 className="font-bold text-blue-900 dark:text-blue-200">User Identification</h3>
                            <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-2">Assign plans using registered email addresses. Users will receive limits as per the selected tier.</p>
                        </div>
                        <div className="bg-purple-50/50 dark:bg-purple-900/20 p-6 rounded-3xl border border-purple-100 dark:border-purple-900/50">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 flex items-center justify-center mb-4">
                                <Zap size={20} />
                            </div>
                            <h3 className="font-bold text-purple-900 dark:text-purple-200">Instant Activation</h3>
                            <p className="text-xs text-purple-700/70 dark:text-purple-400/70 mt-2">Limits (AI Tokens, Compiler Runs) are updated immediately. Usage counters are reset upon assignment.</p>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/50">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-4">
                                <Shield size={20} />
                            </div>
                            <h3 className="font-bold text-emerald-900 dark:text-emerald-200">Access Control</h3>
                            <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-2">Subscribed users gain access to all courses automatically via the platform's global access guard.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Single User Modal */}
            {showAddUserModal && (
                <div className="modal-backdrop" onClick={() => setShowAddUserModal(false)}>
                    <div className="modal-content p-0" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[var(--color-bg-card)]/[0.02] rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <UserPlus size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add User</h2>
                            </div>
                            <button
                                onClick={() => setShowAddUserModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-[var(--color-bg-card)] rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleAddSingleUser} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={singleUserData.email}
                                        onChange={(e) =>
                                            setSingleUserData({ ...singleUserData, email: e.target.value })
                                        }
                                        className="input-field w-full dark:bg-[var(--color-bg-primary)] dark:border-gray-800 dark:text-gray-100"
                                        placeholder="user@example.com"
                                        required
                                        list={singleUserData.role === 'instructor' ? "instructor-list" : undefined}
                                    />
                                    {singleUserData.role === 'instructor' && (
                                        <datalist id="instructor-list">
                                            {availableInstructors.map(inst => (
                                                <option key={inst._id} value={inst.email}>
                                                    {inst.firstName} {inst.lastName} ({inst.email})
                                                </option>
                                            ))}
                                        </datalist>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Role <span className="text-red-500">*</span>
                                    </label>
                                    <CustomDropdown
                                        options={[
                                            { value: 'student', label: 'Student' },
                                            { value: 'instructor', label: 'Instructor' }
                                        ]}
                                        value={singleUserData.role}
                                        onChange={(val) => setSingleUserData({ ...singleUserData, role: val })}
                                    />
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 text-sm flex gap-3">
                                    <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <p className="text-amber-900 dark:text-amber-200 font-medium">Temporary Password</p>
                                        <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                                            A temporary password will be generated and shown after creation. Please share it with the user securely.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-[var(--color-border-interactive)]">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddUserModal(false)}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Adding...
                                            </>
                                        ) : 'Add User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Admin Modal */}
            {showAddAdminModal && (
                <div className="modal-backdrop" onClick={() => setShowAddAdminModal(false)}>
                    <div className="modal-content p-0" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                    <Shield size={20} />
                                </div>
                                <h2 className="modal-title">Create Admin</h2>
                            </div>
                            <button
                                onClick={() => setShowAddAdminModal(false)}
                                className="modal-close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAdmin} className="flex flex-col flex-1 overflow-hidden">
                            <div className="modal-body space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Admin Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={adminFormData.email}
                                        onChange={(e) =>
                                            setAdminFormData({ ...adminFormData, email: e.target.value })
                                        }
                                        className="input-field w-full dark:bg-[var(--color-bg-primary)] dark:border-gray-800 dark:text-gray-100"
                                        placeholder="admin@example.com"
                                        required
                                    />
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4 text-sm flex gap-3">
                                    <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <p className="text-red-900 dark:text-red-200 font-medium">Elevated Privileges</p>
                                        <p className="text-red-700 dark:text-red-400 text-xs mt-0.5">
                                            This user will have <strong>full system access</strong>, including user management, content creation, and system settings.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setShowAddAdminModal(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkUploadModal && (
                <div className="modal-backdrop" onClick={() => setShowBulkUploadModal(false)}>
                    <div className="modal-content p-0" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <Upload size={20} />
                                </div>
                                <h2 className="modal-title">Bulk Upload</h2>
                            </div>
                            <button
                                onClick={() => setShowBulkUploadModal(false)}
                                className="modal-close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleBulkUpload} className="flex flex-col flex-1 overflow-hidden">
                            <div className="modal-body space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Upload CSV File <span className="text-red-500">*</span>
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) =>
                                                setBulkUploadData({
                                                    ...bulkUploadData,
                                                    file: e.target.files[0],
                                                })
                                            }
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            required
                                        />
                                        <div className="pointer-events-none">
                                            <Upload className="w-10 h-10 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                                            {bulkUploadData.file ? (
                                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{bulkUploadData.file.name}</p>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload or drag and drop</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">CSV files only</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Role <span className="text-red-500">*</span>
                                    </label>
                                    <CustomDropdown
                                        options={[
                                            { value: 'student', label: 'Student' },
                                            { value: 'instructor', label: 'Instructor' }
                                        ]}
                                        value={bulkUploadData.role}
                                        onChange={(val) => setBulkUploadData({ ...bulkUploadData, role: val })}
                                    />
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 text-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-blue-900 dark:text-blue-200 font-bold flex items-center gap-2">
                                            <Upload size={14} /> CSV Format Required:
                                        </p>
                                        <button
                                            type="button"
                                            onClick={downloadSampleCSV}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                                        >
                                            Download Sample
                                        </button>
                                    </div>
                                    <code className="block bg-[var(--color-bg-card)] p-3 rounded border border-blue-100 dark:border-blue-900/50 text-gray-600 dark:text-gray-400 font-mono text-xs shadow-sm">
                                        email<br />
                                        student1@example.com<br />
                                        student2@example.com
                                    </code>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkUploadModal(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Uploading...' : 'Upload Users'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Plan Modal */}
            {showAssignPlanModal && (
                <div className="modal-backdrop" onClick={() => setShowAssignPlanModal(false)}>
                    <div className="modal-content p-0" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <Zap size={20} />
                                </div>
                                <h2 className="modal-title">Assign Plan</h2>
                            </div>
                            <button onClick={() => setShowAssignPlanModal(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAssignPlan} className="flex flex-col flex-1 overflow-hidden">
                            <div className="modal-body space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        User Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={planFormData.email}
                                        onChange={(e) => setPlanFormData({ ...planFormData, email: e.target.value })}
                                        className="input-field w-full dark:bg-[var(--color-bg-primary)] dark:border-gray-800 dark:text-gray-100"
                                        placeholder="student@example.com"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Plan Tier <span className="text-red-500">*</span>
                                        </label>
                                        <CustomDropdown
                                            options={[
                                                { value: 'BASIC', label: 'Basic Plan' },
                                                { value: 'PLUS', label: 'Plus Plan' },
                                                { value: 'PRO', label: 'Pro Plan' },
                                                { value: 'FREE', label: 'Free Plan' }
                                            ]}
                                            value={planFormData.planId}
                                            onChange={(val) => setPlanFormData({ ...planFormData, planId: val })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Duration (Months)
                                        </label>
                                        <input
                                            type="number"
                                            value={planFormData.durationMonths}
                                            onChange={(e) => setPlanFormData({ ...planFormData, durationMonths: parseInt(e.target.value) })}
                                            className="input-field w-full dark:bg-[var(--color-bg-primary)] dark:border-gray-800 dark:text-gray-100"
                                            min="1"
                                            disabled={planFormData.planId === 'FREE'}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowAssignPlanModal(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Assigning...' : 'Assign Plan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;













