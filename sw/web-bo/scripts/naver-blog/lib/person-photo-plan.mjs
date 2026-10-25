import path from 'node:path';
import { AVATAR_WIDTH } from '../apply-institution-revisions.mjs';

export const photoRole = target => target.kind === 'curated' ? 'avatar' : 'portrait';
export const assetsForPost = (assets, target) => assets.filter(a => (a.role ?? 'portrait') === photoRole(target));

export function imageFilename(src) {
  try { return decodeURIComponent(new URL(src).pathname.split('/').at(-1)); }
  catch { return ''; }
}

export function publishedImageSources(html) {
  const images = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\bclass\s*=\s*["'][^"']*\bse-image-resource\b[^"']*["']/i.test(tag)) continue;
    const attr = key => tag.match(new RegExp(`(?:^|\\s)${key}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
    const src = (attr('data-lazy-src') || attr('src') || '').replace(/&amp;/g, '&');
    if (!/^https?:\/\//.test(src)) throw new Error('Published image source missing');
    images.push(src.replace(/\?.*$/, ''));
  }
  return images;
}

export function publishedImageNodes(html) {
  const components = [...html.matchAll(/<div\b[^>]*\bclass\s*=\s*["'][^"']*\bse-component\b[^"']*["'][^>]*>/gi)]
    .filter(match => match[0].match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1].split(/\s+/).includes('se-component'));
  return components.flatMap((match, index) => {
    const cls = match[0].match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1].split(/\s+/) ?? [];
    const strip = cls.includes('se-imageStrip');
    if (!strip && !cls.includes('se-image')) return [];
    const id = match[0].match(/\bid\s*=\s*["']([^"']*)["']/i)?.[1];
    if (!id) throw new Error('공개 사진 컴포넌트 ID 누락');
    const sources = publishedImageSources(html.slice(match.index, components[index + 1]?.index ?? html.length));
    if (!strip && sources.length > 1) throw new Error('단일 사진 컴포넌트의 원본이 여러 개다');
    return sources.map((src, inner) => ({ id: strip ? `${id}::${inner}` : id, src }));
  });
}

// Naver serves og:image through blogthumb and body images through postfiles.
// Compare their original path, preserving which body-image position is representative.
export function assertPublicRepresentative(before, after) {
  const original = new URL(before.og).pathname;
  const indices = before.images.flatMap((src, i) => new URL(src).pathname === original ? [i] : []);
  if (indices.length !== 1) throw new Error('공개 대표이미지의 본문 위치를 특정하지 못했다');
  if (new URL(after.og).pathname !== new URL(after.images[indices[0]]).pathname) throw new Error('공개 글의 대표이미지 지정이 바뀌었다');
}

// Match delimited person names, never substring/square-image guesses (book covers can be square).
export function planPersonPhotos(images, assets, auditMap = {}, historical = [], target = {}) {
  const changes = [], unmatched = [];
  const bySlug = new Map(assets.map(a => [a.slug, a]));
  for (const [index, image] of images.entries()) {
    const name = imageFilename(image.src);
    const candidates = new Set();
    for (const asset of assets) {
      if (['portrait', 'local', 'reframe', 'avatar'].some(prefix => name.startsWith(`${prefix}-${asset.slug}-`))) candidates.add(asset.slug);
    }
    for (const [prefix, slug] of Object.entries(auditMap.reframe ?? {})) if (name.startsWith(prefix)) candidates.add(slug);
    for (const [nick, slug] of Object.entries(auditMap.nicknames ?? {})) {
      if (name === `${nick}.jpg` || name === `${nick}.png` || name.startsWith(`${nick}-`)) candidates.add(slug);
    }
    // Previously reviewed original filenames are scoped to this post, not to its old index.
    for (const old of historical) if (old.oldBasename && name.startsWith(old.oldBasename)) candidates.add(old.slug);
    // A shorter slug may prefix a longer one; retain the longest delimited identity.
    const ids = [...candidates].filter(s => ![...candidates].some(t => t !== s && t.startsWith(`${s}-`)));
    if (ids.length !== 1 || !bySlug.has(ids[0])) {
      if (ids.length || /^(portrait|local|reframe|avatar)-/.test(name) || (auditMap.ambiguousNicknames ?? []).some(n => name.startsWith(`${n}-`))) unmatched.push({ index, name, reason: ids.length > 1 ? 'ambiguous-person' : 'no-service-portrait' });
      continue;
    }
    const asset = bySlug.get(ids[0]);
    const width = photoRole(target) === 'avatar' ? AVATAR_WIDTH : Number(image.width) || Math.round(image.displayWidth) || 200;
    changes.push({ index, slug: asset.slug, nickname: asset.nickname, asset, marker: path.basename(asset.uploadFile), width });
  }
  return { changes, unmatched };
}

export function assertPersonPhotoFlow(before, after, changes) {
  if (!Array.isArray(before.flow) || !Array.isArray(after.flow)) throw new Error('Missing component flow');
  const indices = new Set(changes.map(c => c.index));
  let index = 0;
  const source = s => { const i = index++; return indices.has(i) ? after.images[i].src : s; };
  const expected = before.flow.map(c => c.kind === 'image' ? { ...c, src: source(c.src) }
    : c.kind === 'imageStrip' ? { ...c, sources: c.sources.map(source) } : c);
  if (JSON.stringify(expected) !== JSON.stringify(after.flow)) throw new Error('Photo/text component order changed');
}
