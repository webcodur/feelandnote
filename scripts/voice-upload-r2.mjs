/**
 * R2 보이스 파일 업로드 — AWS Signature V4 (의존성 없음)
 * Usage: node scripts/voice-upload-r2.mjs
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// R2 설정
const ACCOUNT_ID = "d61e473d2c8084b5a30bb2dc1aea9246";
const ACCESS_KEY = "23cc44672f19890434c32eda05b51dcf";
const SECRET_KEY = "d3b8e05087df0b3e82198203e67c2bf378d0f46f9b4424abc43620bc83738990";
const BUCKET = "feelandnote";
const ENDPOINT = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const REGION = "auto";
const SERVICE = "s3";

// 다빈치
const CELEB_ID = "65f9e925-7f8c-4e18-b056-a45d96c6e7b6";

const uploads = [
  { locale: "ko", dir: "c:/Users/webco/Downloads/다빈치-ko" },
  { locale: "en", dir: "c:/Users/webco/바탕 화면/윤시준/PRJ/feelandnote/scripts/voice-output/da-vinci/en" },
];

// --- AWS Sig V4 helpers ---
function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sign(method, objectKey, body, contentType) {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
  const amzDate = dateStamp + "T" + now.toISOString().replace(/[-:]/g, "").slice(9, 15) + "Z";
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

  const payloadHash = sha256(body);
  const headers = {
    host: `${BUCKET}.${ENDPOINT}`,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    "content-type": contentType,
  };

  const signedHeaderKeys = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}\n`)
    .join("");

  const canonicalRequest = [
    method,
    `/${objectKey}`,
    "",
    canonicalHeaders,
    signedHeaderKeys,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${SECRET_KEY}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaderKeys}, Signature=${signature}`;

  return { ...headers, authorization };
}

async function uploadFile(objectKey, filePath) {
  const body = fs.readFileSync(filePath);
  const headers = sign("PUT", objectKey, body, "audio/mpeg");

  const res = await fetch(`https://${BUCKET}.${ENDPOINT}/${objectKey}`, {
    method: "PUT",
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return body.length;
}

// --- 실행 ---
let uploaded = 0;
let failed = 0;

for (const { locale, dir } of uploads) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mp3"));
  console.log(`\n[${locale.toUpperCase()}] ${files.length}개 파일 → celebs/${CELEB_ID}/voice/${locale}/`);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const r2Key = `celebs/${CELEB_ID}/voice/${locale}/${file}`;
    try {
      const size = await uploadFile(r2Key, filePath);
      console.log(`  [OK] ${file} (${size} bytes)`);
      uploaded++;
    } catch (err) {
      console.error(`  [FAIL] ${file}: ${err.message}`);
      failed++;
    }
  }
}

console.log(`\n완료! 업로드 ${uploaded}개, 실패 ${failed}개`);
