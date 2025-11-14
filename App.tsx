
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { StoryForm } from './components/StoryForm';
import { ProgressBar } from './components/ProgressBar';
import { StatusTracker } from './components/StatusTracker';
import { ShotGrid } from './components/ShotGrid';
import { VideoPlayer } from './components/VideoPlayer';
import { ApiKeySelector } from './components/ApiKeySelector';
import { YouTubeUploader } from './components/YouTubeUploader';
import { generateCartoonStory, generateImageForScene, generateSpeechForDialogue, generateVideoWithVeo } from './services/geminiService';
import type { StoryResponse, Scene, Dialogue, StatusUpdate, VoiceProfile } from './types';
import { CogIcon } from './components/IconComponents';

// --- Start of inlined components for Live View ---

const ScriptViewer: React.FC<{ data: object }> = ({ data }) => {
    const [scriptText, setScriptText] = useState('');
    const fullScript = JSON.stringify(data, null, 2);

    useEffect(() => {
        setScriptText('');
        if (fullScript) {
            let i = 0;
            let animationFrameId: number;
            const writer = () => {
                setScriptText(fullScript.substring(0, i));
                i+=3; // write faster
                if (i < fullScript.length) {
                   animationFrameId = requestAnimationFrame(writer);
                } else {
                   setScriptText(fullScript); // Ensure it completes fully
                }
            };
            animationFrameId = requestAnimationFrame(writer);
            return () => cancelAnimationFrame(animationFrameId);
        }
    }, [fullScript]);

    return (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700 h-[40rem] overflow-y-auto">
            <pre className="p-4 text-xs text-green-300 font-mono whitespace-pre-wrap break-words">
                <code>{scriptText}{scriptText.length < fullScript.length ? <span className="animate-pulse">_</span> : ''}</code>
            </pre>
        </div>
    );
};

const LiveGenerationView: React.FC<{
  storyData: StoryResponse;
  generatedScenes: Scene[];
  progress: number;
  isRendering: boolean;
  statusUpdates: StatusUpdate[];
}> = ({ storyData, generatedScenes, progress, isRendering, statusUpdates }) => {
  return (
    <div className="bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-700 flex flex-col gap-6">
      <ProgressBar progress={progress} isRendering={isRendering} />
      <StatusTracker updates={statusUpdates} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        <div>
          <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <CogIcon className="w-6 h-6 animate-spin" />
            Agent is Writing Script...
          </h2>
          <ScriptViewer data={storyData} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">Live Shot Generation</h2>
          <div className="h-[40rem] overflow-y-auto rounded-lg border border-gray-700 p-4">
            <ShotGrid scenes={generatedScenes} characters={storyData.characters} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ErrorDisplay: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => {
    let displayTitle = "Generation Failed";
    let displayMessage = message;

    // Try to parse a JSON object from the error message string
    const jsonMatch = message.match(/{.*}/s);
    if (jsonMatch) {
        try {
            const errorJson = JSON.parse(jsonMatch[0]);
            const nestedError = errorJson.error || errorJson;
            
            // If a user-friendly message exists in the JSON, use it
            if (nestedError.message) {
                displayMessage = nestedError.message;
            }
            
            // Customize title for specific errors like quota issues
            if (nestedError.status === 'RESOURCE_EXHAUSTED' || nestedError.code === 429) {
                displayTitle = "Quota Exceeded";
            }
        } catch (e) {
            // Ignore parsing errors, will fall back to the original message
        }
    }

    // A simple function to find URLs in a string and convert them to anchor tags
    const linkify = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s.,)]+)/g;
        return text.split(urlRegex).map((part, index) => {
            if (part.match(urlRegex)) {
                return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{part}</a>;
            }
            return part;
        });
    };
    
    return (
        <div className="bg-red-900/50 border-2 border-red-500 rounded-2xl shadow-lg p-6 md:p-8 max-w-5xl mx-auto w-full text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">{displayTitle}</h2>
            {/* Using whitespace-pre-wrap to respect newlines in the error message */}
            <p className="text-red-200 mb-6 whitespace-pre-wrap break-words">{linkify(displayMessage)}</p>
            <button
                onClick={onRetry}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
            >
                Try Again
            </button>
        </div>
    );
};

// --- Background Music Generation ---
const generateBackgroundMusic = (mood: string, duration: number, audioContext: AudioContext, recordingStartTime: number): AudioNode | null => {
    if (!mood) return null;

    const mainGain = audioContext.createGain();
    mainGain.gain.setValueAtTime(0, recordingStartTime);
    mainGain.gain.linearRampToValueAtTime(0.15, recordingStartTime + 2.0); // Fade in over 2 seconds to 15% volume
    mainGain.gain.setValueAtTime(0.15, recordingStartTime + duration - 2.0);
    mainGain.gain.linearRampToValueAtTime(0, recordingStartTime + duration); // Fade out over 2 seconds at the end

    const C_MAJOR_PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00]; // C, D, E, G, A
    const C_MINOR_PENTATONIC = [261.63, 311.13, 349.23, 392.00, 466.16]; // C, Eb, F, G, Bb

    let scale = C_MAJOR_PENTATONIC;
    let tempo = 120; // beats per minute
    let melodyRhythm = [0.5, 0.5, 1, 1]; // in beats
    let bassRhythm = [4];

    const simplifiedMood = mood.toLowerCase().split(' ')[0];

    if (simplifiedMood.includes('uplifting') || simplifiedMood.includes('adventurous') || simplifiedMood.includes('happy')) {
        scale = C_MAJOR_PENTATONIC;
        tempo = 140;
        melodyRhythm = [0.5, 0.25, 0.25, 0.5, 0.5];
    } else if (simplifiedMood.includes('mysterious') || simplifiedMood.includes('sad') || simplifiedMood.includes('suspenseful')) {
        scale = C_MINOR_PENTATONIC;
        tempo = 80;
        melodyRhythm = [2, 1, 1];
        bassRhythm = [4, 4];
    } else if (simplifiedMood.includes('playful') || simplifiedMood.includes('silly') || simplifiedMood.includes('quirky')) {
        scale = C_MAJOR_PENTATONIC;
        tempo = 160;
        melodyRhythm = [0.25, 0.25, 0.25, 0.25, 0.5];
        bassRhythm = [1, 1, 2];
    }

    const secondsPerBeat = 60.0 / tempo;

    // --- Melody Track ---
    const melodyOsc = audioContext.createOscillator();
    melodyOsc.type = 'triangle';
    const melodyGain = audioContext.createGain();
    melodyGain.gain.value = 0;
    melodyOsc.connect(melodyGain).connect(mainGain);

    let melodyCurrentTime = recordingStartTime;
    let melodyRhythmIndex = 0;
    let melodyNoteIndex = 0;
    while (melodyCurrentTime < recordingStartTime + duration) {
        const noteDuration = melodyRhythm[melodyRhythmIndex % melodyRhythm.length] * secondsPerBeat;
        const step = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        melodyNoteIndex = (melodyNoteIndex + step + scale.length) % scale.length;
        const freq = scale[melodyNoteIndex] * 2; // Higher octave

        melodyOsc.frequency.setValueAtTime(freq, melodyCurrentTime);
        melodyGain.gain.setTargetAtTime(0.7, melodyCurrentTime, 0.01); // Attack
        melodyGain.gain.setTargetAtTime(0, melodyCurrentTime + noteDuration * 0.8, 0.1); // Decay

        melodyCurrentTime += noteDuration;
        melodyRhythmIndex++;
    }

    // --- Bass Track ---
    const bassOsc = audioContext.createOscillator();
    bassOsc.type = 'sine';
    const bassGain = audioContext.createGain();
    bassGain.gain.value = 0;
    bassOsc.connect(bassGain).connect(mainGain);

    let bassCurrentTime = recordingStartTime;
    let bassRhythmIndex = 0;
    while (bassCurrentTime < recordingStartTime + duration) {
        const noteDuration = bassRhythm[bassRhythmIndex % bassRhythm.length] * secondsPerBeat;
        const noteIndex = (bassRhythmIndex % 4 < 2) ? 0 : 3; // Root and fifth
        const freq = scale[noteIndex] * 0.5; // Lower octave

        bassOsc.frequency.setValueAtTime(freq, bassCurrentTime);
        bassGain.gain.setTargetAtTime(1, bassCurrentTime, 0.02);
        bassGain.gain.setTargetAtTime(0, bassCurrentTime + noteDuration * 0.9, 0.1);

        bassCurrentTime += noteDuration;
        bassRhythmIndex++;
    }

    melodyOsc.start(recordingStartTime);
    melodyOsc.stop(recordingStartTime + duration);
    bassOsc.start(recordingStartTime);
    bassOsc.stop(recordingStartTime + duration);
    
    return mainGain;
};

// --- Video Rendering Logic ---
const renderVideo = (
    scenes: Scene[],
    storyMetadata: StoryResponse['metadata'],
    totalDurationSeconds: number,
    resolution: { width: number, height: number },
    fps: number,
    onProgress: (progress: number) => void
): Promise<{ url: string, extension: string }> => {
    return new Promise(async (resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = resolution.width;
            canvas.height = resolution.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not create canvas context'));

            // 1. Load all assets
            const allDialogues = scenes.flatMap(s => s.dialogues);
            const imagePromises = allDialogues.map(d => d.imageUrl ? fetch(d.imageUrl).then(res => res.blob()).then(blob => createImageBitmap(blob)) : Promise.resolve(null));
            const images = await Promise.all(imagePromises);
            
            const audioContext = new AudioContext();
            const audioBufferPromises = allDialogues.map(d => d.audioUrl ? fetch(d.audioUrl).then(res => res.arrayBuffer()).then(buf => audioContext.decodeAudioData(buf)) : Promise.resolve(null));
            const audioBuffers = await Promise.all(audioBufferPromises);
            
            const mainAudioTrack = audioContext.createMediaStreamDestination();

            // 2. Setup MediaRecorder
            const videoStream = canvas.captureStream(fps);
            const combinedStream = new MediaStream([
                videoStream.getVideoTracks()[0],
                mainAudioTrack.stream.getAudioTracks()[0]
            ]);
            
            const MimeTypes = new Map<string, string>([
                ['video/mp4; codecs="avc1.42E01E,mp4a.40.2"', 'mp4'],
                ['video/webm; codecs="vp9,opus"', 'webm'],
            ]);

            let supportedMimeType: string | undefined;
            for (const [mime] of MimeTypes.entries()) {
                if (MediaRecorder.isTypeSupported(mime)) {
                    supportedMimeType = mime;
                    break;
                }
            }

            if (!supportedMimeType) {
                return reject(new Error("No supported video format found. Your browser may not support MP4 or WebM recording."));
            }

            const extension = MimeTypes.get(supportedMimeType) || 'webm';
            
            const recorder = new MediaRecorder(combinedStream, { mimeType: supportedMimeType });
            const chunks: Blob[] = [];
            let renderFrameId: number;
            
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onerror = (e) => reject((e as any).error || new Error("MediaRecorder error"));

            // 3. Prepare timeline
            const dialogueTimeline: { 
                dialogue: Dialogue, 
                image: ImageBitmap | null, 
                buffer: AudioBuffer | null, 
                startTime: number, 
            }[] = [];
            let imageCounter = 0;
            let audioCounter = 0;
            let sceneStartTime = 0;

            for (const scene of scenes) {
                for (const dialogue of scene.dialogues) {
                    const startTime = sceneStartTime + dialogue.start_time;
                    if (startTime < totalDurationSeconds) {
                        dialogueTimeline.push({
                            dialogue,
                            image: images[imageCounter],
                            buffer: audioBuffers[audioCounter],
                            startTime,
                        });
                    }
                    audioCounter++;
                    imageCounter++;
                }
                sceneStartTime += scene.duration_seconds;
            }
            dialogueTimeline.sort((a, b) => a.startTime - b.startTime);

            // 4. Start rendering
            const recordingStartTime = audioContext.currentTime;
            recorder.start();
            
            // Schedule all dialogue audio
            dialogueTimeline.forEach(({ buffer, startTime }) => {
                if (buffer) {
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(mainAudioTrack);
                    source.start(recordingStartTime + startTime);
                }
            });

            // Generate and schedule background music
            const musicNode = generateBackgroundMusic(storyMetadata.background_music_mood, totalDurationSeconds, audioContext, recordingStartTime);
            if (musicNode) {
                musicNode.connect(mainAudioTrack);
            }

            recorder.onstop = () => {
                cancelAnimationFrame(renderFrameId);
                const blob = new Blob(chunks, { type: supportedMimeType });
                resolve({ url: URL.createObjectURL(blob), extension });
            };

            // Video frame rendering loop
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const drawFrame = () => {
                // Use the audio context's clock as the master timeline to ensure sync
                const currentTime = audioContext.currentTime - recordingStartTime;
                
                if (currentTime >= totalDurationSeconds) {
                    if (recorder.state === 'recording') {
                        recorder.stop();
                    }
                    return; // End of video
                }
                
                let activeShot = null;
                for (let i = dialogueTimeline.length - 1; i >= 0; i--) {
                    if (currentTime >= dialogueTimeline[i].startTime) {
                        activeShot = dialogueTimeline[i];
                        break;
                    }
                }

                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (activeShot && activeShot.image) {
                    const { image, dialogue, startTime } = activeShot;
                    
                    const nextShotIndex = dialogueTimeline.indexOf(activeShot) + 1;
                    const shotEndTime = nextShotIndex < dialogueTimeline.length ? dialogueTimeline[nextShotIndex].startTime : totalDurationSeconds;
                    const shotDuration = shotEndTime - startTime;

                    const canvasAspect = canvas.width / canvas.height;
                    const imageAspect = image.width / image.height;
                    let drawWidth = canvas.width, drawHeight = canvas.height, x = 0, y = 0;
                    if (imageAspect > canvasAspect) {
                        drawHeight = canvas.width / imageAspect; y = (canvas.height - drawHeight) / 2;
                    } else {
                        drawWidth = canvas.height * imageAspect; x = (canvas.width - drawWidth) / 2;
                    }

                    // Ken Burns Effect
                    const progress = shotDuration > 0 ? Math.min((currentTime - startTime) / shotDuration, 1) : 0;
                    const effect = dialogue.ken_burns_effect;
                    
                    let scale = 1.0;
                    const zoomAmount = 0.1;
                    if (effect?.zoom_direction === 'in') scale = 1.0 + progress * zoomAmount;
                    else if (effect?.zoom_direction === 'out') scale = 1.0 + zoomAmount - progress * zoomAmount;

                    const panAmount = Math.min(drawWidth, drawHeight) * 0.05;
                    let panX = 0, panY = 0;
                    if (effect?.pan_direction === 'left') panX = -progress * panAmount;
                    if (effect?.pan_direction === 'right') panX = progress * panAmount;
                    if (effect?.pan_direction === 'up') panY = -progress * panAmount;
                    if (effect?.pan_direction === 'down') panY = progress * panAmount;

                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(scale, scale);
                    ctx.translate(panX, panY);
                    ctx.drawImage(image, x - canvas.width / 2, y - canvas.height / 2, drawWidth, drawHeight);
                    ctx.restore();
                }
                
                onProgress(currentTime / totalDurationSeconds);
                renderFrameId = requestAnimationFrame(drawFrame);
            }

            renderFrameId = requestAnimationFrame(drawFrame);

        } catch (error) {
            reject(error);
        }
    });
};


const App: React.FC = () => {
  const [generationMode, setGenerationMode] = useState<'story' | 'veo'>('story');
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [storyData, setStoryData] = useState<StoryResponse | null>(null);
  const [generatedScenes, setGeneratedScenes] = useState<Scene[]>([]);
  const [isPlaybackReady, setIsPlaybackReady] = useState<boolean>(false);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoExtension, setVideoExtension] = useState<string>('mp4');
  const [error, setError] = useState<string | null>(null);
  const [showYouTubeUploader, setShowYouTubeUploader] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
        if (await window.aistudio.hasSelectedApiKey()) {
            setApiKeySelected(true);
        }
    };
    checkKey();
  }, []);

  const resetState = useCallback(() => {
    setIsLoading(false);
    setIsRendering(false);
    setStoryData(null);
    setGeneratedScenes([]);
    setIsPlaybackReady(false);
    setStatusUpdates([]);
    setProgress(0);
    setError(null);
    setShowYouTubeUploader(false);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setVideoExtension('mp4');
  }, [videoUrl]);

  const addStatusUpdate = useCallback((message: string, isFinal: boolean = false) => {
    setStatusUpdates(prev => {
        const newUpdates = prev.map(u => ({...u, current: false}));
        newUpdates.push({ message, timestamp: new Date(), current: true, isFinal });
        return newUpdates;
    });
  }, []);

  const runStoryGenerationProcess = useCallback(async (data: StoryResponse) => {
    setStoryData(data);
    addStatusUpdate(`Story generated: "${data.metadata.title}"`);
    setProgress(10);
    setGeneratedScenes(data.story.scenes);

    const allDialogues = data.story.scenes.flatMap(scene => scene.dialogues);
    const totalDialogues = allDialogues.length;
    const progressPerImage = 40 / totalDialogues;
    const progressPerAudio = 40 / totalDialogues;

    addStatusUpdate(`Generating ${totalDialogues} images...`);
    let currentScenesWithImages = [...data.story.scenes];
    for (let i = 0; i < data.story.scenes.length; i++) {
        const scene = data.story.scenes[i];
        for (let j = 0; j < scene.dialogues.length; j++) {
            const dialogue = scene.dialogues[j];
            const imageUrl = await generateImageForScene(
                dialogue.image_prompt, 
                dialogue.image_generation_params.seed_hint,
                dialogue.image_generation_params.width,
                dialogue.image_generation_params.height
            );
            const tempScenes = JSON.parse(JSON.stringify(currentScenesWithImages));
            tempScenes[i].dialogues[j].imageUrl = imageUrl;
            currentScenesWithImages = tempScenes;
            setGeneratedScenes(tempScenes);
            setProgress(p => p + progressPerImage);
            // Throttle requests to avoid hitting free-tier rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    addStatusUpdate(`All ${totalDialogues} images generated!`);
    
    addStatusUpdate(`Generating audio for ${totalDialogues} dialogues...`);
    let finalScenes = [...currentScenesWithImages];
    for (let i = 0; i < finalScenes.length; i++) {
        const scene = finalScenes[i];
        for (let j = 0; j < scene.dialogues.length; j++) {
            const dialogue = scene.dialogues[j];
            let voiceProfile: VoiceProfile | undefined = data.voice_profiles.find(vp => vp.character_id === dialogue.character_id);
            
            if (!voiceProfile) {
                const warningMsg = `Warning: Could not find voice profile for character ID "${dialogue.character_id}". Using a default voice.`;
                addStatusUpdate(warningMsg);
                console.warn(warningMsg);
                
                // Create a generic fallback voice profile to allow generation to continue
                voiceProfile = {
                    character_id: dialogue.character_id,
                    voice_name_hint: 'default_fallback', // This will map to a default voice in the service
                    accent: "American English",
                    speaking_rate: 1.0,
                    pitch: 1.0,
                    tts_model: "gemini-tts",
                    tts_prompt_template: "{{dialogue_text}}",
                };
            }
            const audioUrl = await generateSpeechForDialogue(dialogue.text, dialogue.emotion, voiceProfile);
            finalScenes[i].dialogues[j].audioUrl = audioUrl;
            setProgress(p => p + progressPerAudio);
            // Throttle requests to avoid hitting free-tier rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    setGeneratedScenes(finalScenes);
    addStatusUpdate(`All audio generated!`);
    
    addStatusUpdate('Rendering video file... This may take a moment.');
    setIsRendering(true);
    setProgress(90);

    const onRenderProgress = (p: number) => setProgress(90 + p * 10);
    const [width, height] = data.metadata.resolution.split('x').map(Number);
    const { url, extension } = await renderVideo(finalScenes, data.metadata, data.metadata.video_length_seconds, { width, height }, data.metadata.fps, onRenderProgress);
    
    setVideoUrl(url);
    setVideoExtension(extension);
    addStatusUpdate('Your cartoon is ready!', true);

    setIsRendering(false);
    setIsPlaybackReady(true);
    setIsLoading(false);

  }, [addStatusUpdate]);

  const runVeoGenerationProcess = useCallback(async (prompt: string, aspectRatio: string, image?: File) => {
        setIsRendering(true);
        addStatusUpdate('Initializing Veo video generation...');
        setProgress(5);
        
        const onPoll = (status: string, progressPercentage: number) => {
            addStatusUpdate(status);
            setProgress(progressPercentage);
        };
        
        try {
            const { url: finalVideoUrl, extension } = await generateVideoWithVeo(prompt, aspectRatio, image, onPoll);
            setVideoUrl(finalVideoUrl);
            setVideoExtension(extension);
            addStatusUpdate('Your video is ready!', true);
            setIsPlaybackReady(true);
        } catch (error) {
            console.error("Veo generation failed:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
             // As per docs, handle API key error specifically
            if (errorMessage.includes("Requested entity was not found")) {
                setError("API Key error. Please re-select your API key and try again.");
                setApiKeySelected(false); // Force re-selection
            } else {
                setError(`Video generation failed: ${errorMessage}`);
            }
            addStatusUpdate(`Error: ${errorMessage}`, true);
        } finally {
            setIsLoading(false);
            setIsRendering(false);
        }
  }, [addStatusUpdate]);

  const handleGenerate = useCallback(async (prompt: string, length: number, style: string, aspectRatio: string, image?: File) => {
    resetState();
    setIsLoading(true);
    addStatusUpdate('Generation process started...');
    
    try {
      if (generationMode === 'story') {
        addStatusUpdate('Requesting story script from Gemini...');
        const data = await generateCartoonStory(prompt, length, style, aspectRatio, image);
        await runStoryGenerationProcess(data);
      } else { // 'veo' mode
        await runVeoGenerationProcess(prompt, aspectRatio, image);
      }
    } catch (error) {
        console.error("Generation failed:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(`An unexpected error occurred: ${errorMessage}`);
        addStatusUpdate(`Error: ${errorMessage}`, true);
        setIsLoading(false);
    }
  }, [generationMode, runStoryGenerationProcess, runVeoGenerationProcess, resetState, addStatusUpdate]);


  const MainContent: React.FC = () => {
    if (error) {
      return <ErrorDisplay message={error} onRetry={resetState} />;
    }

    if (showYouTubeUploader && videoUrl) {
      return <YouTubeUploader 
        videoUrl={videoUrl} 
        storyData={storyData} 
        onClose={() => setShowYouTubeUploader(false)}
      />;
    }

    if (isLoading || isPlaybackReady) {
      if (isPlaybackReady && videoUrl) {
        return (
            <div className="bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-700 flex flex-col gap-6 w-full max-w-5xl mx-auto">
                <StatusTracker updates={statusUpdates} />
                <VideoPlayer
                    videoUrl={videoUrl}
                    videoTitle={storyData?.metadata.title ?? 'Generated Video'}
                    fileExtension={videoExtension}
                    onUploadClick={() => setShowYouTubeUploader(true)}
                />
                <button
                    onClick={resetState}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50"
                >
                    Create Another Story
                </button>
            </div>
        );
      }
      if (generationMode === 'story' && storyData) {
        return <LiveGenerationView 
            storyData={storyData} 
            generatedScenes={generatedScenes} 
            progress={progress} 
            isRendering={isRendering} 
            statusUpdates={statusUpdates} 
        />;
      }
      // Veo or initial story loading
      return (
         <div className="bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-700 flex flex-col gap-6">
            <ProgressBar progress={progress} isRendering={isRendering} />
            <StatusTracker updates={statusUpdates} />
         </div>
      );
    }
    return (
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-700">
            <StoryForm onSubmit={handleGenerate} isLoading={isLoading} generationMode={generationMode} setGenerationMode={setGenerationMode}/>
        </div>
    );
  };
  
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <Header />
      <main className="w-full max-w-5xl mx-auto">
        {apiKeySelected || generationMode === 'story' ? (
             <MainContent />
        ) : (
            <ApiKeySelector onKeySelected={() => setApiKeySelected(true)} />
        )}
      </main>
    </div>
  );
};

export default App;
