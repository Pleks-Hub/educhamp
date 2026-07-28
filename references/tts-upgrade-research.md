# TTS Upgrade Research — July 2026

## Problem
Current TTS uses Web Speech API (browser's built-in `speechSynthesis`), which produces robotic, muffled voices depending on the user's device/OS.

## Best Options Found

### 1. edge-tts-universal (RECOMMENDED — Free, High Quality, No API Key)
- **Package:** `edge-tts-universal` on npm
- **What it is:** Uses Microsoft Edge's online neural TTS service (same voices as Azure Cognitive Services)
- **Quality:** Neural voices — very natural sounding, same as Microsoft Edge "Read Aloud"
- **Cost:** FREE — no API key needed, no usage limits
- **Server-side only:** Works on Node.js (not browser directly since v1.4.0 due to WebSocket header restriction)
- **Voices:** 400+ voices, 100+ languages including:
  - en-US-EmmaMultilingualNeural (female, natural)
  - en-US-GuyNeural (male)
  - en-US-JennyNeural (female)
  - en-US-AriaNeural (female)
  - es-ES-ElviraNeural (Spanish)
  - fr-FR-DeniseNeural (French)
- **Features:** Word-level timestamps (for highlight-as-you-read), rate/pitch/volume control, streaming
- **Output:** MP3 audio (24kHz quality)
- **Integration:** Server-side endpoint → returns audio buffer → frontend plays via Audio element
- **Subtitle data:** Returns word boundaries with start/end timestamps (perfect for highlight-as-you-read)

### 2. Puter.js (Free, client-side, multiple providers)
- Client-side SDK, supports AWS Polly, OpenAI, ElevenLabs, Gemini, xAI
- "User-Pays" model — each user covers their own costs
- Requires users to have Puter account
- Not ideal for a school app where students shouldn't need external accounts

### 3. OpenAI TTS API ($15/1M chars)
- Requires API key
- Excellent quality (alloy, echo, fable, onyx, nova, shimmer voices)

### 4. Google Cloud TTS (Free tier: 1M chars/month standard)
- Requires API key and Google Cloud project setup

### 5. ElevenLabs (Free tier: 10K chars/month)
- Best quality but very limited free tier

## Decision: edge-tts-universal
- Free, no API key, high-quality neural voices
- Perfect for an educational app with many students
- Server-side synthesis → stream MP3 to client
- Word boundary data enables highlight-as-you-read feature
- 400+ voices across 100+ languages (great for Spanish, French courses)

## Implementation Plan
1. Install `edge-tts-universal` on server
2. Create `/api/tts/synthesize` endpoint that accepts text + voice + options
3. Return MP3 audio buffer (or stream) to client
4. Update `useTTS` hook to use Audio element instead of Web Speech API
5. Update VoicePicker to show curated list of Edge neural voices
6. Keep word boundary data for highlight-as-you-read feature
7. Keep existing analytics/logging infrastructure intact

## Key Voices for EduChamp (curated selection)
- **English:** en-US-EmmaMultilingualNeural, en-US-GuyNeural, en-US-JennyNeural, en-US-AriaNeural
- **Spanish:** es-ES-ElviraNeural, es-MX-DaliaNeural, es-MX-JorgeNeural
- **French:** fr-FR-DeniseNeural, fr-FR-HenriNeural
- **German:** de-DE-KatjaNeural, de-DE-ConradNeural
- **Portuguese:** pt-BR-FranciscaNeural, pt-BR-AntonioNeural
