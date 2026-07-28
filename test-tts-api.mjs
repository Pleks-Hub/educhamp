import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load env manually
const dotenv = require('dotenv');
dotenv.config();

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

console.log('Forge URL:', FORGE_URL);

// Test 1: Check if /v1/audio/speech endpoint exists (OpenAI TTS compatible)
async function testOpenAITTS() {
  console.log('\n--- Testing OpenAI-compatible TTS endpoint ---');
  try {
    const resp = await fetch(FORGE_URL + '/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + FORGE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: 'Hello, this is a test of the text to speech system.',
        voice: 'alloy',
      }),
    });
    console.log('Status:', resp.status);
    console.log('Content-Type:', resp.headers.get('content-type'));
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      console.log('Audio size:', buffer.byteLength, 'bytes');
      // Save to file for inspection
      const fs = await import('fs');
      fs.writeFileSync('/tmp/test-tts-output.mp3', Buffer.from(buffer));
      console.log('Saved to /tmp/test-tts-output.mp3');
    } else {
      const text = await resp.text();
      console.log('Error body:', text.substring(0, 500));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

// Test 2: Check available models
async function testModels() {
  console.log('\n--- Checking available models ---');
  try {
    const resp = await fetch(FORGE_URL + '/v1/models', {
      headers: { 'Authorization': 'Bearer ' + FORGE_KEY },
    });
    const data = await resp.json();
    const ttsModels = data.data?.filter(m => m.id.includes('tts') || m.id.includes('audio') || m.id.includes('speech'));
    console.log('TTS/Audio models found:', ttsModels?.length || 0);
    if (ttsModels?.length > 0) {
      ttsModels.forEach(m => console.log(' -', m.id));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

// Test 3: Try Google TTS voices from tts-prompter skill
async function testGoogleTTS() {
  console.log('\n--- Testing with voice name from skill catalog ---');
  try {
    const resp = await fetch(FORGE_URL + '/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + FORGE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: 'Hello, this is a test of the high quality text to speech system.',
        voice: 'Kore',
      }),
    });
    console.log('Status:', resp.status);
    console.log('Content-Type:', resp.headers.get('content-type'));
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      console.log('Audio size:', buffer.byteLength, 'bytes');
      const fs = await import('fs');
      fs.writeFileSync('/tmp/test-tts-hd.mp3', Buffer.from(buffer));
      console.log('Saved to /tmp/test-tts-hd.mp3');
    } else {
      const text = await resp.text();
      console.log('Error body:', text.substring(0, 500));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

await testModels();
await testOpenAITTS();
await testGoogleTTS();
