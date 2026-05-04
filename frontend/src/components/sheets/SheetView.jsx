import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../services/queryKeys';
import sheetService from '../../services/sheetService';
import problemService from '../../services/problemService';
import SectionView from './SectionView';
import ProgressBar from '../shared/ProgressBar';
import {
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Activity,
  Database,
  Cpu,
  Trophy,
  Flame,
  Layout,
  GraduationCap,
  Clock,
  Star,
  Target,
  Search,
  Bookmark,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

const SheetView = () => {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState(null);
  const [problemsMap, setProblemsMap] = useState({});
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'revision'
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: sheet, isLoading: isLoadingSheet, error: sheetError } = useQuery({
    queryKey: queryKeys.sheets.detail(sheetId),
    queryFn: () => sheetService.getSheetById(sheetId)
  });

  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['sheets', 'user-stats'],
    queryFn: sheetService.getUserStats
  });

  // Pre-load all problems map from sheet data
  useEffect(() => {
    if (sheet) {
      const map = {};
      sheet.sections?.forEach(sec => {
        sec.subsections?.forEach(sub => {
          sub.problems?.forEach(p => {
            map[p.id] = p;
          });
        });
      });
      setProblemsMap(map);
    }
  }, [sheet]);

  const toggleMutation = useMutation({
    mutationFn: (problemId) => {
      setTogglingId(problemId);
      const isCurrentlyCompleted = userStats?.completedProblems?.includes(problemId);
      return sheetService.toggleCompletion({
        sheetProblemId: problemId,
        completed: !isCurrentlyCompleted
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sheets', 'user-stats'] });
      if (data.completed) {
        toast.success('Problem Completed!', {
          icon: '✅',
          style: { borderRadius: '10px', background: '#333', color: '#fff' }
        });
      }
    },
    onSettled: () => setTogglingId(null)
  });

  const revisionMutation = useMutation({
    mutationFn: (problemId) => {
      setTogglingId(problemId);
      const isCurrentlyMarked = userStats?.markedForRevisionIds?.includes(problemId);
      return sheetService.toggleRevision({
        sheetProblemId: problemId,
        markedForRevision: !isCurrentlyMarked
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sheets', 'user-stats'] });
      if (data.markedForRevision) {
        toast.success('Added to Revision', {
          icon: '🔖',
          style: { borderRadius: '10px', background: '#333', color: '#fff' }
        });
      }
    },
    onSettled: () => setTogglingId(null)
  });

    if (isLoadingSheet || isLoadingStats) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-[var(--color-bg-primary)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto" />
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Loading sheet details...</p>
        </div>
      </div>
    );
  }

  if (sheetError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-[var(--color-bg-primary)]">
        <div className="text-center max-w-md w-full p-8 bg-[var(--color-bg-card)] rounded-2xl shadow-xl border border-red-500/20">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sheet Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">The practice sheet you are looking for does not exist or has been removed.</p>
          <button onClick={() => navigate('/dashboard/sheets')} className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm">Go to Sheets</button>
        </div>
      </div>
    );
  }

  const prog = {
    completed: Object.keys(problemsMap).filter(id => userStats?.completedProblems?.includes(id)).length || 0,
    total: Object.keys(problemsMap).length || 0
  };
  const percentage = prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0;

  const difficultyBreakdown = {
    Easy: { completed: 0, total: 0 },
    Medium: { completed: 0, total: 0 },
    Hard: { completed: 0, total: 0 }
  };

  Object.values(problemsMap).forEach(problem => {
    const diff = problem.difficulty || 'Medium';
    if (difficultyBreakdown[diff]) {
      difficultyBreakdown[diff].total++;
      if (userStats?.completedProblems?.includes(problem.id)) {
        difficultyBreakdown[diff].completed++;
      }
    }
  });

  const getStatusConfig = () => {
    if (percentage === 100) return { color: 'text-green-500', icon: Trophy, message: 'All problems mastered! 🎉' };
    if (percentage >= 75) return { color: 'text-orange-500', icon: Flame, message: 'Almost there! Keep going! 🔥' };
    if (percentage > 0) return { color: 'text-primary-500', icon: Star, message: 'Great progress, keep it up! ⭐' };
    return { color: 'text-gray-400', icon: Clock, message: 'Ready to start your journey? 🚀' };
  };

  const status = getStatusConfig();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header Section */}
      <header className="page-header-container shrink-0">
        <h1 className="page-header-title">
          {sheet.name}
        </h1>
        {sheet.description && (
          <p className="page-header-desc">
            {sheet.description}
          </p>
        )}
      </header>

      <div className="page-tabs-container shrink-0">
        {/* Tabs - Match MyCourses style */}
        <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full w-max shadow-sm">
          {[
            { id: 'all', label: 'All Questions' },
            { id: 'revision', label: 'Saved Questions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]' 
                  : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Search Bar - Match MyCourses style */}
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all bg-[var(--color-bg-input)] border border-transparent dark:border-gray-800 text-gray-800 dark:text-gray-200 focus:bg-white dark:focus:bg-[var(--color-bg-card)] focus:ring-2 focus:ring-primary-500/20 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-6 scrollbar-hide pr-2">
        {/* PROGRESS DASHBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 shrink-0">
          <div className="lg:col-span-1 bg-[var(--color-bg-card)] p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Mastery</span>
              <div className="p-2 bg-primary-50 dark:bg-primary-900/10 rounded-lg text-primary-600">
                <Trophy size={16} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{percentage}%</div>
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>{prog.completed} / {prog.total} Solved</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Easy', 'Medium', 'Hard'].map(diff => {
              const data = difficultyBreakdown[diff];
              const dPerc = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
              const colorClass = diff === 'Easy' ? 'bg-emerald-500' : diff === 'Medium' ? 'bg-amber-500' : 'bg-rose-500';
              const textClass = diff === 'Easy' ? 'text-emerald-500' : diff === 'Medium' ? 'text-amber-500' : 'text-rose-500';

              return (
                <div key={diff} className="bg-[var(--color-bg-card)] p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between group hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${textClass}`}>{diff}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{data.completed}/{data.total}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{dPerc}%</div>
                    <div className="relative h-1 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full ${colorClass} rounded-full transition-all duration-700 shadow-sm`}
                        style={{ width: `${dPerc}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CONTENT SECTIONS */}
        <div className="space-y-4 pb-10">
          {sheet.sections && sheet.sections.length > 0 ? (
            sheet.sections.map((sec, idx) => (
              <SectionView
                key={sec.id}
                section={sec}
                index={idx}
                userStats={userStats}
                onToggleComplete={(id) => toggleMutation.mutate(id)}
                onToggleRevision={(id) => revisionMutation.mutate(id)}
                togglingId={togglingId}
                problemsMap={problemsMap}
                searchQuery={searchQuery}
                onlyRevision={activeTab === 'revision'}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-[var(--color-bg-card)] rounded-xl border border-dashed border-[var(--color-border-interactive)]">
              <Database className="w-12 h-12 text-gray-200 dark:text-gray-800 mb-4" />
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">No Questions Found</h3>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">This practice sheet has no content yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SheetView;








