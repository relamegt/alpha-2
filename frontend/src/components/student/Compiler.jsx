import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ArrowLeft, RotateCcw, Settings, Copy, Download,
  FileCode2, FilePlus2, Sparkles, Zap,
  TerminalSquare, Share2, X, ChevronDown, Monitor, Smartphone,
  Layers, Maximize2, Minimize2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import CustomDropdown from '../shared/CustomDropdown';

const JUDGE0_API = import.meta.env.VITE_JUDGE0_API_URL || 'http://localhost:2358';

const BASE_LANGS = [
  { id: 'cpp', judge0Id: 54, name: 'C++', version: '10.2.0', ext: 'cpp', main: 'main.cpp',
    template: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    cout << "Hello AlphaLearn!\\n";\n    return 0;\n}` },
  { id: 'c', judge0Id: 50, name: 'C', version: '10.2.0', ext: 'c', main: 'main.c',
    template: `#include <stdio.h>\n\nint main() {\n    printf("Hello AlphaLearn!\\n");\n    return 0;\n}` },
  { id: 'java', judge0Id: 62, name: 'Java', version: '15.0.2', ext: 'java', main: 'Main.java',
    template: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        System.out.println("Hello AlphaLearn!");\n    }\n}` },
  { id: 'python', judge0Id: 71, name: 'Python', version: '3.10.0', ext: 'py', main: 'main.py',
    template: `print("Hello AlphaLearn!")` },
  { id: 'javascript', judge0Id: 63, name: 'JavaScript', version: '18.15.0', ext: 'js', main: 'main.js',
    template: `console.log("Hello AlphaLearn!");` },
  { id: 'csharp', judge0Id: 51, name: 'C#', version: '6.12.0', ext: 'cs', main: 'main.cs',
    template: `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello AlphaLearn!");\n    }\n}` },
];

const EDITOR_THEMES = [
  { id: 'antigravity-dark', name: 'Antigravity Dark' },
  { id: 'vs-dark', name: 'VS Dark' },
  { id: 'light', name: 'Light' },
];

const CODE_FONTS = [
  { id: 'jetbrains', label: 'JetBrains Mono', css: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { id: 'fira', label: 'Fira Code', css: '"Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { id: 'cascadia', label: 'Cascadia Code', css: '"Cascadia Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { id: 'source', label: 'Source Code Pro', css: '"Source Code Pro", ui-monospace, monospace' },
  { id: 'roboto', label: 'Roboto Mono', css: '"Roboto Mono", ui-monospace, monospace' },
];

const STORAGE_KEYS = {
  editorTheme: 'alphalearn.compiler.editorTheme',
  fontSize: 'alphalearn.compiler.fontSize',
  fontFamily: 'alphalearn.compiler.fontFamily',
  ligatures: 'alphalearn.compiler.ligatures',
  tabs: 'alphalearn.compiler.tabs',
  activeTab: 'alphalearn.compiler.activeTab',
  stdin: 'alphalearn.compiler.stdin',
  args: 'alphalearn.compiler.args',
  splitPos: 'alphalearn.compiler.splitPos',
};

const defaultLang = BASE_LANGS[0];

const Compiler = () => {
  const navigate = useNavigate();
  const monaco = useMonaco();
  const editorRef = useRef(null);
  const splitContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const isVerticalDraggingRef = useRef(false);
  const { isDark } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [isVerticalDragging, setIsVerticalDragging] = useState(false);
  const ioContainerRef = useRef(null);

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1024);
  const [mobileView, setMobileView] = useState('editor'); // 'editor', 'io', 'output'
  const [splitPosition, setSplitPosition] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.splitPos);
    return saved ? Number(saved) : 65;
  });
  const [ioSplitPosition, setIoSplitPosition] = useState(60);

  // Editor State
  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.tabs);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [{ id: 'main', name: defaultLang.main, content: defaultLang.template, dirty: false, languageId: defaultLang.id }];
      }
    }
    return [{ id: 'main', name: defaultLang.main, content: defaultLang.template, dirty: false, languageId: defaultLang.id }];
  });
  const [activeTabId, setActiveTabId] = useState(() => localStorage.getItem(STORAGE_KEYS.activeTab) || 'main');

  // Execution State
  const [stdin, setStdin] = useState(() => localStorage.getItem(STORAGE_KEYS.stdin) || '');
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [args, setArgs] = useState(() => localStorage.getItem(STORAGE_KEYS.args) || '');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [exitCode, setExitCode] = useState(null);

  // Settings State
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem(STORAGE_KEYS.fontSize)) || 14);
  const [fontFamilyId, setFontFamilyId] = useState(() => localStorage.getItem(STORAGE_KEYS.fontFamily) || 'jetbrains');
  const [ligatures, setLigatures] = useState(() => localStorage.getItem(STORAGE_KEYS.ligatures) === 'true');
  const [showSettings, setShowSettings] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tabs, JSON.stringify(tabs));
  }, [tabs]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.activeTab, activeTabId);
  }, [activeTabId]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.stdin, stdin);
  }, [stdin]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.args, args);
  }, [args]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.fontSize, String(fontSize));
  }, [fontSize]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.fontFamily, fontFamilyId);
  }, [fontFamilyId]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ligatures, String(ligatures));
  }, [ligatures]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.splitPos, String(splitPosition));
  }, [splitPosition]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      setIsSmallScreen(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId) || tabs[0], [tabs, activeTabId]);
  const codeFont = useMemo(() => CODE_FONTS.find(f => f.id === fontFamilyId)?.css, [fontFamilyId]);
  const currentTheme = isDark ? 'antigravity-dark' : 'light';

  const getMonacoLanguage = (langId) => {
    const mapping = {
      'cpp': 'cpp', 'c': 'c', 'java': 'java', 'python': 'python', 'javascript': 'javascript', 'csharp': 'csharp'
    };
    return mapping[langId] || 'plaintext';
  };

  const handleRun = async () => {
    if (!activeTab || isRunning) return;
    setIsRunning(true);
    setStdout('');
    setStderr('');
    setExecutionTime(null);
    setExitCode(null);

    const tabLang = BASE_LANGS.find(l => l.id === activeTab.languageId) || defaultLang;
    const start = performance.now();
    try {
      const encodeBase64 = (str) => btoa(unescape(encodeURIComponent(str || '')));
      const decodeBase64 = (str) => {
        if (!str) return '';
        try { return decodeURIComponent(escape(atob(str))); } catch (e) { return atob(str); }
      };

      const payload = {
        source_code: encodeBase64(activeTab.content),
        language_id: tabLang.judge0Id,
        stdin: encodeBase64(stdin),
        command_line_arguments: args.trim()
      };

      const res = await fetch(`${JUDGE0_API}/submissions?base64_encoded=true&wait=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Execution Service Error: ${res.status}`);

      const result = await res.json();
      const end = performance.now();
      setExecutionTime(Math.round(end - start));

      setStdout(decodeBase64(result.stdout) || '');
      setStderr([decodeBase64(result.stderr) || '', decodeBase64(result.compile_output) || ''].filter(Boolean).join('\n'));
      setExitCode(result.status?.id === 3 ? 0 : result.status?.id);
      
      if (isSmallScreen) setMobileView('output');
    } catch (e) {
      setStderr(`Error: ${e.message}`);
      if (isSmallScreen) setMobileView('output');
    } finally {
      setIsRunning(false);
    }
  };

  const setTabContent = (id, content) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, content, dirty: true } : t));
  };

  const setTabLanguage = (id, languageId) => {
    const lang = BASE_LANGS.find(l => l.id === languageId);
    if (!lang) return;
    setTabs(prev => prev.map(t => {
      if (t.id === id) {
        const parts = t.name.split('.');
        const newName = parts.length > 1 ? `${parts.slice(0, -1).join('.')}.${lang.ext}` : `${t.name}.${lang.ext}`;
        const shouldUpdateTemplate = !t.dirty || t.content.trim() === '';
        return { ...t, languageId, name: newName, content: shouldUpdateTemplate ? lang.template : t.content, dirty: false };
      }
      return t;
    }));
  };

  const addNewTab = () => {
    const id = `tab-${Date.now()}`;
    const name = `file${tabs.length + 1}.${defaultLang.ext}`;
    setTabs(prev => [...prev, { id, name, content: defaultLang.template, dirty: false, languageId: defaultLang.id }]);
    setActiveTabId(id);
  };

  const closeTab = (id, e) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const idx = tabs.findIndex(t => t.id === id);
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[Math.max(0, idx - 1)].id);
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: 'AlphaLearn Code',
        text: `Check out my code:\n\n${activeTab.content}`,
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(activeTab.content);
        toast.success('Code copied to clipboard!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([activeTab.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTab.content);
    toast.success('Code copied!');
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, stdin, args]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleVerticalMouseDown = (e) => {
    e.preventDefault();
    setIsVerticalDragging(true);
    isVerticalDraggingRef.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e) => {
    if (isDraggingRef.current && splitContainerRef.current) {
      requestAnimationFrame(() => {
        if (!isDraggingRef.current || !splitContainerRef.current) return;
        const rect = splitContainerRef.current.getBoundingClientRect();
        const pos = ((e.clientX - rect.left) / rect.width) * 100;
        if (pos > 15 && pos < 85) setSplitPosition(pos);
      });
    }

    if (isVerticalDraggingRef.current && ioContainerRef.current) {
      requestAnimationFrame(() => {
        if (!isVerticalDraggingRef.current || !ioContainerRef.current) return;
        const rect = ioContainerRef.current.getBoundingClientRect();
        const pos = ((e.clientY - rect.top) / rect.height) * 100;
        if (pos > 20 && pos < 80) setIoSplitPosition(pos);
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsVerticalDragging(false);
    isDraggingRef.current = false;
    isVerticalDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <>
      <div className="h-full w-full bg-[var(--color-bg-primary)] dark:bg-[#000000] overflow-y-auto custom-scrollbar flex flex-col">
      <div className="flex-1 flex flex-col p-4 lg:p-6 pb-12">
        <div className="flex-1 flex flex-col bg-white dark:bg-[var(--color-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden relative select-none">
        {/* Mobile Sub-Navigation */}
        {isSmallScreen && (
          <div className="h-12 flex-shrink-0 border-b border-gray-100 dark:border-gray-800 bg-[var(--color-bg-primary)] dark:bg-[var(--color-bg-card)] flex px-1">
            {[
              { id: 'editor', label: 'Editor', icon: FileCode2 },
              { id: 'io', label: 'Input', icon: TerminalSquare },
              { id: 'output', label: 'Output', icon: Sparkles }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setMobileView(view.id)}
                className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 m-1 rounded-lg ${
                  mobileView === view.id 
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10' 
                  : 'border-transparent text-gray-400 hover:text-gray-500'
                }`}
              >
                <view.icon className="w-3.5 h-3.5" />
                {view.label}
              </button>
            ))}
          </div>
        )}

        <div ref={splitContainerRef} className="flex-1 flex overflow-hidden">
          {/* Left: Editor Area */}
          <div 
            className={`flex flex-col border-r border-gray-200 dark:border-white/5 ${isDragging ? '' : 'transition-all duration-300'} ${isSmallScreen && mobileView !== 'editor' ? 'hidden' : ''}`}
            style={{ width: isSmallScreen ? '100%' : `${splitPosition}%` }}
          >
            {/* Tabs Navigation */}
            <div className="h-11 flex-shrink-0 bg-gray-50 dark:bg-[var(--color-bg-card)] flex items-center px-4 overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-white/5">
              {tabs.map(tab => (
                <div 
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-2.5 px-4 h-full cursor-pointer transition-all relative ${
                    activeTabId === tab.id 
                    ? 'text-primary-600 dark:text-primary-400 font-bold' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <FileCode2 className="w-4 h-4 opacity-70" />
                  <span className="text-xs whitespace-nowrap">{tab.name}</span>
                  {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(124,58,237,0.5)]" />}
                  
                  {/* Active Indicator */}
                  {activeTabId === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 rounded-t-full" />
                  )}
                  
                  {tabs.length > 1 && (
                    <button 
                      onClick={(e) => closeTab(tab.id, e)} 
                      className="ml-1 p-0.5 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={addNewTab} 
                className="ml-2 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-primary-500 transition-all active:scale-90"
                title="New File"
              >
                <FilePlus2 className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions / Language Selector */}
            <div className="h-14 flex-shrink-0 bg-gray-50/50 dark:bg-[var(--color-bg-card)] flex items-center px-4 justify-between border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <div className="w-48">
                  <CustomDropdown
                    options={BASE_LANGS.map(l => ({ value: l.id, label: l.name }))}
                    value={activeTab.languageId}
                    onChange={(val) => setTabLanguage(activeTab.id, val)}
                    size="small"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-1.5 p-1 bg-gray-100/50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                   <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-gray-400 hover:text-primary-500 transition-all" title="Copy Code">
                      <Copy className="w-3.5 h-3.5" />
                   </button>
                   <button onClick={handleDownload} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-gray-400 hover:text-primary-500 transition-all" title="Download File">
                      <Download className="w-3.5 h-3.5" />
                   </button>
                   <button onClick={handleShare} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-gray-400 hover:text-primary-500 transition-all" title="Share Code">
                      <Share2 className="w-3.5 h-3.5" />
                   </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="btn-primary px-5 py-2 group"
                  >
                    {isRunning ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current group-hover:scale-110 transition-transform" />}
                    <span>{isRunning ? 'Running...' : 'Run'}</span>
                  </button>
                  
                  <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-all active:rotate-45" title="Editor Settings">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Editor Container */}
            <div className="flex-1 overflow-hidden relative select-text">
              <Editor
                height="100%"
                language={getMonacoLanguage(activeTab.languageId)}
                value={activeTab.content}
                theme={currentTheme}
                onChange={(val) => setTabContent(activeTab.id, val || '')}
                options={{
                  fontSize,
                  fontFamily: codeFont,
                  fontLigatures: ligatures,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 20 },
                  roundedSelection: true,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                  contextmenu: true,
                }}
                onMount={(editor) => {
                  editorRef.current = editor;
                  editor.focus();
                }}
              />
            </div>
          </div>

          {/* Resizer Handle */}
          {!isSmallScreen && (
            <div 
              onMouseDown={handleMouseDown}
              className="w-1.5 hover:w-2 bg-gray-100 dark:bg-[var(--color-bg-card)] cursor-col-resize z-20 transition-all flex items-center justify-center group relative border-x border-gray-200 dark:border-white/5"
            >
              <div className="w-0.5 h-12 bg-gray-300 dark:bg-white/10 rounded-full group-hover:bg-primary-500 group-hover:h-20 transition-all" />
            </div>
          )}

          {/* Right: IO Area */}
          <div 
            className={`flex flex-col bg-gray-50 dark:bg-[var(--color-bg-card)] ${isDragging ? '' : 'transition-all duration-300'} ${isSmallScreen && mobileView === 'editor' ? 'hidden' : ''}`}
            style={{ width: isSmallScreen ? '100%' : `${100 - splitPosition}%` }}
          >
            <div ref={ioContainerRef} className="flex flex-col h-full overflow-hidden">
              {/* Input Section */}
              <div 
                className={`flex flex-col ${isDragging || isVerticalDragging ? '' : 'transition-all duration-300'} ${isSmallScreen && mobileView !== 'io' ? 'hidden' : 'min-h-[100px]'}`}
                style={{ height: isSmallScreen ? 'auto' : `${ioSplitPosition}%` }}
              >
                <div className="h-11 flex-shrink-0 bg-white dark:bg-[var(--color-bg-card)] border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <TerminalSquare className="w-4 h-4 text-primary-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Input</span>
                  </div>
                </div>
                
                <div className="flex-1 p-4 bg-gray-50 dark:bg-[#000000] flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Arguments</label>
                    <input 
                      value={args}
                      onChange={(e) => setArgs(e.target.value)}
                      placeholder="e.g. arg1 arg2"
                      className="w-full bg-[#F1F3F4] dark:bg-black border border-gray-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Input</label>
                    <textarea
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      placeholder="Type input for your program..."
                      className="flex-1 w-full bg-[#F1F3F4] dark:bg-black border border-gray-200 dark:border-white/5 rounded-xl p-4 text-xs font-mono outline-none focus:ring-2 focus:ring-primary-500/20 resize-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Vertical Resizer Handle */}
              {!isSmallScreen && (
                <div 
                  onMouseDown={handleVerticalMouseDown}
                  className="h-1.5 hover:h-2 bg-gray-100 dark:bg-[var(--color-bg-card)] cursor-row-resize z-20 transition-all flex items-center justify-center group relative border-y border-gray-200 dark:border-white/5"
                >
                  <div className="h-0.5 w-12 bg-gray-300 dark:bg-white/10 rounded-full group-hover:bg-primary-500 group-hover:w-20 transition-all" />
                </div>
              )}

              {/* Console Output Section */}
              <div 
                className={`flex flex-col border-gray-200 dark:border-white/5 ${isDragging || isVerticalDragging ? '' : 'transition-all duration-300'} ${isSmallScreen && mobileView !== 'output' ? 'hidden' : 'flex-1'}`}
              >
                <div className="h-11 flex-shrink-0 bg-white dark:bg-[var(--color-bg-card)] border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Output</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {executionTime != null && (
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${exitCode === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {exitCode === 0 ? <Layers className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {exitCode === 0 ? 'FINISHED' : 'ERROR'} • {executionTime}ms
                      </div>
                    )}
                    <button 
                      onClick={() => { setStdout(''); setStderr(''); setExecutionTime(null); setExitCode(null); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 transition-colors" 
                      title="Clear Console"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 p-5 overflow-y-auto font-mono text-xs bg-[#F1F3F4] dark:bg-[#000000] select-text custom-scrollbar">
                  {!stdout && !stderr && !isRunning && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4 opacity-30">
                      <div className="p-4 rounded-full bg-white/5">
                        <Zap className="w-10 h-10" />
                      </div>
                      <p className="font-bold tracking-widest text-[10px] uppercase">Waiting for execution...</p>
                    </div>
                  )}
                  
                  {isRunning && (
                    <div className="flex items-center gap-3 text-primary-500 font-bold p-2">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      <span className="tracking-wide">Running...</span>
                    </div>
                  )}
                  
                  {stdout && (
                    <div className="mb-6">
                      <div className="text-[10px] text-emerald-500/50 font-bold mb-2 uppercase tracking-widest">stdout</div>
                      <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">{stdout}</pre>
                    </div>
                  )}
                  
                  {stderr && (
                    <div>
                      <div className="text-[10px] text-rose-500/50 font-bold mb-2 uppercase tracking-widest">stderr</div>
                      <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed bg-rose-500/5 p-3 rounded-lg border border-rose-500/10">{stderr}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Status Bar / Ending Point - Smooth Closure */}
        <div className="h-1 flex-shrink-0 bg-gray-50 dark:bg-black border-t border-gray-100 dark:border-white/5 z-30" />

        {/* Resizing Overlay */}
        {(isDragging || isVerticalDragging) && (
          <div 
            className={`fixed inset-0 z-[100] pointer-events-auto bg-transparent ${isDragging ? 'cursor-col-resize' : 'cursor-row-resize'}`} 
          />
        )}
      </main>
    </div>
  </div>
</div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#F1F3F4] dark:bg-[var(--color-bg-card)] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary-500" />
                IDE Preferences
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400">Font Size</label>
                  <input 
                    type="number" 
                    value={fontSize} 
                    onChange={e => setFontSize(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400">Font Ligatures</label>
                  <button
                    onClick={() => setLigatures(!ligatures)}
                    className={`flex-1 rounded-xl text-sm font-bold transition-all ${
                      ligatures 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 border border-transparent'
                    }`}
                  >
                    {ligatures ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 dark:text-gray-400">Typography</label>
                <CustomDropdown
                  options={CODE_FONTS.map(f => ({ value: f.id, label: f.label }))}
                  value={fontFamilyId}
                  onChange={setFontFamilyId}
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-white/5">
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full btn-primary py-3.5"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Compiler;








