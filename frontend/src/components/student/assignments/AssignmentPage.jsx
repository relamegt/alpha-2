import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import InlineEditor from './InlineEditor/InlineEditor';
import LaunchIDEButton from './IDELauncher/LaunchIDEButton';
import { 
  ChevronLeft, BookOpen, Terminal, 
  CheckCircle2, Clock, BarChart3, 
  ArrowUpRight, Info
} from 'lucide-react';
import './AssignmentPage.css';

const INLINE_TYPES = ['HTML_CSS_JS'];
const IDE_TYPES    = ['REACT', 'NODE', 'FULLSTACK', 'FULLSTACK_MERN'];

export default function AssignmentPage() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [externalReadme, setExternalReadme] = useState('');
  const [activeTab, setActiveTab] = useState('instructions');

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/assignments/${id}`)
      .then(async r => {
        const assn = r.data;
        setAssignment(assn);
        
        // Priority 1: readmeUrl field
        // Priority 2: repoUrl in templateFiles
        const targetUrl = assn.readmeUrl || assn.templateFiles?.repoUrl;

        if (targetUrl && targetUrl.includes('github.com')) {
          try {
            let rawUrl = targetUrl;
            if (!targetUrl.includes('raw.githubusercontent.com')) {
               rawUrl = targetUrl.replace('github.com', 'raw.githubusercontent.com');
               // If it's a repo link but not a direct file link, append README.md
               if (!rawUrl.endsWith('.md')) {
                 rawUrl = rawUrl.replace(/\/$/, '') + '/main/README.md';
               }
            }
            const readmeRes = await axios.get(rawUrl);
            setExternalReadme(readmeRes.data);
          } catch (e) {
            console.warn('Failed to fetch README from GitHub:', e);
          }
        }
      })
      .catch(err => console.error('Error fetching assignment:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-gray-500">Syncing project environment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center">
        <div>
          <Info size={48} className="text-primary-400 mx-auto mb-4" />
          <h1 className="page-header-title">Assignment Not Found</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">The workspace you are looking for might have been moved or deleted.</p>
          <Link to="/assignments" className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-primary-600/20">Return to Assignments</Link>
        </div>
      </div>
    );
  }

  // Extract README hierarchy
  const readmeContent = externalReadme || 
                        assignment.templateFiles?.files?.['README.md'] || 
                        assignment.description || 
                        '# Assignment Instructions\n\nNo detailed instructions provided.';

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-8 animate-in fade-in duration-500">
      {/* Top Banner / Header */}
      <header className="shrink-0 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col gap-6">
          <Link to="/assignments" className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-all font-semibold text-[10px] uppercase tracking-wider group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> BACK TO ASSIGNMENTS
          </Link>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
                assignment.difficulty === 'Easy' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-100 dark:border-emerald-500/20' :
                assignment.difficulty === 'Medium' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-100 dark:border-orange-500/20' :
                'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border-red-100 dark:border-red-500/20'
              }`}>
                {assignment.difficulty}
              </span>
              <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-500 border border-primary-100 dark:border-primary-500/20 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                LAB / ASSIGNMENT
              </span>
              {assignment.type === 'FULLSTACK_MERN' && (
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  FULLSTACK MERN
                </span>
              )}
            </div>
            <h1 className="page-header-title">{assignment.title}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-hide">
        <div className="max-w-5xl mx-auto py-8 space-y-8">
          {/* Main Content Area */}
          <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="border-b border-gray-100 dark:border-gray-800 p-6 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="text-primary-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">Project Instructions</h2>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                   <Clock size={14} /> {assignment.type === 'FULLSTACK_MERN' ? '120 MIN' : '45 MIN'}
                </div>
                <div className="flex items-center gap-1.5">
                   <CheckCircle2 size={14} /> {assignment.testCases?.length || 0} TESTS
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* README Render */}
              <div className="markdown-viewer prose dark:prose-invert max-w-none prose-headings:tracking-tight prose-a:text-primary-600">
                <ReactMarkdown>{readmeContent}</ReactMarkdown>
              </div>

              {/* MERN Quick Start */}
              {assignment.type === 'FULLSTACK_MERN' && (
                <div className="mt-12 p-6 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-500/20 rounded-xl">
                  <h3 className="text-base font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                    <Terminal size={18} /> MERN Workspace Quick Start
                  </h3>
                  <div className="space-y-4 text-sm text-gray-600 dark:text-indigo-50/70">
                    <p>This project uses a multi-service structure with <strong>{assignment.serviceStructure?.frontendDir || 'client'}</strong> and <strong>{assignment.serviceStructure?.backendDir || 'server'}</strong>.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 dark:bg-[var(--color-bg-card)] rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">Frontend</div>
                        <code className="text-xs text-primary-600">Port: {assignment.defaultPorts?.frontend || 5173}</code>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-[var(--color-bg-card)] rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">Backend</div>
                        <code className="text-xs text-primary-600">Port: {assignment.defaultPorts?.backend || 5000}</code>
                      </div>
                    </div>
                    <ul className="list-disc list-inside space-y-1 mt-2 font-medium">
                      <li>Use <code>npm run install:all</code> to install dependencies for both services.</li>
                      <li>Use <code>npm run dev</code> to launch both services concurrently.</li>
                      <li>Environment variables (.env) are automatically pre-configured.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Validation Rules Preview (if any) */}
              {assignment.testCases?.length > 0 && (
                <div className="mt-12 pt-8 border-t border-[var(--color-border-interactive)]">
                   <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                     <CheckCircle2 size={18} className="text-emerald-500" />
                     Validation Requirements
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {assignment.testCases.map((tc, i) => (
                       <div key={i} className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-[var(--color-bg-card)] rounded-xl border border-gray-100 dark:border-gray-800">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-600 shadow-[0_0_8px_rgba(125,99,242,0.3)]"></div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{tc.name}</span>
                          {tc.group && (
                            <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-400 uppercase tracking-wider">
                              {tc.group.toUpperCase()}
                            </span>
                          )}
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {/* Call to Action: Launch IDE */}
              <div className="mt-12 p-8 bg-gradient-to-br from-primary-50 dark:from-primary-900/10 to-transparent border border-primary-100 dark:border-primary-500/20 rounded-xl flex flex-col items-center text-center">
                 <Terminal size={40} className="text-primary-600 mb-4 opacity-40" />
                 <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">Ready to start?</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md font-medium leading-relaxed">
                   Click below to initialize your cloud workspace. All your progress will be automatically saved to your profile.
                 </p>
                 
                 {IDE_TYPES.includes(assignment.type) ? (
                   <LaunchIDEButton assignment={assignment} />
                 ) : (
                   <button 
                     className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-sm flex items-center gap-2" 
                     onClick={() => document.getElementById('inline-editor-section')?.scrollIntoView({ behavior: 'smooth' })}
                   >
                     Launch Web Editor <ArrowUpRight size={16} />
                   </button>
                 )}
              </div>
            </div>
          </div>

          {/* Inline Editor (if applicable) */}
          {INLINE_TYPES.includes(assignment.type) && (
            <section id="inline-editor-section" className="mt-8 scroll-mt-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-3 tracking-tight">
                    <Terminal size={24} className="text-primary-600" />
                    Interactive Workspace
                  </h2>
                  <p className="text-gray-500 text-sm mt-1 font-medium">Directly edit and test your code inside the browser.</p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-[var(--color-bg-card)]">
                <InlineEditor assignment={assignment} />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}








