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
import Pricing from './components/public/Pricing';

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
import CouponManager from './components/admin/CouponManager';
import SubscriptionManager from './components/admin/SubscriptionManager';
import PlanManager from './components/admin/PlanManager';
import SaleManager from './components/admin/SaleManager';

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
import CourseAnalytics from './components/student/CourseAnalytics';
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
import Home from './pages/Home';


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
        <div className="min-h-screen bg-[#F7F5FF] dark:bg-[#111117] transition-colors">{children}</div>
    );
};

// No longer needed as we use direct profile routes
const ProfileRedirect = () => {
    const { username } = useParams();
    return <Navigate to={`/profile/${username}`} replace />;
};

const CourseRedirect = () => {
    const { courseId } = useParams();
    return <Navigate to={`/courses/${courseId}`} replace />;
};

const ProblemRedirect = () => {
    const { problemId } = useParams();
    return <Navigate to={`/problems/${problemId}`} replace />;
};

const WorkspaceRedirect = () => {
    const { courseId, subId, problemId } = useParams();
    if (problemId && subId) return <Navigate to={`/workspace/${courseId}/${subId}/${problemId}`} replace />;
    if (subId) return <Navigate to={`/workspace/${courseId}/${subId}`} replace />;
    return <Navigate to={`/workspace/${courseId}`} replace />;
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
        return <Navigate to="/home" replace />;
    }

    return children;
};

// Role-based Component Selector
const RoleSelector = ({ student, admin, instructor }) => {
    const { user } = useAuth();
    if (user?.role === 'admin') return admin;
    if (user?.role === 'instructor') return instructor || student;
    return student;
};

// Layout Switcher
const UnifiedLayout = () => {
    const { user } = useAuth();
    if (user?.role === 'admin') return <AdminLayout />;
    if (user?.role === 'instructor') return <InstructorLayout />;
    return <DashboardLayout />;
};

// Redirect components for parameter substitution
const CourseLeaderboardRedirect = () => {
    const { courseId } = useParams();
    return <Navigate to={`/courses/${courseId}/analytics/leaderboard`} replace />;
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
                            <Route path="/profile/:username" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']}><PublicProfile /></ProtectedRoute>} />
                            <Route path="/catalog" element={<Navigate to="/courses" replace />} />
                            <Route path="/articles" element={<Navigate to="/articles-list" replace />} />
                            <Route path="/pricing" element={<Pricing />} />

                             {/* Unified Flattened Routes */}
                             <Route element={<ProtectedRoute allowedRoles={['student', 'instructor', 'admin']} hideNavbar={true}><UnifiedLayout /></ProtectedRoute>}>
                                 <Route path="/home" element={<RoleSelector student={<Dashboard />} admin={<AdminDashboard />} instructor={<InstructorDashboard />} />} />
                                 
                                 {/* Courses & Content */}
                                 <Route path="/courses" element={<RoleSelector student={<MyCourses />} admin={<CourseManager />} instructor={<MyCourses />} />} />
                                 <Route path="/courses/:courseId" element={<CourseOverview />} />
                                 <Route path="/courses/:courseId/analytics" element={<CourseAnalytics />} />
                                 <Route path="/courses/:courseId/analytics/:tab" element={<CourseAnalytics />} />
                                 <Route path="/catalog" element={<CourseCatalog />} />
                                 
                                 {/* Sheets & Assignments */}
                                 <Route path="/sheets" element={<RoleSelector student={<SheetList />} admin={<SheetManagement />} />} />
                                 <Route path="/sheets/:sheetId" element={<SheetView />} />
                                 <Route path="/assignments" element={<RoleSelector student={<AssignmentsPage />} admin={<AssignmentManager />} />} />
                                 <Route path="/assignments/:id" element={<AssignmentPage />} />
                                 
                                 {/* Admin Specific Content Management */}
                                 <Route path="/assignments/new" element={<ProtectedRoute allowedRoles={['admin']}><MultiFileAssignmentBuilder /></ProtectedRoute>} />
                                 <Route path="/assignments/build/:id" element={<ProtectedRoute allowedRoles={['admin']}><MultiFileAssignmentBuilder /></ProtectedRoute>} />
                                 <Route path="/batches" element={<ProtectedRoute allowedRoles={['admin']}><BatchManager /></ProtectedRoute>} />
                                 <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
                                 <Route path="/problems-manager" element={<ProtectedRoute allowedRoles={['admin']}><ProblemManager /></ProtectedRoute>} />
                                 <Route path="/sql-problems" element={<ProtectedRoute allowedRoles={['admin']}><SqlProblemManager /></ProtectedRoute>} />
                                 <Route path="/videos" element={<ProtectedRoute allowedRoles={['admin']}><VideoManager /></ProtectedRoute>} />
                                 <Route path="/quizzes" element={<ProtectedRoute allowedRoles={['admin']}><QuizManager /></ProtectedRoute>} />
                                 <Route path="/private-articles" element={<ProtectedRoute allowedRoles={['admin']}><ArticleManager /></ProtectedRoute>} />
                                 <Route path="/public-articles-manager" element={<ProtectedRoute allowedRoles={['admin']}><PublicArticleManager /></ProtectedRoute>} />
                                 <Route path="/course-contests-manager" element={<ProtectedRoute allowedRoles={['admin']}><CourseContestManager /></ProtectedRoute>} />
                                 <Route path="/editorial-creator" element={<ProtectedRoute allowedRoles={['admin']}><EditorialCreator /></ProtectedRoute>} />
                                 <Route path="/coupons" element={<ProtectedRoute allowedRoles={['admin']}><CouponManager /></ProtectedRoute>} />
                                 <Route path="/admin-subscriptions" element={<ProtectedRoute allowedRoles={['admin']}><SubscriptionManager /></ProtectedRoute>} />
                                 <Route path="/admin-plans" element={<ProtectedRoute allowedRoles={['admin']}><PlanManager /></ProtectedRoute>} />
                                 <Route path="/sales-banners" element={<ProtectedRoute allowedRoles={['admin']}><SaleManager /></ProtectedRoute>} />
                                 
                                 {/* Contests */}
                                 <Route path="/contests" element={<RoleSelector student={<ContestList />} admin={<ContestManager />} instructor={<ContestManager />} />} />
                                 
                                 {/* Jobs & Announcements */}
                                 <Route path="/jobs" element={<RoleSelector student={<Jobs />} admin={<JobManager />} />} />
                                 <Route path="/announcements" element={<RoleSelector student={<Announcements />} admin={<AnnouncementManager />} />} />
                                 
                                 {/* Articles */}
                                 <Route path="/articles-list" element={<PublicArticles />} />
                                 <Route path="/articles/:slug" element={<PublicArticleDetail />} />
                                 
                                 {/* Tools */}
                                 <Route path="/compiler" element={<Compiler />} />
                                 <Route path="/interview" element={<AIInterviewer />} />
                                 <Route path="/interview/experience" element={<InterviewExperienceList />} />
                                 <Route path="/interview/experience/submit" element={<ExperienceSubmissionWizard />} />
                                 <Route path="/interview/experience/:id" element={<InterviewExperienceDetail />} />
                                 
                                 {/* Leaderboard & Reports */}
                                 <Route path="/leaderboard" element={<Leaderboard />} />
                                 <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'instructor']}><ReportGenerator /></ProtectedRoute>} />
                                 
                                 {/* Settings */}
                                 <Route path="/settings" element={<RoleSelector student={<SettingsLayout />} admin={<AdminSettingsLayout />} />} />
                                 <Route path="/settings/personal" element={<RoleSelector student={<SettingsLayout />} admin={<AdminSettingsLayout />} />} />
                                 <Route path="/settings/security" element={<RoleSelector student={<SettingsLayout />} admin={<AdminSettingsLayout />} />} />
                                 <Route path="/settings/professional" element={<ProtectedRoute allowedRoles={['student']}><SettingsLayout /></ProtectedRoute>} />
                                 <Route path="/settings/coding" element={<ProtectedRoute allowedRoles={['student']}><SettingsLayout /></ProtectedRoute>} />

                                 {/* Coding Workspace */}
                                 <Route path="/problems/:problemId" element={<CodeEditor />} />
                                 <Route path="/workspace/:courseId" element={<CodeEditor />} />
                                 <Route path="/workspace/:courseId/:subId" element={<CodeEditor />} />
                                 <Route path="/workspace/:courseId/:subId/:problemId" element={<CodeEditor />} />
                                 <Route path="/editorial/:problemId" element={<EditorialRoute />} />
                             </Route>

                             {/* Special Redirects & Legacy */}
                             <Route path="/dashboard" element={<Navigate to="/home" replace />} />
                             <Route path="/admin" element={<Navigate to="/home" replace />} />
                             <Route path="/instructor" element={<Navigate to="/home" replace />} />
                             <Route path="/student/dashboard" element={<Navigate to="/home" replace />} />

                            {/* Fallbacks */}
                            <Route path="/" element={<><Navbar /><Home /></>} />
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
