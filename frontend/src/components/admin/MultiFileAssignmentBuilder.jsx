import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import apiClient from '../../services/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCode, Plus, Trash2, Github, Send, ChevronRight,
  ChevronDown, FolderPlus, Globe, Code, Save, Terminal,
  Settings, Search, Files, Layers, Box, Play, CheckCircle2,
  AlertCircle, X, CheckSquare, BarChart3

} from 'lucide-react';
import './MultiFileAssignmentBuilder.css';



const INITIAL_FILES = {
  'src/App.jsx': `export default function App() {\n  return (\n    <div className="p-8 bg-[#0a0a15] text-white min-h-screen font-sans">\n      <h1 className="text-4xl font-black text-indigo-400 mb-4 tracking-tighter">New Assignment</h1>\n      <p className="text-gray-400">Start building your project template here.</p>\n      <button className="mt-8 px-6 py-2 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-500 transition-colors">\n        Interactive Button\n      </button>\n    </div>\n  );\n}`,
  'src/index.css': `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody { \n  background: #0a0a0f;\n  color: #f0f0f0;\n  -webkit-font-smoothing: antialiased;\n}`,
  'package.json': `{\n  "name": "alphalearn-template",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0",\n    "lucide-react": "^0.263.1"\n  }\n}`,
  'README.md': `# Assignment Template\n\nProvide instructions here for the student.`
};

const MERN_FILES = {
  'client/src/App.jsx': `export default function App() {\n  return (\n    <div className="p-8 bg-[#0a0a15] text-white min-h-screen font-sans">\n      <h1 className="text-4xl font-black text-indigo-400 mb-4 tracking-tighter">MERN Frontend</h1>\n      <p className="text-gray-400">Communicating with backend at /api...</p>\n    </div>\n  );\n}`,
  'server/index.js': `const express = require('express');\nconst app = express();\nconst PORT = process.env.PORT || 5000;\n\napp.get('/api', (req, res) => res.json({ message: "Hello from MERN Backend" }));\n\napp.listen(PORT, () => console.log('Server running on port ' + PORT));`,
  'package.json': `{\n  "name": "mern-project",\n  "scripts": {\n    "dev": "concurrently \\"cd server && npm run dev\\" \\"cd client && npm run dev\\"",\n    "install:all": "npm install && cd client && npm install && cd ../server && npm install"\n  }\n}`,
  'README.md': `# MERN Assignment\n\nFollow the instructions in the README to complete the full-stack project.`
};

export default function MultiFileAssignmentBuilder() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const isNew = id === 'new' || pathname.endsWith('/new');
  const navigate = useNavigate();
  const [files, setFiles] = useState(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState('src/App.jsx');
  const [openFiles, setOpenFiles] = useState(['src/App.jsx', 'package.json']);
  const [assignment, setAssignment] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [logs, setLogs] = useState([{ type: 'info', msg: 'IDE initialized successfully.' }]);
  const [githubRepo, setGithubRepo] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [initForm, setInitForm] = useState({
    title: '',
    description: '',
    type: 'REACT',
    difficulty: 'beginner',
    serviceStructure: { frontendDir: 'client', backendDir: 'server' },
    defaultPorts: { frontend: 5173, backend: 5000 },
    readmeUrl: ''
  });
  const [activeSidebar, setActiveSidebar] = useState('explorer'); // 'explorer' | 'testing' | 'submissions'
  const [activeBottomTab, setActiveBottomTab] = useState('console');
  const [testCases, setTestCases] = useState([]);

  useEffect(() => {
    if (id && id !== 'new') {
      apiClient.get(`/assignments/${id}`).then(res => {
        setAssignment(res.data);
        const slug = res.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        setGithubRepo(slug);

        if (res.data.templateFiles?.files) {
          setFiles(res.data.templateFiles.files);
          const first = Object.keys(res.data.templateFiles.files)[0];
          setActiveFile(first);
          setOpenFiles(Object.keys(res.data.templateFiles.files).slice(0, 3));
        }
        if (res.data.testCases) {
          setTestCases(Array.isArray(res.data.testCases) ? res.data.testCases : []);
        }
      }).catch(err => addLog('error', 'Failed to load assignment data.'));
    } else if (isNew) {
      // Just setting standard initial files for new project
      setAssignment({ title: 'Untitled Assignment' });
    }
  }, [id, isNew]);

  const handleInitialize = async () => {
    if (!initForm.title) return alert('Title is required');
    const isMern = initForm.type === 'FULLSTACK_MERN';
    try {
      const { data } = await apiClient.post('/assignments', {
        ...initForm,
        templateFiles: { files: isMern ? MERN_FILES : INITIAL_FILES },
        testCases: []
      });
      navigate(`/admin/assignments/build/${data.id}`, { replace: true });
      setAssignment(data);
      if (isMern) {
        setFiles(MERN_FILES);
        setActiveFile('client/src/App.jsx');
        setOpenFiles(['client/src/App.jsx', 'server/index.js', 'package.json']);
      }
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setGithubRepo(slug);
      addLog('success', 'Assignment created and initialized.');
    } catch (err) {
      alert('Initialization failed: ' + err.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const addLog = (type, msg) => {
    setLogs(prev => [{ type, msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  };

  const handleFileClick = (name) => {
    setActiveFile(name);
    if (!openFiles.includes(name)) setOpenFiles([...openFiles, name]);
  };

  const closeFile = (name, e) => {
    e.stopPropagation();
    const nextOpen = openFiles.filter(f => f !== name);
    setOpenFiles(nextOpen);
    if (activeFile === name && nextOpen.length > 0) setActiveFile(nextOpen[0]);
  };

  const createNewFile = () => {
    const name = prompt('Enter file path (e.g. src/utils.js):');
    if (name && !files[name]) {
      setFiles({ ...files, [name]: '// New File Content' });
      handleFileClick(name);
      addLog('info', `Created file: ${name}`);
    }
  };

  const deleteFile = (name, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete ${name}?`)) {
      const next = { ...files };
      delete next[name];
      setFiles(next);
      setOpenFiles(openFiles.filter(f => f !== name));
      if (activeFile === name) setActiveFile(Object.keys(next)[0]);
      addLog('warn', `Deleted file: ${name}`);
    }
  };

  const onPublish = async () => {
    if (!githubRepo) return alert('Please enter a GitHub repository name.');
    setIsPublishing(true);
    addLog('info', 'Starting GitHub publication flow...');

    try {
      addLog('info', 'Packaging project workspace...');
      const { data } = await apiClient.post(`/assignments/${id}/publish-github`, {
        files,
        repoName: githubRepo
      });

      addLog('success', `Push successful! Live at: ${data.url}`);
      setTimeout(() => {
        alert('Successfully published and synced to GitHub!');
        navigate('/admin/assignments');
      }, 1000);
    } catch (err) {
      addLog('error', 'Publication failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsPublishing(false);
    }
  };

  const saveDraft = async () => {
    try {
      await apiClient.patch(`/assignments/${id}`, {
        title: assignment?.title,
        description: assignment?.description,
        readmeUrl: assignment?.readmeUrl,
        templateFiles: { ...assignment?.templateFiles, files },
        testCases,
        serviceStructure: assignment?.serviceStructure,
        defaultPorts: assignment?.defaultPorts
      });
      addLog('success', 'Draft & Test Cases saved.');
    } catch (err) {
      addLog('error', 'Save failed.');
    }
  };

  return (
    <div className="vscode-builder">
      {/* Top Main Navigation */}
      <nav className="builder-nav">
        <div className="left">
          <div className="logo-box">
            <Box className="text-primary-400" />
          </div>
          <span className="title">IDE Builder</span>
          <div className="breadcrumb">
            <ChevronRight size={14} /> <span>{assignment?.title || 'Loading...'}</span>
          </div>
        </div>

        <div className="center">
          <div className="search-bar">
            <Search size={14} />
            <input type="text" placeholder="Search in project..." />
          </div>
        </div>

        <div className="right flex items-center gap-2">
          <div className="repo-badge">
            <Github size={14} />
            <input value={githubRepo} onChange={e => setGithubRepo(e.target.value)} />
          </div>
          <button 
            className={`btn ${activeSidebar === 'testing' ? 'btn-active' : 'btn-secondary'}`} 
            onClick={() => setActiveSidebar(activeSidebar === 'testing' ? 'explorer' : 'testing')}
          >
            <CheckSquare size={16} /> {activeSidebar === 'testing' ? 'Hide Tests' : 'Configure Tests'}
          </button>
          <button className="btn btn-primary" onClick={saveDraft}><Save size={16} /> Draft</button>
          <button className="btn btn-primary" onClick={onPublish} disabled={isPublishing}>
            {isPublishing ? 'PUBLISHING...' : <><Send size={16} /> PUBLISH</>}
          </button>
        </div>
      </nav>

      <div className="main-content">
        <PanelGroup direction="horizontal">
          {/* Side Explorer Bar (Slim Icons) */}
          <Panel defaultSize={4} minSize={4} maxSize={4}>
            <div className="activity-bar">
              <div className="top">
                <div
                  className={`tool-icon ${activeSidebar === 'explorer' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('explorer')}
                  title="File Explorer"
                >
                  <Files size={22} />
                  <span className="icon-label text-[8px] uppercase mt-1 opacity-50">Files</span>
                </div>
                <div
                  className={`tool-icon ${activeSidebar === 'testing' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('testing')}
                  title="Test Cases"
                >
                  <CheckSquare size={22} />
                  <span className="icon-label text-[8px] uppercase mt-1 opacity-50">Tests</span>
                </div>
                <div
                  className={`tool-icon ${activeSidebar === 'submissions' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('submissions')}
                  title="Submissions & Analytics"
                >
                  <BarChart3 size={22} />
                  <span className="icon-label text-[8px] uppercase mt-1 opacity-50">Reports</span>
                </div>
                <div className="tool-icon flex flex-col items-center">
                  <Search size={22} />
                  <span className="icon-label text-[8px] uppercase mt-1 opacity-50">Search</span>
                </div>
              </div>
              <div className="bottom">
                <div 
                  className={`tool-icon ${activeSidebar === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('settings')}
                  title="Assignment Settings"
                >
                  <Settings size={22} />
                  <span className="icon-label text-[8px] uppercase mt-1 opacity-50">Config</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Managed Sidebar */}
          <Panel defaultSize={20} minSize={10} collapsible={true}>
            {activeSidebar === 'explorer' ? (
              <div className="explorer">
                <div className="header">
                  <span>EXPLORER: PROJECT</span>
                  <div className="controls">
                    <button onClick={createNewFile}><Plus size={14} /></button>
                    <button><FolderPlus size={14} /></button>
                  </div>
                </div>
                <div className="tree">
                  {Object.keys(files).sort().map(name => (
                    <div
                      key={name}
                      className={`tree-item ${activeFile === name ? 'active' : ''}`}
                      onClick={() => handleFileClick(name)}
                    >
                      <FileCode size={14} className="type-icon" />
                      <span className="name">{name}</span>
                      <div className="actions">
                        <Trash2 size={12} onClick={(e) => deleteFile(name, e)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeSidebar === 'testing' ? (
              <div className="explorer testing-sidebar">
                <div className="header">
                  <span>TEST CASES</span>
                  <div className="controls">
                    <button onClick={() => setTestCases([...testCases, { name: 'New Test', type: 'FILE_EXISTS', target: '', expected: '' }])}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="test-list px-4 py-2 space-y-4 overflow-y-auto">
                  {testCases.map((tc, idx) => (
                    <div key={idx} className="bg-[#1e1e27] p-3 rounded-lg border border-[#282833] space-y-3">
                      <div className="flex justify-between items-center">
                        <input
                          className="bg-transparent border-none text-[12px] font-bold text-gray-300 focus:outline-none w-full"
                          value={tc.name}
                          onChange={e => {
                            const next = [...testCases];
                            next[idx].name = e.target.value;
                            setTestCases(next);
                          }}
                        />
                        <Trash2
                          size={12}
                          className="text-red-500 cursor-pointer"
                          onClick={() => setTestCases(testCases.filter((_, i) => i !== idx))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-bold text-gray-500">Validation Type</label>
                        <select
                          className="w-full bg-[#111117] border border-[#282833] text-[11px] p-1 rounded"
                          value={tc.type}
                          onChange={e => {
                            const next = [...testCases];
                            next[idx].type = e.target.value;
                            setTestCases(next);
                          }}
                        >
                          <optgroup label="General">
                            <option value="FILE_EXISTS">File Exists</option>
                            <option value="TEXT_MATCH">Content Match</option>
                          </optgroup>
                          <optgroup label="Backend (Express/Mongoose)">
                            <option value="api_route_exists">API Route Exists</option>
                            <option value="mongoose_model_exists">Mongoose Model Exists</option>
                            <option value="mongoose_field_exists">Mongoose Field Check</option>
                            <option value="mongodb_connected">MongoDB Connection Check</option>
                          </optgroup>
                          <optgroup label="Frontend (React)">
                            <option value="react_component_exists">React Component Exists</option>
                            <option value="react_fetch_exists">API Fetch Used</option>
                            <option value="react_useState_used">useState Used</option>
                            <option value="vite_proxy_configured">Vite Proxy Set</option>
                          </optgroup>
                          <optgroup label="Integration">
                            <option value="fullstack_api_consumed">End-to-End API Check</option>
                          </optgroup>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-bold text-gray-500">Target (File/Selector)</label>
                        <input
                          className="w-full bg-[#111117] border border-[#282833] text-[11px] p-1 rounded"
                          placeholder="e.g. src/App.jsx"
                          value={tc.target}
                          onChange={e => {
                            const next = [...testCases];
                            next[idx].target = e.target.value;
                            setTestCases(next);
                          }}
                        />
                      </div>
                      {tc.type !== 'FILE_EXISTS' && (
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase font-bold text-gray-500">Expected Value</label>
                          <input
                            className="w-full bg-[#111117] border border-[#282833] text-[11px] p-1 rounded"
                            placeholder="Value to find..."
                            value={tc.expected}
                            onChange={e => {
                              const next = [...testCases];
                              next[idx].expected = e.target.value;
                              setTestCases(next);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {testCases.length === 0 && (
                    <div className="text-center py-8 opacity-40 text-[12px]">
                      No test cases defined.
                    </div>
                  )}
                </div>
              </div>
            ) : activeSidebar === 'settings' ? (
              <div className="explorer settings-sidebar">
                <div className="header">
                  <span>ASSIGNMENT SETTINGS</span>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto h-full">
                  <div className="form-group-builder">
                    <label>Title</label>
                    <input 
                      type="text" 
                      value={assignment?.title || ''} 
                      onChange={e => setAssignment({...assignment, title: e.target.value})}
                    />
                  </div>
                  <div className="form-group-builder">
                    <label>Description</label>
                    <textarea 
                      rows={4}
                      value={assignment?.description || ''} 
                      onChange={e => setAssignment({...assignment, description: e.target.value})}
                    />
                  </div>
                  <div className="form-group-builder">
                    <label>README URL (GitHub RAW)</label>
                    <input 
                      type="text" 
                      placeholder="https://raw.githubusercontent.com/..."
                      value={assignment?.readmeUrl || ''} 
                      onChange={e => setAssignment({...assignment, readmeUrl: e.target.value})}
                    />
                    <p className="help-text">If set, this README will be rendered instead of the description.</p>
                  </div>
                  
                  <div className="mt-6 border-t border-[#282833] pt-4">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3">Service Config</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="form-group-builder">
                        <label>Frontend Dir</label>
                        <input 
                          type="text" 
                          value={assignment?.serviceStructure?.frontendDir || ''} 
                          onChange={e => setAssignment({
                            ...assignment, 
                            serviceStructure: { ...assignment.serviceStructure, frontendDir: e.target.value }
                          })}
                        />
                      </div>
                      <div className="form-group-builder">
                        <label>Backend Dir</label>
                        <input 
                          type="text" 
                          value={assignment?.serviceStructure?.backendDir || ''} 
                          onChange={e => setAssignment({
                            ...assignment, 
                            serviceStructure: { ...assignment.serviceStructure, backendDir: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="explorer submissions-sidebar">
                <div className="header">
                  <span>ANALYTICS & SUBMISSIONS</span>
                </div>
                <div className="p-4 space-y-6 overflow-y-auto h-full">
                  <div className="analytics-card bg-[var(--color-bg-card)] p-4 rounded-xl border border-[#282833]">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                      <BarChart3 size={12} /> Performance Heatmap
                    </h4>
                    <div className="space-y-2">
                      {testCases.map((tc, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: '70%' }}></div>
                          </div>
                          <span className="text-[9px] text-gray-500 whitespace-nowrap">70% Pass</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="analytics-card bg-[var(--color-bg-card)] p-4 rounded-xl border border-[#282833]">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                      <AlertCircle size={12} className="text-red-400" /> Common Failures
                    </h4>
                    <div className="space-y-2 text-[11px] text-gray-300">
                      <div className="p-2 bg-red-500/5 rounded border border-red-500/10">
                        API Route: /api/users - 45% failure rate
                      </div>
                      <div className="p-2 bg-red-500/5 rounded border border-red-500/10">
                        Mongoose: User schema - 12% failure rate
                      </div>
                    </div>
                  </div>

                  <div className="submissions-list space-y-2">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                      <Layers size={12} /> Recent Submissions
                    </h4>
                    <div className="text-[11px] text-gray-500 italic py-4 text-center">
                      Select an assignment with active enrollments to view submission data.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <PanelResizeHandle className="divider-h" />

          {/* Editor & Bottom Panel */}
          <Panel defaultSize={76}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={70}>
                <div className="editor-zone">
                  <div className="tab-container">
                    {openFiles.map(f => (
                      <div
                        key={f}
                        className={`tab ${activeFile === f ? 'active' : ''}`}
                        onClick={() => handleFileClick(f)}
                      >
                        <FileCode size={12} className="tab-icon" />
                        <span>{f.split('/').pop()}</span>
                        <X size={12} className="close" onClick={(e) => closeFile(f, e)} />
                      </div>
                    ))}
                  </div>
                  <div className="editor-wrapper">
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      path={activeFile}
                      value={files[activeFile]}
                      onChange={(v) => setFiles({ ...files, [activeFile]: v })}
                      options={{
                        fontSize: 14,
                        minimap: { enabled: true },
                        fontFamily: 'JetBrains Mono, monospace',
                        scrollbar: { vertical: 'hidden' },
                        padding: { top: 20 }
                      }}
                    />
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="divider-v" />
              <Panel defaultSize={30} minSize={5} collapsible={true}>
                <div className="terminal-zone">
                  <div className="header">
                    <div 
                      className={`tab ${activeBottomTab === 'console' ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab('console')}
                    >
                      OUTPUT
                    </div>
                    <div 
                      className={`tab ${activeBottomTab === 'testing' ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab('testing')}
                    >
                      TEST CASES
                    </div>
                  </div>
                  <div className="console-output">
                    {activeBottomTab === 'console' ? (
                      logs.map((log, i) => (
                        <div key={i} className={`log-line ${log.type}`}>
                          <span className="time">{log.time}</span>
                          <span className="msg">{log.msg}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Project Validation Rules</h3>
                          <button 
                            className="btn btn-primary !py-1 !px-3 !text-[10px]"
                            onClick={() => setTestCases([...testCases, { name: 'New Test', type: 'FILE_EXISTS', target: '', expected: '' }])}
                          >
                            <Plus size={12} /> Add Requirement
                          </button>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {testCases.map((tc, idx) => (
                            <div key={idx} className="bg-[#111117] p-4 rounded-xl border border-[#282833] space-y-3 shadow-lg hover:border-indigo-500/30 transition-all">
                              <div className="flex justify-between items-center">
                                <input
                                  className="bg-transparent border-none text-[12px] font-bold text-white focus:outline-none w-full"
                                  value={tc.name}
                                  onChange={e => {
                                    const next = [...testCases];
                                    next[idx].name = e.target.value;
                                    setTestCases(next);
                                  }}
                                />
                                <Trash2
                                  size={12}
                                  className="text-red-500 cursor-pointer hover:scale-110 transition-transform"
                                  onClick={() => setTestCases(testCases.filter((_, i) => i !== idx))}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[8px] uppercase font-bold text-gray-500">Validator</label>
                                  <select
                                    className="w-full bg-[#0a0a0f] border border-[#282833] text-[10px] p-1.5 rounded text-gray-300"
                                    value={tc.type}
                                    onChange={e => {
                                      const next = [...testCases];
                                      next[idx].type = e.target.value;
                                      setTestCases(next);
                                    }}
                                  >
                                    <optgroup label="General">
                                      <option value="FILE_EXISTS">File Exists</option>
                                      <option value="TEXT_MATCH">Content Match</option>
                                    </optgroup>
                                    <optgroup label="Backend">
                                      <option value="api_route_exists">API Route</option>
                                      <option value="mongoose_model_exists">Mongoose Model</option>
                                      <option value="mongodb_connected">DB Check</option>
                                    </optgroup>
                                    <optgroup label="Frontend">
                                      <option value="react_component_exists">React Component</option>
                                      <option value="react_useState_used">State Hook</option>
                                    </optgroup>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] uppercase font-bold text-gray-500">Path / Target</label>
                                  <input
                                    className="w-full bg-[#0a0a0f] border border-[#282833] text-[10px] p-1.5 rounded text-gray-300"
                                    placeholder="src/App.jsx"
                                    value={tc.target}
                                    onChange={e => {
                                      const next = [...testCases];
                                      next[idx].target = e.target.value;
                                      setTestCases(next);
                                    }}
                                  />
                                </div>
                              </div>
                              {tc.type !== 'FILE_EXISTS' && (
                                <div className="space-y-1">
                                  <label className="text-[8px] uppercase font-bold text-gray-500">Expected (Exact/Regex)</label>
                                  <input
                                    className="w-full bg-[#0a0a0f] border border-[#282833] text-[10px] p-1.5 rounded text-gray-300"
                                    placeholder="Enter value..."
                                    value={tc.expected}
                                    onChange={e => {
                                      const next = [...testCases];
                                      next[idx].expected = e.target.value;
                                      setTestCases(next);
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                          {testCases.length === 0 && (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-[#282833] rounded-2xl opacity-40">
                               <Plus className="mx-auto mb-2 opacity-50" size={24} />
                               <p className="text-[12px]">Add your first validation requirement to get started.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      <footer className="builder-status-bar">
        <div className="left">
          <div className="item git"><Layers size={12} /> main*</div>
          <div className="item sync"><Globe size={12} /> Ready for Deployment</div>
        </div>
        <div className="right">
          <div className="item">Space: 2</div>
          <div className="item">UTF-8</div>
          <div className="item">JavaScript JSX</div>
          <div className="item bell"><CheckCircle2 size={12} className="text-emerald-400" /></div>
        </div>
      </footer>

      {/* Initialization Modal */}
      {isNew && (
        <div className="init-overlay">
          <div className="init-modal">
            <h2>Initialize New Assignment</h2>
            <p>Configure your workspace to begin building.</p>

            <div className="form-group">
              <label>Assignment Title</label>
              <input
                type="text" placeholder="e.g. React Counter App"
                value={initForm.title} onChange={e => setInitForm({ ...initForm, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Project Type</label>
              <select value={initForm.type} onChange={e => setInitForm({ ...initForm, type: e.target.value })}>
                <option value="HTML_CSS_JS">Static (HTML/CSS/JS)</option>
                <option value="REACT">React Project</option>
                <option value="NODE">Node.js Project</option>
                <option value="FULLSTACK">Fullstack App</option>
                <option value="FULLSTACK_MERN">MERN Stack Project</option>
              </select>
            </div>

            <div className="form-group">
              <label>Readme URL (GitHub RAW)</label>
              <input
                type="text" placeholder="https://raw.githubusercontent.com/.../README.md"
                value={initForm.readmeUrl} onChange={e => setInitForm({ ...initForm, readmeUrl: e.target.value })}
              />
              <p className="text-[10px] text-gray-500 mt-1">Leave empty to use internal description.</p>
            </div>

            {initForm.type === 'FULLSTACK_MERN' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="mern-config-fields bg-[#111117] p-4 rounded-xl border border-[#282833] mb-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group mb-0">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Frontend Dir</label>
                    <input
                      type="text" value={initForm.serviceStructure.frontendDir}
                      onChange={e => setInitForm({ ...initForm, serviceStructure: { ...initForm.serviceStructure, frontendDir: e.target.value } })}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Backend Dir</label>
                    <input
                      type="text" value={initForm.serviceStructure.backendDir}
                      onChange={e => setInitForm({ ...initForm, serviceStructure: { ...initForm.serviceStructure, backendDir: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group mb-0">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Frontend Port</label>
                    <input
                      type="number" value={initForm.defaultPorts.frontend}
                      onChange={e => setInitForm({ ...initForm, defaultPorts: { ...initForm.defaultPorts, frontend: parseInt(e.target.value) } })}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Backend Port</label>
                    <input
                      type="number" value={initForm.defaultPorts.backend}
                      onChange={e => setInitForm({ ...initForm, defaultPorts: { ...initForm.defaultPorts, backend: parseInt(e.target.value) } })}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="What will students learn?"
                value={initForm.description} onChange={e => setInitForm({ ...initForm, description: e.target.value })}
              />
            </div>

            <button className="btn-init" onClick={handleInitialize} disabled={isInitializing}>
              {isInitializing ? 'INITIALIZING...' : 'START BUILDING'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}








