import type { StoryResponse } from '../types';

export const mockStoryData: StoryResponse = {
  "metadata": {
    "title": "The Shy Singing Squirrel",
    "language": "English",
    "video_length_seconds": 30,
    "style_preset": "bright_2d_cartoon",
    "aspect_ratio": "16:9",
    "fps": 24,
    "resolution": "1280x720",
    // FIX: Added missing 'background_music_mood' property.
    "background_music_mood": "gentle and encouraging"
  },
  "characters": [
    {
      "id": "char_001",
      "name": "Chinti",
      "description": "small brown squirrel, big eyes, blue scarf, freckles, shy smile",
      "character_token": "SQUIRREL_CHINTI_v1",
      "visual_constraints": "blue scarf, left ear notch, bushy tail with white tip"
    },
    {
      "id": "char_002",
      "name": "Barnaby",
      "description": "A wise old owl with large spectacles.",
      "character_token": "OWL_BARNABY_v1",
      "visual_constraints": "wears round glasses, has a tuft of white feathers on his head"
    }
  ],
  "story": {
    "title": "The Shy Singing Squirrel",
    "scenes": [
      {
        "scene_index": 1,
        "duration_seconds": 8,
        "scene_description": "Opening: wide forest shot. Chinti hides behind a tree listening to birds.",
        "camera_instructions": "slow zoom in from wide to medium",
        "visual_style_notes": "soft pastel background, bold outlines, hand-drawn texture",
        "dialogues": [
          {
            "character_id": "char_001",
            "text": "(softly) I wish I could sing like them... but I'm too scared.",
            "start_time": 1,
            "end_time": 5,
            "emotion": "shy",
            "image_prompt": "Scene 1: bright 2D cartoon style, wide forest background, SQUIRREL_CHINTI_v1, a small brown squirrel with a blue scarf, is hiding behind a large oak tree, peeking out with big shy eyes. Morning sunlight filters through the leaves.",
            "image_generation_params": { "width": 1280, "height": 720, "seed_hint": "12345", "style_tags": ["2d", "cartoon", "pastel", "bold-outline"] },
            // FIX: Added missing 'ken_burns_effect' property.
            "ken_burns_effect": { "zoom_direction": "in", "pan_direction": "none" }
          }
        ]
      },
      {
        "scene_index": 2,
        "duration_seconds": 10,
        "scene_description": "Barnaby the owl, perched on a branch, notices Chinti.",
        "camera_instructions": "medium shot on Barnaby, then cut to Chinti's reaction",
        "visual_style_notes": "consistent with scene 1",
        "dialogues": [
          {
            "character_id": "char_002",
            "text": "A lovely voice is a gift, little one. Why hide it?",
            "start_time": 1,
            "end_time": 5,
            "emotion": "wise",
            "image_prompt": "bright 2D cartoon style, OWL_BARNABY_v1, a wise old owl with spectacles, is perched on a tree branch, looking down kindly. SQUIRREL_CHINTI_v1 is visible below, looking startled.",
            "image_generation_params": { "width": 1280, "height": 720, "seed_hint": "12346", "style_tags": ["2d", "cartoon", "pastel", "bold-outline"] },
            // FIX: Added missing 'ken_burns_effect' property.
            "ken_burns_effect": { "zoom_direction": "none", "pan_direction": "down" }
          },
          {
            "character_id": "char_001",
            "text": "(stuttering) I... I'm not good enough!",
            "start_time": 6,
            "end_time": 8,
            "emotion": "anxious",
            "image_prompt": "bright 2D cartoon style, close up on SQUIRREL_CHINTI_v1, who is looking up with an anxious expression at OWL_BARNABY_v1, stuttering. He has a blue scarf.",
            "image_generation_params": { "width": 1280, "height": 720, "seed_hint": "12346a", "style_tags": ["2d", "cartoon", "pastel", "bold-outline"] },
            // FIX: Added missing 'ken_burns_effect' property.
            "ken_burns_effect": { "zoom_direction": "out", "pan_direction": "none" }
          }
        ]
      },
      {
        "scene_index": 3,
        "duration_seconds": 12,
        "scene_description": "Encouraged by Barnaby, Chinti takes a deep breath and sings a small, beautiful note. Forest creatures peek out.",
        "camera_instructions": "close up on Chinti singing, then pan out to show other animals listening",
        "visual_style_notes": "magical glow around Chinti as he sings",
        "dialogues": [
          {
            "character_id": "char_002",
            "text": "(softly) See? You just needed to start.",
            "start_time": 8,
            "end_time": 11,
            "emotion": "encouraging",
            "image_prompt": "Scene 3: bright 2D cartoon style, close-up on SQUIRREL_CHINTI_v1 with eyes closed, singing a beautiful note. A soft golden light surrounds him. In the background, a rabbit and a deer are peeking from behind bushes, looking enchanted.",
            "image_generation_params": { "width": 1280, "height": 720, "seed_hint": "12347", "style_tags": ["2d", "cartoon", "pastel", "bold-outline", "magical"] },
            // FIX: Added missing 'ken_burns_effect' property.
            "ken_burns_effect": { "zoom_direction": "in", "pan_direction": "up" }
          }
        ]
      }
    ]
  },
  "voice_profiles": [
    {
      "character_id": "char_001",
      // FIX: Changed voice_name_hint to a valid value
      "voice_name_hint": "young_male_en",
      "accent": "American English (neutral)",
      "speaking_rate": 0.95,
      "pitch": 1.1,
      "tts_model": "gemini-tts-1a",
      "tts_prompt_template": "Speak in English with a shy, slightly high-pitched, breathy tone. Example: {{dialogue_text}}"
    },
    {
      "character_id": "char_002",
      // FIX: Changed voice_name_hint to a valid value
      "voice_name_hint": "old_male_en",
      "accent": "British English (RP)",
      "speaking_rate": 0.85,
      "pitch": 0.8,
      "tts_model": "gemini-tts-1b",
      "tts_prompt_template": "Speak in English with a deep, calm, and wise tone. Speak slowly. Example: {{dialogue_text}}"
    }
  ],
  "render_instructions": {
    "frame_sequence": [
      { "scene_index": 1, "image_filename_template": "scene_1_v1.png", "duration": 8 },
      { "scene_index": 2, "image_filename_template": "scene_2_v1.png", "duration": 10 },
      { "scene_index": 3, "image_filename_template": "scene_3_v1.png", "duration": 12 }
    ],
    "subtitle_overlay": { "font": "Arial", "size": 36, "position": "bottom_center" },
    "ffmpeg_recipe": "ffmpeg -y -loop 1 -t 8 -i scene_1_v1.png -i char_001_scene1.wav -filter_complex ... -c:v libx264 -pix_fmt yuv420p output.mp4",
    "final_encoding": { "codec": "libx264", "preset": "medium", "crf": 18 }
  },
  "tracking_events": {
    "events": [
      { "name": "story_generated", "payload_schema": ["title", "scene_count"] },
      { "name": "image_prompt_sent", "payload_schema": ["scene_index", "prompt_preview", "request_id"] },
      { "name": "image_ready", "payload_schema": ["scene_index", "image_url"] },
      { "name": "tts_started", "payload_schema": ["character_id", "segment_id"] },
      { "name": "tts_done", "payload_schema": ["character_id", "segment_id", "audio_url"] },
      { "name": "render_progress", "payload_schema": ["percent", "step"] },
      { "name": "video_ready", "payload_schema": ["video_url", "size_bytes", "duration_seconds"] }
    ]
  },
  "reference_instructions": {
    "how_to_supply_reference_images": "If user supplies reference images, pass URL and include 'use_as_reference:true' to image model. If none, use character_token descriptions above.",
    "consistency_strategy": "Always include character_token in prompt; if possible use image-to-image with low strength to preserve character across scenes; reuse seed_hint when model supports deterministic seed."
  },
  "safety": {
    "notes": "Avoid generating real-person likenesses without permission. If a user asks to depict a public figure, require explicit consent and a reference photo.",
    "fallback": "If image API fails, generate a simplified vector-style placeholder and continue with TTS and render to keep the pipeline moving."
  }
};