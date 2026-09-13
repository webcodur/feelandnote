import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { collectBooks } from './bestsellers/books.mjs';
import { collectMedia } from './bestsellers/media.mjs';
import { BESTSELLER_CATEGORY_KEYS as categoryKeys, MIN_CATEGORY_ITEMS, validBestsellerItems as validItems } from '../src/lib/library/bestsellerPolicy.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const defaultInput = path.resolve(directory, '../src/constants/library/bestsellers.json');
export { MIN_CATEGORY_ITEMS };

export function resolveKeys(environment = process.env, localText = '') {
  const local = parseEnv(localText);
  return {
    kakaoKey: environment.KAKAO_REST_API_KEY ?? local.KAKAO_REST_API_KEY ?? '',
    tmdbKey: environment.TMDB_API_KEY ?? local.TMDB_API_KEY ?? '',
  };
}

export async function syncBestsellers({ existing, now = new Date().toISOString(), collect, log = console.log }) {
  if (!existing || !Number.isFinite(Date.parse(existing.updated_at))) throw new Error('Missing valid previous dataset');
  const data = { updated_at: existing.updated_at, ko: { categories: {}, category_updated_at: {} }, en: { categories: {}, category_updated_at: {} } };
  const failed = [];
  for (const locale of ['ko', 'en']) {
    for (const key of categoryKeys) {
      const oldItems = existing[locale]?.categories?.[key] || (locale === 'ko' ? existing.categories?.[key] : undefined);
      if (!validItems(oldItems)) throw new Error(`Invalid previous dataset: ${locale}/${key}`);
      try {
        const items = await collect(locale, key);
        if (!validItems(items)) throw new Error('Source returned too few or invalid items');
        data[locale].categories[key] = items;
        data[locale].category_updated_at[key] = now;
        log(`[OK] ${locale}/${key}: ${items.length} items`);
      } catch (error) {
        data[locale].categories[key] = oldItems;
        data[locale].category_updated_at[key] = existing[locale]?.category_updated_at?.[key] || existing.updated_at;
        failed.push(`${locale}/${key}`);
        log(`[FAIL] ${locale}/${key}: ${error.message}`);
      }
    }
  }
  if (failed.length === 0) data.updated_at = now;
  data.categories = data.ko.categories;
  return { data, failed };
}

function atomicWrite(output, data) {
  const serialized = JSON.stringify(data, null, 2) + '\n';
  JSON.parse(serialized);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, serialized, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporary, output);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

export async function runCli(args = process.argv.slice(2), options = {}) {
  const log = options.log || console.log;
  try {
    if (args.length && (args.length !== 2 || args[0] !== '--output' || !args[1])) throw new Error('Usage: sync-bestsellers.mjs [--output <path>]');
    const input = options.input || defaultInput;
    const output = path.resolve(args[1] || input);
    const envPath = path.resolve(directory, '../.env');
    const local = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const { kakaoKey, tmdbKey } = resolveKeys(process.env, local);
    const collect = options.collect || ((locale, key) => ['VIDEO', 'GAME', 'MUSIC'].includes(key)
      ? collectMedia(locale, key, tmdbKey) : collectBooks(locale, key, kakaoKey));
    const existing = JSON.parse(fs.readFileSync(input, 'utf8'));
    const { data, failed } = await syncBestsellers({ existing, collect, now: options.now, log });
    atomicWrite(output, data);
    log(`Saved ${output}; ${failed.length} category check(s) failed.`);
    return failed.length ? 1 : 0;
  } catch (error) {
    log(`Bestseller sync failed: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runCli();
}
