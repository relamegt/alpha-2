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
            quizQuestions: [...(formData.quizQuestions || []), { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }]
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
            fetchVideos();
        } catch (error) {
            toast.error(error.message || 'Failed to delete');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <Youtube className="text-red-500" />
                        Video Manager
                    </h1>
                    <p className="text-sm text-gray-500">Manage educational video content</p>
                </div>
                <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    <span>Add Video Content</span>
                </button>
            </div>

            <div className="flex gap-4 items-center bg-white dark:bg-[var(--color-bg-card)] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search videos..."
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
                    {filteredVideos.map(v => (
                        <div key={v._id} className="card group hover:border-red-500/50 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 rounded-lg bg-red-100/50 text-red-600">
                                    <PlayCircle size={24} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                    }} className="btn-secondary p-1.5 text-blue-600 border-transparent hover:border-blue-200">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(v._id, v.title)} className="btn-secondary p-1.5 text-red-600 border-transparent hover:border-red-200">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 truncate">{v.title}</h3>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Youtube size={12} /> {v.section || 'General'}</span>
                                <span className="flex items-center gap-1 font-mono uppercase text-[10px] tracking-widest">{v.difficulty}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[var(--color-bg-card)] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{showCreateModal ? 'Add Video Content' : 'Edit Video Content'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Title</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Section/Topic</label>
                                    <input type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" placeholder="e.g. Recursion, DP" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Video URL (YouTube/Direct)</label>
                                    <input required type="text" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" placeholder="https://youtube.com/watch?v=..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-primary-600 flex items-center gap-1.5"><FileText size={14}/> Summary Link (Optional)</label>
                                    <input type="text" value={formData.summaryLink} onChange={e => setFormData({...formData, summaryLink: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" placeholder="https://docs.google.com/..." />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Description</label>
                                <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Summary Content (Optional Markdown)</label>
                                <textarea rows={4} value={formData.summary?.content || ''} onChange={e => setFormData({...formData, summary: { content: e.target.value }})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none resize-none" placeholder="Add study material or notes here..." />
                            </div>

                            {/* Quiz Questions Section */}
                            <div className="space-y-4 pt-4 border-t border-[var(--color-border-interactive)]">
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
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Question {qIdx + 1}</label>
                                                <input required placeholder="Enter question..." type="text" value={q.question} onChange={e => updateQuestion(qIdx, 'question', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none text-sm font-medium focus:border-primary-500 transition-colors" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className="flex items-center gap-2">
                                                        <input type="radio" checked={q.correctAnswer === oIdx} onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)} className="accent-primary-500 w-3 h-3" />
                                                        <input required placeholder={`Option ${oIdx + 1}`} type="text" value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none text-xs focus:border-primary-500 transition-colors" />
                                                    </div>
                                                ))}
                                            </div>
                                            <input placeholder="Explanation (Optional)" type="text" value={q.explanation} onChange={e => updateQuestion(qIdx, 'explanation', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none text-[10px] italic bg-transparent" />
                                        </div>
                                    ))}
                                    {(!formData.quizQuestions || formData.quizQuestions.length === 0) && (
                                        <div className="text-center py-8 border-2 border-dashed border-[var(--color-border-interactive)] rounded-xl transition-colors">
                                            <p className="text-xs text-gray-400 italic font-medium">No quiz questions added. Click "Add Question" to create a mini-quiz for this video.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="btn-secondary px-6">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary px-8">
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








