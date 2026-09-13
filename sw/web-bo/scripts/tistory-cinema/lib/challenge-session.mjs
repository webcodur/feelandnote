/** Keep one save pending while an operator answers the visible challenge through stdin. */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';

const sessions = new WeakMap();

/** 저장 대기 루프가 화면 인증 서비스 장애를 확인하고 같은 요청을 중단한다. */
export function throwIfChallengeFailed(page) {
  const error = sessions.get(page)?.failure();
  if (error) throw error;
}

export function parseChallengeCommand(line, pendingId, sessionId) {
  const command = JSON.parse(line);
  if (command.session !== undefined && command.session !== sessionId) throw new Error('현재 인증 session이 아니다. 이전 실행의 답을 제출하지 않는다.');
  if (command.capture === true) return command;
  if (!Number.isSafeInteger(command.challenge) || command.challenge !== pendingId) throw new Error('현재 화면의 challenge 번호가 아니다. 최신 캡처를 확인해야 한다.');
  if (typeof command.answer !== 'string' || !command.answer.trim() || command.answer.length > 50) throw new Error('화면에서 확인한 답변 1~50자가 필요하다.');
  return command;
}

export function startChallengeSession(page, { directory, current = () => null, input = process.stdin, log = console.log } = {}) {
  const sessionId = `challenge-${Date.now()}-${randomUUID()}`;
  const dir = path.join(directory, sessionId);
  fs.mkdirSync(dir, { recursive: true });
  const reader = readline.createInterface({ input });
  let sequence = 0, pending = null, lastSignature = null, busy = false, closed = false, captureTask = null, inputTask = null;
  let failures = 0, fatal = null, timer;
  const session = { failure: () => fatal };
  sessions.set(page, session);
  function fail(code, message) {
    if (fatal) return;
    fatal = Object.assign(new Error(`${code}: ${message}`), { code });
    closed = true;
    pending = null;
    clearInterval(timer);
    reader.close();
    log(fatal.message);
  }
  /**
   * 🔴 **프레임이 한 번 안 보인다고 문제를 버리지 않는다.** 캡차 iframe 은 스스로 다시
   *    읽히며 `page.frames()` 에서 잠깐씩 빠진다. 그때마다 `pending` 을 비우면, 답이
   *    하필 그 틈에 도착해 「현재 화면의 challenge 번호가 아니다」로 버려지고 배치가
   *    그 자리에 선다. 오래 사라지면 답 통로를 잠시 멈추고 같은 서명의 복귀만 원래 번호로 받는다.
   */
  const GONE_LIMIT = 8;
  let gone = 0;
  const getFrame = () => page.frames().find((frame) => frame.url().startsWith('https://dkaptcha.kakao.com/'));
  const describe = async (frame) => {
    const visible = await frame.$eval('body', (body) => ({ text: body.innerText,
      images: [...body.querySelectorAll('img')].filter((image) => image.getClientRects().length).map((image) => image.currentSrc || image.src) }));
    const { text, images = [] } = typeof visible === 'string' ? { text: visible } : visible;
    return { text, signature: frame.url() + '\n' + text + '\n' + JSON.stringify(images) };
  };
  async function capture(force = false) {
    if (closed || busy) return;
    const frame = getFrame();
    if (!frame) {
      if (++gone < GONE_LIMIT) return;
      // Keep the original identity while absent. A returning frame must match its signature before an answer can retry.
      return;
    }
    gone = 0;
    busy = true;
    try {
      const visibleBox = await (await frame.frameElement()).boundingBox();
      if (!visibleBox || visibleBox.width <= 0 || visibleBox.height <= 0) return;
      const info = await describe(frame);
      if (closed) return;
      if (/^(?:\d{3}\s+)?(?:Bad Request|Internal Server Error|Service Unavailable|Bad Gateway|Gateway Timeout|Forbidden|Too Many Requests)(?:\s+\d{3})?$/i.test(info.text.trim())) {
        fail('CAPTCHA_SERVICE_ERROR', `화면 인증 서비스가 ${info.text.trim()}를 반환했다. 자동 재시도하지 않는다.`);
        return;
      }
      // Same visible text and images preserve the original identity across frame replacement.
      if (!force && pending && info.signature === lastSignature) return;
      await frame.waitForSelector('#inpDkaptcha', { visible: true, timeout: 5000 });
      await frame.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0), { timeout: 5000 });
      // The challenge panel animates into position. Capture after its final layout and image load.
      await new Promise((resolve) => setTimeout(resolve, 700));
      const box = await (await frame.frameElement()).boundingBox();
      if (!box) return;
      const latest = await describe(frame);
      if (closed) return;
      const id = pending?.signature === latest.signature ? pending.id : ++sequence;
      const file = path.join(dir, `captcha-${id}${force ? '-' + Date.now() : ''}.png`);
      // 실제 Chrome 확대 상태에서는 clip과 element 캡처 모두 잘렸다. 현재 화면 전체를 그대로 남긴다.
      await page.screenshot({ path: file, fullPage: false });
      if ((await describe(frame)).signature !== latest.signature || closed) return;
      pending = { id, signature: latest.signature };
      lastSignature = latest.signature;
      failures = 0;
      log(JSON.stringify({ session: sessionId, challenge: id, image: file, answerFile: path.join(dir, `answer-${id}.txt`), current: current(), question: latest.text }));
    } finally { busy = false; }
  }
  async function captureSafely(force = false) {
    try { await capture(force); }
    catch (error) {
      if (closed) return;
      failures++;
      log(`CHALLENGE_CAPTURE_ERROR: ${error.message}`);
      if (failures >= 3) fail('CAPTCHA_CAPTURE_ERROR', `화면 인증 캡처가 ${failures}회 연속 실패했다: ${error.message}. 자동 재시도하지 않는다.`);
    }
  }
  async function handleLine(line) {
    try {
      if (closed) return;
      if (busy) throw new Error('화면을 캡처하거나 답변을 제출 중이다.');
      const command = parseChallengeCommand(line, pending?.id, sessionId);
      if (command.capture) return await captureSafely(true);
      busy = true;
      try {
        const frame = getFrame();
        const signature = pending.signature;
        if (!frame || (await describe(frame)).signature !== signature) throw new Error('인증 문제가 바뀌었거나 프레임이 없다. 최신 캡처를 확인해야 한다.');
        if (closed) return;
        await frame.focus('#inpDkaptcha');
        await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await frame.type('#inpDkaptcha', command.answer);
        // Korean insertText alone does not trigger this form's keyup validation.
        await page.keyboard.press('End');
        if (await frame.$eval('#btn_dkaptcha_submit', (button) => button.disabled)) throw new Error('답변 제출 단추가 활성화되지 않았다.');
        if (closed) return;
        if ((await describe(frame)).signature !== signature) throw new Error('답 입력 중 인증 문제가 바뀌었다. 새 문제에는 새 답이 필요하다.');
        if (closed) return;
        await frame.click('#btn_dkaptcha_submit');
        pending = null;
        if (!closed) log(JSON.stringify({ session: sessionId, submitted: command.challenge }));
      } finally { busy = false; }
    } catch (error) { if (!closed) log(`CHALLENGE_INPUT_ERROR: ${error.message}`); }
  }
  reader.on('line', (line) => {
    if (closed) return;
    if (inputTask) { log('CHALLENGE_INPUT_ERROR: 이전 답변을 처리 중이다.'); return; }
    inputTask = handleLine(line).finally(() => { inputTask = null; });
  });
  reader.on('close', () => { if (!closed) fail('CAPTCHA_INPUT_CLOSED', '인증 답변 입력이 종료됐다. 저장 결과를 추측하거나 자동 재시도하지 않는다.'); });
  const onInputError = (error) => fail('CAPTCHA_INPUT_ERROR', error.message);
  input.on('error', onInputError);
  reader.on('error', onInputError);
  timer = setInterval(() => {
    if (captureTask) return;
    captureTask = captureSafely().finally(() => { captureTask = null; });
  }, 500);
  const stop = async () => {
    closed = true; clearInterval(timer); reader.close(); await captureTask; await inputTask;
    input.off('error', onInputError);
    if (sessions.get(page) === session) sessions.delete(page);
  };
  /**
   * 지금 답을 기다리는 문제 번호. 답을 넣는 쪽이 **세션이 실제로 쥔 번호**를 볼 수 있어야
   * 한다. 로그를 읽어 짐작하면 화면이 한 번 다시 찍히는 것만으로 어긋나고, 그때부터 답이
   * 전부 거절된다(26.09.06 비공개 전환 배치가 두 번 여기서 멈췄다).
   */
  stop.pendingId = Object.assign(() => closed || gone >= GONE_LIMIT ? null : pending?.id ?? null, { session: sessionId, directory: dir });
  stop.session = sessionId;
  stop.directory = dir;
  stop.failure = () => fatal;
  return stop;
}
