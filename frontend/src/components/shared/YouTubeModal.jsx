import React, { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Youtube,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

const YouTubeModal = ({
  videoUrl,
  isOpen,
  onClose,
  problemName,
  autoplay = true,
  showControls = true,
  theme = 'dark'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const getVideoId = useCallback((url) => {
    if (!url) return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }, []);

  const videoId = getVideoId(videoUrl);

  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  const openInNewTab = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'hidden';
      setIsLoading(true);
      setHasError(false);
    } else {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyPress]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!isOpen) return null;

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1&showinfo=0&controls=${showControls ? 1 : 0}${theme === 'dark' ? '&color=white' : ''}`
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-300"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal Container */}
      <div
        className={`
          relative w-full max-w-5xl mx-auto 
          bg-[#F1F3F4] dark:bg-slate-900
          rounded-2xl shadow-2xl overflow-hidden
          border border-gray-100 dark:border-gray-800
          transform transition-all duration-300 ease-out
          max-h-[90vh]
          animate-in zoom-in-95 fade-in duration-200
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20 text-red-500">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              {problemName ? (
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {problemName}
                </h3>
              ) : (
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Video Solution
                </h3>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {videoUrl && (
              <button
                onClick={openInNewTab}
                className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Content */}
        <div className="relative bg-black h-[60vh]">
          {embedUrl ? (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                  <div className="text-center space-y-4">
                    <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
                    <div>
                      <p className="text-white font-semibold">Loading video...</p>
                    </div>
                  </div>
                </div>
              )}

              {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                  <div className="text-center space-y-4 p-6">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">Failed to load video</h4>
                    </div>
                    <button
                      onClick={openInNewTab}
                      className="inline-flex items-center space-x-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-bold text-sm"
                    >
                      <Youtube className="w-5 h-5" />
                      <span>Watch on YouTube</span>
                    </button>
                  </div>
                </div>
              )}

              <iframe
                src={embedUrl}
                title={`Video Solution${problemName ? ` - ${problemName}` : ''}`}
                className="absolute inset-0 w-full h-full border-0 rounded-b-2xl"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                loading="lazy"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-900 p-8">
              <div className="text-center space-y-4 max-w-sm">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Invalid Video URL</h4>
                  <p className="text-gray-400 text-sm">
                    The video URL provided is not valid or accessible. Please check the problem settings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default YouTubeModal;








