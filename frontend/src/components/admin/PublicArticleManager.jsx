import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import publicArticleService from '../../services/publicArticleService';
import toast from 'react-hot-toast';
import {
    Plus, Search, Edit2, Trash2, FileText, X, BookOpen, Layers, Link as LinkIcon, Youtube, Image as ImageIcon, Tag, Clock
} from 'lucide-react';

const PublicArticleManager = () => {
    const { isDark } = useTheme();
    const [articles, setArticles] = useState([]);
    const [filteredArticles, setFilteredArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingArticle, setEditingArticle] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        thumbnail: '',
        githubUrl: '',
        youtubeUrl: '',
        category: '',
        readTime: '5 min read'
    });

    useEffect(() => {
        fetchArticles();
    }, []);

    useEffect(() => {
        let result = articles;
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(a => a.title.toLowerCase().includes(lowerQuery) || (a.category && a.category.toLowerCase().includes(lowerQuery)));
        }
        setFilteredArticles(result);
    }, [articles, searchQuery]);

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const data = await publicArticleService.getAll();
            setArticles(data.articles || []);
        } catch (error) {
            toast.error('Failed to fetch public articles');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            thumbnail: '',
            githubUrl: '',
            youtubeUrl: '',
            category: '',
            readTime: '5 min read'
        });
        setEditingArticle(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingArticle) {
                await publicArticleService.update(editingArticle.id, formData);
                toast.success('Article updated');
            } else {
                await publicArticleService.create(formData);
                toast.success('Public article created');
            }
            setShowModal(false);
            resetForm();
            fetchArticles();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete public article "${title}"?`)) return;
        try {
            await publicArticleService.delete(id);
            toast.success('Deleted successfully');
            fetchArticles();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="admin-page-wrapper transition-colors">
            <header className="page-header-container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="page-header-title">Public Article Manager</h1>
                        <p className="page-header-desc">Manage articles visible to all students</p>
                    </div>
                    <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
                        <Plus size={18} />
                        <span>Create Public Article</span>
                    </button>
                </div>
            </header>

            <div className="page-tabs-container">
                <div className="page-search-wrapper w-full max-w-md">
                    <Search className="page-search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search articles or categories..."
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
                                <th>Article Details</th>
                                <th>Category</th>
                                <th>Read Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredArticles.map(a => (
                                <tr key={a.id}>
                                    <td className="title-td">
                                        <div className="title-group">
                                            <span className="main-title">{a.title}</span>
                                            <span className="sub-description">{a.description?.slice(0, 80)}...</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                            <BookOpen size={14} className="text-indigo-500" />
                                            {a.category || 'General'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                                            <Clock size={12} />
                                            {a.readTime}
                                        </div>
                                    </td>
                                    <td className="actions-td">
                                        <div className="action-row">
                                            <button onClick={() => { 
                                                setEditingArticle(a); 
                                                setFormData({
                                                    ...a,
                                                    thumbnail: a.thumbnail || '',
                                                    githubUrl: a.githubUrl,
                                                    youtubeUrl: a.youtubeUrl || '',
                                                    category: a.category,
                                                    readTime: a.readTime
                                                }); 
                                                setShowModal(true); 
                                            }} className="icon-btn build" title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(a.id, a.title)} className="icon-btn delete" title="Delete">
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
                    <p className="empty-state-text">No public articles</p>
                    <p className="empty-state-subtext">Share your knowledge with the world</p>
                </div>
            )}

            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingArticle ? 'Edit Public Article' : 'New Public Article'}</h2>
                            <button onClick={() => setShowModal(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body space-y-6 max-h-[70vh] overflow-y-auto custom-thin-scrollbar">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Title</label>
                                        <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none" placeholder="Article Title" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Category</label>
                                        <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none" placeholder="e.g. Java, Web Dev" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</label>
                                    <textarea rows={2} required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none resize-none" placeholder="Brief summary for preview cards..." />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Thumbnail URL</label>
                                        <input value={formData.thumbnail} onChange={e => setFormData({...formData, thumbnail: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none" placeholder="https://..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Read Time</label>
                                        <input value={formData.readTime} onChange={e => setFormData({...formData, readTime: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none" placeholder="e.g. 5 min read" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 pr-2">
                                        <LinkIcon size={14} /> GitHub Link (Raw Markdown URL)
                                    </label>
                                    <input required value={formData.githubUrl} onChange={e => setFormData({...formData, githubUrl: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none font-mono text-sm" placeholder="https://github.com/..." />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 pr-2">
                                        <Youtube size={14} /> YouTube Link (Optional)
                                    </label>
                                    <input value={formData.youtubeUrl} onChange={e => setFormData({...formData, youtubeUrl: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-[#1c1c26] outline-none" placeholder="https://youtube.com/watch?v=..." />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary">
                                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (editingArticle ? 'Update Article' : 'Create Article')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicArticleManager;
