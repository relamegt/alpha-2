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
  AlertCircle, X, CheckSquare, BarChart3, Layout, Zap, Info
} from 'lucide-react';
import './MultiFileAssignmentBuilder.css';
import CustomDropdown from '../shared/CustomDropdown';
import toast from 'react-hot-toast';

const STATIC_FILES = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Static Assignment</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="app">
        <h1>AlphaLearn Static Project</h1>
        <p>Start building your amazing project here!</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
  'style.css': `body {
    margin: 0;
    font-family: 'Inter', sans-serif;
    background: #f4f7ff;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}

.app {
    background: white;
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    text-align: center;
}`,
  'script.js': `console.log("AlphaLearn: Static workspace loaded successfully!");`
};

const INITIAL_FILES = {
  'README.md': '# New Project\n\nEdit this file to provide instructions for the assignment.'
};

const MERN_FILES = {
  'client/src/App.jsx': `export default function App() {\n  return (\n    <div className="p-8 bg-[#000000] text-white min-h-screen font-sans">\n      <h1 className="text-4xl font-black text-indigo-400 mb-4 tracking-tighter">MERN Frontend</h1>\n      <p className="text-gray-400">Communicating with backend at /api...</p>\n    </div>\n  );\n}`,
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
  const [activeSidebar, setActiveSidebar] = useState('explorer'); // 'explorer' | 'testing' | 'submissions' | 'settings'
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
      setAssignment({ title: 'Untitled Assignment' });
    }
  }, [id, isNew]);

  const handleInitialize = async () => {
    if (!initForm.title) return toast.error('Title is required');
    setIsInitializing(true);
    const isMern = initForm.type === 'FULLSTACK_MERN';
    const isStatic = initForm.type === 'HTML_CSS_JS';
    const selectedFiles = isMern ? MERN_FILES : (isStatic ? STATIC_FILES : INITIAL_FILES);
    try {
      const { data } = await apiClient.post('/assignments', {
        ...initForm,
        templateFiles: { files: selectedFiles },
        testCases: []
      });
      navigate(`/assignments/build/${data.id}`, { replace: true });
      setAssignment(data);
      if (isMern) {
        setFiles(MERN_FILES);
        setActiveFile('client/src/App.jsx');
        setOpenFiles(['client/src/App.jsx', 'server/index.js', 'package.json']);
      }
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setGithubRepo(slug);
      toast.success('Assignment initialized');
      addLog('success', 'Assignment created and initialized.');
    } catch (err) {
      toast.error('Initialization failed');
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
    if (!githubRepo) return toast.error('Please enter a GitHub repository name.');
    setIsPublishing(true);
    addLog('info', 'Starting GitHub publication flow...');

    try {
      addLog('info', 'Packaging project workspace...');
      const { data } = await apiClient.post(`/assignments/${id}/publish-github`, {
        files,
        repoName: githubRepo
      });

      addLog('success', `Push successful! Live at: ${data.url}`);
      toast.success('Successfully published to GitHub!');
      setTimeout(() => {
        navigate('/assignments');
      }, 1000);
    } catch (err) {
      addLog('error', 'Publication failed: ' + (err.response?.data?.error || err.message));
      toast.error('Publication failed');
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
      toast.success('Progress saved');
    } catch (err) {
      addLog('error', 'Save failed.');
      toast.error('Save failed');
    }
  };

  return (
    <div className="vscode-builder">
      {/* Top Main Navigation */}
      <nav className="builder-nav">
        <div className="left">
          <div className="logo-box">
            <Layout size={18} />
          </div>
          <span className="title">IDE Builder</span>
          <div className="breadcrumb">
            <ChevronRight size={14} className="opacity-40" /> 
            <span>{assignment?.title || 'Loading...'}</span>
          </div>
        </div>

        <div className="center">
          <div className="search-bar">
            <Search size={16} className="text-gray-400" />
            <input type="text" placeholder="Search project files..." />
          </div>
        </div>

        <div className="right">
          <div className="repo-badge">
            <Github size={16} className="text-gray-400" />
            <input value={githubRepo} onChange={e => setGithubRepo(e.target.value)} placeholder="github-repo-name" />
          </div>
          <button className="btn btn-secondary" onClick={saveDraft}>
            <Save size={16} /> 
            <span>Save Draft</span>
          </button>
          <button className="btn btn-primary" onClick={onPublish} disabled={isPublishing}>
            {isPublishing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Publishing...</span>
              </div>
            ) : (
              <><Send size={16} /> <span>Deploy to GitHub</span></>
            )}
          </button>
        </div>
      </nav>

      <div className="main-content">
        <PanelGroup direction="horizontal">
          {/* Side Explorer Bar (Slim Icons) */}
          <Panel defaultSize={4.5} minSize={4.5} maxSize={4.5}>
            <div className="activity-bar">
              <div className="top">
                <div
                  className={`tool-icon ${activeSidebar === 'explorer' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('explorer')}
                  title="File Explorer"
                >
                  <Files size={22} />
                  <span className="icon-label">Files</span>
                </div>
                <div
                  className={`tool-icon ${activeSidebar === 'testing' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('testing')}
                  title="Test Cases"
                >
                  <CheckSquare size={22} />
                  <span className="icon-label">Tests</span>
                </div>
                <div
                  className={`tool-icon ${activeSidebar === 'submissions' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('submissions')}
                  title="Submissions & Analytics"
                >
                  <BarChart3 size={22} />
                  <span className="icon-label">Reports</span>
                </div>
              </div>
              <div className="bottom">
                <div 
                  className={`tool-icon ${activeSidebar === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('settings')}
                  title="Assignment Settings"
                >
                  <Settings size={22} />
                  <span className="icon-label">Config</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Managed Sidebar */}
          <Panel defaultSize={20} minSize={15} collapsible={true}>
            {activeSidebar === 'explorer' ? (
              <div className="explorer">
                <div className="header">
                  <span>Project Explorer</span>
                  <div className="controls">
                    <button onClick={createNewFile} title="New File"><Plus size={16} /></button>
                    <button title="New Folder"><FolderPlus size={16} /></button>
                  </div>
                </div>
                <div className="tree">
                  {Object.keys(files).sort().map(name => (
                    <div
                      key={name}
                      className={`tree-item ${activeFile === name ? 'active' : ''}`}
                      onClick={() => handleFileClick(name)}
                    >
                      <FileCode size={16} className="type-icon text-indigo-400" />
                      <span className="name">{name}</span>
                      <div className="actions">
                        <Trash2 size={14} onClick={(e) => deleteFile(name, e)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeSidebar === 'testing' ? (
              <div className="explorer testing-sidebar">
                <div className="header">
                  <span>Validation Rules</span>
                  <div className="controls">
                    <button onClick={() => setTestCases([...testCases, { name: 'New Test', type: 'FILE_EXISTS', target: '', expected: '' }])}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="test-list overflow-y-auto">
                  {testCases.map((tc, idx) => (
                    <div key={idx} className="test-card space-y-4">
                      <div className="flex justify-between items-center">
                        <input
                          className="bg-transparent border-none text-[13px] font-bold text-white focus:outline-none w-full"
                          value={tc.name}
                          onChange={e => {
                            const next = [...testCases];
                            next[idx].name = e.target.value;
                            setTestCases(next);
                          }}
                        />
                        <button 
                          onClick={() => setTestCases(testCases.filter((_, i) => i !== idx))}
                          className="text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black text-indigo-400">Validator Type</label>
                          <CustomDropdown
                            options={[
                              { value: 'FILE_EXISTS', label: 'File Exists' },
                              { value: 'TEXT_MATCH', label: 'Content Match' },
                              { value: 'api_route_exists', label: 'API Route' },
                              { value: 'mongoose_model_exists', label: 'Mongoose Model' },
                              { value: 'mongodb_connected', label: 'DB Connection' },
                              { value: 'react_component_exists', label: 'React Component' },
                              { value: 'react_useState_used', label: 'useState Check' }
                            ]}
                            value={tc.type}
                            onChange={val => {
                              const next = [...testCases];
                              next[idx].type = val;
                              setTestCases(next);
                            }}
                            size="small"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black text-indigo-400">Path / Target</label>
                          <input
                            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[12px] p-2 rounded-lg"
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
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-black text-indigo-400">Expected Value</label>
                            <input
                              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[12px] p-2 rounded-lg"
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
                    </div>
                  ))}
                  {testCases.length === 0 && (
                    <div className="text-center py-12 opacity-40">
                      <Zap className="mx-auto mb-4 opacity-20" size={32} />
                      <p className="text-[12px] font-medium px-4">No validation rules defined yet.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : activeSidebar === 'settings' ? (
              <div className="explorer settings-sidebar">
                <div className="header">
                  <span>IDE Configuration</span>
                </div>
                <div className="p-5 space-y-6 overflow-y-auto">
                  <div className="form-group-builder">
                    <label>Assignment Title</label>
                    <input 
                      type="text" 
                      value={assignment?.title || ''} 
                      onChange={e => setAssignment({...assignment, title: e.target.value})}
                    />
                  </div>
                  <div className="form-group-builder">
                    <label>Project Overview</label>
                    <textarea 
                      rows={5}
                      value={assignment?.description || ''} 
                      onChange={e => setAssignment({...assignment, description: e.target.value})}
                    />
                  </div>
                  <div className="form-group-builder">
                    <label>README URL (Raw)</label>
                    <input 
                      type="text" 
                      placeholder="https://raw.githubusercontent.com/..."
                      value={assignment?.readmeUrl || ''} 
                      onChange={e => setAssignment({...assignment, readmeUrl: e.target.value})}
                    />
                    <p className="help-text">Direct raw link to external README instructions.</p>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-[var(--color-border-light)]">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Settings size={12} /> Service Architecture
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="form-group-builder mb-0">
                        <label>Frontend Root</label>
                        <input 
                          type="text" 
                          value={assignment?.serviceStructure?.frontendDir || ''} 
                          onChange={e => setAssignment({
                            ...assignment, 
                            serviceStructure: { ...assignment.serviceStructure, frontendDir: e.target.value }
                          })}
                        />
                      </div>
                      <div className="form-group-builder mb-0">
                        <label>Backend Root</label>
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
                  <span>System Analytics</span>
                </div>
                <div className="p-5 space-y-6 overflow-y-auto">
                  <div className="bg-[var(--color-bg-primary)] p-5 rounded-2xl border border-[var(--color-border)]">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center gap-2">
                      <BarChart3 size={14} className="text-indigo-400" /> Requirement Pass Rate
                    </h4>
                    <div className="space-y-4">
                      {testCases.slice(0, 3).map((tc, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] font-bold">
                             <span className="text-gray-400 truncate max-w-[100px]">{tc.name}</span>
                             <span className="text-emerald-400">82%</span>
                          </div>
                          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: '82%' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[var(--color-bg-primary)] p-5 rounded-2xl border border-[var(--color-border)]">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-400" /> Critical Bottlenecks
                    </h4>
                    <div className="space-y-2 text-[11px]">
                      <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 text-rose-200">
                        Database connection logic failing for 34% of students.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-2 px-1">
                      <Layers size={14} /> Student Submissions
                    </h4>
                    <div className="text-[12px] text-gray-500 italic py-8 text-center bg-[var(--color-bg-primary)] rounded-2xl border border-dashed border-[var(--color-border)]">
                      Sync with batch to view live submissions.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <PanelResizeHandle className="divider-h" />

          {/* Editor & Bottom Panel */}
          <Panel defaultSize={75.5}>
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
                        <FileCode size={14} className={activeFile === f ? 'text-indigo-400' : 'text-gray-500'} />
                        <span>{f.split('/').pop()}</span>
                        <X size={14} className="close" onClick={(e) => closeFile(f, e)} />
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
                        scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
                        padding: { top: 24, bottom: 24 },
                        lineNumbersMinChars: 3,
                        cursorBlinking: 'smooth',
                        smoothScrolling: true,
                        renderLineHighlight: 'all'
                      }}
                    />
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="divider-v" />
              <Panel defaultSize={30} minSize={10} collapsible={true}>
                <div className="terminal-zone">
                  <div className="header">
                    <div 
                      className={`tab ${activeBottomTab === 'console' ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab('console')}
                    >
                      Output Terminal
                    </div>
                    <div 
                      className={`tab ${activeBottomTab === 'testing' ? 'active' : ''}`}
                      onClick={() => setActiveBottomTab('testing')}
                    >
                      Validation Rules
                    </div>
                  </div>
                  <div className="console-output custom-thin-scrollbar">
                    {activeBottomTab === 'console' ? (
                      logs.map((log, i) => (
                        <div key={i} className={`log-line ${log.type}`}>
                          <span className="time">[{log.time}]</span>
                          <span className="msg">{log.msg}</span>
                        </div>
                      ))
                    ) : (
                      <div className="validation-grid custom-thin-scrollbar">
                        <div className="col-span-full flex justify-between items-center mb-2 px-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-[12px] font-black text-indigo-400 uppercase tracking-widest">Project Validation Rules</h3>
                            <div className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9px] font-bold">Admin Only</div>
                          </div>
                          <button 
                            className="btn btn-primary !py-1.5 !px-4 !text-[11px]"
                            onClick={() => setTestCases([...testCases, { name: 'New Requirement', type: 'FILE_EXISTS', target: '', expected: '' }])}
                          >
                            <Plus size={14} /> Add Requirement
                          </button>
                        </div>
                        {testCases.map((tc, idx) => (
                          <div key={idx} className="validation-card shadow-lg hover:border-indigo-500/40">
                              <div className="flex items-center gap-3">
                                <input
                                  className="bg-transparent border-none text-[13px] font-bold text-white focus:outline-none w-full"
                                  value={tc.name}
                                  onChange={e => {
                                    const next = [...testCases];
                                    next[idx].name = e.target.value;
                                    setTestCases(next);
                                  }}
                                />
                                <div className="flex items-center gap-2">
                                  <button 
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${tc.isHidden ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}
                                    onClick={() => {
                                      const next = [...testCases];
                                      next[idx].isHidden = !next[idx].isHidden;
                                      setTestCases(next);
                                    }}
                                  >
                                    {tc.isHidden ? 'HIDDEN' : 'PUBLIC'}
                                  </button>
                                  <button onClick={() => setTestCases(testCases.filter((_, i) => i !== idx))}>
                                    <Trash2 size={14} className="text-gray-500 hover:text-rose-500 transition-colors" />
                                  </button>
                                </div>
                              </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-black text-gray-500">Validator</label>
                                <CustomDropdown
                                  options={
                                    projectType === 'HTML_CSS_JS' 
                                      ? [
                                          { value: 'element_exists', label: 'DOM: Element Exists' },
                                          { value: 'element_text', label: 'DOM: Text Content' },
                                          { value: 'element_count', label: 'DOM: Element Count' },
                                          { value: 'css_property', label: 'CSS: Style Match' },
                                          { value: 'js_variable', label: 'JS: Global Variable' },
                                          { value: 'js_function_exists', label: 'JS: Function Check' }
                                        ]
                                      : [
                                          { value: 'FILE_EXISTS', label: 'File Exists' },
                                          { value: 'TEXT_MATCH', label: 'Content Match' },
                                          { value: 'api_route_exists', label: 'API Endpoint' },
                                          { value: 'mongoose_model_exists', label: 'MDB Model' },
                                          { value: 'react_component_exists', label: 'React Component' }
                                        ]
                                  }
                                  value={tc.type}
                                  onChange={val => {
                                    const next = [...testCases];
                                    next[idx].type = val;
                                    setTestCases(next);
                                  }}
                                  size="small"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-black text-gray-500">
                                  {projectType === 'HTML_CSS_JS' ? 'Selector / Target' : 'Target Path'}
                                </label>
                                <input
                                  className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[11px] p-2 rounded-xl text-gray-200"
                                  placeholder={projectType === 'HTML_CSS_JS' ? 'e.g. .container h1' : 'e.g. src/App.jsx'}
                                  value={tc.target}
                                  onChange={e => {
                                    const next = [...testCases];
                                    next[idx].target = e.target.value;
                                    setTestCases(next);
                                  }}
                                />
                              </div>
                            </div>
                            {tc.type !== 'FILE_EXISTS' && tc.type !== 'element_exists' && (
                              <div className="space-y-1.5">
                                <label className="text-[9px] uppercase font-black text-gray-500">
                                  {projectType === 'HTML_CSS_JS' ? 'Expected Value' : 'Expected (Exact/Regex)'}
                                </label>
                                <input
                                  className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[11px] p-2 rounded-xl text-gray-200"
                                  placeholder={projectType === 'HTML_CSS_JS' ? 'e.g. #ff0000' : 'Value to find...'}
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
                          <div className="col-span-full py-16 text-center border-2 border-dashed border-[var(--color-border)] rounded-3xl opacity-30">
                             <Plus className="mx-auto mb-3 text-gray-500" size={32} />
                             <p className="text-[13px] font-bold">Define validation logic to automate grading.</p>
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
      </div>

      <footer className="builder-status-bar">
        <div className="left">
          <div className="item"><Layers size={13} /> <span>main*</span></div>
          <div className="item"><Globe size={13} /> <span>Live Preview Ready</span></div>
          <div className="item"><Info size={13} /> <span>{Object.keys(files).length} Files Loaded</span></div>
        </div>
        <div className="right">
          <div className="item">Spaces: 2</div>
          <div className="item">UTF-8</div>
          <div className="item">JS (Babel)</div>
          <div className="item text-emerald-400"><CheckCircle2 size={13} /> <span>Connected</span></div>
        </div>
      </footer>

      {/* Initialization Modal */}
      <AnimatePresence>
        {isNew && (
          <div className="init-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="init-modal"
            >
              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
                    <Box size={28} />
                 </div>
                 <div>
                    <h2>Initialize Project</h2>
                    <p className="mb-0">Configure your assignment workspace environment.</p>
                 </div>
              </div>

              <div className="space-y-6">
                <div className="form-group">
                  <label>Project Title</label>
                  <input
                    type="text" placeholder="e.g. MERN User Auth System"
                    value={initForm.title} onChange={e => setInitForm({ ...initForm, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Environment Template</label>
                  <CustomDropdown
                    options={[
                      { value: 'HTML_CSS_JS', label: 'Static (HTML/CSS/JS)' },
                      { value: 'REACT', label: 'React.js Modern' },
                      { value: 'NODE', label: 'Node.js Backend' },
                      { value: 'FULLSTACK', label: 'Fullstack Bundle' },
                      { value: 'FULLSTACK_MERN', label: 'MERN Stack (Vite + Express)' }
                    ]}
                    value={initForm.type}
                    onChange={val => setInitForm({ ...initForm, type: val })}
                  />
                </div>

                <div className="form-group">
                  <label>External Readme (Optional)</label>
                  <input
                    type="text" placeholder="https://raw.githubusercontent.com/.../README.md"
                    value={initForm.readmeUrl} onChange={e => setInitForm({ ...initForm, readmeUrl: e.target.value })}
                  />
                </div>

                {initForm.type === 'FULLSTACK_MERN' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="bg-[var(--color-bg-primary)] p-5 rounded-2xl border border-[var(--color-border)] space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group mb-0">
                        <label className="text-[9px] text-gray-500 uppercase font-black">Client Path</label>
                        <input
                          type="text" value={initForm.serviceStructure.frontendDir}
                          onChange={e => setInitForm({ ...initForm, serviceStructure: { ...initForm.serviceStructure, frontendDir: e.target.value } })}
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label className="text-[9px] text-gray-500 uppercase font-black">Server Path</label>
                        <input
                          type="text" value={initForm.serviceStructure.backendDir}
                          onChange={e => setInitForm({ ...initForm, serviceStructure: { ...initForm.serviceStructure, backendDir: e.target.value } })}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="form-group">
                  <label>Learning Objectives</label>
                  <textarea
                    placeholder="Describe what the student needs to build..."
                    value={initForm.description} onChange={e => setInitForm({ ...initForm, description: e.target.value })}
                  />
                </div>

                <button className="btn-init" onClick={handleInitialize} disabled={isInitializing}>
                  {isInitializing ? (
                    <div className="flex items-center justify-center gap-3">
                       <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                       <span>Setting up Environment...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                       <Zap size={20} />
                       <span>Initialize Workspace</span>
                    </div>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
