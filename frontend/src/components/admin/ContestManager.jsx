import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import contestService from '../../services/contestService';
import adminService from '../../services/adminService';
import ContestCreator from './ContestCreator';
import { Trophy, Calendar, Plus, List, ArrowLeft, Clock, Grid, Layers, Search, Filter, Trash2, Edit, Copy, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import CustomDropdown from '../shared/CustomDropdown';

const ContestManager = () => {
    const { user } = useAuth();
    const [view, setView] = useState('list'); // 'list', 'create'
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, upcoming, active, past
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('all');
    const [editingContest, setEditingContest] = useState(null);

    // Fetch batches and contests on mount
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                // 1. Fetch Batches
                let fetchedBatches = [];
                if (user.role === 'admin' || user.role === 'instructor') {
                    const response = await adminService.getAllBatches();
                    fetchedBatches = response.batches || (Array.isArray(response) ? response : []);
                }
                setBatches(fetchedBatches);

            } catch (error) {
                console.error("Initialization error", error);
            }
        };

        if (user) {
            init();
        }
    }, [user]);

    // Fetch contests whenever selectedBatchId changes
    useEffect(() => {
        fetchContests();
    }, [selectedBatchId, user]);

    const fetchContests = async () => {
        try {
            setLoading(true);
            let data;
            const batchIdParam = selectedBatchId === 'all' ? 'all' : selectedBatchId;
            data = await contestService.getContestsByBatch(batchIdParam);

            if (data && data.contests) {
                setContests(data.contests);
            } else {
                setContests([]);
            }
        } catch (error) {
            console.error("Failed to fetch contests", error);
            setContests([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSuccess = () => {
        setView('list');
        setEditingContest(null);
        fetchContests();
        toast.success(editingContest ? "Contest updated!" : "Contest created!");
    };

    const handleEditContest = (contest) => {
        setEditingContest(contest);
        setView('create');
    };

    const handleDeleteContest = async (contestId) => {
        if (window.confirm("Are you sure you want to delete this contest? ALL associated data including student submissions and leaderboard rankings will be permanently deleted. This action cannot be undone.")) {
            try {
                await contestService.deleteContest(contestId);
                toast.success("Contest deleted successfully");
                fetchContests();
            } catch (error) {
                console.error("Delete contest error", error);
                toast.error("Failed to delete contest");
            }
        }
    };

    const handleCopyLink = (e, contest) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/join/${contest.slug || contest._id}`;
        navigator.clipboard.writeText(url);
        toast.success("Global Contest link copied!");
    };

    const filteredContests = contests.filter(c => {
        let statusMatch = true;
        const now = new Date();
        const start = new Date(c.startTime);
        const end = new Date(c.endTime);

        if (filter === 'upcoming') statusMatch = now < start;
        else if (filter === 'active') statusMatch = now >= start && now <= end;
        else if (filter === 'past') statusMatch = now > end;

        return statusMatch;
    });

    return (
        <div className="admin-page-wrapper transition-colors">
            <div className="max-w-7xl mx-auto space-y-6">

                <div className="animate-fade-in-up">
                    {view === 'create' ? (
                        <ContestCreator
                            onSuccess={handleCreateSuccess}
                            batches={batches}
                            onBack={() => { setView('list'); setEditingContest(null); }}
                            initialData={editingContest}
                        />
                    ) : (
                        <div className="space-y-6">

                            {/* Header Section */}
                            <header className="page-header-container">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h1 className="page-header-title">Contests Manager</h1>
                                        <p className="page-header-desc">Manage global and batch-specific coding challenges.</p>
                                    </div>
                                    <button
                                        onClick={() => { setEditingContest(null); setView('create'); }}
                                        className="btn-primary flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} /> <span>New Contest</span>
                                    </button>
                                </div>
                            </header>

                            {/* Filters Bar */}
                            <div className="page-tabs-container">
                                <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full w-max shadow-sm">
                                    {['all', 'active', 'upcoming', 'past'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === f
                                                ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]'
                                                : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'
                                                }`}
                                        >
                                            <span className="capitalize">{f}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="w-full md:w-64">
                                        <CustomDropdown
                                            options={[
                                                { value: 'all', label: 'All Batches' },
                                                ...batches.map(batch => ({ value: batch._id, label: batch.name }))
                                            ]}
                                            value={selectedBatchId}
                                            onChange={(val) => setSelectedBatchId(val)}
                                            placeholder="Select Batch"
                                            icon={Filter}
                                        />
                                    </div>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-12"><div className="spinner"></div></div>
                            ) : filteredContests.length > 0 ? (
                                <div className="table-wrapper">
                                    <table className="admin-custom-table">
                                        <thead>
                                            <tr>
                                                <th>Contest Title</th>
                                                <th>Status</th>
                                                <th>Schedule</th>
                                                <th>Batch</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredContests.map(contest => {
                                                const now = new Date();
                                                const start = new Date(contest.startTime);
                                                const end = new Date(contest.endTime);
                                                const isActive = now >= start && now <= end;
                                                const isUpcoming = now < start;
                                                const batch = batches.find(b => b._id === contest.batchId);

                                                return (
                                                    <tr key={contest._id}>
                                                        <td className="title-td">
                                                            <div className="title-group">
                                                                <span className="main-title">{contest.title}</span>
                                                                <span className="sub-description">{contest.description?.slice(0, 80)}...</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                isActive ? 'bg-green-500/10 text-green-500' :
                                                                isUpcoming ? 'bg-blue-500/10 text-blue-500' :
                                                                'bg-gray-500/10 text-gray-500'
                                                            }`}>
                                                                {isActive ? 'Live' : isUpcoming ? 'Upcoming' : 'Ended'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="flex flex-col text-[11px] text-gray-500">
                                                                <span className="font-bold text-gray-700 dark:text-gray-300">
                                                                    {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </span>
                                                                <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="text-xs font-medium text-gray-500">
                                                                {batch ? batch.name : 'Global'}
                                                            </span>
                                                        </td>
                                                        <td className="actions-td">
                                                            <div className="action-row">
                                                                <Link to={`/contests/${contest.slug || contest._id}/leaderboard`} className="icon-btn view" title="Leaderboard">
                                                                    <Trophy size={16} />
                                                                </Link>
                                                                <button onClick={() => handleEditContest(contest)} className="icon-btn build" title="Edit">
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button onClick={() => handleDeleteContest(contest._id)} className="icon-btn delete" title="Delete">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                                {!contest.batchId && (
                                                                    <button onClick={(e) => handleCopyLink(e, contest)} className="icon-btn view" title="Copy Link">
                                                                        <Copy size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state-container">
                                    <div className="empty-state-icon">
                                        <Trophy size={32} />
                                    </div>
                                    <p className="empty-state-text">No contests found</p>
                                    <p className="empty-state-subtext">Host a competition to engage your students</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContestManager;
