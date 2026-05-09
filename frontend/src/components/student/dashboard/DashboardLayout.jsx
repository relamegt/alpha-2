import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import { Bell, Search, ChevronRight, Zap, LayoutDashboard, BookOpen, FileText, ClipboardList, Book, Trophy, Terminal, Briefcase, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import NotificationDropdown from './NotificationDropdown';

const SEARCHABLE_PAGES = [
    { name: 'Dashboard Home', path: '/home', icon: LayoutDashboard, category: 'Main' },
    { name: 'My Courses', path: '/courses', icon: BookOpen, category: 'Learning' },
    { name: 'Problem Sheets', path: '/sheets', icon: FileText, category: 'Learning' },
    { name: 'Practical Assignments', path: '/assignments', icon: ClipboardList, category: 'Learning' },
    { name: 'Technical Articles', path: '/articles-list', icon: Book, category: 'Learning' },
    { name: 'Internal Contests', path: '/contests', icon: Trophy, category: 'Practice' },
    { name: 'AI Interviewer', path: '/interview', icon: Zap, category: 'Practice' },
    { name: 'Quick Compiler', path: '/compiler', icon: Terminal, category: 'Practice' },
    { name: 'Job Portal', path: '/jobs', icon: Briefcase, category: 'Practice' },
    { name: 'Interview Experiences', path: '/interview/experience', icon: MessageSquare, category: 'Practice' },
    { name: 'Announcements', path: '/announcements', icon: Bell, category: 'Practice' },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy, category: 'Practice' },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, category: 'Account' },
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
        location.pathname.includes('/articles-list/') ||
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
                        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
                            {pathnames.map((name, index) => {
                                const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                                const isLast = index === pathnames.length - 1;
                                // If name is home, show it as Dashboard
                                const displayName = name === 'home' 
                                    ? 'Dashboard' 
                                    : name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');

                                return (
                                    <React.Fragment key={name}>
                                        <ChevronRight size={14} className="text-gray-300" />
                                        {isLast ? (
                                            <span className="font-medium text-gray-900 dark:text-white">{displayName}</span>
                                        ) : (
                                            <Link to={routeTo} className="hover:text-primary-600 transition-colors">{displayName}</Link>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Search Bar - Hidden as requested */}
                        {/* 
                        <div className="hidden md:flex items-center relative group w-72" ref={searchRef}>
                            <div className="page-search-wrapper w-full">
                                <Search size={18} className="page-search-icon" />
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
                                    className="page-search-input"
                                />
                            </div>
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                    isDark 
                                        ? 'text-gray-400 bg-gray-800 border-gray-700' 
                                        : 'text-gray-400 bg-white border-gray-200'
                                }`}>⌘K</span>
                            </div>

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
                        */}

                        {/* Notifications */}
                        <NotificationDropdown />

                    </div>
                </header>

                {/* Page Content */}
                <main className={`flex-1 ${isFullWidthPage ? '' : 'pt-4 pl-8 pr-8 pb-6'}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;








