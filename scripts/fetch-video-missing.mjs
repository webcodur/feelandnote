#!/usr/bin/env node
/**
 * Supabase에서 VIDEO creator_en 누락 목록을 가져와 JSON 파일로 저장
 */
import { readFileSync, writeFileSync } from 'fs';

const envContent = readFileSync('sw/web/.env', 'utf8').replace(/\r/g, '');
const env = {};
for (const line of envContent.split('\n')) {
  const eq = line.indexOf('=');
  if (eq > 0 && !line.startsWith('#')) {
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchAll() {
  const allItems = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/contents?select=id,external_id&type=eq.VIDEO&creator_en=is.null&external_id=not.is.null&order=id&offset=${offset}&limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    allItems.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }

  writeFileSync('scripts/video-missing.json', JSON.stringify(allItems, null, 2));
  console.log(`Saved ${allItems.length} items to scripts/video-missing.json`);
}

fetchAll();
