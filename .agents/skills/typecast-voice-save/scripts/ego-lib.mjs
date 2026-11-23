// ego 런타임 안에서 import해 쓰는 타입캐스트 스튜디오 조작 함수. page는 ego Page다.
export const CDN = "https://cdn.typecast.ai/data/s/";
const ED = '[contenteditable="true"]';

function chunks(b) {
  const out = {};
  for (let o = 12; o + 8 <= b.length; ) {
    const n = b.readUInt32LE(o + 4);
    out[b.toString("ascii", o, o + 4)] = { o: o + 8, n: Math.min(n, b.length - o - 8) };
    o += 8 + n + (n & 1);
  }
  return out;
}

export function wavInfo(b) {
  const c = chunks(b), f = c["fmt "];
  if (!f || !c.data) return null;
  return { rate: b.readUInt32LE(f.o + 4), channels: b.readUInt16LE(f.o + 2), sec: +(c.data.n / b.readUInt32LE(f.o + 8)).toFixed(2) };
}

// 같은 형식의 wav 여러 개를 이어 붙인다(긴 문장이 여러 조각으로 생성될 때).
export function joinWav(bufs) {
  if (bufs.length === 1) return bufs[0];
  const f = chunks(bufs[0])["fmt "];
  const fmt = bufs[0].subarray(f.o - 8, f.o + f.n);
  const datas = bufs.map((b) => { const d = chunks(b).data; return b.subarray(d.o, d.o + d.n); });
  const len = datas.reduce((s, d) => s + d.length, 0);
  const head = Buffer.alloc(12); head.write("RIFF", 0); head.writeUInt32LE(4 + fmt.length + 8 + len, 4); head.write("WAVE", 8);
  const dh = Buffer.alloc(8); dh.write("data", 0); dh.writeUInt32LE(len, 4);
  return Buffer.concat([head, fmt, dh, ...datas]);
}

// 작업 공간을 열고 fn이 끝나면(실패해도) 닫는다.
export async function withTask(name, fn) {
  const task = await taskSpace(name);
  try { return await fn(task); } finally { await task.finish({ keep: [] }).catch(() => {}); }
}

export async function openProject(task, url) {
  const page = task.page("p1");
  await page.goto(url, { timeout: 60000 });
  if (await ensureLogin(page)) await page.goto(url, { timeout: 60000 });
  await page.waitForSelector('button[aria-label="Play"]', { timeout: 30000 });
  return page;
}

// 로그인이 풀려 있으면 ego 프로필에 이미 로그인된 구글 계정으로 다시 들어간다(26.11.23 사용자: 사이트마다 로그인은 스크립트가 한다).
// 누르는 것은 「구글로 계속하기」와 구글 계정 고르기뿐이다. 비밀번호·2단계 인증·권한 동의·타입캐스트 회원가입 화면이 나오면 멈추고 알린다(그 단계는 사람이 한다).
// 화면 구조(26.11.23 실측): 로그인이 풀리면 studio.typecast.ai/sign-in 으로 넘어가고, 단추와 회원가입 칸은 다른 도메인 iframe(accounts.typecast.ai) 안에 있다.
// 그래서 page.evaluate(최상위 문서만 본다)로는 못 찾고 snapshot·text 선택자(iframe까지 찾는다)로 본다. 구글 로그인은 팝업 창으로 뜬다.
// 반환: 다시 로그인했으면 true(원래 주소를 다시 연다), 이미 로그인돼 있었으면 false
export async function ensureLogin(page) {
  const ready = () => page.evaluate(() => !!document.querySelector('button[aria-label="Play"]')).catch(() => false);
  const view = async () => {
    if (await ready()) return "ready";
    if (!(await page.url()).includes("/sign-in")) return "loading";
    const s = await page.snapshot().catch(() => "");
    if (s.includes("birth.year")) return "signup";
    return s.includes("구글로 계속하기") ? "login" : "loading";
  };
  const SIGNUP = "구글 로그인 뒤 타입캐스트 회원가입 화면(생년월일·휴대폰 인증)이 떴다. ego 프로필의 구글 계정은 타입캐스트 회원이 아니다. 타입캐스트에 쓰던 로그인 방식으로 사람이 ego에서 한 번 로그인해야 한다(스크립트는 가입하지 않는다)";
  let s = "loading";
  for (let t = 0; t < 30 && s === "loading"; t++) { s = await view(); if (s === "loading") await page.waitForTimeout(1000); }
  if (s === "ready") return false;
  if (s === "signup") throw new Error(SIGNUP);
  if (s !== "login") throw new Error("스튜디오도 로그인 화면도 30초 안에 뜨지 않는다");
  console.error("타입캐스트: 로그인이 풀려 있어 구글 계정으로 다시 들어간다");
  const popup = page.waitForEvent("popup", { timeout: 15000 }).catch(() => null);
  await page.click("text=구글로 계속하기", { label: "continue with google" });
  const g = await popup;
  if (g) await googlePopup(g);
  for (let t = 0; t < 60; t++) {
    s = await view();
    if (s === "ready") return true;
    if (s === "signup") throw new Error(SIGNUP);
    await page.waitForTimeout(1000);
  }
  throw new Error(`구글 로그인 뒤 60초 안에 스튜디오가 뜨지 않는다(마지막 화면: ${s === "login" ? "타입캐스트 로그인 화면" : "읽는 중"}, 구글 팝업 ${g ? "닫힘" : "안 뜸"})`);
}

// 구글 로그인 팝업: 계정이 하나면 고르고, 팝업이 스스로 닫힐 때까지 기다린다. 그 밖의 화면은 사람 몫이다.
async function googlePopup(g) {
  for (let t = 0, gone = 0, picked = false; t < 60; t++) {
    let s;
    try {
      s = await g.evaluate(() => ({
        path: location.host + location.pathname,
        ids: document.querySelectorAll("[data-identifier]").length,
        pw: !!document.querySelector('input[type="password"]'),
      }));
      gone = 0;
    } catch {
      if (++gone >= 3) return; // 팝업이 닫혔다(로그인이 끝났다)
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    const google = s.path.startsWith("accounts.google.com");
    if (google && s.pw) throw new Error("구글이 비밀번호를 묻는다. ego 프로필에서 사람이 구글에 다시 로그인해야 한다(스크립트는 비밀번호를 넣지 않는다)");
    if (google && /\/challenge\//.test(s.path)) throw new Error("구글 2단계 인증 화면에서 멈췄다. ego 프로필에서 사람이 한 번 처리해야 한다");
    if (google && /\/oauth\/(id|consent|v2\/consentsummary)/.test(s.path)) throw new Error("구글이 타입캐스트에 정보 제공 동의를 새로 묻는다(처음 연결하는 계정이다). 타입캐스트에 쓰던 계정이 맞는지 사람이 확인하고 처리해야 한다");
    if (google && !picked && /accountchooser/.test(s.path) && s.ids) {
      if (s.ids !== 1) throw new Error("구글 계정 고르기에 계정이 여럿이다. 사람이 한 번 고른다");
      await g.click("[data-identifier]", { label: "pick google account" });
      picked = true;
    } else if (google && t > 20) throw new Error(`구글 확인 화면(${s.path})에서 멈췄다. ego 프로필에서 사람이 한 번 처리해야 한다`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("구글 로그인 팝업이 60초 안에 끝나지 않는다");
}

// 처음부터 끝까지 재생하고, 그동안 새로 받은 음원을 받은 순서대로 내려받는다.
// 요청 기록 칸은 기본 250개라 광고·통계 요청에 금방 찬다. 재생마다 비운다.
export async function playAndCollect(page) {
  await page.evaluate(() => { performance.setResourceTimingBufferSize(5000); performance.clearResourceTimings(); });
  await page.click('button[aria-label="Play"]', { label: "play script" });
  await page.waitForSelector('button[aria-label="Stop"]', { timeout: 60000 });
  await page.waitForSelector('button[aria-label="Play"]', { timeout: 15 * 60000 });
  const urls = await page.evaluate((CDN) => {
    const seen = new Set();
    return performance.getEntriesByType("resource")
      .filter((e) => e.name.startsWith(CDN)).sort((a, b) => a.startTime - b.startTime).map((e) => e.name)
      .filter((u) => { const k = u.split("?")[0]; return seen.has(k) ? false : seen.add(k); });
  }, CDN);
  const bufs = [];
  for (const u of urls) {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`음원 받기 실패 HTTP ${r.status}`);
    bufs.push(Buffer.from(await r.arrayBuffer()));
  }
  return bufs;
}

// 계정 단위 생성 한도 알림이 떠 있는가(26.11.22: 일꾼 셋이 동시에 받다 걸림. 크레딧과는 무관).
export async function rateLimited(page) {
  return page.evaluate(() => document.body.innerText.includes("생성 한도를 초과"));
}

export async function countParagraphs(page) {
  return page.evaluate((ED) => document.querySelector(ED)?.querySelectorAll("p").length ?? null, ED);
}

// 대본 칸에 문단이 여럿 남아 있을 수 있다(26.11.23 다섯 문단). 첫 문단을 눌러 전체 선택 뒤 새 문장으로 바꾸면 한 문단이 된다.
async function setText(page, text) {
  await page.click(`${ED} p >> nth=0`, { label: "focus script" });
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(text.replace(/\s*\n\s*/g, " ").trim());
}

const currentVoice = (page) => page.evaluate((ED) => document.querySelector(`${ED} [role=group]`)?.innerText.trim(), ED);

async function setVoice(page, name) {
  if ((await currentVoice(page)) === name) return;
  await page.click(`${ED} [role=group]`, { label: "open voice picker" });
  await page.waitForSelector('[role=dialog] button[aria-label="보이스 찾기"]', { timeout: 10000 });
  await page.click('[role=dialog] button[aria-label="보이스 찾기"]', { label: "open voice search" });
  await page.fill("[role=dialog] input[type=search]", name);
  const pick = (n) => {
    const li = [...document.querySelectorAll("[role=dialog] li")].find((x) => x.querySelector("button")?.innerText.split("\n")[0].trim() === n);
    if (li) li.querySelector("button").click();
    return !!li;
  };
  let found = false;
  for (let i = 0; i < 16 && !found; i++) { await page.waitForTimeout(500); found = await page.evaluate(pick, name); }
  if (!found) { await page.press("body", "Escape"); throw new Error(`목소리 「${name}」를 찾지 못했다`); }
  await page.waitForFunction(({ ED, n }) => document.querySelector(`${ED} [role=group]`)?.innerText.trim() === n, { ED, n: name }, { timeout: 10000 });
}

async function setEmotion(page, name) {
  await page.click('button[aria-label="감정"]', { label: "open emotion list" });
  await page.waitForFunction(() => [...document.querySelectorAll("[role=dialog]")].some((d) => /커스텀 감정/.test(d.innerText)), undefined, { timeout: 5000 });
  const r = await page.evaluate((name) => {
    const d = [...document.querySelectorAll("[role=dialog]")].find((x) => /커스텀 감정/.test(x.innerText));
    const el = [...d.querySelectorAll("button,[role=option],[role=radio],div,span")].find((e) => e.children.length <= 2 && e.innerText.trim() === name);
    if (el) { el.click(); return { ok: true }; }
    return { ok: false, options: [...new Set(d.innerText.split("\n").map((s) => s.trim()).filter(Boolean))] };
  }, name);
  await page.waitForTimeout(300);
  await page.press("body", "Escape");
  if (!r.ok) throw new Error(`감정 「${name}」이 없다. 고를 수 있는 것: ${r.options.join(", ")}`);
}

async function setNumber(page, label, value) {
  // 「일반」 감정은 강도 칸이 없다.
  if (!(await page.evaluate((l) => !!document.querySelector(`button[aria-label="${l}"]`), label))) return;
  await page.click(`button[aria-label="${label}"]`, { label: `open ${label}` });
  await page.waitForSelector(`input[aria-label="${label}"]`, { timeout: 5000 });
  await page.fill(`input[aria-label="${label}"]`, String(value));
  await page.press(`input[aria-label="${label}"]`, "Enter");
  await page.waitForTimeout(300);
  await page.press("body", "Escape");
  await page.waitForTimeout(200);
}

// 한 줄을 편집기에 넣고 목소리·감정·강도·속도·피치를 맞춘 뒤, 화면에 반영된 값을 돌려준다.
export async function applyLine(page, L) {
  await setText(page, L.text);
  await setVoice(page, L.voice);
  await page.click(`${ED} p >> nth=0`, { label: "focus script" });
  await setEmotion(page, L.emotion);
  await setNumber(page, "강도", L.intensity);
  await setNumber(page, "속도", L.speed);
  await setNumber(page, "피치", L.pitch);
  const ui = await page.evaluate(() => Object.fromEntries(["감정", "강도", "속도"].map((l) => [l, document.querySelector(`button[aria-label="${l}"]`)?.innerText.replace(/\s+/g, "")])));
  const want = { 감정: L.emotion, 강도: L.intensity, 속도: L.speed };
  const off = Object.keys(want).filter((k) => ui[k] !== undefined && (k === "감정" ? ui[k] !== want[k] : parseFloat(ui[k]) !== Number(want[k])));
  if (off.length) throw new Error(`화면 값이 다르다: ${off.map((k) => `${k} ${ui[k]}≠${want[k]}`).join(", ")}`);
}
