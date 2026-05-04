import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import { Bell, Search, ChevronRight, Zap, LayoutDashboard, BookOpen, FileText, ClipboardList, Book, Trophy, Terminal, Briefcase, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import NotificationDropdown from './NotificationDropdown';

const SEARCHABLE_PAGES = [
    { name: 'Dashboard Home', path: '/dashboard/home', icon: LayoutDashboard, category: 'Main' },
    { name: 'My Courses', path: '/dashboard/courses', icon: BookOpen, category: 'Learning' },
    { name: 'Problem Sheets', path: '/dashboard/sheets', icon: FileText, category: 'Learning' },
    { name: 'Practical Assignments', path: '/dashboard/assignments', icon: ClipboardList, category: 'Learning' },
    { name: 'Technical Articles', path: '/dashboard/articles', icon: Book, category: 'Learning' },
    { name: 'Internal Contests', path: '/dashboard/contests', icon: Trophy, category: 'Practice' },
    { name: 'AI Interviewer', path: '/dashboard/interview', icon: Zap, category: 'Practice' },
    { name: 'Quick Compiler', path: '/dashboard/compiler', icon: Terminal, category: 'Practice' },
    { name: 'Job Portal', path: '/dashboard/jobs', icon: Briefcase, category: 'Practice' },
    { name: 'Interview Experiences', path: '/dashboard/interview/experience', icon: MessageSquare, category: 'Practice' },
    { name: 'Announcements', path: '/dashboard/announcements', icon: Bell, category: 'Practice' },
    { name: 'Leaderboard', path: '/dashboard/leaderboard', icon: Trophy, category: 'Practice' },
    { name: 'Settings', path: '/dashboard/settings', icon: SettingsIcon, category: 'Account' },
];

const DashboardLayout = () => {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef(null);
    const inputRef = useRef(null);

    // Generate breadcrumbs from path
    const pathnames = location.pathname.split('/').filter((x) => x && x !== 'dashboard');

    // Pages that should occupy the full space without padding
    const isFullWidthPage = location.pathname.includes('/compiler') ||
        location.pathname.includes('/workspace') ||
        location.pathname.includes('/interview') ||
        location.pathname.includes('/dashboard/articles/') ||
        location.pathname.includes('/interview/experience/');

    // Filtered Results
    const filteredPages = searchTerm.trim() === '' 
        ? [] 
        : SEARCHABLE_PAGES.filter(page => 
            page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            page.category.toLowerCase().includes(searchTerm.toLowerCase())
          );

    // Close search on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard shortcut (⌘K or Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setIsSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSearchItemClick = (path) => {
        navigate(path);
        setIsSearchOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="flex min-h-screen bg-[var(--color-bg-primary)] transition-colors duration-300">
            {/* Sidebar */}
            <DashboardSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col transition-all duration-300 bg-[var(--color-bg-primary)] ${isCollapsed ? 'ml-20' : 'ml-20 lg:ml-64'}`}>
                {/* Minimal Top Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-gray-100 dark:border-gray-800 bg-[var(--color-bg-primary)] sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center gap-2 text-base text-gray-500 dark:text-gray-400">
                            <Link to="/dashboard/home" className="hover:text-primary-600 transition-colors font-small">Dashboard</Link>
                            {pathnames.map((name, index) => {
                                // Reconstruct the path properly even after filtering 'dashboard'
                                const routeTo = `/dashboard/${pathnames.slice(0, index + 1).join('/')}`;
                                const isLast = index === pathnames.length - 1;
                                const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');

                                // Skip rendering if the name is 'home' to keep it as just 'Dashboard'
                                if (name === 'home') return null;

                                return (
                                    <React.Fragment key={name}>
                                        <ChevronRight size={14} className="text-gray-300" />
                                        {isLast ? (
                                            <span className="font-medium text-gray-900 dark:text-white">{displayName}</span>
                                        ) : (
                                            <Link to={routeTo} className="hover:text-primary-600 transition-colors font-medium">{displayName}</Link>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Search Bar */}
                        <div className="hidden md:flex items-center relative group w-72" ref={searchRef}>
                            <Search 
                                size={18} 
                                className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${
                                    isSearchOpen ? 'text-primary-500' : 'text-gray-400'
                                }`} 
                            />
                            <input 
                                ref={inputRef}
                                type="text" 
                                placeholder="Search everything..." 
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setIsSearchOpen(true);
                                }}
                                onFocus={() => setIsSearchOpen(true)}
                                className={`w-full pl-11 pr-12 py-2.5 rounded-xl text-sm outline-none transition-all ${
                                    isDark 
                                        ? 'bg-[var(--color-bg-card)] border border-gray-800 text-gray-200 focus:ring-2 focus:ring-primary-500/20' 
                                        : 'bg-[#F1F3F4] text-gray-800 border border-transparent focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm placeholder:text-gray-500'
                                }`}
                            />
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                    isDark 
                                        ? 'text-gray-400 bg-gray-800 border-gray-700' 
                                        : 'text-gray-400 bg-white border-gray-200'
                                }`}>⌘K</span>
                            </div>

                            {/* Search Results Dropdown */}
                            {isSearchOpen && searchTerm.trim() !== '' && (
                                <div className={`absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl shadow-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-200 z-[100] ${
                                    isDark 
                                        ? 'bg-[var(--color-bg-card)] border-gray-800 text-gray-200' 
                                        : 'bg-white border-gray-100 text-gray-800'
                                }`}>
                                    {filteredPages.length > 0 ? (
                                        <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                                            {filteredPages.map((page, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSearchItemClick(page.path)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                                                        isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className={`p-2 rounded-lg ${
                                                        isDark ? 'bg-gray-800 text-primary-400' : 'bg-primary-50 text-primary-600'
                                                    }`}>
                                                        <page.icon size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold">{page.name}</div>
                                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{page.category}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-8 text-center">
                                            <Search size={32} className="mx-auto text-gray-300 mb-2 opacity-20" />
                                            <p className="text-sm text-gray-500 font-medium">No results found for "{searchTerm}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Notifications */}
                        <NotificationDropdown />

                    </div>
                </header>

                {/* Page Content */}
                <main className={`flex-1 ${isFullWidthPage ? '' : 'p-8'}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;








