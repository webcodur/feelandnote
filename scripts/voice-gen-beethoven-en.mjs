/**
 * Beethoven 영문 보이스 생성 — ElevenLabs TTS API
 * Usage: ELEVENLABS_API_KEY=xxx node scripts/voice-gen-beethoven-en.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY 환경변수 필요");
  process.exit(1);
}

const VOICE_ID = "tN7X19q3FgHB79OTHl7e";
const API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "voice-output", "beethoven", "en");

const lines = [
  // greeting
  { file: "g1", text: "Let us skip the pleasantries. Art is eternal, and our time is woefully short..." },
  { file: "g2", text: "If fate knocks upon my door, I shall tear the door from its hinges and face it head-on!..." },
  { file: "g3", text: "My mortal ears have closed, yet the resonance of my soul has only grown clearer..." },
  // roll_call
  { file: "r1", text: "A tempest of inspiration is calling me..." },
  { file: "r2", text: "The score already exists within my mind..." },
  { file: "r3", text: "The time has come to set down the first note..." },
  // deploy
  { file: "d1", text: "Shatter the old forms! A new movement begins!..." },
  { file: "d2", text: "I shall pour every spark of my soul into this score!..." },
  { file: "d3", text: "Anyone who stands in the way of my music shall be deemed dissonance!..." },
  // battle_win
  { file: "bw1", text: "This magnificent resonance shall be recorded in history for eternity..." },
  { file: "bw2", text: "Through suffering, I have at last reached joy..." },
  { file: "bw3", text: "A splendid performance. A stirring victory forged by everyone's fighting spirit..." },
  // battle_draw
  { file: "bd1", text: "Not yet perfect... A more powerful variation is needed..." },
  { file: "bd2", text: "Dissonance. We must realign the tempo..." },
  { file: "bd3", text: "I shall deliver the climax in the next movement..." },
  // battle_lose
  { file: "bl1", text: "I cannot hear a thing... God, why have You forsaken me?..." },
  { file: "bl2", text: "My body... cannot keep pace with my inspiration..." },
  { file: "bl3", text: "Close the score. Today, I have no choice but to accept this cruel fate..." },
  // clash_attack
  { file: "c1", text: "Fortississimo!! Hear the thunder within me, loud and clear!!..." },
  { file: "c2", text: "Strike with the hammer of fate!..." },
  { file: "c3", text: "Sweep away everything—leave not a single note standing!..." },
  // quote
  { file: "quote", text: "Kings and nobles number in the thousands, but there is only one Beethoven..." },
];

async function generateVoice(entry) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: entry.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${entry.file} 실패 (${res.status}): ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const filePath = path.join(OUTPUT_DIR, `${entry.file}.mp3`);
  fs.writeFileSync(filePath, buffer);
  console.log(`[OK] ${entry.file}.mp3 (${buffer.length} bytes)`);
}

// 실행
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
console.log(`출력 경로: ${OUTPUT_DIR}`);
console.log(`총 ${lines.length}개 대사 생성 시작\n`);

for (const entry of lines) {
  await generateVoice(entry);
  await new Promise((r) => setTimeout(r, 1000));
}

console.log(`\n완료! ${lines.length}개 파일 생성됨`);
