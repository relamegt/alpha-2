import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import videoService from '../../services/videoService';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit2, Trash2, Youtube, FileText, X, PlayCircle
} from 'lucide-react';

const VideoManager = () => {
    const { isDark } = useTheme();
    const [videos, setVideos] = useState([]);
    const [filteredVideos, setFilteredVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingVideo, setEditingVideo] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        type: 'video',
        difficulty: 'Easy',
        description: '',
        section: '',
        videoUrl: '',
        summary: { content: '' },
        summaryLink: '',
        resources: [],
        quizQuestions: []
    });

    useEffect(() => {
        fetchVideos();
    }, []);

    useEffect(() => {
        let result = videos.filter(v => v.type === 'video');
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p => p.title.toLowerCase().includes(lowerQuery));
        }
        setFilteredVideos(result);
    }, [videos, searchQuery]);

    const fetchVideos = async () => {
        setLoading(true);
        try {
            const data = await videoService.getAll();
            setVideos(data.videos || []);
        } catch (error) {
            toast.error('Failed to fetch videos');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            type: 'video',
            difficulty: 'Easy',
            description: '',
            section: '',
            videoUrl: '',
            summary: { content: '' },
            summaryLink: '',
            resources: [],
            quizQuestions: []
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await videoService.create(formData);
            toast.success('Video content created');
            setShowCreateModal(false);
            resetForm();
            fetchVideos();
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
            // Pick only editable fields to prevent sending junk (isSolved, createdAt, etc.) to backend
            const { title, type, difficulty, points, description, section, videoUrl, summary, summaryLink, resources, quizQuestions } = formData;
            const updatePayload = { title, type, difficulty, points, description, section, videoUrl, summary, summaryLink, resources, quizQuestions };

            await videoService.update(editingVideo.id || editingVideo._id, updatePayload);
            toast.success('Video content updated');
            setShowEditModal(false);
            setEditingVideo(null);
            resetForm();
            fetchVideos();
        } catch (error) {
            toast.error(error.message || 'Failed to update');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addQuestion = () => {
        setFormData({
            ...formData,
            quizQuestions: [...(formData.quizQuestions || []), { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '', isMultipleAnswers: false }]
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
        updated[qIdx].options = [...updated[qIdx].options];
        updated[qIdx].options[oIdx] = val;
        setFormData({ ...formData, quizQuestions: updated });
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete video "${title}"?`)) return;
        try {
            await videoService.delete(id);
            toast.success('Deleted successfully');
            setSelectedIds(prev => prev.filter(currId => currId !== id));
            fetchVideos();
        } catch (error) {
            toast.error(error.message || 'Failed to delete');
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} selected videos? This action cannot be undone.`)) return;
        try {
            await videoService.bulkDelete(selectedIds);
            toast.success(`${selectedIds.length} videos deleted successfully`);
            setSelectedIds([]);
            fetchVideos();
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
        if (selectedIds.length === filteredVideos.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredVideos.map(v => v._id));
        }
    };

    return (
        <div className="admin-page-wrapper transition-colors">
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">Video Manager</h1>
                        <p className="page-header-desc">Manage educational video content and study materials</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
                            <Plus size={18} />
                            <span>Add Video Content</span>
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
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="page-search-input"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner"></div></div>
            ) : filteredVideos.length > 0 ? (
                <div className="table-wrapper">
                    <table className="admin-custom-table">
                        <thead>
                            <tr>
                                <th className="w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={filteredVideos.length > 0 && selectedIds.length === filteredVideos.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 dark:bg-gray-800"
                                    />
                                </th>
                                <th>Video Title</th>
                                <th>Difficulty</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVideos.map(v => (
                                <tr key={v._id} className={selectedIds.includes(v._id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}>
                                    <td>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(v._id)}
                                            onChange={() => toggleSelect(v._id)}
                                            className="rounded border-gray-300 dark:bg-gray-800"
                                        />
                                    </td>
                                    <td className="title-td">
                                        <div className="title-group">
                                            <span className="main-title">{v.title}</span>
                                            <span className="sub-description">{v.description?.slice(0, 80)}...</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`diff-badge ${v.difficulty || 'Easy'}`}>
                                            {v.difficulty || 'Easy'}
                                        </span>
                                    </td>
                                    <td className="actions-td">
                                        <div className="action-row">
                                            <button onClick={() => {
                                                setEditingVideo(v);
                                                setFormData({
                                                    ...v,
                                                    type: 'video',
                                                    summary: v.summary || { content: '' },
                                                    summaryLink: v.summaryLink || '',
                                                    resources: v.resources || [],
                                                    quizQuestions: v.quizQuestions || []
                                                });
                                                setShowEditModal(true);
                                            }} className="icon-btn build" title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(v._id, v.title)} className="icon-btn delete" title="Delete">
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
                        <Youtube size={32} />
                    </div>
                    <p className="empty-state-text">No videos found</p>
                    <p className="empty-state-subtext">Add educational content to your library</p>
                </div>
            )}

            {(showCreateModal || showEditModal) && (
                <div className="modal-backdrop" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
                    <div className="modal-content max-w-4xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{showCreateModal ? 'Add Video Content' : 'Edit Video Content'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="modal-body space-y-6 flex flex-col">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Title</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[var(--color-bg-primary)] outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Section/Topic</label>
                                    <input type="text" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[var(--color-bg-primary)] outline-none" placeholder="e.g. Recursion, DP" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Video URL (YouTube/Direct)</label>
                                    <input required type="text" value={formData.videoUrl} onChange={e => setFormData({ ...formData, videoUrl: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[var(--color-bg-primary)] outline-none" placeholder="https://youtube.com/watch?v=..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-primary-600 flex items-center gap-1.5"><FileText size={14} /> Summary Link (Optional)</label>
                                    <input type="text" value={formData.summaryLink} onChange={e => setFormData({ ...formData, summaryLink: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[var(--color-bg-primary)] outline-none" placeholder="https://docs.google.com/..." />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Description</label>
                                <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[var(--color-bg-primary)] outline-none resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Summary Content (Optional Markdown)</label>
                                <textarea rows={4} value={formData.summary?.content || ''} onChange={e => setFormData({ ...formData, summary: { content: e.target.value } })} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[var(--color-bg-primary)] outline-none resize-none" placeholder="Add study material or notes here..." />
                            </div>

                            {/* Quiz Questions Section */}
                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-md font-bold flex items-center gap-2 font-problem text-gray-800 dark:text-gray-200 border-l-4 border-primary-500 pl-3">
                                        Quiz Questions (Optional)
                                    </h3>
                                    <button type="button" onClick={addQuestion} className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg transition-all">
                                        <Plus size={14} /> Add Question
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.quizQuestions?.map((q, qIdx) => (
                                        <div key={qIdx} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3 relative group bg-gray-50/30 dark:bg-gray-800/10 transition-colors">
                                            <button type="button" onClick={() => removeQuestion(qIdx)} className="absolute top-3 right-3 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Question {qIdx + 1}</label>
                                                    <input required placeholder="Enter question..." type="text" value={q.question} onChange={e => updateQuestion(qIdx, 'question', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[var(--color-bg-primary)] outline-none text-sm font-medium focus:border-primary-500 transition-colors" />
                                                </div>
                                                <div className="flex flex-col items-center gap-1 min-w-[100px] pt-4">
                                                    <label className="text-[9px] font-black text-gray-400 dark:text-gray-300 uppercase tracking-tighter">Multiple Correct?</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const isNowMultiple = !q.isMultipleAnswers;
                                                            const updated = [...formData.quizQuestions];
                                                            updated[qIdx].isMultipleAnswers = isNowMultiple;
                                                            updated[qIdx].correctAnswer = isNowMultiple ? [0] : 0;
                                                            setFormData({ ...formData, quizQuestions: updated });
                                                        }}
                                                        className={`w-10 h-5 rounded-full transition-all relative ${q.isMultipleAnswers ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                    >
                                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${q.isMultipleAnswers ? 'left-5.5' : 'left-0.5'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className="flex items-center gap-2">
                                                        {q.isMultipleAnswers ? (
                                                            <input
                                                                type="checkbox"
                                                                checked={Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(oIdx) : false}
                                                                onChange={() => {
                                                                    const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                                                                    const next = current.includes(oIdx)
                                                                        ? current.filter(i => i !== oIdx)
                                                                        : [...current, oIdx];
                                                                    updateQuestion(qIdx, 'correctAnswer', next);
                                                                }}
                                                                className="w-3.5 h-3.5 rounded accent-primary-500"
                                                            />
                                                        ) : (
                                                            <input
                                                                type="radio"
                                                                checked={q.correctAnswer === oIdx}
                                                                onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)}
                                                                className="accent-primary-500 w-3 h-3"
                                                            />
                                                        )}
                                                        <input required placeholder={`Option ${oIdx + 1}`} type="text" value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[var(--color-bg-primary)] outline-none text-xs focus:border-primary-500 transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                            <input placeholder="Explanation (Optional)" type="text" value={q.explanation} onChange={e => updateQuestion(qIdx, 'explanation', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-[var(--color-bg-primary)] outline-none text-[10px] italic bg-transparent" />
                                        </div>
                                    ))}
                                    {(!formData.quizQuestions || formData.quizQuestions.length === 0) && (
                                        <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl transition-colors">
                                            <p className="text-xs text-gray-400 italic font-medium">No quiz questions added. Click "Add Question" to create a mini-quiz for this video.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary">
                                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (showCreateModal ? 'Create Video Content' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoManager;
