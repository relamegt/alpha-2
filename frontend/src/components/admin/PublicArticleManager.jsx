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
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <Layers className="text-indigo-500" />
                        Public Article Manager
                    </h1>
                    <p className="text-sm text-gray-500">Manage articles visible to all students</p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
                    <Plus size={18} />
                    <span>Create Public Article</span>
                </button>
            </div>

            <div className="flex gap-4 items-center bg-white dark:bg-[var(--color-bg-card)] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search articles or categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.map(a => (
                        <div key={a.id} className="card group hover:border-indigo-500/50 transition-all bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 p-4 rounded-2xl shadow-sm">
                            <div className="aspect-video mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                {a.thumbnail ? (
                                    <img src={a.thumbnail} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-20"><ImageIcon size={32} /></div>
                                )}
                            </div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider">{a.category || 'General'}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { 
                                        setEditingArticle(a); 
                                        setFormData({
                                            title: a.title,
                                            description: a.description,
                                            thumbnail: a.thumbnail || '',
                                            githubUrl: a.githubUrl,
                                            youtubeUrl: a.youtubeUrl || '',
                                            category: a.category,
                                            readTime: a.readTime
                                        }); 
                                        setShowModal(true); 
                                    }} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(a.id, a.title)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 truncate">{a.title}</h3>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{a.description}</p>
                            <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                                <span className="flex items-center gap-1"><Clock size={12} /> {a.readTime}</span>
                                <span className="flex items-center gap-1"><LinkIcon size={12} /> GitHub Linked</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[var(--color-bg-card)] w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="text-xl font-bold">{editingArticle ? 'Edit Public Article' : 'New Public Article'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Title</label>
                                        <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" placeholder="Article Title" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Category</label>
                                        <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" placeholder="e.g. Java, Web Dev" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</label>
                                    <textarea rows={2} required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none resize-none" placeholder="Brief summary for preview cards..." />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Thumbnail URL</label>
                                        <input value={formData.thumbnail} onChange={e => setFormData({...formData, thumbnail: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" placeholder="https://..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Read Time</label>
                                        <input value={formData.readTime} onChange={e => setFormData({...formData, readTime: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" placeholder="e.g. 5 min read" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 pr-2">
                                        <LinkIcon size={14} /> GitHub Link (Raw Markdown URL)
                                    </label>
                                    <input required value={formData.githubUrl} onChange={e => setFormData({...formData, githubUrl: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none font-mono text-sm" placeholder="https://github.com/..." />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 pr-2">
                                        <Youtube size={14} /> YouTube Link (Optional)
                                    </label>
                                    <input value={formData.youtubeUrl} onChange={e => setFormData({...formData, youtubeUrl: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 dark:bg-[#1c1c26] outline-none" placeholder="https://youtube.com/watch?v=..." />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--color-border-interactive)]">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-medium text-sm">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-10 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all font-bold text-sm flex items-center gap-2">
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








