/**
 * Da Vinci 영문 보이스 생성 — ElevenLabs TTS API
 * Usage: ELEVENLABS_API_KEY=xxx node scripts/voice-gen-davinci-en.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY 환경변수 필요");
  process.exit(1);
}

const VOICE_ID = "jvLCn1o86JrLvPUaxvuV";
const API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "voice-output", "da-vinci", "en");

// 대사 목록 (emotion tag 제거된 텍스트)
const lines = [
  { file: "g1", text: "Simplicity is the ultimate sophistication." },
  { file: "g2", text: "Look long enough, and everything begins to speak for itself." },
  { file: "g3", text: "I have yet to finish anything. Everything can always go deeper." },
  { file: "r1", text: "There is still something I do not understand. I cannot stop." },
  { file: "r2", text: "Curiosity leads me. It always has." },
  { file: "r3", text: "Eyes and hands — both are ready." },
  { file: "d1", text: "I have seen enough. Now I tear it down!" },
  { file: "d2", text: "Nature does not waste. End it in one stroke." },
  { file: "d3", text: "Move without error. As designed." },
  { file: "bw1", text: "The moment I understood the structure, the outcome was already decided." },
  { file: "bw2", text: "As I thought — the answer was in observation." },
  { file: "bw3", text: "I simply did not go against nature." },
  { file: "bd1", text: "Another unfinished work added to the collection." },
  { file: "bd2", text: "I need to look more closely." },
  { file: "bd3", text: "The Mona Lisa took sixteen years. Be patient." },
  { file: "bl1", text: "The age simply could not keep up with my designs." },
  { file: "bl2", text: "I will record this failure as well. For what comes next." },
  { file: "bl3", text: "My observation was insufficient. I will look again from the beginning." },
  { file: "c1", text: "One stroke is enough!" },
  { file: "c2", text: "There. Strike!" },
  { file: "c3", text: "End it clean!" },
  { file: "quote", text: "Learning never exhausts the mind." },
];

// 끝음 잘림 방지: "..." 추가
function padText(text) {
  return text + "...";
}

async function generateVoice(entry) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: padText(entry.text),
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
  // rate limit 방지: 1초 대기
  await new Promise((r) => setTimeout(r, 1000));
}

console.log(`\n완료! ${lines.length}개 파일 생성됨`);
