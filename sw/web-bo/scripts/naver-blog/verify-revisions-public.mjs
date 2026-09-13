// 공개 모바일 HTML만 읽는다. 화면 렌더링·시각 검수를 대신하지 않는다.
// --ids=글번호 --revisions=실행배열.json --manifest=manifest.json [--drafts=원장.json]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ASSETS } from '../blog-assets.mjs';
import { REVISION_IDS, parseRevisionBody, checkRevisionSource } from './apply-institution-revisions.mjs';
import { strip } from './publish-drafts.mjs';
import { assertLogoGeometry } from './repair-institution-images.mjs';

// 사용자 웹이 이미 사용하는 HTML 파서를 재사용한다.
const { load } = createRequire(new URL('../../../web/package.json', import.meta.url))('cheerio');
const root = path.join(ASSETS, 'naver-blog');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clean = value => String(value ?? '').replace(/\u200b/g, '').trim();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function parsePublicOptions(args) {
  const options = { drafts: path.join(root, 'drafts.json') }, seen = new Set();
  for (const arg of args) {
    const match = arg.match(/^--(ids|revisions|manifest|drafts)=(.+)$/);
    if (!match || seen.has(match[1])) throw new Error(`알 수 없거나 중복된 옵션: ${arg}`);
    seen.add(match[1]); options[match[1]] = match[2];
  }
  options.ids = String(options.ids ?? '').split(',');
  if (!options.revisions || !options.manifest || options.ids.some(id => !/^\d+$/.test(id) || REVISION_IDS.includes(id)) || new Set(options.ids).size !== options.ids.length) throw new Error('완료 18편을 제외한 --ids와 --revisions, --manifest가 필요하다');
  return options;
}

export function selectPublicTargets(rows, manifest, posts, drafts, ids) {
  if (!Array.isArray(rows) || !Array.isArray(manifest) || !rows.length || rows.length !== manifest.length || new Set(rows.map(row => String(row.logNo))).size !== rows.length || new Set(manifest.map(row => String(row.logNo))).size !== manifest.length || !same(rows.map(row => String(row.logNo)).sort(), manifest.map(row => String(row.logNo)).sort())) throw new Error('검수 목록과 실행 원고 글 번호가 일치하지 않는다');
  return ids.map(id => {
    const revision = rows.find(row => String(row.logNo) === id), entry = manifest.find(row => String(row.logNo) === id);
    const local = drafts.filter(row => String(row.logNo) === id), published = posts.filter(row => String(row.logNo) === id);
    if (REVISION_IDS.includes(id) || !revision || local.length !== 1 || published.length !== 1) throw new Error(`검수 원고·원장의 대상이 없거나 중복이거나 완료 18편이다: ${id}`);
    const draft = local[0], post = published[0];
    if (entry.kind !== revision.kind || entry.target !== revision.target || entry.source_revision_sha256 !== revision.source_revision_sha256 || post.kind !== revision.kind || post.url !== `https://feelandnote.com${revision.target}` || draft.target !== revision.target || draft.body !== revision.body || draft.title !== post.title || [post.link, post.status, draft.link, draft.status].some(value => ['deleted', 'to-delete', 'private', 'replaced', 'skip'].includes(value))) throw new Error(`검수 원고·서비스 경로·저장 원장이 일치하지 않는다: ${id}`);
    const digest = hash({ title: draft.title, body: revision.body, logoAsset: revision.logoAsset ?? null });
    if (!draft.rewrittenAt || draft.revisionSha256 !== digest) throw new Error(`저장·재열기 검증을 마친 원장이 아니다: ${id}`);
    checkRevisionSource(revision, { bindContent: true });
    return { revision, title: draft.title, plan: parseRevisionBody(revision) };
  });
}

function pstaticImageKey(src) {
  const url = new URL(src);
  if (!/(?:^|\.)pstatic\.net$/.test(url.hostname)) throw new Error('네이버 공개 사진 주소가 아니다');
  // OG는 업로드 파일명, 본문은 SE-ID 파일명을 쓰기도 한다. 동일 원본의 고유 저장 디렉터리를 대조한다.
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 3) throw new Error('네이버 사진의 고유 저장 경로가 없다');
  return parts.slice(0, -1).join('/');
}

export function parsePublicHtml(html) {
  const $ = load(html), body = $('.se-main-container');
  if (body.length !== 1) throw new Error('공개 본문이 없거나 여러 개다. 예약·비공개·오류 페이지일 수 있다');
  const paragraphs = node => $(node).find('.se-text-paragraph').toArray().map(p => {
    const copy = $(p).clone(); copy.find('.se-placeholder').remove(); return clean(copy.text());
  }).filter(Boolean);
  const align = node => {
    const match = ($(node).attr('class') ?? '').match(/(?:se-text-paragraph|se-section)-align-(left|center|right|justify)\b/);
    return match?.[1] ?? (($(node).attr('style') ?? '').match(/text-align\s*:\s*(left|center|right|justify)/)?.[1]) ?? 'default';
  };
  const flow = [], textAlignment = [], images = [], quoteStyles = [], dividerAlignment = [], links = [];
  for (const component of body.find('.se-component').toArray()) {
    const node = $(component);
    if (node.hasClass('se-documentTitle')) continue;
    if (node.hasClass('se-text') || node.hasClass('se-quotation')) {
      const values = paragraphs(component);
      for (const p of node.find('.se-text-paragraph').toArray()) {
        const value = clean($(p).text()); if (value) textAlignment.push({ text: value, align: align(p) });
      }
      links.push(...node.find('a[href]').toArray().map(a => $(a).attr('href')).filter(href => /^https?:\/\//.test(href)).map(href => new URL(href).href));
      if (node.hasClass('se-quotation')) {
        flow.push({ kind: 'quote', paragraphs: values });
        quoteStyles.push({ line: node.hasClass('se-l-quotation_line'), align: align(node.find('.se-section').first()) });
      } else flow.push(...values.map(text => ({ kind: 'text', text })));
    } else if (node.hasClass('se-image')) {
      const photos = node.find('img.se-image-resource');
      if (photos.length !== 1) throw new Error('단독 사진 구성과 다른 공개 이미지 컴포넌트');
      const photo = photos.first(), meta = node.find('[data-linktype="img"]').first().attr('data-linkdata');
      let data; try { data = JSON.parse(meta); } catch { throw new Error('공개 사진의 원본 크기 메타가 없다'); }
      images.push({ src: data.src, originalWidth: Number(data.originalWidth), originalHeight: Number(data.originalHeight), width: Number(photo.attr('data-width')), height: Number(photo.attr('data-height')), align: align(node.find('.se-section').first()) });
      flow.push({ kind: 'image', index: images.length - 1 });
    } else if (node.hasClass('se-horizontalLine')) {
      flow.push({ kind: 'divider' }); dividerAlignment.push(align(node.find('.se-section').first()));
    } else if (node.hasClass('se-table')) {
      const cells = node.find('th,td');
      if (cells.toArray().some(cell => Number($(cell).attr('rowspan') ?? 1) !== 1 || Number($(cell).attr('colspan') ?? 1) !== 1)) throw new Error('공개 전체 목록에 병합된 셀이 있다');
      const rows = node.find('tr').toArray().map(tr => $(tr).children('th,td').toArray().map(cell => paragraphs(cell).join('\n')));
      flow.push({ kind: 'table', rows });
    } else if (!node.hasClass('se-oglink')) throw new Error(`알 수 없는 공개 본문 컴포넌트: ${node.attr('class')}`);
  }
  const titleSection = $('.se-documentTitle .se-section').first();
  const titleAlignments = $('.se-documentTitle .se-text-paragraph').toArray().map(p => align(p) === 'default' ? align(titleSection) : align(p));
  return { title: clean($('.se-documentTitle .se-text-paragraph').text()), titleAlignment: titleAlignments.length && titleAlignments.every(value => value === 'center') ? 'center' : 'other', flow, textAlignment, images, quoteStyles, dividerAlignment, links, ogImage: $('meta[property="og:image"]').attr('content'), ogUrl: $('meta[property="og:url"]').attr('content') };
}

export function assertPublicImages(target, images) {
  if (images.length !== target.plan.images.length) throw new Error('공개 사진의 개수가 원고와 다르다');
  for (let index = 0; index < images.length; index++) {
    const image = images[index], expected = target.plan.images[index];
    if (image.align !== 'center' || !(image.originalWidth > 0 && image.originalHeight > 0)) throw new Error(`공개 사진 ${index + 1}의 가운데 정렬·원본 크기 메타가 다르다`);
    if (expected.role === 'logo') {
      // 편집기와 같은 원본 크기 상한·종횡비 검증을 쓴다. 작은 로고를 원고의 400px까지 확대하지 않는다.
      assertLogoGeometry({ width: image.width, displayWidth: image.width, displayHeight: image.height, naturalWidth: image.originalWidth, naturalHeight: image.originalHeight, align: `se-section-align-${image.align}` }, target.revision.logoAsset);
    } else if (image.width !== expected.width) throw new Error(`공개 사진 ${index + 1}의 표시 폭이 원고와 다르다: ${image.width} ≠ ${expected.width}`);
  }
}

export function assertPublicRevision(target, snapshot) {
  const { plan, revision } = target;
  if (snapshot.title !== target.title) throw new Error('공개 제목이 저장 원장과 다르다');
  if (snapshot.titleAlignment !== 'center') throw new Error('공개 게시글 제목의 가운데 정렬 표시가 없다');
  if (!same(snapshot.flow, plan.flow)) {
    const index = plan.flow.findIndex((item, i) => !same(item, snapshot.flow[i]));
    throw new Error(`공개 본문·감상·표·사진 순서가 원고와 다르다: 위치 ${index < 0 ? plan.flow.length : index + 1}`);
  }
  if (!same(snapshot.links, plan.links)) throw new Error('공개 본문 링크의 주소·순서·개수가 다르다');
  if (snapshot.quoteStyles.some(style => !style.line || !['left', 'default'].includes(style.align))) throw new Error('공개 감상 구획의 왼쪽 선 스타일이 다르다');
  if (snapshot.dividerAlignment.some(value => value !== 'center')) throw new Error('공개 수평선 가운데 정렬 표시가 없다');
  const expectedAlignment = plan.operations.flatMap(operation => operation.kind === 'quote' ? operation.paragraphs.map(text => ({ text, align: 'left' })) : operation.kind === 'text' && operation.line.trim() ? [{ text: strip(operation.line.trim()), align: operation.line.trim().startsWith('[c]') ? 'center' : 'left' }] : []);
  const actualAlignment = snapshot.textAlignment.map(row => ({ ...row, align: row.align === 'default' ? 'left' : row.align }));
  if (!same(expectedAlignment, actualAlignment)) throw new Error('공개 책 제목·인물 이름·본문의 정렬 표시가 다르다');
  assertPublicImages(target, snapshot.images);
  if (!snapshot.ogImage || pstaticImageKey(snapshot.ogImage) !== pstaticImageKey(snapshot.images[0].src)) throw new Error('공개 OG 대표사진과 본문 첫 사진이 같은 원본이 아니다');
  const ogUrl = new URL(snapshot.ogUrl ?? 'https://invalid.local');
  if (!['m.blog.naver.com', 'blog.naver.com'].includes(ogUrl.hostname) || !(ogUrl.pathname === `/dmx777/${revision.logNo}` || (ogUrl.searchParams.get('blogId') === 'dmx777' && ogUrl.searchParams.get('logNo') === String(revision.logNo)))) throw new Error('공개 페이지의 블로그·글 번호가 다르다');
  return { result: 'public-html-verified', logNo: String(revision.logNo), title: target.title, quotes: plan.quotes.length, tableRows: plan.tables.map(table => table.rows.length - 1), images: snapshot.images.length, ogFirstImageMatched: true, alignment: 'HTML classes/styles', visualInspection: false };
}

export async function main(args = process.argv.slice(2)) {
  const options = parsePublicOptions(args);
  const targets = selectPublicTargets(read(options.revisions), read(options.manifest), read(path.join(root, 'posts.json')), read(options.drafts), options.ids);
  let failures = 0;
  for (const target of targets) {
    const url = `https://m.blog.naver.com/dmx777/${target.revision.logNo}`;
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0', 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
      if (!response.ok || new URL(response.url).hostname !== 'm.blog.naver.com') throw new Error(`공개 HTML 요청 실패: ${response.status} ${response.url}`);
      console.log(JSON.stringify({ ...assertPublicRevision(target, parsePublicHtml(await response.text())), url }));
    } catch (error) {
      failures++; console.log(JSON.stringify({ result: 'public-html-failed', logNo: String(target.revision.logNo), error: error.message, url, visualInspection: false }));
    }
  }
  if (failures) throw new Error(`공개 HTML ${targets.length}편 중 ${failures}편 검증 실패`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
