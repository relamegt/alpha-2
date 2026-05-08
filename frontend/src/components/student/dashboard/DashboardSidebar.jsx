import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    LayoutDashboard,
    BookOpen,
    Code2,
    Map,
    FileText,
    HelpCircle,
    Zap,
    Book,
    User,
    Settings as SettingsIcon,
    CreditCard,
    Monitor,
    Bell as BellIcon,
    LogOut,
    UserCircle,
    Moon,
    Sun,
    MessageSquare,
    ClipboardList,
    Trophy,
    Terminal,
    ChevronLeft,
    ChevronRight,
    Shield,
    Briefcase,
    Users as UsersIcon
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../services/queryKeys';
import sheetService from '../../../services/sheetService';
import assignmentService from '../../../services/assignmentService';
import announcementService from '../../../services/announcementService';

const BadgeWithDot = ({ children, color }) => (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${color === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        }`}>
        <span className={`w-1 h-1 rounded-full ${color === 'success' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
        {children}
    </div>
);

const SidebarItem = ({ icon: Icon, label, to, isCollapsed, subItems, badge, isDivider, isHeader, onExpand }) => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(
        subItems?.some(item => location.pathname === item.to) || false
    );

    if (isDivider) {
        return <div className="h-px bg-gray-100 dark:bg-gray-800 my-4 mx-2" />;
    }

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

    const handleClick = (e) => {
        if (isCollapsed && onExpand) {
            onExpand();
        }
        if (hasSubItems) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className="space-y-1">
            {hasSubItems ? (
                <button
                    onClick={handleClick}
                    className={`w-full flex items-center justify-between px-5 py-2.5 rounded-xl transition-all duration-200 group relative ${isSubItemActive
                        ? 'bg-primary-50/50 dark:bg-primary-500/10 text-gray-900 dark:text-white ring-1 ring-primary-100 dark:ring-primary-500/20'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-primary-500/15 hover:text-gray-900 dark:hover:text-white dark:hover:ring-1 dark:hover:ring-primary-500/30 transition-all duration-200'
                        }`}
                >
                    <div className={`flex items-center ${isCollapsed ? 'gap-0' : 'gap-3'}`}>
                        <div className={`shrink-0 transition-colors ${isSubItemActive ? 'text-primary-600 dark:text-primary-400' : 'group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
                            <Icon size={20} strokeWidth={isSubItemActive ? 2.2 : 1.8} />
                        </div>
                        {!isCollapsed && (
                            <span className={`text-[14.5px] font-medium tracking-tight ${isSubItemActive ? 'text-gray-900 dark:text-white' : ''}`}>{label}</span>
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            {badge && badge}
                            <ChevronRight size={14} className={`text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                        </div>
                    )}
                </button>
            ) : (
                <Link
                    to={to}
                    onClick={() => isCollapsed && onExpand && onExpand()}
                    className={`flex items-center justify-between px-5 py-2.5 rounded-xl transition-all duration-200 group relative ${isActive
                        ? 'bg-primary-50/50 dark:bg-primary-500/10 text-gray-900 dark:text-white ring-1 ring-primary-100 dark:ring-primary-500/20'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-primary-500/15 hover:text-gray-900 dark:hover:text-white dark:hover:ring-1 dark:hover:ring-primary-500/30 transition-all duration-200'
                        }`}
                >
                    <div className={`flex items-center ${isCollapsed ? 'gap-0' : 'gap-3'}`}>
                        <div className={`shrink-0 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
                            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                        </div>
                        {!isCollapsed && (
                            <span className={`text-[14.5px] font-medium tracking-tight ${isActive ? 'text-gray-900 dark:text-white' : ''}`}>{label}</span>
                        )}
                    </div>
                    {!isCollapsed && badge && (
                        <div className="flex items-center">
                            {badge}
                        </div>
                    )}
                </Link>
            )}

            {/* Sub-items (Accordion for expanded) */}
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
                            {item.badge && (
                                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            )}

            {/* Sub-items (Flyout for collapsed) */}
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
                                className={`flex items-center justify-between px-4 py-2 text-[13px] font-medium transition-all ${location.pathname === item.to
                                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-500/10'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-primary-500/10'
                                    }`}
                            >
                                <span>{item.label}</span>
                                {item.badge && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const DashboardSidebar = ({ isCollapsed, setIsCollapsed }) => {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const location = useLocation();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = React.useRef(null);
    const { logout } = useAuth();

    // Live Data Fetching
    const { data: sheets = [] } = useQuery({
        queryKey: queryKeys.sheets.all(),
        queryFn: sheetService.getAllSheets,
    });

    const { data: assignments = [] } = useQuery({
        queryKey: ['assignments'],
        queryFn: assignmentService.getAllAssignments,
    });

    const { data: unreadAnnouncements = { count: 0 } } = useQuery({
        queryKey: queryKeys.announcements.unreadCount(),
        queryFn: announcementService.getUnreadCount,
    });

    const navItems = [
        { label: "Dashboard", to: "/dashboard/home", icon: LayoutDashboard },
        { label: "Courses", to: "/dashboard/courses", icon: BookOpen },
        // { label: "Course Catalog", to: "/catalog", icon: Map },
        {
            label: "Learning",
            icon: ClipboardList,
            subItems: [
                { label: "Problem Sheets", to: "/dashboard/sheets", badge: sheets.length || null },
                { label: "Practical Assignments", to: "/dashboard/assignments", badge: assignments.length || null },
                { label: "Technical Articles", to: "/dashboard/articles" },
            ],
        },
        {
            label: "Practice",
            icon: Trophy,
            subItems: [
                { label: "Internal Contests", to: "/dashboard/contests" },
                user?.studentType !== 'ONLINE' && { label: "AI Interviewer", to: "/dashboard/interview", badge: "New" },
                { label: "Quick Compiler", to: "/dashboard/compiler" },
            ].filter(Boolean),
        },
        {
            label: "Community",
            icon: Zap,
            subItems: [
                user?.studentType !== 'ONLINE' && { label: "Job Portal", to: "/dashboard/jobs" },
                { label: "Interview Experiences", to: "/dashboard/interview/experience" },
                { label: "Announcements", to: "/dashboard/announcements", badge: unreadAnnouncements.count || null },
                user?.studentType !== 'ONLINE' && { label: "Leaderboard", to: "/dashboard/leaderboard" },
            ].filter(Boolean),
        },
        { label: "Settings", to: "/dashboard/settings", icon: SettingsIcon },
    ];

    // Close profile menu on click outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-[var(--color-bg-sidebar)] border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-50 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Full-height Collapse Trigger Line */}
            <div
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-1 top-0 w-2 h-full cursor-pointer z-50 group"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {/* Visual Indicator Line (Optional, subtle) */}
                <div className="absolute right-0 top-0 w-[1px] h-full bg-transparent group-hover:bg-primary-500/20 transition-colors" />

                {/* Collapse Toggle Button */}
                <button
                    className="absolute -right-2 top-20 bg-[var(--color-bg-sidebar)] border border-gray-100 dark:border-gray-800 rounded-full p-1 text-gray-400 group-hover:text-primary-600 transition-colors shadow-sm"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Logo Section */}
            <div className="flex items-center px-5 py-8 shrink-0">
                <Link to="/" className="flex items-center gap-2 overflow-hidden">
                    <img src="/alphalogo.png" alt="Logo" className="w-10 h-8 shrink-0" />
                    {!isCollapsed && (
                        <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight whitespace-nowrap">
                            AlphaKnowledge
                        </span>
                    )}
                </Link>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-2 px-3 custom-thin-scrollbar">
                <div className="space-y-0.5">
                    {navItems.map((item, idx) => (
                        <SidebarItem
                            key={idx}
                            {...item}
                            isCollapsed={isCollapsed}
                            isDivider={item.divider}
                            onExpand={() => setIsCollapsed(false)}
                        />
                    ))}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-[var(--color-border-interactive)] space-y-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={`flex items-center w-full px-5 py-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 transition-all duration-200 group ${isCollapsed ? 'gap-0 justify-center' : 'gap-3'}`}
                >
                    <div className="shrink-0 group-hover:text-primary-600">
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </div>
                    {!isCollapsed && (
                        <span className="text-sm font-medium tracking-tight">
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                        </span>
                    )}
                </button>

                {/* Profile Card with Dropdown */}
                <div className="relative" ref={profileRef}>
                    {/* Dropdown Menu */}
                    {isProfileOpen && (
                        <div
                            className={`absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-[var(--color-bg-sidebar)] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 z-50 origin-bottom-left animate-in slide-in-from-bottom-2`}
                        >
                            {/* User Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-semibold shrink-0 shadow-lg shadow-primary-600/20">
                                        {user.profile?.profilePicture ? (
                                            <img src={user.profile.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            user.firstName?.charAt(0)
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {user.firstName} {user.lastName}
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-300 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Links */}
                            <div className="p-2 space-y-1">
                                <Link
                                    to={`/profile/${user.username || user.id}`}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-primary-500/20 rounded-xl transition-colors"
                                >
                                    <User size={18} />
                                    <span className="font-medium">View Profile</span>
                                </Link>
                                <Link
                                    to="/dashboard/settings"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-primary-500/20 rounded-xl transition-colors"
                                >
                                    <SettingsIcon size={18} />
                                    <span className="font-medium">Account Settings</span>
                                </Link>
                                <Link
                                    to="/dashboard/announcements"
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-primary-500/20 rounded-xl transition-colors"
                                >
                                    <BellIcon size={18} />
                                    <span className="font-medium">Notifications</span>
                                </Link>
                            </div>

                            {/* Logout Section */}
                            <div className="p-2 mt-1 border-t border-[var(--color-border-interactive)]">
                                <button
                                    onClick={() => logout()}
                                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span className="font-medium">Logout</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Trigger Button */}
                    <button
                        onClick={() => {
                            if (isCollapsed) {
                                setIsCollapsed(false);
                            }
                            setIsProfileOpen(!isProfileOpen);
                        }}
                        className={`flex items-center w-full rounded-2xl bg-gray-50 dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 transition-all hover:border-primary-500/50 group ${isCollapsed ? 'justify-center p-2 gap-0' : 'px-4 py-2 gap-3'}`}
                    >
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-semibold shrink-0 overflow-hidden shadow-inner group-hover:shadow-primary-600/10">
                            {user.profile?.profilePicture ? (
                                <img src={user.profile.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                user.firstName?.charAt(0)
                            )}
                        </div>
                        {!isCollapsed && (
                            <>
                                <div className="min-w-0 flex-1 text-left">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {user.firstName} {user.lastName}
                                    </p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                        {user.email}
                                    </p>
                                </div>
                                <div className="text-gray-400 group-hover:text-primary-500 transition-colors">
                                    <ChevronRight size={14} className={`transform transition-transform ${isProfileOpen ? '-rotate-90' : ''}`} />
                                </div>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default DashboardSidebar;








