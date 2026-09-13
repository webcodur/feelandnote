import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { fillOne, selectPosts } from '../fill-body.mjs';
import { selectAuditPosts } from '../audit-posted.mjs';
import { setOne } from '../set-visibility.mjs';
import { startChallengeSession, throwIfChallengeFailed } from './challenge-session.mjs';
import { mapPostIdentities, compareHtml, listManagedPosts, writeEditorTags, readEditorTags, sameTags } from './post-integrity.mjs';

let browser; let page;
before(async () => {
  // Fresh temporary headless profile; never connects to the user's Tistory browser.
  browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--disable-background-networking'] });
  page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => request.abort());
});
after(async () => { await browser?.close(); });

test('a missing real post ID is rejected before opening or changing the editor', async () => {
  let opened = false;
  const page = { bringToFront() { opened = true; throw new Error('EDITOR_OPENED'); } };
  await assert.rejects(fillOne(page, {}, undefined, '대부'), /글 번호|post ID|실제 ID/);
  assert.equal(opened, false);
});

test('selection and audit use real IDs, reject missing rows and require explicit run', () => {
  const posts = [{ id: 54, name: '영화', title: '제목' }];
  assert.throws(() => selectPosts(posts, ['--id', '1']), /대장에 없다/);
  assert.throws(() => selectAuditPosts(posts, ['1']), /대장에 없다/);
  assert.throws(() => selectAuditPosts([{ name: '영화' }], ['--all']), /글 번호/);
  assert.equal(selectPosts(posts, ['--id', '54', '--file', '영화']).run, false);
  assert.equal(selectPosts(posts, ['--id', '54', '--at', '2099-09-23 18:00']).body, false);
  assert.equal(selectPosts(posts, ['--id', '54', '--at', '2099-09-23 18:00', '--body']).body, true);
  assert.throws(() => selectPosts(posts, ['--id', '54', '--file', '다른 영화']), /일치하지 않는다/);
});

test('dry run never opens a browser or changes a local record', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-integrity-test-'));
  try {
    const post = { id: 54, name: 'film', title: 'Before' };
    fs.writeFileSync(path.join(dir, '_posts.json'), JSON.stringify([post]));
    fs.writeFileSync(path.join(dir, '_meta-film.json'), JSON.stringify({ title: 'After' }));
    fs.writeFileSync(path.join(dir, '_body-film.html'), '<p>Full review</p>');
    const original = fs.readFileSync(path.join(dir, '_posts.json'), 'utf8');
    const result = await fillOne(null, null, 54, 'film', { dir });
    assert.equal(result.dryRun, true);
    assert.equal(result.title, 'After');
    assert.equal(fs.readFileSync(path.join(dir, '_posts.json'), 'utf8'), original);
  } finally {
    // Only the fixed files in this newly allocated test directory are removed.
    for (const file of ['_posts.json', '_meta-film.json', '_body-film.html']) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  }
});

test('mapping needs a unique full title and never falls back to title heads or list position', () => {
  const posts = [{ name: 'A', title: 'Same | old' }];
  assert.equal(mapPostIdentities(posts, [{ id: 54, title: 'Same | new' }], { A: 'Same | new' })[0].id, 54);
  assert.throws(() => mapPostIdentities(posts, [{ id: 54, title: 'Same | unrelated' }]), /유일하게/);
  assert.throws(() => mapPostIdentities(posts, [{ id: 53, title: 'Same | old' }, { id: 54, title: 'Same | old' }]), /유일하게/);
  assert.throws(() => mapPostIdentities([...posts, { name: 'B', title: 'Same | old' }], [{ id: 54, title: 'Same | old' }]), /둘 이상/);
});

test('DOM normalization ignores editor attributes and whitespace without losing quote or text checks', async () => {
  const local = '<h2>영화 이야기</h2><p>A &amp; B가 영화를 봤다.</p><blockquote>다시 보았다.</blockquote>';
  const rewritten = '<h2 data-ke-size="size26"><span>영화 이야기</span></h2>\n<p class="editor">A &amp; B가\n 영화를 봤다.</p><blockquote style="color:black"><p>다시 보았다.</p></blockquote>';
  assert.equal((await compareHtml(page, local, rewritten)).ok, true);
  const missing = await compareHtml(page, local, rewritten.replace('다시 보았다.', ''));
  assert.equal(missing.ok, false);
  assert(missing.issues.some((issue) => issue.field === 'text'));
  const unquoted = await compareHtml(page, local, local.replace('<blockquote>', '<p>').replace('</blockquote>', '</p>'));
  assert(unquoted.issues.some((issue) => issue.field === 'quotes'));
});

test('a missing sentence hidden by extra attributes is still detected', async () => {
  const local = '<p>첫 문장.</p><p>중요한 인용입니다.</p><p>마지막 문장.</p>';
  const damaged = '<p style="' + 'padding:0;'.repeat(40) + '">첫 문장.</p><p>마지막 문장.</p>';
  assert(damaged.length > local.length);
  assert.equal((await compareHtml(page, local, damaged)).ok, false);
});

test('links, images and iframe destinations are compared, not merely counted', async () => {
  const html = '<a href="https://feelandnote.com/ko/celebs/a">인물</a><img src="https://image.tmdb.org/t/p/w500/abc.jpg" alt="영화"><iframe src="https://www.youtube.com/embed/one"></iframe>';
  for (const [beforeValue, afterValue, field] of [['celebs/a', 'celebs/b', 'links'], ['abc.jpg', 'wrong.jpg', 'images'], ['embed/one', 'embed/two', 'iframes']]) {
    const result = await compareHtml(page, html, html.replace(beforeValue, afterValue));
    assert(result.issues.some((issue) => issue.field === field));
  }
});

test('only image proxies that explicitly preserve the original URL are accepted', async () => {
  const src = 'https://image.tmdb.org/t/p/w500/abc.jpg';
  const local = `<img src="${src}" alt="영화">`;
  const proxied = `<img src="https://t1.daumcdn.net/thumb/R1280x0/?scode=mtistory2&amp;fname=${encodeURIComponent(src)}" alt="영화" data-ke-mobilestyle="widthOrigin">`;
  assert.equal((await compareHtml(page, local, proxied)).ok, true);
  assert.equal((await compareHtml(page, local, '<img src="https://blog.kakaocdn.net/dn/random/img.jpg" alt="영화">')).ok, false);
});

test('management inventory waits for loaded numeric IDs and follows pagination without category or visibility filters', async () => {
  const listing = await browser.newPage();
  const visited = [];
  await listing.setRequestInterception(true);
  listing.on('request', (request) => {
    if (!request.isNavigationRequest()) return request.abort();
    const url = new URL(request.url());
    visited.push(url.href);
    const id = url.searchParams.get('page') === '2' ? 2 : 1;
    const row = `<li><strong class="tit_post"><a class="link_cont" title="Film ${id}" href="/entry/film-${id}"><span class="info_status">[예약]</span>Film ${id}</a></strong><a href="/manage/post/${id}?returnURL=list">수정</a></li>`;
    return request.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: `<a href="/manage/post/?returnURL=list">글쓰기</a><ul class="list_post">로딩중입니다</ul><a href="/manage/posts/?page=1&visibility=visible">공개</a><a href="/manage/posts/?page=1&category=100">분류</a><div class="wrap_paging"><a href="/manage/posts/?page=2&visibility=all">2</a></div><script>setTimeout(() => { document.querySelector('.list_post').innerHTML = ${JSON.stringify(row)}; }, 80)</script>` });
  });
  try {
    const rows = await listManagedPosts(listing);
    assert.deepEqual(rows.map((row) => ({ id: row.id, title: row.title, status: row.status })), [
      { id: 1, title: 'Film 1', status: '[예약]' },
      { id: 2, title: 'Film 2', status: '[예약]' },
    ]);
    assert.equal(visited.length, 2);
    assert(visited.every((url) => !/visibility=visible|category=100/.test(url)));
  } finally { await listing.close(); }
});

test('saved tag comparison accepts server letter casing but detects missing, added and different tags', () => {
  assert.equal(sameTags(['조지 C. 스콧', '영화추천'], ['영화추천', '조지 c. 스콧']), true);
  assert.equal(sameTags(['조지 C. 스콧', '영화추천'], ['조지 c. 스콧']), false);
  assert.equal(sameTags(['조지 C. 스콧'], ['조지 c. 스콧', '영화추천']), false);
  assert.equal(sameTags(['조지 C. 스콧'], ['조지 스콧']), false);
});

test('tag editing focuses the input, commits Korean tags, removes obsolete tags and is idempotent', async () => {
  const editor = await browser.newPage();
  try {
    await editor.setContent('<p id="body">Original body</p><div class="editor_tag"><span class="txt_tag"><a>#keep</a><a class="btn_delete" onclick="this.parentElement.remove()">delete</a></span><span class="txt_tag"><a>#obsolete</a><a class="btn_delete" onclick="this.parentElement.remove()">delete</a></span><input id="tagText"></div>');
    await editor.evaluate(() => {
      window.tagCommits = 0;
      document.querySelector('#tagText').addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const item = document.createElement('span'); item.className = 'txt_tag';
        const label = document.createElement('a'); label.textContent = '#' + event.target.value;
        const remove = document.createElement('a'); remove.className = 'btn_delete'; remove.textContent = 'delete'; remove.onclick = () => item.remove();
        item.append(label, remove); event.target.before(item); event.target.value = ''; window.tagCommits++;
      });
    });
    const wanted = ['keep', '한글 영화', '영화추천'];
    await writeEditorTags(editor, wanted);
    assert.deepEqual(await readEditorTags(editor), wanted);
    await writeEditorTags(editor, wanted);
    assert.equal(await editor.evaluate(() => window.tagCommits), 2);
    assert.equal(await editor.$eval('#body', (element) => element.textContent), 'Original body');
  } finally { await editor.close(); }
});

test('schedule-only save preserves title, body and slug and verifies the reopened saved post', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-integrity-save-test-'));
  const fixturePage = await browser.newPage();
  let editorUrl = ''; let opens = 0; let saves = 0;
  const saved = { title: 'Original title', html: '<p>Original review.</p><blockquote>Original quote.</blockquote>', slug: 'original-address', date: '2099-09-23', hour: '09', minute: '00' };
  await fixturePage.exposeFunction('persistFixture', (next) => { Object.assign(saved, next); saves++; editorUrl = 'https://feelandnote-cinema.tistory.com/manage/posts/'; });
  const wrapper = {
    bringToFront: () => fixturePage.bringToFront(),
    url: () => editorUrl,
    goto: async (url) => {
      editorUrl = url.replace('/manage/post/', '/manage/newpost/') + '?type=post'; opens++;
      await fixturePage.setContent('<input id="post-title-inp"><button id="category-btn"><i class="mce-txt">이 영화를 감상한 셀럽</i><i class="mce-caret">더보기</i></button><iframe id="editor-tistory_ifr"></iframe><button id="publish-layer-btn" onclick="document.getElementById(\'panel\').style.display=\'block\'">완료</button><div id="panel" style="display:none"><input id="open20" type="radio" checked><input id="urlPublish"><button class="btn_reserve" onclick="document.getElementById(\'calendar\').style.display=\'block\'"></button><input id="dateHour"><input id="dateMinute"><div id="calendar" style="display:none"><span class="txt_calendar">2099년 9월</span><button class="btn_day" onclick="document.getElementById(\'calendar\').style.display=\'none\'">23</button></div><button id="publish-btn">저장</button></div>');
      await fixturePage.evaluate((state) => {
        document.querySelector('#post-title-inp').value = state.title;
        setTimeout(() => { document.querySelector('#editor-tistory_ifr').contentDocument.body.innerHTML = state.html; }, 80);
        document.querySelector('#urlPublish').value = state.slug;
        document.querySelector('.btn_reserve').textContent = state.date;
        document.querySelector('#dateHour').value = state.hour;
        document.querySelector('#dateMinute').value = state.minute;
        document.querySelector('#publish-btn').onclick = () => window.persistFixture({ title: document.querySelector('#post-title-inp').value, html: document.querySelector('#editor-tistory_ifr').contentDocument.body.innerHTML, slug: document.querySelector('#urlPublish').value, date: document.querySelector('.btn_reserve').textContent, hour: document.querySelector('#dateHour').value, minute: document.querySelector('#dateMinute').value });
      }, saved);
    },
    waitForSelector: (...args) => fixturePage.waitForSelector(...args),
    waitForFunction: (...args) => fixturePage.waitForFunction(...args),
    evaluate: (...args) => fixturePage.evaluate(...args),
    mouse: fixturePage.mouse,
    frames: () => [],
  };
  try {
    const post = { id: 54, name: 'fixture', title: saved.title, at: '2099-09-23 09:00' };
    fs.writeFileSync(path.join(dir, '_meta-fixture.json'), JSON.stringify({ title: 'New title must not be applied' }));
    const original = { ...saved };
    const result = await fillOne(wrapper, null, 54, 'fixture', { dir, post, run: true, body: false, at: '2099-09-23 18:00' });
    assert.equal(saves, 1);
    assert.equal(opens, 2);
    assert.equal(result.at, '2099-09-23 18:00');
    assert.equal(result.title, original.title);
    assert.equal(result.html, original.html);
    assert.equal(result.slug, original.slug);
    assert.equal(result.category, '이 영화를 감상한 셀럽');
    assert.equal(result.comparison.ok, true);
    assert(fs.existsSync(result.backup));
  } finally {
    await fixturePage.close();
    fs.unlinkSync(path.join(dir, '_meta-fixture.json'));
    const backupDir = path.join(dir, '_backup');
    if (fs.existsSync(backupDir)) {
      for (const name of fs.readdirSync(backupDir)) fs.unlinkSync(path.join(backupDir, name));
      fs.rmdirSync(backupDir);
    }
    fs.rmdirSync(dir);
  }
});

test('private restoration refreshes title, body and tags with the future date in exactly one save', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-restore-save-test-'));
  const fixture = await browser.newPage();
  let url = ''; let saves = 0;
  const saved = { title: 'Old title', html: '<p>Old review.</p>', tags: ['old'], slug: 'keep-address', visibility: 'open0', at: null };
  await fixture.exposeFunction('persistRestore', (state) => { Object.assign(saved, state); saves++; url = 'https://feelandnote-cinema.tistory.com/manage/posts/'; });
  const wrapper = {
    bringToFront: () => fixture.bringToFront(), url: () => url,
    goto: async (target) => {
      url = target;
      await fixture.setContent(`<input id="post-title-inp"><button id="category-btn">이 영화를 감상한 셀럽</button>
        <div class="CodeMirror" style="width:600px;height:100px"><textarea style="width:100%;height:100%"></textarea></div>
        <div class="editor_tag"><input id="tagText"></div>
        <button id="publish-layer-btn" onclick="document.querySelector('#panel').style.display='block'">완료</button>
        <div id="panel" style="display:none"><label><input id="open0" type="radio" name="visibility">비공개</label>
        <label><input id="open20" type="radio" name="visibility">공개</label><input id="urlPublish">
        <button class="btn_date on">2026-09-06 23:35</button>
        <button class="btn_date" onclick="if(event.isTrusted) { document.querySelectorAll('.btn_date').forEach(el => el.classList.remove('on')); this.classList.add('on'); }">현재</button>
        <button class="btn_date" onclick="if(event.isTrusted && [...document.querySelectorAll('.btn_date')].some(el => el.textContent === '현재' && el.classList.contains('on'))) setTimeout(() => { document.querySelectorAll('.btn_date').forEach(el => el.classList.remove('on')); this.classList.add('on'); document.querySelector('#reserve').style.display='block'; }, 650)">예약</button>
        <div id="reserve" style="display:none"><button class="btn_reserve" onclick="document.querySelector('#calendar').style.display='block'">2099-09-23</button>
        <input id="dateHour" value="09"><input id="dateMinute" value="00">
        <div id="calendar" style="display:none"><span class="txt_calendar">2099년 9월</span><button class="btn_day" onclick="document.querySelector('#calendar').style.display='none'">23</button></div></div>
        <button id="publish-btn">저장</button></div>`);
      await fixture.evaluate((state) => {
        document.querySelector('#post-title-inp').value = state.title;
        document.querySelector('textarea').value = state.html;
        document.querySelector('.CodeMirror').CodeMirror = { getValue: () => document.querySelector('textarea').value };
        document.querySelector('#urlPublish').value = state.slug;
        document.querySelector('#' + state.visibility).checked = true;
        const tags = [...state.tags];
        const renderTags = () => {
          document.querySelectorAll('.txt_tag').forEach((tag) => tag.remove());
          for (const text of tags) {
            const tag = document.createElement('span'); tag.className = 'txt_tag';
            const label = document.createElement('a'); label.textContent = '#' + text;
            const remove = document.createElement('a'); remove.className = 'btn_delete'; remove.textContent = '삭제';
            remove.onclick = () => { tags.splice(tags.indexOf(text), 1); renderTags(); };
            tag.append(label, remove); document.querySelector('.editor_tag').append(tag);
          }
        };
        renderTags();
        document.querySelector('#tagText').onkeydown = (event) => {
          if (event.key === 'Enter') { tags.push(event.target.value); event.target.value = ''; renderTags(); }
        };
        if (state.at) {
          document.querySelector('#reserve').style.display = 'block';
          document.querySelector('.btn_reserve').textContent = state.at.slice(0, 10);
          document.querySelector('#dateHour').value = state.at.slice(11, 13);
          document.querySelector('#dateMinute').value = state.at.slice(14);
        }
        document.querySelector('#publish-btn').onclick = () => window.persistRestore({
          title: document.querySelector('#post-title-inp').value,
          html: document.querySelector('textarea').value, tags,
          slug: document.querySelector('#urlPublish').value,
          visibility: document.querySelector('input[name=visibility]:checked').id,
          at: document.querySelector('.btn_reserve').textContent + ' ' + document.querySelector('#dateHour').value + ':' + document.querySelector('#dateMinute').value,
        });
      }, saved);
    },
    waitForSelector: (...args) => fixture.waitForSelector(...args),
    waitForFunction: (...args) => fixture.waitForFunction(...args),
    evaluate: (...args) => fixture.evaluate(...args), focus: (...args) => fixture.focus(...args), type: (...args) => fixture.type(...args),
    mouse: fixture.mouse, keyboard: fixture.keyboard, frames: () => [],
  };
  try {
    const post = { id: 1, name: 'fixture', title: saved.title, visibility: 'open0', at: '2026-01-01 09:00' };
    const meta = { title: 'Latest title', tags: ['new'] };
    const html = '<p>Latest review.</p><blockquote>Preserved quotation.</blockquote>';
    fs.writeFileSync(path.join(dir, '_meta-fixture.json'), JSON.stringify(meta));
    fs.writeFileSync(path.join(dir, '_body-fixture.html'), html);
    const result = await setOne(wrapper, post, { dir, run: true, to: 'open20', refreshBody: true,
      cdp: await fixture.createCDPSession(), plannedAt: '2099-09-23 18:00' });
    assert.equal(saves, 1);
    assert.deepEqual(saved, { title: meta.title, html, tags: meta.tags, slug: 'keep-address', visibility: 'open20', at: '2099-09-23 18:00' });
    assert.equal(result.title, meta.title);
    assert.equal(result.at, saved.at);
    assert.equal(result.visibility, 'open20');
    assert(fs.existsSync(result.backup));
  } finally {
    await fixture.close();
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'tistory-restore-save-test-'));
    fs.rmSync(dir, { recursive: true });
  }
});

test('a visible Bad Request challenge fails as a service error before waiting for a missing answer input', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-challenge-service-test-'));
  const fixture = await browser.newPage();
  const input = new PassThrough();
  let stop;
  try {
    await fixture.setContent('<iframe style="width:400px;height:160px" srcdoc="<h1>Bad Request</h1>"></iframe>');
    const frame = fixture.frames().find((item) => item !== fixture.mainFrame());
    let waits = 0;
    const wrapper = { frames: () => [{
      url: () => 'https://dkaptcha.kakao.com/fixture',
      $eval: (...args) => frame.$eval(...args), frameElement: () => frame.frameElement(),
      waitForSelector: () => { waits++; throw new Error('Missing answer input'); },
    }] };
    const fatalLog = new Promise((resolve) => {
      stop = startChallengeSession(wrapper, { directory: dir, input, log: (line) => { if (line.startsWith('CAPTCHA_SERVICE_ERROR:')) resolve(line); } });
    });
    const message = await Promise.race([fatalLog, new Promise((_, reject) => setTimeout(() => reject(new Error('Service error was not detected')), 3000).unref())]);
    assert.match(message, /Bad Request/);
    assert.equal(waits, 0);
    assert.throws(() => throwIfChallengeFailed(wrapper), (error) => error.code === 'CAPTCHA_SERVICE_ERROR');
    assert.equal(stop.pendingId(), null);
    await stop();
    assert.doesNotThrow(() => throwIfChallengeFailed(wrapper));
  } finally {
    await stop?.(); input.destroy(); await fixture.close();
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'tistory-challenge-service-test-'));
    fs.rmSync(dir, { recursive: true });
  }
});

test('three consecutive challenge capture failures end the session instead of waiting indefinitely', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-challenge-failure-test-'));
  const input = new PassThrough();
  let attempts = 0; let stop;
  const wrapper = { frames: () => [{
    url: () => 'https://dkaptcha.kakao.com/fixture',
    frameElement: async () => ({ boundingBox: async () => ({ x: 0, y: 0, width: 300, height: 100 }) }),
    $eval: async () => '인증 문제',
    waitForSelector: async () => { attempts++; throw new Error('input never became visible'); },
  }] };
  try {
    const fatalLog = new Promise((resolve) => {
      stop = startChallengeSession(wrapper, { directory: dir, input, log: (line) => { if (line.startsWith('CAPTCHA_CAPTURE_ERROR:')) resolve(line); } });
    });
    await Promise.race([fatalLog, new Promise((_, reject) => setTimeout(() => reject(new Error('Capture failure was not detected')), 4000).unref())]);
    assert.equal(attempts, 3);
    assert.throws(() => throwIfChallengeFailed(wrapper), (error) => error.code === 'CAPTCHA_CAPTURE_ERROR');
    await new Promise((resolve) => setTimeout(resolve, 600));
    assert.equal(attempts, 3);
  } finally {
    await stop?.(); input.destroy();
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'tistory-challenge-failure-test-'));
    fs.rmSync(dir, { recursive: true });
  }
});

test('a valid challenge capture resets consecutive failure counting and keeps the normal challenge pending', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-challenge-reset-test-'));
  const input = new PassThrough();
  let attempts = 0; let captured = false; let stop;
  const wrapper = {
    frames: () => [{
      url: () => 'https://dkaptcha.kakao.com/fixture',
      frameElement: async () => ({ boundingBox: async () => ({ x: 0, y: 0, width: 300, height: 100 }), screenshot: async () => {} }),
      $eval: async () => captured ? '다음 인증 문제' : '인증 문제',
      waitForSelector: async () => { if (++attempts !== 3) throw new Error('transient capture failure'); },
      waitForFunction: async () => {},
    }],
    screenshot: async () => {},
  };
  try {
    const observed = new Promise((resolve) => {
      stop = startChallengeSession(wrapper, { directory: dir, input, log: (line) => {
        if (line.startsWith('{')) captured = true;
        if (attempts === 5 || line.startsWith('CAPTCHA_CAPTURE_ERROR:')) resolve();
      } });
    });
    await Promise.race([observed, new Promise((_, reject) => setTimeout(() => reject(new Error('Reset test did not finish')), 5000).unref())]);
    assert.equal(captured, true);
    assert.equal(attempts, 5);
    assert.equal(stop.failure(), null);
    assert.doesNotThrow(() => throwIfChallengeFailed(wrapper));
    assert.equal(stop.pendingId(), 1);
  } finally {
    await stop?.(); input.destroy();
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'tistory-challenge-reset-test-'));
    fs.rmSync(dir, { recursive: true });
  }
});

test('full viewport challenge screenshots preserve all four visible iframe corners on a scrolled page', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tistory-challenge-crop-test-'));
  const fixture = await browser.newPage();
  const input = new PassThrough();
  let stop;
  try {
    await fixture.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });
    await fixture.setContent('<style>body{margin:0;height:2000px}iframe{position:absolute;left:180px;top:900px;width:320px;height:240px;border:0}</style><iframe></iframe>');
    const frame = fixture.frames().find((item) => item !== fixture.mainFrame());
    await frame.setContent('<style>body{margin:0;background:red}.q{position:absolute;width:50%;height:50%}.tr{top:0;right:0;background:lime}.bl{bottom:0;left:0;background:blue}.br{bottom:0;right:0;background:yellow}input{position:absolute;top:90px;left:90px;width:80px}</style><div class="q tr"></div><div class="q bl"></div><div class="q br"></div><input id="inpDkaptcha">');
    await fixture.evaluate(() => window.scrollTo(0, 750));
    const wrapper = { screenshot: (...args) => fixture.screenshot(...args), frames: () => [{
      url: () => 'https://dkaptcha.kakao.com/fixture',
      frameElement: () => frame.frameElement(), $eval: (...args) => frame.$eval(...args),
      waitForSelector: (...args) => frame.waitForSelector(...args), waitForFunction: (...args) => frame.waitForFunction(...args),
    }] };
    const captured = new Promise((resolve, reject) => {
      stop = startChallengeSession(wrapper, { directory: dir, input, log: (line) => {
        if (line.startsWith('{')) resolve(JSON.parse(line));
        if (line.startsWith('CAPTCHA_')) reject(new Error(line));
      } });
    });
    const result = await Promise.race([captured, new Promise((_, reject) => setTimeout(() => reject(new Error('Screenshot missing')), 5000).unref())]);
    const pixels = await sharp(result.image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(pixels.info.width, 800);
    assert.equal(pixels.info.height, 600);
    const at = (x, y) => [...pixels.data.subarray((y * pixels.info.width + x) * 3, (y * pixels.info.width + x) * 3 + 3)];
    assert.deepEqual(at(185, 155), [255, 0, 0]);
    assert.deepEqual(at(494, 155), [0, 255, 0]);
    assert.deepEqual(at(185, 384), [0, 0, 255]);
    assert.deepEqual(at(494, 384), [255, 255, 0]);
  } finally {
    await stop?.(); input.destroy(); await fixture.close();
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep + 'tistory-challenge-crop-test-'));
    fs.rmSync(dir, { recursive: true });
  }
});
