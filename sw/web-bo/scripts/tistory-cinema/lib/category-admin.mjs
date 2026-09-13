/** Category settings and list bulk changes, using the normal management UI. */
import { BLOG, takeDialog } from './browser.mjs';
import { PUBLICATION_REQUESTS, assertPageAvailable, pauseRequests, waitForAvailablePage } from './publication-requests.mjs';

const ORIGIN = `https://${BLOG}.tistory.com`;

export async function readCategoryTree(page) {
  return page.evaluate(() => [...document.querySelectorAll('#category-app .list_order > .bundle_item')].flatMap((row) => {
    const name = row.querySelector(':scope > .item_order .txt_name')?.textContent.trim();
    if (!name || name === '분류 전체보기') return [];
    return [{ name, children: [...row.querySelectorAll(':scope > .list_sub > .bundle_item > .item_order .txt_name')].map(e => e.textContent.trim()) }];
  }));
}

export function missingCategories(actual, expected) {
  return expected.flatMap((parent) => {
    const found = actual.find(e => e.name === parent.name);
    return [ ...(!found ? [{ parent: null, name: parent.name }] : []),
      ...parent.children.filter(name => !found?.children.includes(name)).map(name => ({ parent: parent.name, name })) ];
  });
}

export async function openCategories(page) {
  await page.goto(`${ORIGIN}/manage/category`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForAvailablePage(page, () => Boolean(document.querySelector('#category-app .list_order')), { label: '카테고리 관리' });
}

export async function ensureCategories(page, expected, { beforeSave = () => {} } = {}) {
  await openCategories(page);
  const before = await readCategoryTree(page); const missing = missingCategories(before, expected);
  if (!missing.length) return { added: 0, tree: before };
  await beforeSave(before);
  for (const item of missing) {
    const opened = await page.evaluate(({ parent }) => {
      if (!parent) { document.querySelector('#category-app input[value="카테고리 추가"]').click(); return true; }
      const row = [...document.querySelectorAll('#category-app .list_order > .bundle_item')].find(e => e.querySelector(':scope > .item_order .txt_name')?.textContent.trim() === parent);
      const add = [...(row?.querySelectorAll(':scope > .item_order a') ?? [])].find(a => a.textContent.trim() === '추가');
      if (!add) return false; add.click(); return true;
    }, item);
    if (!opened) throw new Error(`상위 분류의 추가 단추가 없다: ${item.parent}`);
    await page.waitForSelector('#category-app .edit_item input.tf_blog', { visible: true });
    await page.type('#category-app .edit_item input.tf_blog', item.name);
    await page.click('#category-app .edit_item button[type=submit]');
    await page.waitForFunction(() => !document.querySelector('#category-app .edit_item'));
  }
  takeDialog();
  await page.click('.blog_category .set_btn button.btn_save');
  await waitForAvailablePage(page, () => document.querySelector('.blog_category .set_btn button.btn_save')?.disabled, { label: '카테고리 저장' });
  await pauseRequests(page, PUBLICATION_REQUESTS.listPageMs);
  await openCategories(page);
  const tree = await readCategoryTree(page);
  if (missingCategories(tree, expected).length) throw new Error(`저장 후 카테고리가 부족하다: ${takeDialog() ?? ''}`);
  for (const parent of before) {
    if (missingCategories(tree, [parent]).length) throw new Error(`기존 분류가 사라졌다: ${parent.name}`);
  }
  return { added: missing.length, tree };
}

export async function readCategoryRows(page) {
  await assertPageAvailable(page);
  return page.evaluate(() => [...document.querySelectorAll('.list_post > li')].map(row => {
    const edit = [...row.querySelectorAll('a[href]')].find(a => /^\/manage\/post\/\d+$/.test(new URL(a.href).pathname));
    const id = Number(edit && new URL(edit.href).pathname.split('/').at(-1));
    const link = row.querySelector('a.link_cont');
    if (!id || !link) throw new Error('글 목록의 실제 ID와 제목을 읽을 수 없다.');
    return { id, title: link.getAttribute('title') ?? link.textContent.trim(), url: link.href,
      category: row.querySelector('.txt_cate')?.textContent.trim() ?? null,
      status: row.querySelector('.info_status')?.textContent.trim() ?? '',
      at: [...row.querySelectorAll('.txt_info')].map(e => e.textContent.trim()).find(t => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(t)) ?? null };
  }));
}

export async function openCategoryPage(page, number = 1) {
  await page.goto(`${ORIGIN}/manage/posts/?page=${number}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForAvailablePage(page, () => Boolean(document.querySelector('.list_post a.link_cont')), { label: `글 목록 ${number}쪽` });
  return readCategoryRows(page);
}

export function assertCategoryOnly(before, after, wanted, category) {
  const ids = new Set(wanted);
  if (before.length !== after.length) throw new Error('분류 변경 후 글 목록 개수가 바뀌었다.');
  for (const row of before) {
    const found = after.find(e => e.id === row.id);
    if (!found) throw new Error(`분류 변경 후 #${row.id}를 찾을 수 없다.`);
    for (const key of ['title', 'url', 'status', 'at']) if (row[key] !== found[key]) throw new Error(`#${row.id}의 ${key}가 바뀌었다.`);
    if (found.category !== (ids.has(row.id) ? category : row.category)) throw new Error(`#${row.id}의 분류가 예상과 다르다: ${found.category}`);
  }
}

export async function bulkCategory(page, ids, categoryPath) {
  if (!ids.length || categoryPath.length !== 2) throw new Error('변경 대상과 상위/하위 분류가 필요하다.');
  const before = await readCategoryRows(page);
  if (new Set(ids).size !== ids.length || ids.some(id => !before.some(e => e.id === id))) throw new Error('현재 목록에 없는 ID 또는 중복 ID다.');
  await page.evaluate((wanted) => {
    for (const row of document.querySelectorAll('.list_post > li')) {
      const box = row.querySelector('input[type=checkbox]');
      const id = Number(box?.id.match(/^inpCheck(\d+)$/)?.[1]);
      if (!id) throw new Error('글별 선택 상자의 ID를 확인하지 못했다.');
      if (box.checked !== wanted.includes(id)) row.querySelector(`label[for="${box.id}"]`).click();
    }
  }, ids);
  const selected = await page.evaluate(() => [...document.querySelectorAll('.list_post input[type=checkbox]:checked')].map(e => Number(e.id.replace('inpCheck', ''))).sort((a,b) => a-b));
  if (JSON.stringify(selected) !== JSON.stringify([...ids].sort((a,b) => a-b))) throw new Error('선택한 글과 변경 대상이 다르다.');
  const opened = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(e => e.getClientRects().length && e.textContent.trim() === '변경' && !e.disabled);
    if (!button) return false; button.click(); return true;
  });
  if (!opened) throw new Error('일괄 변경 단추가 비활성이다.');
  takeDialog();
  const picked = await page.evaluate(([parent, leaf]) => {
    const group = [...document.querySelectorAll('.layer_double .scroll_opt > .list_opt > li')].find(e => e.querySelector(':scope > label')?.title === parent);
    const label = [...(group?.querySelectorAll(':scope > ul > li > label') ?? [])].find(e => e.title === leaf);
    const button = label?.querySelector('input[type=button]');
    if (!button) return false; button.click(); return true;
  }, categoryPath);
  if (!picked) throw new Error(`하위 분류 선택지가 없다: ${categoryPath.join(' / ')}`);
  await waitForAvailablePage(page, (wanted, category) => wanted.every(id => {
    const row = document.querySelector(`#inpCheck${id}`)?.closest('li');
    return row?.querySelector('.txt_cate')?.textContent.trim() === category;
  }), { label: '글 카테고리 변경' }, ids, categoryPath.join('/'));
  const after = await readCategoryRows(page);
  assertCategoryOnly(before, after, ids, categoryPath.join('/'));
  return after;
}
