import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import articleService from '../../services/articleService';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit2, Trash2, FileText, X, BookOpen, Layers
} from 'lucide-react';

const ArticleManager = () => {
    const { isDark } = useTheme();
    const [articles, setArticles] = useState([]);
    const [filteredArticles, setFilteredArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        type: 'article',
        difficulty: 'Easy',
        points: 10,
        description: '',
        section: '',
        article: { content: '' },
        articleLink: ''
    });

    useEffect(() => {
        fetchArticles();
    }, []);

    useEffect(() => {
        let result = articles.filter(a => a.type === 'article');
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p => p.title.toLowerCase().includes(lowerQuery));
        }
        setFilteredArticles(result);
    }, [articles, searchQuery]);

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const data = await articleService.getAll();
            setArticles(data.articles || []);
        } catch (error) {
            toast.error('Failed to fetch articles');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            type: 'article',
            difficulty: 'Easy',
            points: 10,
            description: '',
            section: '',
            article: { content: '' },
            articleLink: ''
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await articleService.create(formData);
            toast.success('Article created');
            setShowCreateModal(false);
            resetForm();
            fetchArticles();
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
            const { title, type, difficulty, points, description, section, article, articleLink } = formData;
            const updatePayload = { title, type, difficulty, points, description, section, article, articleLink };
            
            await articleService.update(editingArticle.id || editingArticle._id, updatePayload);
            toast.success('Article updated');
            setShowEditModal(false);
            setEditingArticle(null);
            resetForm();
            fetchArticles();
        } catch (error) {
            toast.error(error.message || 'Failed to update');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete article "${title}"?`)) return;
        try {
            await articleService.delete(id);
            toast.success('Deleted successfully');
            fetchArticles();
        } catch (error) {
            toast.error(error.message || 'Failed to delete');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <FileText className="text-teal-500" />
                        Article Manager
                    </h1>
                    <p className="text-sm text-gray-500">Manage reading materials and documentation</p>
                </div>
                <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    <span>Create New Article</span>
                </button>
            </div>

            <div className="flex gap-4 items-center bg-white dark:bg-[var(--color-bg-card)] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search articles..."
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
                    {filteredArticles.map(a => (
                        <div key={a._id} className="card group hover:border-teal-500/50 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 rounded-lg bg-teal-100/50 text-teal-600">
                                    <BookOpen size={24} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { 
                                        setEditingArticle(a); 
                                        setFormData({
                                            ...a,
                                            type: 'article',
                                            article: a.article || { content: '' }
                                        }); 
                                        setShowEditModal(true); 
                                    }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(a._id, a.title)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 truncate">{a.title}</h3>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1 font-semibold uppercase">{a.section || 'General'}</span>
                                <span className="flex items-center gap-1 font-mono uppercase text-[10px] tracking-widest">{a.difficulty}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[var(--color-bg-card)] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="text-xl font-bold">{showCreateModal ? 'New Article' : 'Edit Article'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Title</label>
                                    <input required placeholder="Article Title" type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Section/Topic</label>
                                    <input placeholder="e.g. Introduction, Concepts" type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Description</label>
                                <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none resize-none px-4 py-2.5" placeholder="Brief summary for preview cards..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">GitHub Article Link (Mandatory)*</label>
                                <input 
                                    required
                                    placeholder="https://github.com/user/repo/blob/main/article.md" 
                                    type="text" 
                                    value={formData.articleLink} 
                                    onChange={e => setFormData({...formData, articleLink: e.target.value})} 
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none font-mono text-sm" 
                                />
                                <p className="text-[10px] text-gray-500 italic">If provided, this content will be fetched and rendered synchronously with markdown support.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Article Content (Optional - Markdown)</label>
                                <textarea rows={12} value={formData.article?.content || ''} onChange={e => setFormData({...formData, article: { content: e.target.value }})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none font-sans leading-relaxed resize-none" placeholder="Optional: Write fallback markdown here..." />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-interactive)] mt-4">
                                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="px-6 py-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-medium">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-10 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200 dark:shadow-none transition-all font-bold flex items-center gap-2">
                                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (showCreateModal ? 'Create Article' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArticleManager;








