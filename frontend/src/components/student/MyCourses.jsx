import { useState } from 'react';
import { LayoutList, Search, BookOpen, Play } from 'lucide-react';
import profileService from '../../services/profileService';
import courseService from '../../services/courseService';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import CourseCards from './dashboard/CourseCards';
import toast from 'react-hot-toast';

const MyCourses = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('continue');

    const { data: courseData, isLoading } = useQuery({
        queryKey: ['courses', user?.role, activeTab],
        queryFn: async () => {
            if (activeTab === 'all' && user?.role === 'student') {
                const data = await courseService.getPublishedCourses();
                return {
                    courses: data.courses || [],
                    problemsSolved: []
                };
            } else if (activeTab === 'all' || user?.role === 'admin' || user?.role === 'instructor') {
                const data = await courseService.getAllCourses();
                // For students in 'all' tab, we still want to show progress if they are enrolled
                let problemsSolved = [];
                if (user?.role === 'student') {
                    const dashData = await profileService.getDashboardData();
                    problemsSolved = dashData.dashboard.progress?.problemsSolved || [];
                }
                return {
                    courses: data.courses || [],
                    problemsSolved
                };
            } else {
                const data = await profileService.getDashboardData();
                return {
                    courses: data.dashboard.assignedCourses || [],
                    problemsSolved: data.dashboard.progress?.problemsSolved || []
                };
            }
        },
        enabled: !!user,
    });

    const courses = courseData?.courses || [];
    const problemsSolved = courseData?.problemsSolved || [];

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="p-6 bg-[var(--color-bg-primary)] min-h-screen transition-colors">
                <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="w-48 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
                        <div className="w-full sm:w-64 h-10 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-[var(--color-bg-card)] rounded-2xl h-64 border border-gray-100 dark:border-gray-800 shadow-sm"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="transition-colors">
            <div className="space-y-6">

                {/* Header Section */}
                <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900 dark:text-white">Courses</h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-4xl">
                        Explore our courses and find the perfect one for you. Master your development skills.
                    </p>
                </header>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shrink-0">
                    {/* Tabs */}
                    <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full w-max shadow-sm">
                        {[
                            { id: 'continue', label: 'Continue Watching' },
                            { id: 'all', label: 'All Courses' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]'
                                        : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button className="p-2.5 rounded-xl bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <LayoutList size={20} />
                        </button>
                        {/* Search Bar */}
                        <div className="relative w-full sm:w-64 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors z-10" size={16} />
                            <input
                                type="text"
                                placeholder="Search courses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all bg-[#F1F3F4] dark:bg-[var(--color-bg-card)] border border-transparent dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:bg-white dark:focus:bg-[var(--color-bg-card)] focus:ring-2 focus:ring-primary-500/20 shadow-sm placeholder:text-gray-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Courses Grid */}
                {filteredCourses.length > 0 ? (
                    <div className="mt-4">
                        <CourseCards assignedCourses={filteredCourses} problemsSolved={problemsSolved} hideTitle={true} activeTab={activeTab} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 bg-[var(--color-bg-card)] rounded-2xl border-2 border-dashed border-[var(--color-border-interactive)] shadow-sm animate-in fade-in duration-500">
                        <div className="w-20 h-20 bg-[var(--color-bg-surface)] rounded-full flex items-center justify-center mb-6">
                            <BookOpen className="text-gray-400" size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {searchQuery ? 'No matching courses' : 'No courses found'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm text-center px-4">
                            {searchQuery ?
                                `We couldn't find any courses matching "${searchQuery}". Please try another search term.` :
                                (user?.role === 'admin' || user?.role === 'instructor' ?
                                    "No courses have been created yet. Head over to the Course Manager to get started." :
                                    "You haven't been assigned to any courses yet. Please check back later or contact your instructor.")
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyCourses;









