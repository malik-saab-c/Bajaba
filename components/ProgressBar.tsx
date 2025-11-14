import React from 'react';

interface ProgressBarProps {
  progress: number;
  isRendering?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, isRendering }) => {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-base font-medium text-cyan-400">
            {isRendering ? 'Rendering Video...' : 'Generation Progress'}
        </span>
        <span className="text-sm font-medium text-cyan-400">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div 
          className="bg-gradient-to-r from-cyan-500 to-teal-400 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};