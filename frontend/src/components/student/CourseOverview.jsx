import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import publicService from '../../services/publicService';
import toast from 'react-hot-toast';

const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const CourseOverview = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [expandedSections, setExpandedSections] = useState({});
    const [expandedSubsections, setExpandedSubsections] = useState({});
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const queryClient = useQueryClient();

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
        const enrolled = assignedCourseIds.includes(course?._id);
        console.log('Enrollment check:', { courseId: course?._id, assignedCourseIds, enrolled });
        return enrolled;
    }, [user, assignedCourseIds, course]);

    const handleEnrollFree = async () => {
        if (!user) {
            toast.error('Please login to enroll');
            navigate('/login');
            return;
        }

        setIsEnrolling(true);
        try {
            await publicService.enrollFree(course._id || course.id);
            toast.success('Successfully enrolled!');
            // Update cache without refreshing
            queryClient.invalidateQueries(['dashboard', user?.role]);
        } catch (error) {
            toast.error(error.message || 'Enrollment failed');
        } finally {
            setIsEnrolling(false);
        }
    };

    const handlePurchase = async () => {
        if (!user) {
            toast.error('Please login to purchase');
            navigate('/login');
            return;
        }

        setIsEnrolling(true);
        try {
            const res = await loadRazorpay();
            if (!res) {
                toast.error('Razorpay SDK failed to load. Are you online?');
                return;
            }

            const order = await publicService.createOrder(course._id || course.id);
            
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_placeholder',
                amount: order.amount,
                currency: order.currency,
                name: 'AlphaKnowledge',
                description: `Enrollment for ${course.title}`,
                orderid: order.id,
                handler: async (response) => {
                    try {
                        await publicService.verifyPayment({
                            razorpay_orderid: response.razorpay_orderid,
                            razorpay_paymentid: response.razorpay_paymentid,
                            razorpay_signature: response.razorpay_signature,
                            courseId: course._id || course.id
                        });
                        toast.success('Payment successful! You are now enrolled.');
                        queryClient.invalidateQueries(['dashboard', user?.role]);
                    } catch (error) {
                        toast.error(error.message || 'Payment verification failed');
                    }
                },
                prefill: {
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                },
                theme: {
                    color: '#6366f1',
                },
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (error) {
            toast.error(error.message || 'Failed to initiate purchase');
        } finally {
            setIsEnrolling(false);
        }
    };

    const problemsSolved = useMemo(() => new Set(dashboardData?.dashboard?.progress?.problemsSolved || []), [dashboardData]);

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const toggleSubsection = (subId) => {
        setExpandedSubsections(prev => ({ ...prev, [subId]: !prev[subId] }));
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

    if (allLoading || (dashLoading && !dashboardData) || (problemsLoading && !problemsData)) {
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
                                    <span>{course.averageRating ? Number(course.averageRating).toFixed(1) : '5.0'} ({course.ratingCount || 0} Reviews)</span>
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
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-medium text-gray-900 dark:text-white tracking-tight">Course Content</h2>
                                <button 
                                    onClick={() => {
                                        setExpandedSections({});
                                        setExpandedSubsections({});
                                    }}
                                    className="text-xs text-primary-500 hover:underline font-medium"
                                >
                                    Collapse All
                                </button>
                            </div>
                            
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

                                            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div className="px-4 pb-4 space-y-1">
                                                     {section.subsections?.map((subsection, subIdx) => {
                                                        const isSubExpanded = expandedSubsections[subsection._id] ?? false;

                                                        return (
                                                            <div key={subsection._id} className="space-y-1">
                                                                <div
                                                                    onClick={() => toggleSubsection(subsection._id)}
                                                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all group hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer`}
                                                                >
                                                                    <Layout size={16} className={`text-primary-500`} />
                                                                    <div className={`flex-1 text-sm font-bold text-gray-900 dark:text-white transition-colors`}>
                                                                        {subsection.title}
                                                                    </div>
                                                                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${isSubExpanded ? 'rotate-180' : ''}`} />
                                                                </div>
                                                                
                                                                {/* Subsection Items (Outline) */}
                                                                <div className={`ml-9 space-y-1 pb-2 transition-all overflow-hidden ${isSubExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                                    {((problemsData?.problems || []).filter(p => (subsection.problemIds || []).includes(p._id) || (subsection.problemIds || []).includes(p.id))).map((item) => (
                                                                        <div key={item._id || item.id} className="flex items-center gap-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                                                                            {item.type === 'video' ? <Video size={12} /> : 
                                                                             item.type === 'material' ? <FileText size={12} /> : 
                                                                             item.type === 'quiz' ? <HelpCircle size={12} /> : 
                                                                             <Code2 size={12} />}
                                                                            <span>{item.title}</span>
                                                                        </div>
                                                                    ))}
                                                                    {(subsection.contestIds || []).map((contestId) => (
                                                                        <div key={contestId} className="flex items-center gap-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                                                                            <Trophy size={12} />
                                                                            <span>Practice Contest</span>
                                                                        </div>
                                                                    ))}
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
                            {/* Static Ambient Glow */}
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
                                            onClick={course.isPaid ? handlePurchase : handleEnrollFree}
                                            disabled={isEnrolling}
                                            className="w-full btn-primary disabled:opacity-50"
                                        >
                                            {isEnrolling ? 'Processing...' : (course.isPaid ? `Buy Now - ₹${course.price}` : 'Enroll Now (Free)')}
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








