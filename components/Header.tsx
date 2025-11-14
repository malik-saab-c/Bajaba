
import React from 'react';
import { FilmIcon } from './IconComponents';

export const Header: React.FC = () => {
  return (
    <header className="w-full max-w-5xl mx-auto text-center mb-8">
      <div className="flex items-center justify-center gap-4">
        <FilmIcon className="w-10 h-10 text-cyan-400" />
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-500">
          Cartoon Story Generator
        </h1>
      </div>
      <p className="mt-4 text-lg text-gray-400">
        Turn your ideas into animated stories with the power of Gemini.
      </p>
    </header>
  );
};
