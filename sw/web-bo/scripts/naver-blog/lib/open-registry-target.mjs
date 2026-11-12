// 원장의 인물 글을 편집기로 연다. 예약 글은 기존 편집 경로, 공개 글은 수정 화면을 직접 연다.
// 독서 방식·전체 감상 목록 일괄 삽입기가 같이 쓴다.
import {createExistingEditor} from './existing-editor.mjs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export function isFutureReservation(post) {
  const m = post.scheduledAt?.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})\s+(\d{2}:\d{2})/);
  return Boolean(m && Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:00+09:00`) > Date.now());
}

export async function openRegistryTarget(page, post) {
  const editor = createExistingEditor(page);
  if (isFutureReservation(post)) return editor.openTarget(post);
  await page.goto(`https://blog.naver.com/PostUpdateForm.naver?blogId=dmx777&logNo=${post.logNo}`, {waitUntil: 'domcontentloaded', timeout: 30000});
  await page.waitForSelector('button[class*=publish_btn]', {timeout: 25000});
  await page.waitForFunction(title => document.querySelector('.se-documentTitle .se-text-paragraph')?.textContent.replace(/​/g, '').trim() === title.trim(), {timeout: 25000}, post.title);
  let prior = '', stable = 0;
  for (let i = 0; i < 30 && stable < 2; i++) { const body = JSON.stringify(await editor.content()); stable = body === prior ? stable + 1 : 0; prior = body; await sleep(150); }
  if (stable < 2) throw Error('Published editor did not stabilize');
  await editor.click('button[class*=publish_btn]'); await page.waitForSelector('#publish-option-search', {timeout: 10000});
  const settings = await editor.settings();
  if (!settings.inputs.find(x => x.id === 'open_public')?.checked) throw Error('Current published post is not public');
  return {reservation: null, state: settings, content: await editor.content()};
}
