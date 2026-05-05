import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { useTheme } from './contexts/ThemeContext';
import { loader } from '@monaco-editor/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
        },
    },
});

// Define the Antigravity global Monaco dark theme
loader.init().then((monaco) => {
    monaco.editor.defineTheme('antigravity-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [{ background: '111117' }],
        colors: {
            'editor.background': '#111117',
            'editor.lineHighlightBackground': '#00000000',
            'editor.lineHighlightBorder': '#00000000',
            'editor.selectionBackground': '#2E27AD80',
            'editorCursor.foreground': '#7d63f2',
            'editorIndentGuide.background': '#282833',
            'editorIndentGuide.activeBackground': '#333342',
            'editorWidget.background': '#181820',
            'editorWidget.border': '#282833',
            'minimap.background': '#111117',
            'dropdown.background': '#181820',
            'dropdown.border': '#282833',
            'list.hoverBackground': '#23232e',
        }
    });
});

// Auth Components
import LoginForm from './components/auth/LoginForm';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import SignupForm from './components/auth/SignupForm';
import CompleteProfile from './components/auth/CompleteProfile';

// Shared Components
import Navbar from './components/shared/Navbar';
import SecurityWrapper from './components/shared/SecurityWrapper';

// Public Components
import PublicProfile from './components/public/PublicProfile';
import CourseCatalog from './components/public/CourseCatalog';
import PublicArticles from './components/public/PublicArticles';
import PublicArticleDetail from './components/public/PublicArticleDetail';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLayout from './components/admin/AdminLayout';
import BatchManager from './components/admin/BatchManager';

import UserManagement from './components/admin/UserManagement';
import ProblemManager from './components/admin/ProblemManager';
import CourseManager from './components/admin/CourseManager';
import ContestManager from './components/admin/ContestManager';
import CourseContestManager from './components/admin/CourseContestManager';
import SqlProblemManager from './components/admin/SqlProblemManager';
import VideoManager from './components/admin/VideoManager';
import QuizManager from './components/admin/QuizManager';
import ArticleManager from './components/admin/ArticleManager';
import PublicArticleManager from './components/admin/PublicArticleManager';
import ReportGenerator from './components/admin/ReportGenerator';
import EditorialCreator from './components/admin/EditorialCreator';

// Instructor Components
import ProfileReset from './components/instructor/ProfileReset';
import InstructorDashboard from './components/instructor/InstructorDashboard';
import InstructorLayout from './components/instructor/InstructorLayout';

// Student Components
import Dashboard from './components/student/Dashboard';
import ProblemList from './components/student/ProblemList';
import ContestList from './components/student/ContestList';
import CodeEditor from './components/student/CodeEditor';
import Leaderboard from './components/student/Leaderboard';
import CourseLeaderboard from './components/student/CourseLeaderboard';
import MyCourses from './components/student/MyCourses';
import CourseOverview from './components/student/CourseOverview';
import ContestInterface from './components/student/ContestInterface';
import ContestJoin from './components/student/ContestJoin';
import SheetList from './components/sheets/SheetList';
import SheetView from './components/sheets/SheetView';
import Jobs from './components/student/jobs/Jobs';
import Announcements from './components/student/announcements/Announcements';
import Compiler from './components/student/Compiler';
import SheetManagement from './components/sheets/SheetManagement';
import JobManager from './components/admin/JobManager';
import AnnouncementManager from './components/admin/AnnouncementManager';
import { SheetEditorialRenderer } from './components/shared/SheetEditorialRender';
import AIInterviewer from './pages/AIInterviewer';
import AssignmentsPage from './pages/AssignmentsPage';
import AssignmentPage from './components/student/assignments/AssignmentPage';
import AssignmentManager from './components/admin/AssignmentManager';
import AssignmentCreator from './components/admin/AssignmentCreator';
import MultiFileAssignmentBuilder from './components/admin/MultiFileAssignmentBuilder';
import DashboardLayout from './components/student/dashboard/DashboardLayout';
import AdminSettingsLayout from './components/admin/AdminSettingsLayout';
import InterviewExperienceList from './components/interview/experiences/InterviewExperienceList';
import ExperienceSubmissionWizard from './components/interview/experiences/ExperienceSubmissionWizard';
import InterviewExperienceDetail from './components/interview/experiences/InterviewExperienceDetail';


// Settings Components
import PersonalDetails from './components/student/settings/PersonalDetails';
import ProfessionalDetails from './components/student/settings/ProfessionalDetails';
import CodingProfiles from './components/student/settings/CodingProfiles';
import SecuritySettings from './components/student/settings/SecuritySettings';
import SettingsLayout from './components/student/settings/SettingsLayout';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles, hideNavbar = false }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-[#F7F5FF] dark:bg-[#111117] transition-colors">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        const contestMatch = location.pathname.match(/^\/contests\/([^/]+)/);
        if (contestMatch) {
            const contestId = contestMatch[1];
            if (contestId && !location.pathname.includes('/leaderboard')) {
                return <Navigate to={`/join/${contestId}`} replace />;
            }
        }
        return <Navigate to="/login" replace />;
    }

    if (user.isSpotUser && user.registeredForContest) {
        const isContestPath = location.pathname.startsWith('/contests/') || location.pathname.startsWith('/join/');
        if (!isContestPath) {
            return <Navigate to={`/contests/${user.registeredForContest}`} replace />;
        }
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return (
        <>
            {!hideNavbar && !user.isSpotUser && <Navbar />}
            <div className="min-h-screen bg-[#F7F5FF] dark:bg-[#111117] transition-colors">{children}</div>
        </>
    );
};

const ProfileRedirect = () => {
    const { username } = useParams();
    return <Navigate to={`/dashboard/profile/${username}`} replace />;
};

const CourseRedirect = () => {
    const { courseId } = useParams();
    return <Navigate to={`/dashboard/courses/${courseId}`} replace />;
};

const ProblemRedirect = () => {
    const { problemId } = useParams();
    return <Navigate to={`/dashboard/problems/${problemId}`} replace />;
};

const WorkspaceRedirect = () => {
    const { courseId, subId, problemId } = useParams();
    if (problemId && subId) return <Navigate to={`/dashboard/workspace/${courseId}/${subId}/${problemId}`} replace />;
    if (subId) return <Navigate to={`/dashboard/workspace/${courseId}/${subId}`} replace />;
    return <Navigate to={`/dashboard/workspace/${courseId}`} replace />;
};

// Direct Editorial Route Wrapper
const EditorialRoute = () => {
    const { problemId } = useParams();
    const { user } = useAuth();
    return (
        <div className="h-screen bg-white dark:bg-slate-900 overflow-hidden">
            <SheetEditorialRenderer 
                problem={{ id: problemId }} 
                isAdmin={user?.role === 'admin'}
            />
        </div>
    );
};

// Public Route Component
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-[#F7F5FF] dark:bg-[#111117] transition-colors">
                <div className="spinner"></div>
            </div>
        );
    }

    if (user) {
        if (user.isSpotUser && user.registeredForContest) {
            return <Navigate to={`/contests/${user.registeredForContest}`} replace />;
        }
        switch (user.role) {
            case 'admin': return <Navigate to="/admin/dashboard" replace />;
            case 'instructor': return <Navigate to="/instructor/dashboard" replace />;
            case 'student': return <Navigate to="/student/dashboard" replace />;
            default: return <Navigate to="/login" replace />;
        }
    }

    return children;
};

const DynamicToaster = () => {
    const location = useLocation();
    const { isDark } = useTheme();
    const isCodingInterface = location.pathname.includes('/workspace') || location.pathname.startsWith('/problems/') || location.pathname.startsWith('/contests/');

    return (
        <Toaster
            position={isCodingInterface ? 'top-center' : 'top-right'}
            toastOptions={{
                style: {
                    maxWidth: 420,
                    borderRadius: '16px',
                    background: isDark ? '#111117' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#111827',
                    border: isDark ? '1px solid #282833' : '1px solid #f3f4f6',
                    fontSize: '14px',
                    fontWeight: '500',
                    padding: '12px 16px',
                }
            }}
        />
    );
};

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AuthProvider>
                    <DynamicToaster />
                    <SecurityWrapper>
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<PublicRoute><LoginForm /></PublicRoute>} />
                            <Route path="/signup" element={<PublicRoute><SignupForm /></PublicRoute>} />
                            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
                            <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
                            <Route path="/join/:contestId" element={<ContestJoin />} />
                            <Route path="/complete-profile" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']}><CompleteProfile /></ProtectedRoute>} />
                            <Route path="/profile/:username" element={<ProfileRedirect />} />
                            <Route path="/catalog" element={<Navigate to="/dashboard/catalog" replace />} />
                            <Route path="/articles" element={<Navigate to="/dashboard/articles" replace />} />

                             {/* Admin Routes - Priority matching */}
                             <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} hideNavbar={true}><AdminLayout /></ProtectedRoute>}>
                                 <Route index element={<Navigate to="/admin/dashboard" replace />} />
                                 <Route path="dashboard" element={<AdminDashboard />} />
                                 <Route path="compiler" element={<Compiler />} />
                                 <Route path="articles" element={<ArticleManager />} />
                                 <Route path="public-articles-view" element={<PublicArticles />} />
                                 <Route path="batches" element={<BatchManager />} />
                                 <Route path="users" element={<UserManagement />} />
                                 <Route path="problems" element={<ProblemManager />} />
                                 <Route path="sql-problems" element={<SqlProblemManager />} />
                                 <Route path="videos" element={<VideoManager />} />
                                 <Route path="quizzes" element={<QuizManager />} />
                                 <Route path="assignments" element={<AssignmentManager />} />
                                 <Route path="assignments/new" element={<MultiFileAssignmentBuilder />} />
                                 <Route path="assignments/build/:id" element={<MultiFileAssignmentBuilder />} />
                                 <Route path="sheets" element={<SheetManagement />} />
                                 <Route path="private-articles" element={<ArticleManager />} />
                                 <Route path="public-articles" element={<PublicArticleManager />} />
                                 <Route path="contests" element={<ContestManager />} />
                                 <Route path="course-contests" element={<CourseContestManager />} />
                                 <Route path="courses" element={<CourseManager />} />
                                 <Route path="reports" element={<ReportGenerator />} />
                                 <Route path="editorial-creator" element={<EditorialCreator />} />
                                 <Route path="jobs" element={<JobManager />} />
                                 <Route path="announcements" element={<AnnouncementManager />} />
                                 <Route path="interview" element={<AIInterviewer />} />
                                 <Route path="interview-experience" element={<InterviewExperienceList />} />
                                 <Route path="interview-experience/submit" element={<ExperienceSubmissionWizard />} />
                                 <Route path="leaderboard" element={<Leaderboard />} />
                                 <Route path="settings" element={<AdminSettingsLayout />} />
                                 <Route path="settings/personal" element={<AdminSettingsLayout />} />
                                 <Route path="settings/security" element={<AdminSettingsLayout />} />
                             </Route>

                             {/* Legacy Redirects to Dashboard */}
                             <Route path="/compiler" element={<Navigate to="/dashboard/compiler" replace />} />
                             <Route path="/interview" element={<Navigate to="/dashboard/interview" replace />} />
                             <Route path="/sheets" element={<Navigate to="/dashboard/sheets" replace />} />
                             <Route path="/sheets/:sheetId" element={<Navigate to="/dashboard/sheets/:sheetId" replace />} />
                             <Route path="/assignments" element={<Navigate to="/dashboard/assignments" replace />} />
                             <Route path="/assignments/:id" element={<Navigate to="/dashboard/assignments/:id" replace />} />
                             <Route path="/student/leaderboard" element={<Navigate to="/dashboard/leaderboard" replace />} />
                             <Route path="/student/contests" element={<Navigate to="/dashboard/contests" replace />} />
                             <Route path="/courses" element={<Navigate to="/dashboard/courses" replace />} />
                             <Route path="/courses/:courseId" element={<CourseRedirect />} />
                             <Route path="/problems/:problemId" element={<ProblemRedirect />} />
                             <Route path="/workspace/:courseId" element={<WorkspaceRedirect />} />
                             <Route path="/workspace/:courseId/:subId" element={<WorkspaceRedirect />} />
                             <Route path="/workspace/:courseId/:subId/:problemId" element={<WorkspaceRedirect />} />
 
                             {/* Instructor Routes */}
                             <Route path="/instructor" element={<ProtectedRoute allowedRoles={['instructor']} hideNavbar={true}><InstructorLayout /></ProtectedRoute>}>
                                 <Route index element={<Navigate to="/instructor/dashboard" replace />} />
                                 <Route path="dashboard" element={<InstructorDashboard />} />
                                 <Route path="courses" element={<MyCourses />} />
                                 <Route path="contests" element={<ContestManager />} />
                                 <Route path="course-contests" element={<CourseContestManager />} />
                                 <Route path="reports" element={<ReportGenerator />} />
                                 <Route path="reset-profile" element={<ProfileReset />} />
                                 <Route path="settings/personal" element={<div className="p-6 max-w-5xl mx-auto"><div className="bg-[var(--color-bg-card)] rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm"><PersonalDetails /></div></div>} />
                                 <Route path="settings/security" element={<div className="p-6 max-w-5xl mx-auto"><div className="bg-[var(--color-bg-card)] rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm"><SecuritySettings /></div></div>} />
                             </Route>
 
                             {/* Student Dashboard Layout (New) */}
                             <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']} hideNavbar={true}><DashboardLayout /></ProtectedRoute>}>
                                 <Route index element={<Navigate to="/dashboard/home" replace />} />
                                 <Route path="home" element={<Dashboard />} />
                                 <Route path="courses" element={<MyCourses />} />
                                 <Route path="sheets" element={<SheetList />} />
                                 <Route path="assignments" element={<AssignmentsPage />} />
                                 <Route path="jobs" element={<Jobs />} />
                                 <Route path="announcements" element={<Announcements />} />
                                 <Route path="contests" element={<ContestList />} />
                                 <Route path="leaderboard" element={<Leaderboard />} />
                                 <Route path="settings" element={<SettingsLayout />} />
                                 <Route path="catalog" element={<CourseCatalog />} />
                                 <Route path="articles" element={<PublicArticles />} />
                                 <Route path="articles/:slug" element={<PublicArticleDetail />} />
                                 <Route path="compiler" element={<Compiler />} />
                                 <Route path="interview">
                                     <Route index element={<AIInterviewer />} />
                                     <Route path="experience" element={<InterviewExperienceList />} />
                                     <Route path="experience/submit" element={<ExperienceSubmissionWizard />} />
                                     <Route path="experience/:id" element={<InterviewExperienceDetail />} />
                                 </Route>
                                 <Route path="profile/:username" element={<PublicProfile />} />
                                 <Route path="sheets/:sheetId" element={<SheetView />} />
                                 <Route path="assignments/:id" element={<AssignmentPage />} />
                                  <Route path="courses/:courseId" element={<CourseOverview />} />
                                  <Route path="courses/:courseId/leaderboard" element={<CourseLeaderboard />} />
                                  <Route path="problems/:problemId" element={<CodeEditor />} />
                                  <Route path="workspace/:courseId" element={<CodeEditor />} />
                                  <Route path="workspace/:courseId/:subId" element={<CodeEditor />} />
                                  <Route path="workspace/:courseId/:subId/:problemId" element={<CodeEditor />} />
                                  <Route path="editorial/:problemId" element={<EditorialRoute />} />
                             </Route>
 
                             {/* Student Routes (Legacy compatibility) */}
                             <Route path="/student/dashboard" element={<Navigate to="/dashboard/home" replace />} />
                             <Route path="/courses/:courseId/leaderboard" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']} hideNavbar={true}><CourseLeaderboard /></ProtectedRoute>} />
                             <Route path="/student/contests" element={<ProtectedRoute allowedRoles={['student']}><ContestList /></ProtectedRoute>} />
                             <Route path="/workspace/:courseId/:subId/contest/:contestSlug" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']} hideNavbar={true}><CodeEditor /></ProtectedRoute>} />

                            {/* Contests */}
                            <Route path="/contests/:contestId" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']} hideNavbar={true}><ContestInterface /></ProtectedRoute>} />
                            <Route path="/contests/:contestId/practice" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']} hideNavbar={true}><ContestInterface isPractice={true} /></ProtectedRoute>} />
                            <Route path="/contests/:contestId/leaderboard" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']}><Leaderboard /></ProtectedRoute>} />
                            <Route path="/:batchName/leaderboard" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']} hideNavbar={true}><Leaderboard isBatchView={true} /></ProtectedRoute>} />
                            <Route path="/student/leaderboard" element={<ProtectedRoute allowedRoles={['student', 'instructor']}><Leaderboard /></ProtectedRoute>} />

                            {/* Settings */}
                            <Route path="/student/profile" element={<Navigate to="/dashboard/settings" replace />} />
                            <Route path="/student/settings" element={<Navigate to="/dashboard/settings" replace />} />
                            {/* Keep legacy paths for backward compatibility, redirecting to the new unified layout */}
                            <Route path="/student/settings/personal" element={<Navigate to="/dashboard/settings" replace />} />
                            <Route path="/student/settings/professional" element={<Navigate to="/dashboard/settings" replace />} />
                            <Route path="/student/settings/coding" element={<Navigate to="/dashboard/settings" replace />} />
                            <Route path="/student/settings/security" element={<Navigate to="/dashboard/settings" replace />} />
                            
                            {/* Sheets, Jobs, Announcements */}
                            <Route path="/sheets" element={<Navigate to="/dashboard/sheets" replace />} />
                            <Route path="/sheets/:sheetId" element={<Navigate to="/dashboard/sheets/:sheetId" replace />} />
                            <Route path="/editorial/:problemId" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']} hideNavbar={true}><EditorialRoute /></ProtectedRoute>} />
                            <Route path="/jobs" element={<Navigate to="/dashboard/jobs" replace />} />
                            <Route path="/announcements" element={<Navigate to="/dashboard/announcements" replace />} />
                            <Route path="/compiler" element={<Navigate to="/dashboard/compiler" replace />} />
                            <Route path="/interview" element={<Navigate to="/dashboard/interview" replace />} />

                            {/* Fallbacks */}
                            <Route path="/" element={<Navigate to="/login" replace />} />
                            <Route path="/unauthorized" element={<div className="flex justify-center items-center h-screen bg-[#F7F5FF] dark:bg-[#111117] transition-colors"><div className="text-center"><h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">403 - Unauthorized</h1><p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p></div></div>} />
                            <Route path="*" element={<div className="flex justify-center items-center h-screen bg-[#F7F5FF] dark:bg-[#111117] transition-colors"><div className="text-center"><h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">404 - Not Found</h1><p className="text-gray-600 dark:text-gray-400">The page you're looking for doesn't exist.</p></div></div>} />
                        </Routes>
                    </SecurityWrapper>
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;








