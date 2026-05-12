import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

export const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-all duration-150"
      title="Copy to clipboard"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-400" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

export const CommandBlock = ({ label, command, step }) => (
  <div className="mb-4 last:mb-0">
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-500/10 text-primary-500 text-[10px] border border-primary-500/20">
        {step}
      </span>
      {label}
    </p>
    <div className="flex items-center bg-gray-950/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 group hover:border-primary-500/30 transition-all">
      <Terminal className="w-4 h-4 text-primary-500/50 mr-3 flex-shrink-0" />
      <code className="flex-1 text-primary-600 dark:text-emerald-400 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">{command}</code>
      <div className="ml-2">
        <CopyButton text={command} />
      </div>
    </div>
  </div>
);
