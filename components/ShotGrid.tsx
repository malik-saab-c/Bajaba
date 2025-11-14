import React from 'react';
import type { Scene, Character, Dialogue } from '../types';
import { CogIcon } from './IconComponents';

const ShotCard: React.FC<{ dialogue: Dialogue, character?: Character }> = ({ dialogue, character }) => {
  return (
    <div className="bg-gray-700/80 rounded-lg overflow-hidden border border-gray-600 group transform transition duration-300 hover:scale-105 hover:border-cyan-500 relative aspect-video flex items-center justify-center">
        {dialogue.imageUrl ? (
            <img
                src={dialogue.imageUrl}
                alt={dialogue.image_prompt}
                className="w-full h-full object-cover transition duration-300 group-hover:opacity-80"
            />
        ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500">
                <CogIcon className="w-10 h-10 animate-spin" />
                <span className="text-xs">Generating Shot...</span>
            </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 backdrop-blur-sm">
            <p className="text-xs text-cyan-300 font-bold">{character?.name || 'Narrator'}</p>
            <p className="text-xs text-white truncate">{dialogue.text}</p>
        </div>
    </div>
  );
};

export const ShotGrid: React.FC<{ scenes: Scene[], characters: Character[] }> = ({ scenes, characters }) => {
  const characterMap = new Map(characters.map(c => [c.id, c]));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {scenes.map(scene => (
        scene.dialogues.map((dialogue, dialogueIndex) => (
          <ShotCard
            key={`scene-${scene.scene_index}-dialogue-${dialogueIndex}`}
            dialogue={dialogue}
            character={characterMap.get(dialogue.character_id)}
          />
        ))
      ))}
    </div>
  );
};
