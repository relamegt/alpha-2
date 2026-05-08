import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Trophy, Shield, Sun, Moon, LogOut, ChevronLeft, ChevronRight, User, Settings as SettingsIcon, Bell as BellIcon, Map, Zap, Search,
    LayoutDashboard, Code2, FileText, Users, Layers, Database, Youtube, BookOpen, Briefcase, ClipboardList
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import NotificationDropdown from '../student/dashboard/NotificationDropdown';

const ADMIN_SEARCHABLE_PAGES = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, category: 'Main' },
    { name: 'Quick Compiler', path: '/admin/compiler', icon: Code2, category: 'Tools' },
    { name: 'Technical Articles', path: '/admin/articles', icon: FileText, category: 'Content' },
    { name: 'User Management', path: '/admin/users', icon: Users, category: 'Admin' },
    { name: 'Batch Management', path: '/admin/batches', icon: Layers, category: 'Admin' },
    { name: 'Coding Problems', path: '/admin/problems', icon: Database, category: 'Bank' },
    { name: 'SQL Problems', path: '/admin/sql-problems', icon: Database, category: 'Bank' },
    { name: 'Video Content', path: '/admin/videos', icon: Youtube, category: 'Bank' },
    { name: 'Quizzes', path: '/admin/quizzes', icon: Layers, category: 'Bank' },
    { name: 'Course Manager', path: '/admin/courses', icon: BookOpen, category: 'Content' },
    { name: 'Global Contests', path: '/admin/contests', icon: Trophy, category: 'Practice' },
    { name: 'Announcements', path: '/admin/announcements', icon: BellIcon, category: 'Communication' },
    { name: 'Editorial Creator', path: '/admin/editorial-creator', icon: FileText, category: 'Tools' },
    { name: 'Job Manager', path: '/admin/jobs', icon: Briefcase, category: 'Admin' },
];

const AdminSidebarItem = ({ icon: Icon, label, to, isCollapsed, subItems, isHeader }) => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(
        subItems?.some(item => location.pathname === item.to) || false
    );

    if (isHeader) {
        if (isCollapsed) return <div className="h-4" />;
        return (
            <div className="px-5 pt-6 pb-2">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-[0.2em]">
                    {label}
                </span>
            </div>
        );
    }

    const hasSubItems = subItems && subItems.length > 0;
    const isActive = location.pathname === to;
    const isSubItemActive = hasSubItems && subItems.some(item => location.pathname === item.to);

    const handleClick = () => {
        if (hasSubItems) setIsOpen(!isOpen);
    };

    return (
        <div className="space-y-1">
            {hasSubItems ? (
                <button
                    onClick={handleClick}
                    className={`w-full flex items-center justify-between px-5 py-2.5 rounded-xl transition-all duration-200 group relative ${isSubItemActive
                        ? 'bg-primary-50/50 dark:bg-primary-500/10 text-gray-900 dark:text-white ring-1 ring-primary-100 dark:ring-primary-500/20'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-primary-500/15 hover:text-gray-900 dark:hover:text-white transition-all'
                        }`}
                >
                    <div className={`flex items-center ${isCollapsed ? 'gap-0' : 'gap-3'}`}>
                        <div className={`shrink-0 transition-colors ${isSubItemActive ? 'text-primary-600 dark:text-primary-400' : 'group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
                            <Icon size={20} strokeWidth={isSubItemActive ? 2.2 : 1.8} />
                        </div>
                        {!isCollapsed && <span className={`text-[14.5px] font-medium tracking-tight ${isSubItemActive ? 'text-gray-900 dark:text-white' : ''}`}>{label}</span>}
                    </div>
                    {!isCollapsed && (
                        <ChevronRight size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                    )}
                </button>
            ) : (
                <Link
                    to={to}
                    className={`flex items-center justify-between px-5 py-2.5 rounded-xl transition-all duration-200 group relative ${isActive
                        ? 'bg-primary-50/50 dark:bg-primary-500/10 text-gray-900 dark:text-white ring-1 ring-primary-100 dark:ring-primary-500/20'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-primary-500/15 hover:text-gray-900 dark:hover:text-white transition-all'
                        }`}
                >
                    <div className={`flex items-center ${isCollapsed ? 'gap-0' : 'gap-3'}`}>
                        <div className={`shrink-0 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
                            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                        </div>
                        {!isCollapsed && <span className={`text-[14.5px] font-medium tracking-tight ${isActive ? 'text-gray-900 dark:text-white' : ''}`}>{label}</span>}
                    </div>
                </Link>
            )}

            {!isCollapsed && hasSubItems && isOpen && (
                <div className="ml-9 space-y-1 animate-in slide-in-from-top-2 duration-300">
                    {subItems.map((item, idx) => (
                        <Link
                            key={idx}
                            to={item.to}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all ${location.pathname === item.to
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-primary-500/15 transition-all'
                                }`}
                        >
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>
            )}

            {/* Flyout for collapsed state */}
            {isCollapsed && hasSubItems && (
                <div className="fixed left-20 ml-1 mt-[-40px] w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
                    <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in slide-in-from-left-2 duration-200">
                        <div className="px-4 py-2 mb-1 border-b border-gray-50 dark:border-gray-800/50">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                        </div>
                        {subItems.map((item, idx) => (
                            <Link
                                key={idx}
                                to={item.to}
                                className={`flex items-center px-4 py-2 text-[13px] font-medium transition-all ${location.pathname === item.to
                                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-500/10'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-primary-500/10'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const inputRef = useRef(null);
    const searchRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const filteredPages = searchTerm.trim() === '' 
        ? [] 
        : ADMIN_SEARCHABLE_PAGES.filter(page => 
            page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            page.category.toLowerCase().includes(searchTerm.toLowerCase())
          );

    const navItems = [
        { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
        { label: "AI Interviewer", to: "/admin/interview", icon: Zap },
        { label: "Quick Compiler", to: "/admin/compiler", icon: Code2 },
        { label: "Technical Articles", to: "/admin/articles", icon: FileText },
        { label: "User Management", to: "/admin/users", icon: Users },
        { label: "Batch Management", to: "/admin/batches", icon: Layers },
        {
            label: "Content Bank",
            icon: Database,
            subItems: [
                { label: "Coding Problems", to: "/admin/problems" },
                { label: "SQL Problems", to: "/admin/sql-problems" },
                { label: "Video Content", to: "/admin/videos" },
                { label: "Quizzes", to: "/admin/quizzes" },
                { label: "Private Articles", to: "/admin/private-articles" },
                { label: "Public Articles", to: "/admin/public-articles" },
                { label: "Practical Sheets", to: "/admin/sheets" },
                { label: "Assignment Manager", to: "/admin/assignments" },
                { label: "Editorial Creator", to: "/admin/editorial-creator" },
                { label: "Course Contests", to: "/admin/course-contests" },
                { label: "Job Manager", to: "/admin/jobs" },
                { label: "Interview Exp Manager", to: "/admin/interview-experience" },
            ]
        },
        { label: "Course Manager", to: "/admin/courses", icon: BookOpen },
        { label: "Global Contests", to: "/admin/contests", icon: Trophy },
        { label: "Leaderboard", to: "/admin/leaderboard", icon: Map },
        { label: "Reports", to: "/admin/reports", icon: ClipboardList },
        { label: "Announcements", to: "/admin/announcements", icon: BellIcon },
    ];

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

    const pathnames = location.pathname.split('/').filter(x => x && x !== 'admin');
    const isFullWidthPage = location.pathname.includes('/compiler') || location.pathname.includes('/editorial-creator');

    return (
        <div className="flex min-h-screen bg-[var(--color-bg-primary)] transition-colors duration-300">
            {/* Admin Sidebar */}
            <aside className={`fixed left-0 top-0 h-screen bg-[var(--color-bg-sidebar)] border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-50 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
                <div onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-1 top-0 w-2 h-full cursor-pointer z-50 group" title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
                    <div className="absolute right-0 top-0 w-[1px] h-full bg-transparent group-hover:bg-primary-500/20 transition-colors" />
                    <button className="absolute -right-2 top-20 bg-[var(--color-bg-sidebar)] border border-gray-100 dark:border-gray-800 rounded-full p-1 text-gray-400 group-hover:text-primary-600 transition-colors shadow-sm">
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>
                <div className="flex items-center px-5 py-8 shrink-0">
                    <Link to="/admin/dashboard" className="flex items-center gap-2 overflow-hidden">
                        <img src="/alphalogo.png" alt="Logo" className="w-10 h-8 shrink-0" />
                        {!isCollapsed && <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight whitespace-nowrap">AlphaKnowledge</span>}
                    </Link>
                </div>
                <div className="flex-1 overflow-y-auto py-2 px-3 custom-thin-scrollbar">
                    <div className="space-y-0.5">
                        {navItems.map((item, idx) => (
                            <AdminSidebarItem key={idx} {...item} isCollapsed={isCollapsed} />
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-[var(--color-border-interactive)] space-y-4">
                    <button onClick={toggleTheme} className={`flex items-center w-full px-5 py-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 transition-all duration-200 group ${isCollapsed ? 'gap-0 justify-center' : 'gap-3'}`}>
                        <div className="shrink-0 group-hover:text-primary-600">{isDark ? <Sun size={20} /> : <Moon size={20} />}</div>
                        {!isCollapsed && <span className="text-sm font-medium tracking-tight">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                    </button>
                    <div className="relative" ref={profileRef}>
                        {isProfileOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-[var(--color-bg-sidebar)] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 z-50 animate-in slide-in-from-bottom-2">
                                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-semibold shrink-0 shadow-lg shadow-primary-600/20">
                                            {user?.firstName?.charAt(0) || 'A'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-300 truncate">{user?.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 mt-1 border-t border-[var(--color-border-interactive)] space-y-1">
                                    <Link
                                        to="/admin/settings"
                                        onClick={() => setIsProfileOpen(false)}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        <SettingsIcon size={16} />
                                        <span className="font-medium">Settings</span>
                                    </Link>
                                    <button onClick={() => logout()} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                                        <LogOut size={18} />
                                        <span className="font-medium">Logout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`flex items-center w-full rounded-2xl bg-gray-50 dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 transition-all hover:border-primary-500/50 group ${isCollapsed ? 'justify-center p-2 gap-0' : 'px-4 py-2 gap-3'}`}>
                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-semibold shrink-0">
                                {user?.firstName?.charAt(0) || 'A'}
                            </div>
                            {!isCollapsed && (
                                <>
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.firstName}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Admin</p>
                                    </div>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col transition-all duration-300 bg-[var(--color-bg-primary)] ${isCollapsed ? 'ml-20' : 'ml-20 lg:ml-64'}`}>
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-gray-100 dark:border-gray-800 bg-[var(--color-bg-primary)] sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <nav className="flex items-center gap-2 text-base text-gray-500 dark:text-gray-400">
                            <Link to="/admin/dashboard" className="hover:text-primary-600 transition-colors font-medium">Admin</Link>
                            {pathnames.map((name, index) => {
                                const routeTo = `/admin/${pathnames.slice(0, index + 1).join('/')}`;
                                const isLast = index === pathnames.length - 1;
                                const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
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
                        <div className="hidden md:flex items-center relative w-72" ref={searchRef}>
                            <div className="page-search-wrapper w-full">
                                <Search size={18} className="page-search-icon" />
                                <input 
                                    ref={inputRef}
                                    type="text" 
                                    placeholder="Search admin panel..." 
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setIsSearchOpen(true);
                                    }}
                                    onFocus={() => setIsSearchOpen(true)}
                                    className="page-search-input pr-10"
                                />
                                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                        isDark 
                                            ? 'text-gray-400 bg-gray-800 border-gray-700' 
                                            : 'text-gray-400 bg-white border-gray-200'
                                    }`}>⌘K</span>
                                </div>
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

                        <NotificationDropdown basePath="/admin" />
                    </div>
                </header>

                <main className={`flex-1 ${isFullWidthPage ? '' : 'pt-4 pl-8 pr-8 pb-6'}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
