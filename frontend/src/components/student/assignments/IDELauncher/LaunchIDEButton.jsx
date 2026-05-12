import { useState } from 'react';
import { Monitor, AlertTriangle, Loader2, Zap } from 'lucide-react';
import { useIDEHealth } from '../../../../hooks/useIDEHealth';

export default function LaunchIDEButton({ assignment }) {
  const { isRunning, ideUrl } = useIDEHealth();
  const [isOpening, setIsOpening] = useState(false);

  const handleLaunch = () => {
    setIsOpening(true);
    // Open in a new tab using the detected URL
    window.open(ideUrl, '_blank');
    // Reset opening state after a small delay
    setTimeout(() => setIsOpening(false), 2000);
  };

  if (isRunning === null) {
    return (
      <button
        disabled
        className="w-full flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 px-6 py-4 rounded-2xl cursor-not-allowed text-sm font-bold border border-gray-100 dark:border-gray-800"
      >
        <Loader2 className="animate-spin w-4 h-4" />
        Synchronizing with IDE...
      </button>
    );
  }

  if (isRunning) {
    return (
      <button
        onClick={handleLaunch}
        className="w-full flex items-center justify-center gap-3 text-white px-6 py-4 rounded-2xl text-sm font-black transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-primary-500/25 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500"
      >
        {isOpening ? <Loader2 className="animate-spin w-4 h-4" /> : <Monitor className="w-5 h-5" />}
        {isOpening ? 'Opening Workspace...' : 'Launch Professional IDE'}
        {!isOpening && <Zap className="w-4 h-4 opacity-70 animate-pulse" />}
      </button>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-black text-amber-900 dark:text-amber-400 uppercase tracking-wider">IDE Offline</p>
          <p className="text-xs font-medium text-amber-700/70 dark:text-amber-500/60 leading-relaxed">
            Your local development environment is not running. Start it in your terminal to continue.
          </p>
        </div>
      </div>
      
      <div className="p-5 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-2xl">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">How to start:</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500">1</div>
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400">Open Terminal / WSL</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500">2</div>
            <code className="text-[10px] font-mono text-primary-600 bg-primary-500/5 px-2 py-1 rounded">cd ~/alpha-ide && docker-compose up -d</code>
          </div>
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="w-full py-3 text-[10px] font-black text-gray-500 hover:text-primary-600 uppercase tracking-widest transition-all"
      >
        🔄 Refresh Status
      </button>
    </div>
  );
}
