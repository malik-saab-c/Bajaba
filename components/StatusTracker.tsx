
import React, { useRef, useEffect } from 'react';
import type { StatusUpdate } from '../types';
import { CheckCircleIcon, CogIcon } from './IconComponents';

interface StatusTrackerProps {
  updates: StatusUpdate[];
}

export const StatusTracker: React.FC<StatusTrackerProps> = ({ updates }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [updates]);

  return (
    <div className="w-full bg-gray-900/50 rounded-lg p-4 border border-gray-700 max-h-60 overflow-y-auto" ref={scrollRef}>
      <ul className="space-y-3">
        {updates.map((update, index) => (
          <li key={index} className="flex items-start gap-3">
            <div>
              {update.current ? (
                <CogIcon className={`w-5 h-5 mt-0.5 text-cyan-400 animate-spin`} />
              ) : (
                <CheckCircleIcon className="w-5 h-5 mt-0.5 text-green-500" />
              )}
            </div>
            <div className="flex-1">
                <p className={`text-sm ${update.current ? 'text-white font-semibold' : 'text-gray-400'}`}>
                    {update.message}
                </p>
                <time className="text-xs text-gray-500">
                    {update.timestamp.toLocaleTimeString()}
                </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
