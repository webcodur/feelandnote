// 기존 글 개편. 새 대상은 --ids=글번호 --manifest=JSON으로 검수 원고와 원장을 대조한다.
// 예약 목록 진입 → 원본 사진 재업로드 → 표지 액자 5 → 선택적 로고 → 저장·재열기 → 해당 원장 행 동기화.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { ASSETS } from '../blog-assets.mjs';
import { createExistingEditor } from './lib/existing-editor.mjs';
import { assertPublishOptions } from './lib/publish-options.mjs';
import { typeTitle, typeLine, insertImage, insertDivider, insertQuote, applyPhotoFrame, IMG_RE, strip, isDivider } from './publish-drafts.mjs';
import { readSnapshot as readImageSnapshot, insertLogo, setRepresentative, captureLogo, closePublishPanel, canonicalImageSource, assertLogoGeometry, uploadFile } from './repair-institution-images.mjs';

export const REVISION_IDS = Object.freeze(['224398726829', '224398727674', '224398728458', '224399136217', '224399138245', '224399139052', '224399139900', '224399256658', '224399261577', '224399282460', '224399284153', '224399287896', '224399586078', '224399605897', '224399608670', '224399611465', '224399620342', '224399629227']);
export const AVATAR_WIDTH = 100;
const ROOT = path.join(ASSETS, 'naver-blog');
const hash = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = value => String(value ?? '').replace(/\u200b/g, '').trim();
const urlKey = url => new URL(url).href;
const excluded = new Set(['deleted', 'to-delete', 'private', 'replaced', 'skip']);

export function parseRevisionOptions(args) {
  const options = { apply: false, prepareOnly: false, tableOnly: false, titleOnly: false, fillTableAuthors: false, useRevisionTitle: false, revisions: null, manifest: null, drafts: path.join(ROOT, 'drafts.json'), ids: [] };
  const seen = new Set();
  for (const arg of args) {
    const key = arg.split('=')[0];
    if (seen.has(key)) throw new Error(`중복 옵션: ${key}`);
    seen.add(key);
    if (arg === '--apply') options.apply = true;
    else if (arg === '--dry') options.apply = false;
    else if (arg === '--prepare-only') options.prepareOnly = true;
    else if (arg === '--table-only') options.tableOnly = true;
    else if (arg === '--title-only') options.titleOnly = true;
    else if (arg === '--fill-table-authors') options.fillTableAuthors = true;
    else if (arg === '--use-revision-title') options.useRevisionTitle = true;
    else if (arg === '--all') options.ids = [...REVISION_IDS];
    else if (arg.startsWith('--ids=')) options.ids = arg.slice(6).split(',');
    else if (arg.startsWith('--revisions=')) options.revisions = arg.slice(12);
    else if (arg.startsWith('--manifest=')) options.manifest = arg.slice(11);
    else if (arg.startsWith('--drafts=')) options.drafts = arg.slice(9);
    else throw new Error(`알 수 없는 옵션: ${arg}`);
  }
  if (seen.has('--apply') && (seen.has('--dry') || options.prepareOnly)) throw new Error('apply와 dry/prepare-only를 함께 쓰지 않는다');
  if (seen.has('--all') && seen.has('--ids')) throw new Error('--all과 --ids를 함께 쓰지 않는다');
  if ([options.titleOnly, options.tableOnly, options.fillTableAuthors].filter(Boolean).length > 1) throw new Error('부분 수정 모드는 한 번에 하나만 지정한다');
  if ((options.titleOnly || options.fillTableAuthors) && !options.manifest) throw new Error('부분 수정할 때는 manifest를 지정한다');
  if (!options.revisions || !options.drafts || !options.ids.length || new Set(options.ids).size !== options.ids.length || options.ids.some(id => !/^\d+$/.test(id))) throw new Error('검수 원고 파일과 정확한 대상 글 번호가 필요하다');
  if (options.manifest) {
    if (!seen.has('--ids') || options.ids.some(id => REVISION_IDS.includes(id))) throw new Error('새 실행 목록에는 명시한 미완료 글만 허용한다. 완료 18편은 보호한다');
  } else if (options.ids.some(id => !REVISION_IDS.includes(id))) throw new Error('새 대상은 --ids와 --manifest가 모두 필요하다');
  if (options.apply && options.ids.some(id => REVISION_IDS.includes(id))) throw new Error('완료 18편은 다시 저장하지 않는다');
  return options;
}

export function parseRevisionBody(revision) {
  if (typeof revision.body !== 'string' || !revision.body.trim() || typeof revision.title !== 'string' || !revision.title.trim()) throw new Error('제목 또는 본문이 없다');
  const celeb = revision.kind === 'celeb';
  if (!(celeb ? /^\/celeb\/[a-z0-9][a-z0-9.-]*$/ : /^\/library\/curated\/[^/]+\/[^/]+$/).test(revision.target)) throw new Error('글 유형과 서비스 경로가 맞지 않는다');
  const lines = revision.body.replace(/\r\n/g, '\n').split('\n');
  const images = [], flow = [], text = [], links = [], operations = [], quotes = [], tables = [], bookLinks = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) { operations.push({ kind: 'text', line: lines[index], lineIndex: index }); continue; }
    if (line === '[table]') {
      const start = index, rows = [];
      while (index + 1 < lines.length && lines[index + 1].trim() !== '[/table]') {
        const cells = lines[++index].split('\t');
        if (![2, 3].includes(cells.length) || cells.some(cell => cell !== cell.trim() || /https?:\/\/|\[\/?(?:table|q)\]/.test(cell))) throw new Error('전체 목록 표는 2~3열 TSV여야 한다');
        rows.push(cells);
      }
      if (lines[index + 1]?.trim() !== '[/table]') throw new Error('닫히지 않은 전체 목록 표');
      index++;
      const table = { rows, line: start, endLine: index };
      tables.push(table); flow.push({ kind: 'table', rows }); operations.push({ kind: 'table', ...table, lineIndex: start }); continue;
    }
    if (line.startsWith('[q]')) {
      const start = index, parts = [lines[index].replace(/^\s*\[q\]/, '')];
      while (!parts.at(-1).endsWith('[/q]') && index + 1 < lines.length) parts.push(lines[++index]);
      if (!parts.at(-1).endsWith('[/q]')) throw new Error('닫히지 않은 감상 인용구');
      parts[parts.length - 1] = parts.at(-1).slice(0, -4);
      const value = parts.join('\n');
      if (!value.trim() || /\[\/?q\]|\[(?:img|avatar):/.test(value)) throw new Error('빈 인용구 또는 중첩된 서식 표시');
      const paragraphs = value.split('\n').map(clean).filter(Boolean);
      const quote = { text: value, paragraphs, line: start };
      quotes.push(quote); text.push(...paragraphs); flow.push({ kind: 'quote', paragraphs });
      links.push(...(value.match(/https?:\/\/[^\s<>]+/g) ?? []).map(urlKey));
      operations.push({ kind: 'quote', ...quote, lineIndex: start }); continue;
    }
    if (isDivider(line)) { flow.push({ kind: 'divider' }); operations.push({ kind: 'divider', lineIndex: index }); continue; }
    const avatar = line.match(/^\[avatar:(https?:\/\/.+?)\|(\d+)\|([^\]]+)\]$/);
    const image = avatar ?? line.match(IMG_RE);
    if (image) {
      const width = Number(image[2]), name = image[3]?.trim();
      if (!/^https?:\/\//.test(image[1]) || !Number.isInteger(width) || (avatar ? width !== AVATAR_WIDTH : width < 80 || width > 400) || !name) throw new Error(`이미지 표시 오류: ${line}`);
      const entry = { url: image[1], width, name, line: index, role: avatar ? 'avatar' : /로고|logo/i.test(name) ? 'logo' : 'cover' };
      images.push(entry); flow.push({ kind: 'image', index: images.length - 1 }); operations.push({ kind: 'image', image: entry, lineIndex: index }); continue;
    }
    if (/\[(?:img|avatar):/.test(line) || /\[\/?(?:q|table)\]/.test(line)) throw new Error('깨진 이미지·인용구·표 표시');
    if ((line.match(/\*\*/g) ?? []).length % 2 || line.includes('[c]') !== line.includes('[/c]')) throw new Error('원고 서식 표시가 맞지 않는다');
    const value = strip(line); text.push(value); flow.push({ kind: 'text', text: value });
    operations.push({ kind: 'text', line: lines[index], lineIndex: index });
    links.push(...(value.match(/https?:\/\/[^\s<>]+/g) ?? []).map(urlKey));
  }
  const logos = images.filter(image => image.role === 'logo'), covers = images.filter(image => image.role === 'cover'), avatars = images.filter(image => image.role === 'avatar');
  const minimumCovers = celeb ? 3 : 2;
  if (logos.length > 1 || covers.length < minimumCovers || covers.length > 5) throw new Error(`기관 로고는 0~1개, 표지는 ${minimumCovers}~5개여야 한다`);
  if (new Set([...covers, ...logos].map(image => image.url)).size !== covers.length + logos.length) throw new Error('같은 표지 또는 로고가 원고에 중복되어 있다');
  if (celeb) {
    const reviews = revision.dbReviews, avatar = avatars[0];
    if (logos.length || tables.length || revision.fullList || !Array.isArray(reviews) || reviews.length !== covers.length || quotes.length !== reviews.length || avatars.length !== 1) throw new Error('인물편은 상단 사진 한 장과 책마다 DB 감상 한 구획을 둔다');
    if (images[0] !== avatar || flow[0]?.kind !== 'text' || flow[1]?.kind !== 'image' || flow[2]?.kind !== 'text') throw new Error('인물 사진과 이름은 첫 링크 바로 다음에 있어야 한다');
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      if (!review.person || !review.person_label || !review.celeb_id || review.celeb_id !== reviews[0].celeb_id || avatar.name !== review.person || avatar.url !== review.avatar_url || flow[2].text !== review.person_label || quotes[i].text !== review.review) throw new Error(`인물 표시와 DB 감상 원문이 맞지 않는다: ${review.review_id}`);
      const coverAt = flow.findIndex(item => item.kind === 'image' && images[item.index] === covers[i]);
      const quoteAt = flow.findIndex(item => item.kind === 'quote' && item.paragraphs === quotes[i].paragraphs);
      const nextCoverAt = i + 1 < covers.length ? flow.findIndex(item => item.kind === 'image' && images[item.index] === covers[i + 1]) : flow.length;
      if (quoteAt <= coverAt || quoteAt >= nextCoverAt) throw new Error('인물 감상은 대응하는 책 표지 다음에 있어야 한다');
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(review.content_id ?? '')) {
        const url = `https://feelandnote.com/content/${review.content_id}?category=book`;
        const matches = flow.slice(quoteAt + 1, nextCoverAt).flatMap((item, offset) => item.kind === 'text'
          ? (item.text.match(/https?:\/\/[^\s<>]+/g) ?? []).filter(value => value === url).map(() => ({ url, content_id: review.content_id, reviewIndex: i, flowIndex: quoteAt + 1 + offset })) : []);
        if (matches.length > 1) throw new Error('책 상세 링크는 대응하는 감상 뒤에 한 번만 둔다');
        bookLinks.push(...matches);
      }
    }
  } else if (avatars.length || quotes.length) {
    const reviews = revision.dbReviews;
    if (!Array.isArray(reviews) || avatars.length !== reviews.length || quotes.length !== reviews.length) throw new Error('감상마다 인물 사진·이름·인용구가 한 벌이어야 한다');
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i], avatar = avatars[i], quote = quotes[i], at = flow.findIndex(item => item.kind === 'image' && images[item.index] === avatar);
      if (!review.person || !review.person_label || avatar.name !== review.person || avatar.url !== review.avatar_url || flow[at + 1]?.kind !== 'text' || flow[at + 1].text !== review.person_label || flow[at + 2]?.kind !== 'quote' || !same(flow[at + 2].paragraphs, quote.paragraphs) || quote.text !== review.review) throw new Error(`인물 표시와 DB 감상 원문이 맞지 않는다: ${review.review_id}`);
    }
  }
  if (logos.length) {
    const asset = revision.logoAsset;
    if (!asset || logos[0].url !== asset.original_url || !asset.local_file || !/^[a-f0-9]{64}$/.test(asset.sha256) || !(asset.width > 0 && asset.height > 0)) throw new Error('기관 로고와 검수 원본이 맞지 않는다');
    if (images[0] !== logos[0] || flow[0]?.kind !== 'text' || flow[1]?.kind !== 'image') throw new Error('기관 로고는 첫 목록 링크 바로 다음에 있어야 한다');
  } else if (revision.logoAsset) throw new Error('원고에 없는 로고 자산을 삽입하지 않는다');
  const site = `https://feelandnote.com${revision.target}`;
  if (tables.length || revision.fullList) {
    const list = revision.fullList, table = tables[0];
    if (tables.length !== 1 || !list || typeof list.heading !== 'string' || !list.heading.trim() || typeof list.source_file !== 'string' || !list.source_file || !validFullListMatrix(list) || !same(table.rows, [list.columns, ...list.rows])) throw new Error('전체 목록 표와 준비된 목록 메타가 맞지 않는다');
    let headingLine = table.line - 1;
    while (headingLine >= 0 && !lines[headingLine].trim()) headingLine--;
    const at = flow.findIndex(item => item.kind === 'table');
    const dividerAt = flow.slice(0, at - 1).findLastIndex(item => item.kind === 'divider');
    const bridgeIsText = dividerAt >= 0 && flow.slice(dividerAt + 1, at - 1).every(item => item.kind === 'text');
    if (lines[headingLine]?.trim() !== `[c]**${list.heading}**[/c]` || text.filter(value => value === list.heading).length !== 1 || flow[at - 1]?.text !== list.heading || !bridgeIsText || flow.length - at !== 3 || flow[at + 1]?.kind !== 'text' || flow[at + 2]?.kind !== 'text') throw new Error('전체 목록 제목·표는 마지막 구분선 뒤, 서비스 안내문 바로 앞에 한 번만 둔다');
    table.headingLine = headingLine;
  }
  const closing = flow.findLastIndex(item => item.kind === 'text' && (item.text === site || item.text === `→ ${site}`));
  const reviewLinks = quotes.flatMap(quote => (quote.text.match(/https?:\/\/[^\s<>]+/g) ?? []).map(urlKey));
  const middleLinks = celeb ? quotes.flatMap((quote, i) => [
    ...(quote.text.match(/https?:\/\/[^\s<>]+/g) ?? []).map(urlKey),
    ...bookLinks.filter(link => link.reviewIndex === i).map(link => link.url),
  ]) : reviewLinks;
  if (!text[0]?.endsWith(site) || !same(links, [site, ...middleLinks, site]) || closing !== flow.length - 1 || closing <= flow.findLastIndex(item => item.kind === 'image' || item.kind === 'divider')) throw new Error('첫 줄·마무리·DB 원문 링크와 인물편의 해당 감상 뒤 책 상세 링크만 원래 순서대로 둔다');
  return { lines, images, covers, avatars, quotes, tables, operations, logo: logos[0] ?? null, text, links, flow, bookLinks };
}

export function tableBaseTarget(target) {
  const table = target.plan.tables[0];
  if (target.plan.tables.length !== 1 || target.title !== target.post.title) throw new Error('표 추가는 기존 제목과 하나의 전체 목록만 허용한다');
  const lines = target.plan.lines.filter((_, index) => index !== table.headingLine && (index < table.line || index > table.endLine));
  const revision = { ...target.revision, body: lines.join('\n'), fullList: undefined };
  const plan = parseRevisionBody(revision);
  const localPlan = parseRevisionBody({ ...revision, body: target.draft.body });
  if (!same(plan.flow, localPlan.flow) || !same(plan.images, localPlan.images.map((image, i) => ({ ...image, line: plan.images[i]?.line })))) throw new Error('소제목과 전체 표 외 기존 원고가 바뀌었다');
  return { ...target, revision, plan };
}

export function tableAuthorBaseTarget(target) {
  if (target.revision.kind !== 'curated' || target.plan.tables.length !== 1 || !target.draft || target.title !== target.post.title || target.draft.title !== target.title) throw new Error('작가 빈칸 채우기는 기존 제목과 기관 전체 목록 표 하나만 허용한다');
  const oldBody = target.draft.body.replace(/\r\n/g, '\n'), newBody = target.revision.body.replace(/\r\n/g, '\n');
  const blocks = body => [...body.matchAll(/^\[table\]\n([\s\S]*?)\n\[\/table\]$/gm)];
  const oldBlocks = blocks(oldBody), newBlocks = blocks(newBody);
  if (oldBlocks.length !== 1 || newBlocks.length !== 1 || oldBody.replace(oldBlocks[0][0], '[table]') !== newBody.replace(newBlocks[0][0], '[table]')) throw new Error('전체 목록 표 밖의 기존 본문·사진·서식이 바뀌었다');
  const oldRows = oldBlocks[0][1].split('\n').map(line => line.split('\t')), newRows = target.plan.tables[0].rows;
  const column = newRows[0].length - 1;
  if (!['저자', '작가'].includes(newRows[0][column]) || oldRows.length !== newRows.length || !same(oldRows[0], newRows[0]) || oldRows.some(row => row.length !== newRows[0].length)) throw new Error('작가 빈칸 채우기 전후 표의 행·열·머리글이 바뀌었다');
  const cells = [];
  for (let row = 1; row < oldRows.length; row++) {
    for (let col = 0; col < oldRows[row].length; col++) {
      if (oldRows[row][col] === newRows[row][col]) continue;
      if (col !== column || oldRows[row][col] !== '' || !newRows[row][col].trim()) throw new Error('기존 작가명·작품명 변경은 허용하지 않는다. 마지막 작가열의 빈칸만 채운다');
      cells.push({ row, column: col, text: newRows[row][col] });
    }
  }
  if (!cells.length) throw new Error('채울 작가 빈칸이 없다');
  const revision = { ...target.revision, body: oldBody, fullList: { ...target.revision.fullList, columns: oldRows[0], rows: oldRows.slice(1) } };
  return { base: { ...target, revision, plan: parseRevisionBody(revision) }, cells };
}

export function selectRevisionTargets(rows, posts, drafts, options) {
  if (options.manifestRows) {
    const manifest = options.manifestRows;
    if (!Array.isArray(rows) || !Array.isArray(manifest) || !manifest.length || rows.length !== manifest.length || new Set(manifest.map(row => String(row.logNo))).size !== manifest.length || !same(rows.map(row => String(row.logNo)).sort(), manifest.map(row => String(row.logNo)).sort())) throw new Error('실행 원고와 검수 목록의 글 번호가 정확히 일치하지 않는다');
    for (const entry of manifest) {
      const revision = rows.find(row => String(row.logNo) === String(entry.logNo));
      if (!/^\d+$/.test(String(entry.logNo)) || REVISION_IDS.includes(String(entry.logNo)) || !['curated', 'celeb'].includes(entry.kind) || revision.kind !== entry.kind || revision.target !== entry.target || !/^[a-f0-9]{64}$/.test(entry.source_revision_sha256 ?? '') || revision.source_revision_sha256 !== entry.source_revision_sha256) throw new Error(`검수 목록의 대상·유형·원본 해시가 다르거나 완료 18편이다: ${entry.logNo}`);
    }
    if (options.ids.some(id => !manifest.some(row => String(row.logNo) === id))) throw new Error('검수 목록에 없는 글 번호다');
  } else if (!Array.isArray(rows) || rows.length !== REVISION_IDS.length || !same(rows.map(row => String(row.logNo)).sort(), [...REVISION_IDS].sort())) throw new Error('실행 원고가 검수한 정확한 18편과 다르다');
  return options.ids.map(id => {
    const revision = rows.find(row => String(row.logNo) === id);
    const matches = posts.filter(post => String(post.logNo) === id), local = drafts.filter(draft => String(draft.logNo) === id);
    const allowMissingDraft = Boolean(options.manifestRows) && ['curated', 'celeb'].includes(revision.kind);
    if (matches.length !== 1 || local.length > 1 || (!local.length && !allowMissingDraft)) throw new Error(`원장에 대상 행이 없거나 중복이다: ${id}`);
    const post = matches[0], draft = local[0] ?? null;
    const postUrl = post.kind === 'celeb' && (post.url == null || post.url === '') && /^[a-z0-9][a-z0-9.-]*$/.test(post.slug ?? '')
      ? `https://feelandnote.com/celeb/${post.slug}` : post.url;
    const differentSlug = post.kind === 'celeb' && post.slug && `/celeb/${post.slug}` !== revision.target;
    if (post.kind !== (revision.kind ?? 'curated') || postUrl !== `https://feelandnote.com${revision.target}` || differentSlug || (draft && draft.target !== revision.target) || [post.link, post.status, draft?.link, draft?.status].some(value => excluded.has(value))) throw new Error(`검수 원고와 활성 글이 맞지 않는다: ${id}`);
    if (!draft && (!revision.draftSeed || String(revision.draftSeed.logNo) !== id || revision.draftSeed.target !== revision.target || revision.draftSeed.kind !== revision.kind)) throw new Error(`기존 글에 대응하는 초안 메타가 없다: ${id}`);
    if (options.manifestRows && draft?.revisionSha256 && !options.titleOnly && !options.fillTableAuthors) throw new Error(`이미 개편 저장·재열기를 마친 글이다. 다시 실행하지 않는다: ${id}`);
    const plan = parseRevisionBody(revision);
    const title = options.useRevisionTitle ? revision.title : post.title;
    const digest = hash({ title, body: revision.body, logoAsset: revision.logoAsset ?? null });
    if (options.titleOnly && (!draft?.rewrittenAt || draft.revisionSha256 !== digest || draft.body !== revision.body || draft.title !== post.title || title !== post.title)) throw new Error('제목 정렬만 수정하려면 본문·제목이 같은 개편 완료 원장이 있어야 한다');
    const target = { revision, post: structuredClone(post), draft: structuredClone(draft), title, plan, digest };
    if (options.fillTableAuthors) {
      if (!draft?.rewrittenAt || draft.revisionSha256 !== hash({ title: post.title, body: draft.body, logoAsset: revision.logoAsset ?? null })) throw new Error('작가 빈칸 채우기는 기존 저장·재열기 검증 원장이 필요하다');
      tableAuthorBaseTarget(target);
    }
    return target;
  });
}

export function checkRevisionSource(revision, { bindContent = false } = {}) {
  if (!revision.source_revision_file || !/^[a-f0-9]{64}$/.test(revision.source_revision_sha256 ?? '') || hash(fs.readFileSync(revision.source_revision_file)) !== revision.source_revision_sha256) throw new Error(`검수 원고가 실행 파일 준비 뒤 변경됐거나 원본 해시가 없다: ${revision.logNo}`);
  if (bindContent) {
    const source = JSON.parse(fs.readFileSync(revision.source_revision_file, 'utf8'));
    for (const key of ['logNo', 'kind', 'target', 'title', 'body', 'dbReviews', 'logoAsset', 'fullList', 'draftSeed']) {
      if (!same(source[key] ?? null, revision[key] ?? null)) throw new Error(`실행 원고의 ${key}가 검수 원본과 다르다: ${revision.logNo}`);
    }
  }
  if (revision.fullList) assertFullListSource(revision.fullList, JSON.parse(fs.readFileSync(revision.fullList.source_file, 'utf8')));
}

export function assertFullListSource(list, source) {
  if (!validFullListMatrix(list) || source?.count !== list.rows.length) throw new Error('전체 목록의 행 수가 준비된 원본과 다르다');
  if (source.columns !== undefined || source.rows !== undefined) {
    if (!same(list.columns, source.columns) || !same(list.rows, source.rows)) throw new Error('전체 목록의 열·값·순서가 준비된 원본과 다르다');
    if (source.items !== undefined && (!Array.isArray(source.items) || source.items.length !== source.count)) throw new Error('전체 목록 원본 항목 수가 다르다');
    return;
  }
  if (!same(list.columns, ['연도', '작품', '작가']) || !Array.isArray(source.items) || source.items.length !== source.count || !same(list.rows, source.items.map(item => [String(item.year), item.title, item.author]))) throw new Error('전체 목록이 준비된 원본 목록 값·순서와 다르다');
}

function validFullListMatrix(list) {
  return Array.isArray(list.columns) && [2, 3].includes(list.columns.length) && new Set(list.columns).size === list.columns.length
    && list.columns.every(column => typeof column === 'string' && column.trim() && column === column.trim() && !/[\t\r\n]/.test(column))
    && Array.isArray(list.rows) && list.rows.length > 0
    && list.rows.every(row => Array.isArray(row) && row.length === list.columns.length && row.some(Boolean) && row.every(cell => typeof cell === 'string' && cell === cell.trim() && !/[\t\r\n]/.test(cell)));
}

async function prepareImages(target, dir, cache = new Map()) {
  const prepared = [];
  const bodyImages = target.plan.images.filter(image => image.role !== 'logo');
  for (let index = 0; index < bodyImages.length; index++) {
    const image = bodyImages[index];
    if (!cache.has(image.url)) {
      const response = await fetch(image.url, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`사진 다운로드 실패 ${response.status}: ${image.name}`);
      const original = Buffer.from(await response.arrayBuffer()), metadata = await sharp(original).metadata();
      if (!['png', 'jpeg', 'webp'].includes(metadata.format) || !metadata.width || !metadata.height || metadata.pages > 1) throw new Error(`사진 형식·크기 오류: ${image.name}`);
      const bytes = metadata.format === 'webp' ? await sharp(original).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toBuffer() : original;
      cache.set(image.url, { original, metadata, bytes });
    }
    const { original, metadata, bytes } = cache.get(image.url);
    const marker = `revision-${target.post.logNo}-${index + 1}-${hash(bytes).slice(0, 12)}`;
    const name = image.name.replace(/[\\/:*?"<>|]/g, '').slice(0, 50);
    const file = path.join(dir, `${name}-${marker}.${metadata.format === 'png' ? 'png' : 'jpg'}`);
    fs.writeFileSync(file, bytes, { flag: 'wx' });
    if (hash(fs.readFileSync(file)) !== hash(bytes)) throw new Error('표지 업로드 복사본 해시가 다르다');
    prepared.push({ ...image, marker, file, sourceSha256: hash(original), uploadSha256: hash(bytes), widthOriginal: metadata.width, heightOriginal: metadata.height });
  }
  let logo = null;
  if (target.plan.logo) {
    const asset = target.revision.logoAsset, slug = target.revision.target.split('/')[3];
    const logoTarget = { post: target.post, curator: { slug, name: asset.name ?? target.plan.logo.name }, asset, marker: `institution-${slug}-${asset.sha256.slice(0, 12)}` };
    const file = await uploadFile(logoTarget, dir);
    logo = { target: logoTarget, file };
  }
  return { images: prepared, covers: prepared.filter(image => image.role === 'cover'), avatars: prepared.filter(image => image.role === 'avatar'), logo };
}

export function textComponentParagraphs(nodes) {
  return nodes.map(node => [...node.querySelectorAll('.se-text-paragraph')].map(paragraph => {
    const copy = paragraph.cloneNode(true);
    copy.querySelectorAll('.se-placeholder').forEach(placeholder => placeholder.remove());
    return copy.textContent.replace(/\u200b/g, '').trim();
  }).filter(Boolean));
}

async function readSnapshot(page, options) {
  const snapshot = await readImageSnapshot(page, options);
  // 빈 본문의 안내문도 DOM textContent에 들어온다. 표·인용구와 같은 방식으로 UI 안내문을 제외한다.
  const textComponents = await page.$$eval('.se-component.se-text:not(.se-documentTitle)', textComponentParagraphs);
  let textIndex = 0;
  snapshot.flow = snapshot.flow.map(component => component.kind === 'se-text' ? { ...component, paragraphs: textComponents[textIndex++] } : component);
  const quotes = await page.$$eval('.se-component.se-quotation', nodes => nodes.map(node => ({
    quoteStyle: node.classList.contains('se-l-quotation_line') ? 'quotation_line' : 'other',
    quoteAlign: node.querySelector('.se-section-align-left') ? 'left' : 'other',
    paragraphs: [...node.querySelectorAll('.se-text-paragraph')].map(paragraph => {
    const clone = paragraph.cloneNode(true); clone.querySelectorAll('.se-placeholder').forEach(placeholder => placeholder.remove());
    return clone.textContent.replace(/\u200b/g, '').trim();
  }).filter(Boolean) })));
  let index = 0;
  snapshot.flow = snapshot.flow.map(component => component.kind === 'se-quotation' ? { ...component, ...quotes[index++] } : component);
  const tables = await page.$$eval('.se-component.se-table', nodes => nodes.map(node => ({
    rows: [...node.querySelectorAll('tr')].map(row => [...row.querySelectorAll('th, td')].map(cell => [...cell.querySelectorAll('.se-text-paragraph')].map(paragraph => {
      const clone = paragraph.cloneNode(true); clone.querySelectorAll('.se-placeholder').forEach(placeholder => placeholder.remove());
      return clone.textContent.replace(/\u200b/g, '').trim();
    }).filter(Boolean).join('\n'))),
    merged: [...node.querySelectorAll('th, td')].some(cell => cell.rowSpan !== 1 || cell.colSpan !== 1),
  })));
  index = 0;
  snapshot.flow = snapshot.flow.map(component => component.kind === 'se-table' ? { ...component, ...tables[index++] } : component);
  snapshot.text = snapshot.flow.filter(component => component.kind === 'se-text' || component.kind === 'se-quotation').flatMap(component => component.paragraphs);
  return snapshot;
}

function flattenedFlow(snapshot) {
  const flow = []; let index = 0;
  for (const component of snapshot.flow ?? []) {
    if (component.kind === 'image') flow.push({ kind: 'image', index: index++ });
    else if (component.kind === 'se-horizontalLine') flow.push({ kind: 'divider' });
    else if (component.kind === 'se-text') flow.push(...component.paragraphs.map(text => ({ kind: 'text', text })));
    else if (component.kind === 'se-quotation') {
      if (component.quoteStyle !== 'quotation_line' || component.quoteAlign !== 'left') throw new Error('감상 인용구의 왼쪽 선 스타일 또는 왼쪽 정렬이 맞지 않는다');
      flow.push({ kind: 'quote', paragraphs: component.paragraphs });
    }
    else if (component.kind === 'se-table') {
      const columns = component.rows?.[0]?.length;
      if (component.merged !== false || ![2, 3].includes(columns) || !Array.isArray(component.rows) || component.rows.some(row => !Array.isArray(row) || row.length !== columns)) throw new Error('전체 목록 표의 셀 구조가 맞지 않는다');
      flow.push({ kind: 'table', rows: component.rows });
    }
    else if (component.kind === 'se-oglink' && component.paragraphs?.length === 0) continue;
    else throw new Error(`예상하지 못한 본문 컴포넌트: ${component.kind}`);
  }
  return flow;
}

function photoIdentity(image) {
  return { src: canonicalImageSource(image.src), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, width: image.width, height: image.height, align: image.align, caption: image.caption, componentKind: image.componentKind };
}

export function existingImageProof(target, snapshot) {
  return {
    framedCovers: snapshot.images.filter((_, i) => target.plan.images[i]?.role === 'cover'),
    unframedAvatars: snapshot.images.filter((_, i) => target.plan.images[i]?.role === 'avatar'),
    logoMarker: target.plan.logo ? `institution-${target.revision.target.split('/')[3]}-${target.revision.logoAsset.sha256.slice(0, 12)}` : null,
  };
}

export function assertTableOnlyChange(target, before, after) {
  const base = tableBaseTarget(target), proof = existingImageProof(target, before);
  assertRevisionSnapshot(base, before, proof);
  assertRevisionSnapshot(target, after, proof);
  const comparable = snapshot => ({ title: snapshot.title, links: snapshot.links, dividers: snapshot.dividers, images: snapshot.images.map(image => ({ ...photoIdentity(image), representative: image.representative })) });
  if (!same(comparable(before), comparable(after))) throw new Error('표 추가 중 기존 제목·링크·구분선·사진·대표사진이 바뀌었다');
  const at = target.plan.flow.findIndex(item => item.kind === 'table');
  const withoutAddition = flattenedFlow(after).filter((_, index) => index !== at && index !== at - 1);
  if (!same(flattenedFlow(before), withoutAddition)) throw new Error('전체 목록 소제목과 표 외 기존 본문 순서가 바뀌었다');
}

export function assertTableAuthorChange(target, before, after) {
  const { base } = tableAuthorBaseTarget(target), proof = existingImageProof(target, before);
  assertRevisionSnapshot(base, before, proof);
  assertRevisionSnapshot(target, after, proof);
  const comparable = snapshot => ({ title: snapshot.title, text: snapshot.text, links: snapshot.links, dividers: snapshot.dividers, images: snapshot.images.map(image => ({ ...photoIdentity(image), representative: image.representative })), flow: snapshot.flow.filter(component => component.kind !== 'se-table') });
  if (!same(comparable(before), comparable(after))) throw new Error('작가 빈칸을 채우면서 기존 제목·본문·사진·링크·구분선이 바뀌었다');
}

export function assertRevisionSnapshot(target, snapshot, { framedCovers = null, unframedAvatars = null, logoMarker = null } = {}) {
  if (snapshot.title !== target.title || !same(snapshot.text, target.plan.text) || !same(snapshot.links.map(link => urlKey(link.href)), target.plan.links) || !same(flattenedFlow(snapshot), target.plan.flow)) throw new Error('수정 원고의 제목·본문·링크·사진·구분선 순서가 맞지 않는다');
  if (snapshot.images.length !== target.plan.images.length || snapshot.images.some(image => image.componentKind !== 'image' || !/^https?:\/\//.test(image.src) || !(image.naturalWidth > 0 && image.naturalHeight > 0) || image.align !== 'se-section-align-center')) throw new Error('수정 원고의 사진 개수·원본 로딩·가운데 정렬이 맞지 않는다');
  if (snapshot.images.filter(image => image.representative).length !== 1 || !snapshot.images[0]?.representative) throw new Error('첫 인물 사진·로고 또는 첫 표지 한 장이 대표사진이어야 한다');
  const covers = snapshot.images.filter((_, i) => target.plan.images[i].role === 'cover');
  if (framedCovers && !same(covers.map(photoIdentity), framedCovers.map(photoIdentity))) throw new Error('5번 액자를 적용한 표지의 원본·크기·순서가 달라졌다');
  const avatars = snapshot.images.filter((_, i) => target.plan.images[i].role === 'avatar');
  if (avatars.length) {
    if (!unframedAvatars || !same(avatars.map(photoIdentity), unframedAvatars.map(photoIdentity))) throw new Error('인물 사진 원본·크기·순서가 바뀌었거나 액자가 적용됐다');
    for (const avatar of avatars) {
      if (!Number.isFinite(avatar.displayWidth) || Math.abs(avatar.displayWidth - AVATAR_WIDTH) > 1 || !(avatar.displayHeight > 0) || Math.abs(avatar.displayHeight - AVATAR_WIDTH * avatar.naturalHeight / avatar.naturalWidth) > 1) throw new Error(`인물 사진의 ${AVATAR_WIDTH}px 표시 크기 또는 비율이 맞지 않는다`);
    }
  }
  if (target.plan.logo) {
    if (!logoMarker || !snapshot.images[0].src.includes(logoMarker)) throw new Error('사용자 제공 기관 로고가 첫 사진이 아니다');
    assertLogoGeometry(snapshot.images[0], target.revision.logoAsset);
  }
  return snapshot;
}

export function assertFramesApplied(before, after, coverIds = before.images.map(image => image.id)) {
  if (!same({ title: before.title, text: before.text, links: before.links, dividers: before.dividers }, { title: after.title, text: after.text, links: after.links, dividers: after.dividers }) || !same(flattenedFlow(before), flattenedFlow(after)) || before.images.length !== after.images.length) throw new Error('액자를 적용하면서 본문이나 사진 순서가 달라졌다');
  for (let i = 0; i < before.images.length; i++) {
    const original = before.images[i], framed = after.images[i];
    if (!coverIds.includes(original.id)) {
      if (original.id !== framed.id || !same(photoIdentity(original), photoIdentity(framed))) throw new Error('선택하지 않은 인물 사진에 액자 또는 다른 변경이 적용됐다');
      continue;
    }
    if (original.id !== framed.id || framed.naturalWidth !== original.naturalWidth + 40 || framed.naturalHeight !== original.naturalHeight + 40 || framed.componentKind !== 'image' || framed.align !== 'se-section-align-center') throw new Error(`표지 ${i + 1}의 5번 액자 1회 적용 크기가 맞지 않는다`);
  }
}

export function assertReservationPreserved(before, after, title) {
  if (!before || !after) { if (before !== after) throw new Error('발행 글과 예약 글 상태가 바뀌었다'); return; }
  const lastBreak = before.row.lastIndexOf('\n');
  const expected = { ...before, row: `${title}\n${before.row.slice(lastBreak + 1)}` };
  if (!same(expected, after)) throw new Error('예약 목록의 제목 외 날짜·시각·건수가 달라졌다');
}

async function clearBody(page, title) {
  const first = await page.$('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph');
  if (!first) throw new Error('기존 본문 첫 단락이 없다');
  await first.evaluate(p => p.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await first.click(); await first.dispose(); await wait(250);
  // 네이버 전체 선택은 내부 상태라 DOM Selection이 빈 채다. 실제 입력 후 완전히 비워졌는지 검사한다.
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await wait(250); await page.keyboard.press('Backspace'); await wait(700);
  const result = await page.evaluate(() => {
    const value = element => { const copy = element.cloneNode(true); copy.querySelectorAll('.se-placeholder').forEach(node => node.remove()); return copy.textContent.replace(/\u200b/g, '').trim(); };
    return { title: value(document.querySelector('.se-documentTitle .se-text-paragraph')), components: [...document.querySelectorAll('.se-component:not(.se-documentTitle)')].map(c => ({ text: [...c.querySelectorAll('.se-text-paragraph')].map(value).filter(Boolean), textOnly: c.classList.contains('se-text') })) };
  });
  if (result.title !== title || result.components.length !== 1 || !result.components[0].textOnly || result.components[0].text.length) throw new Error('본문 전체 선택 삭제 뒤 제목 보존·본문 완전 비움을 확인하지 못했다');
}

async function replaceTitle(page, before, after) {
  if (before === after) return;
  const original = await readSnapshot(page);
  const field = await page.$('.se-documentTitle .se-text-paragraph');
  await field.evaluate(p => p.scrollIntoView({ block: 'center', behavior: 'instant' })); await field.click(); await field.dispose();
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.press('Backspace'); await wait(300);
  const cleared = await page.$eval('.se-documentTitle .se-text-paragraph', p => { const copy = p.cloneNode(true); copy.querySelectorAll('.se-placeholder').forEach(node => node.remove()); return copy.textContent.replace(/\u200b/g, '').trim(); });
  if (cleared) throw new Error('제목 칸이 비워지지 않았다');
  await typeTitle(page, after);
  const actual = await readSnapshot(page);
  if (!same({ ...original, title: after }, actual)) throw new Error('제목 수정 중 본문·사진이 바뀌었다');
}

export async function assertCenteredTitle(page) {
  const centered = await page.$$eval('.se-documentTitle .se-text-paragraph', nodes => nodes.length > 0 && nodes.every(node => getComputedStyle(node).textAlign === 'center'));
  if (!centered) throw new Error('게시글 제목의 중앙 정렬이 유지되지 않았다');
}

export async function assertParagraphAlignment(page, target) {
  const expected = target.plan.operations.flatMap(operation => operation.kind === 'quote' ? operation.paragraphs.map(text => ({ text, align: 'left' }))
    : operation.kind === 'text' && operation.line.trim() ? [{ text: strip(operation.line.trim()), align: operation.line.trim().startsWith('[c]') ? 'center' : 'left' }] : []);
  const actual = await page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph, .se-component.se-quotation .se-text-paragraph', nodes => nodes.map(node => {
    const clone = node.cloneNode(true); clone.querySelectorAll('.se-placeholder').forEach(placeholder => placeholder.remove());
    return { text: clone.textContent.replace(/\u200b/g, '').trim(), align: getComputedStyle(node).textAlign };
  }).filter(node => node.text));
  if (!same(actual, expected)) throw new Error('책 제목 중앙 정렬 또는 본문 왼쪽 정렬이 원고와 다르다');
}

export async function assertCenteredDividers(page) {
  const wrong = await page.$$eval('.se-component.se-horizontalLine', nodes => nodes.filter(node => !node.querySelector('.se-section-align-center')).map(node => node.id));
  if (wrong.length) throw new Error(`수평선 중앙 정렬이 유지되지 않았다: ${wrong.join(', ')}`);
}

export async function centerDividers(page) {
  const before = await readSnapshot(page);
  const ids = await page.$$eval('.se-component.se-horizontalLine', nodes => nodes.map(node => node.id));
  for (const id of ids) {
    const point = await page.$eval(`[id="${id}"]`, node => {
      if (node.querySelector('.se-section-align-center')) return null;
      node.scrollIntoView({ block: 'center', behavior: 'instant' });
      const rect = node.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    if (!point) continue;
    await page.mouse.click(point.x, point.y); await wait(250);
    const button = await page.$eval('.se-property-toolbar-group-toggle-button.se-align-center-toolbar-button', node => {
      const rect = node.getBoundingClientRect();
      if (!node.offsetParent || !rect.width || !rect.height) throw new Error('수평선 가운데 정렬 버튼이 보이지 않는다');
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    await page.mouse.click(button.x, button.y); await wait(250);
  }
  await assertCenteredDividers(page);
  if (!same(before, await readSnapshot(page))) throw new Error('수평선 정렬 중 본문 또는 사진이 바뀌었다');
}

export function assertDbReviews(target, snapshot) {
  if (!Array.isArray(target.revision.dbReviews)) throw new Error('현재 DB 감상 원문 대조 자료가 없다');
  for (const row of target.revision.dbReviews) {
    if (!row.review_id || !row.content_id || !row.celeb_id || !row.review?.trim()) throw new Error('DB 감상 원문 또는 관계 ID가 없다');
    const lines = row.review.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim()).map(line => line.trim());
    const matches = snapshot.text.filter((_, index) => same(snapshot.text.slice(index, index + lines.length), lines)).length;
    if (matches !== 1) throw new Error(`DB 감상 원문과 본문이 다르거나 중복이다: ${row.review_id}`);
  }
}

async function captureFirstPerson(page, target, file) {
  const first = target.revision.dbReviews?.find(row => row.avatar_url);
  if (!first) return;
  await page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph', (nodes, label) => {
    const name = nodes.find(node => node.textContent.replace(/\u200b/g, '').trim() === label);
    if (!name) throw new Error('캡처할 인물 이름이 없다');
    name.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, first.person_label);
  await page.mouse.wheel({ deltaY: -240 }); await wait(300); await page.screenshot({ path: file });
}

export async function centerTitle(page) {
  const snapshot = await readSnapshot(page);
  const bodyAlign = () => page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph', nodes => nodes.map(node => getComputedStyle(node).textAlign));
  const beforeAlign = await bodyAlign();
  const field = await page.$('.se-documentTitle .se-text-paragraph');
  if (!field) throw new Error('중앙 정렬할 게시글 제목을 찾지 못했다');
  await field.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await wait(250); await field.click(); await field.dispose(); await wait(250);
  const centered = await page.$$eval('.se-documentTitle .se-text-paragraph', nodes => nodes.every(node => getComputedStyle(node).textAlign === 'center'));
  if (!centered) {
    const menu = await page.$('.se-toolbar-item-align .se-property-toolbar-drop-down-button');
    if (!menu) throw new Error('제목 정렬 메뉴를 찾지 못했다');
    await menu.click(); await menu.dispose(); await wait(350);
    const point = await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find(node => node.offsetParent && (node.textContent || '').trim().startsWith('가운데 정렬'));
      if (!button) return null;
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    if (!point) throw new Error('제목 가운데 정렬 항목을 찾지 못했다');
    await page.mouse.click(point.x, point.y); await wait(400);
  }
  await assertCenteredTitle(page);
  if (!same(snapshot, await readSnapshot(page)) || !same(beforeAlign, await bodyAlign())) throw new Error('제목 중앙 정렬 중 본문·사진·본문 정렬이 바뀌었다');
}

export function synchronizedRows(target, drafts, posts, now) {
  const local = drafts.filter(d => String(d.logNo) === String(target.post.logNo)), published = posts.filter(p => String(p.logNo) === String(target.post.logNo));
  if (local.length !== (target.draft ? 1 : 0) || published.length !== 1 || !same(local[0] ?? null, target.draft) || !same(published[0], target.post)) throw new Error('작업 도중 대상 원장 행이 바뀌었다. 덮어쓰지 않는다');
  const draft = { ...(local[0] ?? target.revision.draftSeed), title: target.title, body: target.revision.body, framed: true, rewrittenAt: now, revisionSha256: target.digest };
  const post = { ...published[0], title: target.title };
  return { drafts: target.draft ? drafts.map(d => d === local[0] ? draft : d) : [...drafts, draft], posts: posts.map(p => p === published[0] ? post : p) };
}

function recordVerified(target, dir, draftsFile) {
  const postsFile = path.join(ROOT, 'posts.json');
  const draftBytes = fs.readFileSync(draftsFile), postBytes = fs.readFileSync(postsFile);
  const updated = synchronizedRows(target, JSON.parse(draftBytes), JSON.parse(postBytes), new Date().toISOString());
  fs.writeFileSync(path.join(dir, `drafts-before-${target.post.logNo}.json`), draftBytes, { flag: 'wx' });
  fs.writeFileSync(path.join(dir, `posts-before-${target.post.logNo}.json`), postBytes, { flag: 'wx' });
  if (hash(fs.readFileSync(draftsFile)) !== hash(draftBytes) || hash(fs.readFileSync(postsFile)) !== hash(postBytes)) throw new Error('원장 기록 직전 다른 작업의 변경을 발견했다');
  fs.writeFileSync(draftsFile, JSON.stringify(updated.drafts, null, 2) + '\n');
  fs.writeFileSync(postsFile, JSON.stringify(updated.posts, null, 2) + '\n');
}

export function fullListHtml(list, { includeHeading = true } = {}) {
  if (!validFullListMatrix(list)) throw new Error('전체 목록 HTML의 열·행 구조가 맞지 않는다');
  const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const widths = list.columns.length === 3 ? ['22%', '54%', '24%'] : ['72%', '28%'];
  const rows = [list.columns, ...list.rows].map((row, index) => '<tr>' + row.map((cell, column) => `<td style="border:1px solid #ccc;padding:8px;width:${widths[column]};${index === 0 ? 'background-color:#eeeeee;' : ''}">${index === 0 ? '<strong>' : ''}${escape(cell)}${index === 0 ? '</strong>' : ''}</td>`).join('') + '</tr>').join('');
  const html = `${includeHeading ? `<h3 style="text-align:center"><strong>${escape(list.heading)}</strong></h3>` : ''}<table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table><p></p>`;
  // Windows Forms의 CF_HTML 문자열 경로에서 한글이 CP949로 바뀌지 않게 ASCII만 전달한다.
  return [...html].map(character => character.codePointAt(0) > 127 ? `&#${character.codePointAt(0)};` : character).join('');
}

function setHtmlClipboard(html, htmlFile, dir) {
  const psFile = path.join(dir, 'set-full-list-clipboard.ps1');
  fs.writeFileSync(htmlFile, html, { flag: 'wx' });
  if (!fs.existsSync(psFile)) fs.writeFileSync(psFile, String.raw`param([string]$HtmlFile)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$fragment = [System.IO.File]::ReadAllText($HtmlFile, [System.Text.Encoding]::UTF8)
$before = '<html><body><!--StartFragment-->'
$after = '<!--EndFragment--></body></html>'
$format = "Version:0.9\r\nStartHTML:{0:D10}\r\nEndHTML:{1:D10}\r\nStartFragment:{2:D10}\r\nEndFragment:{3:D10}\r\n".Replace('\r', [string][char]13).Replace('\n', [string][char]10)
$placeholder = $format -f 0,0,0,0
$startHtml = [System.Text.Encoding]::UTF8.GetByteCount($placeholder)
$startFragment = $startHtml + [System.Text.Encoding]::UTF8.GetByteCount($before)
$endFragment = $startFragment + [System.Text.Encoding]::UTF8.GetByteCount($fragment)
$endHtml = $endFragment + [System.Text.Encoding]::UTF8.GetByteCount($after)
$payload = ($format -f $startHtml,$endHtml,$startFragment,$endFragment) + $before + $fragment + $after
$clipData = New-Object System.Windows.Forms.DataObject
$clipData.SetData([System.Windows.Forms.DataFormats]::Html, $payload)
[System.Windows.Forms.Clipboard]::SetDataObject($clipData, $true)
`, { flag: 'wx' });
  const clipboard = spawnSync('powershell.exe', ['-NoProfile', '-STA', '-File', psFile, '-HtmlFile', htmlFile], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
  if (clipboard.error || clipboard.status !== 0) throw new Error(`HTML 클립보드 준비 실패: ${clipboard.error?.message ?? clipboard.stderr}`);
}

export function needsExplicitServiceLink(line, target) {
  return target.endsWith('.') && strip(line.trim()).endsWith(`https://feelandnote.com${target}`);
}

export function explicitServiceLinkHtml(line, site) {
  const text = strip(line.trim()), pieces = text.split(site);
  if (new URL(site).origin !== 'https://feelandnote.com' || pieces.length !== 2 || pieces[1] !== '' || /https?:\/\//.test(pieces[0]) || line.includes('**')) throw new Error('명시 링크 입력은 정확한 서비스 URL 하나와 일반 안내문만 허용한다');
  const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = `<p style="text-align:${line.trim().startsWith('[c]') ? 'center' : 'left'}"><span>${escape(pieces[0])}</span><a href="${escape(site)}">${escape(site)}</a></p>`;
  return [...html].map(character => character.codePointAt(0) > 127 ? `&#${character.codePointAt(0)};` : character).join('');
}

export function assertExplicitServiceLinkChange(before, after, text, site) {
  const checks = {
    title: before.title === after.title,
    text: same(after.text, [...before.text, text]),
    links: same(after.links.map(link => ({ text: link.text, href: urlKey(link.href) })), [...before.links.map(link => ({ text: link.text, href: urlKey(link.href) })), { text: site, href: site }]),
    images: same(after.images.map(photoIdentity), before.images.map(photoIdentity)),
    flow: same(flattenedFlow(after), [...flattenedFlow(before), { kind: 'text', text }]),
  };
  const wrong = Object.keys(checks).filter(key => !checks[key]);
  if (wrong.length) throw new Error(`명시 링크 입력 뒤 기존 본문·사진·순서가 바뀌거나 URL 표시·실제 주소가 다르다: ${wrong.join(', ')}`);
}

async function insertExplicitServiceLink(page, target, operation, dir) {
  const site = `https://feelandnote.com${target.revision.target}`, text = strip(operation.line.trim());
  const before = await readSnapshot(page);
  fs.writeFileSync(path.join(dir, `explicit-link-before-${target.post.logNo}-${operation.lineIndex}.json`), JSON.stringify(before, null, 2), { flag: 'wx' });
  setHtmlClipboard(explicitServiceLinkHtml(operation.line, site), path.join(dir, `service-link-${target.post.logNo}-${operation.lineIndex}.html`), dir);
  await page.keyboard.down('Control'); await page.keyboard.press('KeyV'); await page.keyboard.up('Control');
  await page.waitForFunction(({ site, count }) => [...document.querySelectorAll('.se-component:not(.se-documentTitle) a[href], .se-component:not(.se-documentTitle) .se-link[data-href]')].filter(link => (link.getAttribute('href') ?? link.getAttribute('data-href')) === site && link.textContent.replace(/\u200b/g, '').trim() === site).length === count,
    { timeout: 10000 }, { site, count: before.links.filter(link => link.href === site).length + 1 });
  await page.keyboard.press('Enter'); await wait(500);
  const after = await readSnapshot(page);
  fs.writeFileSync(path.join(dir, `explicit-link-after-${target.post.logNo}-${operation.lineIndex}.json`), JSON.stringify(after, null, 2), { flag: 'wx' });
  assertExplicitServiceLinkChange(before, after, text, site);
}

async function insertFullListTable(page, target, dir, { atEnd = false } = {}) {
  const htmlFile = path.join(dir, `full-list-${target.post.logNo}.html`);
  setHtmlClipboard(fullListHtml(target.revision.fullList, { includeHeading: !atEnd }), htmlFile, dir);
  if (!atEnd) {
  const tableAt = target.plan.flow.findIndex(item => item.kind === 'table'), closingText = target.plan.flow[tableAt + 1].text;
  const point = await page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph', (nodes, expected) => {
    const matches = nodes.filter(node => node.textContent.replace(/\u200b/g, '').trim() === expected);
    if (matches.length !== 1) return null;
    const paragraph = matches[0]; paragraph.scrollIntoView({ block: 'center', behavior: 'instant' });
    const rect = paragraph.getBoundingClientRect();
    return { x: rect.left + 2, y: rect.top + 8 };
  }, closingText);
  if (!point) throw new Error('전체 목록 뒤에 올 기존 서비스 안내 문단을 유일하게 찾지 못했다');
  await page.mouse.click(point.x, point.y); await page.keyboard.press('Home');
  }
  const beforeCount = await page.$$eval('.se-component.se-table', nodes => nodes.length);
  if (beforeCount !== 0) throw new Error('기존 표가 있으므로 전체 목록을 중복 삽입하지 않는다');
  await page.keyboard.down('Control'); await page.keyboard.press('KeyV'); await page.keyboard.up('Control');
  await page.waitForFunction(count => document.querySelectorAll('.se-component.se-table').length === 1 && document.querySelectorAll('.se-component.se-table tr').length === count, { timeout: 15000 }, target.revision.fullList.rows.length + 1);
  await wait(500);
  if (atEnd) await leaveFullListTable(page);
}

export async function fillTableAuthors(page, target, log = () => {}) {
  const { base, cells } = tableAuthorBaseTarget(target), expected = structuredClone(base.plan.tables[0].rows);
  const tableRows = () => page.$$eval('.se-component.se-table', tables => {
    if (tables.length !== 1) throw new Error('작가 빈칸을 채울 표가 유일하지 않다');
    const text = node => {
      const copy = node.cloneNode(true); copy.querySelectorAll('.se-placeholder').forEach(placeholder => placeholder.remove());
      return copy.textContent.replace(/\u200b/g, '').trim();
    };
    return [...tables[0].querySelectorAll('tr')].map(row => [...row.cells].map(cell => [...cell.querySelectorAll('.se-text-paragraph')].map(text).filter(Boolean).join('\n')));
  });
  if (!same(await tableRows(), expected)) throw new Error('작가 입력 직전 공개 편집기의 표가 기존 원장과 다르다');
  for (const [index, cell] of cells.entries()) {
    const point = await page.evaluate(({ row, column }) => {
      const table = document.querySelector('.se-component.se-table'), tr = table?.querySelectorAll('tr')[row], td = tr?.cells[column];
      const paragraphs = td?.querySelectorAll('.se-text-paragraph');
      if (!td || td.rowSpan !== 1 || td.colSpan !== 1 || paragraphs?.length !== 1) throw new Error('빈 작가 셀의 구조가 바뀌었다');
      const paragraph = paragraphs[0], clone = paragraph.cloneNode(true);
      clone.querySelectorAll('.se-placeholder').forEach(placeholder => placeholder.remove());
      if (clone.textContent.replace(/\u200b/g, '').trim()) throw new Error('입력할 작가 셀이 이미 채워져 있다');
      paragraph.scrollIntoView({ block: 'center', behavior: 'instant' });
      const rect = paragraph.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) throw new Error('빈 작가 셀이 화면에 보이지 않는다');
      return { x: rect.left + Math.min(8, rect.width / 2), y: rect.top + rect.height / 2 };
    }, cell);
    await page.mouse.click(point.x, point.y);
    // Puppeteer의 sendCharacter는 브라우저 Input.insertText 입력 이벤트를 사용한다.
    for (let offset = 0; offset < cell.text.length; offset += 30) {
      await page.keyboard.sendCharacter(cell.text.slice(offset, offset + 30)); await wait(100);
    }
    await page.waitForFunction(({ row, column, text }) => {
      const cell = document.querySelector('.se-component.se-table')?.querySelectorAll('tr')[row]?.cells[column];
      if (!cell) return false;
      const paragraphs = [...cell.querySelectorAll('.se-text-paragraph')].map(paragraph => {
        const copy = paragraph.cloneNode(true); copy.querySelectorAll('.se-placeholder').forEach(placeholder => placeholder.remove());
        return copy.textContent.replace(/\u200b/g, '').trim();
      }).filter(Boolean);
      return paragraphs.length === 1 && paragraphs[0] === text;
    }, { timeout: 5000 }, cell);
    expected[cell.row][cell.column] = cell.text;
    if (!same(await tableRows(), expected)) throw new Error(`작가 ${index + 1}칸 입력 뒤 다른 셀 값 또는 표 순서가 바뀌었다`);
    log({ logNo: target.post.logNo, stage: 'fill-table-author', completed: index + 1, total: cells.length, row: cell.row, author: cell.text });
  }
}

async function leaveFullListTable(page) {
  const tableId = await page.$eval('.se-component.se-table', node => node.id);
  const followingParagraph = () => page.evaluate(id => {
    const table = document.getElementById(id);
    if (!table) return null;
    for (const node of document.querySelectorAll('.se-component.se-text:not(.se-documentTitle)')) {
      if (!(table.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      for (const paragraph of node.querySelectorAll('.se-text-paragraph')) {
        const clone = paragraph.cloneNode(true); clone.querySelectorAll('.se-placeholder').forEach(placeholder => placeholder.remove());
        if (clone.textContent.replace(/\u200b/g, '').trim()) continue;
        paragraph.scrollIntoView({ block: 'center', behavior: 'instant' });
        const rect = paragraph.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return { x: rect.left + 2, y: rect.top + Math.min(8, rect.height / 2), componentId: node.id };
      }
    }
    return null;
  }, tableId);
  let paragraphPoint = await followingParagraph();
  if (!paragraphPoint) {
  const point = await page.evaluate(() => {
    const button = document.querySelector('.se-canvas-bottom-button');
    if (!button) return null;
    button.scrollIntoView({ block: 'center', behavior: 'instant' });
    const rect = button.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
  });
  if (!point) throw new Error('전체 목록 표 뒤 본문 추가 버튼을 찾지 못했다');
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(id => {
    const table = document.getElementById(id);
    return table && [...document.querySelectorAll('.se-component.se-text:not(.se-documentTitle)')].some(node => {
      if (!(table.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
      return [...node.querySelectorAll('.se-text-paragraph')].some(paragraph => {
        const clone = paragraph.cloneNode(true); clone.querySelectorAll('.se-placeholder').forEach(placeholder => placeholder.remove());
        return !clone.textContent.replace(/\u200b/g, '').trim();
      });
    });
  }, { timeout: 10000 }, tableId);
  paragraphPoint = await followingParagraph();
  }
  if (!paragraphPoint) throw new Error('전체 목록 표 뒤의 빈 일반 문단을 확인하지 못했다');
  await page.mouse.click(paragraphPoint.x, paragraphPoint.y);
}

async function captureFullList(page, target, dir, stage) {
  if (!target.plan.tables.length) return;
  for (const [name, index] of [['top', 0], ['bottom', target.revision.fullList.rows.length]]) {
    await page.$$eval('.se-component.se-table tr', (rows, at) => rows[at]?.scrollIntoView({ block: 'center', behavior: 'instant' }), index);
    await wait(200);
    await page.screenshot({ path: path.join(dir, `${stage}-table-${name}-${target.post.logNo}.png`) });
  }
}

export async function main(args = process.argv.slice(2)) {
  const options = parseRevisionOptions(args);
  if (options.manifest) options.manifestRows = JSON.parse(fs.readFileSync(options.manifest, 'utf8'));
  const input = fs.statSync(options.revisions).isDirectory() ? fs.readdirSync(options.revisions).filter(file => /^\d+\.json$/.test(file)).map(file => JSON.parse(fs.readFileSync(path.join(options.revisions, file), 'utf8'))) : JSON.parse(fs.readFileSync(options.revisions, 'utf8'));
  const targets = selectRevisionTargets(input, JSON.parse(fs.readFileSync(path.join(ROOT, 'posts.json'), 'utf8')), JSON.parse(fs.readFileSync(options.drafts, 'utf8')), options);
  const sourceOptions = { bindContent: Boolean(options.manifest) }, imageCache = new Map();
  const dir = path.join(os.tmpdir(), `naver-revisions-${Date.now()}`); fs.mkdirSync(dir);
  const report = path.join(dir, 'results.jsonl');
  const log = row => { fs.appendFileSync(report, JSON.stringify(row) + '\n'); console.log(JSON.stringify(row)); };
  for (const target of targets) {
    checkRevisionSource(target.revision, sourceOptions);
    if (options.tableOnly) tableBaseTarget(target);
    else if (options.fillTableAuthors) tableAuthorBaseTarget(target);
    else if (!options.titleOnly) {
      target.prepared = await prepareImages(target, dir, imageCache);
    }
    fs.writeFileSync(path.join(dir, `prepared-${target.post.logNo}.json`), JSON.stringify(target, null, 2));
  }
  if (options.prepareOnly) { log({ result: 'prepared', browserOpened: false, targets: targets.length, report }); return; }
  const { getBrowser } = await import('./lib/browser.mjs');
  const { browser, launched } = await getBrowser({ protocolTimeout: 60000 });
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 1000 });
  let step = '', current = '', saved = false;
  const editor = createExistingEditor(page, { onStep: value => { step = value; } });
  page.on('dialog', dialog => { if (dialog.type() === 'beforeunload') dialog.accept().catch(() => {}); else { log({ dialog: dialog.message() }); dialog.dismiss().catch(() => {}); } });
  try {
    for (const target of targets) {
      current = target.post.logNo; saved = false; checkRevisionSource(target.revision, sourceOptions);
      await page.bringToFront();
      const original = await editor.openTarget({ ...target.post, body: undefined });
      await assertPublishOptions(page); await closePublishPanel(page, editor);
      const before = await readSnapshot(page);
      fs.writeFileSync(path.join(dir, `before-${current}.json`), JSON.stringify({ original, snapshot: before }, null, 2));
      let coverIds, representative, proof;
      if (options.fillTableAuthors) {
        const { base } = tableAuthorBaseTarget(target);
        proof = existingImageProof(target, before);
        assertRevisionSnapshot(base, before, proof);
        await assertParagraphAlignment(page, base); await assertCenteredDividers(page); assertDbReviews(base, before);
        await assertCenteredTitle(page);
        coverIds = proof.framedCovers.map(image => image.id); representative = before.images[0].id;
        step = 'fill-table-authors'; await fillTableAuthors(page, target, log);
      } else if (options.titleOnly) {
        proof = existingImageProof(target, before);
        assertRevisionSnapshot(target, before, proof);
        await assertParagraphAlignment(page, target); await assertCenteredDividers(page); assertDbReviews(target, before);
        coverIds = proof.framedCovers.map(image => image.id); representative = before.images[0].id;
      } else if (options.tableOnly) {
        const base = tableBaseTarget(target);
        proof = existingImageProof(target, before);
        assertRevisionSnapshot(base, before, proof);
        await assertParagraphAlignment(page, base); await assertCenteredDividers(page); assertDbReviews(base, before);
        coverIds = proof.framedCovers.map(image => image.id); representative = before.images[0].id;
        step = 'insert-full-list-table'; await insertFullListTable(page, target, dir);
      } else {
      step = 'revision-title'; await replaceTitle(page, target.post.title, target.title);
      step = 'clear-existing-body'; await clearBody(page, target.title);
      const cdp = await page.createCDPSession();
      try {
        await cdp.send('DOM.enable'); await cdp.send('Page.enable');
        cdp.on('Page.fileChooserOpened', event => { cdp.__chooser = event; });
        await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
        step = 'write-revision';
        let imageIndex = 0, coverIndex = 0;
        for (const operation of target.plan.operations) {
          step = `write-revision-line-${operation.lineIndex + 1}`;
          if (operation.kind === 'divider') await insertDivider(page);
          else if (operation.kind === 'quote') await insertQuote(page, operation.text);
          else if (operation.kind === 'table') await insertFullListTable(page, target, dir, { atEnd: true });
          else if (operation.kind === 'image') {
            if (operation.image.role === 'logo') continue;
            const image = target.prepared.images[imageIndex++];
            if (image.role === 'cover') coverIndex++;
            log({ logNo: current, stage: image.role === 'avatar' ? 'insert-person-avatar' : 'insert-book-cover', book: coverIndex, totalBooks: target.prepared.covers.length, name: image.name });
            await insertImage(page, cdp, image.url, image.width, image.name, { file: image.file });
          } else if (needsExplicitServiceLink(operation.line, target.revision.target)) await insertExplicitServiceLink(page, target, operation, dir);
          else await typeLine(page, operation.line);
        }
      } finally {
        await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(() => {}); await cdp.detach().catch(() => {});
      }
      step = 'verify-unframed-images';
      const unframed = await readSnapshot(page);
      if (!same(unframed.text, target.plan.text) || !same(unframed.links.map(link => urlKey(link.href)), target.plan.links) || unframed.images.length !== target.prepared.images.length || unframed.images.some((image, i) => !image.src.includes(target.prepared.images[i].marker))) throw new Error('액자 적용 전 본문·링크·원본 사진 순서가 맞지 않는다');
      fs.writeFileSync(path.join(dir, `unframed-${current}.json`), JSON.stringify(unframed, null, 2));
      log({ logNo: current, stage: 'body-entered', books: target.plan.covers.length, avatars: target.plan.avatars.length });
      step = 'center-dividers'; await centerDividers(page);
      step = 'frame-covers-once';
      coverIds = unframed.images.filter((_, i) => target.prepared.images[i].role === 'cover').map(image => image.id);
      if (!(await applyPhotoFrame(page, 5, target.plan.avatars.length ? { imageIds: coverIds } : {}))) throw new Error('표지에 액자 5번을 적용하지 못했다');
      await editor.imageSizes(unframed.images.length, unframed.images.map(image => [image.naturalWidth + (coverIds.includes(image.id) ? 40 : 0), image.naturalHeight + (coverIds.includes(image.id) ? 40 : 0)]));
      const framed = await readSnapshot(page); assertFramesApplied(unframed, framed, coverIds);
      fs.writeFileSync(path.join(dir, `framed-${current}.json`), JSON.stringify(framed, null, 2));
      step = 'representative-image';
      representative = framed.images[0].id;
      if (target.prepared.logo) representative = await insertLogo(page, target.prepared.logo.target, target.prepared.logo.file, framed.images.map(image => image.id));
      await setRepresentative(page, representative);
      proof = { framedCovers: framed.images.filter(image => coverIds.includes(image.id)), unframedAvatars: unframed.images.filter(image => !coverIds.includes(image.id)), logoMarker: target.prepared.logo?.target.marker ?? null };
      }
      if (!options.fillTableAuthors) { step = 'center-post-title'; await centerTitle(page); }
      step = 'verify-revision';
      const ready = await readSnapshot(page);
      fs.writeFileSync(path.join(dir, `ready-${current}.json`), JSON.stringify({ snapshot: ready, proof, revisionSha256: target.digest }, null, 2));
      assertRevisionSnapshot(target, ready, proof);
      await assertCenteredTitle(page);
      if (options.titleOnly && !same(before, ready)) throw new Error('제목 정렬 중 기존 본문·사진·링크·표가 바뀌었다');
      if (options.tableOnly) assertTableOnlyChange(target, before, ready);
      if (options.fillTableAuthors) assertTableAuthorChange(target, before, ready);
      await assertParagraphAlignment(page, target);
      await assertCenteredDividers(page); assertDbReviews(target, ready);
      await captureFirstPerson(page, target, path.join(dir, `ready-person-${current}.png`));
      await captureFullList(page, target, dir, 'ready');
      await editor.click('button[class*=publish_btn]'); await assertPublishOptions(page);
      if (!same(await editor.settings(), original.state)) throw new Error('저장 전 분류·예약·공개·검색·공유·태그가 바뀌었다');
      if (!options.apply) {
        await closePublishPanel(page, editor); const screenshot = path.join(dir, `dry-${current}.png`); await captureLogo(page, representative, screenshot);
        log({ logNo: current, result: 'dry-unsaved', title: target.title, covers: coverIds.length, avatars: target.plan.avatars.length, logo: Boolean(target.plan.logo), screenshot, report }); continue;
      }
      checkRevisionSource(target.revision, sourceOptions);
      step = 'save'; await editor.click('button[class*=confirm_btn]');
      await page.waitForFunction(id => location.href.includes(`logNo=${id}`) && location.href.includes('isAfterUpdateOnly=true'), { timeout: 30000 }, String(current));
      saved = true;
      const reopened = await editor.openTarget({ ...target.post, title: target.title, body: undefined });
      await assertPublishOptions(page);
      if (!same(reopened.state, original.state)) throw new Error('저장 후 분류·예약·공개·검색·공유·태그가 바뀌었다');
      assertReservationPreserved(original.reservation, reopened.reservation, target.title);
      await closePublishPanel(page, editor);
      const after = await readSnapshot(page); assertRevisionSnapshot(target, after, proof);
      await assertCenteredTitle(page);
      if (options.tableOnly) assertTableOnlyChange(target, before, after);
      if (options.fillTableAuthors) assertTableAuthorChange(target, before, after);
      await assertParagraphAlignment(page, target);
      await assertCenteredDividers(page); assertDbReviews(target, after);
      if (!same(ready.images.map(photoIdentity), after.images.map(photoIdentity))) throw new Error('저장·재열기 뒤 사진 원본·크기가 달라졌다');
      if (options.titleOnly && !same(before.flow, after.flow)) throw new Error('제목 정렬 저장 뒤 기존 본문·사진·링크·표가 바뀌었다');
      fs.writeFileSync(path.join(dir, `reopened-${current}.json`), JSON.stringify({ snapshot: after, state: reopened.state, reservation: reopened.reservation }, null, 2));
      const screenshot = path.join(dir, `saved-${current}.png`); await captureLogo(page, after.images[0].id, screenshot);
      await captureFirstPerson(page, target, path.join(dir, `saved-person-${current}.png`));
      await captureFullList(page, target, dir, 'saved');
      const heading = target.plan.lines.find(line => line.trim().startsWith('[c]'));
      if (heading) {
        await page.$$eval('.se-component.se-text:not(.se-documentTitle) .se-text-paragraph', (nodes, title) => nodes.find(node => node.textContent.replace(/\u200b/g, '').trim() === title)?.scrollIntoView({ block: 'start', behavior: 'instant' }), strip(heading.trim()));
        await page.mouse.wheel({ deltaY: -180 }); await wait(250);
        await page.screenshot({ path: path.join(dir, `saved-book-title-${current}.png`) });
      }
      if (!options.titleOnly) { step = 'synchronize-verified'; recordVerified(target, dir, options.drafts); }
      log({ logNo: current, result: options.titleOnly ? 'title-centered-and-reopened' : options.fillTableAuthors ? 'table-authors-filled-and-reopened' : 'saved-and-reopened', title: target.title, revisionSha256: target.digest, covers: coverIds.length, avatars: target.plan.avatars.length, logo: Boolean(target.plan.logo), optionsPreserved: true, reservation: reopened.reservation, screenshot, report });
    }
    log({ complete: true, targets: targets.length, mode: options.apply ? 'apply' : 'dry', report });
  } catch (error) {
    const snapshot = await readSnapshot(page, { waitForImages: false }).catch(snapshotError => ({ snapshotError: String(snapshotError) }));
    fs.writeFileSync(path.join(dir, `failure-${current}.json`), JSON.stringify({ error: String(error), stack: error.stack, snapshot, step, saved }, null, 2));
    const screenshot = path.join(dir, `failure-${current}.png`); await page.screenshot({ path: screenshot }).catch(() => {});
    log({ complete: false, logNo: current, saved, step, error: String(error), screenshot, report }); throw error;
  } finally {
    await page.close().catch(() => {});
    if (launched) await browser.close(); else await browser.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
