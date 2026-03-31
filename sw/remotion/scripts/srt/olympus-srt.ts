import { subtitles } from '../../src/compositions/OlympusMV/subtitles'
import { writeFileSync, mkdirSync } from 'fs'

const pad = (n: number) => String(n).padStart(2, '0')
const toSrt = (sec: number) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec % 1) * 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`
}

const result = subtitles
  .map((s, i) => `${i + 1}\n${toSrt(s.startSec)} --> ${toSrt(s.endSec)}\n${s.lines.join('\n')}`)
  .join('\n\n')

mkdirSync('out', { recursive: true })
writeFileSync('out/OlympusMV.srt', result + '\n', 'utf-8')
console.log(`saved: out/OlympusMV.srt (${subtitles.length} entries)`)
