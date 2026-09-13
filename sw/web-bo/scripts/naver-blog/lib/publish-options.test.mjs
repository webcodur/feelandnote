import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { assertPublishOptions } from './publish-options.mjs';
import { createExistingEditor } from './existing-editor.mjs';

function optionDocument(options = {}) {
  const scrapMode = options.missingScrapMode ? null : {
    textContent: options.scrapMode ?? '링크허용',
    disabled: false,
    matches: () => false,
    closest: () => options.scrapModeDisabled ? {} : null,
  };
  const scrapContainer = options.missingScrapContainer ? null : {
    querySelector(selector) {
      assert.equal(selector, 'a');
      return scrapMode;
    },
  };
  const input = (id, { checked = true, disabled = false, fieldsetDisabled = false, ariaDisabled = false } = {}) => ({
    id, checked, disabled,
    matches: () => disabled || fieldsetDisabled,
    closest: (selector) => selector === 'li' ? id === 'publish-option-scrap' ? scrapContainer : null : ariaDisabled ? {} : null,
  });
  const search = input('publish-option-search', options.search);
  const scrap = input('publish-option-scrap', options.scrap);
  const outside = input('publish-option-outside', options.outside);
  const publicInput = input('public-option', options.public);
  const searches = options.missingSearch ? [] : options.duplicateSearch ? [search, search] : [search];
  const radios = options.duplicatePublic ? [publicInput, publicInput] : [publicInput];
  const labels = options.missingLabel ? [] : [{ htmlFor: publicInput.id, textContent: options.publicLabel ?? '전체공개' }];
  return {
    querySelectorAll(selector) {
      if (selector === '#publish-option-search') return searches;
      if (selector === '#publish-option-scrap') return options.missingScrap ? [] : options.duplicateScrap ? [scrap, scrap] : [scrap];
      if (selector === '#publish-option-outside') return options.missingOutside ? [] : options.duplicateOutside ? [outside, outside] : [outside];
      if (selector === '[class*=option_open_type] input[type=radio]') return radios;
      if (selector === 'label') return labels;
      throw new Error(`예상하지 않은 DOM 조회: ${selector}`);
    },
  };
}

function readOptions(fn, options) {
  return vm.runInNewContext(`(${fn.toString()})()`, { document: optionDocument(options) });
}

test('활성인 검색허용·전체공개·링크 공유·외부 공유만 통과한다', async () => {
  const page = { evaluate: (fn) => readOptions(fn) };
  const result = await assertPublishOptions(page);
  assert.equal(result.searchChecked, true);
  assert.equal(result.publicLabel, '전체공개');
  assert.equal(result.scrapChecked, true);
  assert.equal(result.scrapMode, '링크허용');
  assert.equal(result.outsideChecked, true);
});

const invalidSharing = [
  ['블로그·카페 공유 비허용', { scrap: { checked: false } }],
  ['블로그·카페 공유 비활성', { scrap: { disabled: true } }],
  ['블로그·카페 공유 옵션 누락', { missingScrap: true }],
  ['블로그·카페 공유 옵션 중복', { duplicateScrap: true }],
  ['외부 공유 비허용', { outside: { checked: false } }],
  ['외부 공유 비활성', { outside: { disabled: true } }],
  ['외부 공유 옵션 누락', { missingOutside: true }],
  ['외부 공유 옵션 중복', { duplicateOutside: true }],
  ['본문 공유 허용', { scrapMode: '본문허용' }],
  ['공유 방식 누락', { missingScrapMode: true }],
  ['공유 방식 컨테이너 누락', { missingScrapContainer: true }],
  ['공유 방식 비활성', { scrapModeDisabled: true }],
];
const invalidOptions = [
  ['검색 비허용', { search: { checked: false } }],
  ['검색 체크가 켜져 있어도 disabled', { search: { disabled: true } }],
  ['상위 fieldset이 disabled', { search: { fieldsetDisabled: true } }],
  ['aria-disabled', { search: { ariaDisabled: true } }],
  ['검색 옵션 누락', { missingSearch: true }],
  ['검색 옵션 중복', { duplicateSearch: true }],
  ['비공개', { publicLabel: '비공개' }],
  ['공개범위 미선택', { public: { checked: false } }],
  ['공개범위 중복 선택', { duplicatePublic: true }],
  ['공개범위 비활성', { public: { disabled: true } }],
  ['공개 라벨 누락', { missingLabel: true }],
  ...invalidSharing,
];
for (const [name, options] of invalidOptions) {
  test(`${name}이면 저장을 거부한다`, async () => {
    const page = { evaluate: (fn) => readOptions(fn, options) };
    await assert.rejects(assertPublishOptions(page), /발행 중단:/);
  });
}

// 브라우저 초기화를 제외한 실제 발행 분기를 실행한다. 편집 동작만 대역으로 바꾸고,
// 저장 직전 검사·catch·다음 글 진행·성공 기록은 publish-drafts.mjs의 코드를 그대로 쓴다.
const source = fs.readFileSync(new URL('../publish-drafts.mjs', import.meta.url), 'utf8');
const branchStart = source.indexOf("const frameOnly = args.includes('--frame-only');");
assert.ok(branchStart > 0, '실제 발행 분기 시작점을 찾지 못했다');
const branchEnd = /\r?\n}\r?\n\r?\nexport \{/.exec(source);
assert.ok(branchEnd && branchEnd.index > branchStart, 'main 발행 분기의 종료점을 찾지 못했다');
const branches = source.slice(branchStart, branchEnd.index);

async function runBranch(kind, options, { dry = false, frameCase, frameArgs } = {}) {
  const events = [];
  const drafts = [1, 2].map((i) => ({
    target: `/celeb/test-${i}`, title: `인물 ${i}이 읽은 책`, body: '본문',
    tags: ['책', '독서', '인물'], category: '작가', status: 'draft',
    ...(kind === 'new' ? {} : { logNo: `22440000000${i}` }),
    ...(frameCase === 'already-framed' ? { framed: true } : {}),
  }));
  let bodyReads = 0;
  const noOp = async () => {};
  const page = {
    goto: async (url) => events.push(['navigate', url]),
    waitForSelector: noOp,
    waitForFunction: noOp,
    removeAllListeners: noOp,
    on: noOp,
    evaluate: async (fn) => {
      if (fn.name === 'readPublishOptions') {
        events.push(['check-options']);
        return readOptions(fn, options);
      }
      return kind === 'frame' ? 2 : { x: 0, y: 0 };
    },
    $: async (selector) => ({
      click: async () => events.push(['panel', selector]),
      boundingBox: async () => ({ x: 100, y: 100, width: 2, height: 2 }),
    }),
    mouse: { click: async (x) => events.push([x === 101 ? 'confirm' : 'editor-click']) },
    keyboard: { down: noOp, up: noOp, press: noOp },
    screenshot: async () => events.push(['screenshot']),
  };
  const stop = new Error('test process exit');
  const processStub = { exitCode: 0, exit(code) { this.exitCode = code; throw stop; } };
  let opened = 0, frameContent;
  const frameState = { inputs: [], date: '2026. 10. 01', hour: '09', minute: '00' };
  const reservation = { row: 'reserved post\n2026.10.01 09:00', count: 2 };
  const createExistingEditor = () => ({
    openTarget: async (target) => {
      events.push(['navigate', target.logNo]);
      opened++;
      frameContent = { title: target.title, body: ['본문'], images: frameCase === 'no-images' ? 0 : 1, dividers: 1 };
      const result = structuredClone({ content: frameContent, state: frameState, reservation });
      if (opened > 1 && frameCase === 'reopened-content-changed') result.content.body[0] += '!';
      if (opened > 1 && frameCase === 'reopened-schedule-changed') result.state.hour = '10';
      return result;
    },
    content: async () => ({ ...frameContent, ...(frameCase === 'content-changed' ? { body: ['changed'] } : {}) }),
    settings: async () => ({ ...frameState, ...(frameCase === 'settings-changed' ? { hour: '10' } : {}) }),
    imageSizes: async (count, expected = null) => {
      events.push(['sizes', expected]);
      if (expected && (frameCase === 'sizes-unfinished' || (frameCase === 'reopened-sizes-changed' && opened > 1))) throw new Error('Image sizes did not become ready');
      return expected ?? [[120, 176]];
    },
    click: async (selector) => events.push([selector.includes('confirm_btn') ? 'confirm' : 'panel', selector]),
  });
  const context = {
    args: kind === 'frame' ? ['--frame-only', ...(frameArgs ?? [])] : kind === 'rewrite' ? ['--rewrite', ...drafts.map((d) => d.logNo)] : [],
    drafts, posts: [], dry, page, assertPublishOptions, createExistingEditor, wait: noOp,
    cdp: { send: noOp }, browser: { disconnect: noOp }, launched: false,
    process: processStub, console: { log: (...parts) => events.push(['log', parts.join(' ')]) },
    ensureVisible: noOp, applyPhotoFrame: async () => { events.push(['frame']); return true; }, isDivider: () => false,
    isQuote: () => false, isImg: () => false, IMG_RE: /^\[img:(.*)\]$/,
    strip: (text) => text, typeLine: noOp, typeTitle: noOp, dismissResume: noOp,
    bodyParas: async () => kind === 'rewrite' && bodyReads++ < 2 ? [] : ['본문'],
    limit: 2, onlyTarget: null, scheduling: kind === 'new', atTime: '09:00',
    slots: () => [new Date(), new Date()], preflight: async () => [],
    selectCategory: async () => true, addTags: async () => 3,
    setSchedule: async () => { events.push(['schedule']); return '2026. 10. 01 09:00'; },
    saveAll: () => events.push(['save', structuredClone(drafts)]),
    SC: 'unused',
    fetch: async () => { throw new Error('회귀검사에서 외부 요청은 금지한다'); },
  };
  try {
    await vm.runInNewContext(`(async () => { ${branches}\n })()`, context);
  } catch (error) {
    if (error !== stop) throw error;
  }
  return { drafts, events, exitCode: processStub.exitCode };
}

for (const kind of ['new', 'rewrite', 'frame']) {
  for (const [name, options] of [
    ...invalidOptions.filter(([name]) => ['검색 비허용', '검색 체크가 켜져 있어도 disabled', '비공개'].includes(name)),
    ...invalidSharing,
  ]) {
    test(`${kind}: ${name}이면 실제 분기가 확인 클릭·성공 기록·다음 글 진행을 막는다`, async () => {
      const { drafts, events, exitCode } = await runBranch(kind, options);
      assert.equal(events.filter(([type]) => type === 'check-options').length, 1);
      assert.equal(events.filter(([type]) => type === 'confirm').length, 0);
      assert.equal(events.filter(([type]) => type === 'navigate').length, 1);
      assert.equal(exitCode, 1);
      assert.ok(drafts.every((draft) => !draft.framed && !draft.rewrittenAt && !draft.publishedAt));
      const saves = events.filter(([type]) => type === 'save');
      assert.equal(saves.length, kind === 'new' ? 1 : 0);
      if (kind === 'new') {
        assert.equal(drafts[0].status, 'error');
        assert.equal(drafts[1].status, 'draft');
        assert.ok(events.findIndex(([type]) => type === 'schedule') < events.findIndex(([type]) => type === 'check-options'));
      }
    });
  }
}

test('신규 --dry도 비활성 검색 옵션을 성공으로 보고하지 않는다', async () => {
  const { events, exitCode } = await runBranch('new', { search: { disabled: true } }, { dry: true });
  assert.equal(exitCode, 1);
  assert.equal(events.filter(([type]) => type === 'confirm' || type === 'screenshot').length, 0);
  assert.ok(!events.some(([type, text]) => type === 'log' && text.includes('DRY-OK')));
});

test('액자는 저장 후 재열기까지 보존되어야 완료 표시를 남긴다', async () => {
  const { drafts, events, exitCode } = await runBranch('frame', {});
  assert.equal(exitCode, 0);
  assert.ok(drafts.every(d => d.framed));
  const saves = events.flatMap(([type], i) => type === 'save' ? [i] : []);
  assert.equal(saves.length, 2);
  assert.equal(events.slice(0, saves[0]).filter(([type]) => type === 'navigate').length, 2);
  const sizes = events.slice(0, saves[0]).filter(([type]) => type === 'sizes');
  assert.equal(sizes.length, 3);
  assert.equal(JSON.stringify(sizes.map(([, expected]) => expected)), '[null,[[160,216]],[[160,216]]]');
});

for (const frameCase of ['content-changed', 'settings-changed', 'sizes-unfinished', 'reopened-content-changed', 'reopened-schedule-changed', 'reopened-sizes-changed']) {
  test(`액자 ${frameCase}: 첫 차이에서 중단하고 완료 표시를 남기지 않는다`, async () => {
    const { drafts, events, exitCode } = await runBranch('frame', {}, { frameCase });
    assert.equal(exitCode, 1);
    assert.ok(drafts.every(d => !d.framed));
    assert.equal(events.filter(([type]) => type === 'save').length, 0);
    assert.equal(events.filter(([type]) => type === 'confirm').length, frameCase.startsWith('reopened-') ? 1 : 0);
    assert.equal(events.filter(([type]) => type === 'frame').length, 1);
  });
}

test('명시한 글도 이미 액자를 적용했다면 다시 열지 않는다', async () => {
  const { events, exitCode } = await runBranch('frame', {}, { frameCase: 'already-framed', frameArgs: ['224400000001'] });
  assert.equal(exitCode, 0);
  assert.ok(!events.some(([type]) => ['navigate', 'frame', 'confirm', 'save'].includes(type)));
});

test('없는 글 번호는 다른 글을 열기 전에 거부한다', async () => {
  const { events, exitCode } = await runBranch('frame', {}, { frameArgs: ['224499999999'] });
  assert.equal(exitCode, 1);
  assert.ok(!events.some(([type]) => ['navigate', 'frame', 'confirm', 'save'].includes(type)));
});

test('사진 0장인 글은 저장하거나 액자 완료로 표시하지 않는다', async () => {
  const { drafts, events, exitCode } = await runBranch('frame', {}, { frameCase: 'no-images' });
  assert.equal(exitCode, 0);
  assert.ok(drafts.every(d => !d.framed));
  assert.ok(!events.some(([type]) => ['frame', 'confirm', 'save'].includes(type)));
});

test('발행 설정은 사진 편집기 알림만 제외하고 다른 익명 입력은 보존한다', async () => {
  const input = (id, photoAlert = false) => ({
    id, value: 'on', checked: false, disabled: false,
    closest: selector => selector === '.npe_alert_btn_hide' && photoAlert ? {} : null,
  });
  const named = input('publish-option-search');
  const anonymous = input('');
  let inputs = [named, anonymous];
  const document = {
    querySelectorAll: selector => selector === 'input[type=checkbox],input[type=radio]' ? inputs : [],
    querySelector: () => null,
  };
  const editor = createExistingEditor({
    evaluate: fn => vm.runInNewContext(`(${fn.toString()})()`, { document }),
  });
  const before = JSON.stringify(await editor.settings());
  inputs = [named, anonymous, input('', true)];
  assert.equal(JSON.stringify(await editor.settings()), before);
  inputs = [named, anonymous, input('')];
  assert.notEqual(JSON.stringify(await editor.settings()), before);
});

test('사진 크기는 모든 이미지의 로딩과 가로·세로 처리가 끝날 때까지 기다린다', async () => {
  const photo = (width, height, complete = true) => ({ naturalWidth: width, naturalHeight: height, complete });
  const candidates = [
    [photo(120, 176), photo(190, 255)],
    [photo(160, 176), photo(190, 255)],
    [photo(160, 216, false), photo(190, 255)],
    [photo(160, 216), photo(190, 255)],
  ];
  const checks = [];
  let images;
  const editor = createExistingEditor({
    waitForFunction: async (fn, options, value) => {
      assert.equal(options.timeout, 30000);
      for (images of candidates) {
        const ready = vm.runInNewContext(`(${fn.toString()})(value)`, { value, document: { querySelectorAll: () => images } });
        checks.push(ready);
        if (ready) return;
      }
      throw new Error('Timeout');
    },
    $$eval: async (selector, fn) => {
      assert.equal(selector, '.se-component.se-image img.se-image-resource');
      return fn(images);
    },
  });
  assert.deepEqual(await editor.imageSizes(2, [[160, 216], [190, 255]]), [[160, 216], [190, 255]]);
  assert.deepEqual(checks, [false, false, false, true]);
});
