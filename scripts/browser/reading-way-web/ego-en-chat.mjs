// 독서방식·감상배경 영어본을 ChatGPT 웹(기본 프로필) 또는 Grok 웹으로 받는다. ego 브라우저의 nodejs 안에서 실행한다(전역 taskSpace).
// 사용: ego-browser nodejs -e "await import('file:///<이 파일>?job=<작업 JSON 절대경로>&svc=gpt|grok')"
// 작업 JSON {slug, prompt} → 같은 폴더의 en-web-<slug>.json {ok, en|why, mode, url}과 en-chat.log. 탭은 끝나면 닫는다.
// 한 프로필은 한 탭에서만 쓴다(res-06). 칸 1은 gpt, 칸 2는 grok으로 나눠 같은 서비스를 두 탭이 동시에 쓰지 않는다.
const fs = await import('node:fs/promises')
const q = new URL(import.meta.url).searchParams
const JOB = q.get('job'), SVC = q.get('svc') || 'gpt'
const F = JOB.replace(/[^/\\]+$/, '')
const { slug, prompt } = JSON.parse(await fs.readFile(JOB, 'utf8'))
const out = F + `en-web-${slug}.json`
const rid = `[[REQ:${slug}-${Date.now().toString(36)}]]`
const task = await taskSpace('reading-way en chat ' + SVC)
const page = await task.newPage()
let res = { ok: false, why: 'unknown' }
const sleep = ms => page.waitForTimeout(ms)
const log = (...m) => fs.appendFile(F + 'en-chat.log', new Date().toISOString().slice(11, 19) + ' ' + slug + ' ' + m.join(' ') + String.fromCharCode(10))
try {
  if (SVC === 'gpt') {
    await log('goto'); await page.goto('https://chatgpt.com/', { timeout: 60000 }); await sleep(7000); await log('loaded')
    const s = await page.fetch('/api/auth/session', { timeout: 20000 })
    let who = ''; try { const j = JSON.parse(s.body); who = j.user?.id || j.user?.email || '' } catch {}
    await log('who ' + !!who); if (!who) throw Error('chatgpt not logged in')
    // 입력은 실제 키보드로 넣고 Enter로 보낸다(execCommand 입력은 보내기가 먹지 않았다, 26.11.23 시험).
    const prep = await page.evaluate(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms))
      const chat = [...document.querySelectorAll('button[aria-pressed]')].find(b => /^Chat$/.test(b.innerText.trim()))
      if (chat && chat.getAttribute('aria-pressed') !== 'true') { chat.click(); await w(800) }
      const box = document.querySelector('.ProseMirror[contenteditable="true"]') || document.querySelector('[contenteditable="true"][role="textbox"]')
      if (!box) return { ok: false, why: 'no input' }
      // 이 작업이 남긴 입력(요청 번호가 붙은 지시문)만 지운다. 다른 글이면 손대지 않는다.
      const cur = box.innerText.trim()
      if (cur) { if (!/\[\[REQ:/.test(cur)) return { ok: false, why: 'input not empty: ' + cur.slice(0, 80) }; box.focus(); document.execCommand('selectAll'); document.execCommand('delete'); await w(800) }
      box.focus()
      return { ok: true, users: document.querySelectorAll('[data-message-author-role="user"], [data-content-search-unit-key$=":user"]').length }
    })
    if (!prep.ok) throw Error('send: ' + prep.why)
    await page.keyboard.insertText(prompt + '\n\n' + rid); await sleep(1500)
    await page.keyboard.press('Enter'); await sleep(5000)
    const sent = await page.evaluate((before) => {
      const box = document.querySelector('.ProseMirror[contenteditable="true"]') || document.querySelector('[contenteditable="true"][role="textbox"]')
      const n = document.querySelectorAll('[data-message-author-role="user"], [data-content-search-unit-key$=":user"]').length
      return n > before || !(box?.innerText || '').trim() ? { ok: true } : { ok: false, why: 'not sent', left: (box?.innerText || '').slice(0, 60) }
    }, prep.users)
    await log('SENT ' + JSON.stringify(sent)); if (!sent.ok) throw Error('send: ' + sent.why)
    let last, prev = ''
    for (let i = 0; i < 100; i++) {
      await sleep(6000)
      last = await page.evaluate((rid) => {
        const t = document.querySelector('main')?.innerText || ''
        const k = t.lastIndexOf(rid), tail = k >= 0 ? t.slice(k + rid.length) : ''
        // 26.11.23 화면: 코드 블록은 pre 없이 div[class*=CodeBlock] > code.block 이다. 정지 단추는 data-testid로만 본다.
        const busy = !!document.querySelector('button[data-testid="stop-button"]')
        const codes = [...document.querySelectorAll('[class*="CodeBlock"] code, pre code')]
        const code = codes.length ? codes.at(-1).innerText : ''
        return { busy, code, t: tail.slice(0, 400) }
      }, rid)
      if (/안정성을 위해|unusual activity|한도에 도달|limit/.test(last.t) && !last.code) break
      await log("POLL", i, JSON.stringify({ busy: last.busy, code: last.code.slice(0, 40), t: last.t.slice(0, 80) }))
      if (!last.busy && last.code && last.code === prev) break
      prev = last.code
    }
    if (!last.code) throw Error('no code block: ' + last.t.slice(0, 160))
    res = { ok: true, en: last.code.replace(/\[\[REQ:[^\]]*\]\]/g, '').trim(), mode: 'ChatGPT 웹(Plus)', url: await page.evaluate(() => location.href) }
  } else {
    await page.goto('https://grok.com/', { timeout: 60000 }); await sleep(7000)
    const sent = await page.evaluate(async (text) => {
      const w = ms => new Promise(r => setTimeout(r, ms))
      const box = document.querySelector('div[aria-label="Grok에게 메시지 보내기"]') || document.querySelector('div[contenteditable="true"]')
      if (!box) return { ok: false, why: 'no input' }
      if (box.innerText.trim()) return { ok: false, why: 'input not empty' }
      box.focus(); document.execCommand('insertText', false, text); await w(1500)
      box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })); await w(4000)
      return /\/c\//.test(location.pathname) || !box.innerText.trim() ? { ok: true } : { ok: false, why: 'not sent' }
    }, prompt + '\n\n' + rid)
    await log('SENT', JSON.stringify(sent)); if (!sent.ok) throw Error('send: ' + sent.why)
    let last, prev = ''
    for (let i = 0; i < 100; i++) {
      await sleep(6000)
      last = await page.evaluate((rid) => {
        const t = document.body.innerText, k = t.lastIndexOf(rid), tail = k >= 0 ? t.slice(k + rid.length) : t.slice(-3000)
        const pres = [...document.querySelectorAll('pre')]
        const code = pres.length ? (pres.at(-1).querySelector('code')?.innerText || pres.at(-1).innerText) : ''
        return { done: /Grok 응답 완료|response complete/i.test(tail), code, t: tail.slice(0, 400) }
      }, rid)
      if (last.done && last.code && last.code === prev) break
      prev = last.code
    }
    if (!last.code) throw Error('no code block: ' + last.t.slice(0, 160))
    res = { ok: true, en: last.code.replace(/\[\[REQ:[^\]]*\]\]/g, '').trim(), mode: 'Grok 웹', url: await page.evaluate(() => location.href) }
  }
} catch (e) { res = { ok: false, why: String(e.message).slice(0, 300) } }
await fs.writeFile(out, JSON.stringify(res), 'utf8')
await page.close()
console.log(JSON.stringify({ ok: res.ok, why: res.why, n: res.en?.length, mode: res.mode }))
