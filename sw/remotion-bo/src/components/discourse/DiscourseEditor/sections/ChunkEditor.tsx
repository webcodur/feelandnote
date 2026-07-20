'use client'

/**
 * 의미 덩어리 + 이미지 교체 지점.
 *
 * 덩어리는 자막이 한 번에 뜨는 단위이자 사진이 넘어가는 기준점이다.
 * **나누는 일은 사람이 한다** — 의미와 호흡으로 가른다. 글자 수로 기계가 자르면 말이 엉뚱한 데서 끊긴다.
 * 그래서 자동 분할 단추를 두지 않는다. 한 줄에 한 덩어리씩 적으면 그대로 덩어리가 된다.
 *
 * 이미지 교체는 덩어리 번호에 걸린다({chunk, image}) — 어느 덩어리에서 사진이 넘어가는지
 * 덩어리 목록 옆에 붙여 보여준다. 인물 수와 사진 장수는 무관하다. 한 발언 안에서도 여러 번 넘어간다.
 */

import type { Turn } from '@/lib/discourse-types'
import { ImageIcon, Trash2 } from '@/components/faction/shared/icons'
import { FactionMediaThumb } from '@/components/faction/shared/FactionMediaThumb'
import { imageSrc } from '../../shared/timing'
import type { EditLang } from '../../shared/editLang'

type Props = {
  turn: Turn
  onChange: (next: Turn) => void
  episodeName: string
  editLang: EditLang
}

/** 줄 단위 텍스트 ↔ 덩어리 배열 — 빈 줄은 덩어리로 치지 않는다 */
const toLines = (chunks?: string[]) => (chunks ?? []).join('\n')
const fromLines = (v: string): string[] | undefined => {
  const arr = v.split('\n').map(s => s.trim()).filter(Boolean)
  return arr.length ? arr : undefined
}

export function ChunkEditor({ turn, onChange, episodeName, editLang }: Props) {
  const chunks = turn.chunks ?? []
  const changes = turn.imageChanges ?? []
  const changeAt = new Map(changes.map(c => [c.chunk, c]))

  const setChange = (chunk: number, image: string) => {
    const rest = changes.filter(c => c.chunk !== chunk)
    const next = image.trim()
      ? [...rest, { ...changeAt.get(chunk), chunk, image: image.trim() }]
      : rest
    next.sort((a, b) => a.chunk - b.chunk)
    onChange({ ...turn, imageChanges: next.length ? next : undefined })
  }

  const removeChange = (chunk: number) => setChange(chunk, '')

  // 덩어리를 지웠는데 그 자리에 사진 교체가 남아 있으면 렌더가 없는 지점을 가리킨다
  const orphan = changes.filter(c => c.chunk >= chunks.length)

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <label className="mt-1.5 w-20 shrink-0 text-xs text-text-dim">덩어리 -</label>
        {editLang !== 'en' && (
          <textarea
            rows={Math.max(3, chunks.length + 1)}
            value={toLines(turn.chunks)}
            placeholder={'한 줄에 한 덩어리씩 적으세요.\n자막이 이 단위로 뜨고, 사진도 이 지점에서 넘어갑니다.'}
            onChange={e => onChange({ ...turn, chunks: fromLines(e.target.value) })}
            className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-3 py-2 text-sm leading-relaxed focus:border-accent focus:outline-none"
          />
        )}
        {editLang !== 'ko' && (
          <textarea
            rows={Math.max(3, chunks.length + 1)}
            value={toLines(turn.chunksEn)}
            placeholder="EN — one chunk per line"
            onChange={e => onChange({ ...turn, chunksEn: fromLines(e.target.value) })}
            className="min-w-0 flex-1 resize-y rounded-md border border-border/60 bg-bg-card/50 px-3 py-2 text-xs leading-relaxed text-text-secondary focus:border-accent focus:outline-none"
          />
        )}
      </div>
      <p className="ps-22 text-[11px] text-text-dim">
        의미와 호흡으로 직접 나눕니다. 비워 두면 대사 전체가 한 덩어리로 뜹니다.
        {editLang !== 'ko' && turn.chunksEn?.length && turn.chunks?.length && turn.chunksEn.length !== turn.chunks.length ? (
          <span className="font-semibold text-warning-text"> · 한국어 {turn.chunks.length}덩어리 / 영문 {turn.chunksEn.length}덩어리 — 개수가 다르면 사진 교체 지점이 어긋납니다.</span>
        ) : null}
      </p>

      {/* 덩어리 목록 + 사진 교체 지점 */}
      {chunks.length > 0 && (
        <div className="ms-22 space-y-1 rounded-md border border-border bg-bg-main/40 p-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
            <ImageIcon size={12} /> 사진이 넘어가는 지점
            <span className="font-normal text-text-dim">덩어리마다 사진을 걸면 그 덩어리부터 사진이 바뀝니다</span>
          </div>
          {chunks.map((c, ci) => {
            const ch = changeAt.get(ci)
            const src = imageSrc(episodeName, ch?.image)
            return (
              <div key={ci} className="flex items-center gap-2 rounded border border-transparent px-1 py-0.5 hover:border-border">
                <span className="w-5 shrink-0 text-center font-mono text-[10px] text-text-dim">{ci + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-text-secondary" title={c}>{c}</span>
                {src && <FactionMediaThumb src={src} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />}
                <input
                  value={ch?.image ?? ''}
                  placeholder={ci === 0 ? '이 덩어리부터 쓸 사진 (비우면 발언 시작 사진)' : '이 덩어리에서 바꿀 사진'}
                  onChange={e => setChange(ci, e.target.value)}
                  className={`w-64 shrink-0 rounded border bg-bg-card px-2 py-1 font-mono text-[10px] focus:border-accent focus:outline-none ${
                    ch ? 'border-accent/60' : 'border-border'
                  }`}
                />
                {ch && (
                  <button onClick={() => removeChange(ci)} className="shrink-0 rounded p-0.5 text-danger-text hover:bg-danger" title="이 지점의 사진 교체를 없앱니다">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {orphan.length > 0 && (
        <p className="ms-22 text-[11px] font-semibold text-warning-text">
          없는 덩어리에 사진이 걸려 있습니다 — {orphan.map(o => `${o.chunk + 1}번`).join(', ')}. 덩어리를 줄이면서 남은 지점입니다. 지워 주세요.
          <button
            onClick={() => onChange({ ...turn, imageChanges: changes.filter(c => c.chunk < chunks.length).length ? changes.filter(c => c.chunk < chunks.length) : undefined })}
            className="ms-1.5 rounded border border-warning-text/50 px-1.5 py-0.5 hover:bg-warning"
          >
            지우기
          </button>
        </p>
      )}
    </div>
  )
}
