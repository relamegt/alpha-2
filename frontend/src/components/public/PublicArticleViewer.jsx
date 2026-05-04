import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
  FaSpinner, FaCheck, FaCopy, FaYoutube, FaImage, FaExclamationTriangle,
  FaLinkedin, FaTwitter, FaLink, FaArrowUp, FaExpand, FaCompress,
  FaCalendarAlt, FaClock, FaUserCircle, FaFacebook, FaInstagram, FaSearch, FaChevronRight, FaRegClock,
  FaChevronLeft, FaPause, FaPlay
} from 'react-icons/fa';
import {
  ChevronDown, ChevronLeft, ChevronRight, Timer, Code2, Terminal, BookOpen, X, Layout, Maximize2, MoveUp,
  ChevronDown as ChevronDownLucide, PlayCircle, ArrowUp, ArrowLeft, GraduationCap
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import publicArticleService from '../../services/publicArticleService';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ──────────────────────────────────────────────────────────────────────────────
// RENDERING HELPERS FROM EDITORIALPAGE
// ──────────────────────────────────────────────────────────────────────────────

const toRawGithubUrl = (url) => {
  if (!url) return url;
  const u = url.trim();
  if (u.includes('raw.githubusercontent.com')) return u;
  if (u.includes('github.com') && u.includes('/blob/')) return u.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  return u;
};

// ==========================================
// CODE BLOCK VIEWER
// ==========================================
const CodeBlockViewer = React.memo(({
  blocks,
  id,
  complexity,
  isDark,
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
    <div className="my-6 sm:my-8 w-full rounded-lg sm:rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] overflow-hidden shadow-lg">
      <div className="flex items-center justify-between h-9 sm:h-12 px-2 sm:px-4 bg-gray-50 dark:bg-[#18181b] border-b border-gray-200 dark:border-zinc-800 select-none">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex gap-1 sm:gap-1.5">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500" />
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500" />
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500" />
          </div>
          {hasOutput && (
            <div className="flex items-center p-0.5 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700/50">
              {['code', 'output'].map(mode => {
                const active = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase rounded-md flex items-center gap-1 sm:gap-1.5 transition-colors",
                      active ? "bg-indigo-500 dark:bg-zinc-700 text-white" : "text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
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
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-white transition"
        >
          {localCopied ? <FaCheck className="text-emerald-500" /> : <FaCopy />}
          <span className="hidden sm:inline">{localCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {viewMode === 'code' && (
        <div className="bg-gray-50 dark:bg-[#121214] border-b border-gray-200 dark:border-zinc-800 px-4">
          <div className="flex gap-x-4 overflow-x-auto no-scrollbar">
            {languages.map(lang => (
              <button
                key={lang}
                onClick={() => languages.length > 1 && onTabChange(lang)}
                className={cn(
                  "py-2 text-xs font-medium border-b-2 transition-colors",
                  currentLang === lang ? "border-indigo-500 text-gray-900 dark:text-zinc-100" : "border-transparent text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-700 disabled:cursor-default"
                )}
              >
                {lang === 'cpp' ? 'C++' : lang === 'py' ? 'Python' : lang}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative bg-white dark:bg-[#0c0c0e]">
        <div
          style={{
            maxHeight: window.innerWidth < 640 ? '240px' : window.innerWidth < 1024 ? '320px' : '380px',
            overflowX: 'auto',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          onScroll={(e) => { e.currentTarget.style.paddingRight = '0px'; }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          {viewMode === 'code' && normalizedBlocks.map(block => (
            <div
              key={block.language}
              style={{ display: block.language === currentLang ? 'block' : 'none', minWidth: 'max-content' }}
            >
              <SyntaxHighlighter
                style={isDark ? vscDarkPlus : vs}
                language={block.language.toLowerCase()}
                showLineNumbers
                wrapLines={false}
                className="technical-code-block"
                customStyle={{ background: 'transparent', margin: 0, padding: '1rem', fontSize: '13px', lineHeight: '1.5', minWidth: '100%', caretColor: isDark ? '#9CDCFE' : '#333' }}
                lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: isDark ? '#52525b' : '#94a3b8', userSelect: 'none', fontStyle: 'normal' }}
              >
                {block.code}
              </SyntaxHighlighter>
            </div>
          ))}
          {viewMode === 'output' && (
            <pre style={{ minWidth: 'max-content', padding: '1rem', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', color: isDark ? '#d4d4d8' : '#334155', whiteSpace: 'pre' }}>
              {outputContent}
            </pre>
          )}
        </div>
      </div>

      {viewMode === 'code' && hasComplexity && (
        <div className="border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-[#121214]">
          <button
            onClick={() => setIsComplexityOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs text-gray-500 dark:text-zinc-400 hover:text-primary-600 dark:hover:text-zinc-200 transition"
          >
            <span className="flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              Complexity Analysis
            </span>
            <ChevronDownLucide className={cn("w-3.5 h-3.5 transition-transform", isComplexityOpen && "rotate-180")} />
          </button>
          {isComplexityOpen && (
            <div className="px-5 pb-5 pt-3 border-t border-gray-200 dark:border-zinc-800/50 space-y-3 text-[13px]">
              {complexity.time && (
                <div className="grid grid-cols-[96px_1fr] gap-4 items-start">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-zinc-500">Time</span>
                  <span className="text-gray-700 dark:text-zinc-300 leading-relaxed font-mono">{complexity.time.replace(/`/g, '')}</span>
                </div>
              )}
              {complexity.space && (
                <div className="grid grid-cols-[96px_1fr] gap-4 items-start">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-zinc-500">Space</span>
                  <span className="text-gray-700 dark:text-zinc-300 leading-relaxed font-mono">{complexity.space.replace(/`/g, '')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Image loading logic from provided UI
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
  if (cleanUrl.includes('1drv.ms')) {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
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

const loadViaCanvas = async (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
};

const loadViaProxy = async (url) => {
  const proxyServices = [
    `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=2000&h=2000`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://cors-anywhere.herokuapp.com/${url}`
  ];
  for (const proxyUrl of proxyServices) {
    try {
      const response = await fetch(proxyUrl, { method: 'GET' });
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch (e) { continue; }
  }
  throw new Error('All proxies failed');
};

const loadDirect = async (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('Direct load failed'));
    img.src = url;
  });
};

const SecureImage = ({ src, alt, className, style, onLoad, ...props }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadImage = async () => {
      try {
        setIsLoading(true); setHasError(false);
        if (!src) throw new Error('No source');
        const processedSrc = convertToDirectUrl(src);
        const loadingMethods = [
          () => loadAsDataUrl(processedSrc),
          () => loadViaCanvas(processedSrc),
          () => loadViaProxy(processedSrc),
          () => loadDirect(processedSrc)
        ];
        try {
          const result = await Promise.any(
            loadingMethods.map(method => method().then(res => { if (!mounted) throw new Error('Unmounted'); return res; }))
          );
          if (mounted) { setImageSrc(result); setIsLoading(false); if (onLoad) onLoad(); }
        } catch (e) { throw new Error('All loading methods failed'); }
      } catch (error) {
        if (mounted) { setHasError(true); setIsLoading(false); if (onLoad) onLoad(); }
      }
    };
    loadImage();
    return () => { mounted = false; };
  }, [src]);

  const preventAction = (e) => { e.preventDefault(); e.stopPropagation(); return false; };

  if (isLoading) return <div className={cn("flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 w-full min-h-[200px]", className)}><FaSpinner className="animate-spin h-6 w-6 text-indigo-600" /></div>;
  if (hasError) return <div className="my-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center space-x-3 w-full"><FaImage className="w-5 h-5 text-red-500" /><p className="text-red-700 dark:text-red-400 font-medium">Image unavailable</p></div>;
  return (
    <div className="relative group w-full h-full flex justify-center items-center select-none" onContextMenu={preventAction} onDragStart={preventAction}>
      <div className="absolute inset-0 z-20 bg-transparent w-full h-full" onContextMenu={preventAction} onDragStart={preventAction} />
      <img
        {...props}
        src={imageSrc}
        alt={alt || "Secure Content"}
        className={cn("rounded-xl border border-gray-200 dark:border-white/10 shadow-lg w-full sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-1/2 h-auto pointer-events-none select-none", className)}
        style={{ ...style, maxHeight: '500px', objectFit: 'contain', display: 'block', userSelect: 'none', WebkitUserDrag: 'none' }}
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
      <div className="h-8 bg-gray-100 dark:bg-[#121214] border-t border-[var(--color-border-interactive)] flex items-center justify-between px-4 z-30 relative">
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

const MarkdownComponents = {
  hr: (props) => <hr className="border-0 border-t border-[var(--color-border-interactive)]" {...props} />,
  h1: (props) => <h1 className="text-lg sm:text-xl lg:text-3xl font-bold text-gray-900 dark:text-white mt-6 sm:mt-8 mb-4 sm:mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">{props.children}</h1>,
  h2: (props) => <h2 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 dark:text-white mt-6 sm:mt-8 mb-3 sm:mb-4">{props.children}</h2>,
  h3: (props) => <h3 className="text-[15px] sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white leading-snug mt-4 sm:mt-6 mb-2 sm:mb-3 break-words">{props.children}</h3>,
  p: (props) => <p className="text-gray-700 dark:text-gray-300 text-[15px] sm:text-[15px] lg:text-[16px] leading-7 sm:leading-7 mb-4 whitespace-pre-wrap break-words">{props.children}</p>,
  ul: (props) => <ul className="text-gray-700 dark:text-gray-300 text-[13px] sm:text-[15px] lg:text-[16px] list-disc list-outside ml-4 sm:ml-5 mb-4 space-y-1">{props.children}</ul>,
  ol: (props) => <ol className="text-gray-700 dark:text-gray-300 text-[13px] sm:text-[15px] lg:text-[16px] list-decimal list-outside ml-4 sm:ml-5 mb-4 space-y-1">{props.children}</ol>,
  li: (props) => <li className="pl-1 leading-6 sm:leading-7 break-words whitespace-pre-wrap">{props.children}</li>,
  blockquote: (props) => <blockquote className="border-l-4 border-indigo-500 pl-4 pr-3 py-2 italic text-gray-600 dark:text-gray-400 text-[13px] sm:text-[14px] my-4 bg-gray-50 dark:bg-gray-800/30 rounded-r">{props.children}</blockquote>,
  a: ({ href, ...props }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline break-all">{props.children}</a>,
  table: (props) => <div className="my-6 w-full overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm"><table className="w-full text-sm border-collapse text-left" {...props} /></div>,
  thead: (props) => <thead className="bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-gray-100" {...props} />,
  tr: (props) => <tr className="border-t border-gray-300 dark:border-gray-700 even:bg-gray-50 dark:even:bg-zinc-900/30" {...props} />,
  tbody: (props) => <tbody className="bg-transparent" {...props} />,
  th: (props) => <th className="px-4 py-3 font-semibold border-r border-indigo-100 dark:border-indigo-500/20 last:border-r-0 whitespace-nowrap" {...props} />,
  td: (props) => <td className="px-4 py-3 border-r border-indigo-100 dark:border-indigo-500/20 last:border-r-0 align-top text-gray-700 dark:text-gray-300" {...props} />,
  code: ({ inline, className, children }) => {
    const content = String(children).replace(/\n$/, '');
    const isMultiLine = content.includes('\n');
    if (inline || !isMultiLine) {
      return <code className="bg-gray-100 dark:bg-[var(--color-bg-card)] text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded text-[12px] sm:text-[13px] lg:text-[14px] font-mono border border-gray-200 dark:border-white/5 inline break-all whitespace-normal">{children}</code>;
    }
    return <div className="my-4 rounded-lg overflow-hidden bg-gray-50 dark:bg-[#0c0c0e] border border-gray-200 dark:border-white/5"><div className="p-3 sm:p-4 overflow-x-auto text-[12px] sm:text-[13px] lg:text-[14px] font-mono text-gray-800 dark:text-gray-200">{children}</div></div>;
  }
};

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

      if (line.trim() === '<carousel>') {
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
      const trimmedLine = line.trim();
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

      if (line.trim().startsWith('```')) {
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
            const tLine = blockLines[k].trim();
            if (tLine.match(/^#+\s*(Time|Space) Complexity/i) || tLine.match(/^##+\s/) || tLine.startsWith('```') || tLine.startsWith('---') || tLine === '') break;
            outputLines.push(blockLines[k]);
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


const PublicArticleViewer = ({ article }) => {
  const { isDark } = useTheme();
  const [parsedContent, setParsedContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFocus, setIsFocus] = useState(false);
  const [recentArticles, setRecentArticles] = useState([]);
  const [showTopBtn, setShowTopBtn] = useState(false);

  // Renderer Hook state
  const [expandedSections, setExpandedSections] = useState({});
  const [copiedCode, setCopiedCode] = useState({});
  const [codeTabStates, setCodeTabStates] = useState({});

  const copyCode = async (code, key) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setCopiedCode(prev => ({ ...prev, [key]: false })), 2000);
    } catch (err) { }
  };

  const toggleSection = (id) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    if (!article?.githubUrl) return;
    const init = async () => {
      setLoading(true);
      try {
        const [contentRes, recentRes] = await Promise.all([
          fetch(toRawGithubUrl(article.githubUrl)).then(r => r.text()),
          publicArticleService.getRecent().catch(() => ({ articles: [] }))
        ]);
        setParsedContent(universalParse(contentRes));
        setRecentArticles(recentRes.articles?.filter(a => a.id !== article.id) || []);
      } catch (e) {
        setError("Connection failed");
        toast.error("Connection failed");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [article]);

  useEffect(() => {
    const handleScroll = () => setShowTopBtn(window.scrollY > 400);
    const handleKeyDown = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFocus(f => !f);
      }
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFocus = () => {
    setIsFocus(!isFocus);
    document.body.style.overflow = !isFocus ? 'hidden' : 'unset';
  };

  const renderBlock = (block) => {
    switch (block.type) {
      case 'text': return <div key={block.id} className="prose prose-gray dark:prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{block.content}</ReactMarkdown></div>;
      case 'carousel': return <ImageCarousel key={block.id} images={block.images} />;
      case 'image': return <SecureImage key={block.id} src={block.src} className="max-w-full my-6" />;
      case 'code':
        return (
          <CodeBlockViewer
            key={block.id}
            blocks={block.code}
            id={block.id}
            complexity={block.complexity}
            isDark={isDark}
            activeTabState={codeTabStates[block.id]}
            onTabChange={(val) => setCodeTabStates(prev => ({ ...prev, [block.id]: val }))}
            copiedState={copiedCode[`${block.id}-${codeTabStates[block.id] || (block.code[0]?.language || 'Code')}`]}
            onCopy={copyCode}
          />
        );
      default: return null;
    }
  };

  if (error) return <div className="p-6 text-red-500 flex items-center gap-2"><FaExclamationTriangle /> {error}</div>;
  if (!parsedContent && !loading) return <div className="p-12 text-center text-gray-400">No article details found.</div>;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]"><FaSpinner className="animate-spin text-indigo-500" size={30} /></div>;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[14px] sm:text-[15px] lg:text-[16px] text-gray-900 dark:text-white selection:bg-indigo-500/30">
      {/* Main Content Grid */}
      <div className={cn(
        "max-w-[1440px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-[1fr_25%] gap-16 transition-all duration-700",
        isFocus ? "fixed inset-0 z-[9999] bg-[var(--color-bg-primary)] overflow-y-auto pt-10" : "pt-4 pb-32"
      )}>
        {/* Immersive Close Button */}
        {isFocus && (
          <button onClick={toggleFocus} className="fixed top-8 right-8 p-4 bg-gray-100 hover:bg-rose-500 hover:text-white dark:bg-white/5 rounded-2xl dark:hover:bg-rose-500 text-gray-600 dark:text-white z-[10000] transition-all">
            <X size={24} />
          </button>
        )}

        {/* Article Content Column */}
        <div className={cn("max-w-[840px] min-w-0 w-full", isFocus && "mx-auto w-full max-w-[840px]")}>
          <h1 className="text-4xl font-normal text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">{parsedContent?.title || article.title}</h1>

          <div className="article-renderer space-y-8 max-w-none break-words">
            {parsedContent.sections.map((section, idx) => {
              if (section.type === 'standard') {
                return <div key={idx}>{section.content.map(renderBlock)}</div>;
              }
              if (section.type === 'approaches') {
                return (
                  <div key={idx} className="space-y-4">
                    {section.items.map((approach, aIdx) => (
                      <div key={approach.id} className="border border-indigo-200/60 dark:border-indigo-500/30 rounded-xl overflow-hidden bg-transparent">
                        <div
                          onClick={() => toggleSection(approach.id)}
                          className="cursor-pointer p-5 flex items-center justify-between hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-colors select-none"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-transparent border border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                              {aIdx + 1}
                            </div>
                            <h3 className="text-[15px] sm:text-base font-semibold text-gray-900 dark:text-zinc-100 leading-snug">
                              {approach.name}
                            </h3>
                          </div>
                          {expandedSections[approach.id]
                            ? <ChevronDownLucide className="w-5 h-5 text-indigo-600 dark:text-indigo-400 rotate-180 transition-transform" />
                            : <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          }
                        </div>
                        <AnimatePresence>
                          {expandedSections[approach.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-6 border-t border-indigo-100 dark:border-indigo-500/20 bg-transparent">
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
        </div>

        {/* Sidebar Column */}
        {!isFocus && (
          <aside className="space-y-12">
            <div className="sticky top-28 space-y-12">
              {/* Details Header */}
              <div className="w-fit py-1.5 px-4 bg-transparent border border-gray-300 dark:border-gray-700 rounded-full text-sm font-normal text-gray-700 dark:text-white">
                Details
              </div>

              {/* Author Section */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-[17px] font-normal text-gray-900 dark:text-white tracking-wide">Author</h4>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 font-normal">Article author information</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#1e1e1e] border border-gray-200 dark:border-transparent flex items-center justify-center text-sm font-normal text-gray-600 dark:text-gray-300">
                    {article.author?.firstName?.[0] || 'C'}{article.author?.lastName?.[0] || 'T'}
                  </div>
                  <div>
                    <h5 className="text-[14px] font-normal text-gray-800 dark:text-gray-100">{article.author?.firstName ? `${article.author.firstName} ${article.author.lastName || ''}` : 'AlphaLearn Team'}</h5>
                    <p className="text-[12px] text-gray-500 mt-0.5 font-normal">Author • {new Date(article.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {[FaFacebook, FaInstagram, FaTwitter].map((Icon, idx) => (
                    <button key={idx} className="w-9 h-9 rounded bg-transparent border border-gray-300 dark:border-gray-800/60 flex items-center justify-center text-gray-500 hover:text-indigo-600 dark:hover:text-white transition-colors">
                      <Icon size={14} />
                    </button>
                  ))}
                </div>

                {/* Mark as Read Button */}
                <div className="pt-4">
                  <button
                    onClick={async () => {
                      try {
                        const res = await publicArticleService.markAsRead(article.id);
                        if (res.success) {
                          toast.success('Article marked as read');
                          // You might want to update local state if article is managed here
                          if (article) article.isCompleted = true;
                        }
                      } catch (err) {
                        toast.error('Failed to mark as read');
                      }
                    }}
                    disabled={article.isCompleted}
                    className={cn(
                      "w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 font-medium",
                      article.isCompleted
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
                    )}
                  >
                    {article.isCompleted ? (
                      <>
                        <FaCheck size={14} />
                        Completed
                      </>
                    ) : (
                      <>
                        <BookOpen size={16} />
                        Mark as Read
                      </>
                    )}
                  </button>
                </div>
              </div>

              <hr className="border-[var(--color-border-interactive)]/80 my-8" />

              {/* Recent Articles Section */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-[17px] font-normal text-gray-900 dark:text-white tracking-wide">Recent Articles</h4>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 font-normal">Related and recent articles</p>
                </div>
                <div className="space-y-6">
                  {recentArticles.map(a => (
                    <Link key={a.id} to={`/articles/${a.slug}`} className="block group p-3 -mx-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-300">
                      <h5 className="text-[14px] font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors mb-2">{a.title}</h5>
                      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
                        <span>{new Date(a.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                        <span className="flex items-center gap-1.5"><FaRegClock size={12} /> {a.readTime}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Floating Top Arrow - Moved to Right Bottom */}
      <AnimatePresence>
        {showTopBtn && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 w-14 h-14 rounded-2xl bg-white dark:bg-white/5 backdrop-blur-2xl border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-xl dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] z-[200]"
          >
            <FaArrowUp size={16} />
          </motion.button>
        )}
      </AnimatePresence>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default PublicArticleViewer;








