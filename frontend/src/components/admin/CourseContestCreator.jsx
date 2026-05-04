import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import courseContestService from '../../services/courseContestService';
import problemService from '../../services/problemService';
import toast from 'react-hot-toast';
import CustomDropdown from '../../components/shared/CustomDropdown';
import {
    Trophy, Clock, FileText, Plus, Search, Filter, Save, Trash2, Code, ArrowLeft, Shield, Layers, CheckSquare
} from 'lucide-react';

const CourseContestCreator = ({ onSuccess, onBack, initialData }) => {
    const { user } = useAuth();
    const [existingProblems, setExistingProblems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('all');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        duration: 60,
        maxAttempts: 1,
        proctoringEnabled: true,
        tabSwitchLimit: 3,
        maxViolations: 5,
        problems: [] // Array of problem IDs/objects
    });

    useEffect(() => {
        fetchProblems();
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                duration: initialData.duration || 60,
                maxAttempts: initialData.maxAttempts || 1,
                proctoringEnabled: initialData.proctoringEnabled ?? true,
                tabSwitchLimit: initialData.tabSwitchLimit ?? 3,
                maxViolations: initialData.maxViolations ?? 5,
                problems: (initialData.problems || []).map(p => (typeof p === 'object' ? p.id : p))
            });
        }
    }, [initialData]);

    const fetchProblems = async () => {
        try {
            const data = await problemService.getAllProblems();
            setExistingProblems(data.problems || []);
        } catch (error) {
            toast.error('Failed to fetch problems');
        }
    };

    const filteredProblems = useMemo(() => {
        return existingProblems.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDifficulty = difficultyFilter === 'all' || p.difficulty === difficultyFilter;
            return matchesSearch && matchesDifficulty;
        });
    }, [existingProblems, searchQuery, difficultyFilter]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (formData.problems.length === 0) return toast.error('Add at least one problem');
        
        setLoading(true);
        try {
            if (initialData) {
                await courseContestService.updateCourseContest(initialData.id, formData);
            } else {
                await courseContestService.createCourseContest(formData);
            }
            onSuccess();
        } catch (error) {
            toast.error(error.message || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const toggleProblem = (id) => {
        setFormData(prev => ({
            ...prev,
            problems: prev.problems.includes(id) 
                ? prev.problems.filter(p => p !== id) 
                : [...prev.problems, id]
        }));
    };

    return (
        <div className="space-y-8 animate-fade-in pb-24">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
                    <Trophy className="text-indigo-600" />
                    {initialData ? 'Edit Course Contest' : 'New Course Contest'}
                </h1>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[var(--color-bg-card)] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-lg font-bold border-b border-gray-50 pb-4">
                            <FileText size={20} className="text-indigo-500" /> Basic Information
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Contest Title</label>
                                <input 
                                    type="text" required
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    className="input-field w-full"
                                    placeholder="e.g. Recursion Mastery"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Description</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="input-field w-full min-h-[120px]"
                                    placeholder="Explain the rules and topics..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 transition-colors">
                                    <label className="block text-xs font-black text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-widest">Duration (Minutes)</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input 
                                            type="number" required min="1"
                                            value={formData.duration}
                                            onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}
                                            className="input-field w-full pl-10"
                                        />
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 transition-colors">
                                    <label className="block text-xs font-black text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-widest">Max Attempts</label>
                                    <div className="relative">
                                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input 
                                            type="number" required min="1"
                                            value={formData.maxAttempts}
                                            onChange={e => setFormData({...formData, maxAttempts: parseInt(e.target.value)})}
                                            className="input-field w-full pl-10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[var(--color-bg-card)] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 text-lg font-bold border-b border-gray-50 pb-4">
                            <Shield size={20} className="text-indigo-500" /> Proctoring & Integrity
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <div>
                                <span className="font-bold block">Enable Proctoring</span>
                                <p className="text-xs text-gray-500">Auto-detect tab switching and browser focus</p>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={formData.proctoringEnabled}
                                onChange={e => setFormData({...formData, proctoringEnabled: e.target.checked})}
                                className="w-6 h-6 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                        </div>
                        {formData.proctoringEnabled && (
                            <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Tab Switch Limit</label>
                                    <input 
                                        type="number" 
                                        value={formData.tabSwitchLimit}
                                        onChange={e => setFormData({...formData, tabSwitchLimit: parseInt(e.target.value)})}
                                        className="input-field w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Max Violations</label>
                                    <input 
                                        type="number" 
                                        value={formData.maxViolations}
                                        onChange={e => setFormData({...formData, maxViolations: parseInt(e.target.value)})}
                                        className="input-field w-full"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Problem Selection */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[var(--color-bg-card)] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-[700px]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Code size={20} className="text-indigo-500" /> Problems
                            </h3>
                            <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-full font-bold">
                                {formData.problems.length} Selected
                            </span>
                        </div>

                        <div className="space-y-4 mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search problems..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="input-field w-full pl-10 py-2 text-sm"
                                />
                            </div>
                            <CustomDropdown 
                                options={[{value:'all', label: 'All Difficulties'}, {value:'Easy', label:'Easy'}, {value:'Medium', label:'Medium'}, {value:'Hard', label:'Hard'}]}
                                value={difficultyFilter}
                                onChange={setDifficultyFilter}
                                className="w-full"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {filteredProblems.map(p => (
                                <div 
                                    key={p.id}
                                    onClick={() => toggleProblem(p.id)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                                        formData.problems.includes(p.id) 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' 
                                            : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-900'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                        formData.problems.includes(p.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                        {formData.problems.includes(p.id) && <CheckSquare size={12} className="text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold truncate">{p.title}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                                                p.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : 
                                                p.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                            }`}>{p.difficulty}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{p.points} Coins</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full mt-6 btn-primary flex items-center justify-center gap-2 py-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none"
                        >
                            {loading ? <div className="spinner w-5 h-5 border-white"></div> : <><Save size={20} /> Save Contest</>}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CourseContestCreator;








