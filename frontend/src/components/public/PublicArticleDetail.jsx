import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import publicArticleService from '../../services/publicArticleService';
import PublicArticleViewer from './PublicArticleViewer';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';

const PublicArticleDetail = () => {
    const { slug } = useParams();
    const { user } = useAuth();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const res = await publicArticleService.getBySlug(slug);
                if (res.success) {
                    setArticle(res.article);
                } else {
                    toast.error('Article not found');
                }
            } catch (error) {
                console.error('Fetch article detail error:', error);
                toast.error('Failed to load article');
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [slug]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-white dark:bg-[var(--color-bg-card)]">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!article) return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[var(--color-bg-card)]">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
                <button 
                    onClick={() => window.history.back()}
                    className="text-primary-500 font-semibold hover:underline"
                >
                    Go Back
                </button>
            </div>
        </div>
    );

    // Adapt article to what SheetEditorialRenderer expects
    // The renderer uses editorialLink or editorial_link or editorialLink
    const adaptedProblem = {
        ...article,
        title: article.title,
        editorialLink: article.githubUrl,
        youtubeLink: article.youtubeUrl
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)]">
            <PublicArticleViewer article={article} />
        </div>
    );
};

export default PublicArticleDetail;








