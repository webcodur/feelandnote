/**
 * R2 음성 파일 마이그레이션: v{N}/ 경로 → 평탄 경로
 * celebs/{id}/voice/v4/ko/g1.mp3  →  celebs/{id}/voice/ko/g1.mp3
 *
 * 대상: voice_v > 0인 셀럽 (현재 클레오파트라 1명, voice_v=4)
 * Usage: node scripts/voice-migrate-flat.mjs
 */

import crypto from "crypto";

const ACCOUNT_ID = "d61e473d2c8084b5a30bb2dc1aea9246";
const ACCESS_KEY = "23cc44672f19890434c32eda05b51dcf";
const SECRET_KEY = "d3b8e05087df0b3e82198203e67c2bf378d0f46f9b4424abc43620bc83738990";
const BUCKET = "feelandnote";
const ENDPOINT = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const REGION = "auto";
const SERVICE = "s3";

// voice_v > 0인 셀럽 목록
const TARGETS = [
  { id: "4e554ba5-b10d-49f3-a4a5-1e3f8b6af199", voiceV: 4 }, // 클레오파트라
];

const LOCALES = ["ko", "en"];
const FILES = [
  "g1.mp3", "g2.mp3", "g3.mp3",
  "r1.mp3", "r2.mp3", "r3.mp3",
  "d1.mp3", "d2.mp3", "d3.mp3",
  "bw1.mp3", "bw2.mp3", "bw3.mp3",
  "bd1.mp3", "bd2.mp3", "bd3.mp3",
  "bl1.mp3", "bl2.mp3", "bl3.mp3",
  "c1.mp3", "c2.mp3", "c3.mp3",
  "quote.mp3",
];

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sign(method, objectKey, body, headers_extra = {}) {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8);
  const amzDate = dateStamp + "T" + now.toISOString().replace(/[-:]/g, "").slice(9, 15) + "Z";
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const payloadHash = sha256(body);

  const headers = {
    host: `${BUCKET}.${ENDPOINT}`,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    ...headers_extra,
  };

  const signedHeaderKeys = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map((k) => `${k}:${headers[k]}\n`).join("");
  const canonicalRequest = [method, `/${objectKey}`, "", canonicalHeaders, signedHeaderKeys, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${SECRET_KEY}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  return { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaderKeys}, Signature=${signature}` };
}

async function copyFile(srcKey, dstKey) {
  const getHeaders = sign("GET", srcKey, "");
  const getRes = await fetch(`https://${BUCKET}.${ENDPOINT}/${srcKey}`, { method: "GET", headers: getHeaders });
  if (!getRes.ok) return null; // 파일 없으면 스킵
  const body = Buffer.from(await getRes.arrayBuffer());

  const putHeaders = sign("PUT", dstKey, body, { "content-type": "audio/mpeg" });
  const putRes = await fetch(`https://${BUCKET}.${ENDPOINT}/${dstKey}`, { method: "PUT", headers: { ...putHeaders, "content-type": "audio/mpeg" }, body });
  if (!putRes.ok) throw new Error(`PUT ${dstKey}: ${putRes.status}`);

  return body.length;
}

let ok = 0, skip = 0, fail = 0;

for (const { id, voiceV } of TARGETS) {
  for (const locale of LOCALES) {
    for (const file of FILES) {
      const dstKey = `celebs/${id}/voice/${locale}/${file}`;

      // 최신 버전부터 역순 탐색 → 첫 발견된 파일을 평탄 경로로 복사
      let found = false;
      for (let v = voiceV; v >= 1; v--) {
        const srcKey = `celebs/${id}/voice/v${v}/${locale}/${file}`;
        try {
          const size = await copyFile(srcKey, dstKey);
          if (size !== null) {
            console.log(`[OK] ${srcKey} → ${dstKey} (${size} bytes)`);
            ok++;
            found = true;
            break;
          }
        } catch (err) {
          console.error(`[FAIL] ${srcKey}: ${err.message}`);
          fail++;
          found = true;
          break;
        }
      }
      if (!found) skip++;
    }
  }
}

console.log(`\n완료! 복사 ${ok}개, 스킵 ${skip}개, 실패 ${fail}개`);
if (fail === 0) {
  console.log("v{N}/ 경로 파일은 수동 삭제 또는 자연 방치 (접근 안 됨)");
}
