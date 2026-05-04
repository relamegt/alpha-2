import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Plus,
  MessageSquare,
  ThumbsUp, Layers,Target,
  ChevronRight,
  Building2,
  MapPin,
  Clock,
  Briefcase, Loader2, Activity,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import interviewExperienceService from '../../../services/interviewExperienceService';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../contexts/ThemeContext';

const InterviewExperienceList = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedOutcome, setSelectedOutcome] = useState('All');
  const [sortBy, setSortBy] = useState('Most Upvoted');
  const [page, setPage] = useState(1);

  const { data: popularCompanies = [] } = useQuery({
    queryKey: ['popular-companies'],
    queryFn: () => interviewExperienceService.getPopularCompanies()
  });

  const { data, isLoading } = useQuery({
    queryKey: ['interview-experiences', searchQuery, selectedDifficulty, selectedOutcome, sortBy, page],
    queryFn: () => interviewExperienceService.getAll({
      companyName: searchQuery,
      difficulty: selectedDifficulty !== 'All' ? selectedDifficulty : undefined,
      outcome: selectedOutcome !== 'All' ? selectedOutcome : undefined,
      sortBy,
      page,
      limit: 10
    })
  });

  const experiences = data?.experiences || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

  const handleCompanyClick = (companyName) => {
    setSearchQuery(companyName);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDifficulty('All');
    setSelectedOutcome('All');
    setSortBy('Most Upvoted');
    setPage(1);
  };

  return (
    <div className={`flex-1 overflow-y-auto p-4 md:p-10 scrollbar-hide transition-colors bg-[var(--color-bg-primary)] ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="w-full max-w-[1600px] mx-auto">
        {/* HEADER SECTION - Minimalist */}
        <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-semibold leading-tight mb-2">
                        Interview Experiences
                    </h1>
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Learn from the journeys of others and prepare for your dream company.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/interview/experience/submit')}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 active:scale-95 transition-all text-sm flex items-center gap-2 shadow-sm shadow-primary-600/10"
                >
                    <Plus className="w-4 h-4" />
                    Share Experience
                </button>
            </div>
        </header>

        {/* SEARCH & COMPANIES BAR */}
        <div className="space-y-8 mb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search company..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className={`w-full pl-11 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all ${
                            isDark 
                                ? 'bg-[var(--color-bg-input)] border border-gray-800 text-gray-200 focus:ring-2 focus:ring-primary-500/10' 
                                : 'bg-[var(--color-bg-input)] border border-gray-200 text-gray-800 shadow-sm focus:ring-2 focus:ring-primary-500/10'
                        }`}
                    />
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide w-full sm:w-auto">
                    {['Difficulty', 'Outcome', 'Sort'].map((filterType) => (
                        <select
                            key={filterType}
                            value={filterType === 'Difficulty' ? selectedDifficulty : filterType === 'Outcome' ? selectedOutcome : sortBy}
                            onChange={(e) => {
                                if (filterType === 'Difficulty') setSelectedDifficulty(e.target.value);
                                else if (filterType === 'Outcome') setSelectedOutcome(e.target.value);
                                else setSortBy(e.target.value);
                                setPage(1);
                            }}
                            className={`rounded-xl px-4 py-2 text-xs font-semibold border outline-none transition-all cursor-pointer ${
                                isDark ? 'bg-[var(--color-bg-input)] border-gray-800 focus:border-primary-500/50' : 'bg-[var(--color-bg-input)] border-gray-200 focus:border-primary-500'
                            }`}
                        >
                            {filterType === 'Difficulty' && (
                                <>
                                    <option value="All">Difficulty</option>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </>
                            )}
                            {filterType === 'Outcome' && (
                                <>
                                    <option value="All">Outcome</option>
                                    <option value="Selected">Selected</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Waitlisted">Waitlisted</option>
                                </>
                            )}
                            {filterType === 'Sort' && (
                                <>
                                    <option value="Most Upvoted">Most Upvoted</option>
                                    <option value="Most Recent">Most Recent</option>
                                </>
                            )}
                        </select>
                    ))}
                    {(searchQuery || selectedDifficulty !== 'All' || selectedOutcome !== 'All') && (
                        <button onClick={handleResetFilters} className="text-xs font-semibold text-rose-500 hover:underline px-2 whitespace-nowrap">Reset</button>
                    )}
                </div>
            </div>

            {/* Compact Popular Companies */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">Popular:</span>
                {popularCompanies.map(company => (
                    <button
                        key={company.name}
                        onClick={() => handleCompanyClick(company.name)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                            searchQuery === company.name 
                                ? 'bg-primary-600 text-white border-primary-600' 
                                : isDark ? 'bg-[var(--color-bg-card)] border-gray-800 text-gray-400 hover:text-white hover:bg-[var(--color-bg-hover)]' : 'bg-[var(--color-bg-card)] border-gray-200 text-gray-600 hover:border-primary-300'
                        }`}
                    >
                        <img src={company.logo || 'https://cdn-icons-png.flaticon.com/512/300/300221.png'} className="w-4 h-4 object-contain" alt="" />
                        <span className="text-xs font-semibold">{company.name}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* FEED GRID - Matching SheetList Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`h-64 rounded-2xl animate-pulse bg-[var(--color-bg-card)]`} />
            ))
          ) : experiences.length === 0 ? (
            <div className={`col-span-full py-20 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center bg-[var(--color-bg-card)] border-[var(--color-border-interactive)]`}>
              <Building2 size={40} className="text-gray-400 mb-4" />
              <p className="text-gray-500 font-semibold uppercase tracking-widest text-xs">No experiences found</p>
            </div>
          ) : (
            experiences.map((exp) => (
              <div
                key={exp.id}
                onClick={() => navigate(`/dashboard/interview/experience/${exp.id}`)}
                className={`group p-6 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all duration-200 cursor-pointer flex flex-col relative overflow-hidden ${
                    isDark 
                        ? 'bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-hover)]' 
                        : 'bg-[var(--color-bg-card)] hover:border-primary-300 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Static Ambient Glow - Mimicking CodeTyper effect */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-60" 
                     style={{
                         background: `radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.20), transparent 70%)`
                     }} 
                />

                <div className="relative z-10 flex flex-col h-full flex-1">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shrink-0 shadow-sm border border-[var(--color-border-image)]">
                        <img
                            src={
                                exp.companyName.toLowerCase().includes('google') ? 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.png' :
                                exp.companyName.toLowerCase().includes('amazon') ? 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg' :
                                exp.companyName.toLowerCase().includes('microsoft') ? 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg' :
                                'https://cdn-icons-png.flaticon.com/512/300/300221.png'
                            }
                            className="w-full h-full object-contain"
                            alt=""
                        />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-widest ${exp.outcome === 'Selected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {exp.outcome}
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-semibold ${exp.isUpvoted ? 'text-primary-600' : 'text-gray-400'}`}>
                            <ThumbsUp size={14} className={exp.isUpvoted ? 'fill-current' : ''} />
                            <span>{exp.upvotes}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="text-lg font-semibold leading-tight mb-1 line-clamp-1">
                        {exp.jobPosition}
                    </h3>
                    <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {exp.companyName}
                    </p>
                </div>

                <div className="flex gap-3 mb-6 flex-wrap">
                    {exp.rounds && exp.rounds.length > 0 && (
                      <div className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${isDark ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                          <Clock className="w-3.5 h-3.5 text-primary-500" />
                          <span className="text-[10px] font-semibold text-gray-500">{exp.rounds.length} Rounds</span>
                      </div>
                    )}
                    {exp.difficulty && (
                      <div className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${isDark ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                          <Target className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] font-semibold text-gray-500">{exp.difficulty}</span>
                      </div>
                    )}
                </div>

                </div>
              </div>
            ))
          )}
        </div>

        {/* PAGINATION - Minimalist */}
        {pagination.totalPages > 1 && (
            <div className="mt-12 flex justify-center gap-2 pb-10">
                {Array.from({ length: pagination.totalPages }).map((_, i) => (
                    <button
                        key={i}
                        onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`w-9 h-9 rounded-lg font-semibold text-xs transition-all ${
                            page === i + 1 
                                ? 'bg-primary-600 text-white' 
                                : isDark ? 'bg-[var(--color-bg-card)] text-gray-500 border border-gray-800' : 'bg-white text-gray-500 border border-gray-200'
                        }`}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default InterviewExperienceList;








