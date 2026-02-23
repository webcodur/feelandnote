#!/usr/bin/env node

/**
 * 셀럽 아바타 3:4 → 1:1 마이그레이션 스크립트
 *
 * 기존 300×400 아바타를 상단 300×300으로 crop하여 덮어쓴다.
 * 이미 1:1인 파일은 건너뛴다.
 *
 * 사용법:
 *   node sw/tools/migrate-avatars-1x1.mjs
 *
 * 필요 패키지: sharp, @supabase/supabase-js, dotenv
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../web/.env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = "avatars";
const PREFIX = "celebs/";

async function main() {
  console.log("=== 셀럽 아바타 1:1 마이그레이션 시작 ===\n");

  // 1. celebs/ 하위 폴더 목록 가져오기
  const { data: folders, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list(PREFIX, { limit: 2000 });

  if (listErr) {
    console.error("폴더 목록 조회 실패:", listErr.message);
    process.exit(1);
  }

  // 폴더만 필터 (id 디렉토리)
  const celebFolders = folders.filter((f) => f.id === null);
  console.log(`대상 셀럽 폴더: ${celebFolders.length}개\n`);

  let processed = 0;
  let skipped = 0;
  let converted = 0;
  let errors = 0;

  for (const folder of celebFolders) {
    const filePath = `${PREFIX}${folder.name}/avatar.webp`;
    processed++;

    try {
      // 다운로드
      const { data: blob, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(filePath);

      if (dlErr || !blob) {
        // avatar.webp가 없는 셀럽은 skip
        skipped++;
        continue;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const meta = await sharp(buffer).metadata();

      // 이미 1:1이면 skip
      if (meta.width === meta.height) {
        skipped++;
        if (processed % 100 === 0) {
          console.log(`[${processed}/${celebFolders.length}] 진행 중... (변환: ${converted}, 스킵: ${skipped})`);
        }
        continue;
      }

      // 상단 정사각 crop (min(w,h) × min(w,h))
      const size = Math.min(meta.width, meta.height);
      const cropped = await sharp(buffer)
        .extract({ left: 0, top: 0, width: size, height: size })
        .resize(300, 300)
        .webp({ lossless: true })
        .toBuffer();

      // 덮어쓰기 업로드
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, cropped, {
          contentType: "image/webp",
          upsert: true,
        });

      if (upErr) {
        console.error(`  [ERROR] ${filePath}: ${upErr.message}`);
        errors++;
      } else {
        converted++;
      }
    } catch (err) {
      console.error(`  [ERROR] ${filePath}: ${err.message}`);
      errors++;
    }

    if (processed % 50 === 0) {
      console.log(`[${processed}/${celebFolders.length}] 진행 중... (변환: ${converted}, 스킵: ${skipped}, 오류: ${errors})`);
    }
  }

  console.log("\n=== 마이그레이션 완료 ===");
  console.log(`총: ${celebFolders.length} | 변환: ${converted} | 스킵: ${skipped} | 오류: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
