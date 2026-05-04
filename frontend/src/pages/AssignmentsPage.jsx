import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { useTheme } from '../contexts/ThemeContext';
import './AssignmentsPage.css';

const TYPE_ICONS = {
  HTML_CSS_JS: '🌐',
  REACT:       '⚛️',
  NODE:        '🟢',
  FULLSTACK:   '🔷'
};

const TYPE_LABELS = {
  HTML_CSS_JS: 'Inline Editor',
  REACT:       'Local IDE',
  NODE:        'Local IDE',
  FULLSTACK:   'Local IDE'
};

export default function AssignmentsPage() {
  const { isDark } = useTheme();
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter]           = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading]         = useState(true);
  const navigate                      = useNavigate();

  useEffect(() => {
    apiClient.get('/assignments')
      .then(r => setAssignments(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assignments.filter(a => {
    const matchesType = filter === 'ALL' || a.type === filter;
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-gray-500">Loading Practical Exercises...</p>
      </div>
    </div>
  );

  return (
    <div className="pb-16 text-gray-900 dark:text-white">
      <header className="page-header-container animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="page-header-title">Practical Assignments</h1>
        <p className="page-header-desc">Hands-on projects to master your development skills.</p>
      </header>

      {/* Tabs & Search Header */}
      <div className="page-tabs-container">
        <div className="flex items-center p-1 bg-[var(--color-tab-container-bg)] border border-gray-100 dark:border-gray-800 rounded-full w-max">
          {['All Assignments', 'Continue Working', 'Completed'].map(t => (
            <button
              key={t}
              onClick={() => {}} // Placeholder for status filter
              className={`px-5 py-2 rounded-full text-sm transition-all whitespace-nowrap ${
                t === 'All Assignments' 
                  ? 'bg-[var(--color-tab-bg-active)] text-[var(--color-tab-text-active)] shadow-md ring-1 ring-[var(--color-tab-ring-active)]' 
                  : 'text-[var(--color-tab-text-inactive)] hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#181820] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
          <div className="relative w-full sm:w-64 group">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-11 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all ${
                isDark 
                    ? 'bg-[var(--color-bg-card)] border border-gray-800 text-gray-200 focus:ring-2 focus:ring-primary-500/20' 
                    : 'bg-[#F1F3F4] text-gray-800 border border-transparent focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm placeholder:text-gray-500'
              }`}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Main Content Area */}
        <div className="flex-grow">
          {filtered.length > 0 ? (
            <div className="space-y-6">
              {filtered.map((a, idx) => (
                <div
                  key={a.id}
                  className={`group relative flex flex-col md:flex-row gap-6 p-5 rounded-2xl transition-all duration-300 border border-gray-100 dark:border-gray-800 cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                    isDark ? 'bg-[var(--color-bg-card)] hover:bg-[#111111]' : 'bg-[#ededede7] hover:bg-gray-50 shadow-sm hover:shadow-md'
                  }`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                  onClick={() => navigate(`/dashboard/assignments/${a.id}`)}
                >
                  {/* Icon Placeholder */}
                  <div className="w-full md:w-56 h-36 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800/50 flex-shrink-0 flex items-center justify-center text-4xl border border-[var(--color-border-image)]">
                    {TYPE_ICONS[a.type]}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-grow py-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold leading-tight group-hover:text-primary-500 transition-colors text-gray-900 dark:text-white">
                        {a.title}
                      </h3>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        a.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        a.difficulty === 'Medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                        'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {a.difficulty}
                      </span>
                    </div>

                    <p className="text-sm line-clamp-2 mb-4 text-gray-500 dark:text-gray-400 font-medium">
                      {a.description}
                    </p>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Environment</span>
                          <span className="text-[13px] font-semibold text-gray-600 dark:text-gray-400">{TYPE_LABELS[a.type]}</span>
                        </div>
                      </div>

                      <div className="btn-secondary py-1.5 px-4 text-xs">
                        Start Activity
                        <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-gray-50 dark:bg-[#181820]/20 rounded-[2rem] border-2 border-dashed border-[var(--color-border-interactive)]/50">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 text-3xl">📂</div>
              <h3 className="text-lg font-bold mb-1">No assignments found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0">
          <div className={`sticky top-24 p-8 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 ${
            isDark ? 'bg-[var(--color-bg-card)]' : 'bg-white shadow-sm'
          }`}>
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">Environments</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Filter by tech stack</p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {['ALL', 'HTML_CSS_JS', 'REACT', 'NODE', 'FULLSTACK'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    filter === f
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}









