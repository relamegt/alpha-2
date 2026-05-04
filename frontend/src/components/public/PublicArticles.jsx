import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import publicArticleService from '../../services/publicArticleService';
import PublicArticleCard from './PublicArticleCard';
import toast from 'react-hot-toast';

const PublicArticles = () => {
    const { isDark } = useTheme();
    const { user } = useAuth();
    
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All Articles');
    const [selectedCategory, setSelectedCategory] = useState('All Articles');
    const [searchQuery, setSearchQuery] = useState('');
    const [categorySearch, setCategorySearch] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [artRes, catRes] = await Promise.all([
                activeTab === 'Saved' 
                    ? publicArticleService.getSaved() 
                    : publicArticleService.getAll(),
                publicArticleService.getCategories()
            ]);

            if (artRes.success) setArticles(artRes.articles);
            if (catRes.success) setCategories(catRes.categories || []);
        } catch (error) {
            console.error('Fetch articles error:', error);
            toast.error('Failed to fetch articles');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSave = async (articleId) => {
        if (!user) {
            toast.error('Please login to save articles');
            return;
        }
        try {
            const res = await publicArticleService.toggleSave(articleId);
            if (res.success) {
                toast.success(res.saved ? 'Article saved' : 'Article removed');
                // Optimistic update
                setArticles(prev => prev.map(a => 
                    a.id === articleId ? { ...a, isSaved: res.saved } : a
                ));
                if (!res.saved && activeTab === 'Saved') {
                    setArticles(prev => prev.filter(a => a.id !== articleId));
                }
            }
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const filteredArticles = articles.filter(article => {
        const matchesCategory = selectedCategory === 'All Articles' || article.category === selectedCategory;
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             article.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const filteredCategories = categories.filter(c => 
        c && c.toLowerCase().includes(categorySearch.toLowerCase())
    );

    return (
        <div className={`pb-16 text-gray-900 dark:text-white`}>
            {/* Header */}
            <header className="page-header-container animate-in fade-in slide-in-from-top-4 duration-700">
                <h1 className="page-header-title">Technical Articles</h1>
                <p className="page-header-desc">Explore our collection of technical guides and tutorials.</p>
            </header>

            {/* Tabs & Search */}
            <div className="page-tabs-container">
                <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full w-max">
                    {['All Articles', 'Continue Reading', 'Saved'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === tab 
                                    ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]' 
                                    : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-80 group">
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input 
                            type="text"
                            placeholder="Search articles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all ${
                                isDark 
                                    ? 'bg-[var(--color-bg-card)] border border-gray-800 text-gray-200 focus:ring-2 focus:ring-primary-500/20' 
                                    : 'bg-[#F1F3F4] text-gray-800 border border-transparent focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm placeholder:text-gray-500'
                            }`}
                        />
                    </div>
                </div>
            </div>

            {/* Layout Wrapper */}
            <div className="flex flex-col lg:flex-row gap-10">
                {/* Main Content Area */}
                <div className="flex-grow">
                    <div className="space-y-4">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-40 w-full rounded-2xl bg-gray-200/50 dark:bg-gray-800/30 animate-pulse" />
                                ))}
                            </div>
                        ) : filteredArticles.length > 0 ? (
                            filteredArticles.map((article, idx) => (
                                <div key={article.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <PublicArticleCard 
                                        article={article} 
                                        onToggleSave={handleToggleSave}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-24 bg-white dark:bg-[var(--color-bg-card)] rounded-[2rem] border border-gray-100 dark:border-white/5">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2v4a2 2 0 002 2h4" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-normal mb-1 text-gray-900 dark:text-white">No articles found</h3>
                                <p className="text-gray-500 dark:text-gray-400">Try adjusting your search query.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Categories Sidebar */}
                <aside className="w-full lg:w-80 flex-shrink-0">
                    <div className={`sticky top-24 p-8 rounded-[1.5rem] ${
                        isDark ? 'bg-white/5 border border-white/5' : 'bg-white border border-gray-100 shadow-sm'
                    }`}>
                        <div className="mb-6">
                            <h2 className="text-lg font-normal mb-1 text-gray-900 dark:text-white">Categories</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Browse by topic</p>
                        </div>

                        {/* Category Tags */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedCategory('All Articles')}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    selectedCategory === 'All Articles'
                                        ? 'bg-primary-500 text-white'
                                        : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                All Topics
                            </button>
                            {filteredCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                                        selectedCategory === cat
                                            ? 'bg-primary-500 text-white'
                                            : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PublicArticles;









