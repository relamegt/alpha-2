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
            result = result.filter(a => 
                (a.title && a.title.toLowerCase().includes(lowerQuery)) ||
                (a.section && a.section.toLowerCase().includes(lowerQuery))
            );
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
        <div className="admin-page-wrapper transition-colors">
            <div className="max-w-7xl mx-auto">
                <header className="page-header-container flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">Article Manager</h1>
                        <p className="page-header-desc">Manage reading materials and documentation</p>
                    </div>
                    <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
                        <Plus size={18} />
                        <span>Create New Article</span>
                    </button>
                </header>

                <div className="page-controls-bar">
                    <div className="page-search-wrapper flex-1 max-w-md">
                        <Search className="page-search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="page-search-input"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><div className="spinner"></div></div>
                ) : filteredArticles.length > 0 ? (
                <div className="table-wrapper">
                    <table className="admin-custom-table">
                        <thead>
                            <tr>
                                <th>Article Title</th>
                                <th>Difficulty</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredArticles.map(a => (
                                <tr key={a._id}>
                                    <td className="title-td">
                                        <div className="title-group">
                                            <span className="main-title">{a.title}</span>
                                            <span className="sub-description">{a.description?.slice(0, 80)}...</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`diff-badge ${a.difficulty || 'Easy'}`}>
                                            {a.difficulty || 'Easy'}
                                        </span>
                                    </td>
                                    <td className="actions-td">
                                        <div className="action-row">
                                            <button onClick={() => { 
                                                setEditingArticle(a); 
                                                setFormData({
                                                    ...a,
                                                    type: 'article',
                                                    article: a.article || { content: '' }
                                                }); 
                                                setShowEditModal(true); 
                                            }} className="icon-btn build" title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(a._id, a.title)} className="icon-btn delete" title="Delete">
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
                            <FileText size={32} />
                        </div>
                        <p className="empty-state-text">No articles found</p>
                        <p className="empty-state-subtext">Publish helpful resources for students</p>
                    </div>
                )}

            </div>

            {(showCreateModal || showEditModal) && (
                <div className="modal-backdrop" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
                    <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{showCreateModal ? 'New Article' : 'Edit Article'}</h2>
                            <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="modal-body space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Title <span className="text-red-500">*</span></label>
                                    <input required placeholder="Article Title" type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input-field w-full" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Section/Topic</label>
                                    <input placeholder="e.g. Introduction, Concepts" type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="input-field w-full" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Description</label>
                                <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field w-full min-h-[80px] resize-none" placeholder="Brief summary for preview cards..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">GitHub Article Link (Mandatory)*</label>
                                <input 
                                    required
                                    placeholder="https://github.com/user/repo/blob/main/article.md" 
                                    type="text" 
                                    value={formData.articleLink} 
                                    onChange={e => setFormData({...formData, articleLink: e.target.value})} 
                                    className="input-field w-full font-mono text-sm" 
                                />
                                <p className="text-[10px] text-gray-500 italic">This content will be fetched and rendered synchronously with markdown support.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Article Content (Optional - Markdown)</label>
                                <textarea rows={10} value={formData.article?.content || ''} onChange={e => setFormData({...formData, article: { content: e.target.value }})} className="input-field w-full min-h-[200px] font-sans leading-relaxed resize-none" placeholder="Optional: Write fallback markdown here..." />
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary">
                                    {isSubmitting ? 'Processing...' : (showCreateModal ? 'Publish Article' : 'Update Changes')}
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
