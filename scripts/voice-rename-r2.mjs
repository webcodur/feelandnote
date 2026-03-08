/**
 * R2 roll_call 파일 리네임: a1→r1, a2→r2, a3→r3
 * Usage: node scripts/voice-rename-r2.mjs
 */

import fs from "fs";
import crypto from "crypto";

const ACCOUNT_ID = "d61e473d2c8084b5a30bb2dc1aea9246";
const ACCESS_KEY = "23cc44672f19890434c32eda05b51dcf";
const SECRET_KEY = "d3b8e05087df0b3e82198203e67c2bf378d0f46f9b4424abc43620bc83738990";
const BUCKET = "feelandnote";
const ENDPOINT = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const REGION = "auto";
const SERVICE = "s3";

const CELEBS = [
  "e94f8fc2-9010-4f39-9d32-2dad78a83cd2", // genghis-khan
  "deb5a570-a009-410d-9436-77180a85a058", // alexander-the-great
  "73d5da05-cccf-47ba-bc52-5b1a39725b9b", // yi-sun-sin
  "65f9e925-7f8c-4e18-b056-a45d96c6e7b6", // leonardo-da-vinci
  "9508ba04-50f6-488b-939f-1328d0293685", // joan-of-arc
];
const LOCALES = ["ko", "en"];
const RENAMES = [
  ["a1.mp3", "r1.mp3"],
  ["a2.mp3", "r2.mp3"],
  ["a3.mp3", "r3.mp3"],
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

// GET → PUT (copy via download + re-upload)
async function copyFile(srcKey, dstKey) {
  // 1. Download
  const getHeaders = sign("GET", srcKey, "");
  const getRes = await fetch(`https://${BUCKET}.${ENDPOINT}/${srcKey}`, { method: "GET", headers: getHeaders });
  if (!getRes.ok) throw new Error(`GET ${srcKey}: ${getRes.status}`);
  const body = Buffer.from(await getRes.arrayBuffer());

  // 2. Upload to new key
  const putHeaders = sign("PUT", dstKey, body, { "content-type": "audio/mpeg" });
  const putRes = await fetch(`https://${BUCKET}.${ENDPOINT}/${dstKey}`, { method: "PUT", headers: { ...putHeaders, "content-type": "audio/mpeg" }, body });
  if (!putRes.ok) throw new Error(`PUT ${dstKey}: ${putRes.status}`);

  return body.length;
}

async function deleteFile(key) {
  const headers = sign("DELETE", key, "");
  const res = await fetch(`https://${BUCKET}.${ENDPOINT}/${key}`, { method: "DELETE", headers });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE ${key}: ${res.status}`);
}

let ok = 0, fail = 0;

for (const celebId of CELEBS) {
  for (const locale of LOCALES) {
    for (const [oldFile, newFile] of RENAMES) {
      const srcKey = `celebs/${celebId}/voice/${locale}/${oldFile}`;
      const dstKey = `celebs/${celebId}/voice/${locale}/${newFile}`;
      try {
        const size = await copyFile(srcKey, dstKey);
        await deleteFile(srcKey);
        console.log(`[OK] ${srcKey} → ${newFile} (${size} bytes)`);
        ok++;
      } catch (err) {
        console.error(`[FAIL] ${srcKey}: ${err.message}`);
        fail++;
      }
    }
  }
}

console.log(`\n완료! 성공 ${ok}개, 실패 ${fail}개`);
