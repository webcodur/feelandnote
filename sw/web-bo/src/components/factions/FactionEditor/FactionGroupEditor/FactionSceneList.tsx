'use client'

import type { EditLang } from '@feelandnote/shared/bo/editor'
import { ChevronDown, ChevronUp, Plus, Trash2 } from '@feelandnote/shared/bo/icons'
import type { FactionScene } from '@/lib/faction-types'
import { CoverPickerButton } from './CoverPickerButton/CoverPickerButton'

type Props = {
  scenes: FactionScene[]
  onChange: (next: FactionScene[]) => void
  series: string
  episodeName: string
  editLang: EditLang
  heading?: string
  description?: string
}

export function FactionSceneList({
  scenes, onChange, series, episodeName, editLang,
  heading = '이 그룹 뒤 상황 화면',
  description = '마지막 인물 다음에 사건만 잠깐 보여줍니다. 인물·대사·음성 없이 쇼츠와 롱폼에 함께 나옵니다.',
}: Props) {
  const setScene = (index: number, patch: Partial<FactionScene>) => {
    onChange(scenes.map((scene, i) => i === index ? { ...scene, ...patch } : scene))
  }
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= scenes.length) return
    const next = [...scenes]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  const remove = (index: number) => onChange(scenes.filter((_, i) => i !== index))
  const add = () => onChange([...scenes, { title: '새 상황 화면', durationSec: 4.5 }])

  return (
    <section className="space-y-2 rounded-md border border-teal-500/30 bg-teal-500/5 p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-teal-500">{heading}</div>
          <p className="mt-0.5 text-[10px] leading-snug text-text-dim">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="flex shrink-0 items-center gap-1 rounded-md border border-teal-500/50 px-2 py-1 text-[11px] font-bold text-teal-500 hover:bg-teal-500/10"
        >
          <Plus size={13} /> 상황 화면 추가
        </button>
      </div>

      {scenes.map((scene, index) => (
        <div key={index} className="space-y-2 rounded-md border border-border bg-bg-main/50 p-2">
          <div className="flex items-start gap-2">
            <span className="mt-1 shrink-0 rounded bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-bold text-teal-500">
              상황 {index + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              {editLang !== 'en' && (
                <>
                  <input
                    value={scene.title}
                    onChange={event => setScene(index, { title: event.target.value })}
                    placeholder="상황 제목 (예: 퀴클롭스의 동굴)"
                    className="w-full rounded border border-border bg-bg-card px-2 py-1 text-xs font-bold focus:border-accent focus:outline-none"
                  />
                  <textarea
                    value={scene.caption ?? ''}
                    onChange={event => setScene(index, { caption: event.target.value || undefined })}
                    rows={2}
                    placeholder="대사가 아닌 사건 설명 한두 줄"
                    className="w-full resize-none rounded border border-border bg-bg-card px-2 py-1 text-[11px] leading-snug focus:border-accent focus:outline-none"
                  />
                </>
              )}
              {editLang !== 'ko' && (
                <>
                  <input
                    value={scene.titleEn ?? ''}
                    onChange={event => setScene(index, { titleEn: event.target.value || undefined })}
                    placeholder="English scene title"
                    className="w-full rounded border border-border/60 bg-bg-card/50 px-2 py-1 text-xs font-bold text-text-secondary focus:border-accent focus:outline-none"
                  />
                  <textarea
                    value={scene.captionEn ?? ''}
                    onChange={event => setScene(index, { captionEn: event.target.value || undefined })}
                    rows={2}
                    placeholder="Brief English event description"
                    className="w-full resize-none rounded border border-border/60 bg-bg-card/50 px-2 py-1 text-[11px] leading-snug text-text-secondary focus:border-accent focus:outline-none"
                  />
                </>
              )}
            </div>
            <CoverPickerButton
              value={scene.media}
              onChange={media => setScene(index, { media })}
              crop={scene.mediaCrop}
              onCropChange={mediaCrop => setScene(index, { mediaCrop })}
              label="장면"
              emptyText="텍스트 배경"
              series={series}
              episodeName={episodeName}
              className="h-24 w-36"
            />
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => move(index, -1)} className="rounded border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="위로">
                <ChevronUp size={13} />
              </button>
              <button type="button" onClick={() => move(index, 1)} className="rounded border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="아래로">
                <ChevronDown size={13} />
              </button>
              <button type="button" onClick={() => remove(index)} className="rounded border border-border p-1.5 text-danger-text hover:bg-danger/15" title="상황 화면 삭제">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-16">
            <label className="flex items-center gap-1 text-[10px] text-text-dim">
              길이
              <input
                type="number"
                min={2}
                max={15}
                step={0.5}
                value={scene.durationSec ?? 4.5}
                onChange={event => setScene(index, { durationSec: Math.min(15, Math.max(2, Number(event.target.value) || 4.5)) })}
                className="w-16 rounded border border-border bg-bg-card px-1.5 py-1 font-mono text-[11px] focus:border-accent focus:outline-none"
              />
              초
            </label>
            <input
              value={scene.sfx ?? ''}
              onChange={event => setScene(index, { sfx: event.target.value || undefined })}
              placeholder="효과음 파일 (선택, common/sfx/ 하위)"
              className="min-w-0 flex-1 rounded border border-border bg-bg-card px-2 py-1 text-[11px] focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      ))}
    </section>
  )
}
