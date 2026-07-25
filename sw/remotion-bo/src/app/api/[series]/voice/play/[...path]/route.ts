import path from 'path'
import { existsSync, readFileSync } from 'fs'
import { COMMON_VOICE_DIR, voiceDir } from '@/lib/server-utils'
import { streamWav } from '@/lib/episode-store'

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params

  // segments[0] = episodeName (alexander-the-great, alexander-the-great-en 등)
  // segments[1..] = 파일 경로 (gemini/S01-host-intro.wav 등)
  const episodeName = segments[0]
  const fileParts = segments.slice(1)

  // common 음성: common/{file} → public/common/voice/ko/{file}
  //              common-en/{file} → public/common/voice/en/{file}
  if (fileParts.length >= 2 && (fileParts[0] === 'common' || fileParts[0] === 'common-en')) {
    const lang = fileParts[0] === 'common-en' ? 'en' : 'ko'
    const commonAbs = path.join(COMMON_VOICE_DIR, lang, ...fileParts.slice(1))
    if (existsSync(commonAbs)) return streamWav(req, commonAbs)
  }
  // common 직접 참조: segments = ['common', file] or ['common-en', file]
  if (episodeName === 'common' || episodeName === 'common-en') {
    const lang = episodeName === 'common-en' ? 'en' : 'ko'
    const commonAbs = path.join(COMMON_VOICE_DIR, lang, ...fileParts)
    if (existsSync(commonAbs)) return streamWav(req, commonAbs)
  }

  // 에피소드 voice 디렉토리
  const vDir = voiceDir(episodeName)
  let abs = path.join(vDir, ...fileParts)

  // 없으면 voice-select.json으로 엔진 하위 디렉토리 해소
  if (!existsSync(abs) && fileParts.length >= 1) {
    const fileName = fileParts.join('/')
    const vsPath = path.join(vDir, 'voice-select.json')
    if (existsSync(vsPath)) {
      try {
        const vs = JSON.parse(readFileSync(vsPath, 'utf-8'))
        // slots 에 명시 지정이 있으면 그 지정을 최우선 존중한다. 명시 지정이 없을 때만
        // 셀럽 자동 라우팅(아래)으로 default 를 보정한다 — 모달에서 GEM 으로 '생성 및 저장'
        // 한 셀럽 구간이 elevenlabs 파일 잔존 때문에 옛 ELE 음원으로 되돌아가던 결함 방지.
        const explicit: string | undefined = vs.slots?.[fileName]
        let engine = explicit ?? vs.default
        // celeb 파일이고 elevenlabs 파일이 존재하면 자동 라우팅 (명시 지정이 없을 때만)
        if (!explicit && engine !== 'elevenlabs') {
          const key = fileName.replace('.wav', '')
          const isCeleb = key === 'A3-featured-quote' || key === 'B2-philosophy' || /^D\d{2}d\d+-quote$/.test(key) || /^(shorts-\d+\/)?S\d{2}-celeb-/.test(key) || /^(shorts-\d+\/)?S\d{2}-book-quote/.test(key)
          if (isCeleb) {
            const elePath = path.join(vDir, 'elevenlabs', fileName)
            if (existsSync(elePath)) engine = 'elevenlabs'
          }
        }
        if (engine) {
          const resolved = path.join(vDir, engine, fileName)
          if (existsSync(resolved)) abs = resolved
        }
      } catch { /* ignore */ }
    }
  }

  return streamWav(req, abs)
}
