import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import quizService from '../../services/quizService';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit2, Trash2, List, FileText, X, CheckSquare, PlusCircle, Layers
} from 'lucide-react';

const QuizManager = () => {
    const { isDark } = useTheme();
    const [quizzes, setQuizzes] = useState([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
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
            setSelectedIds(prev => prev.filter(currId => currId !== id));
            fetchQuizzes();
        } catch (error) {
            toast.error(error.message || 'Failed to delete');
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} selected quizzes? This action cannot be undone.`)) return;
        try {
            await quizService.bulkDelete(selectedIds);
            toast.success(`${selectedIds.length} quizzes deleted successfully`);
            setSelectedIds([]);
            fetchQuizzes();
        } catch (error) {
            toast.error(error.message || 'Failed to delete');
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredQuizzes.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredQuizzes.map(q => q._id));
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
        <div className="admin-page-wrapper transition-colors">
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">Quiz Manager</h1>
                        <p className="page-header-desc">Manage interactive quizzes and assessments</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
                            <Plus size={18} />
                            <span>Create New Quiz</span>
                        </button>
                        {selectedIds.length > 0 && (
                            <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2">
                                <Trash2 size={18} />
                                Delete ({selectedIds.length})
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="page-tabs-container">
                <div className="page-search-wrapper w-full max-w-md">
                    <Search className="page-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search quizzes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="page-search-input"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner"></div></div>
            ) : filteredQuizzes.length > 0 ? (
                <div className="table-wrapper">
                    <table className="admin-custom-table">
                        <thead>
                            <tr>
                                <th className="w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={filteredQuizzes.length > 0 && selectedIds.length === filteredQuizzes.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 dark:bg-gray-800"
                                    />
                                </th>
                                <th>Quiz Title</th>
                                <th>Questions</th>
                                <th>Difficulty</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQuizzes.map(q => (
                                <tr key={q._id} className={selectedIds.includes(q._id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}>
                                    <td>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(q._id)}
                                            onChange={() => toggleSelect(q._id)}
                                            className="rounded border-gray-300 dark:bg-gray-800"
                                        />
                                    </td>
                                    <td className="title-td">
                                        <div className="title-group">
                                            <span className="main-title">{q.title}</span>
                                            <span className="sub-description">{q.description?.slice(0, 80)}...</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-xs font-bold text-gray-500">{q.quizQuestions?.length || 0} Qs</span>
                                    </td>
                                    <td>
                                        <span className={`diff-badge ${q.difficulty || 'Easy'}`}>
                                            {q.difficulty || 'Easy'}
                                        </span>
                                    </td>
                                    <td className="actions-td">
                                        <div className="action-row">
                                            <button onClick={() => { 
                                                setEditingQuiz(q); 
                                                setFormData({
                                                    ...q,
                                                    type: 'quiz',
                                                    quizQuestions: q.quizQuestions || []
                                                }); 
                                                setShowEditModal(true); 
                                            }} className="icon-btn build" title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(q._id, q.title)} className="icon-btn delete" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state-container">
                    <div className="empty-state-icon">
                        <Layers size={32} />
                    </div>
                    <p className="empty-state-text">No quizzes found</p>
                    <p className="empty-state-subtext">Create engaging assessments for your students</p>
                </div>
            )}

            {(showCreateModal || showEditModal) && (
                <div className="modal-backdrop" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
                    <div className="modal-content max-w-5xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{showCreateModal ? 'New Quiz' : 'Edit Quiz'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="modal-body space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold block">Quiz Details</label>
                                    <input required placeholder="Quiz Title" type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none" />
                                    <input placeholder="Topic/Section" type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-sm font-bold block">Meta</label>
                                    <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none">
                                        <option>Easy</option><option>Medium</option><option>Hard</option>
                                    </select>
                                    <input placeholder="Points" type="number" value={formData.points} onChange={e => setFormData({...formData, points: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none" />
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
                                            <input required placeholder="Enter question text..." type="text" value={q.question} onChange={e => updateQuestion(qIdx, 'question', e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none font-medium" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {q.options.map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-2">
                                                    <input type="radio" checked={q.correctAnswer === oIdx} onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)} />
                                                    <input required placeholder={`Option ${oIdx + 1}`} type="text" value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none text-sm" />
                                                </div>
                                            ))}
                                        </div>
                                        <input placeholder="Explanation (Optional)" type="text" value={q.explanation} onChange={e => updateQuestion(qIdx, 'explanation', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none text-xs italic" />
                                    </div>
                                ))}
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary">
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
