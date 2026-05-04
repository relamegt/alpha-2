import React, { useState, useEffect } from 'react';
import { CheckCircle2, Trophy, Zap } from 'lucide-react';

const ProgressBar = ({ 
  completed, 
  total, 
  label, 
  variant = 'default',
  size = 'md',
  showIcon = true,
  animated = true,
  showLabels = true,
  color = 'blue',
  className = ''
}) => {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayPercentage(percentage);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayPercentage(percentage);
    }
  }, [percentage, animated]);

  const colorVariants = {
    blue: {
      bg: 'bg-primary-500',
      gradient: 'from-primary-400 to-primary-600',
      text: 'text-primary-600',
      bgLight: 'bg-primary-100',
      bgDark: 'dark:bg-primary-900/20'
    },
    green: {
      bg: 'bg-green-500',
      gradient: 'from-green-400 to-green-600',
      text: 'text-green-600',
      bgLight: 'bg-green-100',
      bgDark: 'dark:bg-green-900/20'
    },
    purple: {
      bg: 'bg-purple-500',
      gradient: 'from-purple-400 to-purple-600',
      text: 'text-purple-600',
      bgLight: 'bg-purple-100',
      bgDark: 'dark:bg-purple-900/20'
    },
    orange: {
      bg: 'bg-orange-500',
      gradient: 'from-orange-400 to-orange-600',
      text: 'text-orange-600',
      bgLight: 'bg-orange-100',
      bgDark: 'dark:bg-orange-900/20'
    },
    red: {
      bg: 'bg-red-500',
      gradient: 'from-red-400 to-red-600',
      text: 'text-red-600',
      bgLight: 'bg-red-100',
      bgDark: 'dark:bg-red-900/20'
    }
  };

  const sizeVariants = {
    xs: { height: 'h-1.5', text: 'text-[9px]', padding: 'p-2' },
    sm: { height: 'h-2', text: 'text-[10px]', padding: 'p-3' },
    md: { height: 'h-3', text: 'text-xs', padding: 'p-4' },
    lg: { height: 'h-4', text: 'text-sm', padding: 'p-5' },
    xl: { height: 'h-6', text: 'text-base', padding: 'p-6' }
  };

  const currentColor = colorVariants[color] || colorVariants.blue;
  const currentSize = sizeVariants[size] || sizeVariants.md;

  const getStatusIcon = () => {
    if (percentage === 100) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (percentage >= 75) return <Zap className="w-4 h-4 text-orange-500" />;
    if (percentage > 0) return <CheckCircle2 className={`w-4 h-4 ${currentColor.text}`} />;
    return null;
  };

  const renderProgressBar = () => {
    switch (variant) {
      case 'minimal':
        return (
          <div className={`w-full bg-gray-200 dark:bg-gray-800 rounded-full ${currentSize.height} overflow-hidden`}>
            <div 
              className={`h-full bg-gradient-to-r ${currentColor.gradient} rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${displayPercentage}%` }}
              role="progressbar"
            />
          </div>
        );
      default:
        return (
          <div className={`w-full bg-gray-200 dark:bg-gray-800 rounded-full ${currentSize.height} overflow-hidden shadow-inner`}>
            <div 
              className={`h-full bg-gradient-to-r ${currentColor.gradient} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
              style={{ width: `${displayPercentage}%` }}
              role="progressbar"
            >
              {animated && displayPercentage > 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full h-full animate-pulse" />
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {showIcon && getStatusIcon()}
            <span className={`font-bold text-gray-700 dark:text-gray-300 ${currentSize.text}`}>
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-black ${currentColor.text} dark:text-gray-300 ${currentSize.text}`}>
              {completed}/{total}
            </span>
            <span className={`text-gray-500 dark:text-gray-500 font-bold ${currentSize.text}`}>
              ({percentage}%)
            </span>
          </div>
        </div>
      )}
      {renderProgressBar()}
    </div>
  );
};

export default ProgressBar;








