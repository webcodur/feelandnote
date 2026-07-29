import { Section } from '../fields'
import { LABEL_CLS, INPUT_CLS, BADGE_CLS, BTN_ADD, BTN_DANGER } from '../constants'
import { toImageChanges } from '../types'
import type { useEpisodeEditor } from '../useEpisodeEditor'

type Ctx = ReturnType<typeof useEpisodeEditor>

export function ShortsSection({ ctx }: { ctx: Ctx }) {
  const {
    openSections, toggle, shorts, setShorts,
    setSegment, addSegment, removeSegment, setSegImage,
    addImageChange, updateImageChange, removeImageChange,
  } = ctx
  return (
    <Section id="shorts" title="SHORTS" badge={shorts ? `${shorts.segments.length}개` : '없음'} open={!!openSections.shorts} onToggle={toggle}>
      <div className="flex items-center gap-3 mb-1">
        <button onClick={addSegment} className={BTN_ADD}>+ 구간 추가</button>
        {shorts && (
          <div className="flex items-center gap-1">
            <label className={`${LABEL_CLS} mb-0`}>featuredBookIndex</label>
            <input type="number" min={0} value={shorts.featuredBookIndex ?? 0}
              onChange={e => setShorts({ ...shorts, featuredBookIndex: parseInt(e.target.value) || 0 })}
              className="w-16 bg-bg-main border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-accent" />
          </div>
        )}
      </div>
      {shorts?.segments.map((seg, idx) => (
        <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-dim w-5">#{idx + 1}</span>
            <input value={seg.id} onChange={e => setSegment(idx, 'id', e.target.value)}
              className="bg-bg-main border border-border rounded px-2 py-1 text-xs w-28 focus:outline-none focus:border-accent"
              placeholder="id" />
            <select value={seg.role} onChange={e => setSegment(idx, 'role', e.target.value)}
              className="bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent">
              <option value="narrator">narrator</option>
              <option value="celeb">celeb</option>
              <option value="summary">summary</option>
            </select>
            <select value={seg.visual} onChange={e => setSegment(idx, 'visual', e.target.value)}
              className="bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent">
              <option value="hook">hook</option>
              <option value="intro">intro</option>
              <option value="book">book</option>
            </select>
            {seg.duration != null && <span className={BADGE_CLS}>{seg.duration}s</span>}
            <div className="flex-1" />
            <button onClick={() => removeSegment(idx)} className={BTN_DANGER}>삭제</button>
          </div>
          <textarea value={seg.text} onChange={e => setSegment(idx, 'text', e.target.value)}
            rows={2} className={`${INPUT_CLS} resize-y`} placeholder="텍스트" />

          {/* 이미지 설정 */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-text-secondary shrink-0 w-14">image</label>
              <input value={seg.image ?? ''} onChange={e => setSegImage(idx, e.target.value)}
                className="flex-1 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                placeholder="예: episodes/done/person/images/shorts-2.png" />
            </div>

            {/* imageChangeAt 편집 */}
            {toImageChanges(seg.imageChangeAt).map((change, cIdx) => (
              <div key={cIdx} className="flex items-center gap-2 pl-14">
                <span className="text-[10px] text-text-dim shrink-0">전환 {cIdx + 1}</span>
                <input type="number" step={0.01} value={change.t}
                  onChange={e => updateImageChange(idx, cIdx, 't', parseFloat(e.target.value) || 0)}
                  className="w-16 bg-bg-main border border-border rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-accent"
                  title="전환 시점 (초)" />
                <span className="text-[10px] text-text-dim">초</span>
                <input value={change.image}
                  onChange={e => updateImageChange(idx, cIdx, 'image', e.target.value)}
                  className="flex-1 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                  placeholder="이미지 경로" />
                <input value={change.text ?? ''}
                  onChange={e => updateImageChange(idx, cIdx, 'text', e.target.value)}
                  className="flex-1 bg-bg-main border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                  placeholder="텍스트 앵커 (선택)" title="이 텍스트 시작 시점에 전환" />
                <button onClick={() => removeImageChange(idx, cIdx)}
                  className="text-danger text-xs hover:opacity-70 shrink-0" title="전환점 삭제">✕</button>
              </div>
            ))}
            <button onClick={() => addImageChange(idx)}
              className="ml-14 text-[10px] text-accent hover:underline">+ 이미지 전환점 추가</button>
          </div>
        </div>
      ))}
      {!shorts && <div className="text-xs text-text-dim">쇼츠 설정 없음 — 추가하려면 구간 추가 클릭</div>}
    </Section>
  )
}
