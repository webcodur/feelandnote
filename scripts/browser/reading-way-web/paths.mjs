// 독서방식 웹채팅 도구의 공용 경로다. 저장소 루트는 이 파일 위치로 정하고, 작업 폴더는 RW_WORK 또는 OS 임시 폴더의 feelandnote/rw-chrome을 쓴다.
// 작업 폴더에는 요청 묶음(packets)·발송 JS(scoped)·회수 원문(web)·확정본(finals)·출처 사본(src)·관측값(obs)이 쌓인다. 저장소에 두지 않는다.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const slash = (p) => p.split(path.sep).join('/')
export const R = slash(path.resolve(import.meta.dirname, '../../..'))
export const W = slash(process.env.RW_WORK ?? path.join(os.tmpdir(), 'feelandnote', 'rw-chrome'))
for (const d of ['packets', 'scoped', 'web', 'finals', 'src', 'obs', 'feedback']) fs.mkdirSync(`${W}/${d}`, { recursive: true })
