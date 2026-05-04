import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, CheckCircle, Circle, ChevronDown, Search, X, LayoutGrid, FileText, Video as VideoIcon, Code2, HelpCircle, Trophy } from 'lucide-react';
import { CiCircleList } from 'react-icons/ci';
import { LuFolderDot, LuFolderOpenDot } from "react-icons/lu";
import problemService from '../../services/problemService';
import courseService from '../../services/courseService';
import contestService from '../../services/contestService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';



const DIFF_COLORS = {
    Easy: { text: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-[#064e3b]', dot: 'bg-green-500' },
    Medium: { text: 'text-yellow-800 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-[#78350f]', dot: 'bg-yellow-500' },
    Hard: { text: 'text-red-800 dark:text-red-400', bg: 'bg-red-100 dark:bg-[#450a0a]', dot: 'bg-red-500' },
};

const ProblemSidebar = ({ isCollapsed, onToggle }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { problemId, courseId, subId: subIdParam, contestSlug } = useParams();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const subIdRaw = subIdParam || searchParams.get('subId');
    const subId = subIdRaw && subIdRaw !== 'undefined' && subIdRaw !== 'null' && subIdRaw !== 'problems' ? subIdRaw : null;
    const basePath = user?.role === 'admin' ? '/admin' : user?.role === 'instructor' ? '/instructor' : '/student';

    // Fetch Problems
    const { data: problemsData, isLoading: problemsLoading } = useQuery({
        queryKey: ['problems'],
        queryFn: () => problemService.getAllProblems(),
    });
    const problems = problemsData?.problems || [];

    // Fetch Courses (if NO subId focus OR if we are inside a course workspace)
    const shouldFetchCourses = !subId || Boolean(courseId);
    const { data: coursesData, isLoading: coursesLoading } = useQuery({
        queryKey: ['courses'],
        queryFn: () => courseService.getAllCourses(),
        enabled: shouldFetchCourses
    });
    const courses = coursesData?.courses || [];

    // Fetch Contests (Batch & Global)
    const isStudent = user?.role === 'student';
    const { data: contestsData, isLoading: contestsLoading } = useQuery({
        queryKey: ['contests', user?.role, user?.batchId],
        queryFn: () => {
            if (isStudent && user?.batchId) {
                return contestService.getContestsByBatch(user.batchId);
            } else if (!isStudent) {
                return contestService.getAllContests();
            }
            return { contests: [] };
        },
        enabled: !!user
    });
    const batchContests = contestsData?.contests || [];

    // Fetch Course Specific Contests
    const { data: courseContestsData, isLoading: courseContestsLoading } = useQuery({
        queryKey: ['course-contests', courseId],
        queryFn: () => contestService.getContestsByCourse(courseId),
        enabled: !!courseId
    });
    const courseContests = courseContestsData?.contests || [];

    const contests = [...batchContests, ...courseContests];

    // Fetch Direct Subsection Data (Focus Mode)
    const shouldFetchFocus = Boolean(subId) && !Boolean(courseId);
    const { data: focusedData, isLoading: focusLoading } = useQuery({
        queryKey: ['subsection-focus', courseId, subId],
        queryFn: () => courseService.getSubsectionData(courseId, subId),
        enabled: shouldFetchFocus
    });

    const loading = problemsLoading || (shouldFetchCourses && coursesLoading) || contestsLoading || courseContestsLoading || (shouldFetchFocus && focusLoading);
    const [expandedSections, setExpandedSections] = useState(() => {
        try {
            const saved = sessionStorage.getItem(`exp_sec_${courseId || 'default'}`);
            return saved ? JSON.parse(saved) : {};
        } catch (e) { return {}; }
    });
    const [expandedSubsections, setExpandedSubsections] = useState(() => {
        try {
            const saved = sessionStorage.getItem(`exp_sub_${courseId || 'default'}`);
            return saved ? JSON.parse(saved) : {};
        } catch (e) { return {}; }
    });



    const scrollRef = useRef(null);



    useEffect(() => {
        sessionStorage.setItem(`exp_sec_${courseId || 'default'}`, JSON.stringify(expandedSections));
    }, [expandedSections, courseId]);

    useEffect(() => {
        sessionStorage.setItem(`exp_sub_${courseId || 'default'}`, JSON.stringify(expandedSubsections));
    }, [expandedSubsections, courseId]);

    // Tracks which section/subsection the user last clicked a problem from.
    // This ensures auto-expand opens the correct section when a problem exists in multiple sections.
    const clickedFromRef = useRef(null);
    const lastAutoExpandedRef = useRef(null);
    const [difficulty, setDifficulty] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(() => {
        return sessionStorage.getItem('last_sidebar_category') || 'all';
    });

    useEffect(() => {
        sessionStorage.setItem('last_sidebar_category', activeCategory);
    }, [activeCategory]);

    useEffect(() => {
        const handleProblemSolved = (e) => {
            const solvedId = e.detail?.problemId;
            if (!solvedId) return;
            queryClient.invalidateQueries({ queryKey: ['problems'] });
            queryClient.invalidateQueries({ queryKey: ['problem', solvedId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            if (subId) queryClient.invalidateQueries({ queryKey: ['subsection-focus'] });
        };

        window.addEventListener('problemSolved', handleProblemSolved);
        return () => window.removeEventListener('problemSolved', handleProblemSolved);
    }, [queryClient, subId]);

    // Build a map of ObjectId → slug and slug → slug for reverse lookup
    // Since subsection.problemIds are ObjectIds but URL uses slug, we need to match both
    const problemIdAliasMap = useMemo(() => {
        const map = {}; // ObjectId string → [slug, objectIdStr]
        const isFocusMode = Boolean(subId) && !Boolean(courseId);
        const problemList = isFocusMode ? (focusedData?.problems || []) : problems;
        problemList.forEach(p => {
            const oid = p._id ? String(p._id) : null;
            const slug = p.id || (p._id ? String(p._id) : null); // p.id is slug from API
            if (oid) map[oid] = slug;
            if (slug) map[slug] = slug;
        });
        return map;
    }, [problems, focusedData, subId, courseId]);

    const activeCourseSections = useMemo(() => {
        if (!courses.length) return [];
        // If courseId is provided, filter directly
        if (courseId) {
            const c = courses.find(c => String(c._id) === courseId || c.slug === courseId);
            return c ? (c.sections || []) : [];
        }
        
        // No courseId, but a problemId or contestSlug exists (fallback navigation). Find the course containing this problem/contest
        if (problemId || contestSlug) {
            for (const course of courses) {
                if (!course.sections) continue;
                for (const section of course.sections) {
                    if (!section.subsections) continue;
                    for (const sub of section.subsections) {
                        let match = false;
                        if (problemId) {
                            match = sub.problemIds?.some(pid => 
                                String(pid) === problemId || problemIdAliasMap[String(pid)] === problemId
                            );
                        } else if (contestSlug && contests.length) {
                            match = sub.contestIds?.some(cid => {
                                const cidStr = typeof cid === 'object' ? cid.toString() : cid;
                                const contest = contests.find(c => String(c._id) === cidStr || String(c.id) === cidStr);
                                if (contest) {
                                    return contest.slug === contestSlug || String(contest._id) === contestSlug || String(contest.id) === contestSlug;
                                }
                                return false;
                            });
                        }
                        if (match) return course.sections;
                    }
                }
            }
        }
        
        return [];
    }, [courses, courseId, problemId, problemIdAliasMap, contestSlug, contests]);
    
    // Auto-expand first section and subsection if courseId is present but no specific problem/subId is focused
    // [Removed] As requested, default to all folders tracking closed on new workspace load.
    // Updated to auto-expand for contests as well via external link
    useEffect(() => {
        const currentItem = problemId || contestSlug;
        if (!currentItem) {
            lastAutoExpandedRef.current = null;
            return;
        }

        if (activeCourseSections.length) {
            // Case 1: User clicked a problem row inside the sidebar.
            // clickedFromRef tells us exactly which section/subsection they clicked from.
            // This handles problems that appear in multiple sections correctly.
            if (clickedFromRef.current) {
                const { sectionId, subId } = clickedFromRef.current;
                clickedFromRef.current = null; // consume the ref
                setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
                setExpandedSubsections(prev => ({ ...prev, [subId]: true }));
                lastAutoExpandedRef.current = currentItem;
                return;
            }

            // Case 2: Direct URL navigation (page load / external link).
            // If we've already auto-expanded for this specific item, don't force it open 
            // again if the user manually closed it.
            if (lastAutoExpandedRef.current === currentItem) return;

            // Find the first section+subsection in data that contains this problem/contest.
            let found = false;
            for (const section of activeCourseSections) {
                if (found) break;
                if (section.subsections) {
                    for (const sub of section.subsections) {
                        let match = false;
                        if (problemId && problems.length) {
                            match = sub.problemIds?.some(pid => {
                                const pidStr = String(pid);
                                const resolvedSlug = problemIdAliasMap[pidStr];
                                return pidStr === problemId || resolvedSlug === problemId;
                            });
                        } else if (contestSlug && contests.length) {
                            match = sub.contestIds?.some(cid => {
                                const cidStr = typeof cid === 'object' ? cid.toString() : cid;
                                const contest = contests.find(c => String(c._id) === cidStr || String(c.id) === cidStr);
                                if (contest) {
                                    return contest.slug === contestSlug || String(contest._id) === contestSlug || String(contest.id) === contestSlug;
                                }
                                return false;
                            });
                        }

                        if (match) {
                            setExpandedSections(prev => ({ ...prev, [section._id]: true }));
                            setExpandedSubsections(prev => ({ ...prev, [sub._id]: true }));
                            lastAutoExpandedRef.current = currentItem;
                            found = true;
                            break;
                        }
                    }
                }
            }
        }
    }, [problems, contests, activeCourseSections, problemId, contestSlug, problemIdAliasMap]);

    const structuredContent = useMemo(() => {
        // Mode 1: Focus View (subId exists AND we DON'T have activeCourseSections AND NOT in a course workspace)
        // If we have courseId, we MUST wait for the tree view to stay consistent
        if (subId && !courseId && (!activeCourseSections || activeCourseSections.length === 0)) {
            if (focusLoading || !focusedData) {
                return { isSubView: true, isLoading: true };
            }

            const subProblems = (focusedData.problems || [])
                .filter(p => difficulty === 'All' || p.difficulty === difficulty)
                .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

            // Apply activeCategory filter to subProblems
            const filteredSubProblems = subProblems.filter(p => {
                if (activeCategory === 'all') return true;
                if (activeCategory === 'articles') return (p.type === 'material' || p.type === 'article');
                if (activeCategory === 'videos') return p.type === 'video';
                if (activeCategory === 'problems') return p.type === 'coding' || p.type === 'sql' || p.type === 'problem' || !p.type;
                if (activeCategory === 'quiz') return p.type === 'quiz';
                if (activeCategory === 'contests') return false;
                return true;
            });

            const videoGroups = filteredSubProblems.filter(p => p.type === 'video');
            const articleGroups = filteredSubProblems.filter(p => p.type === 'material' || p.type === 'article');
            const quizGroups = filteredSubProblems.filter(p => p.type === 'quiz');
            const practiceGroups = filteredSubProblems.filter(p => p.type === 'coding' || p.type === 'sql' || p.type === 'problem' || !p.type);

            const subContests = (focusedData.contests || [])
                .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

            const filteredSubContests = activeCategory === 'all' || activeCategory === 'contests' ? subContests : [];

            return {
                isSubView: true,
                subsectionName: focusedData.subsectionName,
                sectionName: focusedData.sectionName,
                groups: [
                    { title: 'VIDEOS', problems: videoGroups },
                    { title: 'ARTICLES', problems: articleGroups },
                    { title: 'QUIZZES', problems: quizGroups },
                    { title: 'PROBLEMS', problems: practiceGroups },
                    { title: 'CONTESTS', problems: filteredSubContests, isContest: true }
                ].filter(g => g.problems.length > 0)
            };
        }

        // Mode 2: Standard Tree View
        if (!problems.length && !activeCourseSections.length) return null;
        const problemMap = {};
        problems.forEach(p => {
            problemMap[p._id ? p._id.toString() : p.id] = p;
            if (p.id) problemMap[p.id] = p;
        });
        const categorizedProblemIds = new Set();

        const filteredProblems = problems.filter(p => {
            if (activeCategory === 'all') return true;
            if (activeCategory === 'articles') return (p.type === 'material' || p.type === 'article');
            if (activeCategory === 'videos') return p.type === 'video';
            if (activeCategory === 'problems') return p.type === 'coding' || p.type === 'sql' || p.type === 'problem' || !p.type;
            if (activeCategory === 'quiz') return p.type === 'quiz';
            if (activeCategory === 'contests') return false;
            return true;
        });

        const mappedSections = activeCourseSections.map(section => {
            const mappedSubsections = (section.subsections || []).map(subsection => {
                const subsectionProblems = (subsection.problemIds || [])
                    .map(pid => {
                        const pidStr = typeof pid === 'object' ? pid.toString() : pid;
                        categorizedProblemIds.add(pidStr);
                        return problemMap[pidStr];
                    })
                    .filter(p => !!p)
                    // Apply category filter
                    .filter(p => {
                        if (activeCategory === 'all') return true;
                        if (activeCategory === 'articles') return (p.type === 'material' || p.type === 'article');
                        if (activeCategory === 'videos') return p.type === 'video';
                        if (activeCategory === 'problems') return p.type === 'coding' || p.type === 'sql' || p.type === 'problem' || !p.type;
                        if (activeCategory === 'quiz') return p.type === 'quiz';
                        if (activeCategory === 'contests') return false;
                        return true;
                    })
                    .filter(p => difficulty === 'All' || p.difficulty === difficulty)
                    .filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

                const subsectionContests = (subsection.contestIds || [])
                    .map(cid => {
                        const cidStr = typeof cid === 'object' ? cid.toString() : cid;
                        return contests.find(c => (c._id === cidStr || c.id === cidStr));
                    })
                    .filter(c => !!c)
                    .filter(c => activeCategory === 'all' || activeCategory === 'contests')
                    .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));

                return { 
                    ...subsection, 
                    problems: subsectionProblems,
                    contests: subsectionContests 
                };
            }).filter(sub => sub.problems.length > 0 || sub.contests.length > 0);
            return { ...section, subsections: mappedSubsections };
        }).filter(sec => sec.subsections.length > 0);

        const uncategorized = courseId ? [] : filteredProblems.filter(p =>
            !categorizedProblemIds.has(p.id) &&
            !categorizedProblemIds.has(p._id) &&
            (difficulty === 'All' || p.difficulty === difficulty) &&
            p.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return { sections: mappedSections, uncategorized };
    }, [problems, activeCourseSections, activeCategory, difficulty, searchQuery, subId, courseId, focusedData, focusLoading]);

    // Auto-expand on search
    useEffect(() => {
        if (searchQuery.trim() && structuredContent && !structuredContent.isSubView) {
            const newExpSec = {};
            const newExpSub = {};
            (structuredContent.sections || []).forEach(s => {
                newExpSec[s._id] = true;
                (s.subsections || []).forEach(sub => {
                    newExpSub[sub._id] = true;
                });
            });
            setExpandedSections(prev => ({ ...prev, ...newExpSec }));
            setExpandedSubsections(prev => ({ ...prev, ...newExpSub }));
        }
    }, [searchQuery, structuredContent]);

    const toggleSection = (id) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleSubsection = (id) => setExpandedSubsections(prev => ({ ...prev, [id]: !prev[id] }));
    // isActive: id may be slug or ObjectId — URL problemId is always the slug
    const isActive = (id) => {
        if (!id || !problemId) return false;
        const idStr = String(id);
        if (idStr === problemId) return true;
        // Also check if the ObjectId maps to the current slug
        const resolvedSlug = problemIdAliasMap[idStr];
        return resolvedSlug === problemId;
    };

    const displayedProblems = useMemo(() => {
        if (!structuredContent) return [];
        if (structuredContent.isSubView) {
            return (structuredContent.groups || []).flatMap(g => g.problems || []);
        }
        
        const seen = new Set();
        const list = [];
        
        // Add categorized
        (structuredContent.sections || []).forEach(s => {
            (s.subsections || []).forEach(sub => {
                (sub.problems || []).forEach(p => {
                    const id = p._id || p.id;
                    if (!seen.has(id)) {
                        seen.add(id);
                        list.push(p);
                    }
                });
                (sub.contests || []).forEach(c => {
                    const id = c._id || c.id;
                    if (!seen.has(id)) {
                        seen.add(id);
                        list.push(c);
                    }
                });
            });
        });
        
        // Add uncategorized
        (structuredContent.uncategorized || []).forEach(p => {
            const id = p._id || p.id;
            if (!seen.has(id)) {
                seen.add(id);
                list.push(p);
            }
        });
        
        return list;
    }, [structuredContent]);

    const solvedCount = useMemo(() => {
        return displayedProblems.filter(p => p.isSolved || p.isSubmitted).length;
    }, [displayedProblems]);

    const progressPct = displayedProblems.length ? Math.round((solvedCount / displayedProblems.length) * 100) : 0;
    const circumference = 2 * Math.PI * 16; // Increased radius

    // Save/Restore Scroll Position
    useEffect(() => {
        // Only attempt to restore if we're not actively loading the list
        if (!structuredContent?.isLoading && scrollRef.current) {
            const saved = sessionStorage.getItem(`sidebar_scroll_${courseId || 'global'}`);
            if (saved) {
                // Use a small timeout to let the DOM paint the list items first
                setTimeout(() => {
                    if (scrollRef.current) scrollRef.current.scrollTop = parseInt(saved);
                }, 10);
            }
        }

        const handleScroll = () => {
            if (scrollRef.current) {
                // Save immediately without throttle to ensure exact position is caught
                sessionStorage.setItem(`sidebar_scroll_${courseId || 'global'}`, scrollRef.current.scrollTop);
            }
        };

        const el = scrollRef.current;
        if (el) el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el?.removeEventListener('scroll', handleScroll);
    }, [courseId, subId, structuredContent?.isLoading]); // Re-run when data finishes loading

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-[#F1F3F4] dark:bg-[#111117] overflow-hidden border-r border-gray-200 dark:border-gray-800 animate-pulse transition-colors">
                {/* Header Skeleton */}
                <div className="shrink-0 p-4 border-b border-gray-100 dark:border-gray-800 bg-[#F1F3F4] dark:bg-[#111117] z-10">
                    {/* Title row */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-[#111117]"></div>
                            <div className="space-y-2">
                                <div className="w-24 h-4 bg-gray-200 dark:bg-[#111117] rounded"></div>
                                <div className="w-16 h-3 bg-gray-200 dark:bg-[#111117] rounded"></div>
                            </div>
                        </div>
                        {/* Circular progress dummy */}
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#111117] shrink-0"></div>
                    </div>

                    {/* Search Bar Skeleton */}
                    <div className="w-full h-8 bg-gray-100 dark:bg-[#111117] rounded-lg mb-3"></div>

                    {/* Difficulty filter skeleton */}
                    <div className="flex gap-1 bg-gray-50 dark:bg-[#111117]/50 p-1 rounded-lg border border-gray-100 dark:border-gray-800">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex-1 py-1.5 h-6 bg-gray-200 dark:bg-[#111117] rounded-md"></div>
                        ))}
                    </div>
                </div>

                {/* List Skeleton */}
                <div className="flex-1 overflow-hidden p-4 space-y-4">
                    {[1, 2, 3, 4].map((section) => (
                        <div key={section} className="space-y-3">
                            {/* Section header */}
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-5 h-5 rounded bg-gray-200 dark:bg-[#111117] shrink-0"></div>
                                <div className="w-3/4 h-4 bg-gray-200 dark:bg-[#111117] rounded"></div>
                            </div>
                            {/* Problem items */}
                            {[1, 2].map(item => (
                                <div key={item} className="flex items-center gap-3 pl-8">
                                    <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-[#111117] shrink-0"></div>
                                    <div className="w-2/3 h-3 bg-gray-200 dark:bg-[#111117] rounded"></div>
                                    <div className="w-8 h-3 bg-gray-200 dark:bg-[#111117] rounded ml-auto"></div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const categories = [
        { id: 'all', label: 'All', icon: LayoutGrid },
        { id: 'articles', label: 'Articles', icon: FileText },
        { id: 'videos', label: 'Videos', icon: VideoIcon },
        { id: 'problems', label: 'Problems', icon: Code2 },
        { id: 'quiz', label: 'Quiz', icon: HelpCircle },
        { id: 'contests', label: 'Contests', icon: Trophy },
    ];

    return (
        <div className={`flex h-full bg-[#F1F3F4] dark:bg-[#111117] overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-[40px]' : ''}`}>
            {/* ── Collapsed Content Label ── */}
            {isCollapsed && (
                <div 
                    onClick={onToggle}
                    className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                    <div className="flex items-center justify-center w-full">
                        <span className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap text-[10px] font-bold tracking-[0.35em] text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 uppercase transition-colors select-none">
                            CONTENT
                        </span>
                    </div>
                </div>
            )}

            {/* ── Category Bar (Vertical) - Commented out as requested ── */}
            {/* 
            {!isCollapsed && (
                <div className="w-[60px] shrink-0 bg-gray-50/50 dark:bg-[#0F1117] border-r border-gray-200 dark:border-gray-800 flex flex-col items-center py-4 gap-2 transition-colors">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`group relative p-3 rounded-xl transition-all duration-300
                                ${activeCategory === cat.id 
                                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50 shadow-sm' 
                                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <cat.icon size={20} className={activeCategory === cat.id ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
                            <span className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl">
                                {cat.label}
                            </span>
                            {activeCategory === cat.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-purple-600 dark:bg-purple-500 rounded-r-full" />
                            )}
                        </button>
                    ))}
                </div>
            )}
            */}

            {/* ── Main Sidebar List (Hidden when collapsed) ── */}
            {!isCollapsed && (
                <div className="flex flex-col flex-1 min-w-[240px] animate-in fade-in slide-in-from-left-2 duration-300">
                    {/* ── Header ─────────────────────────────────────────────── */}
                    <div className="shrink-0 p-4 border-b border-gray-100 dark:border-gray-800 bg-[#F1F3F4] dark:bg-[#111117] z-10 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="shrink-0 p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                    <CiCircleList className="text-amber-600 dark:text-amber-500 text-xl" />
                                </div>
                                <div className="truncate">
                                    <h2 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                                        {structuredContent?.isSubView 
                                            ? (activeCategory === 'all' ? 'All' : categories.find(c => c.id === activeCategory)?.label)
                                            : (categories.find(c => c.id === activeCategory)?.label || 'All')}
                                    </h2>
                                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">{solvedCount} / {displayedProblems.length} Complete</p>
                                </div>
                            </div>
                            <div className="relative w-8 h-8 shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-100 dark:stroke-gray-800" strokeWidth="3" />
                                    <circle
                                        cx="18" cy="18" r="16" fill="none"
                                        className="stroke-amber-600 dark:stroke-amber-500 transition-all duration-500 ease-out"
                                        strokeWidth="3"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={circumference * (1 - (displayedProblems.length ? solvedCount / displayedProblems.length : 0))}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-amber-600 dark:text-amber-500">{progressPct}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative mb-1 group">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <Search size={13} className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Search ${activeCategory}...`}
                                className="w-full bg-gray-50 dark:bg-[#0F1117] border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 text-[11px] rounded-lg py-1.5 pl-8 pr-7 focus:bg-white dark:focus:bg-[#181820] focus:border-amber-500 dark:focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── List ────────────────────────────────────────────────── */}
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F1F3F4] dark:bg-[#111117] transition-colors pb-10 custom-thin-scrollbar"
                    >
                        {structuredContent?.isSubView ? (
                            structuredContent.isLoading ? (
                                <div className="p-4 space-y-4 animate-pulse">
                                    <div className="px-5 py-3 border-b border-gray-50 dark:border-gray-800 mb-2 flex flex-col gap-2">
                                        <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded"></div>
                                        <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                    </div>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="flex items-center gap-3 px-5 py-2">
                                            <div className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0"></div>
                                            <div className="w-full h-3 bg-gray-50 dark:bg-gray-800/50 rounded"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-left-4 duration-500 pt-2 pb-6">
                                    {structuredContent.groups.map((group, gIdx) => (
                                        <div key={group.title} className={gIdx > 0 ? "mt-5" : ""}>
                                            <div className="px-5 py-2 mb-1 flex items-center justify-between">
                                                <span className="text-[10px] font-black tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">{group.title}</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {group.problems.map(item => (
                                                    group.isContest ? (
                                                        <ContestRow
                                                            key={item.id}
                                                            contest={item}
                                                            active={contestSlug === item.slug || contestSlug === item.id || problemId === item.id}
                                                            indent="pl-5"
                                                            onClick={() => {
                                                                if (courseId) {
                                                                    const contestSlug = item.slug || item.id;
                                                                    navigate(`/workspace/${courseId}/${subId}/contest/${contestSlug}`);
                                                                } else {
                                                                    navigate(`/contests/${item.id}?mode=solo`);
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <ProblemRow
                                                            key={item.id}
                                                            problem={item}
                                                            active={isActive(item.id)}
                                                            indent="pl-5"
                                                            onClick={() => {
                                                                if (courseId) {
                                                                    const c = courses.find(c => String(c._id) === courseId || c.slug === courseId);
                                                                    const cSlug = c?.slug || courseId;
                                                                    navigate(`/workspace/${cSlug}/${subId}/${item.id}`);
                                                                } else {
                                                                    navigate(`/problems/${item.id}?subId=${subId}`);
                                                                }
                                                            }}
                                                        />
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            <>
                                {structuredContent?.sections.map(section => {
                                    const isExpanded = expandedSections[section._id];
                                    
                                    const activeSubIndex = section.subsections.findIndex(s => {
                                        const pActive = (s.problems || []).some(p => isActive(p.id));
                                        const cActive = (s.contests || []).some(c => contestSlug === c.slug || contestSlug === (c.id || c._id) || problemId === (c.id || c._id));
                                        return pActive || cActive;
                                    });

                                    return (
                                        <div key={section._id} className="relative">
                                            <SectionHeader
                                                title={section.title}
                                                expanded={isExpanded}
                                                count={section.subsections.reduce((a, s) => a + s.problems.length + (s.contests?.length || 0), 0)}
                                                onClick={() => toggleSection(section._id)}
                                            />

                                            {isExpanded && (
                                                <div className="relative pb-1">
                                                    {section.subsections.map((sub, sIdx) => {
                                                        const isSubExpanded = expandedSubsections[sub._id];
                                                        const isLastSub = sIdx === section.subsections.length - 1;
                                                        
                                                        const isUpperLineActive = activeSubIndex !== -1 && sIdx <= activeSubIndex;
                                                        const isLowerLineActive = activeSubIndex !== -1 && sIdx < activeSubIndex;
                                                        const isBranchActive = sIdx === activeSubIndex;

                                                        const activeProbIndex = (sub.problems || []).findIndex(p => isActive(p.id));
                                                        const activeContestIndexOffset = (sub.contests || []).findIndex(c => contestSlug === c.slug || contestSlug === (c.id || c._id) || problemId === (c.id || c._id));
                                                        
                                                        const totalProbs = sub.problems?.length || 0;
                                                        const activeItemIndex = activeProbIndex !== -1 ? activeProbIndex : (activeContestIndexOffset !== -1 ? totalProbs + activeContestIndexOffset : -1);
                                                        const totalItems = totalProbs + (sub.contests?.length || 0);

                                                        return (
                                                            <div key={sub._id} className="relative">
                                                                {/* Section -> Subsection tree lines */}
                                                                <div className={`absolute left-[26px] top-0 h-[20px] w-[1px] transition-colors ${isUpperLineActive ? 'bg-amber-600 dark:bg-amber-600/70 z-10' : 'bg-gray-200 dark:bg-gray-800'}`} />
                                                                <div className={`absolute left-[26px] top-[20px] w-[14px] h-[1px] transition-colors ${isBranchActive ? 'bg-amber-600 dark:bg-amber-600/70 z-10' : 'bg-gray-200 dark:bg-gray-800'}`} />
                                                                {!isLastSub && (
                                                                    <div className={`absolute left-[26px] top-[20px] bottom-0 w-[1px] transition-colors ${isLowerLineActive ? 'bg-amber-600 dark:bg-amber-600/70 z-10' : 'bg-gray-200 dark:bg-gray-800'}`} />
                                                                )}

                                                                <SubsectionHeader
                                                                    title={sub.title}
                                                                    expanded={isSubExpanded}
                                                                    count={sub.problems.length}
                                                                    onClick={() => toggleSubsection(sub._id)}
                                                                />

                                                                {isSubExpanded && (
                                                                    <div className="relative pb-2">
                                                                        {sub.problems.map((problem, pIdx) => {
                                                                            const isLastItem = (pIdx === totalItems - 1);
                                                                            const isPUpperLineActive = isBranchActive && activeItemIndex !== -1 && pIdx <= activeItemIndex;
                                                                            const isPLowerLineActive = isBranchActive && activeItemIndex !== -1 && pIdx < activeItemIndex;
                                                                            const isPBranchActive = isBranchActive && pIdx === activeItemIndex;

                                                                            return (
                                                                                <div key={problem.id} className="relative">
                                                                                    {/* Subsection -> Problem tree lines */}
                                                                                    <div className={`absolute left-[48px] top-0 h-[18px] w-[1px] transition-colors ${isPUpperLineActive ? 'bg-amber-600 dark:bg-amber-600/70 z-10' : 'bg-gray-200 dark:bg-gray-800/60'}`} />
                                                                                    <div className={`absolute left-[48px] top-[18px] w-[20px] h-[1px] transition-colors ${isPBranchActive ? 'bg-amber-600 dark:bg-amber-600/70 z-10' : 'bg-gray-200 dark:bg-gray-800/60'}`} />
                                                                                    {!isLastItem && (
                                                                                        <div className={`absolute left-[48px] top-[18px] bottom-0 w-[1px] transition-colors ${isPLowerLineActive ? 'bg-amber-600 dark:bg-amber-600/70 z-10' : 'bg-gray-200 dark:bg-gray-800/60'}`} />
                                                                                    )}

                                                                                    <ProblemRow
                                                                                        problem={problem}
                                                                                        active={isActive(problem.id)}
                                                                                        indent="pl-[68px]"
                                                                                        onClick={() => {
                                                                                            clickedFromRef.current = { sectionId: section._id, subId: sub._id };
                                                                                            if (courseId) {
                                                                                                const c = courses.find(c => String(c._id) === courseId || c.slug === courseId);
                                                                                                const cSlug = c?.slug || courseId;
                                                                                                const sSlug = sub.slug || (sub.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || sub._id;
                                                                                                navigate(`/workspace/${cSlug}/${sSlug}/${problem.id}`);
                                                                                            } else {
                                                                                                navigate(`/problems/${problem.id}?subId=${sub._id}`);
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                        
                                                                        {(sub.contests || []).map((contest, cIdx) => {
                                                                            const trueIdx = totalProbs + cIdx;
                                                                            const isLastItem = (trueIdx === totalItems - 1);
                                                                            const isPUpperLineActive = isBranchActive && activeItemIndex !== -1 && trueIdx <= activeItemIndex;
                                                                            const isPLowerLineActive = isBranchActive && activeItemIndex !== -1 && trueIdx < activeItemIndex;
                                                                            const isPBranchActive = isBranchActive && trueIdx === activeItemIndex;

                                                                            return (
                                                                                <div key={contest.id || contest._id} className="relative">
                                                                                    <div className={`absolute left-[48px] top-0 h-[18px] w-[1px] transition-colors ${isPUpperLineActive ? 'bg-amber-600 dark:bg-amber-600/70 z-10' : 'bg-gray-200 dark:bg-gray-800/60'}`} />
                                                                                    <div className={`absolute left-[48px] top-[18px] w-[20px] h-[1px] transition-colors ${isPBranchActive ? 'bg-amber-600 dark:bg-amber-600/70 z-10' : 'bg-gray-200 dark:bg-gray-800/60'}`} />
                                                                                    {!isLastItem && (
                                                                                        <div className={`absolute left-[48px] top-[18px] bottom-0 w-[1px] transition-colors ${isPLowerLineActive ? 'bg-amber-600 dark:bg-amber-600/70 z-10' : 'bg-gray-200 dark:bg-gray-800/60'}`} />
                                                                                    )}

                                                                                    <ContestRow
                                                                                        contest={contest}
                                                                                        active={contestSlug === contest.slug || contestSlug === (contest.id || contest._id) || problemId === (contest.id || contest._id)}
                                                                                        indent="pl-[68px]"
                                                                                        onClick={() => {
                                                                                            clickedFromRef.current = { sectionId: section._id, subId: sub._id };
                                                                                            if (courseId) {
                                                                                                const contestSlug = contest.slug || contest.id || contest._id;
                                                                                                const sSlug = sub.slug || (sub.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || sub._id;
                                                                                                navigate(`/workspace/${courseId}/${sSlug}/contest/${contestSlug}`);
                                                                                            } else {
                                                                                                navigate(`/contests/${contest.id || contest._id}?mode=solo`);
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {(!structuredContent || (!structuredContent.isLoading && (structuredContent.isSubView ? (structuredContent.problems?.length === 0) : (structuredContent.sections?.length === 0)))) && (
                            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                                <div className="bg-gray-50 dark:bg-[#0F1117] p-4 rounded-full mb-4">
                                    <LayoutGrid size={32} className="opacity-20" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">No content found.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Section Header ──────────────────────────────────────────────────────────
const SectionHeader = ({ title, expanded, count, onClick, noToggle }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-4 transition-all duration-200 border-b border-gray-50/50 dark:border-gray-800/30
                ${expanded ? 'bg-[#F1F3F4] dark:bg-[#111117]' : 'bg-[#F1F3F4] dark:bg-[#111117] hover:bg-gray-50 dark:hover:bg-[#23232e]'}
                ${!noToggle ? 'cursor-pointer' : 'cursor-default'}
            `}
        >
            <div className={`shrink-0 transition-all duration-300 ${expanded ? 'scale-110' : ''}`}>
                {expanded ? (
                    <LuFolderOpenDot size={22} className="text-amber-600" />
                ) : (
                    <LuFolderDot size={22} className="text-amber-600 opacity-80" />
                )}
            </div>

            <span className={`text-sm font-bold flex-1 text-left truncate tracking-tight transition-colors ${expanded ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                {title}
            </span>

            {!noToggle && (
                <ChevronRight
                    size={16}
                    className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 shrink-0 ${expanded ? 'rotate-90 text-amber-600' : ''}`}
                />
            )}
        </button>
    );
};

// ── Subsection Header ────────────────────────────────────────────────────────
const SubsectionHeader = ({ title, expanded, count, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center pr-4 pl-[40px] h-[40px] hover:bg-gray-50/50 dark:hover:bg-[#181820] transition-colors group"
        >
            <div className={`shrink-0 flex items-center justify-center transition-transform duration-200 ${expanded ? 'scale-105' : ''}`}>
                {expanded ? (
                    <LuFolderOpenDot size={18} className="text-amber-600" />
                ) : (
                    <LuFolderDot size={18} className="text-amber-600 opacity-70" />
                )}
            </div>
            <span className={`ml-3 text-[11px] font-black flex-1 text-left truncate tracking-wider uppercase transition-colors ${expanded ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-500'}`}>
                {title}
            </span>
            <ChevronRight
                size={14}
                className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90 text-amber-600' : 'group-hover:text-gray-500'}`}
            />
        </button>
    );
};

// ── Problem Row ──────────────────────────────────────────────────────────────
const ProblemRow = ({ problem, active, indent, onClick }) => {
    const d = DIFF_COLORS[problem.difficulty] || DIFF_COLORS.Easy;
    const isNonCoding = problem.type === 'quiz' || problem.type === 'material' || problem.type === 'article';
    const rowRef = useRef(null);

    useEffect(() => {
        if (active && rowRef.current) {
            rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [active]);

    return (
        <div
            ref={rowRef}
            onClick={onClick}
            className={`
                group flex items-center gap-3 pr-4 h-[36px] cursor-pointer transition-all duration-150 relative
                ${indent}
                ${active
                    ? ''
                    : 'hover:bg-gray-100 dark:hover:bg-[#181820]'
                }
            `}
        >
            <div className="shrink-0 flex items-center justify-center">
                {problem.isSolved ? (
                    <CheckCircle size={14} className="text-green-500 dark:text-green-500/80 fill-green-50 dark:fill-[#064e3b]/20" />
                ) : (
                    problem.type === 'video' ? <VideoIcon size={14} className={active ? "text-amber-600 dark:text-amber-500" : "text-gray-400"} /> :
                    (problem.type === 'material' || problem.type === 'article') ? <FileText size={14} className={active ? "text-amber-600 dark:text-amber-500" : "text-gray-400"} /> :
                    problem.type === 'quiz' ? <HelpCircle size={14} className={active ? "text-amber-600 dark:text-amber-500" : "text-gray-400"} /> :
                    <Code2 size={14} className={active ? "text-amber-600 dark:text-amber-500" : "text-gray-400"} />
                )}
            </div>

            <span className={`flex-1 text-[12px] truncate leading-normal transition-colors
                ${problem.isSolved 
                    ? (active ? 'font-bold text-green-600 dark:text-green-500' : 'font-medium text-green-600 dark:text-green-600/80 group-hover:text-green-600 dark:group-hover:text-green-500/90') 
                    : (active ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300')}
            `}>
                {problem.title}
            </span>

            {(problem.type === 'coding' || problem.type === 'sql') && (
                <span className={`
                    text-[9px] uppercase font-bold px-2 py-0.5 rounded-md shrink-0 tracking-wide
                    ${d.bg} ${d.text}
                `}>
                    {problem.difficulty === 'Medium' ? 'Med' : problem.difficulty}
                </span>
            )}
        </div>
    );
};

// ── Contest Row ──────────────────────────────────────────────────────────────
const ContestRow = ({ contest, active, indent, onClick }) => {
    const rowRef = useRef(null);

    useEffect(() => {
        if (active && rowRef.current) {
            rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [active]);

    return (
        <div
            ref={rowRef}
            onClick={onClick}
            className={`
                group flex items-center gap-3 pr-4 h-[36px] cursor-pointer transition-all duration-150 relative
                ${indent}
                ${active
                    ? ''
                    : 'hover:bg-gray-100 dark:hover:bg-[#181820]'
                }
            `}
        >
            <div className="shrink-0 flex items-center justify-center">
                {(contest.isSolved || contest.isSubmitted) ? (
                    <CheckCircle size={14} className="text-green-500 dark:text-green-500/80 fill-green-50 dark:fill-[#064e3b]/20" />
                ) : (
                    <Trophy size={14} className={active ? "text-amber-600 dark:text-amber-500" : "text-gray-400 group-hover:text-gray-500"} />
                )}
            </div>

            <span className={`flex-1 text-[12px] truncate leading-normal transition-colors
                ${(contest.isSolved || contest.isSubmitted)
                    ? (active ? 'font-bold text-green-600 dark:text-green-500' : 'font-medium text-green-600 dark:text-green-600/80 group-hover:text-green-600 dark:group-hover:text-green-500/90')
                    : (active ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300')}
            `}>
                {contest.title}
            </span>

            <span className={`
                text-[9px] uppercase font-bold px-2 py-0.5 rounded-md shrink-0 tracking-wide
                bg-orange-100/50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400
            `}>
                Contest
            </span>
        </div>
    );
};

export default ProblemSidebar;








