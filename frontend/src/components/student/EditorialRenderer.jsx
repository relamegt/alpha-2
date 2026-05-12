import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
    FaSpinner, FaCheck, FaCopy, FaChevronLeft, FaChevronRight,
    FaPause, FaPlay, FaYoutube, FaImage
} from 'react-icons/fa';
import { 
    ChevronDown, 
    ChevronRight, 
    Timer, 
    Code2, 
    Terminal, 
    BookOpen, 
    ExternalLink, 
    Lock,
    X
} from 'lucide-react';
import problemService from '../../services/problemService';
import { useTheme } from '../../contexts/ThemeContext';
import SecureVideoPlayer from '../shared/SecureVideoPlayer';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

const getYouTubeId = (url) => {
    if (!url) return null;
    const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return m && m[2].length === 11 ? m[2] : null;
};

const toRawGithubUrl = (url) => {
    if (!url) return url;
    const u = url.trim();
    if (u.includes('raw.githubusercontent.com')) return u;
    if (u.includes('github.com') && u.includes('/blob/')) {
        return u.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return u;
};

const convertToDirectUrl = (url) => {
    if (!url) return '';
    let cleanUrl = url.trim();

    if (cleanUrl.includes('drive.google.com')) {
        const fileIdMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
            const fileId = fileIdMatch[1] || fileIdMatch[2];
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
    }

    if (cleanUrl.includes('github.com') && !cleanUrl.includes('raw.githubusercontent.com')) {
        if (cleanUrl.includes('/blob/')) {
            return cleanUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        }
    }

    if (cleanUrl.includes('dropbox.com') && !cleanUrl.includes('dl=1')) {
        return cleanUrl.replace('dl=0', 'dl=1').replace(/\?.*/, '') + '?dl=1';
    }

    return cleanUrl;
};

const loadAsDataUrl = async (url) => {
    const response = await fetch(url, { mode: 'cors', method: 'GET', headers: { 'Accept': 'image/*,*/*;q=0.8' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (blob.size === 0) throw new Error('Empty response');
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
    });
};

const SecureImage = ({ src, alt, className, style, onLoad, ...props }) => {
    const [imageSrc, setImageSrc] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const onLoadRef = React.useRef(onLoad);
    useEffect(() => { onLoadRef.current = onLoad; });

    useEffect(() => {
        let mounted = true;
        const loadImage = async () => {
            try {
                setIsLoading(true);
                setHasError(false);
                if (!src) throw new Error('No source');
                const processedSrc = convertToDirectUrl(src);
                const result = await loadAsDataUrl(processedSrc);
                if (mounted) {
                    setImageSrc(result);
                    setIsLoading(false);
                    onLoadRef.current?.();
                }
            } catch (error) {
                if (mounted) {
                    setHasError(true);
                    setIsLoading(false);
                    onLoadRef.current?.();
                }
            }
        };
        loadImage();
        return () => { mounted = false; };
    }, [src]);

    const preventAction = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 w-full min-h-[200px]", className)}>
                <FaSpinner className="animate-spin h-6 w-6 text-indigo-600" />
            </div>
        );
    }

    if (hasError) {
        return (
            <div className="my-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center space-x-3 w-full">
                <FaImage className="w-5 h-5 text-red-500" />
                <p className="text-red-700 dark:text-red-400 font-medium">Image unavailable</p>
            </div>
        );
    }

    return (
        <div
            className="relative group w-full h-full flex justify-center items-center select-none"
            onContextMenu={preventAction}
            onDragStart={preventAction}
        >
            <div
                className="absolute inset-0 z-20 bg-transparent w-full h-full"
                onContextMenu={preventAction}
                onDragStart={preventAction}
            />
            <img
                {...props}
                src={imageSrc}
                alt={alt || "Secure Content"}
                className={cn(
                    "rounded-xl border-[2px] dark:border-[3.2px] border-indigo-500 shadow-lg shadow-[#6961b5]/20 w-full sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-1/2 h-auto pointer-events-none select-none",
                    className
                )}
                style={{
                    ...style,
                    maxHeight: '500px',
                    objectFit: 'contain',
                    display: 'block',
                    userSelect: 'none',
                    WebkitUserDrag: 'none'
                }}
                draggable={false}
            />
        </div>
    );
};

const ImageCarousel = ({ images }) => {
    const [current, setCurrent] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isCurrentLoaded, setIsCurrentLoaded] = useState(false);
    const length = images.length;

    useEffect(() => { setIsCurrentLoaded(false); }, [current]);

    useEffect(() => {
        let interval;
        if (isPlaying && length > 1 && isCurrentLoaded) {
            interval = setInterval(() => { setCurrent((prev) => (prev === length - 1 ? 0 : prev + 1)); }, 3500);
        }
        return () => clearInterval(interval);
    }, [length, isPlaying, isCurrentLoaded]);

    const nextSlide = () => setCurrent(current === length - 1 ? 0 : current + 1);
    const prevSlide = () => setCurrent(current === 0 ? length - 1 : current - 1);
    const togglePlay = () => setIsPlaying(!isPlaying);

    const handleImageLoad = (index) => { if (index === current) setIsCurrentLoaded(true); };

    if (!Array.isArray(images) || images.length === 0) return null;

    return (
        <div className="w-full aspect-video max-w-3xl mx-auto my-6 flex flex-col rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 shadow-md select-none bg-black">
            <div className="relative w-full h-full flex-1 overflow-hidden group">
                {images.map((imgSrc, index) => {
                    const isVisible = index === current;
                    const isNext = index === (current + 1) % length;
                    const isPrev = index === (current - 1 + length) % length;
                    if (!isVisible && !isNext && !isPrev) return null;
                    return (
                        <div key={index} className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${isVisible ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            <SecureImage 
                                src={imgSrc} alt={`Slide ${index + 1}`} onLoad={() => handleImageLoad(index)}
                                className="!w-full !h-full !object-fill !max-w-none !rounded-none !border-0 !shadow-none !m-0 !p-0"
                                style={{ objectFit: 'fill', width: '100%', height: '100%', maxHeight: 'none' }} 
                            />
                        </div>
                    );
                })}
            </div>
            <div className="h-8 bg-gray-100 dark:bg-[#121214] border-t border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-30 relative">
                <div className="w-12 hidden sm:block"></div>
                <div className="flex items-center justify-center gap-4 sm:gap-6 flex-1">
                    <button onClick={prevSlide} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors p-1" title="Previous Slide"><FaChevronLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={togglePlay} className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title={isPlaying ? "Pause" : "Play"}>{isPlaying ? <FaPause className="w-3.5 h-3.5" /> : <FaPlay className="w-3.5 h-3.5 ml-0.5" />}</button>
                    <button onClick={nextSlide} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors p-1" title="Next Slide"><FaChevronRight className="w-3.5 h-3.5" /></button>
                </div>
                <div className="w-12 text-right"><span className="text-xs font-semibold text-gray-500 dark:text-gray-400 font-mono">{current + 1}/{length}</span></div>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────────
// CODE BLOCK VIEWER
// ──────────────────────────────────────────────────────────────────────────────
const CodeBlockViewer = React.memo(({
    blocks,
    id,
    complexity,
    activeTabState,
    onTabChange
}) => {
    const [viewMode, setViewMode] = useState('code');
    const [isComplexityOpen, setIsComplexityOpen] = useState(false);
    const [localCopied, setLocalCopied] = useState(false);
    const copyTimeoutRef = React.useRef(null);

    const { normalizedBlocks, languages, outputContent, currentLang } = React.useMemo(() => {
        if (!blocks || blocks.length === 0) {
            return { normalizedBlocks: [], languages: [], outputContent: '', currentLang: '' };
        }
        const norm = blocks.map(b => ({ ...b, language: b.language || 'Code' }));
        const langs = norm.map(b => b.language);
        const lang = activeTabState && langs.includes(activeTabState) ? activeTabState : langs[0];

        return {
            normalizedBlocks: norm,
            languages: langs,
            currentLang: lang,
            outputContent: norm.find(b => b.output)?.output || ''
        };
    }, [blocks, activeTabState]);

    if (!blocks || blocks.length === 0) return null;

    const hasOutput = Boolean(outputContent);
    const hasComplexity = complexity?.time || complexity?.space;

    const handleCopy = () => {
        const text =
            viewMode === 'output'
                ? outputContent
                : normalizedBlocks.find(b => b.language === currentLang)?.code || '';

        navigator.clipboard.writeText(text).then(() => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            setLocalCopied(true);
            copyTimeoutRef.current = setTimeout(() => setLocalCopied(false), 2000);
        });
    };

    return (
        <div className="my-6 sm:my-8 w-full rounded-lg sm:rounded-xl border border-zinc-800 bg-[#0a0a0f] overflow-hidden shadow-lg">
            <div className="flex items-center justify-between h-9 sm:h-12 px-2 sm:px-4 bg-[#18181b] border-b border-zinc-800 select-none">
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex gap-1 sm:gap-1.5">
                        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500" />
                        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500" />
                        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    {hasOutput && (
                        <div className="flex items-center p-0.5 bg-zinc-900 rounded-lg border border-zinc-700/50">
                            {['code', 'output'].map(mode => {
                                const active = viewMode === mode;
                                return (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={cn(
                                            "px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase rounded-md flex items-center gap-1 sm:gap-1.5 transition-colors",
                                            active ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        {mode === 'code' ? <Code2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Terminal className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                        {mode}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs text-zinc-400 hover:text-white transition"
                >
                    {localCopied ? <FaCheck className="text-emerald-500" /> : <FaCopy />}
                    <span className="hidden sm:inline">{localCopied ? 'Copied' : 'Copy'}</span>
                </button>
            </div>

            {viewMode === 'code' && (
                <div className="bg-[#121214] border-b border-zinc-800 px-4">
                    <div className="flex gap-x-4 overflow-x-auto no-scrollbar">
                        {languages.map(lang => (
                            <button
                                key={lang}
                                onClick={() => languages.length > 1 && onTabChange(lang)}
                                className={cn(
                                    "py-2 text-xs font-medium border-b-2 transition-colors",
                                    currentLang === lang ? "border-indigo-500 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 disabled:cursor-default"
                                )}
                            >
                                {lang === 'cpp' ? 'C++' : lang === 'py' ? 'Python' : lang}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="relative bg-[#0a0a0f]">
                <div
                    style={{
                        maxHeight: '380px',
                        overflowX: 'auto',
                        overflowY: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                >
                    <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                    {viewMode === 'code' && normalizedBlocks.map(block => (
                        <div
                            key={block.language}
                            style={{ display: block.language === currentLang ? 'block' : 'none', minWidth: 'max-content' }}
                        >
                            <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={block.language.toLowerCase()}
                                showLineNumbers
                                wrapLines={false}
                                customStyle={{ background: 'transparent', margin: 0, padding: '1rem', fontSize: '13px', lineHeight: '1.5', minWidth: '100%', caretColor: '#9CDCFE' }}
                                lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#52525b', userSelect: 'none' }}
                            >
                                {block.code}
                            </SyntaxHighlighter>
                        </div>
                    ))}
                    {viewMode === 'output' && (
                        <pre style={{ minWidth: 'max-content', padding: '1rem', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', color: '#d4d4d8', whiteSpace: 'pre' }}>
                            {outputContent}
                        </pre>
                    )}
                </div>
            </div>

            {viewMode === 'code' && hasComplexity && (
                <div className="border-t border-zinc-800 bg-[#121214]">
                    <button
                        onClick={() => setIsComplexityOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 text-xs text-zinc-400 hover:text-zinc-200 transition"
                    >
                        <span className="flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5 text-zinc-500" />
                            Complexity Analysis
                        </span>
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isComplexityOpen && "rotate-180")} />
                    </button>
                    {isComplexityOpen && (
                        <div className="px-5 pb-5 pt-3 border-t border-zinc-800/50 space-y-3 text-[13px]">
                            {complexity.time && (
                                <div className="grid grid-cols-[96px_1fr] gap-4 items-start">
                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Time</span>
                                    <span className="text-zinc-300 leading-relaxed">{complexity.time.replace(/`/g, '')}</span>
                                </div>
                            )}
                            {complexity.space && (
                                <div className="grid grid-cols-[96px_1fr] gap-4 items-start">
                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Space</span>
                                    <span className="text-zinc-300 leading-relaxed">{complexity.space.replace(/`/g, '')}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

const getMarkdownComponents = (isCompact) => ({
    hr: (props) => <hr className="border-0 border-t border-[var(--color-border-interactive)] my-4 sm:my-6" {...props} />,
    h1: (props) => <h1 className={cn(
        "font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 leading-tight mt-6 sm:mt-8 mb-4 sm:mb-6",
        isCompact ? "text-base sm:text-lg lg:text-xl" : "text-lg sm:text-xl lg:text-3xl"
    )}>{props.children}</h1>,
    h2: (props) => <h2 className={cn(
        "font-bold text-gray-900 dark:text-white mt-6 sm:mt-8 mb-3 sm:mb-4 leading-tight",
        isCompact ? "text-[14px] sm:text-base lg:text-lg" : "text-base sm:text-lg lg:text-2xl"
    )}>{props.children}</h2>,
    h3: (props) => <h3 className={cn(
        "font-semibold text-gray-900 dark:text-white leading-snug mt-4 sm:mt-6 mb-2 sm:mb-3 break-words",
        isCompact ? "text-[13px] sm:text-[14px] lg:text-base" : "text-[15px] sm:text-lg lg:text-xl"
    )}>{props.children}</h3>,
    p: (props) => <p className={cn(
        "text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words mb-4 leading-relaxed",
        isCompact ? "text-[12px] sm:text-[12px] lg:text-[13px]" : "text-[15px] sm:text-[15px] lg:text-[16px]"
    )}>{props.children}</p>,
    ul: (props) => <ul className={cn(
        "text-gray-700 dark:text-gray-300 list-disc list-outside ml-4 sm:ml-5 mb-4 space-y-1",
        isCompact ? "text-[11px] sm:text-[12px] lg:text-[13px]" : "text-[13px] sm:text-[15px] lg:text-[16px]"
    )}>{props.children}</ul>,
    ol: (props) => <ol className={cn(
        "text-gray-700 dark:text-gray-300 list-decimal list-outside ml-4 sm:ml-5 mb-4 space-y-1",
        isCompact ? "text-[11px] sm:text-[12px] lg:text-[13px]" : "text-[13px] sm:text-[15px] lg:text-[16px]"
    )}>{props.children}</ol>,
    li: (props) => <li className="pl-1 leading-relaxed break-words whitespace-pre-wrap">{props.children}</li>,
    blockquote: (props) => <blockquote className={cn(
        "border-l-4 border-indigo-500 pl-4 pr-3 py-2 italic text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-r my-4",
        isCompact ? "text-[11px] sm:text-[12px]" : "text-[13px] sm:text-[14px]"
    )}>{props.children}</blockquote>,
    a: ({ href, ...props }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium transition-colors break-all">{props.children}</a>,
    table: (props) => <div className="my-6 w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm"><table className="w-full text-sm border-collapse text-left" {...props} /></div>,
    thead: (props) => <thead className="bg-gray-50 dark:bg-zinc-900/50 text-gray-900 dark:text-gray-100" {...props} />,
    tr: (props) => <tr className="border-t border-gray-100 dark:border-gray-800 even:bg-gray-50/50 dark:even:bg-zinc-900/20" {...props} />,
    tbody: (props) => <tbody className="bg-transparent" {...props} />,
    th: (props) => <th className="px-4 py-3 font-bold border-r border-indigo-100 dark:border-indigo-900/30 last:border-r-0 text-[12px] uppercase tracking-wider">{props.children}</th>,
    td: (props) => <td className="px-4 py-3 border-r border-gray-100 dark:border-gray-800 last:border-r-0 align-top text-gray-700 dark:text-gray-300 text-[14px] leading-relaxed">{props.children}</td>,
    code: ({ inline, className, children }) => {
        const content = String(children).replace(/\n$/, '');
        const isMultiLine = content.includes('\n');
        if (inline || !isMultiLine) {
            return <code className={cn(
                "bg-gray-100 dark:bg-gray-800/50 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono border border-gray-200/50 dark:border-gray-700/50 inline break-all whitespace-normal",
                isCompact ? "text-[10px] sm:text-[11px]" : "text-[12px] sm:text-[13px] lg:text-[14px]"
            )}>{children}</code>;
        }
        return <div className="my-4 rounded-xl overflow-hidden bg-gray-900 dark:bg-[#0c0c0e] border border-gray-800 shadow-xl"><div className={cn(
            "p-3 sm:p-4 overflow-x-auto font-mono text-gray-300 leading-relaxed",
            isCompact ? "text-[10px] sm:text-[11px]" : "text-[12px] sm:text-[13px] lg:text-[14px]"
        )}>{children}</div></div>;
    }
});

const universalParse = (markdown) => {
    const lines = markdown.split('\n');
    const result = { title: '', sections: [] };

    const parseBlockLines = (blockLines, prefix = '') => {
        const elements = [];
        let i = 0;
        let currentText = '';

        const flushText = () => {
            if (currentText.trim()) {
                elements.push({ type: 'text', content: currentText.trim(), id: `${prefix}txt-${elements.length}` });
                currentText = '';
            }
        };

        const isOutputHeader = (line) => !!line.match(/^(\*\*Output:?\*\*|### Output|Output:|Output\s*-|\*OUTPUT)/i);

        while (i < blockLines.length) {
            const line = blockLines[i];
            const trimmedLine = line.trim();

            if (trimmedLine === '<carousel>') {
                flushText();
                const images = [];
                i++;
                while (i < blockLines.length && blockLines[i].trim() !== '</carousel>') {
                    const m = blockLines[i].match(/src=["']([^"']+)["']/);
                    if (m) images.push(m[1]);
                    i++;
                }
                if (images.length) elements.push({ type: 'carousel', images, id: `${prefix}car-${elements.length}` });
                i++; continue;
            }

            if (trimmedLine.startsWith('|') && i + 1 < blockLines.length &&
                blockLines[i + 1].trim().match(/^\|?[\s-]*:?---+:?[\s-|]*$/)) {
                flushText();
                let tableMd = "";
                while (i < blockLines.length && blockLines[i].trim().startsWith('|')) {
                    tableMd += blockLines[i] + "\n";
                    i++;
                }
                elements.push({ type: 'text', content: "\n" + tableMd + "\n", id: `${prefix}table-${elements.length}` });
                continue;
            }

            const imgM = line.match(/<img\s+src=["']([^"']+)["'][^>]*(?:style=["']([^"']+)["'])?[^>]*\/?>/i);
            if (imgM) {
                flushText();
                elements.push({ type: 'image', src: imgM[1], style: imgM[2] || '', id: `${prefix}img-${elements.length}` });
                i++; continue;
            }

            if (trimmedLine.startsWith('```')) {
                flushText();
                const codeGroup = [];
                const blockId = `${prefix}code-${elements.length}`;
                let complexity = { time: '', space: '' };

                while (i < blockLines.length) {
                    if (!blockLines[i].trim().startsWith('```')) break;
                    let lang = blockLines[i].substring(3).trim() || 'Code';
                    i++;
                    let codeContent = '';
                    while (i < blockLines.length && !blockLines[i].trim().startsWith('```')) {
                        codeContent += blockLines[i] + '\n';
                        i++;
                    }
                    if (i < blockLines.length) i++;
                    codeGroup.push({ language: lang, code: codeContent.trim(), output: null });
                    let peek = i;
                    while (peek < blockLines.length && blockLines[peek].trim() === '') peek++;
                    if (peek < blockLines.length && blockLines[peek].trim().startsWith('```')) {
                        i = peek; continue;
                    } else break;
                }

                let k = i;
                while (k < blockLines.length && blockLines[k].trim() === '') k++;

                if (k < blockLines.length && (blockLines[k].match(/^### Output/i) || blockLines[k].match(/^Output:/i))) {
                    let outputLines = [];
                    k++;
                    while (k < blockLines.length) {
                        const line = blockLines[k];
                        const tLine = line.trim();
                        if (tLine.match(/^#+\s*(Time|Space) Complexity/i) || tLine.match(/^##+\s/) || tLine.startsWith('```') || tLine.startsWith('---') || tLine === '') break;
                        outputLines.push(line);
                        k++;
                    }
                    const finalOutput = outputLines.join('\n').trim();
                    if (finalOutput) { codeGroup.forEach(c => c.output = finalOutput); i = k; }
                }

                while (i < blockLines.length) {
                    const tCl = blockLines[i].trim();
                    if (tCl.match(/^#+\s*Time Complexity/i)) {
                        i++; let t = '';
                        while (i < blockLines.length && !blockLines[i].trim().startsWith('#') && blockLines[i].trim() !== '') {
                            t += blockLines[i] + '\n'; i++;
                        }
                        complexity.time = t.trim();
                    } else if (tCl.match(/^#+\s*Space Complexity/i)) {
                        i++; let s = '';
                        while (i < blockLines.length && !blockLines[i].trim().startsWith('#') && blockLines[i].trim() !== '') {
                            s += blockLines[i] + '\n'; i++;
                        }
                        complexity.space = s.trim();
                    } else if (tCl === '') { i++; }
                    else break;
                }

                elements.push({ type: 'code', code: codeGroup, complexity, id: blockId });
                continue;
            }

            if (!line.match(/^#+\s*(Time|Space) Complexity/i) && !isOutputHeader(line)) {
                if (line.startsWith('# ') && !result.title) result.title = line.substring(2);
                else currentText += line + '\n';
            }
            i++;
        }
        flushText();
        return elements;
    };

    const approachesStart = lines.findIndex(l => l.trim() === '<approaches>');
    const approachesEnd = lines.findIndex(l => l.trim() === '</approaches>');

    if (approachesStart !== -1 && approachesEnd !== -1) {
        const preLines = lines.slice(0, approachesStart);
        result.sections.push({ type: 'standard', content: parseBlockLines(preLines, 'pre-') });

        const approachLines = lines.slice(approachesStart + 1, approachesEnd);
        const approaches = [];
        let currentApp = null;
        let buffer = [];

        const saveApproach = () => {
            if (currentApp) {
                currentApp.content = parseBlockLines(buffer, `app-${currentApp.id}-`);
                approaches.push(currentApp);
            }
        };

        for (let line of approachLines) {
            if (line.trim().startsWith('## ')) {
                saveApproach();
                buffer = [];
                currentApp = { name: line.substring(3).trim(), id: `approach-${approaches.length}` };
            } else { buffer.push(line); }
        }
        saveApproach();
        result.sections.push({ type: 'approaches', items: approaches });

        const postLines = lines.slice(approachesEnd + 1);
        if (postLines.some(l => l.trim())) result.sections.push({ type: 'standard', content: parseBlockLines(postLines, 'post-') });
    } else {
        result.sections.push({ type: 'standard', content: parseBlockLines(lines) });
    }

    return result;
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN EDITORIAL RENDERER COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
const EditorialRenderer = ({ 
    problem, 
    content, 
    isAdmin = false, 
    onUpdateLinks, 
    hasViewedEditorial,
    onUnlockEditorial, 
    hideVideo = false,
    isCompact = false,
    bypassLock = false
}) => {
    const { isDark } = useTheme();
    const components = getMarkdownComponents(isCompact);
    const [parsedContent, setParsedContent] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [codeTabStates, setCodeTabStates] = useState({});
    const [expandedSections, setExpandedSections] = useState({});
    const [unlocking, setUnlocking] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [draftEditorialLink, setDraftEditorialLink] = useState('');
    const [draftVideoUrl, setDraftVideoUrl] = useState('');
    const [saving, setSaving] = useState(false);

    const editorialLink = problem?.editorialLink || problem?.editorial_link || '';
    const videoUrl = problem?.youtubeLink || problem?.videoUrl || problem?.youtube_link || problem?.video_link || '';
    const youtubeId = getYouTubeId(videoUrl);
    const legacyEditorial = problem?.editorial;

    useEffect(() => {
        if (content) {
            setParsedContent(universalParse(content));
            setFetchLoading(false);
            return;
        }

        if (!editorialLink) {
            if (legacyEditorial) {
                let generatedContent = "";
                if (legacyEditorial.approach) generatedContent += `## Approach\n\n${legacyEditorial.approach}\n\n`;
                if (legacyEditorial.complexity) generatedContent += `## Complexity\n\n${legacyEditorial.complexity}\n\n`;
                if (legacyEditorial.solution) generatedContent += `## Solution\n\n\`\`\`cpp\n${legacyEditorial.solution}\n\`\`\``;
                setParsedContent(universalParse(generatedContent));
            } else {
                setParsedContent(null);
            }
            setFetchLoading(false);
            return;
        }

        let cancelled = false;
        const fetchContent = async () => {
            setFetchLoading(true); setFetchError(null);
            try {
                const rawUrl = toRawGithubUrl(editorialLink);
                const res = await fetch(rawUrl);
                if (!res.ok) throw new Error(`Failed to fetch (HTTP ${res.status})`);
                const text = await res.text();
                if (!cancelled) setParsedContent(universalParse(text));
            } catch (e) { if (!cancelled) setFetchError(e.message); }
            finally { if (!cancelled) setFetchLoading(false); }
        };
        fetchContent();
        return () => { cancelled = true; };
    }, [editorialLink, content, legacyEditorial]);

    const handleAdminSave = async () => {
        setSaving(true);
        try { await onUpdateLinks?.(draftEditorialLink.trim(), draftVideoUrl.trim()); setEditMode(false); }
        finally { setSaving(false); }
    };

    const toggleSection = (id) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

    const renderBlock = (block) => {
        switch (block.type) {
            case 'text':
                return (
                    <div key={block.id} className="prose dark:prose-invert max-w-none mb-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
                            {block.content}
                        </ReactMarkdown>
                    </div>
                );
            case 'carousel': return <ImageCarousel key={block.id} images={block.images} />;
            case 'image': return <SecureImage key={block.id} src={block.src} alt="article" className="max-w-full my-4" />;
            case 'code': return <CodeBlockViewer key={block.id} blocks={block.code} id={block.id} complexity={block.complexity} activeTabState={codeTabStates[block.id]} onTabChange={(val) => setCodeTabStates(prev => ({ ...prev, [block.id]: val }))} />;
            default: return null;
        }
    };

    // ── Admin edit panel ──────────────────────────────────────────────────────
    const AdminPanel = () => (
        <div className="mb-5 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl transition-colors">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">Admin: Editorial Settings</span>
                {!editMode && (
                    <button onClick={() => { setDraftEditorialLink(editorialLink); setDraftVideoUrl(videoUrl); setEditMode(true); }}
                        className="btn-secondary text-xs px-3 py-1">
                        Edit Links
                    </button>
                )}
            </div>
            {editMode ? (
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">GitHub Editorial URL</label>
                        <input value={draftEditorialLink} onChange={e => setDraftEditorialLink(e.target.value)}
                            placeholder="https://github.com/user/repo/blob/main/editorial.md"
                            className="w-full bg-[#F1F3F4] dark:bg-[#111117] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary-400 focus:outline-none font-mono transition-colors" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">YouTube Video URL (optional)</label>
                        <input value={draftVideoUrl} onChange={e => setDraftVideoUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full bg-[#F1F3F4] dark:bg-[#111117] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary-400 focus:outline-none font-mono transition-colors" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdminSave} disabled={saving}
                            className="btn-primary px-4 py-1.5 text-xs">
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditMode(false)} className="btn-secondary px-4 py-1.5 text-xs">
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div><span className="font-semibold text-gray-700 dark:text-gray-300">Editorial:</span> {editorialLink || <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>}</div>
                    <div><span className="font-semibold text-gray-700 dark:text-gray-300">Video:</span> {videoUrl || <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>}</div>
                </div>
            )}
        </div>
    );

    if (!editorialLink && !videoUrl && !problem?.editorial?.approach) {
        return (
            <div className="p-6">
                {isAdmin && <AdminPanel />}
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
                    <BookOpen size={40} className="opacity-20 mb-3" />
                    <p className="text-sm">Editorial not available yet.</p>
                </div>
            </div>
        );
    }

    const handleUnlock = async () => {
        setUnlocking(true);
        try {
            await problemService.viewEditorial(problem._id);
            onUnlockEditorial?.();
        } catch (error) {
            console.error('Failed to unlock editorial:', error);
        } finally {
            setUnlocking(false);
        }
    };

    if (!isAdmin && !hasViewedEditorial && !bypassLock) {
        return (
            <div className="p-6 h-full flex flex-col items-center justify-center py-20 animate-fade-in relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
                    <div className="w-16 h-16 bg-[#F1F3F4] dark:bg-[#111117] border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center justify-center mb-5 text-primary-500 shadow-xl">
                        <Lock size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">View Code Editorial</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                        Are you sure you want to view the editorial? You <strong className="text-gray-800 dark:text-gray-200">will not earn any AlphaCoins</strong> for solving this problem after unlocking the explanation.
                    </p>
                    <button onClick={handleUnlock} disabled={unlocking} className="btn-primary w-full flex items-center justify-center gap-2 py-3 px-6 font-bold">
                        {unlocking ? <FaSpinner className="animate-spin" /> : 'Yes, Reveal Editorial'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-5 space-y-4">
            {isAdmin && <AdminPanel />}

            {!hideVideo && youtubeId && (
                <div className="mb-2">
                    <div className="flex items-center gap-2 mb-3">
                        <FaYoutube className=" w-4.5 h-4.5 text-red-500" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Video Explanation</h3>
                    </div>
                    <SecureVideoPlayer url={videoUrl || `https://www.youtube.com/watch?v=${youtubeId}`} title="Video Explanation" />
                </div>
            )}

            {editorialLink && (
                <>
                    {fetchLoading && (
                        <div className="flex items-center gap-2 py-8 justify-center text-gray-400">
                            <FaSpinner className="animate-spin" />
                            <span className="text-sm">Loading editorial…</span>
                        </div>
                    )}
                    {fetchError && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                            <span className="font-semibold shrink-0">Error:</span>
                            <span>{fetchError}</span>
                        </div>
                    )}
                    {!fetchLoading && !fetchError && parsedContent && (
                        <div className="space-y-5">
                            {parsedContent.sections.map((section, idx) => {
                                if (section.type === 'standard') return <div key={idx}>{section.content.map(renderBlock)}</div>;
                                if (section.type === 'approaches') {
                                    return (
                                        <div key={idx} className="space-y-3">
                                            {section.items.map((approach, aIdx) => (
                                                <div key={approach.id} className="border border-indigo-200/60 dark:border-indigo-900/50 rounded-xl overflow-hidden bg-transparent transition-colors">
                                                    <div onClick={() => toggleSection(approach.id)}
                                                        className="cursor-pointer px-4 py-3 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors select-none">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-7 h-7 rounded-lg bg-transparent border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                                                {aIdx + 1}
                                                            </div>
                                                            <h3 className="text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 leading-snug">{approach.name}</h3>
                                                        </div>
                                                        {expandedSections[approach.id]
                                                            ? <ChevronDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400 rotate-180 transition-transform" />
                                                            : <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                                                    </div>
                                                    <AnimatePresence>
                                                        {expandedSections[approach.id] && (
                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                                <div className="px-5 pb-4 border-t border-indigo-100 dark:border-indigo-900/50 bg-transparent">
                                                                    {approach.content.map(renderBlock)}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    )}
                </>
            )}

            {!editorialLink && problem?.editorial?.approach && (
                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-zinc-900/30 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm">Approach</h3>
                        <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{problem.editorial.approach}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditorialRenderer;
