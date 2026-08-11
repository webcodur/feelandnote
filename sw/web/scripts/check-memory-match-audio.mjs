import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(SCRIPT_DIR, "..");
const AUDIO_PLAN_SOURCE_PATH = join(
  WEB_ROOT,
  "src/components/features/game/memory/audioPlan.ts",
);
const AUDIO_CONFIG_SOURCE_PATH = join(
  WEB_ROOT,
  "src/components/features/game/memory/useMemoryAudio.ts",
);
const SAMPLE_RATE = 48_000;
const ANALYSIS_WINDOW_SAMPLES = SAMPLE_RATE / 100;
const ACTIVE_RMS_DB = -45;

function extract(pattern, source, label) {
  const value = source.match(pattern)?.[1];
  if (!value) throw new Error(`${label}을(를) 코드에서 찾지 못했습니다.`);
  return value;
}

function toDb(value) {
  return value > 0 ? 20 * Math.log10(value) : Number.NEGATIVE_INFINITY;
}

function decodeMonoFloat32(path) {
  if (!ffmpegPath) throw new Error("ffmpeg-static 실행 파일을 찾지 못했습니다.");

  const result = spawnSync(
    ffmpegPath,
    [
      "-v", "error",
      "-i", path,
      "-ac", "1",
      "-ar", String(SAMPLE_RATE),
      "-f", "f32le",
      "pipe:1",
    ],
    { encoding: null, maxBuffer: 16 * 1024 * 1024 },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr.toString("utf8").trim() || "오디오 디코딩 실패");
  }

  const sampleCount = Math.floor(result.stdout.length / Float32Array.BYTES_PER_ELEMENT);
  const samples = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = result.stdout.readFloatLE(index * Float32Array.BYTES_PER_ELEMENT);
  }
  return samples;
}

function analyse(samples, sfxVolume) {
  let peak = 0;
  let firstActiveWindow = -1;
  let lastActiveWindow = -1;

  for (let start = 0, windowIndex = 0; start < samples.length; start += ANALYSIS_WINDOW_SAMPLES, windowIndex += 1) {
    const end = Math.min(start + ANALYSIS_WINDOW_SAMPLES, samples.length);
    let squareSum = 0;
    for (let index = start; index < end; index += 1) {
      const absolute = Math.abs(samples[index]);
      peak = Math.max(peak, absolute);
      squareSum += samples[index] ** 2;
    }

    const rms = Math.sqrt(squareSum / (end - start));
    if (toDb(rms) >= ACTIVE_RMS_DB) {
      if (firstActiveWindow === -1) firstActiveWindow = windowIndex;
      lastActiveWindow = windowIndex;
    }
  }

  return {
    durationSeconds: samples.length / SAMPLE_RATE,
    onsetSeconds: firstActiveWindow / 100,
    audibleEndSeconds: (lastActiveWindow + 1) / 100,
    runtimePeakDb: toDb(peak * sfxVolume),
  };
}

const audioPlanSource = readFileSync(AUDIO_PLAN_SOURCE_PATH, "utf8");
const audioConfigSource = readFileSync(AUDIO_CONFIG_SOURCE_PATH, "utf8");
const matchFile = process.argv[2]
  ?? extract(/match:\s*"([^"]+)"/, audioPlanSource, "정답 효과음 파일명");
const sfxVolume = Number(extract(/sfxVolume:\s*([\d.]+)/, audioConfigSource, "효과음 볼륨"));
const effectDelayMs = Number(extract(/effectDelayMs:\s*(\d+)/, audioPlanSource, "판정 연출 지연 시간"));
const matchFinishMs = Number(extract(/matchFinishMs:\s*(\d+)/, audioPlanSource, "정답 마무리 시간"));
const audioPath = join(WEB_ROOT, "public/assets/common", matchFile);
const metrics = analyse(decodeMonoFloat32(audioPath), sfxVolume);
const availableEffectSeconds = (matchFinishMs - effectDelayMs) / 1000;

const checks = [
  [metrics.onsetSeconds >= 0 && metrics.onsetSeconds <= 0.08, "소리가 선택 직후 80ms 안에 시작해야 합니다."],
  [metrics.audibleEndSeconds <= availableEffectSeconds + 0.04, "들리는 꼬리가 카드 제거 연출 뒤까지 남지 않아야 합니다."],
  [metrics.durationSeconds <= availableEffectSeconds + 0.1, "파일의 무음 꼬리를 포함한 길이가 판정 연출 안에 들어와야 합니다."],
  [metrics.runtimePeakDb >= -18 && metrics.runtimePeakDb <= -8, "게임 볼륨 적용 피크가 -18~-8dBFS여야 합니다."],
];

console.log(`file=${matchFile}`);
console.log(`effectDelay=${effectDelayMs}ms matchFinish=${matchFinishMs}ms duration=${Math.round(metrics.durationSeconds * 1000)}ms onset=${Math.round(metrics.onsetSeconds * 1000)}ms audibleEnd=${Math.round(metrics.audibleEndSeconds * 1000)}ms runtimePeak=${metrics.runtimePeakDb.toFixed(1)}dBFS`);

const failures = checks.filter(([passed]) => !passed);
if (failures.length > 0) {
  for (const [, message] of failures) console.error(`FAIL: ${message}`);
  process.exitCode = 1;
} else {
  console.log("PASS: 기억 게임 정답 효과음이 연출 시간과 음량 기준을 충족합니다.");
}
