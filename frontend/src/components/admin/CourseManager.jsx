import { useState, useEffect, useMemo } from 'react';
import courseService from '../../services/courseService';
import problemService from '../../services/problemService';
import contestService from '../../services/contestService';
import courseContestService from '../../services/courseContestService';
import uploadService from '../../services/uploadService';
import assignmentService from '../../services/assignmentService';
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
    Trophy,
    Database,
    PlayCircle,
    CheckSquare,
    Youtube,
    Code2,
    Monitor,
    Layout,
    ClipboardList
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
        queryFn: () => problemService.getAllContent(),
    });
    const allProblems = problemsData?.problems || [];

    // Fetch Course Contests
    const { data: courseContestsData } = useQuery({
        queryKey: ['course-contests', 'admin'],
        queryFn: () => courseContestService.getAllCourseContests(),
    });
    const allContests = courseContestsData?.contests || [];
    
    // Fetch Assignments
    const { data: assignmentsData } = useQuery({
        queryKey: ['assignments', 'admin'],
        queryFn: () => assignmentService.getAllAssignments(),
    });
    const allAssignments = assignmentsData || [];

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
    const [courseIsPaid, setCourseIsPaid] = useState(false);
    const [coursePrice, setCoursePrice] = useState(0);
    const [courseCurrency, setCourseCurrency] = useState('INR');
    const [courseAccessYears, setCourseAccessYears] = useState('');
    const [courseIsPublished, setCourseIsPublished] = useState(false);

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
    const [contentTypeFilter, setContentTypeFilter] = useState('all');
    
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
            const rawId = p._id || p.id;
            const id = (typeof rawId === 'object' && rawId?.$oid) ? String(rawId.$oid) : String(rawId);
            if (id && id !== 'undefined' && id !== 'null' && id !== '[object Object]') {
                map[id] = p;
            }
        });
        (allAssignments || []).forEach(a => {
            const id = a.id || (a._id && (typeof a._id === 'object' ? a._id.$oid : a._id));
            map[id] = { ...a, type: 'assignment' };
        });
        return map;
    }, [allProblems, allAssignments]);

    // Filtering logic using useMemo (replaces useEffects to avoid render loops)
    const filteredProblems = useMemo(() => {
        let available = Array.isArray(allProblems) ? [...allProblems] : [];
        
        // Filter out problems already in the selected subsection
        if (selectedCourseId && selectedSectionId && selectedSubsectionId && Array.isArray(courses)) {
            const courseIdStr = String(selectedCourseId);
            const course = courses.find(c => String(c._id || c.id) === courseIdStr);
            
            if (course && Array.isArray(course.sections)) {
                const sectionIdStr = String(selectedSectionId);
                const section = course.sections.find(s => String(s._id || s.id) === sectionIdStr);
                
                if (section && Array.isArray(section.subsections)) {
                    const subIdStr = String(selectedSubsectionId);
                    const subsection = section.subsections.find(sub => String(sub._id || sub.id) === subIdStr);
                    
                    if (subsection && Array.isArray(subsection.problemIds)) {
                        const existingIds = new Set(subsection.problemIds.map(rawId => (typeof rawId === 'object' && rawId?.$oid) ? String(rawId.$oid) : String(rawId)));
                        available = available.filter(p => {
                            const rawPId = p._id || p.id;
                            const pidStr = (typeof rawPId === 'object' && rawPId?.$oid) ? String(rawPId.$oid) : String(rawPId);
                            return !existingIds.has(pidStr);
                        });
                    }
                }
            }
        }
        
        // Merge in assignments
        const assignmentsWithTypes = (allAssignments || []).map(a => ({ ...a, type: 'assignment' }));
        available = [...available, ...assignmentsWithTypes];

        if (contentTypeFilter !== 'all') {
            const filter = String(contentTypeFilter).toLowerCase();
            // Handle both 'assignment' and 'practical' as aliases for Labs
            const filterMap = {
                'practical': 'assignment',
                'assignment': 'assignment'
            };
            const targetType = filterMap[filter] || filter;
            
            available = available.filter(p => (p.type || 'problem').toLowerCase() === targetType);
        }

        if (problemSearch && problemSearch.trim() !== '') {
            const lower = problemSearch.toLowerCase();
            return available.filter(p =>
                (p.title && String(p.title).toLowerCase().includes(lower)) ||
                (p.section && String(p.section).toLowerCase().includes(lower))
            );
        }
        return available;
    }, [allProblems, problemSearch, contentTypeFilter, selectedCourseId, selectedSectionId, selectedSubsectionId, courses]);

    const filteredContests = useMemo(() => {
        let available = allContests || [];
        if (selectedCourseId && selectedSectionId && selectedSubsectionId && courses?.length > 0) {
            const course = courses.find(c => c._id === selectedCourseId);
            if (course && course.sections) {
                const section = course.sections.find(s => s._id === selectedSectionId);
                if (section && section.subsections) {
                    const subsection = section.subsections.find(sub => sub._id === selectedSubsectionId);
                    if (subsection && subsection.courseContestIds) {
                        const existingIds = new Set(subsection.courseContestIds.map(id => id.toString()));
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
        queryClient.invalidateQueries({ queryKey: ['course-contests'] });
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
            await courseService.createCourse(
                courseTitle, 
                courseDescription, 
                finalThumbnail,
                courseIsPaid,
                coursePrice,
                courseCurrency,
                courseAccessYears ? parseInt(courseAccessYears) : null,
                courseIsPublished
            );
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
            await courseService.updateCourse(selectedCourseId, {
                title: courseTitle,
                description: courseDescription,
                thumbnailUrl: finalThumbnail,
                isPaid: courseIsPaid,
                price: coursePrice,
                currency: courseCurrency,
                accessYears: courseAccessYears ? Number(courseAccessYears) : null,
                isPublished: courseIsPublished
            });
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
            if (selectedSubsectionId) {
                await courseService.addProblemToSubsection(activeCourse._id, selectedSectionId, selectedSubsectionId, selectedProblemId);
            } else {
                await courseService.addProblemToSection(activeCourse._id, selectedSectionId, selectedProblemId);
            }
            toast.success('Problem(s) added successfully');
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
        if (!window.confirm(`Remove ${count} problem(s)?`)) return;

        try {
            const res = subsectionId
                ? await courseService.removeProblemFromSubsection(courseId, sectionId, subsectionId, problemId)
                : await courseService.removeProblemFromSection(courseId, sectionId, problemId);
            
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
            const courseContestIds = (Array.isArray(selectedContestId) ? selectedContestId : [selectedContestId])
                .map(cid => cid?.toString());

            if (selectedSubsectionId) {
                await courseService.addContestToSubsection(selectedCourseId, selectedSectionId, selectedSubsectionId, courseContestIds);
            } else {
                await courseService.addContestToSection(selectedCourseId, selectedSectionId, courseContestIds);
            }
            toast.success('Course Contest(s) added successfully');
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
            const contestRes = await courseContestService.createCourseContest({
                title: newContestTitle,
                description: `Course Contest for ${activeCourse.title}`,
                problems: newContestProblems,
                duration: newContestDuration,
                maxAttempts: newContestMaxAttempts,
                proctoringEnabled: true,
                tabSwitchLimit: newContestTabLimit,
                maxViolations: newContestMaxViolations
            });

            const contest = contestRes.contest;
            const contestId = contest?.id || contest?._id;
            
            if (!contestId) throw new Error('Create succeeded but ID missing');

            // Link to subsection or section
            if (selectedSubsectionId) {
                await courseService.addContestToSubsection(
                    activeCourse._id, 
                    selectedSectionId, 
                    selectedSubsectionId, 
                    [String(contestId)]
                );
            } else {
                await courseService.addContestToSection(
                    activeCourse._id, 
                    selectedSectionId, 
                    [String(contestId)]
                );
            }

            toast.success('New contest created and assigned successfully');
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

    const handleRemoveContest = async (courseContestIds, specificSubsectionId = expandedSubsection) => {
        try {
            const res = specificSubsectionId
                ? await courseService.removeContestFromSubsection(activeCourseId, expandedSection, specificSubsectionId, courseContestIds)
                : await courseService.removeContestFromSection(activeCourseId, expandedSection, courseContestIds);
            
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
        <div className="admin-page-wrapper">
            <div className="max-w-7xl mx-auto">
                <header className="page-header-container flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        {viewMode === 'details' ? (
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        setViewMode('grid');
                                        setActiveCourseId(null);
                                        invalidateAll();
                                    }}
                                    className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-600 dark:text-gray-300"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h1 className="page-header-title">{activeCourse.title}</h1>
                                    <p className="page-header-desc">Manage sections, subsections, and content</p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h1 className="page-header-title">Course Manager</h1>
                                <p className="page-header-desc">Organize learning content into courses and sections.</p>
                            </div>
                        )}
                    </div>
                    <div>
                        {viewMode === 'grid' ? (
                            <button onClick={() => setShowCreateCourseModal(true)} className="btn-primary flex items-center gap-2">
                                <Plus size={18} />
                                <span>Create Course</span>
                            </button>
                        ) : (
                            <button onClick={() => setShowCreateSectionModal(true)} className="btn-primary flex items-center gap-2">
                                <Plus size={18} />
                                <span>Add Section</span>
                            </button>
                        )}
                    </div>
                </header>

                <div className="page-controls-bar">
                    <div className="page-search-wrapper flex-1 max-w-md">
                        <Search className="page-search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            className="page-search-input"
                            onChange={(e) => setContestSearch(e.target.value)} // Reusing search state
                        />
                    </div>
                </div>

            {coursesLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="spinner"></div>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="table-wrapper">
                    <table className="admin-custom-table">
                        <thead>
                            <tr>
                                <th>Course Title</th>
                                <th>Price</th>
                                <th>Access</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.map(course => (
                                <tr key={course._id} onClick={() => openCourseDetails(course)} className="cursor-pointer">
                                    <td className="title-td">
                                        <div className="title-group">
                                            <span className="main-title">{course.title}</span>
                                            <span className="sub-description">{course.description?.slice(0, 80)}...</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-xs font-bold text-gray-500">
                                            {course.isPaid ? `${course.currency || 'INR'} ${course.price}` : 'Free'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-xs text-gray-400">{course.accessYears || 1} Year(s)</span>
                                    </td>
                                    <td>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${course.isPublished ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                            {course.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="actions-td">
                                        <div className="action-row">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedCourseId(course._id);
                                                    setCourseTitle(course.title);
                                                    setCourseDescription(course.description || '');
                                                    setCourseThumbnail(course.thumbnailUrl || '');
                                                    setCourseIsPaid(course.isPaid || false);
                                                    setCoursePrice(course.price || 0);
                                                    setCourseCurrency(course.currency || 'INR');
                                                    setCourseAccessYears(course.accessYears || '');
                                                    setCourseIsPublished(course.isPublished || false);
                                                    setThumbnailFile(null);
                                                    setShowEditCourseModal(true);
                                                }}
                                                className="icon-btn build"
                                                title="Edit Course"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteCourse(course._id, e)}
                                                className="icon-btn delete"
                                                title="Delete Course"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {courses.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="empty-state">
                                        No courses found. Create your first course to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="glass-panel p-2 shadow-sm border border-gray-100 dark:border-gray-800 rounded-xl">
                        <div className="bg-gray-50/50 dark:bg-[#111117] p-2 space-y-3 animate-fade-in rounded-lg">
                            {activeCourse.sections && activeCourse.sections.length > 0 ? (
                                activeCourse.sections.map(section => (
                                    <div key={section._id} className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-all hover:shadow-md">
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
                                                        setProblemSearch('');
                                                        setContentTypeFilter('all');
                                                        setSelectedCourseId(activeCourse._id);
                                                        setSelectedSectionId(section._id);
                                                        setSelectedSubsectionId(null);
                                                        setShowAddProblemModal(true);
                                                    }}
                                                    className="text-[10px] font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-primary-200 dark:border-primary-800"
                                                >
                                                    <Plus size={12} /> Add Content
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedCourseId(activeCourse._id);
                                                        setSelectedSectionId(section._id);
                                                        setSelectedSubsectionId(null);
                                                        setShowAddContestModal(true);
                                                    }}
                                                    className="text-[10px] font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-amber-200 dark:border-amber-800"
                                                >
                                                    <Plus size={12} /> Add Contest
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSectionId(section._id);
                                                        setShowCreateSubsectionModal(true);
                                                    }}
                                                    className="text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
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

                                        {/* Section Content (Subsections and direct problems/contests) */}
                                        {expandedSection === section._id && (
                                            <div className="bg-gray-50/30 border-t border-gray-100 p-3 space-y-2 animate-fade-in pl-10">
                                                
                                                {/* Core section problems */}
                                                {section.problemIds && section.problemIds.length > 0 && (
                                                    <div className="mb-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 flex space-x-2">
                                                            <Layers size={14} className="text-primary-500" />
                                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Section Core Content</span>
                                                        </div>
                                                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                                            {section.problemIds.map(rawPid => {
                                                                const pid = (typeof rawPid === 'object' && rawPid?.$oid) ? String(rawPid.$oid) : String(rawPid);
                                                                const problem = problemsMap[pid];
                                                                const isChecked = selectedToRemove.includes(pid);
                                                                return (
                                                                    <li key={pid} className={`flex justify-between items-center p-2.5 transition-colors group ${isChecked ? 'bg-red-50/40' : 'hover:bg-gray-50 dark:hover:bg-[#23232e]'}`}>
                                                                        <div className="flex items-center space-x-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => toggleProblemToRemove(pid)}
                                                                                className="w-3.5 h-3.5 text-primary-600"
                                                                            />
                                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{problem?.title || 'Unknown'}</span>
                                                                            {problem && (
                                                                                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold ${problem.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : problem.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                                                    {problem.difficulty}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleRemoveProblem(activeCourse._id, section._id, null, pid)}
                                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </li>
                                                                )
                                                            })}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Core section contests */}
                                                {section.courseContestIds && section.courseContestIds.length > 0 && (
                                                    <div className="mb-4 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-amber-50/50 flex space-x-2">
                                                            <Trophy size={14} className="text-amber-500" />
                                                            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest">Section Contests</span>
                                                        </div>
                                                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                                            {section.courseContestIds.map(cid => {
                                                                const contestId = String(cid?.$oid || cid);
                                                                const contest = contestsMap.id[contestId] || contestsMap.slug[contestId];
                                                                return (
                                                                    <li key={contestId} className="flex justify-between items-center p-2.5 transition-colors group hover:bg-gray-50 dark:hover:bg-[#23232e]">
                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{contest?.title || 'Unknown Contest'}</span>
                                                                        <button
                                                                            onClick={() => handleRemoveContest(contestId, null)}
                                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </li>
                                                                )
                                                            })}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Subsections Array */}
                                                {section.subsections && section.subsections.length > 0 ? (
                                                    section.subsections.map(sub => (
                                                        <div key={sub._id} className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-all mb-2">
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
                                                                        {sub.problemIds?.length || 0} content items
                                                                    </span>
                                                                    {sub.courseContestIds?.length > 0 && (
                                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full font-medium">
                                                                            {sub.courseContestIds.length} contests
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setProblemSearch(''); // Reset search
                                                                            setContentTypeFilter('all'); // Reset filter
                                                                            setSelectedCourseId(activeCourse._id);
                                                                            setSelectedSectionId(section._id);
                                                                            setSelectedSubsectionId(sub._id);
                                                                            setShowAddProblemModal(true);
                                                                        }}
                                                                        className="text-[10px] font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-primary-100 dark:border-primary-800/30"
                                                                    >
                                                                        <Plus size={12} />
                                                                        Add Content
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedCourseId(activeCourseId);
                                                                            setSelectedSectionId(section._id);
                                                                            setSelectedSubsectionId(sub._id);
                                                                            setShowAddContestModal(true);
                                                                        }}
                                                                        className="text-[10px] font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-amber-100 dark:border-amber-800/30"
                                                                    >
                                                                        <Plus size={12} />
                                                                        Add Contest
                                                                    </button>
                                                                    <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedSectionId(section._id);
                                                                            setSelectedSubsectionId(sub._id);
                                                                            setSubsectionTitle(sub.title);
                                                                            setShowEditSubsectionModal(true);
                                                                        }}
                                                                        className="text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 p-1 rounded-lg transition-colors"
                                                                        title="Edit Subsection"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => handleDeleteSubsection(activeCourse._id, section._id, sub._id, e)}
                                                                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-lg transition-colors"
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
                                                                                        className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded shadow-sm transition-colors"
                                                                                    >
                                                                                        Remove Selected
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                                                                {sub.problemIds.map(rawPid => {
                                                                                    const pid = (typeof rawPid === 'object' && rawPid?.$oid) ? String(rawPid.$oid) : String(rawPid);
                                                                                    const problem = problemsMap[pid];
                                                                                    const isChecked = selectedToRemove.includes(pid);

                                                                                    return (
                                                                                        <li key={pid} className={`flex justify-between items-center p-2.5 pl-6 transition-colors group ${isChecked ? 'bg-red-50/40 dark:bg-red-900/10' : 'hover:bg-white dark:hover:bg-[#23232e]'}`}>
                                                                                            <div className="flex items-center space-x-2">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={isChecked}
                                                                                                    onChange={() => toggleProblemToRemove(pid)}
                                                                                                    className="w-3.5 h-3.5 text-primary-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 mr-2 cursor-pointer"
                                                                                                />
                                                                                                <div className="flex items-center justify-center w-5 h-5">
                                                                        {problem?.type === 'sql' ? <Database size={14} className="text-blue-500" /> :
                                                                         problem?.type === 'video' ? <Youtube size={14} className="text-red-500" /> :
                                                                         problem?.type === 'quiz' ? <CheckSquare size={14} className="text-amber-500" /> :
                                                                         problem?.type === 'article' ? <BookOpen size={14} className="text-teal-500" /> :
                                                                         problem?.type === 'practical' ? <Monitor size={14} className="text-indigo-500" /> :
                                                                         <Code2 size={14} className="text-purple-500" />}
                                                                    </div>
                                                                    <span className="text-gray-700 dark:text-gray-200 text-xs font-medium">
                                                                        {problem ? problem.title : 'Unknown Item'}
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
                                                                                                className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
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

                                                                    {sub.courseContestIds && sub.courseContestIds.length > 0 && (
                                                                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                                                                            <div className="px-4 mb-2 flex items-center gap-2">
                                                                                <Trophy size={14} className="text-amber-500" />
                                                                                <span className="text-[10px] font-black tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">CONTESTS</span>
                                                                            </div>
                                                                             <ul className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                                                                {sub.courseContestIds.map(cid => {
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
                                                                                                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all opacity-0 group-hover/item:opacity-100 mr-2"
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
                                                                                                    className="p-2 opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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
                                                    <div className="text-center py-5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-white/50 dark:bg-gray-800/50">
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
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 flex flex-col items-center justify-center">
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
            </div>

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
                        <form onSubmit={handleCreateCourse}>
                            <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
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
                                        <label className="relative group w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
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
                                
                                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                                    <div className="col-span-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Public Status</span>
                                            <span className="text-[10px] text-gray-500 uppercase">Visible to all students in catalog</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCourseIsPublished(!courseIsPublished)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${courseIsPublished ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseIsPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={courseIsPaid}
                                                onChange={(e) => setCourseIsPaid(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Paid Course (Razorpay)</span>
                                        </label>
                                    </div>
                                    
                                    {courseIsPaid && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price</label>
                                                <input
                                                    type="number"
                                                    value={coursePrice}
                                                    onChange={(e) => setCoursePrice(Number(e.target.value))}
                                                    className="input-field w-full"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Currency</label>
                                                <select
                                                    value={courseCurrency}
                                                    onChange={(e) => setCourseCurrency(e.target.value)}
                                                    className="input-field w-full"
                                                >
                                                    <option value="INR">INR</option>
                                                    <option value="USD">USD</option>
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Access Duration (Years)</label>
                                        <input
                                            type="number"
                                            value={courseAccessYears}
                                            onChange={(e) => setCourseAccessYears(e.target.value)}
                                            className="input-field w-full"
                                            placeholder="Lifetime if empty"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Leave empty for lifetime access.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-4">
                                <button type="button" onClick={() => setShowCreateCourseModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Cancel</button>
                                <button type="submit" className="btn-primary px-8" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create Course'}
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
                        <form onSubmit={handleEditCourse}>
                            <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
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
                                        <label className="relative group w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
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

                                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                                    <div className="col-span-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Public Status</span>
                                            <span className="text-[10px] text-gray-500 uppercase">Visible to all students in catalog</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCourseIsPublished(!courseIsPublished)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${courseIsPublished ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseIsPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={courseIsPaid}
                                                onChange={(e) => setCourseIsPaid(e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Paid Course (Razorpay)</span>
                                        </label>
                                    </div>
                                    
                                    {courseIsPaid && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price</label>
                                                <input
                                                    type="number"
                                                    value={coursePrice}
                                                    onChange={(e) => setCoursePrice(Number(e.target.value))}
                                                    className="input-field w-full"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Currency</label>
                                                <select
                                                    value={courseCurrency}
                                                    onChange={(e) => setCourseCurrency(e.target.value)}
                                                    className="input-field w-full"
                                                >
                                                    <option value="INR">INR</option>
                                                    <option value="USD">USD</option>
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Access Duration (Years)</label>
                                        <input
                                            type="number"
                                            value={courseAccessYears}
                                            onChange={(e) => setCourseAccessYears(e.target.value)}
                                            className="input-field w-full"
                                            placeholder="Lifetime if empty"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Leave empty for lifetime access.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-4">
                                <button type="button" onClick={() => setShowEditCourseModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Cancel</button>
                                <button type="submit" className="btn-primary px-8" disabled={isSubmitting}>
                                    {isSubmitting ? 'Updating...' : 'Save Changes'}
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
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add Problem to Subsection</h2>
                            <button onClick={() => setShowAddProblemModal(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body flex flex-col pt-0">

                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={problemSearch}
                                    onChange={(e) => setProblemSearch(e.target.value)}
                                    className="input-field w-full pl-9"
                                    placeholder="Search by title..."
                                />
                            </div>
                            <select 
                                value={contentTypeFilter} 
                                onChange={(e) => setContentTypeFilter(e.target.value)}
                                className="input-field max-w-[140px] text-xs font-semibold"
                            >
                                <option value="all">All Types</option>
                                <option value="problem">Coding</option>
                                <option value="sql">SQL</option>
                                <option value="video">Video</option>
                                <option value="quiz">Quiz</option>
                                <option value="article">Article</option>
                                <option value="assignment">Practical Lab</option>
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl mb-4 bg-gray-50/50 dark:bg-gray-800/30">
                            {filteredProblems.length > 0 ? (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredProblems.map(p => {
                                        const rawId = p._id || p.id;
                                        const pidStr = (typeof rawId === 'object' && rawId?.$oid) ? String(rawId.$oid) : String(rawId);
                                        const isSelected = Array.isArray(selectedProblemId)
                                            ? selectedProblemId.includes(pidStr)
                                            : selectedProblemId === pidStr;
                                        return (
                                            <li
                                                key={pidStr}
                                                className={`p-3 cursor-pointer transition-colors flex justify-between items-center ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-white dark:hover:bg-gray-800/50'}`}
                                                onClick={() => {
                                                    const current = Array.isArray(selectedProblemId) ? selectedProblemId : (selectedProblemId ? [selectedProblemId] : []);
                                                    if (current.includes(pidStr)) {
                                                        setSelectedProblemId(current.filter(id => id !== pidStr));
                                                    } else {
                                                        setSelectedProblemId([...current, pidStr]);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'}`}>
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <div className="flex items-center justify-center w-5 h-5">
                                                        {p.type === 'sql' ? <Database size={14} className="text-blue-500" /> :
                                                         p.type === 'video' ? <Youtube size={14} className="text-red-500" /> :
                                                         p.type === 'quiz' ? <CheckSquare size={14} className="text-amber-500" /> :
                                                         p.type === 'article' ? <BookOpen size={14} className="text-teal-500" /> :
                                                         p.type === 'practical' || p.type === 'assignment' ? <Layout size={14} className="text-indigo-500" /> :
                                                         <Code2 size={14} className="text-purple-500" />}
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200 text-sm truncate max-w-[300px]">{p.title}</span>
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
                </div>
            )}

            {/* Add Contest Modal */}
            {showAddContestModal && (
                <div className="modal-backdrop" onClick={() => setShowAddContestModal(false)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add Contest to Subsection</h2>
                            <button onClick={() => setShowAddContestModal(false)} className="modal-close">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body p-8 pt-0 flex flex-col">

                        {/* Mode Switcher Tabs */}
                        <div className="flex border-b border-gray-100 dark:border-gray-800 mb-6 shrink-0">
                            <button
                                onClick={() => setContestAddMode('existing')}
                                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${contestAddMode === 'existing' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                Existing Contests
                            </button>
                            <button
                                onClick={() => setContestAddMode('create')}
                                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${contestAddMode === 'create' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-amber-600 border-amber-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'}`}>
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
                                            className="btn-primary bg-amber-600 hover:bg-amber-700 border-amber-700"
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

                                        <div className="flex flex-col h-64 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50">
                                            <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Problems</span>
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                                                    <input
                                                        type="text"
                                                        value={newContestProblemSearch}
                                                        onChange={(e) => setNewContestProblemSearch(e.target.value)}
                                                        className="pl-8 pr-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 w-40"
                                                        placeholder="Quick search..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto">
                                                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                                                    {newContestFilteredProblems.map(p => {
                                                        const rawPId = p._id || p.id;
                                                        const pidStr = (typeof rawPId === 'object' && rawPId?.$oid) ? String(rawPId.$oid) : String(rawPId);
                                                        const isSelected = newContestProblems.includes(pidStr);
                                                        return (
                                                            <li 
                                                                key={pidStr}
                                                                className={`p-2.5 cursor-pointer text-sm transition-colors flex items-center gap-3 ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setNewContestProblems(prev => prev.filter(id => id !== pidStr));
                                                                    } else {
                                                                        setNewContestProblems(prev => [...prev, pidStr]);
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
                </div>
            )}
        </div>
    );
};

export default CourseManager;
