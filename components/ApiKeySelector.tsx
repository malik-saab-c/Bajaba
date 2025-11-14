import React from 'react';

interface ApiKeySelectorProps {
    onKeySelected: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        onKeySelected();
    };

    return (
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-700 text-center">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">API Key Required for Veo</h2>
            <p className="text-gray-400 mb-6">
                The Veo video generation model requires you to select an API key from your project.
                Please ensure your project has billing enabled. For more information, please see the{' '}
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">
                    billing documentation
                </a>.
            </p>
            <button
                onClick={handleSelectKey}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
            >
                Select Your API Key
            </button>
        </div>
    );
};
