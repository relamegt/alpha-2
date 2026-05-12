import React, { useState } from 'react';
import ProblemItem from './ProblemItem';
import {
  ChevronRight,
  ChevronDown,
  ListOrdered,
  Target,
  CheckCircle2
} from 'lucide-react';
import ProgressBar from '../shared/ProgressBar';

const SubsectionView = ({
  subsection,
  userStats,
  onToggleComplete,
  onToggleRevision,
  togglingId,
  problemsMap,
  index,
  searchQuery = '',
  onlyRevision = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const problems = subsection.problems || [];

  // Filter problems
  const filteredProblems = problems.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRevision = !onlyRevision || userStats?.markedForRevisionIds?.includes(p.id);
    return matchesSearch && matchesRevision;
  });

  if ((searchQuery || onlyRevision) && filteredProblems.length === 0) return null;

  const completedCount = filteredProblems.filter(p => userStats?.completedProblems?.includes(p.id)).length;
  const totalCount = filteredProblems.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="overflow-hidden bg-white dark:bg-[#0f0f0f] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
      <div
        className={`w-full py-3 px-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-all duration-200
          ${isExpanded ? 'bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'}
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={`transition-all duration-300 ${isExpanded ? 'rotate-90 text-primary-500' : 'text-gray-300'}`}>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>

          <div className="flex-1">
            <h3 className={`text-xs font-bold transition-colors tracking-tight ${percentage === 100 ? 'text-emerald-500' : 'text-gray-700 dark:text-gray-300'}`}>
              {subsection.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <CheckCircle2 className={`w-3 h-3 ${percentage === 100 ? 'text-emerald-500' : 'text-primary-500'}`} />
            {completedCount} / {totalCount}
          </div>
          <div className={`w-1.5 h-1.5 rounded-full ${percentage === 100 ? 'bg-emerald-500' : 'bg-primary-500'} transition-all shadow-sm`} />
        </div>
      </div>

      {isExpanded && (
        <div className="bg-white dark:bg-[var(--color-bg-card)] animate-in slide-in-from-top-1 duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  <th className="py-3 pl-8 pr-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-16 text-center">Status</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Problem</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Links</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Video</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Editorial</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Difficulty</th>
                  <th className="py-3 pl-4 pr-8 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Bookmark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.02]">
                {filteredProblems.map((prob, idx) => (
                  <ProblemItem
                    key={prob.id}
                    problem={prob}
                    index={idx}
                    isCompleted={userStats?.completedProblems?.includes(prob.id)}
                    isMarkedForRevision={userStats?.markedForRevisionIds?.includes(prob.id)}
                    onToggleComplete={onToggleComplete}
                    onToggleRevision={onToggleRevision}
                    togglingId={togglingId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubsectionView;









