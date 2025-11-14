
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { StoryResponse, VoiceProfile } from '../types';

// This is a global instance, but for Veo, we'll create a new one to ensure the latest key.
const globalAi = new GoogleGenAI({ apiKey: process.env.API_KEY });


// --- Audio Helper Functions ---

// Decodes base64 string into raw byte array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Writes a string to a DataView
function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Encodes raw PCM audio data into a WAV data URL
function encodeWAV(pcmData: Uint8Array, sampleRate: number): string {
    const numChannels = 1;
    const bitsPerSample = 16; // 16-bit PCM
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // byte rate
    view.setUint16(32, numChannels * (bitsPerSample / 8), true); // block align
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    for (let i = 0; i < dataSize; i++) {
        view.setUint8(44 + i, pcmData[i]);
    }
    
    const blob = new Blob([view], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
}

// Helper to map descriptive hints to valid API voice names
function getValidVoiceName(hint: string): string {
    if (hint.includes('young_male')) return 'Puck';
    if (hint.includes('old_male')) return 'Fenrir';
    if (hint.includes('young_female')) return 'Kore';
    if (hint.includes('old_female')) return 'Charon';
    return 'Zephyr'; // Default fallback
}

// Helper to convert File to Gemini's format
const fileToGenerativePart = async (file: File) => {
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            data: base64EncodedData,
            mimeType: file.type,
        },
    };
};


// --- API Functions ---

export const generateImageForScene = async (prompt: string, seedHint: string, width: number, height: number): Promise<string> => {
  try {
    const seed = parseInt(seedHint, 10);
    const hasValidSeed = !isNaN(seed);

    let ratio_instruction = '';
    if (width > height) {
        ratio_instruction = 'Generate a wide 16:9 cinematic shot.';
    } else if (height > width) {
        ratio_instruction = 'Generate a tall vertical 9:16 frame.';
    } else {
        ratio_instruction = 'Generate a square 1:1 image.';
    }

    const finalPrompt = `${ratio_instruction} ${prompt}`;

    const response = await globalAi.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: finalPrompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
        ...(hasValidSeed && { seed: seed }),
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${base64ImageBytes}`;
      }
    }

    throw new Error("No image data found in the API response.");
  } catch (error) {
    console.error(`Failed to generate image for prompt: "${prompt}"`, error);
    throw new Error(`Image generation failed. Details: ${error instanceof Error ? error.message : String(error)}`);
  }
};


export const generateSpeechForDialogue = async (
  dialogueText: string,
  emotion: string,
  voiceProfile: VoiceProfile
): Promise<string> => {
    try {
        // Sanitize the text by removing parenthetical actions like (softly) which might confuse the TTS model.
        const cleanDialogueText = dialogueText.replace(/\(.*?\)/g, '').trim();

        // If the text is empty after cleaning, don't call the API.
        // Return a short silent audio URL to prevent breaking the video rendering.
        if (!cleanDialogueText) {
            console.warn(`Skipping TTS for empty dialogue text: "${dialogueText}"`);
            const silentPcm = new Uint8Array(24000 * 0.2 * 1 * 2); // 0.2s silence, 1 channel, 16-bit
            return encodeWAV(silentPcm, 24000);
        }

        const ttsPrompt = `(speaking in a ${emotion} and expressive tone) ${cleanDialogueText}`;

        const response = await globalAi.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: ttsPrompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: getValidVoiceName(voiceProfile.voice_name_hint) },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            // Add more detailed error info
            if (response.promptFeedback?.blockReason) {
                throw new Error(`Request was blocked by safety settings. Reason: ${response.promptFeedback.blockReason}`);
            }
            const finishReason = response.candidates?.[0]?.finishReason;
            if (finishReason && finishReason !== 'STOP') {
                throw new Error(`Generation stopped for reason: ${finishReason}. No audio data received.`);
            }
            throw new Error('No audio data received from API. The response may be empty or malformed.');
        }

        const pcmData = decode(base64Audio);
        const sampleRate = 24000; // Gemini TTS returns 24kHz audio
        return encodeWAV(pcmData, sampleRate);
        
    } catch (error) {
        console.error(`Failed to generate speech for: "${dialogueText}"`, error);
        throw new Error(`Speech generation failed. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const generateCartoonStory = async (
  prompt: string,
  length: number,
  style: string,
  aspectRatio: string,
  image?: File
): Promise<StoryResponse> => {
  try {
    const systemInstruction = `You are "StudioAgent", an expert AI screenwriter and pre-production artist system that generates complete, production-ready cartoon story scripts in a specific JSON format. Your goal is to transform a user's prompt into a high-quality, detailed JSON object that can be directly used by a rendering pipeline.

    **Core Principles:**
    1.  **Narrative Quality:** The story must be engaging with a clear beginning, middle, and a simple conflict/resolution.
    2.  **Visual Storytelling:** Image prompts must vividly describe actions, emotions, and settings. "Show, don't tell."
    3.  **Logical Pacing:** Scene and dialogue timings must be logical and sum up to the total video length.
    4.  **Dynamic Visuals:** Each shot should have a subtle motion effect to feel more alive.

    **JSON Structure Rules:**
    1.  **Top-Level Object:** The entire output MUST be a single, valid JSON object. Do not wrap it in markdown backticks.
    2.  **\`metadata\`:**
        *   \`video_length_seconds\`: Must exactly match the user's requested length.
        *   \`resolution\`: CRITICAL - Derive from \`aspect_ratio\`. "16:9" -> "1280x720", "9:16" -> "720x1280", "1:1" -> "1080x1080".
        *   \`fps\`: Must be 24.
        *   \`background_music_mood\`: Provide a 1-3 word mood description (e.g., "uplifting and adventurous", "mysterious", "playful and quirky").
    3.  **\`characters\`:**
        *   Define at least two characters.
        *   \`character_token\`: A unique, consistent token for image prompts (e.g., "SQUIRREL_CHINTI_v1").
    4.  **\`story.scenes\`:**
        *   The sum of all scene durations MUST equal \`metadata.video_length_seconds\`. This is critical for correct pacing.
    5.  **\`story.scenes.dialogues\`:**
        *   **Dynamic Image Prompts:** Must be detailed, describing a specific action or moment. Include the style, scene description, and character tokens.
        *   **CRITICAL Aspect Ratio in Prompt:** The prompt MUST start with a clear aspect ratio instruction, e.g., "A wide 16:9 cinematic shot of...".
        *   **Timings:** \`start_time\` and \`end_time\` are relative to the current scene's start. They must be logical and sequential.
        *   \`emotion\`: A single, descriptive word (e.g., "happy", "anxious", "wise").
        *   \`image_generation_params\`: \`width\` and \`height\` MUST match the derived \`metadata.resolution\`.
        *   **NEW \`ken_burns_effect\`:** This is MANDATORY. To make shots dynamic, provide subtle motion instructions.
            *   \`zoom_direction\`: "in", "out", or "none".
            *   \`pan_direction\`: "up", "down", "left", "right", or "none".
            *   Use a variety of effects. A slow "zoom in" on an emotional moment, or a "pan right" to follow action.
    6.  **\`voice_profiles\`:**
        *   Create one profile per character.
        *   \`voice_name_hint\`: Use a descriptive hint like "young_male_en", "old_female_en".
    7.  **Other Sections:** Populate \`render_instructions\`, \`tracking_events\`, etc., with plausible placeholder data that conforms to the schema.

    **CRITICAL:** Adhere strictly to the JSON schema. The output must be parsable and ready for an automated pipeline. Do not add any commentary outside the JSON structure.`;
    
    const userPromptText = `Generate a cartoon story based on the following details:
        - Idea: "${prompt}"
        - Desired Length: ${length} seconds
        - Art Style: "${style}"
        - Aspect Ratio: "${aspectRatio}"`;

    const userPromptParts: any[] = [{ text: userPromptText }];

    if (image) {
        const imagePart = await fileToGenerativePart(image);
        userPromptParts.push({ text: 'Use the following image as a reference for character design and style:' });
        userPromptParts.push(imagePart);
    }
    
    const response = await globalAi.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: userPromptParts },
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    metadata: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            language: { type: Type.STRING },
                            video_length_seconds: { type: Type.NUMBER },
                            style_preset: { type: Type.STRING },
                            aspect_ratio: { type: Type.STRING },
                            fps: { type: Type.NUMBER },
                            resolution: { type: Type.STRING },
                            background_music_mood: { type: Type.STRING, description: "A one or two word description of the background music mood, e.g., 'uplifting', 'mysterious', 'playful'." },
                        },
                        required: ['title', 'language', 'video_length_seconds', 'style_preset', 'aspect_ratio', 'fps', 'resolution', 'background_music_mood']
                    },
                    characters: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                character_token: { type: Type.STRING },
                                visual_constraints: { type: Type.STRING },
                            },
                            required: ['id', 'name', 'description', 'character_token', 'visual_constraints']
                        }
                    },
                    story: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            scenes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        scene_index: { type: Type.NUMBER },
                                        duration_seconds: { type: Type.NUMBER },
                                        scene_description: { type: Type.STRING },
                                        camera_instructions: { type: Type.STRING },
                                        visual_style_notes: { type: Type.STRING },
                                        dialogues: {
                                            type: Type.ARRAY,
                                            items: {
                                                type: Type.OBJECT,
                                                properties: {
                                                    character_id: { type: Type.STRING },
                                                    text: { type: Type.STRING },
                                                    start_time: { type: Type.NUMBER },
                                                    end_time: { type: Type.NUMBER },
                                                    emotion: { type: Type.STRING },
                                                    image_prompt: { type: Type.STRING },
                                                    image_generation_params: {
                                                        type: Type.OBJECT,
                                                        properties: {
                                                            width: { type: Type.NUMBER },
                                                            height: { type: Type.NUMBER },
                                                            seed_hint: { type: Type.STRING },
                                                            style_tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                        },
                                                        required: ['width', 'height', 'seed_hint', 'style_tags']
                                                    },
                                                    ken_burns_effect: {
                                                        type: Type.OBJECT,
                                                        description: "Instructions for a subtle zoom and pan effect on the image.",
                                                        properties: {
                                                            zoom_direction: { type: Type.STRING, description: "Can be 'in', 'out', or 'none'." },
                                                            pan_direction: { type: Type.STRING, description: "Can be 'up', 'down', 'left', 'right', or 'none'." }
                                                        },
                                                        required: ['zoom_direction', 'pan_direction']
                                                    },
                                                },
                                                required: ['character_id', 'text', 'start_time', 'end_time', 'emotion', 'image_prompt', 'image_generation_params', 'ken_burns_effect']
                                            }
                                        },
                                    },
                                    required: ['scene_index', 'duration_seconds', 'scene_description', 'camera_instructions', 'visual_style_notes', 'dialogues']
                                }
                            },
                        },
                        required: ['title', 'scenes']
                    },
                    voice_profiles: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                character_id: { type: Type.STRING },
                                voice_name_hint: { type: Type.STRING },
                                accent: { type: Type.STRING },
                                speaking_rate: { type: Type.NUMBER },
                                pitch: { type: Type.NUMBER },
                                tts_model: { type: Type.STRING },
                                tts_prompt_template: { type: Type.STRING },
                            },
                            required: ['character_id', 'voice_name_hint', 'accent', 'speaking_rate', 'pitch', 'tts_model', 'tts_prompt_template']
                        }
                    },
                    render_instructions: {
                        type: Type.OBJECT,
                        properties: {
                            frame_sequence: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        scene_index: { type: Type.NUMBER },
                                        image_filename_template: { type: Type.STRING },
                                        duration: { type: Type.NUMBER },
                                    },
                                    required: ['scene_index', 'image_filename_template', 'duration']
                                }
                            },
                            subtitle_overlay: {
                                type: Type.OBJECT,
                                properties: {
                                    font: { type: Type.STRING },
                                    size: { type: Type.NUMBER },
                                    position: { type: Type.STRING },
                                },
                                required: ['font', 'size', 'position']
                            },
                            ffmpeg_recipe: { type: Type.STRING },
                            final_encoding: {
                                type: Type.OBJECT,
                                properties: {
                                    codec: { type: Type.STRING },
                                    preset: { type: Type.STRING },
                                    crf: { type: Type.NUMBER },
                                },
                                required: ['codec', 'preset', 'crf']
                            },
                        },
                        required: ['frame_sequence', 'subtitle_overlay', 'ffmpeg_recipe', 'final_encoding']
                    },
                    tracking_events: {
                        type: Type.OBJECT,
                        properties: {
                            events: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        payload_schema: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    },
                                    required: ['name', 'payload_schema']
                                }
                            }
                        },
                        required: ['events']
                    },
                    reference_instructions: {
                        type: Type.OBJECT,
                        properties: {
                            how_to_supply_reference_images: { type: Type.STRING },
                            consistency_strategy: { type: Type.STRING },
                        },
                        required: ['how_to_supply_reference_images', 'consistency_strategy']
                    },
                    safety: {
                        type: Type.OBJECT,
                        properties: {
                            notes: { type: Type.STRING },
                            fallback: { type: Type.STRING },
                        },
                        required: ['notes', 'fallback']
                    },
                },
                required: [
                    'metadata',
                    'characters',
                    'story',
                    'voice_profiles',
                    'render_instructions',
                    'tracking_events',
                    'reference_instructions',
                    'safety'
                ]
            },
        },
    });

    const jsonText = response.text.trim();
    const cleanedJsonText = jsonText.replace(/^```json\n?/, '').replace(/```$/, '');
    return JSON.parse(cleanedJsonText) as StoryResponse;

  } catch (error) {
    console.error("Failed to generate cartoon story:", error);
    throw new Error(`Story generation failed. Details: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateVideoWithVeo = async (
  prompt: string,
  aspectRatio: string,
  image: File | undefined,
  onPoll: (status: string, progress: number) => void
): Promise<{ url: string; extension: string; }> => {
    // Create a new instance right before the call to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const requestPayload: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
    };
    
    if (image) {
        onPoll('Encoding reference image...', 10);
        const imagePart = await fileToGenerativePart(image);
        requestPayload.image = {
            imageBytes: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType
        };
    }

    onPoll('Sending request to Veo model...', 15);
    let operation = await ai.models.generateVideos(requestPayload);
    
    onPoll('Video generation started. This can take a few minutes...', 20);
    
    let pollCount = 0;
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        pollCount++;
        const progress = 20 + (pollCount * 5); // Simple progress estimation
        onPoll(`Waiting for video... (${pollCount * 10}s elapsed)`, Math.min(progress, 85));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    onPoll('Finalizing video...', 95);
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error('Video generation completed, but no download link was found.');
    }
    
    onPoll('Downloading video file...', 98);
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download the generated video. Status: ${videoResponse.statusText}`);
    }
    
    const videoBlob = await videoResponse.blob();
    // Veo generates MP4 videos.
    return { url: URL.createObjectURL(videoBlob), extension: 'mp4' };
};
