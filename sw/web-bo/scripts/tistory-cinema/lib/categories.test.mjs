import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { CATEGORY_TREE, categoryPathForMaterial, categoryForMeta } from './categories.mjs';
import { selectEditorCategory } from '../publish.mjs';

test('the two-level tree has unambiguous leaf labels for editor selection', () => {
  assert.equal(CATEGORY_TREE.length, 3);
  assert.deepEqual(CATEGORY_TREE.map((node) => node.children.length), [12, 18, 8]);
  const leaves = CATEGORY_TREE.flatMap((node) => node.children);
  assert.equal(new Set(leaves).size, leaves.length);
});

test('people use their recorded profession, including grouped professions and exact identity exceptions', () => {
  for (const profession of ['scientist', 'social_scientist', 'humanities_scholar']) {
    assert.deepEqual(categoryPathForMaterial({ celeb: { profession } }), ['셀럽이 감상한 영화', '학자']);
  }
  for (const profession of ['musician', 'visual_artist']) assert.equal(categoryPathForMaterial({ celeb: { profession } })[1], '아티스트');
  assert.equal(categoryPathForMaterial({ celeb: { profession: 'director' } })[1], '영화감독');
  assert.equal(categoryPathForMaterial({ celeb: { profession: 'commander', slug: 'lucky-luciano' } })[1], '지도자');
  assert.equal(categoryPathForMaterial({ celeb: { profession: 'commander', id: '203c414d-7860-4e85-9504-430a0e732756' } })[1], '지도자');
  assert.equal(categoryPathForMaterial({ celeb: { profession: 'commander', name: '럭키 루치아노', slug: 'another-person' } })[1], '군인');
});

test('a multi-genre film uses exactly its first recorded genre without changing the material', () => {
  const material = { work: { title: '대부' }, tmdb: { genres: ['드라마', '범죄'] } };
  const before = structuredClone(material);
  assert.deepEqual(categoryPathForMaterial(material), ['이 영화를 감상한 셀럽', '드라마']);
  assert.deepEqual(material, before);
  assert.equal(categoryPathForMaterial({ work: {}, tmdb: { genres: ['음악', '드라마'] } })[1], '음악');
});

test('lists use the curator type rather than the genre of the films in the list', () => {
  for (const [kind, expected] of Object.entries({ media: '언론매체', award: '시상기관', organization: '단체', festival: '영화제' })) {
    assert.deepEqual(categoryPathForMaterial({ list: {}, curator: { kind }, picked: [{ genres: ['공포'] }] }), ['영화제와 선정 목록', expected]);
  }
});

test('missing, unknown, or contradictory category data stops instead of falling back to a parent', () => {
  for (const material of [{}, { work: {} }, { celeb: { profession: 'unknown' } }, { list: {}, curator: {} }, { work: {}, celeb: {} }, { work: {}, tmdb: { genres: ['unknown', '드라마'] } }]) {
    assert.throws(() => categoryPathForMaterial(material), /카테고리/);
  }
  const meta = { categoryPath: ['이 영화를 감상한 셀럽', '드라마'], category: '드라마' };
  assert.equal(categoryForMeta(meta, 'work'), '드라마');
  assert.throws(() => categoryForMeta(meta, 'person'), /카테고리/);
  assert.throws(() => categoryForMeta({ ...meta, category: '범죄' }), /카테고리/);
  assert.throws(() => categoryForMeta({ ...meta, categoryPath: ['셀럽이 감상한 영화', '드라마'] }), /카테고리/);
  assert.throws(() => categoryForMeta({ category: meta.categoryPath[0] }), /카테고리/);
});

test('the observed editor selects the prefixed child option and verifies only the chosen label', async (t) => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--disable-background-networking'] });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`<button id="category-btn" onclick="document.querySelector('#category-list').style.display='block'">
    <span class="mce-txt">카테고리 선택</span><span>더보기</span></button>
    <div id="category-list" style="display:none">
      <div role="option"><span class="mce-text">셀럽이 감상한 영화</span></div>
      <div role="option" onclick="document.querySelector('#category-btn .mce-txt').textContent='배우'"><span class="mce-text">- 배우</span></div>
      <div role="option" onclick="document.querySelector('#category-btn .mce-txt').textContent='영화감독'"><span class="mce-text">- 영화감독</span></div>
    </div>`);
  await selectEditorCategory(page, { categoryPath: ['셀럽이 감상한 영화', '영화감독'], category: '영화감독' }, 'person');
  assert.equal(await page.$eval('#category-btn .mce-txt', (el) => el.textContent), '영화감독');
  assert.match(await page.$eval('#category-btn', (el) => el.textContent), /더보기/);
});
