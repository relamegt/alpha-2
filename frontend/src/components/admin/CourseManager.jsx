import { useState, useEffect, useMemo } from 'react';
import courseService from '../../services/courseService';
import problemService from '../../services/problemService';
import contestService from '../../services/contestService';
import uploadService from '../../services/uploadService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Plus,
    Trash2,
    ChevronRight,
    ChevronDown,
    Folder,
    FileText,
    Layers,
    Search,
    Check,
    X,
    BookOpen,
    ArrowLeft,
    Image as ImageIcon,
    Edit3,
    UploadCloud,
    Trophy
} from 'lucide-react';

// Get initials for placeholder avatar
const getInitials = (name) => {
    if (!name) return 'C';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const CourseManager = () => {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // UI View State
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'details'
    const [activeCourseId, setActiveCourseId] = useState(null);

    // Fetch Courses
    const { data: coursesData, isLoading: coursesLoading } = useQuery({
        queryKey: ['courses', 'admin'],
        queryFn: () => courseService.getAllCourses(),
    });
    const courses = coursesData?.courses || [];

    // Fetch Problems
    const { data: problemsData } = useQuery({
        queryKey: ['problems', 'admin'],
        queryFn: () => problemService.getAllProblems(),
    });
    const allProblems = problemsData?.problems || [];

    // Fetch Contests
    const { data: contestsData } = useQuery({
        queryKey: ['contests', 'admin', { includeCourseContests: 'true', bust: String(Date.now()).substring(0, 8) }],
        queryFn: () => contestService.getAllContests({ includeCourseContests: 'true' }),
        staleTime: 0, // Force fresh
        refetchOnWindowFocus: true
    });
    const allContests = contestsData?.contests || [];

    const activeCourse = useMemo(() => 
        courses.find(c => c._id === activeCourseId),
    [courses, activeCourseId]);

    // Expansion State inside Details View
    const [expandedSection, setExpandedSection] = useState(null);
    const [expandedSubsection, setExpandedSubsection] = useState(null);
    const [selectedToRemove, setSelectedToRemove] = useState([]);

    // Modals
    const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
    const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
    const [showCreateSubsectionModal, setShowCreateSubsectionModal] = useState(false);
    const [showAddProblemModal, setShowAddProblemModal] = useState(false);
    const [showEditCourseModal, setShowEditCourseModal] = useState(false);
    const [showEditSectionModal, setShowEditSectionModal] = useState(false);
    const [showEditSubsectionModal, setShowEditSubsectionModal] = useState(false);
    const [showAddContestModal, setShowAddContestModal] = useState(false);

    // Form Data
    const [courseTitle, setCourseTitle] = useState('');
    const [courseDescription, setCourseDescription] = useState('');
    const [courseThumbnail, setCourseThumbnail] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [sectionTitle, setSectionTitle] = useState('');
    const [subsectionTitle, setSubsectionTitle] = useState('');
    
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [selectedSubsectionId, setSelectedSubsectionId] = useState(null);

    // New Contest Creation State (within Course Manager)
    const [contestAddMode, setContestAddMode] = useState('existing'); // 'existing' | 'create'
    const [newContestTitle, setNewContestTitle] = useState('');
    const [newContestDuration, setNewContestDuration] = useState(60);
    const [newContestMaxAttempts, setNewContestMaxAttempts] = useState(1);
    const [newContestTabLimit, setNewContestTabLimit] = useState(3);
    const [newContestMaxViolations, setNewContestMaxViolations] = useState(5);
    const [newContestProblems, setNewContestProblems] = useState([]);
    const [newContestProblemSearch, setNewContestProblemSearch] = useState('');

    // Thumbnail Upload State
    const [pendingThumbnailFile, setPendingThumbnailFile] = useState(null);
    const [pendingThumbnailPreview, setPendingThumbnailPreview] = useState(null);
    const [thumbnailUploading, setThumbnailUploading] = useState(false);

    // Problem Search
    const [problemSearch, setProblemSearch] = useState('');
    
    // Selection & Search State
    const [selectedProblemId, setSelectedProblemId] = useState([]);
    const [contestSearch, setContestSearch] = useState('');
    const [selectedContestId, setSelectedContestId] = useState([]);

    const contestsMap = useMemo(() => {
        const map = { id: {}, slug: {} };
        (allContests || []).forEach(c => {
            const rawId = c._id || c.id;
            const id = (typeof rawId === 'object' && rawId?.$oid) ? String(rawId.$oid) : String(rawId);
            
            if (id && id !== 'undefined' && id !== 'null' && id !== '[object Object]') {
                map.id[id] = c;
            }
            if (c.slug) {
                map.slug[c.slug] = c;
            }
        });
        return map;
    }, [allContests]);

    const problemsMap = useMemo(() => {
        const map = {};
        (allProblems || []).forEach(p => {
            map[p._id || p.id] = p;
        });
        return map;
    }, [allProblems]);

    // Filtering logic using useMemo (replaces useEffects to avoid render loops)
    const filteredProblems = useMemo(() => {
        let available = allProblems || [];
        // Filter out problems already in the selected subsection
        if (selectedCourseId && selectedSectionId && selectedSubsectionId && courses?.length > 0) {
            const course = courses.find(c => c._id === selectedCourseId);
            if (course && course.sections) {
                const section = course.sections.find(s => s._id === selectedSectionId);
                if (section && section.subsections) {
                    const subsection = section.subsections.find(sub => sub._id === selectedSubsectionId);
                    if (subsection && subsection.problemIds) {
                        const existingIds = new Set(subsection.problemIds.map(id => id.toString()));
                        available = available.filter(p => !existingIds.has((p._id || p.id).toString()));
                    }
                }
            }
        }
        if (problemSearch) {
            const lower = problemSearch.toLowerCase();
            return available.filter(p =>
                p.title.toLowerCase().includes(lower) ||
                (p.course && p.course.toLowerCase().includes(lower))
            );
        }
        return available;
    }, [allProblems, problemSearch, selectedCourseId, selectedSectionId, selectedSubsectionId, courses]);

    const filteredContests = useMemo(() => {
        let available = allContests || [];
        if (selectedCourseId && selectedSectionId && selectedSubsectionId && courses?.length > 0) {
            const course = courses.find(c => c._id === selectedCourseId);
            if (course && course.sections) {
                const section = course.sections.find(s => s._id === selectedSectionId);
                if (section && section.subsections) {
                    const subsection = section.subsections.find(sub => sub._id === selectedSubsectionId);
                    if (subsection && subsection.contestIds) {
                        const existingIds = new Set(subsection.contestIds.map(id => id.toString()));
                        available = available.filter(c => !existingIds.has((c._id || c.id).toString()));
                    }
                }
            }
        }
        if (contestSearch) {
            const lower = contestSearch.toLowerCase();
            return available.filter(c =>
                c.title.toLowerCase().includes(lower) ||
                (c.description && c.description.toLowerCase().includes(lower))
            );
        }
        return available;
    }, [allContests, contestSearch, selectedCourseId, selectedSectionId, selectedSubsectionId, courses]);

    const newContestFilteredProblems = useMemo(() => {
        if (newContestProblemSearch) {
            const lower = newContestProblemSearch.toLowerCase();
            return (allProblems || []).filter(p => p.title.toLowerCase().includes(lower));
        }
        return allProblems || [];
    }, [allProblems, newContestProblemSearch]);

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['courses'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['contests'] });
    };
    
    // --- THUMBNAIL LOGIC ---
    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Only image files are allowed');
            return;
        }

        setPendingThumbnailFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPendingThumbnailPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };



    const handleRemoveThumbnail = () => {
        setCourseThumbnail('');
        setThumbnailFile(null);
        setPendingThumbnailFile(null);
        setPendingThumbnailPreview(null);
        toast.success('Thumbnail removed');
    };

    // --- COURSES ---
    const handleCreateCourse = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let finalThumbnail = courseThumbnail;
            if (pendingThumbnailFile) {
                const uploadRes = await uploadService.uploadThumbnail(pendingThumbnailFile);
                if (uploadRes.success) {
                    finalThumbnail = uploadRes.data.url;
                }
            }
            await courseService.createCourse(courseTitle, courseDescription, finalThumbnail);
            toast.success('Course created');
            setShowCreateCourseModal(false);
            setCourseTitle('');
            setCourseDescription('');
            setCourseThumbnail('');
            setPendingThumbnailFile(null);
            setPendingThumbnailPreview(null);
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCourse = async (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Delete this course?\nThis will remove all sections, subsections and problem associations.')) return;
        try {
            await courseService.deleteCourse(id);
            toast.success('Course deleted');
            if (activeCourseId === id) {
                setViewMode('grid');
                setActiveCourseId(null);
            }
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleEditCourse = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let finalThumbnail = courseThumbnail;
            if (pendingThumbnailFile) {
                const uploadRes = await uploadService.uploadThumbnail(pendingThumbnailFile);
                if (uploadRes.success) {
                    finalThumbnail = uploadRes.data.url;
                }
            }
            await courseService.updateCourse(selectedCourseId, courseTitle, courseDescription, finalThumbnail);
            toast.success('Course updated');
            setShowEditCourseModal(false);
            setPendingThumbnailFile(null);
            setPendingThumbnailPreview(null);
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- SECTIONS ---
    const handleAddSection = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await courseService.addSection(activeCourse._id, sectionTitle);
            toast.success('Section added');
            setShowCreateSectionModal(false);
            setSectionTitle('');
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSection = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await courseService.updateSection(activeCourse._id, selectedSectionId, sectionTitle);
            toast.success('Section updated');
            setShowEditSectionModal(false);
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSection = async (courseId, sectionId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Delete this section?\nThis will remove all subsections inside.')) return;
        try {
            await courseService.deleteSection(courseId, sectionId);
            toast.success('Section deleted');
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        }
    };

    // --- SUBSECTIONS ---
    const handleAddSubsection = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await courseService.addSubsection(activeCourse._id, selectedSectionId, subsectionTitle);
            toast.success('Subsection added');
            setShowCreateSubsectionModal(false);
            setSubsectionTitle('');
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSubsection = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await courseService.updateSubsection(activeCourse._id, selectedSectionId, selectedSubsectionId, subsectionTitle);
            toast.success('Subsection updated');
            setShowEditSubsectionModal(false);
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSubsection = async (courseId, sectionId, subsectionId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Delete this subsection?')) return;
        try {
            await courseService.deleteSubsection(courseId, sectionId, subsectionId);
            toast.success('Subsection deleted');
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        }
    };

    // --- PROBLEMS ---
    const handleAddProblem = async (e) => {
        e.preventDefault();
        if (!selectedProblemId || selectedProblemId.length === 0) {
            toast.error('Please select at least one problem');
            return;
        }
        setIsSubmitting(true);
        try {
            await courseService.addProblemToSubsection(activeCourse._id, selectedSectionId, selectedSubsectionId, selectedProblemId);
            toast.success('Problem(s) added to subsection');
            setShowAddProblemModal(false);
            setSelectedProblemId([]); // Clear selection
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveProblem = async (courseId, sectionId, subsectionId, problemId) => {
        // Can handle array or single string
        const isMultiple = Array.isArray(problemId);
        const count = isMultiple ? problemId.length : 1;

        if (count === 0) return;
        if (!window.confirm(`Remove ${count} problem(s) from this subsection?`)) return;

        try {
            const res = await courseService.removeProblemFromSubsection(courseId, sectionId, subsectionId, problemId);
            if (res.success) {
                toast.success('Problem(s) removed');
                invalidateAll();
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleAddContest = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Ensure IDs are strings
            const contestIds = (Array.isArray(selectedContestId) ? selectedContestId : [selectedContestId])
                .map(cid => cid?.$oid || cid?.toString() || cid);

            await courseService.addContestToSubsection(selectedCourseId, selectedSectionId, selectedSubsectionId, contestIds);
            toast.success('Contest(s) added');
            setShowAddContestModal(false);
            setSelectedContestId([]);
            setContestSearch('');
            invalidateAll();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAndAddContest = async (e) => {
        e.preventDefault();
        if (!newContestTitle.trim()) return toast.error('Contest title is required');
        if (newContestProblems.length === 0) return toast.error('Select at least one problem to include');

        setIsSubmitting(true);
        try {
            // Create a specialized course contest
            const contestRes = await contestService.createContest({
                title: newContestTitle,
                description: `Course Contest for ${activeCourse.title}`,
                startTime: new Date(),
                endTime: new Date('2099-12-31'), // Effectively always open
                problems: newContestProblems,
                isSolo: true,
                duration: newContestDuration,
                maxAttempts: newContestMaxAttempts,
                courseId: activeCourse._id,
                proctoringEnabled: true,
                tabSwitchLimit: newContestTabLimit,
                maxViolations: newContestMaxViolations
            });

            if (!contestRes.success) throw new Error(contestRes.message || 'Failed to create contest');

            // Extract real string ID correctly
            const contest = contestRes.contest;
            const contestId = contest?._id?.$oid || (typeof contest?._id === 'string' ? contest._id : contest?._id?.toString()) || contest?.id;
            
            if (!contestId) throw new Error('Create succeeded but ID missing');

            // Link to subsection
            await courseService.addContestToSubsection(
                activeCourse._id, 
                selectedSectionId, 
                selectedSubsectionId, 
                [String(contestId)]
            );

            toast.success('New contest created and assigned to subsection');
            setShowAddContestModal(false);
            setContestAddMode('existing');
            setNewContestTitle('');
            setNewContestProblems([]);
            setNewContestDuration(60);
            setNewContestMaxAttempts(1);
            invalidateAll();
        } catch (error) {
            console.error('Create and add contest error:', error);
            toast.error(error.message || 'Failed to create and add contest');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveContest = async (contestIds) => {
        try {
            const res = await courseService.removeContestFromSubsection(activeCourseId, expandedSection, expandedSubsection, contestIds);
            if (res.success) {
                toast.success('Contest(s) removed');
                invalidateAll();
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // --- TOGGLES ---
    const toggleProblemToRemove = (pid) => {
        setSelectedToRemove(prev =>
            prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
        );
    };

    const openCourseDetails = (course) => {
        setActiveCourseId(course._id);
        setViewMode('details');
        setExpandedSection(null);
        setExpandedSubsection(null);
        setSelectedToRemove([]);
    };

    const toggleSection = (id) => {
        if (expandedSection === id) {
            setExpandedSection(null);
            setExpandedSubsection(null);
        } else {
            setExpandedSection(id);
            setExpandedSubsection(null);
        }
        setSelectedToRemove([]); 
    };

    const toggleSubsection = (id) => {
        if (expandedSubsection === id) {
            setExpandedSubsection(null);
        } else {
            setExpandedSubsection(id);
        }
        setSelectedToRemove([]);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    {viewMode === 'details' ? (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    setViewMode('grid');
                                    setActiveCourseId(null);
                                    invalidateAll();
                                }}
                                className="btn-secondary p-2 rounded-full text-gray-600 dark:text-gray-300"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{activeCourse.title}</h1>
                                <p className="page-header-desc">Manage sections, subsections, and problems</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                                Course Management
                            </h1>
                            <p className="page-header-desc">Organize learning content into courses, sections, and subsections.</p>
                        </>
                    )}
                </div>
                {viewMode === 'grid' ? (
                    <button
                        onClick={() => setShowCreateCourseModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Create Course
                    </button>
                ) : (
                    <button
                        onClick={() => setShowCreateSectionModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Section
                    </button>
                )}
            </div>

            {coursesLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="spinner"></div>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <div key={course._id} onClick={() => openCourseDetails(course)} className="bg-[#F1F3F4] dark:bg-[#111117] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border border-gray-100 dark:border-gray-800 rounded-2xl cursor-pointer flex flex-col group relative">
                            {/* Actions overlay */}
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCourseId(course._id);
                                        setCourseTitle(course.title);
                                        setCourseDescription(course.description || '');
                                        setCourseThumbnail(course.thumbnailUrl || '');
                                        setThumbnailFile(null);
                                        setShowEditCourseModal(true);
                                    }}
                                    className="p-2 bg-white/90 dark:bg-black/60 backdrop-blur-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors shadow-sm"
                                    title="Edit Course"
                                >
                                    <Edit3 size={16} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteCourse(course._id, e)}
                                    className="p-2 bg-white/90 dark:bg-black/60 backdrop-blur-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors shadow-sm"
                                    title="Delete Course"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Thumbnail / Avatar */}
                            <div className="h-40 w-full relative bg-gradient-to-br from-purple-100 to-indigo-50 dark:from-purple-900/40 dark:to-indigo-900/20 overflow-hidden flex items-center justify-center border-b border-gray-100 dark:border-gray-800">
                                {course.thumbnailUrl ? (
                                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center opacity-80">
                                        <div className="w-20 h-20 bg-white/60 dark:bg-black/40 rounded-full flex items-center justify-center text-3xl font-bold text-purple-700 dark:text-purple-300 shadow-sm backdrop-blur-sm mb-2">
                                            {getInitials(course.title)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                    {course.title}
                                </h3>
                                {course.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
                                        {course.description}
                                    </p>
                                )}
                                <div className="mt-auto flex items-center gap-3 pt-4 border-t border-gray-50 dark:border-gray-800/60">
                                    <div className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/80 px-2.5 py-1 rounded-full gap-1.5 border border-gray-100 dark:border-gray-700/50">
                                        <Layers size={14} className="text-purple-500" />
                                        <span>{course.sections?.length || 0} Sections</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {courses.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-[#F1F3F4] dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center">
                            <div className="w-20 h-20 bg-gradient-to-tr from-purple-100 to-indigo-50 dark:from-purple-900/40 dark:to-indigo-900/20 rounded-full flex items-center justify-center mb-5 shadow-sm border border-purple-200/50 dark:border-purple-700/30">
                                <BookOpen size={36} className="text-purple-500 dark:text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No courses found</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">Craft your first learning journey by creating a course. Add rich content, sections, and interactive problems.</p>
                            <button
                                onClick={() => setShowCreateCourseModal(true)}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Plus size={18} /> Create First Course
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="glass-panel p-2 shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl">
                        <div className="bg-gray-50/50 dark:bg-[#111117] p-2 space-y-3 animate-fade-in rounded-lg">
                            {activeCourse.sections && activeCourse.sections.length > 0 ? (
                                activeCourse.sections.map(section => (
                                    <div key={section._id} className="bg-[#F1F3F4] dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all hover:shadow-md">
                                        {/* Section Header */}
                                        <div
                                            className={`p-3 flex justify-between items-center cursor-pointer transition-colors duration-200 ${expandedSection === section._id ? 'bg-primary-50/30 dark:bg-primary-900/10' : 'hover:bg-gray-50 dark:hover:bg-[#23232e]/40'}`}
                                            onClick={() => toggleSection(section._id)}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${expandedSection === section._id ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                                                    {expandedSection === section._id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </div>
                                                <div>
                                                    <h4 className="text-md font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                        {section.title}
                                                    </h4>
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        {section.subsections?.length || 0} subsections
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSectionId(section._id);
                                                        setShowCreateSubsectionModal(true);
                                                    }}
                                                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                                                >
                                                    <Plus size={14} />
                                                    Add Subsection
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSectionId(section._id);
                                                        setSectionTitle(section.title);
                                                        setShowEditSectionModal(true);
                                                    }}
                                                    className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 p-1.5 rounded-lg transition-colors"
                                                    title="Edit Section"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteSection(activeCourse._id, section._id, e)}
                                                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg transition-colors"
                                                    title="Delete Section"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Section Content (Subsections) */}
                                        {expandedSection === section._id && (
                                            <div className="bg-gray-50/30 border-t border-gray-100 p-3 space-y-2 animate-fade-in pl-10">
                                                {section.subsections && section.subsections.length > 0 ? (
                                                    section.subsections.map(sub => (
                                                        <div key={sub._id} className="bg-[#F1F3F4] dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all">
                                                            <div
                                                                className="p-2.5 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                                onClick={() => toggleSubsection(sub._id)}
                                                            >
                                                                <div className="flex items-center space-x-3">
                                                                    <div className={`p-1 rounded-md transition-colors ${expandedSubsection === sub._id ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                        {expandedSubsection === sub._id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                    </div>
                                                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                                                        <Folder size={14} className="text-gray-400 dark:text-gray-500" />
                                                                        {sub.title}
                                                                    </span>
                                                                    <span className="text-[10px] text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full font-medium">
                                                                        {sub.problemIds?.length || 0} problems
                                                                    </span>
                                                                    {sub.contestIds?.length > 0 && (
                                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full font-medium">
                                                                            {sub.contestIds.length} contests
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedSectionId(section._id);
                                                                            setSelectedSubsectionId(sub._id);
                                                                            setShowAddProblemModal(true);
                                                                        }}
                                                                        className="btn-secondary text-[10px] px-2.5 py-1 flex items-center gap-1"
                                                                    >
                                                                        <Plus size={12} />
                                                                        Add Problem
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedCourseId(activeCourseId);
                                                                            setSelectedSectionId(section._id);
                                                                            setSelectedSubsectionId(sub._id);
                                                                            setShowAddContestModal(true);
                                                                        }}
                                                                        className="btn-secondary text-[10px] px-2.5 py-1 flex items-center gap-1"
                                                                    >
                                                                        <Plus size={12} />
                                                                        Add Contest
                                                                    </button>
                                                                    <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedSectionId(section._id);
                                                                            setSelectedSubsectionId(sub._id);
                                                                            setSubsectionTitle(sub.title);
                                                                            setShowEditSubsectionModal(true);
                                                                        }}
                                                                        className="btn-secondary p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                                                                        title="Edit Subsection"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => handleDeleteSubsection(activeCourse._id, section._id, sub._id, e)}
                                                                        className="btn-secondary p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 border-transparent hover:border-red-200 dark:hover:border-red-800"
                                                                        title="Delete Subsection"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Problems List */}
                                                            {expandedSubsection === sub._id && (
                                                                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-[#111117]/20">
                                                                    {sub.problemIds && sub.problemIds.length > 0 ? (
                                                                        <>
                                                                            {selectedToRemove.length > 0 && (
                                                                                <div className="px-3 py-1.5 bg-red-50 border-b border-red-100 flex justify-between items-center">
                                                                                    <span className="text-xs font-medium text-red-700">{selectedToRemove.length} problem(s) selected</span>
                                                                                    <button
                                                                                        onClick={() => handleRemoveProblem(activeCourse._id, section._id, sub._id, selectedToRemove)}
                                                                                        className="btn-primary bg-red-600 hover:bg-red-700 text-white text-[10px] px-2.5 py-1"
                                                                                    >
                                                                                        Remove Selected
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                                                                {sub.problemIds.map(pid => {
                                                                                    const problem = problemsMap[pid];
                                                                                    const isChecked = selectedToRemove.includes(pid);

                                                                                    return (
                                                                                        <li key={pid} className={`flex justify-between items-center p-2.5 pl-6 transition-colors group ${isChecked ? 'bg-red-50/40 dark:bg-red-900/10' : 'hover:bg-white dark:hover:bg-[#23232e]'}`}>
                                                                                            <div className="flex items-center space-x-2">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={isChecked}
                                                                                                    onChange={() => toggleProblemToRemove(pid)}
                                                                                                    className="w-3.5 h-3.5 text-primary-600 bg-[#F1F3F4] dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 mr-2 cursor-pointer"
                                                                                                />
                                                                                                <FileText size={14} className="text-gray-400 dark:text-gray-500" />
                                                                                                <span className="text-gray-700 dark:text-gray-200 text-xs font-medium">
                                                                                                    {problem ? problem.title : 'Unknown Problem'}
                                                                                                </span>
                                                                                                {problem && (
                                                                                                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-bold ${problem.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                                                                                        problem.difficulty === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                                                                            'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                                                                                        }`}>
                                                                                                        {problem.difficulty}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={() => handleRemoveProblem(activeCourse._id, section._id, sub._id, pid)}
                                                                                                className="btn-secondary p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 border-transparent hover:border-red-200 dark:hover:border-red-800 opacity-0 group-hover:opacity-100"
                                                                                                title="Remove from subsection"
                                                                                            >
                                                                                                <Trash2 size={12} />
                                                                                            </button>
                                                                                        </li>
                                                                                    );
                                                                                })}
                                                                            </ul>
                                                                        </>
                                                                    ) : (
                                                                        <div className="p-4 text-center">
                                                                            <p className="text-xs text-gray-400 dark:text-gray-500 flex flex-col items-center gap-1.5">
                                                                                <Layers size={20} className="text-gray-300 dark:text-gray-600" />
                                                                                No problems in this subsection
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {sub.contestIds && sub.contestIds.length > 0 && (
                                                                        <div className="mt-2 pt-2 border-t border-[var(--color-border-interactive)]/50">
                                                                            <div className="px-4 mb-2 flex items-center gap-2">
                                                                                <Trophy size={14} className="text-amber-500" />
                                                                                <span className="text-[10px] font-black tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">CONTESTS</span>
                                                                            </div>
                                                                             <ul className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                                                                {sub.contestIds.map(cid => {
                                                                                    const rawId = cid?.$oid || cid;
                                                                                    const contestId = String(rawId);
                                                                                    const contest = contestsMap.id[contestId] || contestsMap.slug[contestId];
                                                                                    
                                                                                    if (!contest) {
                                                                                        return (
                                                                                            <li key={contestId} className="group/item flex items-center justify-between p-3.5 pl-8 bg-amber-50/20 dark:bg-amber-900/5 border-l-4 border-amber-400/30 dark:border-amber-500/10">
                                                                                                <div className="flex items-center gap-4">
                                                                                                    <div className="p-2 bg-amber-100/30 dark:bg-amber-900/20 rounded-lg">
                                                                                                        <Trophy size={14} className="text-amber-600/50 dark:text-amber-500/30" />
                                                                                                    </div>
                                                                                                    <div className="flex flex-col">
                                                                                                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Unlinked Course Contest</span>
                                                                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">Reference: {contestId.substring(0, 16)}...</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <button 
                                                                                                    onClick={() => handleRemoveContest(contestId)} 
                                                                                                    className="btn-secondary p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 border-transparent hover:border-red-200 dark:hover:border-red-800 opacity-0 group-hover/item:opacity-100 mr-2"
                                                                                                    title="Remove from course"
                                                                                                >
                                                                                                    <Trash2 size={16} />
                                                                                                </button>
                                                                                            </li>
                                                                                        );
                                                                                    }
                                                                                    return (
                                                                                        <li key={contestId} className="group/item flex items-center justify-between p-3.5 pl-8 hover:bg-white dark:hover:bg-gray-800/40 transition-colors border-l-4 border-transparent hover:border-primary-500 dark:hover:border-primary-400">
                                                                                            <div className="flex items-center gap-4">
                                                                                                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg group-hover/item:bg-amber-100 dark:group-hover/item:bg-amber-900/50 transition-colors border border-amber-100 dark:border-amber-800/30">
                                                                                                    <Trophy size={16} className="text-amber-600 dark:text-amber-400" />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover/item:text-primary-600 dark:group-hover/item:text-primary-400 transition-colors">{contest.title}</h4>
                                                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/20">Course Mode</span>
                                                                                                        {contest.problems && (
                                                                                                            <div className="flex items-center gap-1.5 ml-2">
                                                                                                                <Layers size={10} className="text-gray-400" />
                                                                                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                                                                                                                    {contest.problems.length} problems integrated
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1 mr-2">
                                                                                                <button
                                                                                                    onClick={() => handleRemoveContest(contestId)}
                                                                                                    className="btn-secondary p-2 opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-600 dark:hover:text-red-400 border-transparent hover:border-red-200 dark:hover:border-red-800"
                                                                                                    title="Remove from course"
                                                                                                >
                                                                                                    <Trash2 size={16} />
                                                                                                </button>
                                                                                            </div>
                                                                                        </li>
                                                                                    );
                                                                                })}
                                                                            </ul>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-5 border-2 border-dashed border-[var(--color-border-interactive)] rounded-lg bg-white/50 dark:bg-gray-800/50">
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">Each section needs at least one subsection to hold problems.</p>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSectionId(section._id);
                                                                setShowCreateSubsectionModal(true);
                                                            }}
                                                            className="text-primary-600 dark:text-primary-400 font-medium text-xs hover:underline flex items-center justify-center gap-1 mx-auto"
                                                        >
                                                            <Plus size={12} /> Create your first subsection
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-[var(--color-border-interactive)] rounded-xl bg-white/50 dark:bg-gray-800/50 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-gradient-to-tr from-purple-100 to-indigo-50 dark:from-purple-900/40 dark:to-indigo-900/20 rounded-full flex items-center justify-center mb-4 shadow-sm border border-purple-200/50 dark:border-purple-700/30">
                                        <Layers size={28} className="text-purple-500 dark:text-purple-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No sections defined</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">Every course needs structural sections (e.g., Arrays, Trees) to organize knowledge blocks.</p>
                                    <button
                                        onClick={() => setShowCreateSectionModal(true)}
                                        className="btn-primary"
                                    >
                                        <Plus size={16} className="mr-2 inline" /> Add First Section
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Course Modal */}
            {showCreateCourseModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateCourseModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                                <BookOpen size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create New Course</h2>
                        </div>
                        <form onSubmit={handleCreateCourse} className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Title</label>
                                <input
                                    type="text"
                                    value={courseTitle}
                                    onChange={(e) => setCourseTitle(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="e.g. Data Structures and Algorithms"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                                <textarea
                                    value={courseDescription}
                                    onChange={(e) => setCourseDescription(e.target.value)}
                                    className="input-field w-full min-h-[80px]"
                                    placeholder="Brief course overview..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Thumbnail (Optional)</label>
                                <div className="mt-1 flex flex-col items-center gap-3">
                                    <label className="relative group w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-[var(--color-border-interactive)] flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                                        <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailChange} disabled={thumbnailUploading} />
                                        
                                        {(pendingThumbnailPreview || courseThumbnail) ? (
                                            <>
                                                <img 
                                                    src={pendingThumbnailPreview || courseThumbnail} 
                                                    alt="Thumbnail Preview" 
                                                    className="w-full h-full object-cover"
                                                />
                                                {!pendingThumbnailFile && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleRemoveThumbnail();
                                                        }}
                                                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                                        title="Remove thumbnail"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <div className="bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-lg">
                                                        <UploadCloud size={24} className="text-primary-600" />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-primary-500 transition-colors">
                                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-full group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
                                                    <ImageIcon size={32} />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm font-bold block text-gray-700 dark:text-gray-300 group-hover:text-primary-600 transition-colors">Click to upload thumbnail</span>
                                                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">JPG, PNG, WebP (Max 5MB)</span>
                                                </div>
                                            </div>
                                        )}
                                    </label>


                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateCourseModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary px-6" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {showEditCourseModal && (
                <div className="modal-backdrop" onClick={() => setShowEditCourseModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Edit3 size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Course</h2>
                        </div>
                        <form onSubmit={handleEditCourse} className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Title</label>
                                <input
                                    type="text"
                                    value={courseTitle}
                                    onChange={(e) => setCourseTitle(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="e.g. Data Structures and Algorithms"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                                <textarea
                                    value={courseDescription}
                                    onChange={(e) => setCourseDescription(e.target.value)}
                                    className="input-field w-full min-h-[80px]"
                                    placeholder="Brief course overview..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Thumbnail (Optional)</label>
                                <div className="mt-1 flex flex-col items-center gap-3">
                                    <label className="relative group w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-[var(--color-border-interactive)] flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                                        <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailChange} disabled={thumbnailUploading} />
                                        
                                        {(pendingThumbnailPreview || courseThumbnail) ? (
                                            <>
                                                <img 
                                                    src={pendingThumbnailPreview || courseThumbnail} 
                                                    alt="Thumbnail Preview" 
                                                    className="w-full h-full object-cover"
                                                />
                                                {!pendingThumbnailFile && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleRemoveThumbnail();
                                                        }}
                                                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                                        title="Remove thumbnail"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <div className="bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-lg">
                                                        <UploadCloud size={24} className="text-primary-600" />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-primary-500 transition-colors">
                                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-full group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
                                                    <ImageIcon size={32} />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-sm font-bold block text-gray-700 dark:text-gray-300 group-hover:text-primary-600 transition-colors">Click to upload thumbnail</span>
                                                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">JPG, PNG, WebP (Max 5MB)</span>
                                                </div>
                                            </div>
                                        )}
                                    </label>


                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowEditCourseModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary px-6" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Section Modal */}
            {showCreateSectionModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateSectionModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                                <Layers size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Section</h2>
                        </div>
                        <form onSubmit={handleAddSection} className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Section Title</label>
                                <input
                                    type="text"
                                    value={sectionTitle}
                                    onChange={(e) => setSectionTitle(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="e.g. Dynamic Programming"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateSectionModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary px-6" disabled={isSubmitting}>
                                    {isSubmitting ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Subsection Modal */}
            {showCreateSubsectionModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateSubsectionModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                                <Folder size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Subsection</h2>
                        </div>
                        <form onSubmit={handleAddSubsection} className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subsection Title</label>
                                <input
                                    type="text"
                                    value={subsectionTitle}
                                    onChange={(e) => setSubsectionTitle(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="e.g. 1D DP"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateSubsectionModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary px-6" disabled={isSubmitting}>
                                    {isSubmitting ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Section Modal */}
            {showEditSectionModal && (
                <div className="modal-backdrop" onClick={() => setShowEditSectionModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Edit3 size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Section</h2>
                        </div>
                        <form onSubmit={handleEditSection} className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Section Title</label>
                                <input
                                    type="text"
                                    value={sectionTitle}
                                    onChange={(e) => setSectionTitle(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="e.g. Dynamic Programming"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowEditSectionModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary px-6" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Subsection Modal */}
            {showEditSubsectionModal && (
                <div className="modal-backdrop" onClick={() => setShowEditSubsectionModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Edit3 size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Subsection</h2>
                        </div>
                        <form onSubmit={handleEditSubsection} className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subsection Title</label>
                                <input
                                    type="text"
                                    value={subsectionTitle}
                                    onChange={(e) => setSubsectionTitle(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="e.g. 1D DP"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowEditSubsectionModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary px-6" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Problem Modal */}
            {showAddProblemModal && (
                <div className="modal-backdrop" onClick={() => setShowAddProblemModal(false)}>
                    <div className="modal-content max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Problem to Subsection</h2>
                            <button onClick={() => setShowAddProblemModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                <span className="sr-only">Close</span>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={problemSearch}
                                onChange={(e) => setProblemSearch(e.target.value)}
                                className="input-field w-full pl-9"
                                placeholder="Search by title..."
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl mb-4 bg-gray-50/50 dark:bg-gray-800/30">
                            {filteredProblems.length > 0 ? (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredProblems.map(p => {
                                        const isSelected = Array.isArray(selectedProblemId)
                                            ? selectedProblemId.includes(p._id || p.id)
                                            : selectedProblemId === (p._id || p.id);
                                        return (
                                            <li
                                                key={p._id || p.id}
                                                className={`p-3 cursor-pointer transition-colors flex justify-between items-center ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-white dark:hover:bg-gray-800/50'}`}
                                                onClick={() => {
                                                    const pid = p._id || p.id;
                                                    const current = Array.isArray(selectedProblemId) ? selectedProblemId : (selectedProblemId ? [selectedProblemId] : []);
                                                    if (current.includes(pid)) {
                                                        setSelectedProblemId(current.filter(id => id !== pid));
                                                    } else {
                                                        setSelectedProblemId([...current, pid]);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600 bg-[#F1F3F4] dark:bg-gray-900'}`}>
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200 text-sm">{p.title}</span>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : p.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-amber-900/30 text-yellow-700 dark:text-amber-400' : 'bg-red-100 dark:bg-rose-900/30 text-red-700 dark:text-rose-400'}`}>
                                                    {p.difficulty}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                    <Search size={24} className="mb-2 opacity-20" />
                                    <p>No problems found.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            <div className="text-sm text-gray-500 font-medium">
                                {Array.isArray(selectedProblemId) ? selectedProblemId.length : (selectedProblemId ? 1 : 0)} selected
                            </div>
                            <div className="flex space-x-3">
                                <button type="button" onClick={() => setShowAddProblemModal(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddProblem({ preventDefault: () => { } })}
                                    className="btn-primary"
                                    disabled={!selectedProblemId || (Array.isArray(selectedProblemId) && selectedProblemId.length === 0) || isSubmitting}
                                >
                                    {isSubmitting ? 'Adding...' : 'Add Selected'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Contest Modal */}
            {showAddContestModal && (
                <div className="modal-backdrop" onClick={() => setShowAddContestModal(false)}>
                    <div className="modal-content max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Contest to Subsection</h2>
                            <button onClick={() => setShowAddContestModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                <span className="sr-only">Close</span>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Mode Switcher Tabs */}
                        <div className="flex border-b border-[var(--color-border-interactive)] mb-6 shrink-0">
                            <button
                                onClick={() => setContestAddMode('existing')}
                                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${contestAddMode === 'existing' ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Existing Contests
                            </button>
                            <button
                                onClick={() => setContestAddMode('create')}
                                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${contestAddMode === 'create' ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Create New Quiz/Contest
                            </button>
                        </div>

                        {contestAddMode === 'existing' ? (
                            <>
                                <div className="relative mb-4 shrink-0">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={contestSearch}
                                        onChange={(e) => setContestSearch(e.target.value)}
                                        className="input-field w-full pl-9"
                                        placeholder="Search by title..."
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl mb-4 bg-gray-50/50 dark:bg-gray-800/30">
                                    {filteredContests.length > 0 ? (
                                        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {filteredContests.map(c => {
                                                const cid = c._id || c.id;
                                                const isSelected = selectedContestId.includes(cid);
                                                return (
                                                    <li
                                                        key={cid}
                                                        className={`p-3 cursor-pointer transition-colors flex justify-between items-center ${isSelected ? 'bg-amber-50 dark:bg-amber-900/30' : 'hover:bg-white dark:hover:bg-gray-800/50'}`}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSelectedContestId(selectedContestId.filter(id => id !== cid));
                                                            } else {
                                                                setSelectedContestId([...selectedContestId, cid]);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-amber-600 border-amber-600' : 'border-gray-300 dark:border-gray-600 bg-[#F1F3F4] dark:bg-gray-900'}`}>
                                                                {isSelected && <Check size={12} className="text-white" />}
                                                            </div>
                                                            <div>
                                                                <span className="font-bold text-gray-900 dark:text-gray-200 text-sm block">{c.title}</span>
                                                                <span className="text-[10px] text-gray-500">{new Date(c.startTime).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <Trophy size={16} className="text-amber-500 opacity-50" />
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                            <Trophy size={24} className="mb-2 opacity-20" />
                                            <p>No contests found.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-gray-100 shrink-0">
                                    <div className="text-sm text-gray-500 font-medium">
                                        {selectedContestId.length} selected
                                    </div>
                                    <div className="flex space-x-3">
                                        <button type="button" onClick={() => setShowAddContestModal(false)} className="btn-secondary">
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleAddContest}
                                            className="btn-primary"
                                            disabled={selectedContestId.length === 0 || isSubmitting}
                                        >
                                            {isSubmitting ? 'Adding...' : 'Add Selected'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleCreateAndAddContest} className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contest/Quiz Title</label>
                                            <input
                                                type="text"
                                                value={newContestTitle}
                                                onChange={(e) => setNewContestTitle(e.target.value)}
                                                className="input-field w-full"
                                                placeholder="e.g. Arrays Final Assessment"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (minutes)</label>
                                                <input
                                                    type="number"
                                                    value={newContestDuration}
                                                    onChange={(e) => setNewContestDuration(parseInt(e.target.value))}
                                                    className="input-field w-full"
                                                    min="1"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Attempts</label>
                                                <input
                                                    type="number"
                                                    value={newContestMaxAttempts}
                                                    onChange={(e) => setNewContestMaxAttempts(parseInt(e.target.value))}
                                                    className="input-field w-full"
                                                    min="1"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tab Switch Limit</label>
                                                <input
                                                    type="number"
                                                    value={newContestTabLimit}
                                                    onChange={(e) => setNewContestTabLimit(parseInt(e.target.value))}
                                                    className="input-field w-full"
                                                    min="1"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Violations</label>
                                                <input
                                                    type="number"
                                                    value={newContestMaxViolations}
                                                    onChange={(e) => setNewContestMaxViolations(parseInt(e.target.value))}
                                                    className="input-field w-full"
                                                    min="1"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col h-64 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-[#F1F3F4] dark:bg-gray-900/50">
                                            <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Problems</span>
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                                                    <input
                                                        type="text"
                                                        value={newContestProblemSearch}
                                                        onChange={(e) => setNewContestProblemSearch(e.target.value)}
                                                        className="pl-8 pr-2 py-1 text-xs border border-gray-100 dark:border-gray-800 rounded-lg bg-[#F1F3F4] dark:bg-gray-800 w-40"
                                                        placeholder="Quick search..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto">
                                                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                                                    {newContestFilteredProblems.map(p => {
                                                        const isSelected = newContestProblems.includes(p._id || p.id);
                                                        return (
                                                            <li 
                                                                key={p._id || p.id}
                                                                className={`p-2.5 cursor-pointer text-sm transition-colors flex items-center gap-3 ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                                                onClick={() => {
                                                                    const pid = p._id || p.id;
                                                                    if (isSelected) {
                                                                        setNewContestProblems(prev => prev.filter(id => id !== pid));
                                                                    } else {
                                                                        setNewContestProblems(prev => [...prev, pid]);
                                                                    }
                                                                }}
                                                            >
                                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                    {isSelected && <Check size={10} className="text-white" />}
                                                                </div>
                                                                <span className="text-gray-700 dark:text-gray-300 flex-1">{p.title}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded font-medium">{p.difficulty}</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t border-gray-100 mt-4 shrink-0">
                                    <div className="text-sm font-bold text-gray-400">
                                        {newContestProblems.length} Problems Selected
                                    </div>
                                    <div className="flex space-x-3">
                                        <button type="button" onClick={() => setShowAddContestModal(false)} className="btn-secondary">
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn-primary"
                                            disabled={isSubmitting || !newContestTitle.trim() || newContestProblems.length === 0}
                                        >
                                            {isSubmitting ? 'Creating...' : 'Create & Add to Subsection'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseManager;








