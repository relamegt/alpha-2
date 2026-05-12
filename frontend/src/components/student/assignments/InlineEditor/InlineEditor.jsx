import { useState, useRef, useEffect, useCallback } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { 
  Play, Send, RefreshCw, CheckCircle2, XCircle, 
  Info, Code2, Monitor, BookOpen, Clock, 
  Terminal, History, ChevronLeft, Layout,
  Maximize2, X, CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import EditorialRenderer from '../../EditorialRenderer';
import './InlineEditor.css';

const DEFAULT_FILES = {
  html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My AlphaProject</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to AlphaLearn</h1>
        <p>Complete the task to master frontend development.</p>
        <button id="main-btn">Click Me</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
  css: `body {
    margin: 0;
    font-family: 'Outfit', sans-serif;
    background: #f8faff;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}
.container {
    background: white;
    padding: 3rem;
    border-radius: 2rem;
    box-shadow: 0 20px 40px rgba(0,0,0,0.05);
    text-align: center;
}
h1 { color: #1e293b; }
button {
    background: #6366f1;
    color: white;
    border: none;
    padding: 10px 24px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
}`,
  js: `// Start writing your logic here
const btn = document.getElementById('main-btn');
btn.addEventListener('click', () => {
    alert('Logic is working!');
});`
};

export default function InlineEditor({ assignment, description }) {
  const starter = assignment.templateFiles?.files || {};
  const [leftTab, setLeftTab] = useState('description');
  const [rightBottomTab, setRightBottomTab] = useState('preview');
  const [codeTab, setCodeTab] = useState('html');
  
  const [html, setHtml] = useState(starter['index.html'] || DEFAULT_FILES.html);
  const [css, setCss] = useState(starter['style.css'] || DEFAULT_FILES.css);
  const [js, setJs] = useState(starter['script.js'] || DEFAULT_FILES.js);
  
  const [result, setResult] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const iframeRef = useRef();
  const fullscreenIframeRef = useRef();

  useEffect(() => {
    fetchSubmissions();
    if (starter['index.html']) setHtml(starter['index.html']);
    if (starter['style.css']) setCss(starter['style.css']);
    if (starter['script.js']) setJs(starter['script.js']);
  }, [assignment.id]);

  useEffect(() => {
    const timeout = setTimeout(() => updatePreview(), 1000);
    return () => clearTimeout(timeout);
  }, [html, css, js, rightBottomTab, isPreviewFullscreen]);

  const fetchSubmissions = async () => {
    try {
      const { data } = await axios.get(`/api/student/submissions?assignmentId=${assignment.id}`);
      setSubmissions(data || []);
    } catch (e) { console.error('Failed to fetch submissions'); }
  };

  const updatePreview = useCallback(() => {
    const writeToIframe = (ref) => {
      if (!ref.current) return;
      try {
        const doc = ref.current.contentDocument || ref.current.contentWindow?.document;
        if (!doc) return;
        
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { margin: 0; padding: 20px; font-family: 'Outfit', sans-serif; background: #fff; color: #333; }
                ${css}
              </style>
            </head>
            <body>
              ${html}
              <script>
                (function() {
                  try {
                    ${js}
                  } catch (e) {
                    console.error('Preview Error:', e);
                  }
                })();
              </script>
            </body>
          </html>
        `);
        doc.close();
      } catch (e) {
        console.warn('Failed to update preview iframe:', e);
      }
    };

    if (rightBottomTab === 'preview') {
      writeToIframe(iframeRef);
    }
    
    if (isPreviewFullscreen) {
      writeToIframe(fullscreenIframeRef);
    }
  }, [html, css, js, rightBottomTab, isPreviewFullscreen]);

  const handleRun = async () => {
    setIsRunning(true);
    setRightBottomTab('results');
    try {
      const { data } = await axios.post(`/api/assignments/${assignment.id}/run/inline`, { html, css, js });
      setResult(data);
      if (data.passed) toast.success('Public tests passed!');
      else toast.error('Some tests failed.');
    } catch (err) {
      toast.error('Run failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setRightBottomTab('results');
    try {
      const { data } = await axios.post(`/api/assignments/${assignment.id}/submit/inline`, { html, css, js });
      setResult(data);
      fetchSubmissions();
      if (data.passed) toast.success('Assignment submitted successfully!');
      else toast.error('Assignment completed with some failures.');
    } catch (err) {
      toast.error('Submission failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCodeChange = (v) => {
    if (codeTab === 'html') setHtml(v);
    else if (codeTab === 'css') setCss(v);
    else setJs(v);
  };

  return (
    <div className="workspace-container">
      {/* Slim Header */}
      <header className="workspace-header">
        <div className="left-actions">
          <Link to="/assignments" className="back-btn">
            <ChevronLeft size={18} />
          </Link>
          <div className="title-area">
             <span className="type-badge">Inline Project</span>
             <h1 className="assignment-title">{assignment.title}</h1>
          </div>
        </div>
        
        <div className="center-actions">
           <div className="timer-display">
             <Clock size={14} className="text-primary-400" />
             <span>00:00:00</span>
           </div>
        </div>

        <div className="right-actions">
          <div className="flex items-center bg-gray-100 dark:bg-[#111117] border border-gray-300 dark:border-gray-700 rounded-lg p-0.5 transition-colors">
            <button 
              onClick={handleRun} 
              disabled={isRunning || isSubmitting} 
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-gray-700 dark:text-gray-300 rounded-md hover:bg-white dark:hover:bg-[#23232e] hover:shadow-sm transition-all disabled:opacity-50"
              title="Run Code"
            >
              {isRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={10} className="fill-current" />}
              <span>Run</span>
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isRunning || isSubmitting} 
              className="flex items-center gap-1.5 px-4 py-1.5 ml-0.5 text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm transition-all disabled:opacity-50"
              title="Submit Code"
            >
              {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              <span>Submit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="workspace-main">
        <PanelGroup direction="horizontal">
          {/* Left Panel: Description & Submissions */}
          <Panel defaultSize={35} minSize={20}>
            <div className="side-panel">
              <div className="panel-tabs">
                <button 
                  className={`panel-tab ${leftTab === 'description' ? 'active' : ''}`}
                  onClick={() => setLeftTab('description')}
                >
                  <BookOpen size={14} /> Description
                </button>
                <button 
                  className={`panel-tab ${leftTab === 'submissions' ? 'active' : ''}`}
                  onClick={() => setLeftTab('submissions')}
                >
                  <History size={14} /> Submissions
                </button>
              </div>
              
              <div className="panel-content custom-thin-scrollbar !p-0">
                {leftTab === 'description' ? (
                  <div className="p-6">
                    <div className="markdown-prose">
                      <EditorialRenderer 
                        problem={assignment}
                        content={description}
                        bypassLock={true}
                        isCompact={true}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {submissions.length > 0 ? (
                      submissions.map((s, idx) => (
                        <div key={idx} className="group flex items-center justify-between p-4 bg-[#111117] border border-gray-800 rounded-xl hover:border-primary-500/30 transition-all text-left">
                          <div className="flex items-center gap-4">
                             <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                               s.passed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                             }`}>
                               {s.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                               {s.passed ? 'Accepted' : 'Failed'}
                             </div>
                             <div className="flex flex-col">
                               <span className="text-[11px] font-bold text-gray-200">Score: {s.score}%</span>
                               <span className="text-[10px] text-gray-500">{new Date(s.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                             </div>
                          </div>
                          <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-600 opacity-50">
                        <History size={40} className="mb-4" />
                        <p className="text-xs font-bold uppercase tracking-widest">No submissions yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="h-resize-handle" />

          {/* Right Panel: Editor & Preview */}
          <Panel defaultSize={65}>
            <PanelGroup direction="vertical">
              {/* Top: Editor */}
              <Panel defaultSize={60} minSize={20}>
                <div className="editor-section">
                  <div className="panel-tabs">
                    {['html', 'css', 'js'].map(t => (
                      <button 
                        key={t}
                        className={`panel-tab ${codeTab === t ? 'active' : ''}`}
                        onClick={() => setCodeTab(t)}
                      >
                         <Code2 size={14} /> {t === 'js' ? 'script.js' : t === 'css' ? 'style.css' : 'index.html'}
                      </button>
                    ))}
                  </div>
                  <div className="editor-container">
                    <Editor
                      height="100%"
                      language={codeTab === 'js' ? 'javascript' : codeTab}
                      value={codeTab === 'html' ? html : codeTab === 'css' ? css : js}
                      onChange={onCodeChange}
                      theme="vs-dark"
                      options={{
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', monospace",
                        minimap: { enabled: false },
                        padding: { top: 16 },
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        lineNumbersMinChars: 3,
                        renderLineHighlight: 'all',
                        scrollbar: { verticalScrollbarSize: 8 },
                        backgroundColor: '#0d0d0d'
                      }}
                    />
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="v-resize-handle" />

              {/* Bottom: Preview & Results */}
              <Panel defaultSize={40} minSize={10}>
                <div className="bottom-section">
                  <div className="panel-tabs">
                    <button 
                      className={`panel-tab ${rightBottomTab === 'preview' ? 'active' : ''}`}
                      onClick={() => setRightBottomTab('preview')}
                    >
                      <Monitor size={14} /> Preview
                    </button>
                    <button 
                      className={`panel-tab ${rightBottomTab === 'results' ? 'active' : ''}`}
                      onClick={() => setRightBottomTab('results')}
                    >
                      <Terminal size={14} /> Test Results
                    </button>
                    {rightBottomTab === 'preview' && (
                      <button 
                        className="panel-tab !ml-auto hover:text-white"
                        onClick={() => setIsPreviewFullscreen(true)}
                        title="Full Screen Preview"
                      >
                        <Maximize2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div className="bottom-content">
                    {rightBottomTab === 'preview' ? (
                      <div className="preview-container">
                        <iframe
                          ref={iframeRef}
                          className="workspace-preview-iframe"
                          sandbox="allow-scripts allow-same-origin"
                          title="Preview"
                          src="about:blank"
                          onLoad={() => updatePreview()}
                        />
                      </div>
                    ) : (
                      <div className="results-container custom-thin-scrollbar">
                        {result ? (
                          <div className="p-6">
                             <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800">
                                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black tracking-widest border ${
                                  result.passed ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                }`}>
                                   {result.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                   {result.passed ? 'ACCEPTED' : 'WRONG ANSWER'}
                                </div>
                                <div className="text-xl font-black text-white">Score: {result.score}%</div>
                             </div>
                             <div className="space-y-2">
                                {result.testResults?.map((t, i) => (
                                  <div key={i} className={`flex items-center justify-between p-4 bg-[#111117] border border-gray-800 rounded-xl ${
                                    t.passed ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-rose-50'
                                  }`}>
                                     <div className="flex flex-col gap-1">
                                        <span className="text-[11px] font-bold text-gray-200">Test Case {i + 1}: {t.name}</span>
                                        <span className="text-[10px] text-gray-500">{t.message || (t.passed ? 'Check passed' : 'Check failed')}</span>
                                     </div>
                                     {t.passed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-rose-500" />}
                                  </div>
                                ))}
                             </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-gray-600 opacity-50">
                            <Terminal size={40} className="mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest">Execute tests to see results</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </main>

      {/* Fullscreen Preview Modal */}
      {isPreviewFullscreen && (
        <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="h-16 flex items-center justify-between px-8 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-4">
               <Monitor className="text-primary-500" size={24} />
               <div>
                 <h2 className="text-white font-bold text-lg">Live Preview</h2>
                 <p className="text-gray-500 text-xs uppercase tracking-widest font-black">{assignment.title}</p>
               </div>
            </div>
            <button 
              onClick={() => setIsPreviewFullscreen(false)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all active:scale-95 group"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
          <div className="flex-1 p-8 bg-[#0d0d0d]">
             <div className="w-full h-full bg-white rounded-3xl overflow-hidden shadow-2xl shadow-primary-500/10">
               <iframe
                 ref={fullscreenIframeRef}
                 className="w-full h-full border-none"
                 sandbox="allow-scripts allow-same-origin"
                 title="Fullscreen Preview"
                 src="about:blank"
                 onLoad={() => updatePreview()}
               />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
