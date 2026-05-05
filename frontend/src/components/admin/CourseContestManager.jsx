import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import courseContestService from '../../services/courseContestService';
import { Trophy, Plus, Clock, Layers, Trash2, Edit, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import CourseContestCreator from './CourseContestCreator';

const CourseContestManager = () => {
    const { user } = useAuth();
    const [view, setView] = useState('list'); // 'list', 'create'
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingContest, setEditingContest] = useState(null);

    useEffect(() => {
        fetchContests();
    }, [user]);

    const fetchContests = async () => {
        try {
            setLoading(true);
            const data = await courseContestService.getAllCourseContests();
            setContests(data.contests || []);
        } catch (error) {
            console.error("Failed to fetch course contests", error);
            toast.error("Failed to fetch course contests");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSuccess = () => {
        setView('list');
        setEditingContest(null);
        fetchContests();
        toast.success(editingContest ? "Course Contest updated!" : "Course Contest created!");
    };

    const handleEditContest = (contest) => {
        setEditingContest(contest);
        setView('create');
    };

    const handleDeleteContest = async (contestId) => {
        if (window.confirm("Are you sure? This will delete the contest and ALL student submissions.")) {
            try {
                await courseContestService.deleteCourseContest(contestId);
                toast.success("Deleted successfully");
                fetchContests();
            } catch (error) {
                toast.error("Failed to delete");
            }
        }
    };

    return (
        <div className="admin-page-wrapper transition-colors">
            <div className="max-w-7xl mx-auto">
                {view === 'create' ? (
                    <CourseContestCreator
                        onSuccess={handleCreateSuccess}
                        onBack={() => { setView('list'); setEditingContest(null); }}
                        initialData={editingContest}
                    />
                ) : (
                    <div className="space-y-8">
                        <header className="page-header-container flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="page-header-title">Course Contests</h1>
                                <p className="page-header-desc">Standalone contests for specific course subsections.</p>
                            </div>
                            <button
                                onClick={() => { setEditingContest(null); setView('create'); }}
                                className="btn-primary"
                            >
                                <Plus size={18} /> New Course Contest
                            </button>
                        </header>

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="spinner"></div>
                            </div>
                        ) : contests.length === 0 ? (
                            <div className="text-center py-20 bg-[var(--color-bg-card)] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                <Trophy size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                                <h3 className="text-lg font-medium">No course contests yet</h3>
                                <p className="text-gray-500">Create a contest to add it to your courses.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {contests.map(contest => (
                                    <div key={contest.id} className="card group flex flex-col hover:border-primary-500/50 transition-all">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
                                                <Trophy size={24} />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleEditContest(contest)} className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteContest(contest.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-500 transition-colors tracking-tight">
                                                {contest.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-8 leading-relaxed">
                                                {contest.description || 'No description provided for this contest.'}
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="bg-[var(--color-bg-primary)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1.5">
                                                    <Clock size={12} /> Duration
                                                </div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{contest.duration} mins</div>
                                            </div>
                                            <div className="bg-[var(--color-bg-primary)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1.5">
                                                    <Layers size={12} /> Problems
                                                </div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{contest.problems?.length || 0} items</div>
                                            </div>
                                        </div>

                                        <Link 
                                            to={`/contests/${contest.slug || contest.id}/leaderboard?courseId=INTERNAL`}
                                            className="btn-secondary w-full"
                                        >
                                            View Statistics
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseContestManager;

