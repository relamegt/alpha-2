import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, BookOpen, ClipboardList, Trophy, FileText, Sun, Moon, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const InstructorSidebarItem = ({ icon: Icon, label, to, isCollapsed, subItems, isHeader }) => {
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

const InstructorLayout = () => {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const location = useLocation();

    const navItems = [
        { label: "Dashboard", to: "/instructor/dashboard", icon: LayoutDashboard },
        { label: "Contests", to: "/instructor/contests", icon: Trophy },
        { label: "Reports", to: "/instructor/reports", icon: ClipboardList },
        { label: "Courses", to: "/instructor/courses", icon: BookOpen },
        { label: "Reset Profile", to: "/instructor/reset-profile", icon: Users },
        {
            label: "Settings",
            icon: SettingsIcon,
            subItems: [
                { label: "Personal details", to: "/instructor/settings/personal" },
                { label: "Change password", to: "/instructor/settings/security" },
            ]
        },
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const pathnames = location.pathname.split('/').filter(x => x && x !== 'instructor');

    return (
        <div className="flex min-h-screen bg-[var(--color-bg-primary)] transition-colors duration-300">
            <aside className={`fixed left-0 top-0 h-screen bg-[var(--color-bg-sidebar)] border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-50 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
                <div onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-1 top-0 w-2 h-full cursor-pointer z-50 group" title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
                    <div className="absolute right-0 top-0 w-[1px] h-full bg-transparent group-hover:bg-primary-500/20 transition-colors" />
                    <button className="absolute -right-2 top-20 bg-[var(--color-bg-sidebar)] border border-gray-100 dark:border-gray-800 rounded-full p-1 text-gray-400 group-hover:text-primary-600 transition-colors shadow-sm">
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>
                <div className="flex items-center px-5 py-8 shrink-0">
                    <Link to="/instructor/dashboard" className="flex items-center gap-2 overflow-hidden">
                        <img src="/alphalogo.png" alt="Logo" className="w-10 h-8 shrink-0" />
                        {!isCollapsed && <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight whitespace-nowrap">AlphaInstructor</span>}
                    </Link>
                </div>
                <div className="flex-1 overflow-y-auto py-2 px-3 custom-thin-scrollbar">
                    <div className="space-y-0.5">
                        {navItems.map((item, idx) => (
                            <InstructorSidebarItem key={idx} {...item} isCollapsed={isCollapsed} />
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
                                            {user?.firstName?.charAt(0) || 'I'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-300 truncate">{user?.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 mt-1 border-t border-[var(--color-border-interactive)]">
                                    <button onClick={() => logout()} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                                        <LogOut size={18} />
                                        <span className="font-medium">Logout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`flex items-center w-full rounded-2xl bg-gray-50 dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 transition-all hover:border-primary-500/50 group ${isCollapsed ? 'justify-center p-2 gap-0' : 'px-4 py-2 gap-3'}`}>
                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-semibold shrink-0">
                                {user?.firstName?.charAt(0) || 'I'}
                            </div>
                            {!isCollapsed && (
                                <>
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.firstName}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Instructor</p>
                                    </div>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            <div className={`flex-1 flex flex-col transition-all duration-300 bg-[var(--color-bg-primary)] ${isCollapsed ? 'ml-20' : 'ml-20 lg:ml-64'}`}>
                <header className="h-16 flex items-center justify-between px-8 border-b border-gray-100 dark:border-gray-800 bg-[var(--color-bg-primary)] sticky top-0 z-30">
                    <nav className="flex items-center gap-2 text-base text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{pathnames[0] || 'Dashboard'}</span>
                        {pathnames.length > 1 && (
                            <>
                                <ChevronRight size={14} />
                                <span className="text-gray-900 dark:text-white capitalize">{pathnames[pathnames.length - 1]}</span>
                            </>
                        )}
                    </nav>
                </header>

                <main className="flex-1 overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default InstructorLayout;
