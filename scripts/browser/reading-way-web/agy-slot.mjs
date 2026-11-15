// agyCall에 프로세스 간 동시 실행 상한을 건다(한 계정에 호출이 몰리면 30분 시간 초과가 잇따른다, 26.11.15).
// 슬롯은 OS 임시 폴더의 feelandnote/agy-slots/<n> 디렉터리를 mkdir로 잡고, 죽은 PID의 슬롯은 회수한다. 상한: AGYQ_MAX(기본 2).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url'
const { agyCall: raw } = await import(new URL('../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs', import.meta.url).href)
// 26.11.15 동시 호출 4개 + 크롬 탭 9개로 컴퓨터가 멈춰 재부팅했다. 기본 상한 2, 여유 메모리 6GB 미만이면 새 호출을 띄우지 않는다.
const DIR = path.join(os.tmpdir(), 'feelandnote', 'agy-slots'), MAX = Number(process.env.AGYQ_MAX || 2), MIN_FREE = Number(process.env.AGYQ_MIN_FREE_MB || 6144)
fs.mkdirSync(DIR, { recursive: true })
const alive = pid => { try { process.kill(pid, 0); return true } catch { return false } }
async function take() {
  for (;;) {
    if (os.freemem() / 1048576 < MIN_FREE) { await new Promise(r => setTimeout(r, 30000)); continue }
    for (let n = 0; n < MAX; n++) {
      const d = `${DIR}/${n}`
      try { fs.mkdirSync(d); fs.writeFileSync(`${d}/pid`, String(process.pid)); return d } catch {
        try { const pid = Number(fs.readFileSync(`${d}/pid`, 'utf8')); if (pid && !alive(pid)) fs.rmSync(d, { recursive: true }) } catch {}
      }
    }
    await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000))
  }
}
export async function agyCall(prompt, opt) {
  const d = await take()
  // AGYQ_MODEL: Ultra 한도가 찼을 때 Pro 계정 CLI의 Argon으로 잇는다(26.11.15 Pro 계정 CLI에 Argon 개방 확인).
  // 현재 CLI 계정에 Carbon이 없으면(Pro 계정) Argon으로 한 번 다시 부른다. 실제 모델은 stderr에 남긴다.
  const o = process.env.AGYQ_MODEL ? { ...opt, model: process.env.AGYQ_MODEL } : opt
  try { return await raw(prompt, o) } catch (e) {
    if (!/not recognized as a known model/.test(String(e.message)) || !/carbon/.test(o.model ?? '')) throw e
    console.error(JSON.stringify({ event: 'agyq_model_fallback', from: o.model, to: 'gemini-4-argon-high' }))
    return await raw(prompt, { ...o, model: o.model.replace('carbon', 'argon') })
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
}
