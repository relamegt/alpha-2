import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Play, CheckCircle, AlertTriangle, ChevronDown, Maximize2, Minimize2, Loader2, Code2, FileText, List, CheckSquare, Terminal, Coins, Lock, XCircle, Clock, Pause, ChevronLeft, ChevronRight, Settings, MoreVertical, X, PanelLeft, Plus, Trash2, Save, Edit3, Video as VideoIcon, Trophy, RotateCw, Layers, CheckCircle2, ArrowLeft, ArrowRight, Download, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import submissionService from '../../services/submissionService';
import problemService from '../../services/problemService';
import useCodeExecution from '../../hooks/useCodeExecution';
import contestService from '../../services/contestService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ProblemSidebar from './ProblemSidebar';
import SubmissionsTab from './SubmissionsTab';
import EditorialRenderer from './EditorialRenderer';
import { GoSidebarCollapse, GoSidebarExpand } from 'react-icons/go';
import lottie from 'lottie-web';
import CustomDropdown from '../../components/shared/CustomDropdown';
import SecureVideoPlayer from '../shared/SecureVideoPlayer';

// —"—"—" Description Cleaner & Parser —"—"—"
const extractInputFormat = (desc) => {
    if (!desc) return '';
    const m = desc.match(/(?:^|\n)## Input Format\s*\n([\s\S]*?)(?=\n## |\n\*\*Example|\n### Example|$)/i);
    return m ? m[1].trim() : '';
};

const extractOutputFormat = (desc) => {
    if (!desc) return '';
    const m = desc.match(/(?:^|\n)## Output Format\s*\n([\s\S]*?)(?=\n## |\n\*\*Example|\n### Example|$)/i);
    return m ? m[1].trim() : '';
};

const cleanDescription = (desc) => {
    if (!desc) return '';
    const redundantHeaders = [
        '## Input Format',
        '## Output Format',
        '## Constraints',
        '**Example:**',
        '**Example**',
        '### Example',
        '### Examples',
        '## Example',
        '## Examples',
        'Example:',
        'Example 1:',
        'Examples:'
    ];

    let minIndex = desc.length;
    redundantHeaders.forEach(header => {
        const idx = desc.indexOf(header);
        if (idx !== -1 && idx < minIndex) {
            if (idx === 0 || desc[idx - 1] === '\n') {
                minIndex = idx;
            }
        }
    });

    let statement = desc.substring(0, minIndex).trim();
    if (statement.startsWith('## Problem Statement')) {
        statement = statement.substring('## Problem Statement'.length).trim();
    }
    return statement;
};

const MarkdownComponents = {
    h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-5 mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-5 mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-[14px] font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-1.5 leading-snug">{children}</h3>,
    p: ({ children }) => <p className="text-gray-700 dark:text-gray-300 text-[13.5px] leading-6 mb-3 whitespace-pre-wrap break-words">{children}</p>,
    ul: ({ children }) => <ul className="text-gray-700 dark:text-gray-300 text-[13px] list-disc list-outside ml-4 mb-3 space-y-0.5">{children}</ul>,
    ol: ({ children }) => <ol className="text-gray-700 dark:text-gray-300 text-[13px] list-decimal list-outside ml-4 mb-3 space-y-0.5">{children}</ol>,
    li: ({ children }) => <li className="pl-1 leading-6 break-words">{children}</li>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-primary-400 dark:border-gray-500 pl-4 pr-2 py-1 italic text-gray-500 dark:text-gray-400 text-[13px] my-3 bg-primary-50/50 dark:bg-[#23232e] rounded-r">{children}</blockquote>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline break-all">{children}</a>,
    img: ({ src, alt }) => <img src={src} alt={alt} className="max-w-full rounded-xl border border-gray-100 dark:border-gray-800 my-4 shadow-sm" />,
    hr: () => <hr className="border-0 border-t border-[var(--color-border-interactive)] my-4" />,
    table: (props) => <div className="my-4 w-full overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm"><table className="w-full text-[12px] border-collapse text-left" {...props} /></div>,
    thead: (props) => <thead className="bg-primary-50 dark:bg-primary-900/30 text-gray-900 dark:text-gray-100" {...props} />,
    tr: (props) => <tr className="border-t border-[var(--color-border-interactive)] even:bg-gray-50/50 dark:even:bg-gray-800/30" {...props} />,
    tbody: (props) => <tbody className="bg-[#F1F3F4] dark:bg-[#111117]" {...props} />,
    th: ({ children }) => <th className="px-3 py-2 font-semibold border-r border-primary-100 dark:border-primary-900 last:border-r-0 text-[11px] whitespace-nowrap">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-800 last:border-r-0 align-top text-gray-700 dark:text-gray-300 text-[11px]">{children}</td>,
    code: ({ inline, className, children }) => {
        const content = String(children).replace(/\n$/, '');
        const match = /language-(\w+)/.exec(className || '');
        if (inline || (!match && !content.includes('\n'))) {
            return <code className="bg-primary-50 dark:bg-[#23232e] text-primary-700 dark:text-gray-200 px-1.5 py-0.5 rounded text-[12px] font-mono border border-primary-100 dark:border-gray-700 inline break-all">{children}</code>;
        }
        return (
            <div className="my-3 rounded-lg overflow-hidden bg-[#111117] border border-zinc-800">
                <div className="p-3 overflow-x-auto text-[12px] font-mono text-gray-200">{children}</div>
            </div>
        );
    }
};

// ─── Success Pop — Lottie coin + light particles ─────────────────────────────────

// Lottie animation URL — public coin celebration from LottieFiles
// GitHub raw URL for JSON-based lottie animation — replacing CDN to avoid limits
const COIN_LOTTIE_URL = 'https://raw.githubusercontent.com/relamegt/lottie-animations/refs/heads/main/Treasure%20box%20coine.json';

// Tiny pop particle dot
const PopParticle = ({ style }) => (
    <div style={{
        position: 'fixed', borderRadius: '50%', pointerEvents: 'none',
        animation: 'coin-particle 1.1s ease-out forwards',
        ...style,
    }} />
);

const SuccessPopOverlay = ({ result, onClose }) => {
    const [visible, setVisible] = useState(false);
    // Only show coins that were actually earned — no fallback to problem points
    const coins = result?.coinsEarned ?? 0;

    const lottieRef = useRef(null);
    const animInstanceRef = useRef(null);

    useEffect(() => {
        if (lottieRef.current) {
            animInstanceRef.current = lottie.loadAnimation({
                container: lottieRef.current,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: COIN_LOTTIE_URL
            });
            animInstanceRef.current.setSpeed(1);
        }

        setVisible(true);

        const hideTimeout = setTimeout(() => {
            setVisible(false);
        }, 2500); // visible for 2 seconds

        const closeTimeout = setTimeout(() => {
            onClose();
        }, 2900); // fade-out duration 0.4s

        return () => {
            clearTimeout(hideTimeout);
            clearTimeout(closeTimeout);
            if (animInstanceRef.current) {
                animInstanceRef.current.destroy();
            }
        };
    }, [onClose]);

    // Light radial pop particles
    const PART_COLORS = ['#fbbf24', '#f59e0b', '#fcd34d', '#10b981', '#34d399', '#60a5fa', '#c084fc', '#f472b6'];
    const particles = Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * 360;
        const dist = 120 + Math.random() * 140;
        const rad = angle * Math.PI / 180;
        return {
            left: `calc(50% + ${Math.round(Math.cos(rad) * dist)}px)`,
            top: `calc(50% + ${Math.round(Math.sin(rad) * dist)}px)`,
            width: `${5 + Math.random() * 7}px`,
            height: `${5 + Math.random() * 7}px`,
            background: PART_COLORS[i % PART_COLORS.length],
            animationDelay: `${Math.random() * 0.3}s`,
            '--tx': `${Math.round((Math.random() - 0.5) * 50)}px`,
            '--ty': `${-40 - Math.random() * 70}px`,
        };
    });

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)',
                opacity: visible ? 1 : 0, transition: 'opacity 0.4s',
                cursor: 'pointer',
            }}
        >
            {/* Light pop particles behind the lottie */}
            {particles.map((p, i) => <PopParticle key={i} style={p} />)}

            {/* Lottie coin animation */}
            <div
                ref={lottieRef}
                style={{
                    width: 420, height: 420,
                    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.3) translateY(60px)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s',
                    filter: 'drop-shadow(0 0 40px rgba(251,191,36,0.6))',
                    pointerEvents: 'none',
                }}
            />

            {/* +N coins + label */}
            {coins > 0 && (
                <div style={{
                    textAlign: 'center', marginTop: -20,
                    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.4) translateY(30px)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s',
                    lineHeight: 1,
                }}>
                    <div style={{
                        fontSize: 45, fontWeight: 900,
                        color: '#f59e0b',
                        textShadow: '0 4px 24px rgba(245,158,11,0.6)',
                        letterSpacing: '-1px', lineHeight: 1, fontFamily: "'Outfit', sans-serif",
                    }}>
                        + {coins} Coins
                    </div>
                </div>
            )}

        </div>
    );
};

// ─── BookOpen icon ──────────────────────────────────────────────────────────
const BookOpenIcon = ({ size = 14, className = '' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" className={className}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);

// ─── Drag‑Handle helpers ─────────────────────────────────────────────────────
const DragHandleH = ({ onMouseDown, onTouchStart }) => (
    <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="w-1.5 bg-gray-50 dark:bg-[#111117] hover:bg-purple-100 dark:hover:bg-purple-900/30 border-l border-r border-gray-100 dark:border-gray-700 cursor-col-resize shrink-0 transition-colors z-10 relative group flex flex-col justify-center items-center"
    >
        <div className="h-4 w-0.5 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-purple-400" />
    </div>
);

const DragHandleV = ({ onMouseDown, onTouchStart }) => (
    <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="h-2 sm:h-1.5 bg-gray-50 dark:bg-[#111117] hover:bg-purple-100 dark:hover:bg-purple-900/30 border-t border-b border-gray-100 dark:border-gray-700 cursor-row-resize shrink-0 transition-colors z-10 relative flex justify-center items-center group touch-none"
    >
        <div className="w-8 sm:w-4 h-1 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-purple-400" />
    </div>
);



// ─── Language & template data ────────────────────────────────────────────────
const LANGUAGE_OPTIONS = [
    { value: 'c', label: 'C', monacoLang: 'c' },
    { value: 'cpp', label: 'C++', monacoLang: 'cpp' },
    { value: 'java', label: 'Java', monacoLang: 'java' },
    { value: 'python', label: 'Python 3', monacoLang: 'python' },
    { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
    { value: 'csharp', label: 'C#', monacoLang: 'csharp' },
];

const SQL_LANGUAGE_OPTIONS = [
    { value: 'postgresql', label: 'PostgreSQL', monacoLang: 'pgsql' },
    { value: 'mysql', label: 'MySQL', monacoLang: 'sql' },
];

// ─── SQL Table Parsing & Rendering Helpers ──────────────────────────────

/**
 * Parse CREATE TABLE + INSERT SQL into structured table data for display.
 * Returns: [{ tableName, columns: [...], rows: [[...], ...] }, ...]
 */
function parseSqlToTables(sql) {
    if (!sql) return [];
    const tables = [];
    const tableMap = {};

    // Extract CREATE TABLE — handle nested parens in types like VARCHAR(50)
    const createStartRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(/gi;
    let match;
    while ((match = createStartRegex.exec(sql)) !== null) {
        const tableName = match[1];
        // Find matching closing paren by counting depth
        let depth = 1;
        let pos = match.index + match[0].length;
        const start = pos;
        while (pos < sql.length && depth > 0) {
            if (sql[pos] === '(') depth++;
            else if (sql[pos] === ')') depth--;
            pos++;
        }
        const colDefs = sql.substring(start, pos - 1);
        // Split by commas at depth 0 (top-level commas only)
        const parts = [];
        let current = '';
        let d = 0;
        for (const ch of colDefs) {
            if (ch === '(') d++;
            else if (ch === ')') d--;
            else if (ch === ',' && d === 0) {
                parts.push(current.trim());
                current = '';
                continue;
            }
            current += ch;
        }
        if (current.trim()) parts.push(current.trim());

        const columns = parts
            .map(c => c.split(/\s+/)[0].replace(/[`"']/g, ''))
            .filter(c => c && !c.match(/^(PRIMARY|FOREIGN|UNIQUE|KEY|INDEX|CONSTRAINT|CHECK)/i));
        tableMap[tableName.toLowerCase()] = { tableName, columns, rows: [] };
        tables.push(tableMap[tableName.toLowerCase()]);
    }

    // Extract INSERT INTO ... VALUES
    const insertRegex = /INSERT\s+INTO\s+[`"']?(\w+)[`"']?\s*(?:\([^)]*\)\s*)?VALUES\s*([\s\S]*?)(?:;|$)/gi;
    while ((match = insertRegex.exec(sql)) !== null) {
        const tableName = match[1].toLowerCase();
        const valuesBlock = match[2];
        // Match each (...) group
        const rowRegex = /\(([^)]*)\)/g;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
            const cells = [];
            // Smart split: handle quoted strings with commas inside
            let current = '';
            let inString = false;
            let quote = null;
            for (const ch of rowMatch[1]) {
                if (!inString && (ch === "'" || ch === '"')) {
                    inString = true;
                    quote = ch;
                } else if (inString && ch === quote) {
                    inString = false;
                    quote = null;
                } else if (!inString && ch === ',') {
                    cells.push(current.trim().replace(/^['"]|['"]$/g, ''));
                    current = '';
                    continue;
                }
                current += ch;
            }
            cells.push(current.trim().replace(/^['"]|['"]$/g, ''));

            if (tableMap[tableName]) {
                tableMap[tableName].rows.push(cells);
            }
        }
    }
    return tables;
}

/**
 * Parse pipe-delimited table string into { headers, rows }.
 */
function parsePipeTable(str) {
    if (!str) return null;
    const lines = str.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 1) return null;
    const headers = lines[0].split('|').map(h => h.trim());
    const rows = lines.slice(1).map(l => l.split('|').map(c => c.trim()));
    return { headers, rows };
}

/**
 * Styled SQL Table component — renders a table like LeetCode.
 */
const SqlTableDisplay = ({ tables }) => {
    if (!tables || tables.length === 0) return null;
    return (
        <div className="space-y-3">
            {tables.map((t, idx) => (
                <div key={idx}>
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-wider mb-1.5 flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                        {t.tableName}
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800">
                        <table className="w-full text-xs font-mono">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-800">
                                    {t.columns.map((col, ci) => (
                                        <th key={ci} className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {t.rows.map((row, ri) => (
                                    <tr key={ri} className={ri % 2 === 0 ? 'bg-[#F1F3F4] dark:bg-[#111117]' : 'bg-gray-50/50 dark:bg-gray-800/30'}>
                                        {row.map((cell, ci) => (
                                            <td key={ci} className="px-3 py-1.5 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap">
                                                {cell === 'NULL' ? <span className="text-gray-400 italic">NULL</span> : cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {t.rows.length === 0 && (
                                    <tr><td colSpan={t.columns.length} className="px-3 py-2 text-center text-gray-400 italic text-[10px]">No data</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * Render pipe-delimited table string as a styled HTML table.
 */
const PipeTableDisplay = ({ tableStr, colorScheme = 'default' }) => {
    const parsed = parsePipeTable(tableStr);
    if (!parsed) return <span className="text-gray-400 italic text-xs">(empty result set)</span>;

    const borderColor = colorScheme === 'green'
        ? 'border-green-200 dark:border-green-900/30'
        : colorScheme === 'red'
            ? 'border-red-200 dark:border-red-900/30'
            : 'border-[var(--color-border-interactive)]';
    const headerBg = colorScheme === 'green'
        ? 'bg-green-50 dark:bg-green-900/20'
        : colorScheme === 'red'
            ? 'bg-red-50 dark:bg-red-900/20'
            : 'bg-gray-100 dark:bg-gray-800';

    return (
        <div className={`overflow-x-auto rounded-lg border ${borderColor}`}>
            <table className="w-full text-xs font-mono">
                <thead>
                    <tr className={headerBg}>
                        {parsed.headers.map((h, i) => (
                            <th key={i} className={`px-3 py-1.5 text-left text-[10px] font-bold text-gray-600 dark:text-gray-300 border-b ${borderColor}`}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {parsed.rows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? 'bg-[#F1F3F4] dark:bg-[#111117]' : 'bg-gray-50/50 dark:bg-gray-800/30'}>
                            {row.map((cell, ci) => (
                                <td key={ci} className={`px-3 py-1.5 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap`}>
                                    {cell === 'NULL' ? <span className="text-gray-400 italic">NULL</span> : cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {parsed.rows.length === 0 && (
                        <tr><td colSpan={parsed.headers.length} className="px-3 py-2 text-center text-gray-400 italic text-[10px]">No rows</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const DEFAULT_CODE = {
    c: '#include <stdio.h>\n\nint main() {\n    // your code\n    return 0;\n}',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // your code\n    return 0;\n}',
    java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // your code\n    }\n}',
    python: '# Write your Python code here\n',
    javascript: '// Write your JavaScript code here\n',
    csharp: 'using System;\nusing System.Collections.Generic;\nusing System.Linq;\n\nclass Program {\n    static void Main() {\n        // your code\n    }\n}',
    mysql: '-- Write your MySQL query here\n',
    postgresql: '-- Write your PostgreSQL query here\n',
};

// ─── Difficulty badge ───────────────────────────────────────────────────────
const DiffBadge = ({ d }) => {
    const { isDark } = useTheme();
    const styles = {
        Easy: {
            background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
            color: isDark ? '#4ade80' : '#166534',
            border: isDark ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid #bbf7d0'
        },
        Medium: {
            background: isDark ? 'rgba(234, 179, 8, 0.15)' : '#fef9c3',
            color: isDark ? '#facc15' : '#854d0e',
            border: isDark ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid #fde047'
        },
        Hard: {
            background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
            color: isDark ? '#f87171' : '#991b1b',
            border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #fca5a5'
        },
    };
    const dot = { Easy: '#22c55e', Medium: '#eab308', Hard: '#ef4444' };
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', ...styles[d] }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot[d], flexShrink: 0 }} />
            {d}
        </span>
    );
};

// ─── Verdict color helper ───────────────────────────────────────────────────
const getVerdictColor = (verdict) => {
    return {
        text: verdict === 'Accepted' ? 'text-green-600 dark:text-green-400' :
            verdict === 'Compilation Error' ? 'text-orange-600 dark:text-orange-400' :
                verdict === 'TLE' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400',
        bg: verdict === 'Accepted' ? 'bg-green-50 dark:bg-green-900/10' :
            verdict === 'Compilation Error' ? 'bg-orange-50 dark:bg-orange-900/10' :
                verdict === 'TLE' ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-red-50 dark:bg-red-900/10',
        border: verdict === 'Accepted' ? 'border-green-100 dark:border-green-900/30' :
            verdict === 'Compilation Error' ? 'border-orange-100 dark:border-orange-900/30' :
                verdict === 'TLE' ? 'border-yellow-100 dark:border-yellow-900/30' : 'border-red-100 dark:border-red-900/30'
    };
};

// ─── LeetCode-style Progress Bar ────────────────────────────────────────────
const ExecutionProgress = ({ isRunning, isSubmitting, total }) => {
    const [count, setCount] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (isRunning || isSubmitting) {
            setCount(0);
            const step = Math.max(1, Math.floor(total / 15));
            intervalRef.current = setInterval(() => {
                setCount(prev => {
                    const next = prev + step;
                    return next >= total - 1 ? total - 1 : next;
                });
            }, 400);
        } else {
            clearInterval(intervalRef.current);
            setCount(0);
        }
        return () => clearInterval(intervalRef.current);
    }, [isRunning, isSubmitting, total]);

    if (!isRunning && !isSubmitting) return null;

    const progress = total > 0 ? Math.round((count / total) * 100) : 0;
    const label = isSubmitting ? 'Submitting' : 'Running';

    return (
        <div className="flex flex-col h-full items-center justify-center gap-4 px-8 bg-[#F1F3F4] dark:bg-[#111117] transition-colors">
            <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {label} test cases...
                </p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {count} <span className="text-gray-400 dark:text-gray-500 text-lg font-normal">/ {total}</span>
                </p>
            </div>
            <div className="w-full max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                    className="h-2 bg-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-xs text-gray-400">
                <Loader2 size={12} className="inline animate-spin mr-1" />
                {label} code against test cases
            </p>
        </div>
    );
};

// ─── Timer Component ────────────────────────────────────────────────────────
const ProblemTimer = () => {
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        let interval;
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-[#111117]/80 border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1 transition-colors">
            <Clock size={12} className="text-gray-500 dark:text-gray-400" />
            <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-200 min-w-[38px] text-center">
                {formatTime(seconds)}
            </span>
            <button
                onClick={() => setIsRunning(!isRunning)}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
                title={isRunning ? "Pause Timer" : "Resume Timer"}
            >
                {isRunning ? <Pause size={10} className="fill-current" /> : <Play size={10} className="fill-current" />}
            </button>
        </div>
    );
};

// ─── Settings Modal ────────────────────────────────────────────────────────
const SettingsModal = ({ settings, onClose, onSave }) => {
    const { isDark } = useTheme();
    const [fontSize, setFontSize] = useState(settings.fontSize || 14);
    const [theme, setTheme] = useState(settings.theme || 'vs-light');
    const [fontFamily, setFontFamily] = useState(settings.fontFamily || 'Menlo, Monaco, Consolas, "Courier New", monospace');

    const FONTS = [
        { value: 'Menlo, Monaco, Consolas, "Courier New", monospace', label: 'Default (Menlo/Monaco)' },
        { value: "'JetBrains Mono', 'Fira Code', Consolas, monospace", label: 'JetBrains Mono' },
        { value: "'Fira Code', monospace", label: 'Fira Code' },
        { value: "'Roboto Mono', monospace", label: 'Roboto Mono' },
        { value: "'Source Code Pro', monospace", label: 'Source Code Pro' },
        { value: "Consolas, monospace", label: 'Consolas' },
    ];

    const handleSave = () => {
        onSave({ fontSize: parseInt(fontSize), fontFamily });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1001] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 transition-colors" onClick={onClose}>
            <div className={`bg-[#F1F3F4] dark:bg-[#111117] rounded-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200 transition-colors ${!isDark ? 'shadow-2xl' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-[#111117] shrink-0 rounded-t-2xl transition-colors">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">Editor Settings</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><XCircle size={18} /></button>
                </div>

                <div className="p-6 overflow-visible flex-1 space-y-7 transition-colors">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Font Size</label>
                        <div className={`flex items-center gap-4 bg-gray-50 dark:bg-[#111117] p-4 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors ${!isDark ? 'shadow-sm' : ''}`}>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Min</span>
                            <input
                                type="range" min="10" max="24"
                                value={fontSize} onChange={(e) => setFontSize(e.target.value)}
                                className="flex-1 accent-primary-600 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className={`text-sm font-mono font-bold text-primary-600 dark:text-primary-400 w-10 text-center bg-[#F1F3F4] dark:bg-[#111117] py-1 rounded border border-gray-100 dark:border-gray-700 transition-colors ${!isDark ? 'shadow-sm' : ''}`}>{fontSize}px</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Font Style</label>
                        <CustomDropdown
                            options={FONTS}
                            value={fontFamily}
                            onChange={(val) => setFontFamily(val)}
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-[#111117] border-t border-gray-100 dark:border-gray-700 flex justify-end rounded-b-2xl transition-colors">
                    <button
                        onClick={handleSave}
                        className={`px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-all active:scale-95 ${!isDark ? 'shadow-lg shadow-primary-500/20' : ''}`}
                    >
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>
    );
};


// ─── Inline Contest Card View (within workspace) ───────────────────────────
// ─── Inline Contest Card View (within workspace) ───────────────────────────
const InlineContestView = ({ contestSlug, courseId, subId }) => {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const { data: contestData, isLoading: loading, error: queryError } = useQuery({
        queryKey: ['contest', contestSlug],
        queryFn: () => contestService.getContestById(contestSlug),
        enabled: !!contestSlug,
        staleTime: 30 * 60 * 1000, // 30 mins cache
        gcTime: 60 * 60 * 1000, // Keep in garbage collector for 60 mins
        retry: 1,
    });

    const contest = contestData?.contest;
    const error = queryError ? (queryError.response?.data?.message || queryError.message || 'Failed to load contest') : null;

    const [starting, setStarting] = useState(false);

    const handleStartNewAttempt = async () => {
        if (starting) return;
        setStarting(true);
        try {
            const res = await contestService.startNewAttempt(contestSlug);
            if (res.success) {
                // Trigger fullscreen early on click to satisfy browser user-gesture requirements
                if (contest?.proctoringEnabled) {
                    document.documentElement.requestFullscreen().catch(() => { });
                }
                queryClient.invalidateQueries({ queryKey: ['contest', contestSlug] });
                navigate(`/contests/${contestSlug}?mode=solo&courseId=${courseId}&subId=${subId}`);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to start attempt');
        } finally {
            setStarting(false);
        }
    };

    const handleStartContest = () => {
        if (contest?.proctoringEnabled) {
            document.documentElement.requestFullscreen().catch(() => { });
        }
        navigate(`/contests/${contestSlug}?mode=solo&courseId=${courseId}&subId=${subId}`);
    };

    const handleStartPractice = () => {
        navigate(`/contests/${contestSlug}?mode=solo&isPractice=true&courseId=${courseId}&subId=${subId}`);
    };

    const durationMs = contest ? (new Date(contest.endTime) - new Date(contest.startTime)) : 0;
    const durationHrs = Math.floor(durationMs / 3600000);
    const durationMins = Math.floor((durationMs % 3600000) / 60000);
    const durationStr = durationHrs > 0
        ? `${durationHrs}h ${durationMins > 0 ? durationMins + 'm' : ''}`
        : `${durationMins || contest?.duration || 60} min`;

    return (
        <div className="flex-1 bg-gray-50 dark:bg-[#111117] flex items-center justify-center relative transition-colors overflow-auto h-full w-full">
            {loading ? (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={32} className="animate-spin text-primary-500" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading Info...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
                    <AlertTriangle size={48} className="text-amber-500" />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Contest Not Available</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                </div>
            ) : contest ? (
                (!contest.isAttemptCompleted && !contest.isSubmitted) ? (
                    <div className="w-full max-w-3xl mx-auto p-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className={`rounded-2xl border ${isDark ? 'bg-[#181820] border-gray-800' : 'bg-white border-gray-200'} shadow-2xl overflow-hidden p-8 sm:p-10 relative max-h-[90vh] overflow-y-auto custom-scrollbar`}>
                            <button onClick={() => navigate(-1)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors">
                                <X size={20} />
                            </button>

                            <div className="text-center mb-8 pt-2">
                                <h1 className={`text-[22px] sm:text-[26px] font-extrabold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'} tracking-tight`}>
                                    Ready For Contest On {contest.title}?
                                </h1>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Once you begin the contest, you cannot restart or attempt it again.
                                </p>
                            </div>

                            <div className="mb-10 text-left">
                                <h3 className={`text-[17px] font-extrabold mb-5 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Instructions</h3>
                                <ul className="space-y-4">
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1.5 w-1 h-1 rounded-sm bg-primary-500 shrink-0"></div>
                                        <span className={`text-[13px] font-medium leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            The contest will last for <strong>{durationStr}</strong> & you will have <strong>{contest.problems?.length || 0}</strong> challenges to solve.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1.5 w-1 h-1 rounded-sm bg-primary-500 shrink-0"></div>
                                        <span className={`text-[13px] font-medium leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            For each correct solution, you will earn points based on problem difficulty.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1.5 w-1 h-1 rounded-sm bg-primary-500 shrink-0"></div>
                                        <span className={`text-[13px] font-medium leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            Once the contest begins, there is no option to pause it.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1.5 w-1 h-1 rounded-sm bg-primary-500 shrink-0"></div>
                                        <span className={`text-[13px] font-medium leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            The contest can only be attempted once; however, after submission, you can practice the problems at any time.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1.5 w-1 h-1 rounded-sm bg-primary-500 shrink-0"></div>
                                        <span className={`text-[13px] font-medium leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            A stable internet connection is essential to ensure a smooth contest experience.
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex flex-row items-center justify-center gap-4 mt-8">
                                <button
                                    onClick={() => navigate(-1)}
                                    className={`px-10 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98] ${isDark ? 'bg-[#282833] hover:bg-[#333342] text-gray-300 border border-[#333342] shadow-md' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100 shadow-sm'}`}
                                >
                                    Go back
                                </button>
                                <button
                                    onClick={handleStartContest}
                                    className={`px-10 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98] ${isDark ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-900/40' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-500/30'}`}
                                >
                                    I'm ready to start
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-2xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className={`rounded-2xl border ${isDark ? 'bg-[#181820] border-gray-700/50' : 'bg-white border-gray-200'} shadow-xl overflow-hidden`}>
                            {/* Contest Header */}
                            <div className={`px-8 pt-8 pb-6 relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-amber-900/20 via-[#181820] to-[#181820]' : 'bg-gradient-to-br from-amber-50 via-white to-white'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                                    <Trophy size={128} />
                                </div>
                                <div className="relative">
                                    <h1 className={`text-2xl font-extrabold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                        {contest.title}
                                    </h1>
                                    {(contest.isSubmitted || contest.isAttemptCompleted) && (
                                        <p className="text-sm flex items-center gap-2 mt-2 font-medium text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={16} />
                                            Attempted
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className={`grid ${contest.maxAttempts > 1 ? 'grid-cols-3' : 'grid-cols-2'} border-t ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                                <div className={`text-center py-5 ${isDark ? 'border-gray-700/50' : 'border-gray-100'} border-r`}>
                                    <div className={`text-[10px] uppercase font-bold tracking-wider mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Problems</div>
                                    <div className="flex items-center justify-center gap-2">
                                        <Layers size={16} className="text-primary-500" />
                                        <span className={`text-2xl font-black ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{contest.problems?.length || 0}</span>
                                    </div>
                                </div>
                                <div className={`text-center py-5 ${contest.maxAttempts > 1 ? `${isDark ? 'border-gray-700/50' : 'border-gray-100'} border-r` : ''}`}>
                                    <div className={`text-[10px] uppercase font-bold tracking-wider mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Duration</div>
                                    <div className="flex items-center justify-center gap-2">
                                        <Clock size={16} className="text-primary-500" />
                                        <span className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{durationStr}</span>
                                    </div>
                                </div>
                                {contest.maxAttempts > 1 && (
                                    <div className="text-center py-5">
                                        <div className={`text-[10px] uppercase font-bold tracking-wider mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Attempts</div>
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="text-xl font-black text-primary-600 dark:text-primary-400">{Math.min(contest.completedAttempts || contest.currentAttempt || 1, contest.maxAttempts)}</span>
                                            <span className="text-gray-400 mx-0.5">/</span>
                                            <span className={`text-xl font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{contest.maxAttempts}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Score Section */}
                            {contest.isAttemptCompleted && contest.lastAttemptResults && (
                                <div className={`mx-6 my-4 p-5 rounded-xl border ${isDark ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                                                <Trophy size={24} className="text-emerald-500" />
                                            </div>
                                            <div>
                                                <h3 className={`text-base font-extrabold ${isDark ? 'text-emerald-100' : 'text-emerald-900'}`}>Best Overall Score</h3>
                                                <p className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                    Score: <span className="font-black">{contest.lastAttemptResults?.score || 0}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{contest.lastAttemptResults?.problemsSolved || 0}</div>
                                            <div className="text-[10px] uppercase font-bold text-emerald-500 opacity-70">Solved</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className={`px-6 py-5 flex items-center justify-between gap-3 border-t ${isDark ? 'border-gray-700/50 bg-[#111117]/50' : 'border-gray-100 bg-gray-50/50'}`}>
                                <div className="flex items-center gap-2">
                                    {contest.isAttemptCompleted && (contest.maxAttempts === null || (contest.completedAttempts || contest.currentAttempt || 1) < (contest.maxAttempts || 99)) ? (
                                        <button
                                            onClick={handleStartNewAttempt}
                                            disabled={starting}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${isDark
                                                ? 'bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-800/50'
                                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'}`}
                                        >
                                            {starting ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
                                            Reattempt
                                        </button>
                                    ) : contest.isAttemptCompleted ? (
                                        <button
                                            onClick={handleStartPractice}
                                            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${isDark
                                                ? 'bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/50'
                                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
                                        >
                                            <Code2 size={14} />
                                            Practice
                                        </button>
                                    ) : !contest.isAttemptCompleted && !contest.isSubmitted ? (
                                        <button
                                            onClick={handleStartContest}
                                            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${isDark
                                                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-900/30'
                                                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/20'}`}
                                        >
                                            <Play size={14} className="fill-current" />
                                            Start Contest
                                        </button>
                                    ) : null}
                                </div>

                                {/* <button
                                    onClick={() => navigate(`/contests/${contest.slug || contestSlug}/leaderboard`)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${isDark
                                        ? 'bg-amber-900/20 hover:bg-amber-900/40 text-amber-300 border border-amber-800/40'
                                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'}`}
                                >
                                    <Trophy size={14} />
                                    View Leaderboard
                                </button> */}
                            </div>
                        </div>
                    </div>
                )
            ) : null}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════════════
const CodeEditor = () => {
    const { courseId, problemId, contestSlug, subId } = useParams();
    const navigate = useNavigate();
    const lastResultIdRef = useRef(null);
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const containerRef = useRef(null);

    // ── responsive ──
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── layout widths ──
    const [sidebarW, setSidebarW] = useState(20);
    const [descW, setDescW] = useState(38);
    const [editorTopH, setEditorTopH] = useState(65);
    const [showSidebar, setShowSidebar] = useState(true);
    const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
    const actuallyShowSidebar = showSidebar;

    // ── problem data ──
    const [isResizing, setIsResizing] = useState(false);
    const { running, submitting, runResult, submitResult, runCode, submitCode, resetResults, setSubmitResult, setRunResult, error: execError, isOffline } = useCodeExecution();

    const queryClient = useQueryClient();

    // Fetch Problem Data
    const { data: problemResult, isLoading: problemLoading } = useQuery({
        queryKey: ['problem', problemId],
        queryFn: () => problemService.getProblemById(problemId),
        enabled: !!problemId,
        staleTime: 5 * 60 * 1000, // 5 mins
    });
    const problem = problemResult?.problem;

    const [testCases, setTestCases] = useState([]);

    useEffect(() => {
        if (problem) {
            if (problem.type === 'quiz' && problem.isSolved) {
                setQuizSubmitted(true);
                if (problem.savedAnswers) {
                    setQuizAnswers(problem.savedAnswers);
                }
            }

            // Show all non-hidden test cases
            const allCases = problem.testCases || [];
            const publicCases = allCases.filter(tc => !tc.isHidden);

            let loadedTestCases = [];

            if (publicCases.length > 0) {
                loadedTestCases = publicCases.map(tc => ({ input: tc.input, output: tc.output }));
            } else {
                const examples = problem.examples || [];
                loadedTestCases = examples.length
                    ? examples.map(e => ({ input: e.input, output: e.output, explanation: e.explanation }))
                    : [{ input: '', output: '' }];
            }
            setTestCases(loadedTestCases);

            setLanguage(prevLang => {
                if (problem.type === 'sql' && !['mysql', 'postgresql'].includes(prevLang)) return 'mysql';
                if (problem.type !== 'sql' && ['mysql', 'postgresql'].includes(prevLang)) return 'cpp';
                return prevLang;
            });
        }
    }, [problem]);

    const loading = problemLoading;

    // ── prefetch success animation ──
    useEffect(() => {
        // Reset process tracker when problem changes
        lastResultIdRef.current = null;
        // Preload lottie to avoid slow first load — browser will cache it
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = COIN_LOTTIE_URL;
        document.head.appendChild(link);
    }, [problemId]);
    const [hasViewedEditorial, setHasViewedEditorial] = useState(false);
    const [pageLoading, setPageLoading] = useState(false);
    const { user } = useAuth();
    const { isDark } = useTheme();

    // ── settings & persistence ──
    const [showSettings, setShowSettings] = useState(false);
    const [editorSettings, setEditorSettings] = useState(() => {
        const saved = localStorage.getItem('editor_settings');
        return saved ? JSON.parse(saved) : { fontSize: 14, theme: 'antigravity-dark', fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace' };
    });

    // ── quiz / material ──
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [isSubmittingNonCoding, setIsSubmittingNonCoding] = useState(false);
    const [quizStarted, setQuizStarted] = useState(false);
    const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
    const correctAnswersCount = useMemo(() => {
        if (!problem?.quizQuestions || !quizAnswers) return 0;
        return problem.quizQuestions.reduce((count, q, idx) => {
            const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctAnswer;
            return quizAnswers[idx] === correctIdx ? count + 1 : count;
        }, 0);
    }, [problem?.quizQuestions, quizAnswers]);

    // ── custom test cases ──
    // Standard cases are 'case-0', 'case-1'...
    // Custom users are 'custom-1'...
    // We mix them in UI.
    const [customTestCases, setCustomTestCases] = useState([]);
    const [activeTestCaseId, setActiveTestCaseId] = useState('case-0');

    // Reset cases on problem change
    useEffect(() => {
        setCustomTestCases([]);
        setActiveTestCaseId('case-0');
        setIsSubmittingNonCoding(false);

        if (problemId && user?.id) {
            const savedAnswersStr = localStorage.getItem(`quiz_answers_${user.id}_${problemId}`);
            if (savedAnswersStr) setQuizAnswers(JSON.parse(savedAnswersStr));
            else setQuizAnswers({});

            const savedInfoStr = localStorage.getItem(`quiz_info_${user.id}_${problemId}`);
            if (savedInfoStr) {
                const info = JSON.parse(savedInfoStr);
                setQuizSubmitted(info.submitted);
                setQuizStarted(info.started);
                setCurrentQuizIdx(info.currentIdx);
            } else {
                setQuizSubmitted(false);
                setQuizStarted(false);
                setCurrentQuizIdx(0);
            }
        } else {
            setQuizAnswers({});
            setQuizSubmitted(false);
            setQuizStarted(false);
            setCurrentQuizIdx(0);
        }
    }, [problemId, user?.id]);

    useEffect(() => {
        if (!problemId || !user?.id) return;
        localStorage.setItem(`quiz_answers_${user.id}_${problemId}`, JSON.stringify(quizAnswers));
        localStorage.setItem(`quiz_info_${user.id}_${problemId}`, JSON.stringify({
            submitted: quizSubmitted,
            started: quizStarted,
            currentIdx: currentQuizIdx
        }));
    }, [quizAnswers, quizSubmitted, quizStarted, currentQuizIdx, problemId, user?.id]);

    const handleAddCustomCase = () => {
        const newId = Date.now();
        setCustomTestCases(prev => [...prev, { id: newId, input: '' }]);
        setActiveTestCaseId(`custom-${newId}`);
    };

    const handleRemoveCustomCase = (id, e) => {
        e.stopPropagation();
        setCustomTestCases(prev => prev.filter(c => c.id !== id));
        if (activeTestCaseId === `custom-${id}`) {
            setActiveTestCaseId('case-0');
        }
    };

    const updateCustomCase = (val) => {
        setCustomTestCases(prev => prev.map(c =>
            `custom-${c.id}` === activeTestCaseId ? { ...c, input: val } : c
        ));
    };


    // ── editor ──
    const [language, setLanguage] = useState('cpp');
    const [code, setCode] = useState(''); // Init empty, will load from draft/submission
    const [activeResultCase, setActiveResultCase] = useState(0); // result tab index
    const [showSuccessPop, setShowSuccessPop] = useState(false);
    const [successResult, setSuccessResult] = useState(null);

    // ── tabs ──
    const [leftTab, setLeftTab] = useState('description');

    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [isSavingDesc, setIsSavingDesc] = useState(false);

    const addEditExample = () => {
        setEditFormData(prev => ({
            ...prev,
            examples: [...(prev.examples || []), { input: '', output: '', explanation: '' }]
        }));
    };
    const removeEditExample = (idx) => {
        setEditFormData(prev => ({
            ...prev,
            examples: prev.examples.filter((_, i) => i !== idx)
        }));
    };
    const updateEditExample = (idx, field, value) => {
        setEditFormData(prev => {
            const newEx = [...prev.examples];
            newEx[idx] = { ...newEx[idx], [field]: value };
            return { ...prev, examples: newEx };
        });
    };
    const addEditQuizQuestion = () => {
        setEditFormData(prev => ({
            ...prev,
            quizQuestions: [...(prev.quizQuestions || []), { questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, explanation: '' }]
        }));
    };
    const removeEditQuizQuestion = (idx) => {
        setEditFormData(prev => ({
            ...prev,
            quizQuestions: prev.quizQuestions.filter((_, i) => i !== idx)
        }));
    };
    const updateEditQuizQuestion = (idx, field, value, optIdx = -1) => {
        setEditFormData(prev => {
            const newQs = [...prev.quizQuestions];
            if (field === 'options' && optIdx !== -1) {
                const newOpts = [...newQs[idx].options];
                newOpts[optIdx] = value;
                newQs[idx] = { ...newQs[idx], options: newOpts };
            } else {
                newQs[idx] = { ...newQs[idx], [field]: value };
            }
            return { ...prev, quizQuestions: newQs };
        });
    };
    const [editFormData, setEditFormData] = useState({
        title: '',
        description: '',
        constraints: [],
        inputFormat: '',
        outputFormat: '',
        examples: [{ input: '', output: '', explanation: '' }],
        timeComplexity: '',
        spaceComplexity: '',
        quizQuestions: []
    });


    // ── Video workspace state ──
    const [isEditingSummary, setIsEditingSummary] = useState(false);
    const [tempSummary, setTempSummary] = useState('');
    const [tempSummaryLink, setTempSummaryLink] = useState('');
    const [isSavingSummary, setIsSavingSummary] = useState(false);

    const [isEditingResources, setIsEditingResources] = useState(false);
    const [tempResources, setTempResources] = useState([]);
    const [isSavingResources, setIsSavingResources] = useState(false);

    const [activeVideoTab, setActiveVideoTab] = useState('summary');
    const [isEditingQuiz, setIsEditingQuiz] = useState(false);
    const [tempQuiz, setTempQuiz] = useState([]);
    const [isSavingQuiz, setIsSavingQuiz] = useState(false);

    const [bottomTab, setBottomTab] = useState('testcases');

    // ── ui misc ──
    const [isFullScreen, setIsFullScreen] = useState(false);

    const [resultsAnimKey, setResultsAnimKey] = useState(0);

    // ───── fetch problem ──────────────────────────────────────────────────────


    // ───── reset run/submit results when problem changes ─────────────────────
    useEffect(() => {
        resetResults();
        setActiveResultCase(0);
        setBottomTab('testcases');
    }, [problemId, resetResults]);

    // ───── load code draft/submission ─────────────────────────────────────────
    useEffect(() => {
        if (!problemId || !user) return;

        const loadCode = async () => {
            // 1. Check Draft
            const draftKey = `draft_${user.id}_${problemId}_${language}`;
            const draft = localStorage.getItem(draftKey);
            if (draft) {
                setCode(draft);
                return;
            }

            // 2. We no longer auto-fetch previous submissions to save backend load,
            // unless we want to rely entirely on localStorage.
            const previousSubKey = `submission_${user.id}_${problemId}_${language}`;
            const previousCode = localStorage.getItem(previousSubKey);
            if (previousCode) {
                setCode(previousCode);
                return;
            }

            // 3. Default Template
            const tplKey = `tpl_${user.id}_${language}`;
            const customTpl = localStorage.getItem(tplKey);
            setCode(customTpl || DEFAULT_CODE[language]);
        };

        loadCode();

        // 4. Fetch latest submission to show persistent result state
        const fetchLatestResult = async () => {
            try {
                const data = await queryClient.fetchQuery({
                    queryKey: ['submissions', problemId],
                    queryFn: () => submissionService.getProblemSubmissions(problemId)
                });
                const latest = data.submissions?.[0];
                if (latest && (latest.verdict === 'Accepted' || latest.verdict === 'Wrong Answer' || latest.verdict === 'TLE' || latest.verdict === 'Runtime Error')) {
                    // Normalize to match submitResult format
                    const normalized = {
                        problemId,
                        verdict: latest.verdict,
                        testCasesPassed: latest.testCasesPassed || 0,
                        totalTestCases: latest.totalTestCases || 0,
                        results: latest.results || [], // Might be empty if backend doesn't return full results for old subs
                        error: latest.error || null,
                        coinsEarned: 0,
                        totalCoins: 0,
                        isFirstSolve: false,
                        isSubmitMode: true,
                        isCustomInput: false,
                        persisted: true
                    };
                    // Only set if we don't already have a more recent result from this session
                    setSubmitResult(prev => (prev?.persisted || !prev) ? normalized : prev);
                }
            } catch (err) {
                console.warn('Failed to fetch latest submission for persistence:', err);
            }
        };
        fetchLatestResult();

        // 5. Check sessionStorage for Run results from this session
        const cachedRunResult = sessionStorage.getItem(`run_result_${user.id}_${problemId}`);
        if (cachedRunResult) {
            try {
                setRunResult(JSON.parse(cachedRunResult));
            } catch (e) {
                sessionStorage.removeItem(`run_result_${user.id}_${problemId}`);
            }
        }
    }, [problemId, user, language]);

    // ───── save draft ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!problemId || !user || !code) return;
        const timer = setTimeout(() => {
            const draftKey = `draft_${user.id}_${problemId}_${language}`;
            localStorage.setItem(draftKey, code);
        }, 1000);
        return () => clearTimeout(timer);
    }, [code, problemId, language, user]);

    // ───── handle paste ───────────────────────────────────────────────────────
    const handleEditorPaste = (e) => {
        // Simple heuristic: if we want to block external paste, we can just block all paste
        // or try to detect if it's internal.
        // For now, block all paste as requested "no copy paste from outside"
        // This is strictly enforced.
        e.preventDefault();
        toast.error('Paste is disabled in code editor', { icon: '🚫' });
    };

    const handleSaveTemplate = (tplLang, tplCode) => {
        if (!user) return;
        localStorage.setItem(`tpl_${user.id}_${tplLang}`, tplCode);
        toast.success(`Template saved for ${tplLang}`);
        // If current lang matches, ask to apply? Or just save.
        // If current code is empty, maybe apply.
        if (tplLang === language && !code.trim()) {
            setCode(tplCode);
        }
    };


    // ───── auto-switch to results tab + trigger success pop ────────────────────
    useEffect(() => {
        if (runResult || submitResult || execError) {
            setBottomTab('results');
            if (activeResultCase === undefined || activeResultCase === null) setActiveResultCase(0);
        }

        if (submitResult?.verdict === 'Accepted' && submitResult?.problemId === problemId) {
            // Signal global state that this problem was solved
            // Signal global state that this problem was solved
            window.dispatchEvent(new CustomEvent('problemSolved', { detail: { problemId } }));

            // Create a unique key for this submission to avoid double-processing
            // Back-end uses .id for the temp ID in the response
            const resKey = submitResult.submission?.id || submitResult.submission?._id || `${submitResult.testCasesPassed}_${submitResult.totalTestCases}`;
            if (lastResultIdRef.current === resKey) return;
            lastResultIdRef.current = resKey;

            // Show success overlay ONLY if it's the first time this problem is solved (isFirstSolve)
            // This prevents the animation from showing on subsequent correct submissions
            // AND ensure it's not a persisted result from a previous session
            if (!submitResult.persisted && submitResult?.isFirstSolve === true) {
                setSuccessResult(submitResult);
                setShowSuccessPop(true);
            }
            // Invalidate the problem query immediately to show the green tick
            queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
        }

        // Persist run results to sessionStorage for refresh survival
        if (runResult && !runResult.persisted) {
            sessionStorage.setItem(`run_result_${user.id}_${problemId}`, JSON.stringify(runResult));
        }
    }, [submitResult, problemId, problem, user?.id, runResult]);

    // ───── debug: log runResult on change ────────────────────────────────────
    useEffect(() => {
        if (runResult) {
            console.log('[CodeEditor] runResult updated:',
                'total=', runResult.results?.length,
                'custom=', runResult.results?.filter(r => r.isCustom).length,
                'std=', runResult.results?.filter(r => !r.isCustom).length
            );
        }
    }, [runResult]);


    // ───── compilation error markers ─────────────────────────────────────────
    const activeResult = submitResult || runResult;
    const isCompileErr = activeResult?.verdict === 'Compilation Error';
    const compileErrMsg = activeResult?.error || execError;

    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;
        const model = editor.getModel();
        if (!model) return;

        monaco.editor.setModelMarkers(model, 'owner', []);

        if (isCompileErr && compileErrMsg) {
            const markers = [];
            const lines = compileErrMsg.split('\n');
            const patterns = [
                /:(\\d+):(\\d+): error:/,
                /:(\\d+): error:/,
                /line (\\d+)/i,
                /:(\\d+)/
            ];
            for (const line of lines) {
                let match = null;
                for (const pattern of patterns) {
                    match = line.match(pattern);
                    if (match) break;
                }
                if (match) {
                    const lineNum = parseInt(match[1], 10);
                    if (!isNaN(lineNum) && lineNum > 0 && lineNum <= model.getLineCount()) {
                        markers.push({
                            startLineNumber: lineNum,
                            startColumn: 1,
                            endLineNumber: lineNum,
                            endColumn: model.getLineMaxColumn(lineNum),
                            message: line.trim(),
                            severity: monaco.MarkerSeverity.Error
                        });
                    }
                }
            }
            if (markers.length > 0) monaco.editor.setModelMarkers(model, 'owner', markers);
        }
    }, [isCompileErr, compileErrMsg]);

    // ═══ Drag Resize Logic ════════════════════════════════════════════════════
    const dragging = useRef(null);

    const getPos = useCallback((e) => {
        if (e.touches && e.touches[0]) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }, []);

    const onMouseMoveResize = useCallback((e) => {
        const d = dragging.current;
        if (!d || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const { x, y } = getPos(e);
        if (d.type === 'sidebar') {
            const newW = d.startVal + (x - d.startX) / rect.width * 100;
            setSidebarW(Math.min(45, Math.max(10, newW)));
        } else if (d.type === 'desc') {
            const newW = d.startVal + (x - d.startX) / rect.width * 100;
            setDescW(Math.min(70, Math.max(15, newW)));
        } else if (d.type === 'editorH') {
            const newH = d.startVal + (y - d.startY) / rect.height * 100;
            setEditorTopH(Math.min(90, Math.max(10, newH)));
        }
    }, [getPos]);

    const onMouseUpResize = useCallback(() => {
        dragging.current = null;
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', onMouseMoveResize);
            window.addEventListener('mouseup', onMouseUpResize);
            window.addEventListener('touchmove', onMouseMoveResize, { passive: false });
            window.addEventListener('touchend', onMouseUpResize);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMoveResize);
            window.removeEventListener('mouseup', onMouseUpResize);
            window.removeEventListener('touchmove', onMouseMoveResize);
            window.removeEventListener('touchend', onMouseUpResize);
        };
    }, [isResizing, onMouseMoveResize, onMouseUpResize]);

    const startDrag = (type, e) => {
        // e.preventDefault(); // removed to allow touchstart but handle movement
        const pos = getPos(e);
        setIsResizing(true);
        // cursor is handled by the overlay
        document.body.style.userSelect = 'none';
        dragging.current = {
            type,
            startX: pos.x,
            startY: pos.y,
            startVal: type === 'sidebar' ? sidebarW : type === 'desc' ? descW : editorTopH,
        };
    };

    // ───── handlers ──────────────────────────────────────────────────────────
    const handleRun = async () => {
        resetResults(); // Clear stale results
        setBottomTab('results');
        setEditorTopH(35);
        setResultsAnimKey(k => k + 1);
        setActiveResultCase(0);

        const monaco = monacoRef.current;
        const editor = editorRef.current;
        if (monaco && editor) monaco.editor.setModelMarkers(editor.getModel(), 'owner', []);

        if (!navigator.onLine) {
            toast.error('No internet connection', { icon: '📡' });
            return;
        }

        if (!code.trim()) return toast.error('Code cannot be empty');
        // Standard cases (with known expectedOutput) + User-added custom cases (input only)
        const allCasesToRun = [
            // Standard (non-hidden) cases — include expectedOutput for comparison
            ...testCases.map(tc => ({
                input: tc.input,
                expectedOutput: tc.output ?? null,
                isCustom: false
            })),
            // User-added custom cases — only for non-SQL problems
            ...(problem?.type !== 'sql' ? customTestCases.map(cc => ({
                input: cc.input,
                expectedOutput: null,
                isCustom: true
            })) : [])
        ];

        console.log('[handleRun] testCases count:', testCases.length);
        console.log('[handleRun] customTestCases count:', customTestCases.length);
        console.log('[handleRun] allCasesToRun:', JSON.stringify(allCasesToRun));

        await runCode(problemId, code, language, undefined, allCasesToRun);
    };


    const handleSubmit = async () => {
        resetResults(); // Clear stale results
        setBottomTab('results');
        setEditorTopH(35);
        setResultsAnimKey(k => k + 1);
        setActiveResultCase(0);

        const monaco = monacoRef.current;
        const editor = editorRef.current;
        if (monaco && editor) monaco.editor.setModelMarkers(editor.getModel(), 'owner', []);
        if (!code.trim()) return toast.error('Code cannot be empty');
        if (!problemId) return toast.error('Problem ID is missing');
        // if (!window.confirm('Submit solution? This will be tracked.')) return;
        await submitCode(problemId, code, language);
    };

    const handleLangChange = (e) => {
        const newLang = e.target.value;
        const oldLang = language;

        // Save current code to draft immediately to ensure it's not lost
        if (problemId && user && code) {
            localStorage.setItem(`draft_${user.id}_${problemId}_${oldLang}`, code);
        }

        setLanguage(newLang);

        // Explicitly load code for the new language from draft or fallback.
        // This ensures the editor updates immediately and correctly.
        const draftKey = `draft_${user.id}_${problemId}_${newLang}`;
        const draft = localStorage.getItem(draftKey);

        const previousSubKey = `submission_${user.id}_${problemId}_${newLang}`;
        const previousCode = localStorage.getItem(previousSubKey);

        const tplKey = `tpl_${user.id}_${newLang}`;
        const customTpl = localStorage.getItem(tplKey);

        if (draft) {
            setCode(draft);
        } else if (previousCode) {
            setCode(previousCode);
        } else {
            setCode(customTpl || DEFAULT_CODE[newLang]);
        }
    };

    // ───── derived ───────────────────────────────────────────────────────────
    const isActuallyLoading = loading;

    // The main CodeEditor layout will now handle the skeleton/empty state natively 
    // without doing an early return to preserve the Sidebar DOM state.

    // Responsive width calculation
    // If sidebar is shown, it takes `sidebarW` %. If hidden, it takes fixed `COLLAPSED_SIDEBAR_WIDTH` px.
    // Desc takes `descW` %.
    // Right panel (Editor) takes REST.
    const containerStyle = {
        gridTemplateColumns: showSidebar
            ? `${sidebarW}% ${descW}% 1fr`
            : `40px ${descW}% 1fr`,
    };

    // ─── Result data ───────────────────────────────────────────────────────────
    // Unified single result object (prefer submitResult then runResult)
    const displayResult = submitResult || runResult || null;
    const displayResults = displayResult?.results || [];

    // For submit mode: never show per-case tabs/details — only the verdict card.
    // For run mode: show all result cases as before.
    const visibleResults = displayResult?.isSubmitMode ? [] : displayResults;

    // Determine executing state
    const isExecuting = running || submitting;
    // For submit: use all problem test cases (from backend). For run: standard + user-added custom cases.
    const runTotalCases = testCases.length + customTestCases.length || 1;
    const totalTestCasesForProgress = problem?.testCases?.length || testCases.length || 3;

    // ── Handlers for Quiz and Material ──
    const handleCompleteNonCoding = async (answers = null) => {
        setIsSubmittingNonCoding(true);

        // Capture previous state for rollback if needed
        const previousProblemData = queryClient.getQueryData(['problem', problemId]);

        // 1. Optimistic Update: Update the problem cache immediately
        queryClient.setQueryData(['problem', problemId], (old) => {
            if (!old || !old.problem) return old;
            return {
                ...old,
                problem: {
                    ...old.problem,
                    isSolved: true,
                    // Persist answers optimistically if provided (for quizzes)
                    ...(answers ? { savedAnswers: answers } : {})
                }
            };
        });

        // 2. Optimistic Update: UI local state
        if (problem.type === 'quiz') {
            setQuizSubmitted(true);
        }

        try {
            const data = await submissionService.markProblemComplete(problemId, answers);

            // Invalidate queries to sync with real server state
            window.dispatchEvent(new CustomEvent('problemSolved', { detail: { problemId } }));
            queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
            queryClient.invalidateQueries({ queryKey: ['problems'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });

            // Only show coin celebration if it was actually the first solve
            if (data.isFirstSolve && data.coinsEarned > 0) {
                setSuccessResult({
                    coinsEarned: data.coinsEarned,
                    isFirstSolve: true
                });
                setShowSuccessPop(true);
            }

            toast.success("Marked as complete!", { icon: '✅' });
        } catch (error) {
            // Rollback on error
            queryClient.setQueryData(['problem', problemId], previousProblemData);
            if (problem.type === 'quiz') setQuizSubmitted(false);

            toast.error(error.message || 'Failed to mark as complete');
        } finally {
            setIsSubmittingNonCoding(false);
        }
    };

    const handleQuizSubmit = () => {
        if (!problem.quizQuestions || problem.quizQuestions.length === 0) return;

        const total = problem.quizQuestions.length;
        if (Object.keys(quizAnswers).length < total) {
            toast.error('Please answer all questions before submitting.');
            return;
        }

        let correctCount = 0;
        problem.quizQuestions.forEach((q, idx) => {
            // Support both field names: correctOptionIndex (from admin form) and correctAnswer (from JSON import)
            const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctAnswer;
            if (quizAnswers[idx] === correctIdx) {
                correctCount++;
            }
        });

        setQuizSubmitted(true);
        toast.success(`You scored ${correctCount}/${total}! Quiz Completed.`);

        if (!problem.isSolved) {
            handleCompleteNonCoding(quizAnswers);
        }
    };

    return (
        <div
            ref={containerRef}
            className="flex flex-col bg-[#F7F5FF] dark:bg-[#111117] text-gray-800 dark:text-gray-200 select-none overflow-hidden fixed inset-0 z-[100] transition-colors no-scrollbars-all"
        >
            {/* Resizing Overlay - Captures events over iframes/editor */}
            {isResizing && (
                <div
                    className="fixed inset-0 z-[9999]"
                    style={{
                        cursor: dragging.current?.type === 'editorH' ? 'row-resize' : 'col-resize'
                    }}
                />
            )}


            {/* ── Main 3‑column area ─────────────────────────────────────── */}
            <div className={`flex-1 flex flex-col lg:flex-row relative ${isMobile ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}>

                <div
                    style={isMobile ? {
                        width: '280px',
                        position: 'absolute',
                        height: '100%',
                        left: 0,
                        top: 0
                    } : {
                        width: actuallyShowSidebar ? `${sidebarW}%` : '60px',
                        transition: isResizing ? 'none' : 'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }}
                    className={`flex flex-col shrink-0 border-r border-gray-200 dark:border-gray-800 bg-[#F1F3F4] dark:bg-[#111117] z-[200] transition-transform duration-300 ease-in-out ${isMobile && !showSidebar ? '-translate-x-full' : 'translate-x-0'}`}
                >
                    <div className="flex-1 overflow-hidden flex flex-col relative h-full">
                        <ProblemSidebar
                            isCollapsed={!actuallyShowSidebar}
                            onToggle={() => setShowSidebar(!showSidebar)}
                        />
                    </div>

                    {/* Toggle Tab — vertically centered on right edge, matching contest style */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowSidebar(!showSidebar); }}
                        className={`absolute -right-[12px] top-1/2 -translate-y-1/2 z-50 w-[12px] h-12 bg-[#F1F3F4] dark:bg-[#111117] border border-l-0 ${isDark ? 'border-[#282833]' : 'border-gray-200'} rounded-r-md shadow-sm flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors`}
                        title={actuallyShowSidebar ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        <div className="flex flex-col items-center justify-center gap-0.5 opacity-60 group-hover:opacity-100">
                            {actuallyShowSidebar ? <ChevronLeft size={10} strokeWidth={3} /> : <ChevronRight size={10} strokeWidth={3} />}
                        </div>
                    </button>
                </div>

                {/* Mobile overlay for sidebar */}
                {isMobile && showSidebar && (
                    <div className="absolute inset-0 bg-black/50 z-[190]" onClick={() => setShowSidebar(false)} />
                )}

                {!isMobile && actuallyShowSidebar && <DragHandleH onMouseDown={(e) => startDrag('sidebar', e)} />}

                {isActuallyLoading && problemId ? (
                    <div className={`flex-1 flex overflow-hidden animate-pulse ${isMobile ? 'flex-col' : 'flex-row'}`}>
                        {/* Left Panel (Description) */}
                        <div className={`${isMobile ? 'w-full h-[60vh]' : 'w-1/2 border-r'} border-[var(--color-border-interactive)] bg-[#F1F3F4] dark:bg-[#111117] flex flex-col transition-colors`}>
                            <div className="h-10 border-b border-gray-100 dark:border-gray-800 bg-[#F1F3F4] dark:bg-[#111117] flex items-center px-4 gap-4 shrink-0 transition-colors">
                                <div className="w-20 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                <div className="w-20 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                            </div>
                            <div className="p-6 flex flex-col gap-4 flex-1">
                                <div className="w-3/4 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                <div className="flex gap-2">
                                    <div className="w-16 h-6 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                                    <div className="w-20 h-6 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                                </div>
                                <div className="w-full h-4 bg-gray-200 dark:bg-gray-800 rounded mt-4"></div>
                                <div className="w-5/6 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                <div className="w-full h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                            </div>
                        </div>

                        {/* Right Panel (Editor) */}
                        <div className={`${isMobile ? 'w-full h-[40vh]' : 'w-1/2'} flex flex-col bg-[#F1F3F4] dark:bg-[#111117] transition-colors`}>
                            <div className="h-12 border-b border-gray-100 dark:border-gray-800 bg-[#F1F3F4] dark:bg-[#111117] flex items-center justify-between px-3 shrink-0 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-32 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                    <div className="w-24 h-6 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                </div>
                            </div>
                            <div className="flex-1 bg-[#F1F3F4] dark:bg-[#111117] p-6 flex flex-col gap-4 transition-colors">
                                <div className="w-1/3 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-800 rounded ml-4"></div>
                            </div>
                        </div>
                    </div>
                ) : contestSlug && !problemId ? (
                    <InlineContestView
                        contestSlug={contestSlug}
                        courseId={courseId}
                        subId={subId}
                    />
                ) : (!problem && !contestSlug) ? (
                    <div className="flex-1 bg-gray-50 dark:bg-[#111117] flex items-center justify-center relative transition-colors">
                        {/* Actual Empty State message */}
                        <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm animate-fade-in relative -top-10">
                            <div className="w-16 h-16 bg-[#F1F3F4] dark:bg-[#111117] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center mb-5 relative before:absolute before:inset-0 before:bg-primary-50 dark:before:bg-primary-900/10 before:rounded-2xl before:-z-10 before:scale-110 before:opacity-50 transition-colors">
                                <Code2 className="w-8 h-8 text-primary-500 dark:text-primary-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Practice Workspace</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                Select a problem from the sidebar to view its description and start writing your solution.
                            </p>
                        </div>
                    </div>
                ) : (!problem?.type || problem.type === 'coding' || problem.type === 'sql' || problem.type === 'problem') ? (
                    <>
                        {/* ─ Col 2: Description / Editorial / Submissions ─ */}
                        <div style={isMobile ? { flex: 'none', height: '60vh', width: '100%' } : { width: `${descW}%` }} className="flex flex-col overflow-hidden shrink-0 border-r border-gray-200 dark:border-gray-800 border-b md:border-b-0 bg-[#F1F3F4] dark:bg-[#111117] transition-colors">
                            {/* Problem Header (Title & Meta) */}
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111117] shrink-0 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight truncate mr-2" title={problem.title}>
                                        {problem.title}
                                    </h1>
                                </div>
                                <div className="flex items-center gap-3">
                                    <DiffBadge d={problem.difficulty} />
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: isDark ? '#fbbf24' : '#92400e',
                                        background: isDark ? 'linear-gradient(135deg, #2d1a01, #452a02)' : 'linear-gradient(135deg,#fffbeb,#fef3c7)',
                                        border: isDark ? '1px solid #78350f' : '1px solid #fcd34d',
                                        padding: '2px 9px',
                                        borderRadius: 20,
                                        boxShadow: isDark ? '0 0 12px rgba(245,158,11,0.1)' : 'none'
                                    }} className="transition-all duration-300">
                                        <Coins size={11} color={isDark ? '#fbbf24' : '#f59e0b'} className={isDark ? "drop-shadow-[0_0_3px_#fbbf24]" : ""} /> {problem.points} Coins
                                    </span>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex items-center h-10 border-b border-gray-100 dark:border-gray-800 bg-[#F1F3F4] dark:bg-[#111117] shrink-0 transition-colors">
                                {[
                                    { id: 'description', label: 'Description', TabIcon: FileText },
                                    { id: 'editorial', label: 'Editorial', TabIcon: FileText },
                                    { id: 'submissions', label: 'Submissions', TabIcon: CheckSquare },
                                ].map(({ id, label, TabIcon }) => (
                                    <button
                                        key={id}
                                        onClick={() => setLeftTab(id)}
                                        className={`flex items-center gap-1.5 px-4 h-full text-xs font-medium transition-colors border-b-2
                                    ${leftTab === id
                                                ? 'border-purple-600 text-purple-700 dark:text-purple-400 bg-[#F1F3F4] dark:bg-[#111117]'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#23232e]'
                                            }`}
                                    >
                                        <TabIcon size={12} />{label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab content */}
                            <div className="flex-1 overflow-y-auto relative scrollbar-hide bg-[#F1F3F4] dark:bg-[#111117] transition-colors">
                                {loading && (
                                    <div className="absolute inset-0 bg-white/80 dark:bg-[#111117]/80 backdrop-blur-sm z-10 flex justify-center items-center transition-colors">
                                        <Loader2 className="animate-spin text-primary-500" size={24} />
                                    </div>
                                )}

                                {/* ── Description ── */}
                                {leftTab === 'description' && (
                                    <div className="p-6 space-y-6 relative">
                                        {user?.role === 'admin' && !isEditingDesc && (
                                            <button
                                                onClick={() => {
                                                    setEditFormData({
                                                        title: problem.title,
                                                        description: problem.description,
                                                        constraints: problem.constraints || [],
                                                        inputFormat: problem.inputFormat || '',
                                                        outputFormat: problem.outputFormat || '',
                                                        examples: problem.examples || [{ input: '', output: '', explanation: '' }],
                                                        timeComplexity: problem.timeComplexity || '',
                                                        spaceComplexity: problem.spaceComplexity || '',
                                                        quizQuestions: problem.quizQuestions || []
                                                    });
                                                    setIsEditingDesc(true);
                                                }}
                                                className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-md transition-colors"
                                            >
                                                <Edit3 size={14} /> Edit Problem
                                            </button>
                                        )}

                                        {isEditingDesc ? (
                                            <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
                                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                                                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Full Edit: {problem.title}</h3>
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-[#18181b] px-2 py-1 rounded">Markdown Supported</div>
                                                </div>

                                                <div className="space-y-4">
                                                    {/* Title & Description */}
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Problem Title</label>
                                                        <input 
                                                            value={editFormData.title} 
                                                            onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                                                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Description</label>
                                                        <textarea
                                                            value={editFormData.description}
                                                            onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                                            className="w-full h-64 p-3 font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none resize-y"
                                                            placeholder="Main problem statement..."
                                                        />
                                                    </div>

                                                    {(problem.type === 'problem' || problem.type === 'sql') && (
                                                        <>
                                                            {/* Constraints */}
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Constraints (Each line is one)</label>
                                                                <textarea
                                                                    value={(editFormData.constraints || []).join('\n')}
                                                                    onChange={(e) => setEditFormData({...editFormData, constraints: e.target.value.split('\n')})}
                                                                    className="w-full h-32 p-3 font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none resize-y"
                                                                />
                                                            </div>

                                                            {/* Format */}
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Input Format (Optional)</label>
                                                                    <textarea
                                                                        value={editFormData.inputFormat}
                                                                        onChange={(e) => setEditFormData({...editFormData, inputFormat: e.target.value})}
                                                                        className="w-full h-32 p-3 font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none resize-y"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Output Format (Optional)</label>
                                                                    <textarea
                                                                        value={editFormData.outputFormat}
                                                                        onChange={(e) => setEditFormData({...editFormData, outputFormat: e.target.value})}
                                                                        className="w-full h-32 p-3 font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none resize-y"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Examples */}
                                                            <div className="space-y-4 pt-2">
                                                                <div className="flex items-center justify-between">
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase">Examples</label>
                                                                    <button onClick={addEditExample} className="text-[10px] font-bold text-primary-600 hover:underline">+ Add Example</button>
                                                                </div>
                                                                {editFormData.examples.map((ex, idx) => (
                                                                    <div key={idx} className="p-4 bg-gray-50 dark:bg-[#18181b] border border-gray-100 dark:border-gray-800 rounded-xl space-y-3 relative group">
                                                                        <button onClick={() => removeEditExample(idx)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <div>
                                                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Input</label>
                                                                                <textarea 
                                                                                    value={ex.input} 
                                                                                    onChange={e => updateEditExample(idx, 'input', e.target.value)}
                                                                                    className="w-full p-2 text-xs font-mono bg-[#F1F3F4] dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded h-20 outline-none"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Output</label>
                                                                                <textarea 
                                                                                    value={ex.output} 
                                                                                    onChange={e => updateEditExample(idx, 'output', e.target.value)}
                                                                                    className="w-full p-2 text-xs font-mono bg-[#F1F3F4] dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded h-20 outline-none"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Explanation</label>
                                                                            <input 
                                                                                value={ex.explanation} 
                                                                                onChange={e => updateEditExample(idx, 'explanation', e.target.value)}
                                                                                className="w-full px-2 py-1.5 text-xs bg-[#F1F3F4] dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded outline-none"
                                                                                placeholder="e.g. Because 2 is prime..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Complexity */}
                                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Time Complexity</label>
                                                                    <input 
                                                                        value={editFormData.timeComplexity} 
                                                                        onChange={e => setEditFormData({...editFormData, timeComplexity: e.target.value})}
                                                                        className="w-full px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-lg outline-none"
                                                                        placeholder="e.g. O(N)"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Space Complexity</label>
                                                                    <input 
                                                                        value={editFormData.spaceComplexity} 
                                                                        onChange={e => setEditFormData({...editFormData, spaceComplexity: e.target.value})}
                                                                        className="w-full px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-lg outline-none"
                                                                        placeholder="e.g. O(1)"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {problem.type === 'quiz' && (
                                                        <div className="space-y-6 pt-4">
                                                            <div className="flex items-center justify-between">
                                                                <label className="block text-[10px] font-bold text-gray-400 uppercase">Quiz Questions</label>
                                                                <button onClick={addEditQuizQuestion} className="text-[10px] font-bold text-primary-600 hover:underline">+ Add Question</button>
                                                            </div>
                                                            {editFormData.quizQuestions.map((q, qIdx) => (
                                                                <div key={qIdx} className="p-4 bg-gray-50 dark:bg-[#18181b] border border-gray-100 dark:border-gray-800 rounded-xl space-y-4 relative group">
                                                                    <button onClick={() => removeEditQuizQuestion(qIdx)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                                                    <div>
                                                                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Question {qIdx + 1}</label>
                                                                        <textarea 
                                                                            value={q.questionText} 
                                                                            onChange={e => updateEditQuizQuestion(qIdx, 'questionText', e.target.value)}
                                                                            className="w-full p-2 text-sm bg-[#F1F3F4] dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded h-20 outline-none"
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                        {q.options.map((opt, oIdx) => (
                                                                            <div key={oIdx}>
                                                                                <label className="block text-[8px] font-bold text-gray-400 mb-1 flex items-center justify-between">
                                                                                    Option {oIdx + 1}
                                                                                    <button 
                                                                                        onClick={() => updateEditQuizQuestion(qIdx, 'correctOptionIndex', oIdx)}
                                                                                        className={`text-[8px] px-1 rounded ${q.correctOptionIndex === oIdx ? 'bg-emerald-500 text-white' : 'text-gray-400 border border-gray-200'}`}
                                                                                    >
                                                                                        {q.correctOptionIndex === oIdx ? 'Correct' : 'Mark Correct'}
                                                                                    </button>
                                                                                </label>
                                                                                <input 
                                                                                    value={opt} 
                                                                                    onChange={e => updateEditQuizQuestion(qIdx, 'options', e.target.value, oIdx)}
                                                                                    className="w-full px-2 py-1 text-xs bg-[#F1F3F4] dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded outline-none"
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Explanation</label>
                                                                        <input 
                                                                            value={q.explanation || ''} 
                                                                            onChange={e => updateEditQuizQuestion(qIdx, 'explanation', e.target.value)}
                                                                            className="w-full px-2 py-1.5 text-xs bg-[#F1F3F4] dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded outline-none"
                                                                            placeholder="Why this is correct..."
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 justify-end pt-6 border-t border-[var(--color-border-interactive)]">
                                                    <button
                                                        onClick={() => setIsEditingDesc(false)}
                                                        className="px-5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#1c1c24] hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            setIsSavingDesc(true);
                                                            try {
                                                                await problemService.updateProblem(problemId, editFormData);
                                                                queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
                                                                toast.success('Problem updated successfully');
                                                                setIsEditingDesc(false);
                                                            } catch (error) {
                                                                toast.error(error.message || 'Failed to update problem');
                                                            } finally {
                                                                setIsSavingDesc(false);
                                                            }
                                                        }}
                                                        disabled={isSavingDesc}
                                                        className="flex items-center gap-1.5 px-8 py-2.5 text-xs font-black text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-primary-500/20"
                                                    >
                                                        {isSavingDesc ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 font-problem prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-p:leading-relaxed prose-code:text-primary-700 dark:prose-code:text-gray-200 prose-code:bg-primary-50 dark:prose-code:bg-[#23232e] prose-code:px-1 prose-code:rounded">
                                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={MarkdownComponents}>
                                                    {cleanDescription(problem.description)}
                                                </ReactMarkdown>
                                            </div>
                                        )}

                                        {problem.constraints?.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Constraints</h3>
                                                <ul className="bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg px-4 py-2.5 space-y-1 transition-colors">
                                                    {problem.constraints.map((c, i) => (
                                                        <li key={i} className={`text-xs font-mono text-gray-700 dark:text-gray-300 ${problem.constraints.length > 1 ? 'list-disc list-inside' : 'list-none'}`}>{c}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {(problem.inputFormat || extractInputFormat(problem.description)) && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Input Format</h3>
                                                <div className="bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 prose dark:prose-invert prose-sm max-w-none transition-colors [&>p:last-child]:!mb-0">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={MarkdownComponents}>
                                                        {problem.inputFormat || extractInputFormat(problem.description)}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}

                                        {(problem.outputFormat || extractOutputFormat(problem.description)) && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Output Format</h3>
                                                <div className="bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 transition-colors">
                                                    {problem.type === 'sql' ? (
                                                        <div className="bg-gray-50/50 dark:bg-[#111117]/50 rounded-lg border border-gray-100 dark:border-gray-800/50 p-1">
                                                            <PipeTableDisplay tableStr={problem.outputFormat || extractOutputFormat(problem.description)} />
                                                        </div>
                                                    ) : (
                                                        <div className="prose dark:prose-invert prose-sm max-w-none [&>p:last-child]:!mb-0">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={MarkdownComponents}>
                                                                {problem.outputFormat || extractOutputFormat(problem.description)}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {problem.examples?.map((ex, i) => (
                                            <div key={i} className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
                                                <div className="bg-gray-50 dark:bg-[#111117] border-b border-gray-100 dark:border-gray-800 px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                                    Example {i + 1}
                                                </div>
                                                <div className="p-4 space-y-3 bg-[#F1F3F4] dark:bg-[#111117]">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Input</p>
                                                        <pre className="bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded p-2 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap transition-colors">{ex.input}</pre>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Expected Output</p>
                                                        {problem.type === 'sql' ? (
                                                            <div className="bg-gray-50/50 dark:bg-[#111117]/50 rounded-lg border border-gray-100 dark:border-gray-800/50 p-1">
                                                                <PipeTableDisplay tableStr={ex.output} />
                                                            </div>
                                                        ) : (
                                                            <pre className="bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded p-2 text-xs font-mono text-gray-600 dark:text-white whitespace-pre-wrap opacity-80 select-text transition-colors">{ex.output}</pre>
                                                        )}
                                                    </div>
                                                    {ex.explanation && (
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Explanation</p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 bg-primary-50 dark:bg-primary-900/20 rounded p-2 border border-primary-100 dark:border-primary-900/50 transition-colors">{ex.explanation}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {problem.edgeCases?.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Edge Cases</h3>
                                                <ul className="bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg p-4 space-y-1 transition-colors">
                                                    {problem.edgeCases.map((c, i) => (
                                                        <li key={i} className={`text-xs font-mono text-gray-700 dark:text-gray-300 ${problem.edgeCases.length > 1 ? 'list-disc list-inside' : 'list-none'}`}>{c}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {(problem.timeComplexity || problem.spaceComplexity) && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2">Complexity</h3>
                                                <div className="bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg p-4 space-y-2 transition-colors">
                                                    {problem.timeComplexity && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Time:</span>
                                                            <span className="text-sm font-mono text-gray-800 dark:text-gray-200 bg-[#F1F3F4] dark:bg-[#111117] border border-gray-100 dark:border-gray-800 px-2 py-0.5 rounded shadow-sm">{problem.timeComplexity}</span>
                                                        </div>
                                                    )}
                                                    {problem.spaceComplexity && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Space:</span>
                                                            <span className="text-sm font-mono text-gray-800 dark:text-gray-200 bg-[#F1F3F4] dark:bg-[#111117] border border-gray-100 dark:border-gray-800 px-2 py-0.5 rounded shadow-sm">{problem.spaceComplexity}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Editorial ── */}
                                {leftTab === 'editorial' && (
                                    <EditorialRenderer
                                        problem={problem}
                                        isAdmin={user?.role === 'admin'}
                                        hasViewedEditorial={hasViewedEditorial}
                                        onUnlockEditorial={() => setHasViewedEditorial(true)}
                                        onUpdateLinks={async (editorialLink, videoUrl) => {
                                            await problemService.updateProblem(problemId, { editorialLink, videoUrl });
                                            // Refresh problem data
                                            queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
                                        }}
                                    />
                                )}

                                {/* ── Submissions ── */}
                                {leftTab === 'submissions' && <SubmissionsTab problemId={problemId} />}
                            </div>
                        </div>

                        {/* drag handle between desc and editor (hidden on mobile) */}
                        {!isMobile && <DragHandleH onMouseDown={(e) => startDrag('desc', e)} />}

                        {/* ─ Col 3: Editor + Test Cases (vertical split) ─ */}
                        <div style={isMobile ? { flex: 'none', height: '80vh', width: '100%' } : {
                            width: actuallyShowSidebar ? `calc(${100 - sidebarW - descW}%)` : `calc(100% - 60px - ${descW}%)`,
                            transition: isResizing ? 'none' : 'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }} className="flex flex-col overflow-hidden bg-[#F1F3F4] dark:bg-[#111117] transition-colors">

                            {/* ── Code Editor ── */}
                            <div

                                style={{
                                    height: `${editorTopH}%`,
                                    transition: isResizing ? 'none' : 'height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                }}
                                className="flex flex-col overflow-hidden"
                            >
                                {showSettings && (
                                    <SettingsModal
                                        settings={editorSettings}
                                        onClose={() => setShowSettings(false)}
                                        onSave={(newSettings) => {
                                            setEditorSettings(newSettings);
                                            localStorage.setItem('editor_settings', JSON.stringify(newSettings));
                                        }}
                                    />
                                )}
                                {/* editor toolbar (Language + Timer + Actions) */}
                                <div className="h-12 bg-[#F1F3F4] dark:bg-[#111117] border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-2 shrink-0 transition-colors overflow-visible">
                                    {/* Left: Language & Timer */}
                                    <div className="flex items-center gap-1.5 sm:gap-3">
                                        <div className="w-24 sm:w-44 shrink-0">
                                            <CustomDropdown
                                                options={problem?.type === 'sql' ? SQL_LANGUAGE_OPTIONS : LANGUAGE_OPTIONS}
                                                value={language}
                                                onChange={(val) => handleLangChange({ target: { value: val } })}
                                                size="small"
                                            />
                                        </div>
                                        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 transition-colors shrink-0" />
                                        <ProblemTimer />
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2">


                                        <button
                                            onClick={() => setShowSettings(true)}
                                            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#23232e] rounded-md transition-colors"
                                            title="Editor Settings"
                                        >
                                            <Settings size={16} />
                                        </button>

                                        <div className="flex items-center bg-gray-100 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg p-0.5 transition-colors">
                                            <button
                                                onClick={handleRun}
                                                disabled={isExecuting}
                                                className="btn-secondary flex items-center gap-1 px-2 sm:px-3 py-1.5 text-[10px] ml-0"
                                                title="Run Sample Cases"
                                            >
                                                {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} className="fill-current" />}
                                                <span className="hidden min-[450px]:inline-block sm:inline-block">Run</span>
                                            </button>
                                            <button
                                                onClick={handleSubmit}
                                                disabled={isExecuting}
                                                className="btn-primary flex items-center gap-1 px-2 sm:px-3 py-1.5 ml-0.5 text-[10px]"
                                                title="Submit Code"
                                            >
                                                {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                                <span className="hidden min-[450px]:inline-block sm:inline-block">Submit</span>
                                            </button>
                                        </div>

                                        {/* Fullscreen button removed as requested */}
                                    </div>
                                </div>

                                {/* monaco */}
                                <div className="flex-1 overflow-hidden">
                                    <Editor
                                        height="100%"
                                        language={(problem?.type === 'sql' ? SQL_LANGUAGE_OPTIONS : LANGUAGE_OPTIONS).find(l => l.value === language)?.monacoLang || (problem?.type === 'sql' ? 'sql' : 'cpp')}
                                        value={code}
                                        onChange={v => setCode(v || '')}
                                        onMount={(editor, monaco) => {
                                            editorRef.current = editor;
                                            monacoRef.current = monaco;

                                            // ── Internal-only clipboard ───────────────────────────────
                                            // Only text copied within THIS editor can be pasted back.
                                            // External clipboard content is blocked entirely.
                                            const internalClip = { text: '' };

                                            // Ctrl+C: save selected text internally, also copy to system clipboard
                                            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
                                                const sel = editor.getSelection();
                                                if (sel && !sel.isEmpty()) {
                                                    internalClip.text = editor.getModel().getValueInRange(sel);
                                                }
                                                editor.trigger('keyboard', 'editor.action.clipboardCopyAction', null);
                                            });
                                            // Ctrl+X: cut, save internally
                                            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
                                                const sel = editor.getSelection();
                                                if (sel && !sel.isEmpty()) {
                                                    internalClip.text = editor.getModel().getValueInRange(sel);
                                                }
                                                editor.trigger('keyboard', 'editor.action.clipboardCutAction', null);
                                            });
                                            // Ctrl+V: paste ONLY from internal clipboard
                                            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
                                                if (!internalClip.text) {
                                                    toast.error('Paste from external sources is disabled', { icon: '🚫', id: 'paste-blocked' });
                                                    return;
                                                }
                                                const sel = editor.getSelection();
                                                editor.executeEdits('internal-paste', [{
                                                    range: sel,
                                                    text: internalClip.text,
                                                    forceMoveMarkers: true
                                                }]);
                                            });
                                            // Shift+Insert (alternate paste shortcut)
                                            editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Insert, () => {
                                                if (!internalClip.text) return;
                                                const sel = editor.getSelection();
                                                editor.executeEdits('internal-paste', [{
                                                    range: sel,
                                                    text: internalClip.text,
                                                    forceMoveMarkers: true
                                                }]);
                                            });
                                            // Block DOM-level paste (right-click context menu / drag from outside)
                                            const editorDomNode = editor.getDomNode();
                                            if (editorDomNode) {
                                                editorDomNode.addEventListener('paste', (e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }, true);
                                            }
                                        }}
                                        theme={isDark ? 'antigravity-dark' : 'vs-light'}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: editorSettings.fontSize,
                                            fontFamily: editorSettings.fontFamily || 'Menlo, Monaco, Consolas, "Courier New", monospace',
                                            fontLigatures: true,
                                            lineNumbers: 'on',
                                            renderLineHighlight: 'all',
                                            scrollBeyondLastLine: false,
                                            scrollbar: {
                                                vertical: 'hidden',
                                                horizontal: 'hidden',
                                                handleMouseWheel: true,
                                            },
                                            automaticLayout: true,
                                            padding: { top: 16, bottom: 16 },
                                        }}
                                    />
                                </div>
                            </div>

                            <DragHandleV
                                onMouseDown={(e) => startDrag('editorH', e)}
                                onTouchStart={(e) => startDrag('editorH', e)}
                            />

                            {/* ── Bottom: Test Cases / Results ── */}
                            <div
                                key={resultsAnimKey}
                                style={{ height: `${100 - editorTopH}%`, transition: isResizing ? 'none' : 'height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                                className="flex flex-col overflow-hidden border-t border-gray-100 dark:border-gray-700 transition-colors"
                                data-results-panel
                            >
                                {/* bottom tabs */}
                                <div className="flex items-center h-9 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111117] shrink-0 px-1 transition-colors">
                                    <button
                                        onClick={() => setBottomTab('testcases')}
                                        className={`flex items-center gap-1.5 px-4 h-full text-xs font-medium transition-colors border-b-2
                                    ${bottomTab === 'testcases' ? 'border-purple-600 text-purple-700 dark:text-purple-400 bg-[#F1F3F4] dark:bg-[#111117]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:bg-[#111117]'}`}
                                    >
                                        <List size={12} /> Test Cases
                                    </button>

                                    <button
                                        onClick={() => setBottomTab('results')}
                                        className={`flex items-center gap-1.5 px-4 h-full text-xs font-medium transition-colors border-b-2
                                    ${bottomTab === 'results' ? 'border-purple-600 text-purple-700 dark:text-purple-400 bg-[#F1F3F4] dark:bg-[#111117]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#23232e]'}`}
                                    >
                                        {isCompileErr ? (
                                            <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                                                <AlertTriangle size={12} /> Compilation Error
                                            </span>
                                        ) : displayResult && !isExecuting ? (
                                            <span className={`flex items-center gap-1.5 ${displayResult.verdict === 'Accepted' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {displayResult.verdict === 'Accepted'
                                                    ? <CheckCircle size={12} />
                                                    : <XCircle size={12} />
                                                }
                                                {displayResult.isSubmitMode ? 'Submission Result' : 'Run Result'}
                                            </span>
                                        ) : (
                                            <>
                                                <Terminal size={12} /> Results
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* bottom content */}
                                <div className="flex-1 overflow-hidden bg-[#F1F3F4] dark:bg-[#111117] transition-colors">

                                    {/* ── Test Cases tab ── */}
                                    {bottomTab === 'testcases' && (
                                        <div className="flex flex-col h-full font-problem bg-[#F1F3F4] dark:bg-[#111117] transition-colors">
                                            {/* Tabs */}
                                            <div className="flex items-center gap-0.5 px-2 py-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto scrollbar-hide shrink-0 bg-[#F1F3F4] dark:bg-[#111117]">
                                                {/* Standard Cases */}
                                                {testCases.map((_, i) => (
                                                    <button
                                                        key={`case-${i}`}
                                                        onClick={() => setActiveTestCaseId(`case-${i}`)}
                                                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border
                                                    ${activeTestCaseId === `case-${i}`
                                                                ? 'bg-gray-100 dark:bg-[#111117] border-[var(--color-border-interactive)] text-gray-900 dark:text-gray-100 font-semibold shadow-sm'
                                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#23232e]'
                                                            }`}
                                                    >
                                                        Case {i + 1}
                                                    </button>
                                                ))}

                                                {/* Custom Cases (non-SQL ONLY) */}
                                                {problem?.type !== 'sql' && (
                                                    <>
                                                        {customTestCases.map((c) => (
                                                            <div key={c.id} className="relative group">
                                                                <button
                                                                    onClick={() => setActiveTestCaseId(`custom-${c.id}`)}
                                                                    className={`pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border flex items-center gap-1
                                                                    ${activeTestCaseId === `custom-${c.id}`
                                                                            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 font-semibold shadow-sm'
                                                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#23232e]'
                                                                        }`}
                                                                >
                                                                    Case {testCases.length + customTestCases.indexOf(c) + 1}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleRemoveCustomCase(c.id, e)}
                                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X size={10} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        ))}

                                                        {/* Add Button */}
                                                        <button
                                                            onClick={handleAddCustomCase}
                                                            className="ml-1 p-1.5 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                                            title="Add Custom Test Case"
                                                        >
                                                            <Plus size={14} strokeWidth={3} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                            {/* Inputs Area */}
                                            <div className="flex-1 p-4 overflow-y-auto scrollbar-hide bg-[#F1F3F4] dark:bg-[#111117]">
                                                {activeTestCaseId.startsWith('case-') ? (
                                                    // Standard Case View
                                                    (() => {
                                                        const idx = parseInt(activeTestCaseId.split('-')[1]);
                                                        const tc = testCases[idx];
                                                        if (!tc) return null;

                                                        const isSql = problem?.type === 'sql';

                                                        return (
                                                            <div className="space-y-4 max-w-2xl">
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5">
                                                                        {isSql ? 'Input Tables' : 'Input'}
                                                                    </p>
                                                                    {isSql ? (
                                                                        <SqlTableDisplay tables={parseSqlToTables(tc.input)} />
                                                                    ) : (
                                                                        <div className="w-full bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap select-text transition-colors">
                                                                            {tc.input}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5">
                                                                        {isSql ? 'Expected Result' : 'Expected Output'}
                                                                    </p>
                                                                    {isSql ? (
                                                                        <PipeTableDisplay tableStr={tc.output} />
                                                                    ) : (
                                                                        <div className="w-full bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm font-mono text-gray-600 dark:text-gray-200 whitespace-pre-wrap opacity-80 select-text transition-colors">
                                                                            {tc.output}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    // Custom Case View
                                                    (() => {
                                                        const cCase = customTestCases.find(c => `custom-${c.id}` === activeTestCaseId);
                                                        if (!cCase) return <div className="text-gray-400 text-sm">Case not found.</div>;
                                                        return (
                                                            <div className="space-y-2 h-full flex flex-col">
                                                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Input</p>
                                                                <textarea
                                                                    className="flex-1 w-full bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm font-mono text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-primary-400 focus:border-primary-400 outline-none resize-none transition-colors"
                                                                    value={cCase.input}
                                                                    onChange={(e) => updateCustomCase(e.target.value)}
                                                                    placeholder="Enter input here..."
                                                                />
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Results tab ── */}
                                    {bottomTab === 'results' && (
                                        <div className="h-full overflow-y-auto scrollbar-hide flex flex-col bg-[#F1F3F4] dark:bg-[#111117] transition-colors" style={{ animation: 'slide-up-results 0.28s cubic-bezier(0.16,1,0.3,1) both' }}>

                                            {/* ── Network Error (Priority check) ── */}
                                            {!isExecuting && isOffline && (
                                                <div className="flex flex-col bg-red-50/30 dark:bg-red-900/10 transition-colors">
                                                    <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 px-4 py-3 flex items-center gap-2 shrink-0 transition-colors">
                                                        <div className="bg-red-100 dark:bg-red-900/40 p-1.5 rounded-full">
                                                            <XCircle size={16} className="text-red-600 dark:text-red-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-red-800 dark:text-red-200 font-bold text-sm">Network Error</h3>
                                                            <p className="text-xs text-red-600 dark:text-red-400">No internet connection. Please check your network and try again.</p>
                                                        </div>
                                                        <button
                                                            onClick={() => bottomTab === 'testcases' ? handleRun() : handleSubmit()}
                                                            className="px-3 py-1 bg-[#F1F3F4] dark:bg-[#111117] border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-md text-[10px] font-bold hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            Retry
                                                        </button>
                                                    </div>
                                                    <div className="p-8 text-center animate-in fade-in duration-500">
                                                        <div className="w-16 h-16 rounded-full bg-red-100/50 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto transition-colors">
                                                            <XCircle size={32} className="text-red-500 dark:text-red-400" />
                                                        </div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-4">
                                                            We couldn't reach the execution server. Please check your internet connection and try again.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Executing (live progress) ── */}
                                            {isExecuting && (
                                                <ExecutionProgress
                                                    isRunning={running}
                                                    isSubmitting={submitting}
                                                    total={submitting ? totalTestCasesForProgress : runTotalCases}
                                                />
                                            )}

                                            {/* ── Compilation Error ── */}
                                            {!isExecuting && !isOffline && isCompileErr && (
                                                <div className="flex flex-col bg-orange-50/30 dark:bg-orange-900/10 transition-colors">
                                                    <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/30 px-4 py-3 flex items-center gap-2 shrink-0 transition-colors">
                                                        <div className="bg-orange-100 dark:bg-orange-900/40 p-1.5 rounded-full">
                                                            <AlertTriangle className="text-orange-600 dark:text-orange-400" size={16} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-orange-800 dark:text-orange-200 font-bold text-sm">Compilation Error</h3>
                                                            <p className="text-xs text-orange-600 dark:text-orange-400">Check your code for syntax errors</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <pre className="font-mono text-xs text-orange-700 dark:text-orange-300 bg-orange-50/50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-lg p-3 whitespace-pre-wrap leading-relaxed shadow-sm transition-colors">
                                                            {compileErrMsg || 'Unknown error'}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Has results ── */}
                                            {!isExecuting && !isCompileErr && displayResult && (
                                                <div className="flex flex-col h-full font-problem">
                                                    {/* ── Verdict Header ── */}
                                                    {(() => {
                                                        const vc = getVerdictColor(displayResult.verdict);
                                                        const isAccepted = displayResult.verdict === 'Accepted';
                                                        const isTLE = displayResult.verdict === 'TLE';
                                                        const isSubmit = displayResult.isSubmitMode;
                                                        return (
                                                            <div className={`px-5 py-4 border-b shrink-0 ${vc.bg} ${vc.border} transition-colors`}>
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`p-2 rounded-full ${isAccepted ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : isTLE ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'} transition-colors`}>
                                                                            {isAccepted ? <CheckCircle size={20} /> : isTLE ? <Clock size={20} /> : <XCircle size={20} />}
                                                                        </div>
                                                                        <div>
                                                                            <h2 className={`text-lg font-bold ${vc.text}`}>
                                                                                {displayResult.verdict}
                                                                            </h2>
                                                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                                                <span className={`text-sm font-medium ${vc.text}`}>
                                                                                    {displayResult.testCasesPassed} / {displayResult.totalTestCases} testcases passed
                                                                                </span>
                                                                                {isSubmit && (
                                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">All Test Cases</span>
                                                                                )}
                                                                                {/* Show custom case count badge if custom cases were run */}
                                                                                {!isSubmit && displayResult.results?.some(r => r.isCustom) && (
                                                                                    <span className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium transition-colors">
                                                                                        {displayResult.results.filter(r => r.isCustom).length} custom
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Coins earned badge (submit only) */}
                                                                    {isSubmit && displayResult.coinsEarned > 0 && (
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <span className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-500 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                                                                                <Coins size={14} />
                                                                                +{displayResult.coinsEarned} Alpha Coins
                                                                            </span>
                                                                            {displayResult.totalCoins > 0 && (
                                                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                                                                                    Total: {displayResult.totalCoins} coins
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* ── SUBMIT MODE: Clean summary only, no per-case details ── */}
                                                    {displayResult.isSubmitMode && (
                                                        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-8">
                                                            {/* Big status circle */}
                                                            {(() => {
                                                                const v = displayResult.verdict;
                                                                const isAC = v === 'Accepted';
                                                                const isTLE = v === 'TLE';
                                                                const isWA = v === 'Wrong Answer';
                                                                const isRE = v === 'Runtime Error';
                                                                const pct = displayResult.totalTestCases > 0
                                                                    ? Math.round((displayResult.testCasesPassed / displayResult.totalTestCases) * 100)
                                                                    : 0;
                                                                const circleColor = isAC ? '#22c55e' : isTLE ? '#eab308' : '#ef4444';
                                                                const bgColor = isAC ? '#f0fdf4' : isTLE ? '#fefce8' : '#fef2f2';
                                                                const radius = 52;
                                                                const circ = 2 * Math.PI * radius;
                                                                const dash = (pct / 100) * circ;
                                                                return (
                                                                    <div className="flex flex-col items-center gap-4">
                                                                        {/* Circular progress */}
                                                                        <div style={{ position: 'relative', width: 140, height: 140 }}>
                                                                            <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                                                                                <circle cx="70" cy="70" r={radius} fill="none" stroke={isDark ? '#23232e' : '#e5e7eb'} strokeWidth="10" />
                                                                                <circle
                                                                                    cx="70" cy="70" r={radius}
                                                                                    fill="none"
                                                                                    stroke={circleColor}
                                                                                    strokeWidth="10"
                                                                                    strokeDasharray={`${dash} ${circ - dash}`}
                                                                                    strokeLinecap="round"
                                                                                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                                                                                />
                                                                            </svg>
                                                                            <div style={{
                                                                                position: 'absolute', inset: 0,
                                                                                display: 'flex', flexDirection: 'column',
                                                                                alignItems: 'center', justifyContent: 'center'
                                                                            }}>
                                                                                <span style={{ fontSize: 22, fontWeight: 800, color: circleColor, lineHeight: 1 }}>
                                                                                    {displayResult.testCasesPassed}
                                                                                </span>
                                                                                <span style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#9ca3af', fontWeight: 600 }}>
                                                                                    / {displayResult.totalTestCases}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Verdict chips */}
                                                                        <div className="flex flex-col items-center gap-2">
                                                                            <span style={{
                                                                                background: isDark ? `${circleColor}20` : bgColor, color: circleColor,
                                                                                border: `1.5px solid ${circleColor}30`,
                                                                                borderRadius: 99, padding: '4px 18px',
                                                                                fontWeight: 700, fontSize: 13, letterSpacing: '0.02em'
                                                                            }}>
                                                                                {v}
                                                                            </span>
                                                                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium text-center">
                                                                                {isAC && 'Great job! All test cases passed.'}
                                                                                {isTLE && `${displayResult.testCasesPassed} cases passed before time limit was exceeded.`}
                                                                                {isWA && `${displayResult.testCasesPassed} / ${displayResult.totalTestCases} cases correct.`}
                                                                                {isRE && 'Your code crashed on a test case.'}
                                                                                {v === 'Compilation Error' && 'Fix your compile errors and resubmit.'}
                                                                            </p>
                                                                        </div>

                                                                        {/* Runtime error message */}
                                                                        {displayResult.error && !isAC && (
                                                                            <div className="w-full max-w-sm">
                                                                                <p className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase mb-1">Error</p>
                                                                                <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap transition-colors text-center">
                                                                                    {displayResult.error}
                                                                                </pre>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}


                                                    {/* ── Test Case Tabs (LeetCode style) ── */}
                                                    {visibleResults.length > 0 && (
                                                        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto scrollbar-hide shrink-0 bg-[#F1F3F4] dark:bg-[#111117] transition-colors">
                                                            {visibleResults.map((r, i) => {
                                                                const label = `Case ${i + 1}`;
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => setActiveResultCase(i)}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border
                                                                        ${activeResultCase === i
                                                                                ? `${r.passed
                                                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-900/50 text-green-700 dark:text-green-400'
                                                                                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-400'
                                                                                } font-semibold`
                                                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#23232e]'
                                                                            }`}
                                                                    >
                                                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.passed ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                        {label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* ── Result Details ── */}
                                                    <div className="flex-1 p-4 overflow-y-auto bg-[#F1F3F4] dark:bg-[#111117]">
                                                        {visibleResults[activeResultCase] ? (
                                                            <div className="space-y-4 max-w-3xl">
                                                                {/* Hidden test case placeholder */}
                                                                {visibleResults[activeResultCase].isHidden ? (
                                                                    <div className={`p-10 text-center border-2 border-dashed rounded-xl transition-colors ${visibleResults[activeResultCase].passed ? 'border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10' : 'border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10'}`}>
                                                                        <Lock size={24} className={`mx-auto mb-3 ${visibleResults[activeResultCase].passed ? 'text-green-400' : 'text-red-400'}`} />
                                                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Hidden Test Case</p>
                                                                        <p className={`text-sm font-semibold mt-2 ${visibleResults[activeResultCase].passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                            {visibleResults[activeResultCase].passed ? '✓ Passed' : '✗ Failed'}
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Input and expected output are hidden</p>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {/* Pass / Fail badge — hide for SQL errors since the error card is shown instead */}
                                                                        {!(problem?.type === 'sql' && visibleResults[activeResultCase].error) && (
                                                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${visibleResults[activeResultCase].passed ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                                                                                {visibleResults[activeResultCase].passed
                                                                                    ? <><CheckCircle size={12} /> Passed</>
                                                                                    : <><XCircle size={12} /> {visibleResults[activeResultCase].verdict || 'Failed'}</>
                                                                                }
                                                                            </div>
                                                                        )}

                                                                        {/* SQL Error — show prominently before anything else */}
                                                                        {problem?.type === 'sql' && visibleResults[activeResultCase].error ? (
                                                                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl overflow-hidden">
                                                                                <div className="bg-red-100 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-900/30 flex items-center gap-2">
                                                                                    <div className="bg-red-200 dark:bg-red-900/40 p-1 rounded-full">
                                                                                        <XCircle size={12} className="text-red-600 dark:text-red-400" />
                                                                                    </div>
                                                                                    <p className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">SQL Error</p>
                                                                                </div>
                                                                                <pre className="p-4 text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap leading-relaxed">
                                                                                    {visibleResults[activeResultCase].error}
                                                                                </pre>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                {/* Input */}
                                                                                <div>
                                                                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5">
                                                                                        {problem?.type === 'sql' ? 'Input Tables' : 'Input'}
                                                                                    </p>
                                                                                    {problem?.type === 'sql' ? (
                                                                                        <SqlTableDisplay tables={parseSqlToTables(visibleResults[activeResultCase].input)} />
                                                                                    ) : (
                                                                                        <div className="bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap min-h-[48px] transition-colors">
                                                                                            {visibleResults[activeResultCase].input ?? <span className="text-gray-400 dark:text-gray-500 italic">N/A</span>}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Your Output + Expected side by side */}
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                    {/* Your Output */}
                                                                                    <div>
                                                                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5">
                                                                                            {problem?.type === 'sql' ? 'Your Result' : 'Your Output'}
                                                                                        </p>
                                                                                        {problem?.type === 'sql' ? (
                                                                                            <PipeTableDisplay
                                                                                                tableStr={visibleResults[activeResultCase].actualOutput}
                                                                                                colorScheme={visibleResults[activeResultCase].passed ? 'green' : 'red'}
                                                                                            />
                                                                                        ) : (
                                                                                            <div className={`rounded-lg p-3 text-sm font-mono whitespace-pre-wrap border min-h-[48px] transition-colors
                                                                                        ${visibleResults[activeResultCase].passed
                                                                                                    ? 'bg-green-50/40 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-gray-900 dark:text-gray-200'
                                                                                                    : 'bg-red-50/40 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-gray-900 dark:text-gray-200'
                                                                                                }`}
                                                                                            >
                                                                                                {visibleResults[activeResultCase].actualOutput || <span className="text-gray-400 dark:text-gray-500 italic">No output</span>}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {/* Expected Output */}
                                                                                    {visibleResults[activeResultCase].expectedOutput &&
                                                                                        visibleResults[activeResultCase].expectedOutput !== '(No reference solution available)' ? (
                                                                                        <div>
                                                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5">
                                                                                                {problem?.type === 'sql' ? 'Expected Result' : 'Expected Output'}
                                                                                            </p>
                                                                                            {problem?.type === 'sql' ? (
                                                                                                <PipeTableDisplay tableStr={visibleResults[activeResultCase].expectedOutput} />
                                                                                            ) : (
                                                                                                <div className="bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm font-mono text-gray-600 dark:text-white whitespace-pre-wrap min-h-[48px] transition-colors">
                                                                                                    {visibleResults[activeResultCase].expectedOutput}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : visibleResults[activeResultCase].isCustom ? (
                                                                                        <div>
                                                                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1.5">Expected Output</p>
                                                                                            <div className="bg-gray-50 dark:bg-[#111117] border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm font-mono text-gray-400 dark:text-gray-500 whitespace-pre-wrap min-h-[48px] italic transition-colors">
                                                                                                No reference solution available for custom input
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : null}
                                                                                </div>

                                                                                {/* Runtime error / stderr (for non-SQL problems) */}
                                                                                {visibleResults[activeResultCase].error && problem?.type !== 'sql' && (
                                                                                    <div>
                                                                                        <p className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase mb-1.5">Error / Traceback</p>
                                                                                        <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg text-xs font-mono whitespace-pre-wrap transition-colors">
                                                                                            {visibleResults[activeResultCase].error}
                                                                                        </pre>
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-xs">
                                                                {/* No result data for this case. */}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── No results yet ── */}
                                            {!isExecuting && !displayResult && !execError && (
                                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3 transition-colors">
                                                    <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-[#111117] flex items-center justify-center transition-colors">
                                                        <Play size={20} className="ml-1 text-gray-300 dark:text-gray-600" />
                                                    </div>
                                                    <p className="text-sm font-medium">Run code to view results</p>
                                                </div>
                                            )}

                                            {/* ── Generic error (no results) ── */}
                                            {!isExecuting && !isOffline && execError && !displayResult && !isCompileErr && (
                                                <div className="p-4 transition-colors">
                                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
                                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">Error</p>
                                                        <p className="text-xs text-red-700 dark:text-red-300">{execError}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : problem?.type === 'video' ? (
                    (() => {
                        const isAdmin = user?.role === 'admin';
                        const summaryVisible = Boolean(problem.lectureSummary?.trim() || problem.lectureSummaryLink?.trim());
                        const resourcesVisible = Boolean(problem.resources?.length > 0);
                        const quizVisible = Boolean(problem.quizQuestions?.some(q => (q.question || q.questionText)?.trim()));
                        const missingAny = isAdmin && (!summaryVisible || !resourcesVisible || !quizVisible);

                        return (
                            <div className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0A0A0F] custom-scrollbar p-4 sm:p-6 lg:p-8 pb-32">
                                <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8">

                                    {/* Video Player Section */}
                                    <div className="w-full bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/40 border border-gray-200/50 dark:border-gray-800 ring-1 ring-gray-900/5 dark:ring-white/5 transition-all">
                                        <div className="w-full aspect-video relative group">
                                            <SecureVideoPlayer
                                                url={problem.videoUrl}
                                                title={problem.title}
                                                onComplete={() => handleCompleteNonCoding(null)}
                                                isSolved={problem.isSolved}
                                                isSubmitting={isSubmittingNonCoding}
                                            />
                                        </div>
                                    </div>

                                    {/* Content Card Section */}
                                    {(summaryVisible || resourcesVisible || quizVisible || isAdmin) && (
                                        <div className="w-full bg-[#F1F3F4] dark:bg-[#13131A] rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-gray-800/80 p-5 sm:p-8 md:p-10 transition-colors">

                                            {/* Tabs Navbar */}
                                            <div className="flex items-center gap-2 sm:gap-3 border-b border-gray-100 dark:border-gray-800/60 pb-3 mb-5 overflow-x-auto custom-scrollbar shrink-0 scroll-smooth">
                                                {summaryVisible && (
                                                    <button
                                                        onClick={() => setActiveVideoTab('summary')}
                                                        className={`hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap ${activeVideoTab === 'summary'
                                                            ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                                                            : 'text-gray-500'
                                                            }`}
                                                    >
                                                        <FileText size={16} className={activeVideoTab === 'summary' ? '' : 'opacity-70'} />
                                                        Summary
                                                    </button>
                                                )}
                                                {resourcesVisible && (
                                                    <button
                                                        onClick={() => setActiveVideoTab('resources')}
                                                        className={`hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap ${activeVideoTab === 'resources'
                                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : 'text-gray-500'
                                                            }`}
                                                    >
                                                        <Download size={16} className={activeVideoTab === 'resources' ? '' : 'opacity-70'} />
                                                        Resources
                                                    </button>
                                                )}
                                                {quizVisible && (
                                                    <button
                                                        onClick={() => setActiveVideoTab('quiz')}
                                                        className={`hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap ${activeVideoTab === 'quiz'
                                                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                            : 'text-gray-500'
                                                            }`}
                                                    >
                                                        <Code2 size={16} className={activeVideoTab === 'quiz' ? '' : 'opacity-70'} />
                                                        Quiz
                                                    </button>
                                                )}

                                                {isAdmin && missingAny && (
                                                    <div className="hidden sm:flex items-center gap-1.5 border-l border-[var(--color-border-interactive)] ml-1.5 pl-3">
                                                        {!summaryVisible && (
                                                            <button
                                                                onClick={() => { setActiveVideoTab('summary'); setIsEditingSummary(true); }}
                                                                className="text-[11px] font-black uppercase tracking-wider text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors flex items-center gap-1"
                                                            >
                                                                <Plus size={12} /> Summary
                                                            </button>
                                                        )}
                                                        {!resourcesVisible && (
                                                            <button
                                                                onClick={() => { setActiveVideoTab('resources'); setIsEditingResources(true); }}
                                                                className="text-[11px] font-black uppercase tracking-wider text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors flex items-center gap-1"
                                                            >
                                                                <Plus size={12} /> Resources
                                                            </button>
                                                        )}
                                                        {!quizVisible && (
                                                            <button
                                                                onClick={() => { setActiveVideoTab('quiz'); setTempQuiz([]); setIsEditingQuiz(true); }}
                                                                className="text-[11px] font-black uppercase tracking-wider text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors flex items-center gap-1"
                                                            >
                                                                <Plus size={12} /> Quiz
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Lecture Summary Content */}
                                            {activeVideoTab === 'summary' && (summaryVisible || isAdmin) && (
                                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <div className="flex items-center justify-between mb-5">
                                                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                                            Lecture Summary
                                                        </h2>
                                                        {isAdmin && !isEditingSummary && (
                                                            <button
                                                                onClick={() => {
                                                                    setTempSummary(problem.lectureSummary || '');
                                                                    setTempSummaryLink(problem.lectureSummaryLink || '');
                                                                    setIsEditingSummary(true);
                                                                }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-md transition-colors"
                                                            >
                                                                <Edit3 size={14} /> Edit Summary
                                                            </button>
                                                        )}
                                                    </div>

                                                    {isEditingSummary ? (
                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Direct Markdown Content</label>
                                                                <textarea
                                                                    value={tempSummary}
                                                                    onChange={(e) => setTempSummary(e.target.value)}
                                                                    className="w-full h-48 p-4 font-mono text-sm text-gray-800 dark:text-gray-200 bg-[#F1F3F4] dark:bg-[#111117] border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none resize-y transition-colors shadow-sm"
                                                                    placeholder="Write summary in Markdown... (will be ignored if link is provided)"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">GitHub Summary Link (Primary)</label>
                                                                <input
                                                                    type="text"
                                                                    value={tempSummaryLink}
                                                                    onChange={(e) => setTempSummaryLink(e.target.value)}
                                                                    className="w-full px-4 py-2 font-mono text-sm text-gray-800 dark:text-gray-200 bg-[#F1F3F4] dark:bg-[#111117] border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors shadow-sm"
                                                                    placeholder="https://github.com/user/repo/blob/main/lecture.md"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2 justify-end">
                                                                <button
                                                                    onClick={() => setIsEditingSummary(false)}
                                                                    className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-[#282833] hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        setIsSavingSummary(true);
                                                                        try {
                                                                            await problemService.updateProblem(problemId, {
                                                                                lectureSummary: tempSummary,
                                                                                lectureSummaryLink: tempSummaryLink
                                                                            });
                                                                            queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
                                                                            toast.success('Summary updated');
                                                                            setIsEditingSummary(false);
                                                                        } catch (error) {
                                                                            toast.error(error.message || 'Failed to update summary');
                                                                        } finally {
                                                                            setIsSavingSummary(false);
                                                                        }
                                                                    }}
                                                                    disabled={isSavingSummary}
                                                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                                                >
                                                                    {isSavingSummary ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                                    Save Summary
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-[13.5px] leading-6">
                                                            {problem.lectureSummaryLink ? (
                                                                <EditorialRenderer
                                                                    problem={{ ...problem, editorialLink: problem.lectureSummaryLink }}
                                                                    isAdmin={false}
                                                                    hideVideo={true}
                                                                    hasViewedEditorial={true}
                                                                />
                                                            ) : problem.lectureSummary ? (
                                                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={MarkdownComponents}>
                                                                    {problem.lectureSummary}
                                                                </ReactMarkdown>
                                                            ) : (
                                                                <p className="text-gray-400 italic">No summary provided.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Resources Content */}
                                            {activeVideoTab === 'resources' && (resourcesVisible || isAdmin) && (
                                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <div className="flex items-center justify-between mb-6">
                                                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight">
                                                            Attachments & Links
                                                        </h2>
                                                        {isAdmin && !isEditingResources && (
                                                            <button
                                                                onClick={() => {
                                                                    setTempResources([...(problem.resources || [])]);
                                                                    setIsEditingResources(true);
                                                                }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-md transition-colors"
                                                            >
                                                                <Edit3 size={14} /> Edit Resources
                                                            </button>
                                                        )}
                                                    </div>

                                                    {isEditingResources ? (
                                                        <div className="space-y-4">
                                                            {tempResources.map((res, i) => (
                                                                <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-[#F1F3F4] dark:bg-[#111117] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                                    <select
                                                                        value={res.type || 'link'}
                                                                        onChange={e => {
                                                                            const newRes = [...tempResources];
                                                                            newRes[i].type = e.target.value;
                                                                            setTempResources(newRes);
                                                                        }}
                                                                        className="px-3 py-2 bg-gray-50 dark:bg-[#1C1C24] border border-gray-100 dark:border-gray-800 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none w-full sm:w-auto"
                                                                    >
                                                                        <option value="link">Link</option>
                                                                        <option value="file">File (URL)</option>
                                                                    </select>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Title..."
                                                                        value={res.title || ''}
                                                                        onChange={e => {
                                                                            const newRes = [...tempResources];
                                                                            newRes[i].title = e.target.value;
                                                                            setTempResources(newRes);
                                                                        }}
                                                                        className="flex-1 px-3 py-2 w-full sm:w-auto bg-gray-50 dark:bg-[#1C1C24] border border-gray-100 dark:border-gray-800 rounded-lg text-sm outline-none text-gray-800 dark:text-gray-200 focus:border-primary-500"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="URL..."
                                                                        value={res.url || ''}
                                                                        onChange={e => {
                                                                            const newRes = [...tempResources];
                                                                            newRes[i].url = e.target.value;
                                                                            setTempResources(newRes);
                                                                        }}
                                                                        className="flex-1 px-3 py-2 w-full sm:w-auto bg-gray-50 dark:bg-[#1C1C24] border border-gray-100 dark:border-gray-800 rounded-lg text-sm outline-none text-gray-800 dark:text-gray-200 focus:border-primary-500"
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            setTempResources(tempResources.filter((_, idx) => idx !== i));
                                                                        }}
                                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full sm:w-auto flex justify-center"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => setTempResources([...tempResources, { type: 'link', title: '', url: '' }])}
                                                                className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 font-bold hover:underline py-2"
                                                            >
                                                                <Plus size={16} /> Add Resource
                                                            </button>

                                                            <div className="flex items-center gap-2 justify-end pt-2">
                                                                <button
                                                                    onClick={() => setIsEditingResources(false)}
                                                                    className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-[#282833] hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        setIsSavingResources(true);
                                                                        try {
                                                                            const validResources = tempResources.filter(r => r.title?.trim() && r.url?.trim());
                                                                            await problemService.updateProblem(problemId, { resources: validResources });
                                                                            queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
                                                                            toast.success('Resources updated');
                                                                            setIsEditingResources(false);
                                                                        } catch (error) {
                                                                            toast.error(error.message || 'Failed to update resources');
                                                                        } finally {
                                                                            setIsSavingResources(false);
                                                                        }
                                                                    }}
                                                                    disabled={isSavingResources}
                                                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                                                >
                                                                    {isSavingResources ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                                    Save Resources
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {problem.resources?.length > 0 ? problem.resources.map((res, i) => (
                                                                <a
                                                                    key={i}
                                                                    href={res.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all group shadow-sm ${isDark ? 'bg-[#15151A] border-gray-800 hover:bg-[#1A1A22] hover:border-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                                                                >
                                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isDark ? 'bg-[#1C1C24] group-hover:bg-[#24242F]' : 'bg-gray-100 group-hover:bg-primary-50'}`}>
                                                                        {res.type === 'file' ? (
                                                                            <Download size={20} className="text-primary-500" />
                                                                        ) : (
                                                                            <ExternalLink size={20} className="text-emerald-500" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0 flex-1">
                                                                        <span className={`text-[15px] font-bold truncate transition-colors ${isDark ? 'text-gray-200 group-hover:text-white' : 'text-gray-800 group-hover:text-primary-700'}`}>
                                                                            {res.title}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                            {res.type === 'file' ? 'Downloadable Material' : 'External Article / Link'}
                                                                        </span>
                                                                    </div>
                                                                </a>
                                                            )) : (
                                                                <p className="text-gray-400 italic text-sm">No resources attached to this lecture.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeVideoTab === 'quiz' && (quizVisible || isAdmin) && (
                                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <div className="flex items-center justify-between mb-6">
                                                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight">
                                                            Check Your Understanding
                                                        </h2>
                                                        {isAdmin && !isEditingQuiz && (
                                                            <button
                                                                onClick={() => {
                                                                    setTempQuiz(problem.quizQuestions ? JSON.parse(JSON.stringify(problem.quizQuestions)) : []);
                                                                    setIsEditingQuiz(true);
                                                                }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-md transition-colors"
                                                            >
                                                                <Edit3 size={14} /> Edit Quiz
                                                            </button>
                                                        )}
                                                    </div>

                                                    {isEditingQuiz ? (
                                                        <div className="space-y-6">
                                                            {tempQuiz.map((q, qIdx) => (
                                                                <div key={qIdx} className="bg-[#F1F3F4] dark:bg-[#15151A] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm relative">
                                                                    <button
                                                                        onClick={() => {
                                                                            setTempQuiz(tempQuiz.filter((_, idx) => idx !== qIdx));
                                                                        }}
                                                                        className="absolute top-4 right-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                    <div className="mb-4 pr-10">
                                                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1">Question</label>
                                                                        <textarea
                                                                            value={q.question || q.questionText || ''}
                                                                            onChange={e => {
                                                                                const nq = [...tempQuiz];
                                                                                nq[qIdx].question = e.target.value;
                                                                                nq[qIdx].questionText = e.target.value;
                                                                                setTempQuiz(nq);
                                                                            }}
                                                                            className="w-full bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-amber-500 resize-y min-h-[80px]"
                                                                            placeholder="Type your question..."
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-3 mb-4">
                                                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1">Options</label>
                                                                        {(q.options || []).map((opt, oIdx) => (
                                                                            <div key={oIdx} className="flex items-center gap-3">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`correct_${qIdx}`}
                                                                                    checked={(q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctAnswer) === oIdx}
                                                                                    onChange={() => {
                                                                                        const nq = [...tempQuiz];
                                                                                        nq[qIdx].correctOptionIndex = oIdx;
                                                                                        nq[qIdx].correctAnswer = oIdx;
                                                                                        setTempQuiz(nq);
                                                                                    }}
                                                                                    className="w-4 h-4 text-amber-500 cursor-pointer"
                                                                                />
                                                                                <input
                                                                                    type="text"
                                                                                    value={opt}
                                                                                    onChange={e => {
                                                                                        const nq = [...tempQuiz];
                                                                                        nq[qIdx].options[oIdx] = e.target.value;
                                                                                        setTempQuiz(nq);
                                                                                    }}
                                                                                    className="flex-1 bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-amber-500"
                                                                                    placeholder={`Option ${oIdx + 1}`}
                                                                                />
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const nq = [...tempQuiz];
                                                                                        nq[qIdx].options = nq[qIdx].options.filter((_, idx) => idx !== oIdx);
                                                                                        // Adjust correct index if needed
                                                                                        const currCorrect = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctAnswer;
                                                                                        if (currCorrect === oIdx) {
                                                                                            nq[qIdx].correctOptionIndex = 0;
                                                                                            nq[qIdx].correctAnswer = 0;
                                                                                        } else if (currCorrect > oIdx) {
                                                                                            nq[qIdx].correctOptionIndex = currCorrect - 1;
                                                                                            nq[qIdx].correctAnswer = currCorrect - 1;
                                                                                        }
                                                                                        setTempQuiz(nq);
                                                                                    }}
                                                                                    className="text-red-400 hover:text-red-600 p-1"
                                                                                >
                                                                                    <X size={16} />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                        {(!q.options || q.options.length < 5) && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    const nq = [...tempQuiz];
                                                                                    if (!nq[qIdx].options) nq[qIdx].options = [];
                                                                                    nq[qIdx].options.push("");
                                                                                    setTempQuiz(nq);
                                                                                }}
                                                                                className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline ml-7"
                                                                            >
                                                                                <Plus size={12} /> Add Option
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1">Explanation (Optional)</label>
                                                                        <textarea
                                                                            value={q.explanation || ''}
                                                                            onChange={e => {
                                                                                const nq = [...tempQuiz];
                                                                                nq[qIdx].explanation = e.target.value;
                                                                                setTempQuiz(nq);
                                                                            }}
                                                                            className="w-full bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-lg p-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-amber-500 resize-y min-h-[60px]"
                                                                            placeholder="Explain why the correct answer is right..."
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => {
                                                                    setTempQuiz([...tempQuiz, { question: '', options: ['', ''], correctOptionIndex: 0, explanation: '' }]);
                                                                }}
                                                                className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-bold hover:underline py-2"
                                                            >
                                                                <Plus size={16} /> Add Question
                                                            </button>
                                                            <div className="flex items-center gap-2 justify-end pt-2">
                                                                <button
                                                                    onClick={() => setIsEditingQuiz(false)}
                                                                    className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-[#282833] hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        setIsSavingQuiz(true);
                                                                        try {
                                                                            // Validation
                                                                            for (let i = 0; i < tempQuiz.length; i++) {
                                                                                if (!tempQuiz[i].question?.trim() && !tempQuiz[i].questionText?.trim()) throw new Error(`Question ${i + 1} is empty`);
                                                                                if (!tempQuiz[i].options || tempQuiz[i].options.length < 2) throw new Error(`Question ${i + 1} must have at least 2 options`);
                                                                                const correctIdx = tempQuiz[i].correctOptionIndex !== undefined ? tempQuiz[i].correctOptionIndex : tempQuiz[i].correctAnswer;
                                                                                if (correctIdx === undefined || correctIdx < 0 || correctIdx >= tempQuiz[i].options.length) throw new Error(`Question ${i + 1} has invalid correct option selected`);
                                                                            }
                                                                            await problemService.updateProblem(problemId, { quizQuestions: tempQuiz });
                                                                            queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
                                                                            toast.success('Quiz updated');
                                                                            setIsEditingQuiz(false);
                                                                        } catch (error) {
                                                                            toast.error(error.message || 'Failed to update quiz');
                                                                        } finally {
                                                                            setIsSavingQuiz(false);
                                                                        }
                                                                    }}
                                                                    disabled={isSavingQuiz}
                                                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                                                >
                                                                    {isSavingQuiz ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                                    Save Quiz
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-6">
                                                            {problem.quizQuestions.map((q, qIdx) => {
                                                                const selectedOpt = quizAnswers[qIdx] ?? problem.savedAnswers?.[qIdx];
                                                                const isAnswered = selectedOpt !== undefined;
                                                                const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctAnswer;

                                                                return (
                                                                    <div key={qIdx} className="bg-[#F1F3F4] dark:bg-[#15151A] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                                                                        <h3 className="text-[16px] font-bold text-gray-800 dark:text-gray-100 mb-5 leading-relaxed">
                                                                            <span className="text-primary-500 dark:text-primary-400 mr-2">Q{qIdx + 1}.</span>
                                                                            {q.question || q.questionText}
                                                                        </h3>
                                                                        <div className="grid grid-cols-1 gap-3">
                                                                            {q.options?.map((opt, oIdx) => {
                                                                                const isThisSelected = selectedOpt === oIdx;
                                                                                const isCorrectOpt = correctIdx === oIdx;

                                                                                let btnClass = isDark
                                                                                    ? "border-gray-700 bg-[#1A1A22] hover:border-gray-500 hover:bg-[#20202A]"
                                                                                    : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white";
                                                                                let textClass = "text-gray-700 dark:text-gray-300 font-medium";
                                                                                let icon = null;

                                                                                if (isAnswered) {
                                                                                    if (isCorrectOpt) {
                                                                                        btnClass = isDark
                                                                                            ? "border-emerald-500/50 bg-emerald-500/10"
                                                                                            : "border-emerald-500 bg-emerald-50";
                                                                                        textClass = "text-emerald-700 dark:text-emerald-400 font-bold";
                                                                                        icon = <CheckCircle2 size={18} className="text-emerald-500" />;
                                                                                    } else if (isThisSelected) {
                                                                                        btnClass = isDark
                                                                                            ? "border-red-500/50 bg-red-500/10"
                                                                                            : "border-red-500 bg-red-50";
                                                                                        textClass = "text-red-700 dark:text-red-400 font-bold";
                                                                                        icon = <XCircle size={18} className="text-red-500" />;
                                                                                    } else {
                                                                                        btnClass = isDark ? "border-gray-800 bg-[#111117] opacity-60" : "border-gray-100 bg-white opacity-60";
                                                                                    }
                                                                                }

                                                                                return (
                                                                                    <button
                                                                                        key={oIdx}
                                                                                        disabled={isAnswered}
                                                                                        onClick={() => {
                                                                                            setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
                                                                                            if (!problem.isSolved) {
                                                                                                // Auto mark as complete if they interact with quiz
                                                                                                handleCompleteNonCoding(null);
                                                                                            }
                                                                                        }}
                                                                                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${btnClass} ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                                                                                    >
                                                                                        <span className={`text-[15px] ${textClass}`}>{opt}</span>
                                                                                        {icon}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                        {isAnswered && q.explanation && (
                                                                            <div className={`mt-5 p-4 rounded-xl text-sm border ${isDark ? 'bg-primary-900/10 border-primary-900/30 text-gray-300' : 'bg-primary-50 border-primary-100 text-gray-700'}`}>
                                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                                                                    <span className="font-bold text-gray-900 dark:text-gray-100 tracking-wide uppercase text-[11px]">Explanation</span>
                                                                                </div>
                                                                                <p className="leading-relaxed pl-3.5">
                                                                                    {q.explanation}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <div className={`flex-1 overflow-x-hidden ${problem.type === 'quiz' ? 'bg-gray-50 dark:bg-[#0A0A0F] h-full flex flex-col' : 'bg-[#F1F3F4] dark:bg-[#111117] overflow-y-auto custom-scrollbar'}`}>
                        <div className={`${(problem.type === 'material' || problem.type === 'article') ? 'w-full' : problem.type === 'quiz' ? 'flex-1 flex flex-col p-4 sm:p-6 lg:p-8 h-full min-h-0' : 'max-w-5xl mx-auto p-4 sm:p-6 md:p-10'}`}>
                            {/* Header Section */}
                            <div className={`${problem.type === 'quiz' ? 'mb-6 pb-4 shrink-0' : 'mb-10 pb-6'} border-b border-gray-100 dark:border-gray-800 flex items-center justify-between w-full`}>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-4">
                                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">{problem.title}</h1>
                                        {user?.role === 'admin' && (
                                            <button 
                                                onClick={() => {
                                                    setEditFormData({
                                                        title: problem.title,
                                                        description: problem.description,
                                                        constraints: problem.constraints || [],
                                                        inputFormat: problem.inputFormat || '',
                                                        outputFormat: problem.outputFormat || '',
                                                        examples: problem.examples || [{ input: '', output: '', explanation: '' }],
                                                        timeComplexity: problem.timeComplexity || '',
                                                        spaceComplexity: problem.spaceComplexity || '',
                                                        quizQuestions: problem.quizQuestions || []
                                                    });
                                                    setIsEditingDesc(true);
                                                }}
                                                className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
                                                title="Edit Content"
                                            >
                                                <Edit3 size={20} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${problem.type === 'quiz' ? 'bg-amber-600/10 text-amber-600' : 'bg-emerald-600/10 text-emerald-600'}`}>
                                            {(problem.type === 'material' || problem.type === 'article') ? 'ARTICLE' : 'QUIZ'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Content based on problem type */}
                            <div className="w-full">
                                {(problem.type === 'material' || problem.type === 'article') && (
                                    <div className="max-w-4xl mx-auto py-4 animate-in fade-in duration-500">
                                        <div className={`bg-[#F1F3F4] dark:bg-[#111827] rounded-3xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 transition-colors ${!isDark ? 'shadow-sm' : ''}`}>
                                            <EditorialRenderer
                                                problem={problem}
                                                isAdmin={user?.role === 'admin'}
                                                hasViewedEditorial={true}
                                                onUnlockEditorial={() => setHasViewedEditorial(true)}
                                                onUpdateLinks={async (editorialLink, videoUrl) => {
                                                    await problemService.updateProblem(problemId, { editorialLink, videoUrl });
                                                    queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
                                                }}
                                                hideVideo={true}
                                            />

                                            {/* Mark as Read Button */}
                                            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                                                {problem.isSolved ? (
                                                    <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 font-black text-xs uppercase tracking-widest">
                                                        <CheckCircle size={18} />
                                                        Completed & Read
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCompleteNonCoding(null)}
                                                        disabled={isSubmittingNonCoding}
                                                        className="flex items-center gap-2 px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-primary-500/20 disabled:opacity-50"
                                                    >
                                                        {isSubmittingNonCoding ? <Loader2 size={18} className="animate-spin" /> : <CheckSquare size={18} />}
                                                        Mark as Read
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {problem.type === 'quiz' && (
                                   <div className="w-full">
                                {isEditingDesc ? (
                                    <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-700 slide-in-from-bottom-8">
                                        <div className="bg-[#F1F3F4] dark:bg-[#0F1117] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-2xl shadow-primary-500/5">
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                                                    <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Full Edit: {problem.title}</h3>
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-[#18181b] px-2 py-1 rounded font-bold">Admin Workspace</div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Item Title</label>
                                                        <input 
                                                            value={editFormData.title} 
                                                            onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                                                            className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Main Content / Description (Markdown)</label>
                                                        <textarea
                                                            value={editFormData.description}
                                                            onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                                            className="w-full h-96 p-4 font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none resize-y transition-all"
                                                            placeholder="Markdown content..."
                                                        />
                                                    </div>

                                                    {problem.type === 'quiz' && (
                                                        <div className="space-y-6 pt-6 border-t border-[var(--color-border-interactive)]">
                                                            <div className="flex items-center justify-between">
                                                                <label className="block text-[10px] font-bold text-gray-400 uppercase">Quiz Questions</label>
                                                                <button onClick={addEditQuizQuestion} className="text-[11px] font-black text-primary-600 hover:text-primary-700 transition-colors">+ Add New Question</button>
                                                            </div>
                                                            <div className="space-y-4">
                                                                {editFormData.quizQuestions.map((q, qIdx) => (
                                                                    <div key={qIdx} className="p-6 bg-gray-50 dark:bg-[#18181b] border border-gray-100 dark:border-gray-800 rounded-3xl space-y-4 relative group">
                                                                        <button onClick={() => removeEditQuizQuestion(qIdx)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                                                        <div>
                                                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Question Text</label>
                                                                            <textarea 
                                                                                value={q.questionText} 
                                                                                onChange={e => updateEditQuizQuestion(qIdx, 'questionText', e.target.value)}
                                                                                className="w-full p-3 text-sm bg-[#F1F3F4] dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-xl h-24 outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            {q.options.map((opt, oIdx) => (
                                                                                <div key={oIdx} className={`p-3 rounded-2xl border transition-all ${q.correctOptionIndex === oIdx ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-[#F1F3F4] dark:bg-[#0A0A0F] border-[var(--color-border-interactive)]'}`}>
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <span className="text-[8px] font-black text-gray-400 uppercase">Option {oIdx + 1}</span>
                                                                                        <button 
                                                                                            onClick={() => updateEditQuizQuestion(qIdx, 'correctOptionIndex', oIdx)}
                                                                                            className={`text-[9px] font-black px-2 py-0.5 rounded-full transition-all ${q.correctOptionIndex === oIdx ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-emerald-500'}`}
                                                                                        >
                                                                                            {q.correctOptionIndex === oIdx ? 'CORRECT' : 'SET CORRECT'}
                                                                                        </button>
                                                                                    </div>
                                                                                    <input 
                                                                                        value={opt} 
                                                                                        onChange={e => updateEditQuizQuestion(qIdx, 'options', e.target.value, oIdx)}
                                                                                        className="w-full bg-transparent text-sm font-bold outline-none"
                                                                                    />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className="pt-2">
                                                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Explanation (Optional)</label>
                                                                            <input 
                                                                                value={q.explanation || ''} 
                                                                                onChange={e => updateEditQuizQuestion(qIdx, 'explanation', e.target.value)}
                                                                                className="w-full px-4 py-2.5 text-xs bg-[#F1F3F4] dark:bg-[#0A0A0F] border border-gray-100 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                                                                                placeholder="Why this answer is correct..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 justify-end pt-8 border-t border-[var(--color-border-interactive)]">
                                                    <button
                                                        onClick={() => setIsEditingDesc(false)}
                                                        className="px-6 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-50 dark:bg-[#18181b] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            setIsSavingDesc(true);
                                                            try {
                                                                await problemService.updateProblem(problemId, editFormData);
                                                                queryClient.invalidateQueries({ queryKey: ['problem', problemId] });
                                                                toast.success('Updated successfully');
                                                                setIsEditingDesc(false);
                                                            } catch (error) {
                                                                toast.error(error.message || 'Update failed');
                                                            } finally {
                                                                setIsSavingDesc(false);
                                                            }
                                                        }}
                                                        disabled={isSavingDesc}
                                                        className="flex items-center gap-2 px-8 py-3 text-xs font-black text-white bg-primary-600 hover:bg-primary-700 rounded-2xl transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-primary-500/20"
                                                    >
                                                        {isSavingDesc ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                        Save All Changes
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full">
                                        {(quizSubmitted || problem.isSolved) && !quizStarted ? (
                                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                                <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20 border border-white/20">
                                                    <Trophy size={48} className="text-white" />
                                                </div>
                                                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Quiz Completed!</h2>
                                                <p className="text-gray-500 dark:text-gray-400 font-medium mb-10 text-center">You've successfully mastered this quiz content.</p>

                                                <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-12">
                                                    <div className="bg-[#F1F3F4] dark:bg-[#111827] border border-gray-100 dark:border-gray-800 p-8 rounded-3xl text-center shadow-sm">
                                                        <div className="text-4xl font-black text-emerald-500 mb-1">
                                                            {problem.quizQuestions?.filter((q, i) => {
                                                                const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctAnswer;
                                                                return quizAnswers[i] !== undefined && parseInt(quizAnswers[i]) === parseInt(correctIdx);
                                                            }).length}
                                                        </div>
                                                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.2em]">Correct</div>
                                                    </div>
                                                    <div className="bg-[#F1F3F4] dark:bg-[#111827] border border-gray-100 dark:border-gray-800 p-8 rounded-3xl text-center shadow-sm">
                                                        <div className="text-4xl font-black text-gray-400 mb-1">
                                                            {problem.quizQuestions?.length || 0}
                                                        </div>
                                                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.2em]">Total</div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => { setQuizSubmitted(false); setQuizStarted(true); }}
                                                    className="px-8 py-3 bg-gray-900 dark:bg-amber-600 text-white rounded-2xl font-black text-sm transition-all hover:scale-105 shadow-xl shadow-black/10 shadow-amber-900/10"
                                                >
                                                    Review Answers
                                                </button>
                                            </div>
                                        ) : !quizStarted ? (
                                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                                <div className="mb-10 relative">
                                                    <div className="absolute -inset-6 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl" />
                                                    <div className="w-24 h-24 bg-amber-500 rounded-3xl flex items-center justify-center shadow-xl shadow-amber-500/20 relative border border-white/20">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] font-black tracking-[0.2em] text-white/90 mb-1">QUIZ</span>
                                                            <div className="w-8 h-8 border-2 border-white/40 rounded flex flex-col p-1 gap-1">
                                                                <div className="w-full h-1 bg-white/60 rounded-full" />
                                                                <div className="w-3/4 h-1 bg-white/60 rounded-full" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 text-center">Ready for the challenge?</h2>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-12 text-center max-w-sm leading-relaxed">
                                                    This quiz will test your understanding of <span className="text-amber-600 dark:text-amber-500 font-bold">{problem.title}</span>.
                                                </p>

                                                <div className="w-full max-w-xl bg-gray-50/50 dark:bg-[#0F1117]/50 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 mb-12 backdrop-blur-sm">
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                                                        <div className="w-1 h-4 bg-amber-500 rounded-full" /> Instructions
                                                    </h3>
                                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                        {[
                                                            { t: "Questions", v: problem.quizQuestions?.length || 0 },
                                                            { t: "Style", v: "Multiple Choice" },
                                                            { t: "Marking", v: "+1 Correct" },
                                                            { t: "Penalty", v: "None" }
                                                        ].map((item, i) => (
                                                            <li key={i} className="flex flex-col gap-1">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{item.t}</span>
                                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{item.v}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <button
                                                    onClick={() => setQuizStarted(true)}
                                                    className="px-8 py-3 bg-gray-900 dark:bg-amber-600 text-white rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-black/10"
                                                >
                                                    Start Now
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col lg:flex-row gap-6 h-full items-stretch min-h-0">
                                                {/* Left: Sidebar Navigation */}
                                                <div className="w-full lg:w-[280px] flex flex-col gap-4 overflow-y-auto custom-scrollbar h-full order-last lg:order-first shrink-0 pb-10">
                                                    <div className="bg-[#F1F3F4] dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
                                                        <h4 className="text-[12px] font-black uppercase text-gray-400 mb-6 flex items-center justify-between">
                                                            <span>Quiz ({problem.quizQuestions?.length})</span>
                                                        </h4>
                                                        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
                                                            {problem.quizQuestions?.map((_, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => setCurrentQuizIdx(i)}
                                                                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black border-2 transition-all 
                                                                        ${currentQuizIdx === i
                                                                            ? "border-amber-500 dark:border-white z-10 scale-110 shadow-none dark:ring-4 dark:ring-amber-500/20 dark:shadow-xl"
                                                                            : (quizAnswers[i] !== undefined
                                                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                                                : "bg-[#F1F3F4] dark:bg-[#0F1117] border-[var(--color-border-interactive)] text-gray-400 hover:border-gray-300 dark:hover:border-gray-700")}
                                                                        ${currentQuizIdx === i && quizAnswers[i] !== undefined ? "bg-emerald-500 text-white" : ""}
                                                                        ${currentQuizIdx === i && quizAnswers[i] === undefined ? "bg-[#F1F3F4] dark:bg-[#0F1117] text-gray-900 dark:text-white" : ""}
                                                                    `}
                                                                >
                                                                    {i + 1}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <div className="mt-8 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</span>
                                                                <span className="text-xs font-black text-gray-900 dark:text-white">{Object.keys(quizAnswers).length} / {problem.quizQuestions?.length}</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-emerald-500 transition-all duration-700 ease-out"
                                                                    style={{ width: `${(Object.keys(quizAnswers).length / (problem.quizQuestions?.length || 1)) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {(quizSubmitted || problem.isSolved) && (
                                                        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                                            <QuizScoreRing
                                                                correct={correctAnswersCount}
                                                                total={problem.quizQuestions?.length || 0}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: Questions Area */}
                                                <div className="flex-1 w-full flex flex-col overflow-y-auto custom-scrollbar h-full min-h-0 pb-10 pl-2 lg:pl-6">
                                                    {(() => {
                                                        const q = problem.quizQuestions?.[currentQuizIdx];
                                                        if (!q) return null;
                                                        const idx = currentQuizIdx;
                                                        const selectedOpt = quizAnswers[idx];
                                                        const isSubmitted = quizSubmitted || problem.isSolved;
                                                        const correctIdx = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctAnswer;

                                                        return (
                                                            <div className="space-y-6 max-w-4xl">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Question {idx + 1}</span>
                                                                </div>

                                                                <div className="bg-[#F1F3F4] dark:bg-[#111827] border-2 border-amber-500 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-none dark:shadow-sm relative overflow-hidden">
                                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl -mr-12 -mt-12" />
                                                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 leading-relaxed mb-10 relative">
                                                                        {q.question || q.questionText}
                                                                    </h3>

                                                                    <div className="grid grid-cols-1 gap-4 relative">
                                                                        {q.options?.map((opt, oIdx) => {
                                                                            const isThisSelected = selectedOpt === oIdx;
                                                                            const isCorrectOpt = correctIdx === oIdx;

                                                                            let btnClass = "border-[var(--color-border-interactive)] bg-gray-50/50 dark:bg-[#0F1117] hover:border-amber-300 dark:hover:border-amber-500/30";
                                                                            let iconClass = "border-gray-300 dark:border-gray-700";
                                                                            let textClass = "text-gray-700 dark:text-gray-300";

                                                                            if (isSubmitted) {
                                                                                if (isCorrectOpt) {
                                                                                    btnClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10";
                                                                                    iconClass = "border-emerald-500 bg-emerald-500";
                                                                                    textClass = "text-emerald-700 dark:text-emerald-400 font-bold";
                                                                                } else if (isThisSelected) {
                                                                                    btnClass = "border-red-500 bg-red-50 dark:bg-red-900/10";
                                                                                    iconClass = "border-red-500 bg-red-500";
                                                                                    textClass = "text-red-700 dark:text-red-400 font-bold";
                                                                                }
                                                                            } else if (isThisSelected) {
                                                                                btnClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 shadow-sm";
                                                                                iconClass = "border-emerald-500 bg-emerald-500";
                                                                                textClass = "text-emerald-900 dark:text-emerald-100 font-bold";
                                                                            }

                                                                            return (
                                                                                <button
                                                                                    key={oIdx}
                                                                                    disabled={isSubmitted}
                                                                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [idx]: oIdx }))}
                                                                                    className={`flex items-center gap-5 p-5 rounded-2xl border-2 transition-all text-left group ${btnClass}`}
                                                                                >
                                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${iconClass}`}>
                                                                                        {(isThisSelected || (isSubmitted && isCorrectOpt)) && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in-50" />}
                                                                                    </div>
                                                                                    <span className={`text-[15px] font-semibold transition-colors ${textClass}`}>{opt}</span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    {isSubmitted && q.explanation && (
                                                                        <div className="mt-10 p-6 bg-emerald-50/50 dark:bg-emerald-900/5 border border-emerald-100 dark:border-emerald-900/20 rounded-3xl">
                                                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-500 mb-3 flex items-center gap-2">
                                                                                <BookOpenIcon size={12} /> Explanation
                                                                            </h4>
                                                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed italic">{q.explanation}</p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center justify-between pt-4">
                                                                    <button
                                                                        onClick={() => setCurrentQuizIdx(prev => Math.max(0, prev - 1))}
                                                                        disabled={currentQuizIdx === 0}
                                                                        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-500 font-bold text-xs disabled:opacity-20 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                                    >
                                                                        <ArrowLeft size={16} /> Previous
                                                                    </button>

                                                                    {currentQuizIdx === (problem.quizQuestions?.length || 0) - 1 ? (
                                                                        !isSubmitted && (
                                                                            <button
                                                                                onClick={handleQuizSubmit}
                                                                                disabled={Object.keys(quizAnswers).length < problem.quizQuestions.length || isSubmittingNonCoding}
                                                                                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                                                            >
                                                                                {isSubmittingNonCoding ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
                                                                                FINISH QUIZ
                                                                            </button>
                                                                        )
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => setCurrentQuizIdx(prev => prev + 1)}
                                                                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-md"
                                                                        >
                                                                            NEXT <ArrowRight size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Success Pop Overlay (first solve only) ── */}
            {showSuccessPop && (
                <SuccessPopOverlay
                    result={successResult}
                    onClose={() => { setShowSuccessPop(false); setSuccessResult(null); }}
                />
            )}
        </div>
    );
};

// ── Quiz Score Ring Component ───────────────────────────────────────────────
const QuizScoreRing = ({ correct, total }) => {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Choose color based on performance
    const circleColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    const radius = 35;
    const circ = 2 * Math.PI * radius;
    const dash = (pct / 100) * circ;

    return (
        <div className="flex flex-col items-center gap-5 py-8 px-6 bg-[#F1F3F4] dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-3xl -mr-12 -mt-12 transition-opacity group-hover:opacity-100" />

            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 mb-1">Final Score</h4>

            <div className="relative w-28 h-28">
                {/* Glow behind the ring */}
                <div
                    className="absolute inset-4 blur-xl opacity-20 transition-all duration-1000"
                    style={{ backgroundColor: circleColor }}
                />

                <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
                    <circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        className="stroke-gray-50 dark:stroke-gray-800/50"
                        strokeWidth="8"
                    />
                    <circle
                        cx="50" cy="50" r={radius}
                        fill="none"
                        stroke={circleColor}
                        strokeWidth="8"
                        strokeDasharray={circ}
                        strokeDashoffset={circ - dash}
                        strokeLinecap="round"
                        className="transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1)"
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{correct}</span>
                        <span className="text-sm font-bold text-gray-400">/</span>
                        <span className="text-sm font-bold text-gray-400">{total}</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-tighter mt-1">TOTAL</span>
                </div>
            </div>

            <div className="flex flex-col items-center gap-2 relative z-10 text-center">
                <div className="flex items-center gap-2">
                    <Trophy size={14} className={pct >= 80 ? 'text-amber-500' : 'text-gray-300'} />
                    <span className={`text-xs font-black uppercase tracking-widest ${pct >= 80 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {pct >= 80 ? 'Outstanding!' : pct >= 50 ? 'Well Done' : 'Keep Practice'}
                    </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-[#0F1117] rounded-full border border-gray-100 dark:border-gray-800 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: circleColor }} />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Accuracy: {pct}%</span>
                </div>
            </div>
        </div>
    );
};

export default CodeEditor;








