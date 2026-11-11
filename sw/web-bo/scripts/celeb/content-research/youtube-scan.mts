/**
 * 유튜브 중심 인물의 감상 단서 스캔. 채널 영상 목록 → 제목 선별 → 자막 → 감상 단서 대목을 앞뒤 맥락과 함께 뽑는다.
 * 결과는 후보일 뿐이다. 화자·대상·맥락은 사람이 자막을 읽고 판정한다(합동 방송은 화자 분리 뒤에만 쓴다).
 *
 * pnpm celeb:research:youtube -- list     --dir <작업폴더> --channel https://www.youtube.com/@handle
 * pnpm celeb:research:youtube -- pick     --dir <작업폴더> [--pattern "<정규식>"] [--top 40]
 * pnpm celeb:research:youtube -- subs     --dir <작업폴더> [--ids a,b]      (기본: picks.tsv)
 * pnpm celeb:research:youtube -- cues     --dir <작업폴더> [--pattern "<정규식>"] [--around 1]
 * pnpm celeb:research:youtube -- comments --dir <작업폴더> --id <영상ID> [--pattern "<정규식>"]
 *
 * 요령: docs/project/celeb/celeb-02-07-content-research-techniques.md 「유튜브와 방송」
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const command = args[0]
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const dir = opt('dir')
if (!command || !dir) {
  console.error('사용법은 파일 머리말을 본다. --dir는 필수다.')
  process.exit(1)
}
mkdirSync(dir, { recursive: true })
const P = (...p: string[]) => path.join(dir, ...p)
const env = { ...process.env, PYTHONUTF8: '1' }

/** 감상 영상일 가능성이 있는 제목 */
const MEDIA = '책|도서|소설|영화|드라마|애니|만화|웹툰|노래|음악|곡|앨범|게임'
const TITLE_CUES = `읽|독서|서재|북리뷰|${MEDIA}|플레이리스트|인생 ?(${MEDIA}|작)|(${MEDIA}) ?추천|추천 ?(${MEDIA})|최애 ?(${MEDIA}|캐릭터|작)|(등장인물|캐릭터|명작|인생|${MEDIA}) ?월드컵|Q&A|QnA|덕질|명작|띵작`
/** 자막에서 본인 감상일 가능성이 있는 말 */
const SPEECH_CUES = '봤(어|는데|거든|던|습니다|어요)|읽(었|고|은|는)|재밌(게|었|더)|인생 ?(책|영화|드라마|곡|노래|만화|게임)|최애|추천(해|드|하고)|좋아하는|감명|울었|빠져(서|가지고|있)|정주행|다시 (봤|읽)'

function ytdlp(argv: string[]) {
  const r = spawnSync('yt-dlp', argv, { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 })
  if (r.error) throw new Error(`yt-dlp 실행 실패: ${r.error.message}`)
  return r
}
const readTsv = (file: string) => readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => {
  const [id, views, duration, ...title] = l.split('\t')
  return { id, views: Number(views) || 0, duration: Number(duration) || 0, title: title.join('\t') }
})

function json3ToText(file: string) {
  const j = JSON.parse(readFileSync(file, 'utf8'))
  const blocks: { s: number; t: string[] }[] = []
  for (const e of j.events ?? []) {
    const t = (e.segs ?? []).map((s: { utf8: string }) => s.utf8).join('').replace(/\s+/g, ' ').trim()
    if (!t) continue
    const s = Math.floor((e.tStartMs ?? 0) / 1000)
    const cur = blocks.at(-1)
    if (!cur || s - cur.s >= 20) blocks.push({ s, t: [t] })
    else cur.t.push(t)
  }
  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return blocks.map((b) => `[${mmss(b.s)}] ${b.t.join(' ')}`).join('\n')
}

if (command === 'list') {
  const channel = opt('channel')
  if (!channel) throw new Error('--channel이 필요하다.')
  const base = channel.replace(/\/(videos|shorts|streams|featured)\/?$/, '')
  const lines: string[] = []
  for (const tab of ['videos', 'streams']) {
    const r = ytdlp(['--flat-playlist', '--print', '%(id)s\t%(view_count)s\t%(duration)s\t%(title)s', `${base}/${tab}`])
    lines.push(...r.stdout.trim().split('\n').filter((l) => /^[\w-]{11}\t/.test(l)))
  }
  writeFileSync(P('videos.tsv'), lines.join('\n'))
  console.log(`영상 ${lines.length}편 → ${P('videos.tsv')}`)
} else if (command === 'pick') {
  const re = new RegExp(opt('pattern') ?? TITLE_CUES, 'i')
  const top = Number(opt('top') ?? 40)
  const picks = readTsv(P('videos.tsv')).filter((v) => re.test(v.title) && v.duration !== 0 && v.duration > 60)
    .sort((a, b) => b.views - a.views).slice(0, top)
  writeFileSync(P('picks.tsv'), picks.map((v) => [v.id, v.views, v.duration, v.title].join('\t')).join('\n'))
  for (const v of picks) console.log(`${v.id}  ${String(v.views).padStart(9)}  ${v.title.slice(0, 80)}`)
  console.log(`선별 ${picks.length}편 → ${P('picks.tsv')} (제목만으로 고른 것이다. 빠진 영상은 --pattern을 넓히거나 --ids로 지정한다)`)
} else if (command === 'subs') {
  const ids = opt('ids')?.split(',') ?? readTsv(P('picks.tsv')).map((v) => v.id)
  mkdirSync(P('subs'), { recursive: true })
  mkdirSync(P('txt'), { recursive: true })
  for (const id of ids) {
    const have = () => ['ko-orig', 'ko'].map((l) => P('subs', `${id}.${l}.json3`)).find(existsSync)
    if (!have()) ytdlp(['--skip-download', '--write-auto-subs', '--write-subs', '--sub-langs', 'ko-orig,ko', '--sub-format', 'json3', '-o', P('subs', '%(id)s'), `https://www.youtube.com/watch?v=${id}`])
    const f = have()
    if (!f) { console.log(`자막 없음 ${id}`); continue }
    writeFileSync(P('txt', `${id}.txt`), json3ToText(f))
    console.log(`자막 ${id}`)
  }
} else if (command === 'cues') {
  const re = new RegExp(opt('pattern') ?? SPEECH_CUES)
  const around = Number(opt('around') ?? 1)
  const titles = Object.fromEntries((existsSync(P('videos.tsv')) ? readTsv(P('videos.tsv')) : []).map((v) => [v.id, v.title]))
  const out: string[] = []
  let total = 0
  for (const f of readdirSync(P('txt')).filter((x) => x.endsWith('.txt'))) {
    const id = f.replace('.txt', '')
    const lines = readFileSync(P('txt', f), 'utf8').split('\n')
    const hit = new Set<number>()
    lines.forEach((l, i) => { if (re.test(l)) for (let k = Math.max(0, i - around); k <= Math.min(lines.length - 1, i + around); k++) hit.add(k) })
    if (!hit.size) continue
    out.push(`\n## ${id} | ${titles[id] ?? ''}\n`)
    let prev = -2
    for (const i of [...hit].sort((a, b) => a - b)) {
      if (i !== prev + 1) out.push('')
      const sec = (lines[i].match(/^\[(\d+):(\d+)\]/) ?? []).slice(1).map(Number)
      out.push(`${lines[i]}${sec.length ? `  <https://www.youtube.com/watch?v=${id}&t=${sec[0] * 60 + sec[1]}s>` : ''}`)
      prev = i
    }
    total += hit.size
  }
  writeFileSync(P('cues.md'), `# 감상 단서 (기계 선별, 판정 전)\n${out.join('\n')}\n`)
  console.log(`단서 ${total}줄 → ${P('cues.md')}`)
} else if (command === 'comments') {
  const id = opt('id')
  if (!id) throw new Error('--id가 필요하다.')
  mkdirSync(P('comments'), { recursive: true })
  ytdlp(['--skip-download', '--write-comments', '--extractor-args', 'youtube:max_comments=500,all,100', '-o', P('comments', '%(id)s'), `https://www.youtube.com/watch?v=${id}`])
  const file = P('comments', `${id}.info.json`)
  if (!existsSync(file)) throw new Error('댓글을 받지 못했다.')
  const re = new RegExp(opt('pattern') ?? '『|「|〈|<|제목|책 이름|영화 이름|노래 (제목|이름)|뭔가요|뭐예요|정보')
  const comments = (JSON.parse(readFileSync(file, 'utf8')).comments ?? []) as { text: string; like_count?: number; author?: string }[]
  const hits = comments.filter((c) => re.test(c.text)).sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
  for (const c of hits.slice(0, 60)) console.log(`(${c.like_count ?? 0}) ${c.author}: ${c.text.replace(/\s+/g, ' ').slice(0, 200)}`)
  console.log(`댓글 ${comments.length}개 중 ${hits.length}개 표시`)
} else {
  console.error(`알 수 없는 명령: ${command}`)
  process.exit(1)
}
