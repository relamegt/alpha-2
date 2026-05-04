import React, { useState } from 'react';
import SubsectionView from './SubsectionView';
import { 
  ChevronDown, 
  Layers, 
  Award,
  Circle
} from 'lucide-react';

const SectionView = ({ 
  section, 
  userStats, 
  onToggleComplete, 
  onToggleRevision,
  togglingId,
  problemsMap,
  index,
  searchQuery = '',
  onlyRevision = false
}) => {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  const completedCount = (section.subsections || []).reduce((acc, sub) => {
    const subCompleted = (sub.problems || []).filter(p => userStats?.completedProblems?.includes(p.id)).length;
    return acc + subCompleted;
  }, 0);
  const totalCount = (section.subsections || []).reduce((acc, sub) => acc + (sub.problems?.length || 0), 0);
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter logic for section visibility
  const hasVisibleContent = section.subsections?.some(sub => 
    sub.problems?.some(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRevision = !onlyRevision || userStats?.markedForRevisionIds?.includes(p.id);
      return matchesSearch && matchesRevision;
    })
  );

  if (searchQuery || onlyRevision) {
    if (!hasVisibleContent) return null;
  }

  return (
    <div className="mb-4">
      {/* Section Header - Clean & Modern */}
      <div 
        className={`relative group cursor-pointer transition-all duration-300 rounded-xl border bg-[var(--color-bg-card)]
          ${isExpanded 
            ? 'rounded-b-none border-b-0 border-gray-200 dark:border-white/10' 
            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
          }
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-4 flex items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
              ${isExpanded 
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' 
                : 'bg-gray-50 dark:bg-white/5 text-gray-400'
              }
            `}>
               {percentage === 100 ? <Award className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">Section {index + 1}</span>
                {percentage === 100 && (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-bold uppercase tracking-widest border border-emerald-500/20">Completed</span>
                )}
              </div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
                {section.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
               <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Progress</div>
               <div className={`text-xs font-bold ${percentage === 100 ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                 {completedCount} / {totalCount}
               </div>
            </div>

            <div className={`transition-all duration-300 ${isExpanded ? 'rotate-180 text-primary-500' : 'text-gray-300'}`}>
               <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Section Content */}
      {isExpanded && (
        <div className="bg-gray-50 dark:bg-[#000000] border border-t-0 border-gray-200 dark:border-white/10 rounded-b-xl shadow-inner overflow-hidden animate-in slide-in-from-top-1 duration-200">
          <div className="p-4 space-y-3">
            {section.subsections && section.subsections.length > 0 ? (
              section.subsections.map((sub, sIdx) => (
                 <SubsectionView 
                  key={sub.id}
                  subsection={sub}
                  index={sIdx}
                  userStats={userStats}
                  onToggleComplete={onToggleComplete}
                  onToggleRevision={onToggleRevision}
                  togglingId={togglingId}
                  problemsMap={problemsMap}
                  searchQuery={searchQuery}
                  onlyRevision={onlyRevision}
                />
              ))
            ) : (
              <div className="py-12 px-10 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No subsections available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionView;









