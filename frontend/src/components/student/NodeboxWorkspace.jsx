import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Nodebox } from '@codesandbox/nodebox';
import Editor from "@monaco-editor/react";
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import {
    Beaker, Globe, FileCode, ChevronRight,
    ChevronDown, X, ExternalLink, RefreshCw,
    FilePlus, FolderPlus, Trash2, Loader2
} from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import practicalExerciseService from '../../services/practicalExerciseService';
import toast from 'react-hot-toast';
import ReactDOM from 'react-dom';


// ─── Portal ──────────────────────────────────────────────────────────────────
const SidebarExplorerPortal = ({ children }) => {
    const mount = document.getElementById('sidebar-explorer-mount');
    if (!mount) return null;
    return ReactDOM.createPortal(children, mount);
};


// ─── File Tree ───────────────────────────────────────────────────────────────
const FileTree = ({ files, activeFile, onSelectFile, onCreateFile, onDeleteFile }) => {
    const [expanded, setExpanded] = useState({ '/': true });
    const [newItem, setNewItem] = useState(null);
    const [newItemName, setNewItemName] = useState('');

    const toggle = (path) => setExpanded(prev => ({ ...prev, [path]: !prev[path] }));

    const buildTree = (paths) => {
        const root = { name: 'root', path: '/', type: 'folder', children: [] };
        paths.forEach(path => {
            const parts = path.split('/').filter(Boolean);
            let current = root;
            let currentPath = '';
            parts.forEach((part, i) => {
                currentPath += '/' + part;
                const isFolder = i < parts.length - 1;
                let existing = current.children.find(c => c.name === part);
                if (!existing) {
                    existing = { name: part, path: currentPath, type: isFolder ? 'folder' : 'file', children: [] };
                    current.children.push(existing);
                }
                current = existing;
            });
        });
        return root.children;
    };

    const treeData = buildTree(Object.keys(files));

    const handleCreate = (e) => {
        if (e.key === 'Enter' && newItemName.trim()) {
            const fullPath = newItem.parent === '/'
                ? `/${newItemName}`
                : `${newItem.parent}/${newItemName}`;
            onCreateFile(fullPath, newItem.type);
            setNewItem(null);
            setNewItemName('');
        } else if (e.key === 'Escape') {
            setNewItem(null);
            setNewItemName('');
        }
    };

    const renderNode = (node, depth = 0) => {
        const isDir = node.type === 'folder';
        const isOpen = expanded[node.path];
        const isActive = activeFile === node.path;

        return (
            <div key={node.path} className="group/item">
                <div
                    className={`w-full flex items-center gap-2 px-3 py-1 text-[11px] hover:bg-white/5 transition-all text-left cursor-pointer
                        ${isActive ? 'bg-primary-500/10 text-white border-l-2 border-primary-500' : 'text-gray-400 border-l-2 border-transparent'}`}
                    style={{ paddingLeft: `${depth * 12 + 10}px` }}
                    onClick={() => isDir ? toggle(node.path) : onSelectFile(node.path)}
                >
                    {isDir
                        ? (isOpen ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />)
                        : <FileCode size={13} className={isActive ? 'text-primary-400' : 'text-gray-600'} />
                    }
                    <span className="flex-1 truncate tracking-tight">{node.name}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeleteFile(node.path); }}
                        className="opacity-0 group-hover/item:opacity-100 p-0.5 hover:text-red-400 transition-all"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>

                {isDir && isOpen && node.children.map(child => renderNode(child, depth + 1))}

                {isDir && isOpen && newItem?.parent === node.path && (
                    <div className="flex items-center gap-2 px-3 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 10}px` }}>
                        <input
                            autoFocus
                            className="bg-[#1e1e1e] border border-primary-500/50 outline-none text-[11px] text-white w-full px-1 py-0.5 rounded"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            onKeyDown={handleCreate}
                            onBlur={() => { setNewItem(null); setNewItemName(''); }}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="py-0 select-none flex flex-col h-full bg-[#181818]">
            <div className="px-4 py-2 mt-2 flex items-center justify-between text-gray-400">
                <span className="text-[11px] font-bold tracking-widest uppercase opacity-80">Explorer</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setNewItem({ type: 'file', parent: '/' })} className="hover:bg-white/10 p-0.5 rounded transition-all">
                        <FilePlus size={14} />
                    </button>
                    <button onClick={() => setNewItem({ type: 'folder', parent: '/' })} className="hover:bg-white/10 p-0.5 rounded transition-all">
                        <FolderPlus size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar mt-1">
                {treeData
                    .sort((a, b) => {
                        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                        return a.name.localeCompare(b.name);
                    })
                    .map(node => renderNode(node))
                }
                {newItem?.parent === '/' && (
                    <div className="flex items-center gap-2 px-6 py-1">
                        <input
                            autoFocus
                            className="bg-[#1e1e1e] border border-primary-500/50 outline-none text-[11px] text-white w-full px-1 py-0.5 rounded"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            onKeyDown={handleCreate}
                            onBlur={() => { setNewItem(null); setNewItemName(''); }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};


// ─── Language Detector ───────────────────────────────────────────────────────
const getLanguage = (filePath = '') => {
    if (!filePath) return 'javascript';
    const ext = filePath.split('.').pop().toLowerCase();
    const map = {
        js: 'javascript', jsx: 'javascript',
        ts: 'typescript', tsx: 'typescript',
        css: 'css', html: 'html',
        json: 'json', md: 'markdown',
        py: 'python', sh: 'shell',
    };
    return map[ext] || 'plaintext';
};


// ─── Main Workspace ──────────────────────────────────────────────────────────
const NodeboxWorkspace = ({ exercise, courseId, onSubmissionComplete }) => {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isBooting, setIsBooting] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [files, setFiles] = useState(() => exercise.currentFileState || exercise.starterFiles);
    const [activeFile, setActiveFile] = useState(null);
    const [fileContents, setFileContents] = useState({});
    const [viewMode, setViewMode] = useState('both'); // 'both' | 'editor' | 'preview'
    const [activeTerminalTab, setActiveTerminalTab] = useState('terminal');

    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const nodeboxInstanceRef = useRef(null);
    const shellRef = useRef(null);
    const termInitializedRef = useRef(false);
    const isMountedRef = useRef(true);

    // ── Boot Nodebox ─────────────────────────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;

        const initNodebox = async () => {
            if (nodeboxInstanceRef.current) return;

            // Init xterm only once and only when DOM ref is ready
            if (!termInitializedRef.current && terminalRef.current) {
                const term = new Terminal({
                    theme: { background: '#181818', foreground: '#cccccc', cursor: '#7d63f2', selection: '#ffffff30' },
                    fontSize: 12,
                    fontFamily: '"JetBrains Mono", monospace',
                    cursorBlink: true,
                    convertEol: true,
                });
                const fitAddon = new FitAddon();
                term.loadAddon(fitAddon);
                term.open(terminalRef.current);

                // Defer fit() to ensure the terminal container has dimensions
                requestAnimationFrame(() => {
                    try { fitAddon.fit(); } catch (_) { }
                });

                fitAddonRef.current = fitAddon;
                xtermRef.current = term;
                termInitializedRef.current = true;
                term.writeln('\x1b[1;36m[AlphaLearn] Initializing Nodebox Runtime...\x1b[0m');
            }

            try {
                // FIX: Nodebox requires a real DOM `iframe` element as mount target.
                // We create a hidden iframe, append to body, and pass it to connect().
                const sandboxFrame = document.createElement('iframe');
                sandboxFrame.style.display = 'none';
                sandboxFrame.setAttribute('allow', 'cross-origin-isolated');
                document.body.appendChild(sandboxFrame);

                const nb = new Nodebox({ iframe: sandboxFrame });
                await nb.connect();

                if (!isMountedRef.current) {
                    document.body.removeChild(sandboxFrame);
                    return;
                }

                nodeboxInstanceRef.current = nb;

                // Write all initial files to the virtual FS
                const initialContents = {};
                Object.keys(files).forEach(path => {
                    initialContents[path] = typeof files[path] === 'string'
                        ? files[path]
                        : (files[path]?.code ?? '');
                });
                await nb.fs.init(initialContents);
                setFileContents(initialContents);

                // Set first non-folder file as active
                const firstFile = Object.keys(initialContents).find(p => !p.endsWith('/')) || Object.keys(initialContents)[0];
                setActiveFile(firstFile);

                // Shell
                const shell = nb.shell.create();
                shellRef.current = shell;
                shell.stdout.on('data', (data) => xtermRef.current?.write(data));
                shell.stderr.on('data', (data) => xtermRef.current?.write(data));
                xtermRef.current?.onData((data) => shell.write(data));

                xtermRef.current?.writeln('\x1b[1;32m[system] Environment ready.\x1b[0m');

                if (initialContents['/package.json']) {
                    shell.write('npm install && npm start\n');
                }

                // Get preview URL
                const url = await nb.getPreviewUrl();
                if (isMountedRef.current) {
                    setPreviewUrl(url);
                    setIsBooting(false);
                }
            } catch (error) {
                console.error('[Nodebox] Init failed:', error);
                xtermRef.current?.writeln(`\x1b[1;31m[error] ${error?.message ?? String(error)}\x1b[0m`);
                if (isMountedRef.current) setIsBooting(false);
            }
        };

        initNodebox();

        return () => {
            isMountedRef.current = false;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fit terminal on tab switch
    useEffect(() => {
        if (activeTerminalTab === 'terminal') {
            requestAnimationFrame(() => {
                try { fitAddonRef.current?.fit(); } catch (_) { }
            });
        }
    }, [activeTerminalTab]);

    // ── File Change ──────────────────────────────────────────────────────────
    const handleFileChange = useCallback(async (newCode) => {
        if (!activeFile || !nodeboxInstanceRef.current || newCode == null) return;
        setFileContents(prev => ({ ...prev, [activeFile]: newCode }));
        try {
            await nodeboxInstanceRef.current.fs.writeFile(activeFile, newCode);
        } catch (_) { }
    }, [activeFile]);

    // ── Run Evaluation ───────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!exercise?.hiddenTests?.length) return;
        setIsSubmitting(true);
        try {
            const results = await Promise.all(
                exercise.hiddenTests.map(async (rule) => {
                    try {
                        const response = await fetch(`${previewUrl}${rule.path}`);
                        return { rule, passed: response.status === (rule.expectedStatus || 200) };
                    } catch {
                        return { rule, passed: false };
                    }
                })
            );
            await practicalExerciseService.submitExercise(exercise.id, fileContents, results, courseId);
            onSubmissionComplete?.({ success: true });
        } catch (e) {
            toast.error('Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    }, [exercise, previewUrl, fileContents, courseId, onSubmissionComplete]);

    // ── Terminal Tabs ────────────────────────────────────────────────────────
    const TERMINAL_TABS = [
        { id: 'terminal', label: 'TERMINAL' },
        { id: 'problems', label: 'PROBLEMS' },
        { id: 'debugconsole', label: 'DEBUG CONSOLE' },
        { id: 'output', label: 'OUTPUT' },
    ];

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col min-w-0 bg-[#181818] overflow-hidden" style={{ height: '100%' }}>

            {/* File Explorer via Portal */}
            <SidebarExplorerPortal>
                <FileTree
                    files={files}
                    activeFile={activeFile}
                    onSelectFile={setActiveFile}
                    onCreateFile={async (path, type) => {
                        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
                        const filePath = type === 'folder' ? `${normalizedPath}/.keep` : normalizedPath;
                        try {
                            await nodeboxInstanceRef.current?.fs.writeFile(filePath, '');
                            setFiles(f => ({ ...f, [filePath]: '' }));
                            setFileContents(c => ({ ...c, [filePath]: '' }));
                            if (type !== 'folder') setActiveFile(filePath);
                            toast.success(`Created ${type}`);
                        } catch {
                            toast.error('Creation failed');
                        }
                    }}
                    onDeleteFile={async (path) => {
                        if (!window.confirm('Delete this file?')) return;
                        try {
                            await nodeboxInstanceRef.current?.fs.unlink(path);
                            setFiles(prev => { const n = { ...prev }; delete n[path]; return n; });
                            setFileContents(prev => { const n = { ...prev }; delete n[path]; return n; });
                            if (activeFile === path) setActiveFile(null);
                            toast.success('Deleted');
                        } catch {
                            toast.error('Deletion failed');
                        }
                    }}
                />
            </SidebarExplorerPortal>

            {/* ── Action / Tab Bar ─────────────────────────────────────────── */}
            <div className="h-9 border-b border-white/5 bg-[#252526] flex items-center justify-between px-2 shrink-0">
                {/* Open file tab */}
                <div className="flex items-center h-full overflow-hidden">
                    {activeFile && (
                        <div className="h-full px-4 flex items-center gap-2 bg-[#1e1e1e] border-r border-white/5 text-[11px] text-gray-300">
                            <FileCode size={14} className="text-primary-400" />
                            <span>{activeFile.split('/').pop()}</span>
                            <X
                                size={12}
                                className="ml-2 hover:text-white cursor-pointer"
                                onClick={() => setActiveFile(null)}
                            />
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isBooting}
                        className="btn-primary flex items-center gap-1.5 px-3 h-6 text-[10px]"
                    >
                        {isSubmitting
                            ? <Loader2 size={10} className="animate-spin" />
                            : <Beaker size={12} />
                        }
                        Run Evaluation
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <button
                        title="Toggle Preview"
                        onClick={() => setViewMode(m => m === 'preview' ? 'both' : m === 'editor' ? 'both' : 'preview')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'preview' ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <Globe size={14} />
                    </button>
                    <button
                        title="Editor only"
                        onClick={() => setViewMode(m => m === 'editor' ? 'both' : 'editor')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'editor' ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <FileCode size={14} />
                    </button>
                </div>
            </div>

            {/* ── Main Layout ──────────────────────────────────────────────── */}
            {/* 
                VS Code layout:
                  [  Editor  |  Preview  ]   <-- top panel (resizable horizontal)
                  [  Terminal / Problems ]   <-- bottom panel (resizable vertical)
            */}
            <div className="flex-1 overflow-hidden" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <PanelGroup direction="vertical" style={{ flex: 1, minHeight: 0 }}>

                    {/* ── Top: Editor + Preview ──────────────────────────── */}
                    <Panel defaultSize={65} minSize={20} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <PanelGroup direction="horizontal" style={{ flex: 1, minHeight: 0 }}>

                            {/* Editor Panel */}
                            {viewMode !== 'preview' && (
                                <Panel defaultSize={viewMode === 'editor' ? 100 : 60} minSize={20} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    <Editor
                                        height="100%"
                                        theme="vs-dark"
                                        path={activeFile || '/index.js'}
                                        language={getLanguage(activeFile)}
                                        value={fileContents[activeFile] ?? ''}
                                        onChange={handleFileChange}
                                        options={{
                                            fontSize: 13,
                                            minimap: { enabled: false },
                                            padding: { top: 16 },
                                            wordWrap: 'on',
                                            scrollBeyondLastLine: false,
                                        }}
                                    />
                                </Panel>
                            )}

                            {/* Resize handle between editor & preview */}
                            {viewMode === 'both' && (
                                <PanelResizeHandle className="w-1 bg-black hover:bg-primary-500/50 transition-colors cursor-ew-resize" />
                            )}

                            {/* Preview Panel */}
                            {viewMode !== 'editor' && (
                                <Panel defaultSize={viewMode === 'preview' ? 100 : 40} minSize={15} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    {/* Preview title bar */}
                                    <div className="h-7 border-b border-white/5 px-3 flex items-center justify-between text-[9px] font-black text-gray-500 uppercase shrink-0 bg-[#1e1e1e]">
                                        <span className="flex items-center gap-2"><Globe size={11} /> PREVIEW</span>
                                        {previewUrl && (
                                            <a href={previewUrl} target="_blank" rel="noreferrer" className="hover:text-primary-400">
                                                <ExternalLink size={10} />
                                            </a>
                                        )}
                                    </div>

                                    {/* FIX: Proper full-area iframe container */}
                                    <div className="flex-1 relative bg-white overflow-hidden" style={{ minHeight: 0 }}>
                                        {isBooting ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1e1e1e]">
                                                <RefreshCw className="w-8 h-8 animate-spin text-primary-500 mb-4 opacity-50" />
                                                <span className="text-[10px] text-gray-400 tracking-widest font-bold">BOOTING MODULE...</span>
                                            </div>
                                        ) : previewUrl ? (
                                            <iframe
                                                src={previewUrl}
                                                className="absolute inset-0 w-full h-full border-0"
                                                title="Live Preview"
                                                allow="cross-origin-isolated"
                                                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e]">
                                                <span className="text-[11px] text-gray-500">No preview available</span>
                                            </div>
                                        )}
                                    </div>
                                </Panel>
                            )}
                        </PanelGroup>
                    </Panel>

                    {/* ── Resize Handle (horizontal bar) ─────────────────── */}
                    <PanelResizeHandle className="h-1 bg-black hover:bg-primary-500/50 transition-colors cursor-ns-resize" />

                    {/* ── Bottom: Terminal / Problems / Debug / Output ────── */}
                    <Panel defaultSize={35} minSize={10} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div className="flex flex-col h-full bg-[#181818] border-t border-white/5">

                            {/* Tab bar — VS Code style */}
                            <div className="h-9 flex items-center px-4 gap-1 shrink-0 bg-[#1e1e1e] border-b border-white/5">
                                {TERMINAL_TABS.map(({ id, label }) => (
                                    <button
                                        key={id}
                                        onClick={() => setActiveTerminalTab(id)}
                                        className={`px-3 h-full text-[11px] font-semibold border-b-2 tracking-tight transition-all
                                            ${activeTerminalTab === id
                                                ? 'border-primary-500 text-white'
                                                : 'border-transparent text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab content */}
                            <div className="flex-1 relative min-h-0">
                                {/* Terminal — always mounted, hidden when inactive to preserve xterm state */}
                                <div
                                    ref={terminalRef}
                                    className="absolute inset-0 px-2 py-1"
                                    style={{ display: activeTerminalTab === 'terminal' ? 'block' : 'none' }}
                                />
                                {activeTerminalTab === 'problems' && (
                                    <div className="p-4 text-[11px] text-gray-500 italic">No issues found in workspace.</div>
                                )}
                                {activeTerminalTab === 'debugconsole' && (
                                    <div className="p-4 text-[11px] text-gray-500 italic">Console initialized. Waiting for attach...</div>
                                )}
                                {activeTerminalTab === 'output' && (
                                    <div className="p-4 text-[11px] text-gray-500 italic">No output generators running.</div>
                                )}
                            </div>
                        </div>
                    </Panel>

                </PanelGroup>
            </div>
        </div>
    );
};

export default NodeboxWorkspace;
