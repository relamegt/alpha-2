import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    SandpackProvider,
    SandpackCodeEditor,
    SandpackPreview,
    useSandpack,
} from "@codesandbox/sandpack-react";
import { atomDark } from "@codesandbox/sandpack-themes";
import {
    Beaker, Globe, Loader2, X, FileCode,
    ChevronDown, ChevronRight, FilePlus,
    FolderPlus, ExternalLink, Trash2
} from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import practicalExerciseService from '../../services/practicalExerciseService';
import toast from 'react-hot-toast';
import ReactDOM from 'react-dom';


// ─── DOM Assertion Runner (injected into preview iframe) ─────────────────────
const DOM_ASSERTION_RUNNER = `
window.addEventListener('message', (event) => {
    if (event.data?.type !== 'RUN_ASSERTIONS') return;
    const rules = event.data.rules || [];
    const results = rules.map(rule => {
        try {
            let passed = false;
            const el = document.querySelector(rule.selector);
            switch (rule.type) {
                case 'element-exists':   passed = !!el; break;
                case 'has-text':         passed = !!el && el.textContent.includes(rule.expectedValue); break;
                case 'has-class':        passed = !!el && el.classList.contains(rule.expectedValue); break;
                case 'attribute-equals': passed = !!el && el.getAttribute(rule.attribute) === rule.expectedValue; break;
                case 'element-count':    passed = document.querySelectorAll(rule.selector).length === parseInt(rule.expectedValue, 10); break;
                default:                 passed = false;
            }
            return { rule, passed, message: passed ? 'Pass' : 'Fail' };
        } catch (e) {
            return { rule, passed: false, message: e.message };
        }
    });
    window.parent.postMessage({ type: 'ASSERTION_RESULTS', results }, '*');
});
`;

const ASSERTION_SCRIPT_TAG = `<script>${DOM_ASSERTION_RUNNER}</script>`;
const ASSERTION_MARKER = '__ASSERTION_RUNNER_INJECTED__';


// ─── Sidebar Portal ──────────────────────────────────────────────────────────
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
            const fullPath = newItem.parent === '/' ? `/${newItemName}` : `${newItem.parent}/${newItemName}`;
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
                    className={`w-full flex items-center gap-2 py-1 text-[11px] hover:bg-white/5 cursor-pointer transition-all
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
                        className="opacity-0 group-hover/item:opacity-100 p-0.5 hover:text-red-400 mr-2 transition-all"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>

                {isDir && isOpen && node.children.map(child => renderNode(child, depth + 1))}

                {isDir && isOpen && newItem?.parent === node.path && (
                    <div className="flex items-center gap-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 10}px` }}>
                        <input
                            autoFocus
                            className="bg-[#1e1e1e] border border-primary-500/50 outline-none text-[11px] text-white w-full px-1 py-0.5 rounded mr-2"
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
        <div className="select-none flex flex-col h-full bg-[#181818]">
            {/* Header */}
            <div className="px-4 py-2 mt-2 flex items-center justify-between text-gray-400">
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Explorer</span>
                <div className="flex items-center gap-2">
                    <button
                        title="New File"
                        onClick={() => setNewItem({ type: 'file', parent: '/' })}
                        className="hover:bg-white/10 p-0.5 rounded transition-all"
                    >
                        <FilePlus size={14} />
                    </button>
                    <button
                        title="New Folder"
                        onClick={() => setNewItem({ type: 'folder', parent: '/' })}
                        className="hover:bg-white/10 p-0.5 rounded transition-all"
                    >
                        <FolderPlus size={14} />
                    </button>
                </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto mt-1 custom-scrollbar">
                {treeData
                    .sort((a, b) => a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name))
                    .map(node => renderNode(node))
                }
                {/* New item at root level */}
                {newItem?.parent === '/' && (
                    <div className="flex items-center gap-2 py-1 px-6">
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


// ─── Inner Workspace (must be inside SandpackProvider) ───────────────────────
const BOTTOM_TABS = [
    { id: 'console', label: 'CONSOLE' },
    { id: 'output', label: 'OUTPUT' },
    { id: 'problems', label: 'PROBLEMS' },
];

const CustomWorkspaceManager = ({ exercise, hiddenTests, isSubmitting, onRunEvaluation }) => {
    const { sandpack } = useSandpack();
    const [viewMode, setViewMode] = useState('both'); // 'both' | 'editor' | 'preview'
    const [activeBottomTab, setActiveBottomTab] = useState('console');
    const [consoleLogs, setConsoleLogs] = useState(['[system] Initialization complete. Code listener active.']);

    // Listen for preview console messages (optional — sandpack forwards some)
    useEffect(() => {
        const handler = (event) => {
            if (event.data?.type === 'CONSOLE_LOG') {
                setConsoleLogs(prev => [...prev, event.data.message]);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    const handleRunEvaluation = useCallback(() => {
        // Target the sandpack preview iframe specifically
        const iframe = document.querySelector('iframe.sp-preview-iframe')
            ?? document.querySelector('[data-sandpack] iframe')
            ?? document.querySelector('iframe');
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'RUN_ASSERTIONS', rules: hiddenTests }, '*');
        } else {
            toast.error('Preview iframe not ready yet.');
        }
    }, [hiddenTests]);

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-[#181818] overflow-hidden" style={{ height: '100%' }}>

            {/* File Explorer via Portal */}
            <SidebarExplorerPortal>
                <FileTree
                    files={sandpack.files}
                    activeFile={sandpack.activeFile}
                    onSelectFile={(p) => sandpack.openFile(p)}
                    onCreateFile={(p, type) => {
                        sandpack.addFile(p, '', true);
                        if (type !== 'folder') sandpack.openFile(p);
                        toast.success(`Created ${type}`);
                    }}
                    onDeleteFile={(p) => {
                        if (!window.confirm(`Delete ${p}?`)) return;
                        sandpack.deleteFile(p);
                        toast.success('Deleted');
                    }}
                />
            </SidebarExplorerPortal>

            {/* ── Action Bar ───────────────────────────────────────────────── */}
            <div className="h-9 border-b border-white/5 bg-[#252526] flex items-center justify-between px-2 shrink-0">
                {/* Open file tab */}
                <div className="flex items-center h-full overflow-hidden">
                    {sandpack.activeFile && (
                        <div className="h-full px-4 flex items-center gap-2 bg-[#1e1e1e] border-r border-white/5 text-[11px] text-gray-300">
                            <FileCode size={13} className="text-primary-400" />
                            <span>{sandpack.activeFile.split('/').pop()}</span>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 pr-2">
                    <button
                        onClick={handleRunEvaluation}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-3 h-6 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded text-[10px] font-bold transition-all"
                    >
                        {isSubmitting ? <Loader2 size={10} className="animate-spin" /> : <Beaker size={12} />}
                        Run Evaluation
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    {/* Toggle Preview */}
                    <button
                        title="Toggle Preview"
                        onClick={() => setViewMode(m => m === 'preview' ? 'both' : m === 'editor' ? 'both' : 'preview')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'preview' ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <Globe size={14} />
                    </button>
                    {/* Toggle Editor only */}
                    <button
                        title="Editor Only"
                        onClick={() => setViewMode(m => m === 'editor' ? 'both' : 'editor')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'editor' ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <FileCode size={14} />
                    </button>
                </div>
            </div>

            {/* ── Main Layout ──────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <PanelGroup direction="vertical" style={{ flex: 1, minHeight: 0 }}>

                    {/* ── Top: Editor + Preview ──────────────────────────── */}
                    <Panel defaultSize={65} minSize={20} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <PanelGroup direction="horizontal" style={{ flex: 1, minHeight: 0 }}>

                            {/* Code Editor */}
                            {viewMode !== 'preview' && (
                                <Panel
                                    defaultSize={viewMode === 'editor' ? 100 : 60}
                                    minSize={20}
                                    style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
                                >
                                    <SandpackCodeEditor
                                        showTabs
                                        showLineNumbers
                                        closableTabs
                                        showRunButton={false}
                                        style={{ flex: 1, height: '100%', overflow: 'hidden' }}
                                    />
                                </Panel>
                            )}

                            {/* Resize handle */}
                            {viewMode === 'both' && (
                                <PanelResizeHandle className="w-1 bg-black hover:bg-primary-500/50 transition-colors cursor-ew-resize" />
                            )}

                            {/* Preview Panel */}
                            {viewMode !== 'editor' && (
                                <Panel
                                    defaultSize={viewMode === 'preview' ? 100 : 40}
                                    minSize={15}
                                    style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
                                >
                                    {/* Preview title bar */}
                                    <div className="h-7 border-b border-white/5 px-3 flex items-center justify-between text-[9px] font-black text-gray-500 uppercase shrink-0 bg-[#1e1e1e]">
                                        <span className="flex items-center gap-2">
                                            <Globe size={11} /> PREVIEW
                                        </span>
                                        <button
                                            title="Refresh Preview"
                                            onClick={() => sandpack.resetAllFiles()}
                                            className="hover:text-primary-400 transition-colors"
                                        >
                                            <ExternalLink size={10} />
                                        </button>
                                    </div>

                                    {/* FIX: Full-area preview container */}
                                    <div className="flex-1 relative bg-white overflow-hidden" style={{ minHeight: 0 }}>
                                        <SandpackPreview
                                            showNavigator={false}
                                            showOpenInCodeSandbox={false}
                                            showRefreshButton={false}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                width: '100%',
                                                height: '100%',
                                            }}
                                        />
                                    </div>
                                </Panel>
                            )}
                        </PanelGroup>
                    </Panel>

                    {/* ── Vertical resize handle ──────────────────────────── */}
                    <PanelResizeHandle className="h-1 bg-black hover:bg-primary-500/50 transition-colors cursor-ns-resize" />

                    {/* ── Bottom: Console / Output / Problems ────────────── */}
                    <Panel
                        defaultSize={35}
                        minSize={10}
                        style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
                    >
                        <div className="flex flex-col h-full bg-[#181818] border-t border-white/5">

                            {/* Tab bar — VS Code style */}
                            <div className="h-9 flex items-center px-4 gap-1 shrink-0 bg-[#1e1e1e] border-b border-white/5">
                                {BOTTOM_TABS.map(({ id, label }) => (
                                    <button
                                        key={id}
                                        onClick={() => setActiveBottomTab(id)}
                                        className={`px-3 h-full text-[11px] font-semibold border-b-2 tracking-tight transition-all
                                            ${activeBottomTab === id
                                                ? 'border-primary-500 text-white'
                                                : 'border-transparent text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab content */}
                            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] text-gray-400 bg-[#181818] custom-scrollbar" style={{ minHeight: 0 }}>
                                {activeBottomTab === 'console' && (
                                    <div className="space-y-0.5">
                                        {consoleLogs.map((log, i) => (
                                            <p key={i} className="text-gray-400">&gt; {log}</p>
                                        ))}
                                    </div>
                                )}
                                {activeBottomTab === 'output' && (
                                    <p className="text-gray-500 italic">No output generators running.</p>
                                )}
                                {activeBottomTab === 'problems' && (
                                    <p className="text-gray-500 italic">No issues found in workspace.</p>
                                )}
                            </div>
                        </div>
                    </Panel>

                </PanelGroup>
            </div>
        </div>
    );
};


// ─── Assertion Injection Helper ──────────────────────────────────────────────
const injectAssertionRunner = (files) => {
    const result = { ...files };
    Object.keys(result).forEach(path => {
        if (!path.endsWith('.html')) return;

        const entry = result[path];
        const code = typeof entry === 'string' ? entry : entry?.code ?? '';

        // Guard: don't inject twice
        if (code.includes(ASSERTION_MARKER)) return;

        const injected = code.includes('</body>')
            ? code.replace('</body>', `  <!-- ${ASSERTION_MARKER} -->\n  ${ASSERTION_SCRIPT_TAG}\n</body>`)
            : code + `\n<!-- ${ASSERTION_MARKER} -->\n${ASSERTION_SCRIPT_TAG}`;

        result[path] = typeof entry === 'string' ? injected : { ...entry, code: injected };
    });
    return result;
};


// ─── Root Workspace ──────────────────────────────────────────────────────────
const SandpackWorkspace = ({ exercise, courseId, onSubmissionComplete }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inject assertion runner into HTML files (memoized, stable reference)
    const files = React.useMemo(() => {
        const base = exercise.currentFileState || exercise.starterFiles || {};
        return injectAssertionRunner(base);
    }, [exercise]);

    // Listen for assertion results from the iframe
    useEffect(() => {
        const handleMessage = async (event) => {
            if (event.data?.type !== 'ASSERTION_RESULTS') return;
            const results = event.data.results;
            setIsSubmitting(true);
            try {
                const response = await practicalExerciseService.submitExercise(
                    exercise.id, files, results, courseId
                );
                onSubmissionComplete?.({
                    ...response,
                    passed: results.every(t => t.passed),
                });
                const allPassed = results.every(t => t.passed);
                toast[allPassed ? 'success' : 'error'](
                    allPassed ? 'All tests passed! 🎉' : `${results.filter(t => !t.passed).length} test(s) failed.`
                );
            } catch (e) {
                toast.error('Submission error.');
            } finally {
                setIsSubmitting(false);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [exercise.id, files, courseId, onSubmissionComplete]);

    const template = exercise.phaseType === 'REACT' ? 'react' : 'static';

    return (
        <SandpackProvider
            template={template}
            theme={atomDark}
            files={files}
            options={{
                recompileMode: 'delayed',
                recompileDelay: 500,
            }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            <CustomWorkspaceManager
                exercise={exercise}
                hiddenTests={exercise.hiddenTests || []}
                isSubmitting={isSubmitting}
                courseId={courseId}
            />
        </SandpackProvider>
    );
};

export default SandpackWorkspace;








