// ego-browser 프로필의 Gemini(Carbon/Neon High)·ChatGPT·Grok 가용 상태를 저토큰 요약으로 점검한다.
// 실행: ego-browser nodejs -e "await import('file:///C:/project/feelandnote/scripts/browser/reading-way-web/ego-pool-probe.mjs')"
// 전체 프로필 점검: ...?all=1
const fs = await import('node:fs/promises')
const q = new URL(import.meta.url).searchParams
const scanAll = q.get('all') === '1'
const OUT = 'C:/Users/webco/AppData/Local/Temp/feelandnote/rw-chrome/ego-pool-status.json'
const PRIORITY = [
  'Profile 26', 'Profile 10', 'Profile 11', 'Profile 23', 'Profile 21', 'Profile 22',
  'Profile 1', 'Profile 12', 'Profile 13', 'Profile 15', 'Profile 16', 'Profile 17',
  'Profile 18', 'Profile 19', 'Profile 20', 'Profile 14', 'Profile 6', 'Profile 7',
]

const allProfiles = await profiles()
const byId = new Map(allProfiles.map((p) => [p.id, p]))
const order = []
for (const pid of PRIORITY) if (byId.has(pid)) order.push(pid)
if (scanAll) {
  for (const p of allProfiles) if (!order.includes(p.id)) order.push(p.id)
}

const tag = Date.now().toString(36)
const results = []
let geminiReady = 0
let gptReady = 0
let grokReady = 0
let sorryHit = false

for (const pid of order) {
  if (!scanAll && geminiReady >= 5 && gptReady >= 1 && grokReady >= 1) break
  const pinfo = byId.get(pid)
  let task
  const entry = { pid, name: pinfo?.name || pid, gem: null, gpt: null, grok: null }
  try {
    task = await taskSpace(`rw-probe-${tag}-${pid.replace(/\s+/g, '')}`, { profileId: pid })
    const page = (await task.pages())[0] ?? (await task.newPage())

    if (!sorryHit) {
      try {
        await page.goto('https://gemini.google.com/app?hl=ko', { timeout: 30000 })
        await page.waitForTimeout(2500)
        entry.gem = await page.evaluate(async () => {
          const w = (ms) => new Promise((r) => setTimeout(r, ms))
          const tap = (e) => {
            for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
              e.dispatchEvent(new (t.startsWith('pointer') ? PointerEvent : MouseEvent)(t, { bubbles: true, cancelable: true, view: window, button: 0 }))
            }
          }
          const sorry = /google\.com\/sorry/.test(location.href)
          const signIn = /accounts\.google\.com/.test(location.href)
          const acct = document.querySelector('a[aria-label*="Google"], a[aria-label*="@"]')?.getAttribute('aria-label')?.replace(/\s+/g, ' ').trim() || null
          const hasBox = Boolean(document.querySelector('rich-textarea div[contenteditable="true"]'))
          const btn = () => document.querySelector('button[aria-label*="모드 선택"], button[aria-label*="mode picker"]')
          const items = () => [...document.querySelectorAll('[role=menuitemradio],[role=menuitem]')].filter((e) => e.innerText.trim())
          const esc = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
          const upsell = () => [...document.querySelectorAll('[role=dialog]')].some((d) => /잠금 해제|Unlock|업그레이드|Upgrade/.test(d.innerText))

          let carbonOk = false
          let carbonWhy = ''
          let neonOk = false
          let neonWhy = ''

          if (!sorry && !signIn && btn()) {
            tap(btn())
            await w(800)
            const carb = items().find((e) => /Carbon|카본|Most complex work|가장 복잡한 작업/.test(e.innerText))
            if (!carb) carbonWhy = 'no_carbon'
            else if (carb.getAttribute('aria-disabled') === 'true') carbonWhy = 'disabled:' + carb.innerText.replace(/\s+/g, ' ').trim()
            else {
              tap(carb)
              await w(1000)
              if (upsell()) {
                carbonWhy = 'upgrade_dialog'
                ;[...document.querySelectorAll('button')].find((b) => b.offsetParent && /^(나중에|Not now|Maybe later|Later)$/.test(b.innerText.trim()))?.click()
                await w(400)
              } else {
                if (!items().length) { tap(btn()); await w(800) }
                let hi = items().find((e) => e.getAttribute('role') === 'menuitemradio' && /^(높음|High)(\s|$)/.test(e.innerText.trim()))
                if (!hi) {
                  const lvl = items().find((e) => /사고 수준|Thinking level/.test(e.innerText))
                  if (lvl) { tap(lvl); await w(700) }
                  hi = items().find((e) => e.getAttribute('role') === 'menuitemradio' && /^(높음|High)(\s|$)/.test(e.innerText.trim()))
                }
                if (hi && hi.getAttribute('aria-disabled') === 'true') carbonWhy = 'high_disabled:' + hi.innerText.replace(/\s+/g, ' ').trim()
                else {
                  if (hi) { tap(hi); await w(700) }
                  carbonOk = /(Carbon|카본)\s*(높음|High)/.test(btn()?.getAttribute('aria-label') || '')
                  if (!carbonOk) carbonWhy = 'label:' + (btn()?.getAttribute('aria-label') || 'none')
                }
              }
            }
            esc()
            await w(300)

            tap(btn())
            await w(800)
            const neon = items().find((e) => /Neon|네온|Deeper analysis|심층 분석/.test(e.innerText))
            if (!neon) neonWhy = 'no_neon'
            else if (neon.getAttribute('aria-disabled') === 'true') neonWhy = 'disabled:' + neon.innerText.replace(/\s+/g, ' ').trim()
            else {
              if (neon.getAttribute('aria-checked') !== 'true') { tap(neon); await w(800) }
              if (!items().length) { tap(btn()); await w(800) }
              let hi = items().find((e) => e.getAttribute('role') === 'menuitemradio' && /^(높음|High)(\s|$)/.test(e.innerText.trim()))
              if (!hi) {
                const lvl = items().find((e) => /사고 수준|Thinking level/.test(e.innerText))
                if (lvl) { tap(lvl); await w(700) }
                hi = items().find((e) => e.getAttribute('role') === 'menuitemradio' && /^(높음|High)(\s|$)/.test(e.innerText.trim()))
              }
              if (!hi) neonWhy = 'no_high'
              else if (hi.getAttribute('aria-disabled') === 'true') neonWhy = 'high_disabled:' + hi.innerText.replace(/\s+/g, ' ').trim()
              else {
                tap(hi)
                await w(700)
                neonOk = /(Neon|네온)\s*(높음|High)/.test(btn()?.getAttribute('aria-label') || '')
                if (!neonOk) neonWhy = 'label:' + (btn()?.getAttribute('aria-label') || 'none')
              }
            }
            esc()
            await w(200)
          }

          return {
            sorry,
            signIn,
            acct,
            hasBox,
            carbonOk,
            carbonWhy,
            neonOk,
            neonWhy,
            ready: !sorry && !signIn && hasBox && (carbonOk || neonOk),
          }
        })
        if (entry.gem?.sorry) sorryHit = true
        if (entry.gem?.ready) geminiReady++
      } catch (e) {
        entry.gem = { ready: false, err: String(e?.message || e).slice(0, 120) }
      }
    }

    if (scanAll || gptReady < 1) {
      try {
        await page.goto('https://chatgpt.com/', { timeout: 25000 })
        await page.waitForTimeout(1500)
        const s = await page.fetch('/api/auth/session', { timeout: 10000 })
        const j = JSON.parse(s.body || '{}')
        const ok = Boolean(j.user?.id || j.user?.email)
        entry.gpt = { ok, email: j.user?.email || null, plan: j.account?.planType || null }
        if (ok) gptReady++
      } catch (e) {
        entry.gpt = { ok: false, err: String(e?.message || e).slice(0, 100) }
      }
    }

    if (scanAll || grokReady < 1) {
      try {
        await page.goto('https://grok.com/', { timeout: 25000 })
        await page.waitForTimeout(1500)
        entry.grok = await page.evaluate(() => {
          const hasBox = Boolean(document.querySelector('div[aria-label="Grok에게 메시지 보내기"], div[contenteditable="true"]'))
          const signIn = [...document.querySelectorAll('a,button')].some((b) => /^(Sign in|로그인)$/i.test(b.innerText.trim()))
          return { ok: hasBox && !signIn, hasBox, signIn }
        })
        if (entry.grok.ok) grokReady++
      } catch (e) {
        entry.grok = { ok: false, err: String(e?.message || e).slice(0, 100) }
      }
    }
  } catch (e) {
    entry.error = String(e?.message || e).slice(0, 140)
  } finally {
    if (task) try { await task.finish({ keep: [] }) } catch {}
  }

  results.push(entry)
  const g = entry.gem
  const gemStr = !g
    ? 'skip'
    : g.sorry
      ? 'SORRY'
      : g.signIn
        ? 'SIGNED_OUT'
        : `ready=${g.ready}(C=${g.carbonOk}${g.carbonWhy ? ':' + g.carbonWhy : ''},N=${g.neonOk}${g.neonWhy ? ':' + g.neonWhy : ''})`
  const gptStr = entry.gpt ? `gpt=${entry.gpt.ok ? entry.gpt.plan || 'ok' : 'no'}` : ''
  const grokStr = entry.grok ? `grok=${entry.grok.ok}` : ''
  console.log(`${pid} (${entry.name}) | gem:${gemStr} ${gptStr} ${grokStr} | ${g?.acct || ''}`.trim())
  if (sorryHit) {
    console.log('STOPPED: google.com/sorry encountered')
    break
  }
}

await fs.mkdir('C:/Users/webco/AppData/Local/Temp/feelandnote/rw-chrome', { recursive: true })
const payload = { at: new Date().toISOString(), sorryHit, geminiReady, gptReady, grokReady, results }
await fs.writeFile(OUT, JSON.stringify(payload, null, 2), 'utf8')
console.log(`POOL_SUMMARY gemini=${geminiReady} gpt=${gptReady} grok=${grokReady} sorry=${sorryHit} saved=${OUT}`)
