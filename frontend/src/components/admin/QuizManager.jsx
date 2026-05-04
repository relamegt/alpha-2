import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import quizService from '../../services/quizService';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit2, Trash2, List, FileText, X, CheckSquare, PlusCircle
} from 'lucide-react';

const QuizManager = () => {
    const { isDark } = useTheme();
    const [quizzes, setQuizzes] = useState([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        type: 'quiz',
        difficulty: 'Easy',
        points: 10,
        description: '',
        section: '',
        quizQuestions: [
            { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
        ]
    });

    useEffect(() => {
        fetchQuizzes();
    }, []);

    useEffect(() => {
        let result = quizzes.filter(q => q.type === 'quiz');
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p => p.title.toLowerCase().includes(lowerQuery));
        }
        setFilteredQuizzes(result);
    }, [quizzes, searchQuery]);

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const data = await quizService.getAll();
            setQuizzes(data.quizzes || []);
        } catch (error) {
            toast.error('Failed to fetch quizzes');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            type: 'quiz',
            difficulty: 'Easy',
            points: 10,
            description: '',
            section: '',
            quizQuestions: [
                { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
            ]
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await quizService.create(formData);
            toast.success('Quiz created');
            setShowCreateModal(false);
            resetForm();
            fetchQuizzes();
        } catch (error) {
            toast.error(error.message || 'Failed to create');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { title, type, difficulty, points, description, section, quizQuestions } = formData;
            const updatePayload = { title, type, difficulty, points, description, section, quizQuestions };
            
            await quizService.update(editingQuiz.id || editingQuiz._id, updatePayload);
            toast.success('Quiz updated');
            setShowEditModal(false);
            setEditingQuiz(null);
            resetForm();
            fetchQuizzes();
        } catch (error) {
            toast.error(error.message || 'Failed to update');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete quiz "${title}"?`)) return;
        try {
            await quizService.delete(id);
            toast.success('Deleted successfully');
            fetchQuizzes();
        } catch (error) {
            toast.error(error.message || 'Failed to delete');
        }
    };

    const addQuestion = () => {
        setFormData({
            ...formData,
            quizQuestions: [...formData.quizQuestions, { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]
        });
    };

    const removeQuestion = (idx) => {
        setFormData({
            ...formData,
            quizQuestions: formData.quizQuestions.filter((_, i) => i !== idx)
        });
    };

    const updateQuestion = (idx, field, val) => {
        const updated = [...formData.quizQuestions];
        updated[idx][field] = val;
        setFormData({ ...formData, quizQuestions: updated });
    };

    const updateOption = (qIdx, oIdx, val) => {
        const updated = [...formData.quizQuestions];
        updated[qIdx].options[oIdx] = val;
        setFormData({ ...formData, quizQuestions: updated });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <CheckSquare className="text-blue-500" />
                        Quiz Manager
                    </h1>
                    <p className="text-sm text-gray-500">Manage interactive quizzes and assessments</p>
                </div>
                <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    <span>Create New Quiz</span>
                </button>
            </div>

            <div className="flex gap-4 items-center bg-white dark:bg-[var(--color-bg-card)] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search quizzes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuizzes.map(q => (
                        <div key={q._id} className="card group hover:border-blue-500/50 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 rounded-lg bg-blue-100/50 text-blue-600">
                                    <List size={24} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { 
                                        setEditingQuiz(q); 
                                        setFormData({
                                            ...q,
                                            type: 'quiz',
                                            quizQuestions: q.quizQuestions || []
                                        }); 
                                        setShowEditModal(true); 
                                    }} className="btn-secondary p-1.5 text-blue-600 border-transparent hover:border-blue-200">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(q._id, q.title)} className="btn-secondary p-1.5 text-red-600 border-transparent hover:border-red-200">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 truncate">{q.title}</h3>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1 font-semibold">{q.quizQuestions?.length || 0} Questions</span>
                                <span className="flex items-center gap-1 font-mono uppercase text-[10px] tracking-widest">{q.difficulty}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[var(--color-bg-card)] w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="text-xl font-bold">{showCreateModal ? 'New Quiz' : 'Edit Quiz'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold block">Quiz Details</label>
                                    <input required placeholder="Quiz Title" type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" />
                                    <input placeholder="Topic/Section" type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-sm font-bold block">Meta</label>
                                    <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none">
                                        <option>Easy</option><option>Medium</option><option>Hard</option>
                                    </select>
                                    <input placeholder="Points" type="number" value={formData.points} onChange={e => setFormData({...formData, points: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                                    <h3 className="text-lg font-bold">Questions ({formData.quizQuestions.length})</h3>
                                    <button type="button" onClick={addQuestion} className="text-primary-600 hover:text-primary-700 flex items-center gap-1.5 text-sm font-bold">
                                        <PlusCircle size={18} />
                                        <span>Add Question</span>
                                    </button>
                                </div>
                                {formData.quizQuestions.map((q, qIdx) => (
                                    <div key={qIdx} className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4 relative group">
                                        <button type="button" onClick={() => removeQuestion(qIdx)} className="absolute top-4 right-4 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Question {qIdx + 1}</label>
                                            <input required placeholder="Enter question text..." type="text" value={q.question} onChange={e => updateQuestion(qIdx, 'question', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none font-medium" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {q.options.map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-2">
                                                    <input type="radio" checked={q.correctAnswer === oIdx} onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)} />
                                                    <input required placeholder={`Option ${oIdx + 1}`} type="text" value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none text-sm" />
                                                </div>
                                            ))}
                                        </div>
                                        <input placeholder="Explanation (Optional)" type="text" value={q.explanation} onChange={e => updateQuestion(qIdx, 'explanation', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none text-xs italic" />
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-8 border-t border-[var(--color-border-interactive)]">
                                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="btn-secondary px-6">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary px-10">
                                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (showCreateModal ? 'Create Quiz' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizManager;








