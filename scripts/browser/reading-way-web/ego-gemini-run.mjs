// Gemini 웹챗에서 export-packets가 만든 요청 묶음을 보내 한국어 원고와 문장별 출처표를 회수한다.
// 실행: ego-browser nodejs -e "await import('file:///C:/project/feelandnote/scripts/browser/reading-way-web/ego-gemini-run.mjs?job=<ABSOLUTE_JSON>')"
// 작업 JSON: { slug, profileId, modelPref?: "auto"|"carbon"|"neon", packetPath, outDir?, askSources?: boolean, timeoutMs?: number }
const fs = await import('node:fs/promises')
const path = await import('node:path')
const q = new URL(import.meta.url).searchParams
const JOB = q.get('job')
if (!JOB) throw new Error('missing ?job=<ABSOLUTE_JSON>')

const job = JSON.parse(await fs.readFile(JOB, 'utf8'))
const slug = job.slug
const profileId = job.profileId
const modelPref = job.modelPref || 'auto'
const packetPath = job.packetPath
const outDir = (job.outDir || 'C:/Users/webco/AppData/Local/Temp/feelandnote/rw-chrome/web').replace(/\/+$/, '')
const askSources = job.askSources !== false
const timeoutMs = Number(job.timeoutMs) || 1620000
const resumeUrl = job.resumeUrl || null
const SENDS_LOG = 'C:/Users/webco/AppData/Local/Temp/feelandnote/rw-chrome/web-sends.jsonl'

const INSTRUCTION = '아래 요청과 룰북, 참조 링크로 직접 조사하고 독서 방식 원고를 완성해주세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요. 개별 책 감상을 나열하지 말고 독서 방식 자체가 하나의 스토리가 되게 쓰며, 상투적 요약 문구(AI SLOP)를 피해주세요. 지정한 JSON 코드 블록 하나로 주세요.\n\n'
const SOURCE_PROMPT = '본문은 그대로 두고 각 문장이 근거로 삼은 출처 URL을 문장별로 표로 주세요. 실제로 열람한 출처와 그 출처 원문의 해당 대목도 함께 적어 주세요. 출처가 없는 문장은 ‘없음’이라고 적어 주세요.'

function extractJsonWithKo(text, targetSlug) {
  const candidates = []
  for (const m of String(text || '').matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    candidates.push(m[1].trim())
  }
  const s = String(text || '')
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '{') continue
    let depth = 0
    let inStr = false
    let esc = false
    for (let j = i; j < s.length; j++) {
      const ch = s[j]
      if (inStr) {
        if (esc) esc = false
        else if (ch === '\\') esc = true
        else if (ch === '"') inStr = false
      } else {
        if (ch === '"') inStr = true
        else if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) {
            candidates.push(s.slice(i, j + 1))
            break
          }
        }
      }
    }
  }
  for (const raw of candidates) {
    try {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object' && typeof obj.ko === 'string') {
        if (!targetSlug || !obj.slug || obj.slug === targetSlug) return obj
      }
    } catch {}
  }
  return null
}

await fs.mkdir(outDir, { recursive: true })
const tag = Date.now().toString(36)
let task
let res = { ok: false, slug, profileId, mode: null, koLen: 0, sourcesLen: 0, why: 'unknown', url: null }

try {
  const rawPacket = await fs.readFile(packetPath, 'utf8')
  const fullPrompt = rawPacket.startsWith('아래 요청과') ? rawPacket : INSTRUCTION + rawPacket

  task = await taskSpace(`rw-gem-${slug}-${tag}`, { profileId })
  const page = (await task.pages())[0] ?? (await task.newPage())
  await page.goto(resumeUrl || 'https://gemini.google.com/app?hl=ko', { timeout: 45000 })
  await page.waitForFunction(
    () => Boolean(document.querySelector('rich-textarea div[contenteditable="true"]')) || /google\.com\/sorry|accounts\.google\.com/.test(location.href),
    undefined,
    { timeout: 20000 },
  ).catch(() => {})
  await page.waitForTimeout(1500)

  const preCheck = await page.evaluate(() => ({
    url: location.href,
    sorry: /google\.com\/sorry/.test(location.href),
    signIn: /accounts\.google\.com/.test(location.href),
    hasBox: Boolean(document.querySelector('rich-textarea div[contenteditable="true"]')),
    existingResponses: document.querySelectorAll('model-response').length,
    account: document.querySelector('a[aria-label*="Google"], a[aria-label*="@"]')?.getAttribute('aria-label')?.replace(/\s+/g, ' ').trim() || null,
    mode: document.querySelector('button[aria-label*="모드 선택"], button[aria-label*="mode picker"]')?.getAttribute('aria-label') || null,
  }))
  res.url = preCheck.url

  if (preCheck.sorry) throw new Error('captcha_sorry')
  if (preCheck.signIn) throw new Error('signed_out')
  if (!preCheck.hasBox) throw new Error('no_input_box')

  if (resumeUrl) {
    res.mode = preCheck.mode
  } else {
    if (preCheck.existingResponses > 0) throw new Error('not_fresh_chat')

    // 모델 선택(mode.mjs 포인터 이벤트 방식)
    const modeSel = await page.evaluate(async (pref) => {
      const w = (ms) => new Promise((r) => setTimeout(r, ms))
      const tap = (e) => {
        for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
          e.dispatchEvent(new (t.startsWith('pointer') ? PointerEvent : MouseEvent)(t, { bubbles: true, cancelable: true, view: window, button: 0 }))
        }
      }
      const btn = () => document.querySelector('button[aria-label*="모드 선택"], button[aria-label*="mode picker"]')
      for (let i = 0; i < 24 && !btn(); i++) await w(500)
      if (!btn()) return { ok: false, why: 'no_picker' }

      const items = () => [...document.querySelectorAll('[role=menuitemradio],[role=menuitem]')].filter((e) => e.innerText.trim())
      const find = (re) => items().find((e) => re.test(e.innerText))
      const esc = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      const upsell = () => [...document.querySelectorAll('[role=dialog]')].some((d) => /잠금 해제|Unlock|업그레이드|Upgrade/.test(d.innerText))
      const openMenu = async (re) => {
        if (!items().length) tap(btn())
        for (let i = 0; i < 20; i++) {
          const e = find(re)
          if (e) return e
          await w(300)
        }
        return null
      }

      const tryPick = async (family) => {
        const okRe = family === 'carbon' ? /(Carbon|카본)\s*(높음|High)/ : /(Neon|네온)\s*(높음|High)/
        const famRe = family === 'carbon'
          ? /Carbon|카본|Most complex work|가장 복잡한 작업/
          : /Neon|네온|Deeper analysis|심층 분석/
        for (let k = 0; k < 2 && !okRe.test(btn().getAttribute('aria-label') || ''); k++) {
          const t = await openMenu(famRe)
          if (!t) { esc(); return { ok: false, why: `no_${family}` } }
          if (t.getAttribute('aria-disabled') === 'true') {
            const txt = t.innerText.replace(/\s+/g, ' ').trim()
            esc()
            return { ok: false, why: `${family}_limit:${txt}` }
          }
          if (t.getAttribute('aria-checked') !== 'true') {
            tap(t)
            await w(1200)
            if (upsell()) {
              ;[...document.querySelectorAll('button')].find((b) => b.offsetParent && /^(나중에|Not now|Maybe later|Later)$/.test(b.innerText.trim()))?.click()
              await w(400)
              return { ok: false, why: `${family}_upsell` }
            }
          }
          if (!items().length) { tap(btn()); await w(800) }
          let hi = items().find((e) => e.getAttribute('role') === 'menuitemradio' && /^(높음|High)(\s|$)/.test(e.innerText.trim()))
          if (!hi) {
            const s = await openMenu(/사고 수준|Thinking level/)
            if (s) { tap(s); await w(900) }
            hi = items().find((e) => e.getAttribute('role') === 'menuitemradio' && /^(높음|High)(\s|$)/.test(e.innerText.trim()))
          }
          if (!hi) { esc(); return { ok: false, why: `${family}_no_high` } }
          if (hi.getAttribute('aria-disabled') === 'true') {
            const txt = hi.innerText.replace(/\s+/g, ' ').trim()
            esc()
            return { ok: false, why: `${family}_high_limit:${txt}` }
          }
          tap(hi)
          await w(1200)
          esc()
          await w(400)
        }
        const label = btn().getAttribute('aria-label') || ''
        return { ok: okRe.test(label), label, why: okRe.test(label) ? '' : `label_mismatch:${label}` }
      }

      if (pref === 'carbon') return await tryPick('carbon')
      if (pref === 'neon') return await tryPick('neon')
      const c = await tryPick('carbon')
      if (c.ok) return c
      const n = await tryPick('neon')
      return { ...n, carbonWhy: c.why }
    }, modelPref)

    if (!modeSel.ok) throw new Error('mode_failed:' + (modeSel.why || modeSel.carbonWhy || 'unknown'))
    res.mode = modeSel.label

    // 패킷 입력 및 전송 (document.execCommand 유실 방지를 위해 keyboard.insertText + 클릭/Enter 보조 사용)
    const preInput = await page.evaluate(() => {
      const box = document.querySelector('rich-textarea div[contenteditable="true"]')
      if (!box) return { ok: false, why: 'no_box' }
      if ((box.innerText || '').trim()) return { ok: false, why: 'input_not_empty' }
      box.focus()
      return { ok: true }
    })
    if (!preInput.ok) throw new Error('send_failed:' + preInput.why)

    await page.keyboard.insertText(fullPrompt)
    await page.waitForTimeout(1500)

    const sendClick = await page.evaluate(async (expectedLen) => {
      const w = (ms) => new Promise((r) => setTimeout(r, ms))
      const box = document.querySelector('rich-textarea div[contenteditable="true"]')
      if (!box) return { ok: false, why: 'no_box_after_insert' }
      const insertedLen = (box.innerText || '').length
      if (insertedLen < Math.floor(expectedLen * 0.85)) return { ok: false, why: `insert_short:${insertedLen}/${expectedLen}` }
      const sendBtn = document.querySelector('button[aria-label*="보내기"],button[aria-label="Send message"]')
      if (!sendBtn || sendBtn.disabled) return { ok: true, needEnter: true, preAt: new Date().toISOString(), len: expectedLen }
      sendBtn.click()
      await w(1500)
      const leftover = (box.innerText || '').trim().length > 0
      return { ok: true, needEnter: leftover, preAt: new Date().toISOString(), len: expectedLen }
    }, fullPrompt.length)

    if (!sendClick.ok) throw new Error('send_failed:' + sendClick.why)
    if (sendClick.needEnter) {
      await page.evaluate(() => {
        document.querySelector('rich-textarea div[contenteditable="true"]')?.focus()
      })
      await page.keyboard.press('Enter')
    }
    await page.waitForTimeout(2500)
    const sendCheck = sendClick

    await fs.mkdir(path.dirname(SENDS_LOG), { recursive: true })
    await fs.appendFile(
      SENDS_LOG,
      JSON.stringify({ slug, profileId, account: preCheck.account, preMode: res.mode, preAt: sendCheck.preAt, len: sendCheck.len, at: new Date().toISOString() }) + '\n',
      'utf8',
    )
  }

  // 1차 응답 대기 (웹 검색 중/생각 중 상태를 완료로 오판하지 않는다)
  const extractBodyAfterHeader = (t) => {
    const marker = t.includes('Gemini의 응답') ? 'Gemini의 응답' : (t.includes('Gemini said') ? 'Gemini said' : '')
    return marker ? t.slice(t.lastIndexOf(marker) + marker.length).trim() : t.trim()
  }
  const isPendingText = (raw, body) => {
    if (!body) return true
    if (/^(웹 검색 중|Searching the web|분석 중|생각하는 과정|Thinking|Loading)/i.test(body)) return true
    if (/웹 검색 중|Searching the web/i.test(raw) && body.length < 40) return true
    return false
  }

  const deadline = Date.now() + timeoutMs
  const pollStartedAt = Date.now()
  let prevText = ''
  let stableCount = 0
  let pendingText = ''
  let pendingStallCount = 0
  let noStartPolls = 0
  let zeroCountBusyPolls = 0
  let everSawBusy = false
  let everSawResponse = false
  let maxCount = 0
  let lastToast = ''
  let snap1 = null
  while (Date.now() < deadline) {
    await page.waitForTimeout(5000)
    snap1 = await page.evaluate(() => {
      const resps = [...document.querySelectorAll('model-response')]
      const r0 = resps[0]
      const text = r0?.innerText || ''
      const codes = [...(r0?.querySelectorAll('pre, code-block, code') || [])].map((e) => e.innerText).filter(Boolean)
      const busy = Boolean(
        document.querySelector('button[aria-label="대답 생성 중지"],button[aria-label^="Stop"],model-response mat-progress-bar,model-response [aria-busy="true"]'),
      )
      const sorry = /google\.com\/sorry/.test(location.href)
      const mode = document.querySelector('button[aria-label*="모드 선택"], button[aria-label*="mode picker"]')?.getAttribute('aria-label') || null
      const toast = document.querySelector('[role="alert"], .mat-mdc-snack-bar-label, simple-snack-bar')?.innerText?.replace(/\s+/g, ' ').trim() || ''
      return { url: location.href, count: resps.length, busy, sorry, mode, toast, text, codes }
    })
    res.url = snap1.url
    if (snap1.busy) everSawBusy = true
    if (snap1.count > 0) everSawResponse = true
    if (snap1.count > maxCount) maxCount = snap1.count
    if (snap1.toast) lastToast = snap1.toast
    res.diag = { everSawBusy, everSawResponse, maxCount, lastToast, elapsedSec: Math.round((Date.now() - pollStartedAt) / 1000) }
    if (snap1.sorry) throw new Error('captcha_during_gen')
    const isFreshAppUrl = /^https:\/\/gemini\.google\.com\/app\/?(?:\?.*)?$/i.test(snap1.url)
    if (snap1.count === 0 && !snap1.busy && isFreshAppUrl) {
      noStartPolls++
      if (noStartPolls >= 6) throw new Error((everSawBusy || everSawResponse) ? 'stream_aborted_reset' : 'send_dropped_no_chat')
    } else {
      noStartPolls = 0
    }
    if (snap1.count === 0 && snap1.busy && isFreshAppUrl) {
      zeroCountBusyPolls++
      if (zeroCountBusyPolls >= 36) throw new Error('stuck_busy_no_response')
    } else {
      zeroCountBusyPolls = 0
    }
    const body1 = extractBodyAfterHeader(snap1.text)
    if (snap1.count >= 1 && !snap1.busy && !isPendingText(snap1.text, body1)) {
      if (snap1.text === prevText) {
        stableCount++
        if (stableCount >= 3) break
      } else {
        prevText = snap1.text
        stableCount = 0
      }
      pendingStallCount = 0
    } else {
      prevText = snap1.text
      stableCount = 0
      if (snap1.count >= 1 && !snap1.busy && isPendingText(snap1.text, body1)) {
        if (snap1.text === pendingText) {
          pendingStallCount++
          if (pendingStallCount >= 18) throw new Error('stalled_pending_no_busy')
        } else {
          pendingText = snap1.text
          pendingStallCount = 0
        }
      } else {
        pendingStallCount = 0
      }
    }
  }

  if (!snap1 || snap1.count < 1 || !snap1.text.trim()) throw new Error('timeout_no_response')
  if (snap1.busy) throw new Error('timeout_still_busy')

  // 회수 시 사고 수준 확인
  const postMode = await page.evaluate(async () => {
    const btn = () => document.querySelector('button[aria-label*="모드 선택"], button[aria-label*="mode picker"]')
    const label = btn()?.getAttribute('aria-label') || ''
    if (/(높음|High|낮음|Low)/i.test(label)) return label
    const tap = (e) => {
      for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        e.dispatchEvent(new (t.startsWith('pointer') ? PointerEvent : MouseEvent)(t, { bubbles: true, cancelable: true, view: window, button: 0 }))
      }
    }
    const w = (ms) => new Promise((r) => setTimeout(r, ms))
    if (!btn()) return label
    tap(btn())
    await w(700)
    const checked = [...document.querySelectorAll('[role=menuitemradio][aria-checked="true"],[role=menuitem][aria-checked="true"]')]
      .map((e) => e.innerText.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    return `${label} [${checked.join(' / ')}]`.trim()
  })

  const rawPath = `${outDir}/${slug}.gem-raw.txt`
  await fs.writeFile(rawPath, snap1.text, 'utf8')

  const rawText = snap1.text
  const isLimit = /사용 한도|한도에 도달|한도가 .* 초기화/.test(rawText)
  const isWebBlocked = /외부 웹 접속이 제한|웹 검색을 실행할 수 없어|웹 검색을 수행할 수 없|외부 링크 열람.*웹 검색을 수행할 수 없|웹 검색이 불가능|웹 검색 도구를 사용할 수 없/.test(rawText)
  const isTransient = /An error occurred|문제가 발생했습니다|오류가 발생했습니다/.test(rawText) && rawText.length < 300

  let parsed = null
  for (const cb of [...(snap1.codes || [])].reverse()) {
    parsed = extractJsonWithKo(cb, slug)
    if (parsed) break
  }
  if (!parsed) parsed = extractJsonWithKo(rawText, slug)

  const ko = typeof parsed?.ko === 'string' ? parsed.ko.trim() : ''
  res.koLen = [...ko].length

  let sourcesPath = null
  let sourcesText = ''
  if (askSources && ko && !isLimit && !isWebBlocked && !isTransient) {
    const followPre = await page.evaluate(() => {
      const box = document.querySelector('rich-textarea div[contenteditable="true"]')
      if (!box) return { ok: false, why: 'no_box_follow' }
      box.focus()
      return { ok: true }
    })
    let followSend = followPre
    if (followPre.ok) {
      await page.keyboard.insertText(SOURCE_PROMPT)
      await page.waitForTimeout(1000)
      const clicked = await page.evaluate(async () => {
        const w = (ms) => new Promise((r) => setTimeout(r, ms))
        const box = document.querySelector('rich-textarea div[contenteditable="true"]')
        const sendBtn = document.querySelector('button[aria-label*="보내기"],button[aria-label="Send message"]')
        if (!sendBtn || sendBtn.disabled) return { ok: true, needEnter: true }
        sendBtn.click()
        await w(1200)
        return { ok: true, needEnter: (box?.innerText || '').trim().length > 0 }
      })
      if (clicked.needEnter) {
        await page.evaluate(() => {
          document.querySelector('rich-textarea div[contenteditable="true"]')?.focus()
        })
        await page.keyboard.press('Enter')
      }
      await page.waitForTimeout(2500)
      followSend = { ok: true }
    }

    if (followSend.ok) {
      const sDeadline = Date.now() + 600000
      let prev2 = ''
      let st2 = 0
      while (Date.now() < sDeadline) {
        await page.waitForTimeout(5000)
        const sSnap = await page.evaluate(() => {
          const resps = [...document.querySelectorAll('model-response')]
          const busy = Boolean(document.querySelector('button[aria-label="대답 생성 중지"],button[aria-label^="Stop"]'))
          return { count: resps.length, busy, text: resps[1]?.innerText || '' }
        })
        if (sSnap.count >= 2 && !sSnap.busy && !isPendingText(sSnap.text, extractBodyAfterHeader(sSnap.text))) {
          if (sSnap.text === prev2) {
            st2++
            if (st2 >= 3) { sourcesText = sSnap.text; break }
          } else {
            prev2 = sSnap.text
            st2 = 0
          }
        } else {
          prev2 = sSnap.text
          st2 = 0
        }
      }
      if (sourcesText) {
        sourcesPath = `${outDir}/${slug}.gem-sources.txt`
        await fs.writeFile(sourcesPath, sourcesText, 'utf8')
      }
    }
  }

  const why = isLimit
    ? 'limit_reached'
    : isWebBlocked
      ? 'web_blocked'
      : isTransient
        ? 'transient_error'
        : parsed === null
          ? 'no_json_output'
          : ''

  res.ok = !why
  res.why = why || (ko ? 'ko_ready' : 'empty_ko')
  res.sourcesLen = sourcesText.length

  const bodyRecord = {
    ok: res.ok,
    why: res.why,
    slug,
    profileId,
    account: preCheck.account,
    preMode: res.mode,
    postMode,
    url: res.url,
    ko,
    webBlocked: isWebBlocked,
    limitWhy: isLimit ? rawText.slice(0, 200) : null,
    errorWhy: isTransient ? rawText.slice(0, 200) : null,
    rawPath,
    sourcesPath,
    at: new Date().toISOString(),
  }
  await fs.writeFile(`${outDir}/${slug}.gem-body.json`, JSON.stringify(bodyRecord, null, 2), 'utf8')
} catch (e) {
  res.why = String(e?.message || e).slice(0, 240)
  await fs.writeFile(`${outDir}/${slug}.gem-body.json`, JSON.stringify({ ...res, at: new Date().toISOString() }, null, 2), 'utf8').catch(() => {})
} finally {
  if (task) try { await task.finish({ keep: [] }) } catch {}
}

console.log(JSON.stringify(res))
