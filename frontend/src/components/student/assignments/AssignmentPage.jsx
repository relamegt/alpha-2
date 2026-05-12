import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import InlineEditor from './InlineEditor/InlineEditor';
import LaunchIDEButton from './IDELauncher/LaunchIDEButton';
import { 
  ChevronLeft, BookOpen, Terminal, 
  CheckCircle2, Clock, BarChart3, 
  ArrowUpRight, Info, Zap, Layout,
  ShieldCheck
} from 'lucide-react';
import { CommandBlock } from './IDELauncher/IDEComponents';
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

  if (INLINE_TYPES.includes(assignment.type)) {
    return <InlineEditor assignment={assignment} description={readmeContent} />;
  }

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

      <main className="flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-hide pb-20">
        <div className="max-w-7xl mx-auto py-8">
          <div className={`grid grid-cols-1 ${IDE_TYPES.includes(assignment.type) ? 'lg:grid-cols-12' : ''} gap-8 items-start`}>
            
            {/* Left: Main Content (Instructions) */}
            <div className={`${IDE_TYPES.includes(assignment.type) ? 'lg:col-span-8' : ''} space-y-8`}>
              <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="border-b border-gray-100 dark:border-gray-800 p-6 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                      <BookOpen className="text-primary-600" size={18} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Project Documentation</h2>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                       <Clock size={14} /> {assignment.type === 'FULLSTACK_MERN' ? '120 MIN' : '45 MIN'}
                    </div>
                  </div>
                </div>

                <div className="p-8 lg:p-12">
                  <div className="markdown-viewer prose dark:prose-invert max-w-none prose-headings:tracking-tight prose-a:text-primary-600 prose-img:rounded-2xl prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800">
                    <ReactMarkdown>{readmeContent}</ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Validation Rules Section */}
              {assignment.testCases?.length > 0 && (
                <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                   <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                      <ShieldCheck className="text-emerald-500" size={18} />
                      <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                        Validation Requirements
                      </h3>
                   </div>
                   <div className="p-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {assignment.testCases.map((tc, i) => (
                         <div key={i} className="flex items-center gap-4 p-4 bg-gray-50/50 dark:bg-black/10 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-emerald-500/30 transition-all group">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] group-hover:scale-125 transition-transform"></div>
                            <div className="flex-1">
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block">{tc.name}</span>
                              {tc.group && (
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                                  {tc.group}
                                </span>
                              )}
                            </div>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
              )}
            </div>

            {/* Right: IDE Workspace Sidebar */}
            {IDE_TYPES.includes(assignment.type) && (
              <div className="lg:col-span-4 space-y-6 sticky top-8">
                {/* Launch Panel */}
                <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                      <Layout className="text-primary-600" size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">IDE Workspace</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Cloud Environment</p>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <LaunchIDEButton assignment={assignment} />
                    
                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project Token</span>
                         <span className="text-[10px] font-mono text-primary-600 font-bold bg-primary-500/5 px-2 py-1 rounded border border-primary-500/10">
                           {assignment.project_token || assignment.id.split('-')[0].toUpperCase()}
                         </span>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Commands Panel */}
                <div className="bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Terminal className="text-emerald-500" size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">CLI Workflow</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Terminal Controls</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <CommandBlock 
                      step={1} 
                      label="Setup Workspace" 
                      command={`alpha start ${assignment.project_token || assignment.id}`} 
                    />
                    <CommandBlock 
                      step={2} 
                      label="Test Progress" 
                      command={`alpha run ${assignment.project_token || assignment.id}`} 
                    />
                    <CommandBlock 
                      step={3} 
                      label="Final Submission" 
                      command={`alpha submit ${assignment.project_token || assignment.id}`} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
  </div>
  );
}








