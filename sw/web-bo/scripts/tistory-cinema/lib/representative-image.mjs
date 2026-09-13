import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { kindOf } from './schedule.mjs';
import { waitForAvailablePage } from './publication-requests.mjs';

export function representativeSource(material, kind) {
  const source = kind === 'work' ? material.work?.poster : kind === 'person' ? material.celeb?.avatar : kind === 'list' ? material.banner?.url : null;
  if (!source || new URL(source).protocol !== 'https:') throw new Error('대표이미지 원본 URL이 없다.');
  return source;
}

export function sourceForPost(name, dir) {
  return representativeSource(JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8')), kindOf(name));
}

export async function prepareRepresentativeImage(name, { dir, fetchImage = fetch } = {}) {
  const source = sourceForPost(name, dir);
  const cache = path.join(dir, '_cover-files');
  fs.mkdirSync(cache, { recursive: true });
  const hash = createHash('sha256').update(source).digest('hex');
  for (const ext of ['jpg', 'png', 'webp', 'gif']) {
    const file = path.join(cache, `${hash}.${ext}`);
    if (fs.existsSync(file) && fs.statSync(file).size) return { source, file };
  }
  const response = await fetchImage(source, { signal: AbortSignal.timeout(60000) });
  const type = response.headers.get('content-type')?.split(';')[0];
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[type];
  if (!response.ok || !ext) throw new Error(`대표이미지 다운로드 실패: HTTP ${response.status}, ${type}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('대표이미지 원본 파일이 비어 있다.');
  const file = path.join(cache, `${hash}.${ext}`);
  fs.writeFileSync(file, bytes, { flag: 'wx' });
  return { source, file };
}

// Read only the rendered upload preview; signed thumbnail query strings are not stored.
export async function readRepresentativeImage(page) {
  return page.evaluate(() => {
    const element = [...document.querySelectorAll('.inner_box > .thumb_g')].find((el) => el.getClientRects().length);
    if (!element) return null;
    const match = getComputedStyle(element).backgroundImage.match(/^url\(["']?(.*?)["']?\)$/);
    if (!match) return null;
    let url = new URL(match[1]);
    if (url.searchParams.has('fname')) url = new URL(url.searchParams.get('fname'));
    return url.origin + url.pathname;
  });
}

export async function uploadRepresentativeImage(page, file) {
  if (await readRepresentativeImage(page)) throw new Error('이미 대표이미지가 있다. 기존 이미지를 임의로 교체하지 않는다.');
  const inputs = await page.$$('input[type="file"][accept="image/*"]');
  if (inputs.length !== 1) throw new Error(`대표이미지 첨부 입력을 유일하게 찾지 못했다: ${inputs.length}`);
  await inputs[0].uploadFile(file);
  await waitForAvailablePage(page, () => [...document.querySelectorAll('.inner_box > .thumb_g')]
    .some((el) => el.getClientRects().length && getComputedStyle(el).backgroundImage !== 'none'), { timeout: 60000, label: '대표이미지 업로드 미리보기' });
  const image = await readRepresentativeImage(page);
  if (!image || !/^https:\/\/blog\.kakaocdn\.net\//.test(image)) throw new Error('업로드된 대표이미지의 서버 식별값을 읽지 못했다.');
  return image;
}

export function assertRepresentativeImage(actual, expected) {
  if (!actual || (expected && actual !== expected)) throw new Error('저장 후 대표이미지가 없거나 업로드한 이미지와 다르다.');
}
