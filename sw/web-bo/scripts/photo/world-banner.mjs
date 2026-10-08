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
  --publish는 로컬 운영본 대신 R2에 원본·파생본·생성 정보를 올리고 재조회 검증한다.
  --prompt <파일>은 생성 프롬프트를 R2 생성 정보에 함께 보관한다.
*/

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const REPO = path.resolve(import.meta.dirname, "../../../..");
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

const sha256 = (body) => createHash("sha256").update(body).digest("hex");

async function publishBanner(id, source, metadata, pc, mb, mobileLeft, prompt) {
  process.loadEnvFile(path.join(REPO, "sw/web-bo/.env"));
  for (const key of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"]) {
    if (!process.env[key]) fail(`${key}가 없다.`);
  }
  const { S3Client, GetObjectCommand, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
  const bucket = process.env.R2_BUCKET_NAME;
  const base = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
  const asset = (name, body, type) => ({
    key: `worlds/${id}/${name}-${sha256(body).slice(0, 16)}.${type === "image/png" ? "png" : "webp"}`,
    body, type, sha256: sha256(body),
  });
  const assets = [asset("source", fs.readFileSync(source), "image/png"), asset("pc", pc, "image/webp"), asset("mb", mb, "image/webp")];
  // 입력은 PNG 원본으로 보존한다. 확장자만 PNG로 바꾸는 업로드를 막는다.
  if (metadata.format !== "png") fail("R2 발행 원본은 PNG여야 한다.");
  const descriptor = {
    worldId: id,
    source: { key: assets[0].key, sha256: assets[0].sha256, width: metadata.width, height: metadata.height },
    pc: { key: assets[1].key, sha256: assets[1].sha256, ...PC },
    mb: { key: assets[2].key, sha256: assets[2].sha256, ...MOBILE, left: mobileLeft },
    webpQuality: 84,
    ...(prompt ? { prompt } : {}),
  };
  const manifest = Buffer.from(`${JSON.stringify(descriptor, null, 2)}\n`);
  assets.push({ key: `worlds/${id}/manifest-${sha256(manifest).slice(0, 16)}.json`, body: manifest, type: "application/json", sha256: sha256(manifest) });
  try {
    for (const item of assets) {
      let stored;
      try {
        const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: item.key }));
        stored = Buffer.from(await object.Body.transformToByteArray());
      } catch (error) {
        if (error.$metadata?.httpStatusCode !== 404) throw error;
      }
      if (stored && sha256(stored) !== item.sha256) fail(`기존 R2 내용 불일치: ${item.key}`);
      if (!stored) {
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: item.key, Body: item.body,
          ContentType: item.type, CacheControl: "public, max-age=31536000, immutable", Metadata: { sha256: item.sha256 } }));
      }
      const url = `${base}/${item.key}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok || sha256(Buffer.from(await response.arrayBuffer())) !== item.sha256) fail(`R2 공개 재조회 실패: ${url}`);
      console.log(`  R2 검증 ${url}`);
    }
  } finally {
    client.destroy();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const id = flag(args, "--id");
  const sourceArg = flag(args, "--source");
  const mobileLeftArg = flag(args, "--mobile-left");
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const publish = args.includes("--publish");
  const promptArg = flag(args, "--prompt");

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
  const promptPath = promptArg ? path.resolve(REPO, promptArg) : null;
  if (promptPath && !promptPath.toLowerCase().startsWith(repoPrefix)) fail("프롬프트는 저장소 안에 있어야 한다.");
  const prompt = promptPath ? fs.readFileSync(promptPath, "utf8").trim() : null;

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
    if (!publish && !dryRun && !force && fs.existsSync(output)) {
      fail(`기존 파일이 있다. 교체하려면 --force: ${output}`);
    }
  }

  console.log(`[세계 배너] ${id}`);
  console.log(`  원본 ${metadata.width}×${metadata.height}`);
  console.log(`  PC   ${PC.width}×${PC.height}`);
  console.log(`  모바일 ${MOBILE.width}×${MOBILE.height}, left=${mobileLeft}`);
  if (dryRun) return;

  const normalized = await sharp(source)
    .resize({ width: PC.width, height: PC.height, fit: "fill" })
    .toBuffer();

  if (publish) {
    const pc = await sharp(normalized).webp({ quality: 84 }).toBuffer();
    const mb = await sharp(normalized).extract({ left: mobileLeft, top: 0, ...MOBILE }).webp({ quality: 84 }).toBuffer();
    await publishBanner(id, source, metadata, pc, mb, mobileLeft, prompt);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
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
