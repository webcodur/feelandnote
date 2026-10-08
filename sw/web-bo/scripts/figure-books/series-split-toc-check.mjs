/** DB에 있는 국내서의 실제 ISBN·저자·출판사·전체 목차를 읽기 전용으로 대조한다. */
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadSeriesAuditCatalog} from './series-split-audit.mjs';
import {detectSplitSeries} from './lib/series-audit.mjs';
import {stripBookEditionLabels} from './lib/series-work.mjs';

const clean = value => String(value ?? '').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const norm = value => clean(value).normalize('NFKC').toLowerCase()
  .replace(/[\p{P}\p{Z}]/gu, '').replace(/저자$|지음$|저$/, '');
const title = value => stripBookEditionLabels(clean(value)).trim();
export const PUBLISHER_TOC_LIMITS = Object.freeze({minTocChars:120, concurrency:4, maxSearchResults:3});

export function parsePublisherToc(html, url) {
  const tocStart = html.indexOf('id="infoset_toc"');
  if (tocStart < 0) return null;
  const toc = clean(html.slice(tocStart).match(/<textarea[^>]*class="txtContentText"[^>]*>([\s\S]*?)<\/textarea>/)?.[1]);
  if (toc.length < PUBLISHER_TOC_LIMITS.minTocChars) return null;
  return {
    isbn:html.match(/<th[^>]*>ISBN13<\/th>\s*<td[^>]*>(\d{13})<\/td>/)?.[1],
    title:clean(html.match(/<h2 class="gd_name">([\s\S]*?)<\/h2>/)?.[1]),
    authors:clean(html.match(/<span class="gd_auth"[^>]*>([\s\S]*?)<\/span>/)?.[1]),
    publisher:clean(html.match(/<span class="gd_pub">([\s\S]*?)<\/span>/)?.[1]),
    url, tocHash:createHash('sha256').update(norm(toc)).digest('hex'),
    tocSample:toc.slice(0,180), tocChars:toc.length,
  };
}

export function publisherTocMatchesEdition(source, edition) {
  const creators = edition.creator?.split(/[,，]/).map(norm).filter(Boolean) ?? [];
  return Boolean(source && edition.isbn && source.isbn === edition.isbn
    && norm(title(source.title)) === norm(title(edition.title))
    && creators.length && creators.every(creator => norm(source.authors).includes(creator))
    && norm(edition.publisher) && norm(source.publisher) === norm(edition.publisher));
}

export function createPublisherTocLoader(fetcher = fetch) {
  const cache = new Map();
  const read = async url => {
    const response = await fetcher(url, {signal:AbortSignal.timeout(18000)});
    if (!response.ok) throw Error('HTTP ' + response.status);
    return response.text();
  };
  const load = async edition => {
    if (!cache.has(edition.isbn)) cache.set(edition.isbn, (async () => {
      const search = await read('https://www.yes24.com/Product/Search?query=' + edition.isbn);
      const links = [...search.matchAll(/<a class="gd_name" href="([^"]+)"[^>]*>(.*?)<\/a>/gs)]
        .filter(match => /\/product\/goods\//i.test(match[1]));
      const sources = [];
      for (const link of links.slice(0, PUBLISHER_TOC_LIMITS.maxSearchResults)) {
        const url = new URL(link[1], 'https://www.yes24.com').href;
        const source = parsePublisherToc(await read(url), url);
        if (source?.isbn === edition.isbn) sources.push(source);
      }
      return sources;
    })().catch(error => ({error:error.message})));
    const sources = await cache.get(edition.isbn);
    return Array.isArray(sources) ? sources.find(source => publisherTocMatchesEdition(source, edition)) ?? null : sources;
  };
  return {load, count:() => cache.size};
}

export async function checkPublisherTocs(catalog, log = () => {}, fetcher = fetch) {
  const candidates = detectSplitSeries(catalog).candidates.filter(candidate => candidate.signals.includes('same-title')
    && candidate.works.every(work => (!work.identity || work.identity.startsWith('book/')) && work.editions.length
      && work.editions.every(edition => edition.locale === 'ko' && edition.isbn))
    && candidate.warnings.every(warning => ['collection_or_set','independent_editing_or_commentary'].includes(warning)));
  const loader = createPublisherTocLoader(fetcher), matches = [];
  let next = 0, done = 0;
  log(JSON.stringify({tocCandidates:candidates.length}));
  await Promise.all(Array.from({length:PUBLISHER_TOC_LIMITS.concurrency}, async () => {
    while (next < candidates.length) {
      const candidate = candidates[next++], proofs = [];
      // 후보별 순차 조회로 전체 네트워크 동시성도 제한한다.
      for (const edition of candidate.works.flatMap(work => work.editions)) proofs.push(await loader.load(edition));
      if (proofs.every(proof => proof?.tocHash) && new Set(proofs.map(proof => proof.tocHash)).size === 1
        && new Set(proofs.map(proof => norm(proof.publisher))).size === 1) {
        const best = [...candidate.works].sort((a,b) => Number(/큰글/.test(a.titles[0])) - Number(/큰글/.test(b.titles[0])) || a.id.localeCompare(b.id))[0];
        const match = {ids:candidate.contentIds, keep:best.id, title:title(best.editions[0].title), creator:best.editions[0].creator, proofs};
        matches.push(match);
        log(JSON.stringify({tocMatch:match.title, ids:match.ids, sources:proofs.map(proof => proof.url)}));
      }
      if (++done % 25 === 0) log(JSON.stringify({tocReviewed:done,total:candidates.length,matches:matches.length}));
    }
  }));
  const result = {reviewed:done, fetchedIsbns:loader.count(), matches};
  log(JSON.stringify({tocSweepComplete:true,reviewed:done,matches:matches.length,fetchedIsbns:result.fetchedIsbns}));
  return result;
}

export async function main() {
  if (process.argv.slice(2).length) throw Error('Usage: series-split-toc-check.mjs');
  await checkPublisherTocs(loadSeriesAuditCatalog(), console.log);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error => {console.error(error.message); process.exitCode = 1});
