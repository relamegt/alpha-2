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

    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredContests = contests.filter(c => 
        !searchTerm || 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-[#111117] p-6 transition-colors">
            <div className="max-w-7xl mx-auto space-y-6">
                {view === 'create' ? (
                    <CourseContestCreator
                        onSuccess={handleCreateSuccess}
                        onBack={() => { setView('list'); setEditingContest(null); }}
                        initialData={editingContest}
                    />
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-[var(--color-bg-card)] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors gap-4">
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Course Contests</h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Standalone contests for specific course subsections.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search contests..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                <button
                                    onClick={() => { setEditingContest(null); setView('create'); }}
                                    className="btn-primary flex items-center justify-center gap-2"
                                >
                                    <Plus size={20} /> New Contest
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="spinner"></div>
                            </div>
                        ) : filteredContests.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-[var(--color-bg-card)] rounded-2xl border border-dashed border-[var(--color-border-interactive)]">
                                <Trophy size={48} className="mx-auto text-gray-200 mb-4" />
                                <h3 className="text-lg font-medium">No course contests found</h3>
                                <p className="text-gray-500">Try adjusting your search or create a new contest.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredContests.map(contest => (
                                    <div key={contest.id} className="bg-white dark:bg-[var(--color-bg-card)] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                                <Trophy size={20} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleEditContest(contest)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteContest(contest.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold mb-2 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{contest.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 flex-1">{contest.description || 'No description'}</p>
                                        
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                                <div className="flex items-center gap-2 text-xs text-gray-400 uppercase font-bold tracking-widest mb-1">
                                                    <Clock size={12} /> Duration
                                                </div>
                                                <div className="font-bold">{contest.duration} mins</div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                                <div className="flex items-center gap-2 text-xs text-gray-400 uppercase font-bold tracking-widest mb-1">
                                                    <Layers size={12} /> Problems
                                                </div>
                                                <div className="font-bold">{contest.problems?.length || 0}</div>
                                            </div>
                                        </div>

                                        <Link 
                                            to={`/contests/${contest.slug || contest.id}/leaderboard?courseId=INTERNAL`}
                                            className="w-full py-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-bold rounded-xl border border-gray-100 dark:border-gray-800/50 transition-all text-center"
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








