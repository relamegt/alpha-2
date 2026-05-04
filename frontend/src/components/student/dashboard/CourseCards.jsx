import { BookOpen, ChevronRight, LayoutList, ExternalLink, Clock, Layout, Star, BarChart3, Users as UsersIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const CourseCards = ({ assignedCourses, problemsSolved = [], hideTitle = false, activeTab = 'continue' }) => {
    const navigate = useNavigate();

    // Calculate course progress
    const getCourseProgress = (course) => {
        if (!course.sections || course.sections.length === 0) return { solved: 0, total: 0, percent: 0 };

        const solvedSet = new Set(Array.isArray(problemsSolved) ? problemsSolved.map(id => String(id)) : []);
        let total = 0;
        let solved = 0;

        course.sections.forEach(section => {
            (section.subsections || []).forEach(sub => {
                const combinedIds = [...(sub.problemIds || []), ...(sub.contestIds || [])];
                combinedIds.forEach(id => {
                    total++;
                    if (solvedSet.has(String(id))) {
                        solved++;
                    }
                });
            });
        });

        return {
            solved,
            total,
            percent: total > 0 ? Math.round((solved / total) * 100) : 0
        };
    };

    if (!assignedCourses || assignedCourses.length === 0) {
        return (
            <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 mb-6 mx-auto">
                    <BookOpen size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses yet</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
                    You haven't been assigned any courses yet. Check back later or contact your instructor.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!hideTitle && (
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Your Courses</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Pick up where you left off</p>
                    </div>
                    <Link to="/dashboard/courses" className="text-sm font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1">
                        View All Courses <ChevronRight size={16} />
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {assignedCourses.map((course) => {
                    const progress = getCourseProgress(course);
                    
                    return (
                        <div 
                            key={course._id || course.id} 
                            className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col hover:-translate-y-1 relative"
                        >
                            {/* Static Ambient Glow - Mimicking CodeTyper effect */}
                            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-60" 
                                 style={{
                                     background: `radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.20), transparent 70%)`
                                 }} 
                            />
                            
                            <div className="relative z-10 flex flex-col h-full flex-1">
                            {/* Course Image */}
                            <div className="relative h-48 bg-gray-100 dark:bg-gray-900 overflow-hidden border-b border-[var(--color-border-image)]">
                                {course.thumbnailUrl ? (
                                    <img 
                                        src={course.thumbnailUrl} 
                                        alt={course.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=Course+Image'; }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Layout size={48} />
                                    </div>
                                )}
                                
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                            </div>

                            {/* Content */}
                            <div className="p-6 flex flex-col flex-1 gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                        {course.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                                        {course.description || "Master the concepts with our comprehensive, hands-on learning path designed by industry veterans to take you from a curious learner to a domain expert."}
                                    </p>
                                </div>

                                {/* Linear Progress Bar */}
                                <div className="space-y-1.5">
                                    <div className="w-full bg-gray-200 dark:bg-gray-800/80 rounded-full h-2 overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
                                        <div 
                                            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                                            style={{ width: `${progress.percent}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                        {progress.percent}% Complete
                                    </div>
                                </div>

                                {/* Rating & Stats Row */}
                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star 
                                                    key={s} 
                                                    size={12} 
                                                    className={`${s <= Math.round(course.averageRating || 4.5) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`} 
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[11px] font-black text-gray-700 dark:text-gray-300">
                                            {course.averageRating ? Number(course.averageRating).toFixed(1) : '4.5'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            ({course.ratingCount || '0'})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-400">
                                        <UsersIcon size={12} />
                                        <span className="text-[10px] font-bold">
                                            {course.enrolledCount !== undefined ? course.enrolledCount : (course.studentCount || 1)}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 pt-2">
                                    {activeTab !== 'all' && (
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                navigate(`/dashboard/courses/${course._id || course.id}/leaderboard`);
                                            }}
                                            className="w-full btn-secondary"
                                        >
                                            <BarChart3 size={14} />
                                            Analytics
                                        </button>
                                    )}
                                    {activeTab !== 'all' ? (
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const cSlug = course.slug || course._id || course.id;
                                                window.open(`/workspace/${cSlug}`, '_blank', 'noopener,noreferrer');
                                            }}
                                            className="w-full btn-primary"
                                        >
                                            Continue
                                        </button>
                                    ) : (
                                        <Link 
                                            to={`/dashboard/courses/${course.slug || course._id || course.id}`}
                                            className="w-full btn-primary"
                                        >
                                            Preview
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
                })}
            </div>
        </div>
    );
};

export default CourseCards;








