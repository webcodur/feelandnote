// URL Inspection API batch inspector for sc-domain:feelandnote.com
// Usage (from sw/remotion so googleapis resolves):
//   node scripts/_scratch-gsc-url-inspect.mjs <urls-file> [out-json]
// urls-file: one absolute URL per line (https://feelandnote.com/...)
import { google } from 'googleapis';
import fs from 'node:fs/promises';

const [urlsFile, outFile] = process.argv.slice(2);
if (!urlsFile) {
  console.error('usage: _scratch-gsc-url-inspect.mjs <urls-file> [out-json]');
  process.exit(1);
}
const urls = (await fs.readFile(urlsFile, 'utf8'))
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const auth = new google.auth.GoogleAuth({
  keyFile: 'C:/project/feelandnote/credentials/ga-service-account.json',
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const sc = google.searchconsole({ version: 'v1', auth });

const results = [];
const CONCURRENCY = 5;
let cursor = 0;
async function worker() {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    try {
      const res = await sc.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: url,
          siteUrl: 'sc-domain:feelandnote.com',
          languageCode: 'ko',
        },
      });
      const r = res.data.inspectionResult?.indexStatusResult ?? {};
      results.push({
        url,
        verdict: r.verdict ?? null,
        coverageState: r.coverageState ?? null,
        robotsTxtState: r.robotsTxtState ?? null,
        indexingState: r.indexingState ?? null,
        lastCrawlTime: r.lastCrawlTime ?? null,
        pageFetchState: r.pageFetchState ?? null,
        googleCanonical: r.googleCanonical ?? null,
        userCanonical: r.userCanonical ?? null,
        crawledAs: r.crawledAs ?? null,
      });
      console.log(`${r.verdict ?? '?'} | ${url} | ${r.coverageState ?? ''} | crawl=${r.lastCrawlTime ?? '-'}`);
    } catch (e) {
      const msg = e?.errors?.[0]?.message ?? e.message;
      results.push({ url, error: msg });
      console.log(`ERR | ${url} | ${msg}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
if (outFile) await fs.writeFile(outFile, JSON.stringify(results, null, 1));
console.log(`done: ${results.length}`);
