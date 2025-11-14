import React, { useState } from 'react';
import { SparklesIcon, UploadIcon } from './IconComponents';

interface StoryFormProps {
  onSubmit: (prompt: string, length: number, style: string, aspectRatio: string, image?: File) => void;
  isLoading: boolean;
  generationMode: 'story' | 'veo';
  setGenerationMode: (mode: 'story' | 'veo') => void;
}

export const StoryForm: React.FC<StoryFormProps> = ({ onSubmit, isLoading, generationMode, setGenerationMode }) => {
  const [prompt, setPrompt] = useState('A shy squirrel who learns to sing for his forest friends.');
  const [length, setLength] = useState(30);
  const [style, setStyle] = useState('bright 2D cartoon, simple shapes, bold outlines');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt, length, style, aspectRatio, image || undefined);
    }
  };
  
  const stylePresets = [
    'bright 2D cartoon, simple shapes, bold outlines',
    'cinematic anime style, detailed backgrounds',
    'vintage comic book, halftone patterns',
    'storybook illustration, watercolor texture',
    'low-poly 3D animation'
  ];

  return (
    <>
      <div className="mb-4">
        <div className="flex justify-center">
            <div className="bg-gray-700 rounded-lg p-1 flex space-x-1">
                <button
                    type="button"
                    onClick={() => setGenerationMode('story')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        generationMode === 'story' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-600'
                    }`}
                    disabled={isLoading}
                >
                    Full Story Pipeline
                </button>
                <button
                    type="button"
                    onClick={() => setGenerationMode('veo')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        generationMode === 'veo' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-600'
                    }`}
                    disabled={isLoading}
                >
                    Veo Direct
                </button>
            </div>
        </div>
        <p className="text-center text-gray-400 text-sm mt-3">
            {generationMode === 'story'
                ? 'Generates a full script, images, and voiceover, then renders a video.'
                : 'Directly generates a short video clip from a prompt using Veo.'
            }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 border-t border-gray-700 pt-6">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-cyan-400 mb-2">
            {generationMode === 'story' ? 'Story Idea' : 'Video Prompt'}
          </label>
          <textarea
            id="prompt"
            rows={3}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={generationMode === 'story' ? "e.g., A brave knight who is afraid of spiders" : "e.g., A neon hologram of a cat driving at top speed"}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
            <label htmlFor="aspectRatio" className="block text-sm font-medium text-cyan-400 mb-2">
              Aspect Ratio
            </label>
            <select
              id="aspectRatio"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              disabled={isLoading}
            >
               <option value="16:9">16:9 (Landscape)</option>
               <option value="9:16">9:16 (Portrait)</option>
               <option value="1:1">1:1 (Square)</option>
            </select>
          </div>
          {generationMode === 'story' && (
            <div>
              <label htmlFor="length" className="block text-sm font-medium text-cyan-400 mb-2">
                Video Length (seconds)
              </label>
              <input
                type="number"
                id="length"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                min="10"
                max="180"
                step="1"
                disabled={isLoading}
              />
            </div>
          )}
        </div>
        
        {generationMode === 'story' && (
            <div>
                <label htmlFor="style" className="block text-sm font-medium text-cyan-400 mb-2">
                Art Style
                </label>
                <select
                id="style"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                disabled={isLoading}
                >
                    {stylePresets.map(s => <option key={s} value={s}>{s.split(',')[0]}</option>)}
                </select>
            </div>
        )}


        <div>
            <label className="block text-sm font-medium text-cyan-400 mb-2">
            Reference Image (Optional)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-lg">
            <div className="space-y-1 text-center">
                {imagePreview ? (
                <img src={imagePreview} alt="Reference Preview" className="mx-auto h-24 w-24 object-cover rounded-md"/>
                ) : (
                <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
                )}
                <div className="flex text-sm text-gray-400">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-cyan-500 hover:text-cyan-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-cyan-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" disabled={isLoading}/>
                </label>
                <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </div>
            </div>
        </div>

        <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="w-full flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
        >
            {isLoading ? (
            <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
            </>
            ) : (
            <>
                <SparklesIcon className="w-5 h-5"/>
                {generationMode === 'story' ? 'Generate Story' : 'Generate Video'}
            </>
            )}
        </button>
        </form>
    </>
  );
};
