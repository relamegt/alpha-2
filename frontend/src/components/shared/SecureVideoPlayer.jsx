import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Play, Pause, Settings, ChevronLeft, ChevronRight,
    Maximize2, Minimize2, Loader2, CheckCircle,
    Volume2, VolumeX, Volume1
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Format time ─────────────────────────────────────────────────────────────
const formatTime = (s) => {
    if (!s || isNaN(s) || s < 0) return '0:00';
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ─── Smart Quality Mapping System ────────────────────────────────────────────
// YouTube provides qualities ordered from highest to lowest or lowest to highest depending on the device.
// We establish a strict ranking to ensure we always map them correctly.
const QUALITY_RANKING = {
    highres: 8, hd2160: 7, hd1440: 6, hd1080: 5, hd720: 4,
    large: 3, medium: 2, small: 1, tiny: 0, auto: -1
};

const buildSimplifiedQualities = (ytQualities) => {
    // Filter out auto and invalid strings, then sort from lowest (0) to highest (8)
    const available = ytQualities
        .filter(q => q !== 'auto' && QUALITY_RANKING[q] !== undefined)
        .sort((a, b) => QUALITY_RANKING[a] - QUALITY_RANKING[b]);

    if (available.length === 0) return [{ label: 'Auto', ytValue: 'auto', id: 'auto' }];

    const mappedQualities = [{ label: 'Auto', ytValue: 'auto', id: 'auto' }];

    // Smart mapping based on what the video actually supports
    if (available.length >= 3) {
        mappedQualities.push({ label: 'Low', ytValue: available[0], id: 'low' }); // Lowest available (e.g., tiny/144p)
        mappedQualities.push({ label: 'Medium', ytValue: available[Math.floor(available.length / 2)], id: 'medium' }); // Middle
        mappedQualities.push({ label: 'High', ytValue: available[available.length - 1], id: 'high' }); // Highest available
    } else if (available.length === 2) {
        mappedQualities.push({ label: 'Low', ytValue: available[0], id: 'low' });
        mappedQualities.push({ label: 'High', ytValue: available[1], id: 'high' });
    } else {
        mappedQualities.push({ label: 'High', ytValue: available[0], id: 'high' });
    }

    return mappedQualities;
};


// ─── Build YouTube Embed URL ─────────────────────────────────────────────────
const buildEmbedUrl = (ytId, vq = '', start = 0, autoplay = 0) => {
    const params = new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        rel: '0',
        modestbranding: '1',
        controls: '0',
        showinfo: '0',
        disablekb: '1',
        iv_load_policy: '3',
        fs: '0',
        enablejsapi: '1',
        playsinline: '1',
        origin: window.location.origin,
        widgetid: '1',
        ...(start > 0 ? { start: Math.floor(start) } : {}),
        ...(vq && vq !== 'auto' ? { vq } : {})
    });
    return `https://www.youtube-nocookie.com/embed/${ytId}?${params.toString()}`;
};

// ─── Extract YouTube info ────────────────────────────────────────────────────
const getYoutubeInfo = (url) => {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const ytId = match && match[2].length === 11 ? match[2] : null;
    if (!ytId) return { id: null, thumb: null };
    return {
        id: ytId,
        thumb: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
    };
};

const SecureVideoPlayer = ({ url, title, onComplete, isSolved, isSubmitting }) => {
    const { isDark } = useTheme();

    const iframeRef = useRef(null);
    const progressRef = useRef(null);
    const volumeRef = useRef(null);
    const hideTimerRef = useRef(null);
    const playerContainerRef = useRef(null);

    const currentTimeRef = useRef(0);
    const durationRef = useRef(0);
    const isPlayingRef = useRef(false);
    const ytIdRef = useRef('');
    const volumeRefState = useRef(100);
    const targetPlayStateRef = useRef('play');

    // Quality Tracking state
    const [qualityOptions, setQualityOptions] = useState([{ label: 'Auto', ytValue: 'auto', id: 'auto' }]);
    const [activeQualityId, setActiveQualityId] = useState('auto');
    const activeQualityIdRef = useRef('auto');

    // ─── State ──────────────────────────────────────────────────────────────
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [iframeSrc, setIframeSrc] = useState('');
    const [showControls, setShowControls] = useState(true);
    const [settingsView, setSettingsView] = useState(null);
    const [isSeeking, setIsSeeking] = useState(false);
    const [isVolDragging, setIsVolDragging] = useState(false);
    const [hoverProgress, setHoverProgress] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isChangingQuality, setIsChangingQuality] = useState(false);

    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
    useEffect(() => { durationRef.current = duration; }, [duration]);
    useEffect(() => { volumeRefState.current = volume; }, [volume]);
    useEffect(() => { activeQualityIdRef.current = activeQualityId; }, [activeQualityId]);

    useEffect(() => {
        if (!url) return;
        const { id } = getYoutubeInfo(url);
        if (!id) return;
        ytIdRef.current = id;

        // Reset defaults on new video
        setActiveQualityId('auto');
        setQualityOptions([{ label: 'Auto', ytValue: 'auto', id: 'auto' }]);

        setIframeSrc(buildEmbedUrl(id, '', 0, 0));
    }, [url]);

    // ─── PostMessage helper ──────────────────────────────────────────────────
    const sendCommand = useCallback((func, args = []) => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
            event: 'command',
            func,
            args: Array.isArray(args) ? args : [args]
        }), '*');
    }, []);

    // ─── Best-effort internal quality apply ──────────────────────────────────
    const applyRequestedQuality = useCallback((ytQualityValue) => {
        if (!ytQualityValue || ytQualityValue === 'auto') {
            sendCommand('setPlaybackQuality', ['default']);
            return;
        }
        sendCommand('setPlaybackQuality', [ytQualityValue]);
    }, [sendCommand]);

    // ─── YouTube API listener ────────────────────────────────────────────────
    useEffect(() => {
        const handle = (event) => {
            if (!event.origin.includes('youtube')) return;

            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                if (data.event === 'infoDelivery' && data.info) {
                    const info = data.info;

                    if (typeof info.currentTime === 'number' && !isSeeking && !isChangingQuality) {
                        setCurrentTime(info.currentTime);
                    }

                    if (typeof info.duration === 'number' && info.duration > 0) {
                        setDuration(info.duration);
                    }

                    if (typeof info.videoLoadedFraction === 'number') {
                        setBuffered(info.videoLoadedFraction);
                    }

                    if (typeof info.volume === 'number' && !isVolDragging) {
                        setVolume(info.volume);
                    }

                    if (typeof info.muted === 'boolean') {
                        setIsMuted(info.muted);
                    }

                    // Dynamically map YouTube's raw levels into Auto/Low/Medium/High
                    if (Array.isArray(info.availableQualityLevels) && info.availableQualityLevels.length > 0) {
                        setQualityOptions(buildSimplifiedQualities(info.availableQualityLevels));
                    }

                    if (typeof info.playerState === 'number') {
                        const s = info.playerState;
                        setIsBuffering(s === 3);
                        setIsPlaying(s === 1);

                        if (s === 1 || s === 2) {
                            if (!hasStarted) setHasStarted(true);

                            // Handle resume logic after quality-triggered iframe reload
                            if (isChangingQuality) {
                                const currentOpt = qualityOptions.find(o => o.id === activeQualityIdRef.current);
                                applyRequestedQuality(currentOpt ? currentOpt.ytValue : 'auto');

                                if (targetPlayStateRef.current === 'pause') {
                                    setTimeout(() => sendCommand('pauseVideo'), 150);
                                }
                                setTimeout(() => setIsChangingQuality(false), 350);
                            }
                        }
                    }
                }

                if (data.event === 'onReady') {
                    sendCommand('setVolume', [volumeRefState.current]);
                    const currentOpt = qualityOptions.find(o => o.id === activeQualityIdRef.current);
                    applyRequestedQuality(currentOpt ? currentOpt.ytValue : 'auto');
                }

                if (data.event === 'onStateChange' && typeof data.info === 'number') {
                    const s = data.info;
                    setIsPlaying(s === 1);
                    setIsBuffering(s === 3);

                    if (s === 1 || s === 2) {
                        if (!hasStarted) setHasStarted(true);
                    }
                }
            } catch (_) { }
        };

        window.addEventListener('message', handle);
        return () => window.removeEventListener('message', handle);
    }, [isSeeking, isVolDragging, hasStarted, isChangingQuality, sendCommand, applyRequestedQuality, qualityOptions]);

    const handleIframeLoad = useCallback(() => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*');
        sendCommand('setVolume', [volumeRefState.current]);
    }, [sendCommand]);

    // ─── Auto hide controls ──────────────────────────────────────────────────
    const resetHideTimer = useCallback(() => {
        setShowControls(true);
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            if (isPlayingRef.current) {
                setShowControls(false);
                setSettingsView(null);
            }
        }, 3000);
    }, []);

    useEffect(() => {
        if (!isPlaying) setShowControls(true);
        else resetHideTimer();
    }, [isPlaying, resetHideTimer]);

    useEffect(() => {
        if (!settingsView) return;
        const close = (e) => {
            if (!e.target.closest('.svp-settings')) setSettingsView(null);
        };
        const t = setTimeout(() => document.addEventListener('mousedown', close), 0);
        return () => {
            clearTimeout(t);
            document.removeEventListener('mousedown', close);
        };
    }, [settingsView]);

    // ─── Fullscreen ──────────────────────────────────────────────────────────
    const toggleFullscreen = useCallback(() => {
        if (!playerContainerRef.current) return;
        if (!document.fullscreenElement) {
            playerContainerRef.current.requestFullscreen?.().catch(() => { });
        } else {
            document.exitFullscreen?.().catch(() => { });
        }
    }, []);

    useEffect(() => {
        const h = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', h);
        return () => document.removeEventListener('fullscreenchange', h);
    }, []);

    // ─── Actions ─────────────────────────────────────────────────────────────
    const togglePlay = useCallback(() => {
        const next = !isPlayingRef.current;
        setIsPlaying(next);
        sendCommand(next ? 'playVideo' : 'pauseVideo');
        if (next && !hasStarted) setHasStarted(true);
        resetHideTimer();
    }, [sendCommand, hasStarted, resetHideTimer]);

    const changeSpeed = useCallback((s) => {
        setSpeed(s);
        sendCommand('setPlaybackRate', [s]);
        setSettingsView(null);
    }, [sendCommand]);

    const changeQuality = useCallback((optId, ytValue) => {
        if (optId === activeQualityId) {
            setSettingsView(null);
            return;
        }

        setActiveQualityId(optId);
        setSettingsView(null);

        const t = currentTimeRef.current;
        targetPlayStateRef.current = isPlayingRef.current ? 'play' : 'pause';

        setIsChangingQuality(true);

        // Best effort: Hard reload the iframe with the specific raw 'vq' mapped value
        const newSrc = buildEmbedUrl(ytIdRef.current, ytValue, t, 1);
        setIframeSrc(newSrc);
    }, [activeQualityId]);

    const seekTo = useCallback((time) => {
        const nextTime = Math.max(0, Math.min(durationRef.current || 0, time));
        setIsSeeking(true);
        setCurrentTime(nextTime);
        currentTimeRef.current = nextTime;
        sendCommand('seekTo', [nextTime, true]);
        setTimeout(() => setIsSeeking(false), 180);
    }, [sendCommand]);

    const changeVolume = useCallback((newVol) => {
        const v = Math.max(0, Math.min(100, newVol));
        setVolume(v);
        volumeRefState.current = v;

        if (v > 0 && isMuted) {
            setIsMuted(false);
            sendCommand('unMute');
        }
        sendCommand('setVolume', [v]);
    }, [isMuted, sendCommand]);

    const toggleMute = useCallback(() => {
        const next = !isMuted;
        setIsMuted(next);
        sendCommand(next ? 'mute' : 'unMute');
    }, [isMuted, sendCommand]);

    // ─── Seek & volume drag ──────────────────────────────────────────────────
    const getFraction = useCallback((e, ref) => {
        if (!ref.current) return null;
        const r = ref.current.getBoundingClientRect();
        return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    }, []);

    const handleProgressDrag = useCallback((e) => {
        const f = getFraction(e, progressRef);
        if (f !== null && durationRef.current > 0) {
            const nextTime = f * durationRef.current;
            setCurrentTime(nextTime);
            currentTimeRef.current = nextTime;
            sendCommand('seekTo', [nextTime, false]);
        }
    }, [getFraction, sendCommand]);

    const handleVolumeDrag = useCallback((e) => {
        const f = getFraction(e, volumeRef);
        if (f !== null) changeVolume(f * 100);
    }, [getFraction, changeVolume]);

    useEffect(() => {
        const up = () => {
            if (isSeeking) {
                sendCommand('seekTo', [currentTimeRef.current, true]);
                setTimeout(() => setIsSeeking(false), 100);
            }
            setIsVolDragging(false);
        };

        const move = (e) => {
            if (isSeeking) handleProgressDrag(e);
            if (isVolDragging) handleVolumeDrag(e);
        };

        if (isSeeking || isVolDragging) {
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        }

        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
    }, [isSeeking, isVolDragging, handleProgressDrag, handleVolumeDrag, sendCommand]);

    // ─── Keyboard shortcuts ──────────────────────────────────────────────────
    useEffect(() => {
        const h = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    seekTo(currentTimeRef.current - 10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    seekTo(currentTimeRef.current + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    changeVolume(volumeRefState.current + 10);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    changeVolume(volumeRefState.current - 10);
                    break;
                case 'KeyM':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'KeyF':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [togglePlay, seekTo, toggleFullscreen, changeVolume, toggleMute]);

    // ─── Render guard ────────────────────────────────────────────────────────
    if (!url) {
        return (
            <div className="aspect-video bg-[var(--color-bg-card)] rounded-2xl flex items-center justify-center text-gray-500 font-medium font-sans">
                Video Content Unavailable
            </div>
        );
    }

    const { thumb: thumbUrl } = getYoutubeInfo(url);
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const currentVol = isMuted ? 0 : volume;
    const activeQualityLabel = qualityOptions.find(q => q.id === activeQualityId)?.label || 'Auto';

    return (
        <div
            className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 font-sans"
            onContextMenu={(e) => e.preventDefault()}
        >
            <div
                ref={playerContainerRef}
                className={`relative w-full bg-black cursor-default select-none shadow-2xl ${isFullscreen ? 'rounded-none' : 'rounded-xl sm:rounded-2xl'}`}
                style={
                    isFullscreen
                        ? { width: '100vw', height: '100vh', overflow: 'hidden' }
                        : { aspectRatio: '16/9', overflow: 'hidden' }
                }
                onMouseMove={resetHideTimer}
                onMouseLeave={() => {
                    if (isPlaying) {
                        setShowControls(false);
                        setSettingsView(null);
                    }
                    setHoverProgress(null);
                }}
            >
                {/* YouTube iframe */}
                {iframeSrc && (
                    <div className="absolute inset-0 pointer-events-none bg-black">
                        <iframe
                            ref={iframeRef}
                            key={iframeSrc}
                            src={iframeSrc}
                            title={title || 'Secure Video'}
                            className="w-full h-full border-0 pointer-events-none"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            onLoad={handleIframeLoad}
                        />
                    </div>
                )}

                {/* Thumbnail before start */}
                {!hasStarted && thumbUrl && !isBuffering && !isChangingQuality && (
                    <div
                        className="absolute inset-0 z-20 bg-cover bg-center flex items-center justify-center"
                        style={{ backgroundImage: `url(${thumbUrl})` }}
                    >
                        <div className="absolute inset-0 bg-black/30 transition-colors hover:bg-black/45" />
                        <button
                            className="relative z-30 w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.6)] cursor-pointer hover:scale-105 active:scale-95 transition-all border border-white/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePlay();
                            }}
                        >
                            <Play size={28} className="text-white fill-white ml-1.5" />
                        </button>
                    </div>
                )}

                {/* Minimal pause overlay */}
                {!isPlaying && hasStarted && !isBuffering && !isChangingQuality && (
                    <div className="absolute inset-0 z-20 bg-black/20 transition-all duration-200 pointer-events-none flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-black/45 flex items-center justify-center border border-white/20 shadow-xl">
                            <Play size={28} className="text-white fill-white ml-1.5" />
                        </div>
                    </div>
                )}

                {/* Buffering / quality change overlay */}
                {(isBuffering || isChangingQuality) && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-black/18 transition-all duration-200">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative flex items-center justify-center w-12 h-12 bg-black/70 rounded-full border border-white/10 shadow-2xl">
                                <Loader2 size={24} className="text-purple-500 animate-spin" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Click interceptor */}
                <div
                    className="absolute inset-0 z-[15]"
                    onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                    }}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        toggleFullscreen();
                    }}
                />

                {/* Live dot */}
                <div className={`absolute top-5 left-5 z-40 pointer-events-none transition-opacity duration-300 ${showControls && hasStarted && isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="w-1 h-1 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.8)] animate-pulse" />
                </div>

                {/* Control bar */}
                <div className={`absolute bottom-0 inset-x-0 z-30 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                    <div className="relative px-4 sm:px-5 pb-4 sm:pb-5 pt-10">
                        {/* Seekbar */}
                        <div
                            ref={progressRef}
                            className="group/pb w-full h-1.5 hover:h-2 bg-white/20 rounded-full cursor-pointer mb-4 relative transition-all duration-150"
                            onMouseMove={(e) => {
                                const f = getFraction(e, progressRef);
                                if (f !== null) setHoverProgress(f);
                            }}
                            onMouseLeave={() => setHoverProgress(null)}
                            onMouseDown={(e) => {
                                setIsSeeking(true);
                                handleProgressDrag(e);
                            }}
                        >
                            <div
                                className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-300"
                                style={{ width: `${buffered * 100}%` }}
                            />
                            <div
                                className="absolute inset-y-0 left-0 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                                style={{ width: `${progress}%` }}
                            />

                            {hoverProgress !== null && duration > 0 && (
                                <div
                                    className="absolute -top-10 bg-[#0d0d0d] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-md border border-white/10 shadow-xl pointer-events-none"
                                    style={{ left: `${hoverProgress * 100}%`, transform: 'translateX(-50%)' }}
                                >
                                    {formatTime(hoverProgress * duration)}
                                </div>
                            )}

                            <div
                                className="absolute top-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] scale-0 group-hover/pb:scale-100 transition-transform border border-purple-200"
                                style={{ left: `${progress}%`, transform: 'translate(-50%,-50%)' }}
                            />
                        </div>

                        {/* Buttons row */}
                        <div className="flex items-center justify-between">
                            {/* Left */}
                            <div className="flex items-center gap-3 sm:gap-5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePlay();
                                    }}
                                    className="w-9 h-9 flex items-center justify-center text-white hover:text-purple-400 transition-colors rounded-full hover:bg-white/10 active:scale-90"
                                >
                                    {isPlaying
                                        ? <Pause size={20} className="fill-current" />
                                        : <Play size={20} className="fill-current ml-1" />
                                    }
                                </button>

                                <div className="flex items-center gap-2 group/vol">
                                    <button onClick={toggleMute} className="text-white hover:text-purple-400 transition-colors">
                                        {isMuted || volume === 0
                                            ? <VolumeX size={18} />
                                            : volume < 50
                                                ? <Volume1 size={18} />
                                                : <Volume2 size={18} />}
                                    </button>

                                    <div
                                        className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300 flex items-center"
                                        onMouseDown={(e) => {
                                            setIsVolDragging(true);
                                            handleVolumeDrag(e);
                                        }}
                                    >
                                        <div ref={volumeRef} className="w-24 h-1.5 bg-white/20 rounded-full cursor-pointer relative mx-1">
                                            <div
                                                className="absolute inset-y-0 left-0 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                                                style={{ width: `${currentVol}%` }}
                                            />
                                            <div
                                                className="absolute top-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)] scale-0 group-hover/vol:scale-100 transition-transform"
                                                style={{ left: `${currentVol}%`, transform: 'translate(-50%,-50%)' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center text-[12px] font-bold text-white/70 tabular-nums gap-1.5 ml-1">
                                    <span className="text-white">{formatTime(currentTime)}</span>
                                    <span className="opacity-40">/</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Right */}
                            <div className="flex items-center gap-2 svp-settings relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSettingsView(prev => prev ? null : 'main');
                                    }}
                                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${settingsView ? 'text-purple-400 bg-white/10' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                                >
                                    <Settings size={18} className={`transition-transform duration-500 ${settingsView ? 'rotate-90' : ''}`} />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFullscreen();
                                    }}
                                    className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                >
                                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>

                                {settingsView === 'main' && (
                                    <div className="absolute bottom-12 right-0 bg-[#0d0d0d]/95 rounded-xl border border-white/10 py-2 z-50 shadow-[0_20px_60px_rgba(0,0,0,0.8)] min-w-[220px] overflow-hidden text-white font-medium">
                                        <div className="px-5 py-2.5 text-[11px] font-black text-white/30 uppercase tracking-widest border-b border-white/5 mb-1">
                                            Settings
                                        </div>
                                        <button
                                            onClick={() => setSettingsView('speed')}
                                            className="w-full text-left px-5 py-3.5 text-[13px] hover:bg-white/10 transition-all flex items-center justify-between group"
                                        >
                                            <span>Playback Speed</span>
                                            <span className="text-white/50 text-[12px] flex items-center gap-1 group-hover:text-purple-400">
                                                {speed === 1 ? 'Normal' : `${speed}x`} <ChevronRight size={14} />
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setSettingsView('quality')}
                                            className="w-full text-left px-5 py-3.5 text-[13px] hover:bg-white/10 transition-all flex items-center justify-between group"
                                        >
                                            <span>Quality</span>
                                            <span className="text-white/50 text-[12px] flex items-center gap-1 group-hover:text-purple-400">
                                                {activeQualityLabel} <ChevronRight size={14} />
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {settingsView === 'speed' && (
                                    <div className="absolute bottom-12 right-0 bg-[#0d0d0d]/95 rounded-xl border border-white/10 py-2 z-50 shadow-[0_20px_60px_rgba(0,0,0,0.8)] min-w-[180px] text-white">
                                        <div
                                            className="px-4 py-2.5 text-[12px] font-bold border-b border-white/5 mb-1 flex items-center gap-2 cursor-pointer hover:text-purple-400 transition-colors"
                                            onClick={() => setSettingsView('main')}
                                        >
                                            <ChevronLeft size={16} /> Speed
                                        </div>
                                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => changeSpeed(s)}
                                                className={`w-full text-left px-5 py-3 text-[13px] flex items-center justify-between transition-all ${speed === s ? 'text-purple-400 bg-purple-500/10 font-bold' : 'hover:bg-white/10'}`}
                                            >
                                                <span>{s === 1 ? 'Normal' : `${s}x`}</span>
                                                {speed === s && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {settingsView === 'quality' && (
                                    <div className="absolute bottom-12 right-0 bg-[#0d0d0d]/95 rounded-xl border border-white/10 py-2 z-50 shadow-[0_20px_60px_rgba(0,0,0,0.8)] min-w-[190px] max-h-[300px] overflow-y-auto text-white">
                                        <div
                                            className="px-4 py-2.5 text-[12px] font-bold border-b border-white/5 mb-1 flex items-center gap-2 cursor-pointer hover:text-purple-400 transition-colors"
                                            onClick={() => setSettingsView('main')}
                                        >
                                            <ChevronLeft size={16} /> Quality
                                        </div>
                                        {qualityOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => changeQuality(opt.id, opt.ytValue)}
                                                className={`w-full text-left px-5 py-3 text-[13px] flex items-center justify-between transition-all ${activeQualityId === opt.id ? 'text-purple-400 bg-purple-500/10 font-bold' : 'hover:bg-white/10'}`}
                                            >
                                                <span>{opt.label}</span>
                                                {activeQualityId === opt.id && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mark as Watched Section tight to player */}
            {onComplete && (
                <div className="flex justify-center -mt-1 pb-1">
                    <button
                        disabled={isSubmitting || isSolved}
                        onClick={onComplete}
                        className="group relative overflow-hidden flex items-center gap-2 px-6 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] shadow-sm shadow-purple-500/30 border border-white/10 mx-auto"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        {isSolved
                            ? <CheckCircle size={11} />
                            : isSubmitting
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Play size={9} className="fill-current" />
                        }
                        <span className="tracking-widest uppercase">
                            {isSolved ? 'Completed' : 'Mark as Watched'}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default SecureVideoPlayer;








