import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { representativeSource, prepareRepresentativeImage, uploadRepresentativeImage, readRepresentativeImage } from './representative-image.mjs';
import { assertRepresentativeOnly, fillRepresentative, representativeNeedsWork } from '../fill-representative.mjs';
import { assertPageAvailable } from './publication-requests.mjs';

test('all three material types select existing originals and URL-hash files are reused', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-cover-test-'));
  t.after(() => { assert.ok(dir.startsWith(path.join(os.tmpdir(), 'tistory-cover-test-'))); fs.rmSync(dir, { recursive: true }); });
  const material = { work: { poster: 'https://fixture.invalid/poster.jpg' }, celeb: { avatar: 'https://fixture.invalid/avatar.webp?v=3' }, banner: { url: 'https://fixture.invalid/banner.jpg' } };
  assert.equal(representativeSource(material, 'work'), material.work.poster);
  assert.equal(representativeSource(material, 'person'), material.celeb.avatar);
  assert.equal(representativeSource(material, 'list'), material.banner.url);
  assert.throws(() => representativeSource({}, 'work'), /원본 URL/);
  fs.writeFileSync(path.join(dir, '인물-fixture.json'), JSON.stringify(material));
  let downloads = 0;
  const fetchImage = async () => { downloads++; return new Response('original-bytes', { headers: { 'content-type': 'image/webp' } }); };
  const first = await prepareRepresentativeImage('인물-fixture', { dir, fetchImage });
  const second = await prepareRepresentativeImage('인물-fixture', { dir, fetchImage });
  assert.equal(first.file, second.file); assert.equal(downloads, 1);
  assert.equal(fs.readFileSync(first.file, 'utf8'), 'original-bytes');
});

test('normal file attachment reads the visible server preview and detects lost images or incidental edits', async (t) => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--disable-background-networking'] });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setRequestInterception(true); page.on('request', (request) => request.abort());
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-cover-ui-'));
  t.after(() => { assert.ok(dir.startsWith(path.join(os.tmpdir(), 'tistory-cover-ui-'))); fs.rmSync(dir, { recursive: true }); });
  const file = path.join(dir, 'original.webp'); fs.writeFileSync(file, 'fixture');
  const image = 'https://blog.kakaocdn.net/dna/fixture/img.webp';
  const thumbnail = 'https://img1.daumcdn.net/thumb/C170x170/?fname=' + encodeURIComponent(image + '?expires=123&signature=temporary');
  await page.setContent('<p id="body">Original body</p><div class="inner_box"><input type="file" accept="image/*"></div>');
  await page.evaluate((url) => document.querySelector('input').addEventListener('change', () => {
    const node = document.createElement('span'); node.className = 'thumb_g'; node.style.cssText = `display:block;width:170px;height:170px;background-image:url("${url}")`;
    document.querySelector('.inner_box').replaceChildren(node);
  }), thumbnail);
  assert.equal(await uploadRepresentativeImage(page, file), image);
  assert.equal(await readRepresentativeImage(page), image);
  assert.equal(await page.$eval('#body', (el) => el.textContent), 'Original body');
  await assert.rejects(uploadRepresentativeImage(page, file), /이미 대표이미지/);
  const before = { id: 2, title: 'Title', html: '<p>Original body</p>', tags: ['film'], slug: 'same', category: 'category', visibility: 'open20', at: '2099-09-09 12:00', url: 'https://fixture.invalid/same' };
  await assertRepresentativeOnly(page, before, { ...before, representativeImage: image }, image);
  await assert.rejects(assertRepresentativeOnly(page, before, { ...before, representativeImage: null }, image), /대표이미지/);
  await assert.rejects(assertRepresentativeOnly(page, before, { ...before, representativeImage: image, at: null }, image), /at/);
  await assert.rejects(assertRepresentativeOnly(page, before, { ...before, representativeImage: image, html: '<p>Changed</p>' }, image), /본문 불일치/);
});

test('resume preserves an already saved representative without uploading again or claiming its source', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-cover-resume-'));
  t.after(() => { assert.ok(dir.startsWith(path.join(os.tmpdir(), 'tistory-cover-resume-'))); fs.rmSync(dir, { recursive: true }); });
  const post = { id: 2, name: 'fixture', title: 'Title', at: '2099-09-09 12:00', visibility: 'open20' };
  const image = 'https://blog.kakaocdn.net/dna/already-saved/img.webp';
  let reads = 0;
  const options = { dir, read: async (_page, id) => { reads++; assert.equal(id, 2); return { ...post, representativeImage: image }; } };
  const result = await fillRepresentative({ bringToFront: async () => {} }, post, options);
  assert.equal(reads, 1); assert.equal(result.preserved, true); assert.equal(result.representativeSource, null);
  assert.equal(representativeNeedsWork({ ...post, ...result }, 'https://fixture.invalid/source.webp'), false);
  await assert.rejects(fillRepresentative({ bringToFront: async () => {} }, post, { ...options, read: async () => ({ ...post, at: null, representativeImage: image }) }), /공개·예약 설정/);
});

test('only document replacement during a pending save continues destination waiting', async () => {
  const moving = { evaluate: async () => { throw new Error('Execution context was destroyed, most likely because of a navigation.'); } };
  assert.equal(await assertPageAvailable(moving, { navigationPending: true }), false);
  await assert.rejects(assertPageAvailable(moving), /Execution context/);
  await assert.rejects(assertPageAvailable({ evaluate: async () => { throw new Error('Unknown failure'); } }, { navigationPending: true }), /Unknown failure/);
  await assert.rejects(assertPageAvailable({ evaluate: async () => ({ code: 'TISTORY_ACCESS_RESTRICTED', message: 'Access restricted' }) }, { navigationPending: true }), (error) => error.code === 'TISTORY_ACCESS_RESTRICTED');
});
