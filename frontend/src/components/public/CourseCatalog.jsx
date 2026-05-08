import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import publicService from '../../services/publicService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Search, BookOpen, Clock, CreditCard, ChevronRight, Star, ShieldCheck, CheckCircle2 } from 'lucide-react';

const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const CourseCatalog = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isEnrolling, setIsEnrolling] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const data = await publicService.getPublishedCourses();
            setCourses(data.courses || []);
        } catch (error) {
            toast.error(error.message || 'Failed to fetch catalog');
        } finally {
            setLoading(false);
        }
    };

    const handleEnrollFree = async (courseId) => {
        if (!user) {
            toast.error('Please login to enroll');
            navigate('/login');
            return;
        }

        setIsEnrolling(true);
        try {
            await publicService.enrollFree(courseId);
            toast.success('Successfully enrolled!');
            fetchCourses();
            setSelectedCourse(null);
        } catch (error) {
            toast.error(error.message || 'Enrollment failed');
        } finally {
            setIsEnrolling(false);
        }
    };

    const handlePurchase = async (course) => {
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

            const order = await publicService.createOrder(course.id);
            
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_placeholder', // Should be set in .env
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
                            courseId: course.id
                        });
                        toast.success('Payment successful! You are now enrolled.');
                        fetchCourses();
                        setSelectedCourse(null);
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

    const filteredCourses = courses.filter(course => 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Loading amazing courses...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20 space-y-12">
            {/* Hero Section */}
            <div className="pt-4">
                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-primary-400 dark:to-indigo-400">
                        Elevate Your Skills
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Discover world-class courses designed to help you master modern technologies and land your dream job.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search courses by title or topic..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-12 pr-4 py-4 rounded-2xl bg-[#F1F3F4] dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
                    />
                </div>
            </div>

            {/* Courses Grid */}
            <div>
                {filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredCourses.map((course) => (
                            <div 
                                key={course.id}
                                className="group bg-[#F1F3F4] dark:bg-[var(--color-bg-card)] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                                    {course.thumbnailUrl ? (
                                        <img 
                                            src={course.thumbnailUrl} 
                                            alt={course.title}
                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 flex gap-2">
                                        {course.isPaid ? (
                                            <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg shadow-lg">
                                                Paid
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg shadow-lg">
                                                Free
                                            </span>
                                        )}
                                    </div>
                                    {course.userStatus?.isEnrolled && (
                                        <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-green-500/50 flex items-center gap-1.5 shadow-lg">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase">Enrolled</span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors min-h-[3.5rem] flex items-center leading-snug">
                                            {course.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[40px]">
                                            {course.description || "Master the foundations of " + course.title + " with hands-on practice."}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800">
                                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                <span>4.8</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                <span>{course.accessYears ? `${course.accessYears} Years` : 'Lifetime'}</span>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                            {course.isPaid ? (
                                                <span className="flex items-baseline gap-0.5">
                                                    <span className="text-sm font-semibold opacity-60">₹</span>
                                                    {course.price}
                                                </span>
                                            ) : (
                                                <span className="text-green-600 dark:text-green-400">FREE</span>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={(e) => {
                                            if (!course.userStatus?.isEnrolled && !course.isPaid) {
                                                e.stopPropagation();
                                                handleEnrollFree(course.id || course._id);
                                            } else {
                                                navigate(`/courses/${course.id || course.slug}`);
                                            }
                                        }}
                                        className={`w-full py-3 px-4 rounded-xl font-semibold text-sm tracking-wide transition-all ${course.userStatus?.isEnrolled ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-primary-600/20 active:scale-95'}`}
                                    >
                                        {course.userStatus?.isEnrolled ? 'Continue Learning' : (course.isPaid ? 'View Details' : 'Enroll Now')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-[#F1F3F4] dark:bg-[var(--color-bg-card)] rounded-3xl border border-dashed border-[var(--color-border-interactive)]">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-800" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">No courses match your search</h3>
                        <p className="text-gray-500 mt-2">Try adjusting your filters or search keywords.</p>
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-6 text-primary-600 font-semibold hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
        </div>
    </div>
);
};

export default CourseCatalog;








