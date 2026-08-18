#!/usr/bin/env node
/*
  파일명: sw/web-bo/scripts/photo/world-banner.mjs
  기능: 와이드 3:1 세계 배너 원본에서 PC·모바일 WebP를 만든다.
  책임: 비율 왜곡 없이 PC 1536×512를 만들고, 사람이 고른 가로 초점으로 모바일 928×512를 파생한다.

  사용법:
    node sw/web-bo/scripts/photo/world-banner.mjs \
      --id tang-song \
      --source sw/web-bo/output/worlds-raw/tang-song-source.png \
      --mobile-left 64

  --mobile-left는 정규화된 PC 1536px 좌표 기준이며 0~608 범위다.
  기존 파일을 교체하려면 --force를 명시한다.
*/

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const REPO = path.resolve(import.meta.dirname, "../../..");
const OUT_DIR = path.join(REPO, "sw/web/public/images/worlds");
const PC = { width: 1536, height: 512 };
const MOBILE = { width: 928, height: 512 };
const TARGET_RATIO = PC.width / PC.height;

function flag(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function fail(message) {
  throw new Error(message);
}

async function main() {
  const args = process.argv.slice(2);
  const id = flag(args, "--id");
  const sourceArg = flag(args, "--source");
  const mobileLeftArg = flag(args, "--mobile-left");
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");

  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    fail("--id에는 영문 소문자·숫자·하이픈으로 된 world id가 필요하다.");
  }
  if (!sourceArg) fail("--source가 필요하다.");
  if (mobileLeftArg === null) {
    fail("--mobile-left가 필요하다. 중앙 크롭을 자동 채택하지 말고 눈으로 초점을 고른다.");
  }

  const source = path.resolve(REPO, sourceArg);
  const repoPrefix = `${REPO}${path.sep}`.toLowerCase();
  if (!source.toLowerCase().startsWith(repoPrefix)) fail("원본은 저장소 안에 있어야 한다.");
  if (!fs.existsSync(source)) fail(`원본을 찾지 못했다: ${source}`);

  const mobileLeft = Number(mobileLeftArg);
  const maxMobileLeft = PC.width - MOBILE.width;
  if (!Number.isInteger(mobileLeft) || mobileLeft < 0 || mobileLeft > maxMobileLeft) {
    fail(`--mobile-left는 0~${maxMobileLeft} 정수여야 한다.`);
  }

  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) fail("원본 크기를 읽지 못했다.");
  if (metadata.width < PC.width || metadata.height < PC.height) {
    fail(`원본 해상도 미달: ${metadata.width}×${metadata.height}, 최소 ${PC.width}×${PC.height}`);
  }
  const ratio = metadata.width / metadata.height;
  if (Math.abs(ratio - TARGET_RATIO) > 0.01) {
    fail(`3:1 와이드 원본이 아니다: ${metadata.width}×${metadata.height} (${ratio.toFixed(3)}:1)`);
  }

  const pcPath = path.join(OUT_DIR, `${id}-pc.webp`);
  const mobilePath = path.join(OUT_DIR, `${id}-mb.webp`);
  for (const output of [pcPath, mobilePath]) {
    if (!dryRun && !force && fs.existsSync(output)) {
      fail(`기존 파일이 있다. 교체하려면 --force: ${output}`);
    }
  }

  console.log(`[세계 배너] ${id}`);
  console.log(`  원본 ${metadata.width}×${metadata.height}`);
  console.log(`  PC   ${PC.width}×${PC.height}`);
  console.log(`  모바일 ${MOBILE.width}×${MOBILE.height}, left=${mobileLeft}`);
  if (dryRun) return;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const normalized = await sharp(source)
    .resize({ width: PC.width, height: PC.height, fit: "fill" })
    .toBuffer();

  const stamp = `${process.pid}-${Date.now()}`;
  const pcTemp = `${pcPath}.${stamp}.tmp`;
  const mobileTemp = `${mobilePath}.${stamp}.tmp`;
  try {
    await sharp(normalized).webp({ quality: 84 }).toFile(pcTemp);
    await sharp(normalized)
      .extract({ left: mobileLeft, top: 0, width: MOBILE.width, height: MOBILE.height })
      .webp({ quality: 84 })
      .toFile(mobileTemp);
    fs.renameSync(pcTemp, pcPath);
    fs.renameSync(mobileTemp, mobilePath);
  } finally {
    for (const temp of [pcTemp, mobileTemp]) {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
  }

  console.log(`  저장 ${pcPath}`);
  console.log(`  저장 ${mobilePath}`);
}

main().catch((error) => {
  console.error(`[세계 배너] 실패: ${error.message}`);
  process.exitCode = 1;
});
