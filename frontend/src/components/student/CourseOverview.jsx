import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ChevronDown, ChevronUp, Play, BookOpen,
    CheckCircle2, Circle, Clock, Award,
    Layout, Trophy, Star, ArrowLeft, ArrowRight,
    Video, FileText, Code2, HelpCircle,
    Users, Globe, Share2, Info, ChevronRight,
    MessageSquare, BarChart3, Monitor
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import profileService from '../../services/profileService';
import courseService from '../../services/courseService';
import problemService from '../../services/problemService';

const CourseOverview = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [expandedSections, setExpandedSections] = useState({});
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(5);

    const { data: allCoursesData, isLoading: allLoading } = useQuery({
        queryKey: ['allCourses'],
        queryFn: () => courseService.getAllCourses(),
    });

    const { data: dashboardData, isLoading: dashLoading } = useQuery({
        queryKey: ['dashboard', user?.role],
        queryFn: async () => {
            if (user?.role === 'student') {
                return profileService.getDashboardData();
            }
            return null;
        },
        enabled: user?.role === 'student',
    });

    // Fetch all problems to get types/metadata
    const { data: problemsData, isLoading: problemsLoading } = useQuery({
        queryKey: ['problems'],
        queryFn: () => problemService.getAllProblems(),
    });

    const courses = allCoursesData?.courses || [];
    const assignedCourseIds = dashboardData?.dashboard?.assignedCourses?.map(c => c._id) || [];
    
    const course = useMemo(() =>
        courses.find(c => c._id === courseId || c.slug === courseId),
        [courses, courseId]
    );

    const isEnrolled = useMemo(() => {
        if (user?.role === 'admin' || user?.role === 'instructor') return true;
        return assignedCourseIds.includes(course?._id);
    }, [user, assignedCourseIds, course]);

    const problemsSolved = useMemo(() => new Set(dashboardData?.dashboard?.progress?.problemsSolved || []), [dashboardData]);

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const handleRateCourse = async () => {
        try {
            await courseService.rateCourse(course._id, rating);
            alert("Thank you for rating this course!");
            setShowRatingModal(false);
        } catch (error) {
            console.error(error);
            alert("Failed to submit rating.");
        }
    };

    if (dashLoading || problemsLoading || allLoading) {
        return (
            <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Loading Course Curriculum...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-[var(--color-bg-primary)] p-8">
                <button onClick={() => navigate('/dashboard/courses')} className="btn-secondary flex items-center gap-2 mb-8 w-max">
                    <ArrowLeft size={16} /> Back to Courses
                </button>
                <div className="bg-[var(--color-bg-card)] rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Course Not Found</h2>
                    <p className="text-gray-500 mt-2">The course you're looking for doesn't exist or hasn't been assigned to you.</p>
                </div>
            </div>
        );
    }

    // Helper to calculate subsection stats
    const getSubsectionStats = (subsection) => {
        const problemIds = subsection.problemIds || [];
        const problems = (problemsData?.problems || []).filter(p => problemIds.includes(p._id) || problemIds.includes(p.id));

        return {
            articles: problems.filter(p => p.type === 'material').length,
            videos: problems.filter(p => p.type === 'video').length,
            quiz: problems.filter(p => p.type === 'quiz').length,
            problems: problems.filter(p => p.type === 'coding' || p.type === 'sql' || p.type === 'problem' || !p.type).length,
            contests: (subsection.contestIds || []).length,
            total: problems.length + (subsection.contestIds || []).length,
            solved: problems.filter(p => problemsSolved.has(p._id) || problemsSolved.has(p.id)).length + (subsection.contestIds || []).filter(c => problemsSolved.has(c)).length
        };
    };

    // Overall Progress
    const allItemsInCourse = course.sections.flatMap(s => s.subsections.flatMap(sub => [...(sub.problemIds || []), ...(sub.contestIds || [])]));
    const solvedInCourse = allItemsInCourse.filter(id => problemsSolved.has(id)).length;
    const progressPercent = allItemsInCourse.length ? Math.round((solvedInCourse / allItemsInCourse.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] transition-colors font-sans selection:bg-primary-500/30 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Title and Badges */}
                        <div>
                            <h1 className="text-3xl font-medium text-gray-900 dark:text-white mb-4">
                                {course.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                <div className="flex items-center gap-1.5 bg-primary-600/20 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-lg border border-primary-500/20">
                                    <Star size={12} className="fill-current" />
                                    <span>{course.averageRating ? Number(course.averageRating).toFixed(1) : '5.0'} ({course.ratingCount || '1'} Ratings)</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-primary-600/10 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-lg border border-primary-500/10">
                                    <Users size={12} />
                                {course.enrolledCount !== undefined ? course.enrolledCount : (course.studentCount || 1)} students
                                </div>
                                {course.hours && course.hours > 0 ? (
                                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <Clock size={12} />
                                        <span>{course.hours} Hours</span>
                                    </div>
                                ) : null}
                                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <Layout size={12} />
                                    <span>{course.sections?.length || 0} Sections</span>
                                </div>
                                {course.language && course.language !== 'English' ? (
                                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <Globe size={12} />
                                        <span>{course.language}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            {course.description || "Master the concepts with our comprehensive, hands-on learning path designed by industry veterans to take you from a curious learner to a domain expert."}
                        </div>

                        {/* What you'll learn */}
                        <div className="pt-4">
                            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">What you'll learn</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Discover the key skills and concepts you'll master in this course to advance your programming expertise.</p>
                        </div>

                        {/* Curriculum / Course Content */}
                        <section className="space-y-4 pt-4">
                            <h2 className="text-xl font-medium text-gray-900 dark:text-white tracking-tight">Course Content</h2>
                            
                            <div className="space-y-2">
                                {course.sections?.map((section, sIdx) => {
                                    const isExpanded = expandedSections[section._id] ?? (sIdx === 0);
                                    return (
                                        <div
                                            key={section._id}
                                            className="bg-[var(--color-bg-card)] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                                        >
                                            <button
                                                onClick={() => toggleSection(section._id)}
                                                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                                            >
                                                <h3 className="text-sm font-normal text-gray-900 dark:text-white">
                                                    {section.title}
                                                </h3>
                                                <ChevronDown size={18} className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                            </button>

                                            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div className="px-4 pb-4 space-y-1">
                                                    {section.subsections?.map((subsection, subIdx) => {
                                                        const cSlug = course.slug || course._id;
                                                        const sSlug = subsection.slug || (subsection.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || subsection._id;

                                                        return (
                                                            <div
                                                                key={subsection._id}
                                                                onClick={() => window.open(`/workspace/${cSlug}/${sSlug}`, '_blank', 'noopener,noreferrer')}
                                                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer group"
                                                            >
                                                                <FileText size={16} className="text-gray-400 group-hover:text-primary-500" />
                                                                <div className="flex-1 text-sm text-gray-600 dark:text-gray-300 group-hover:text-primary-500 transition-colors">
                                                                    {subsection.title}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* Right Column (Sticky) */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-24 bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm relative">
                            {/* Static Ambient Glow - Mimicking CodeTyper effect */}
                            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-60" 
                                 style={{
                                     background: `radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.20), transparent 70%)`
                                 }} 
                            />
                            
                            <div className="relative z-10">
                            <div className="aspect-video relative bg-gray-900">
                                {course.thumbnailUrl ? (
                                    <img src={course.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Play size={48} className="text-white/20" />
                                    </div>
                                )}
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {course.isPaid ? `₹${course.price || '3,000'}` : 'Free'}
                                </div>

                                <div className="space-y-3">
                                    {isEnrolled ? (
                                        <>
                                            <button 
                                                onClick={() => {
                                                    const cSlug = course.slug || course._id;
                                                    window.open(`/workspace/${cSlug}`, '_blank', 'noopener,noreferrer');
                                                }}
                                                className="w-full btn-primary"
                                            >
                                                Continue Learning
                                            </button>
                                            <button 
                                                onClick={() => setShowRatingModal(true)}
                                                className="w-full btn-secondary"
                                            >
                                                <Star size={14} className="text-gray-400" />
                                                Add a Review
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            onClick={() => alert("Please contact your instructor to enroll.")}
                                            className="w-full btn-primary"
                                        >
                                            Request Enrollment
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>

            {/* Rating Modal */}
            {showRatingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">Rate this Course</h3>
                        <p className="text-gray-500 text-sm mb-6">How would you rate your learning experience?</p>
                        
                        <div className="flex justify-center gap-2 mb-8">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setRating(star)}>
                                    <Star size={32} className={`transition-colors ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-700'}`} />
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowRatingModal(false)}
                                className="flex-1 btn-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleRateCourse}
                                className="flex-1 btn-primary"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseOverview;








