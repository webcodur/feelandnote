/**
 * 잔 다르크 영문 보이스 생성 — ElevenLabs TTS API
 * Usage: ELEVENLABS_API_KEY=xxx node scripts/voice-gen-joan-en.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY 환경변수 필요");
  process.exit(1);
}

const VOICE_ID = "mYk0rAapHek2oTw18z8x";
const API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "voice-output", "joan-of-arc", "en");

const lines = [
  { file: "g1", text: "I am not afraid. I was born for this." },
  { file: "g2", text: "I took up the sword only in answer to a call from heaven." },
  { file: "g3", text: "I will break the siege of Orléans and deliver the crown at Reims to my king." },
  { file: "a1", text: "The voice of Archangel Michael has told me the time has come." },
  { file: "a2", text: "Before I take up the sword, I shall raise the banner of the lily." },
  { file: "a3", text: "We must move first — then the Lord will answer." },
  { file: "d1", text: "All who would save France, rally to my banner!" },
  { file: "d2", text: "March on the Tourelles! Tonight the gates will open!" },
  { file: "d3", text: "Englishmen — go back to your country before blood is spilled." },
  { file: "bw1", text: "The road to Reims is open. All glory to the King of Heaven." },
  { file: "bw2", text: "The enemy has retreated, and the bells of Orléans ring once more." },
  { file: "bw3", text: "May the Lord have mercy on every poor soul who fell on this field." },
  { file: "bd1", text: "No wall, however high, can stand against the will of God. Reform the ranks." },
  { file: "bd2", text: "Even with an arrow in my chest, this banner will not fall." },
  { file: "bd3", text: "The enemy grows weary. We shall pray through the night and strike again at dawn." },
  { file: "bl1", text: "You may burn my body, but you cannot burn my soul." },
  { file: "bl2", text: "Even if I am captured, France will be free in the end." },
  { file: "bl3", text: "Hold the cross before my eyes until the very last breath leaves me." },
  { file: "c1", text: "The Lord goes before us! Break through!" },
  { file: "c2", text: "Set the ladders against the wall! Forward, in God's name!" },
  { file: "c3", text: "Cast away your fear! Victory is already ours!" },
  { file: "quote", text: "I am a messenger sent by God. I have come to save France." },
];

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

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
console.log(`출력 경로: ${OUTPUT_DIR}`);
console.log(`총 ${lines.length}개 대사 생성 시작\n`);

for (const entry of lines) {
  await generateVoice(entry);
  await new Promise((r) => setTimeout(r, 1000));
}

console.log(`\n완료! ${lines.length}개 파일 생성됨`);
