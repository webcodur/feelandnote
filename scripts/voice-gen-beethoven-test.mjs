/**
 * Beethoven quote 보이스 테스트 — ElevenLabs TTS API
 * Usage: ELEVENLABS_API_KEY=xxx node scripts/voice-gen-beethoven-test.mjs
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
const OUTPUT_DIR = path.join(__dirname, "voice-output", "beethoven", "test");

const lines = [
  { file: "quote_en", text: "Kings and nobles number in the thousands, but there is only one Beethoven..." },
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
