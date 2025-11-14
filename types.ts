
import type { Modality } from "@google/genai";

export interface Metadata {
  title: string;
  language: string;
  video_length_seconds: number;
  style_preset: string;
  aspect_ratio: string;
  fps: number;
  resolution: string;
  background_music_mood: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  character_token: string;
  visual_constraints: string;
}

export interface Dialogue {
  character_id: string;
  text: string;
  start_time: number;
  end_time: number;
  emotion: string;
  image_prompt: string;
  image_generation_params: {
    width: number;
    height: number;
    seed_hint: string;
    style_tags: string[];
  };
  ken_burns_effect: {
    zoom_direction: 'in' | 'out' | 'none';
    pan_direction: 'up' | 'down' | 'left' | 'right' | 'none';
  };
  audioUrl?: string;
  imageUrl?: string;
}

export interface Scene {
  scene_index: number;
  duration_seconds: number;
  scene_description: string;
  camera_instructions: string;
  visual_style_notes: string;
  dialogues: Dialogue[];
}

export interface Story {
  title: string;
  scenes: Scene[];
}

export interface VoiceProfile {
  character_id: string;
  voice_name_hint: string;
  accent: string;
  speaking_rate: number;
  pitch: number;
  tts_model: string;
  tts_prompt_template: string;
}

export interface RenderInstructions {
  frame_sequence: {
    scene_index: number;
    image_filename_template: string;
    duration: number;
  }[];
  subtitle_overlay: {
    font: string;
    size: number;
    position: string;
  };
  ffmpeg_recipe: string;
  final_encoding: {
    codec: string;

    preset: string;
    crf: number;
  };
}

export interface TrackingEvent {
  name: string;
  payload_schema: string[];
}

export interface ReferenceInstructions {
  how_to_supply_reference_images: string;
  consistency_strategy: string;
}

export interface Safety {
  notes: string;
  fallback: string;
}

export interface StoryResponse {
  metadata: Metadata;
  characters: Character[];
  story: Story;
  voice_profiles: VoiceProfile[];
  render_instructions: RenderInstructions;
  tracking_events: {
    events: TrackingEvent[];
  };
  reference_instructions: ReferenceInstructions;
  safety: Safety;
}

export interface StatusUpdate {
    message: string;
    timestamp: Date;
    current: boolean;
    isFinal: boolean;
}
