import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaExternalLinkAlt,
  FaYoutube,
  FaSpinner,
  FaCheck,
  FaBookmark,
  FaRegBookmark,
  FaTrash,
  FaUnlink
} from 'react-icons/fa';
import {
  BookOpen,
  FileText,
  Trophy,
  PlayCircle
} from 'lucide-react';
import { SheetEditorialRender } from '../shared/SheetEditorialRender';

const ProblemItem = ({
  problem,
  isCompleted,
  isMarkedForRevision,
  onToggleComplete,
  onToggleRevision,
  togglingId,
  index,
  canManageSheets // Added to handle the action column logic
}) => {
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);

  if (!problem) return null;

  const getDifficultyStyle = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10';
      case 'medium':
        return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10';
      case 'hard':
        return 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10';
      default:
        return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-white/5';
    }
  };

  const getDifficultyDot = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-emerald-500';
      case 'medium': return 'bg-orange-500';
      case 'hard': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <>
      <tr className={`
        group transition-all duration-200 
        border-b border-gray-50/50 dark:border-white/[0.01]
        ${isCompleted
          ? 'bg-emerald-500/[0.03]'
          : 'hover:bg-gray-50/50 dark:hover:bg-white/[0.01]'
        }
      `}>

        {/* 1. Status */}
        <td className="py-2 pl-8 pr-4 text-center">
          <div className="flex items-center justify-center">
            <button
              onClick={() => onToggleComplete(problem.id)}
              disabled={togglingId === problem.id}
              className={`
                w-6 h-6 rounded-lg border-2 flex items-center justify-center
                transition-all duration-300 transform hover:scale-110 active:scale-95
                ${isCompleted
                  ? 'bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-transparent border-[var(--color-border-interactive)] hover:border-emerald-500/50'
                }
              `}
            >
              {togglingId === problem.id ? (
                <FaSpinner className="w-3 h-3 animate-spin text-white" />
              ) : isCompleted ? (
                <FaCheck className="w-3 h-3 text-white" />
              ) : null}
            </button>
          </div>
        </td>

        {/* 2. Problem Title */}
        <td className="py-2 px-4 text-left">
          <div className="flex flex-col">
            <span className={`text-sm font-bold tracking-tight transition-all
              ${isCompleted ? 'text-gray-400 opacity-60' : 'text-gray-900 dark:text-gray-200'}
            `}>
              {problem.title}
            </span>
          </div>
        </td>

        {/* 3. Links (Combined Practice & Notes) */}
        <td className="py-2 px-4 text-center">
          <div className="flex items-center justify-center gap-2">
            {problem.practiceLink && (
              <a
                href={problem.practiceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                title="Practice"
              >
                <FaExternalLinkAlt className="w-3 h-3" />
              </a>
            )}
            {problem.notesLink && (
              <a
                href={problem.notesLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                title="Notes"
              >
                <FileText className="w-3.5 h-3.5" />
              </a>
            )}
            {!problem.practiceLink && !problem.notesLink && <span className="text-gray-300 dark:text-gray-800">—</span>}
          </div>
        </td>

        {/* 4. Video */}
        <td className="py-2 px-4 text-center">
          {problem.youtubeLink ? (
            <button
              onClick={() => setShowVideo(true)}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-all hover:scale-110"
              title="Watch Video"
            >
              <PlayCircle className="w-4.5 h-4.5" />
            </button>
          ) : <span className="text-gray-300 dark:text-gray-800">—</span>}
        </td>

        {/* 5. Editorial */}
        <td className="py-2 px-4 text-center">
          {problem.editorialLink ? (
            <button
              onClick={() => navigate(`/dashboard/editorial/${problem.id}`)}
              className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10 transition-colors"
              title="Editorial"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          ) : <span className="text-gray-300 dark:text-gray-800">—</span>}
        </td>

        {/* 6. Difficulty */}
        <td className="py-2 px-4 text-center">
          {problem.difficulty ? (
            <div className={`
              inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider
              ${getDifficultyStyle(problem.difficulty)}
            `}>
              <span className={`w-1 h-1 rounded-full ${getDifficultyDot(problem.difficulty)}`}></span>
              <span>{problem.difficulty}</span>
            </div>
          ) : <span className="text-gray-300 dark:text-gray-800">—</span>}
        </td>

        {/* 7. Bookmark (Revision) */}
        <td className="py-2 pl-4 pr-8 text-center">
          <button
            onClick={() => onToggleRevision(problem.id)}
            disabled={togglingId === problem.id}
            className={`p-2 rounded-lg transition-all active:scale-90
              ${isMarkedForRevision
                ? 'text-orange-500 bg-orange-500/10'
                : 'text-gray-300 dark:text-gray-800 hover:text-orange-500 hover:bg-orange-500/10'
              }
            `}
          >
            {isMarkedForRevision ? (
              <FaBookmark className="w-3 h-3" />
            ) : (
              <FaRegBookmark className="w-3 h-3" />
            )}
          </button>
        </td>

        {/* 8. Actions (Conditional) */}
        {canManageSheets && (
          <td className="py-3.5 pl-4 pr-6 text-center">
            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 text-gray-400 hover:text-orange-500 transition-colors" title="Unlink">
                <FaUnlink className="w-3 h-3" />
              </button>
              <button className="p-2 text-gray-400 hover:text-rose-500 transition-colors" title="Delete">
                <FaTrash className="w-3 h-3" />
              </button>
            </div>
          </td>
        )}
      </tr>

      <SheetEditorialRender
        isOpen={showVideo}
        onClose={() => setShowVideo(false)}
        youtubeLink={problem.youtubeLink}
        problemName={problem.title}
        problemId={problem.id}
        initialTab="video"
      />
    </>
  );
};

export default ProblemItem;








