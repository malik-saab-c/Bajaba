
import React from 'react';
import { YouTubeIcon } from './IconComponents';

interface VideoPlayerProps {
  videoUrl: string | null;
  videoTitle: string;
  fileExtension?: string;
  onUploadClick: () => void;
}

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);


export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, videoTitle, fileExtension = 'mp4', onUploadClick }) => {
    if (!videoUrl) {
    return (
      <div className="aspect-video w-full bg-black rounded-lg border-2 border-gray-700 flex items-center justify-center">
        <div className="text-center">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-2">Finalizing video file...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border-2 border-gray-700">
        <video 
          src={videoUrl}
          controls
          className="w-full h-full"
        >
          Your browser does not support the video tag.
        </video>
      </div>
       <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href={videoUrl}
          download={`${videoTitle.replace(/ /g, '_')}.${fileExtension}`}
          className="w-full flex justify-center items-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
        >
          <DownloadIcon className="w-6 h-6" />
          Download Video
        </a>
        <button
          onClick={onUploadClick}
          className="w-full flex justify-center items-center gap-3 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
          <YouTubeIcon className="w-6 h-6" />
          Upload to YouTube
        </button>
      </div>
    </div>
  );
};
