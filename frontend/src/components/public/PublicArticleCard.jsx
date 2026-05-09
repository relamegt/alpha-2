import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const PublicArticleCard = ({ article, onToggleSave }) => {
    const { isDark } = useTheme();
    
    // Format date: "17 April, 2026"
    const formatDate = (dateString) => {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-GB', options);
    };

    const authorInitials = article.author 
        ? `${article.author.firstName?.charAt(0) || ''}${article.author.lastName?.charAt(0) || ''}`
        : 'AA';

    const authorName = article.author 
        ? `${article.author.firstName} ${article.author.lastName}`
        : 'AlphaLearnTeam';

    return (
        <div className={`group relative flex flex-col md:flex-row gap-6 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all duration-300 ${
            isDark 
                ? 'bg-[var(--color-bg-card)]' 
                : 'bg-white hover:bg-gray-50 shadow-sm hover:shadow-md'
        }`}>
            {/* Thumbnail */}
            <div className="w-full md:w-56 h-36 rounded-xl overflow-hidden bg-gray-100 dark:bg-[var(--color-bg-card)] flex-shrink-0 border border-[var(--color-border-image)]">
                {article.thumbnail ? (
                    <img 
                        src={article.thumbnail} 
                        alt={article.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-grow py-1">
                <div className="flex justify-between items-start mb-2">
                    <Link to={`/articles/${article.slug}`}>
                        <h3 className={`text-xl font-normal leading-tight group-hover:text-primary-500 transition-colors text-gray-900 dark:text-gray-100`}>
                            {article.title}
                        </h3>
                    </Link>
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            onToggleSave(article.id);
                        }}
                        className={`p-2 rounded-lg transition-all ${
                            article.isSaved 
                                ? 'text-primary-500 bg-primary-50 dark:bg-primary-500/10' 
                                : 'text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                        title={article.isSaved ? "Remove from saved" : "Save article"}
                    >
                        <svg className="w-5 h-5" fill={article.isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                </div>

                <p className={`text-sm font-normal line-clamp-2 mb-4 text-gray-500 dark:text-gray-400`}>
                    {article.description}
                </p>

                {/* Footer Info */}
                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5`}>
                                {authorInitials}
                            </div>
                            <span className={`text-[13px] font-normal text-gray-600 dark:text-gray-400`}>
                                {authorName}
                            </span>
                        </div>

                        <div className="flex items-center text-[13px] text-gray-400 font-normal">
                            <span className="mx-2 opacity-50">•</span>
                            {formatDate(article.publishedAt)}
                            <span className="mx-2 opacity-50">•</span>
                            <div className="flex items-center">
                                <svg className="w-3.5 h-3.5 mr-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {article.readTime}
                            </div>
                        </div>
                    </div>

                    <Link 
                        to={`/articles/${article.slug}`}
                        className="btn-primary py-2 px-4 text-xs"
                    >
                        Read Article
                        <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PublicArticleCard;








