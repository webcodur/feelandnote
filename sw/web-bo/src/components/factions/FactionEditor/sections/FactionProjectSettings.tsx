'use client'

import type { FactionScript, HoldMotion } from '@/lib/faction-types'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { HOLD_MOTION_OPTIONS } from '../../shared/holdMotion'

type Props = {
  script: FactionScript
  editLang: EditLang
  onChange: (patch: Partial<FactionScript>) => void
  onOpenEffects: () => void
  onApplyHold: (motion: HoldMotion) => void
  onClearHold: () => void
}

const fieldClass = 'w-full rounded-lg border border-border bg-bg-main px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none'
const TRANSITION_LABELS: Record<string, string> = {
  auto: '자동 순환', zoomout: '줌 아웃', zoomin: '줌 인', kenburns: '켄 번즈',
  slideLeft: '우측 등장', slideRight: '좌측 등장', glitch: '지직거림', tear: '갈라짐',
  crt: 'CRT', zoompunch: '줌 펀치', whip: '휩', filmburn: '필름 번', pixelate: '흐림→선명', shutter: '셔터',
}

export function FactionProjectSettings({
  script, editLang, onChange, onOpenEffects, onApplyHold, onClearHold,
}: Props) {
  const holdMotion = (script.holdMotion ?? 'none') as HoldMotion
  const titleSummary = script.title.split('\n').map(line => line.trim()).find(Boolean) || '제목 없음'
  const transitionLabel = TRANSITION_LABELS[script.transition ?? 'zoomout'] ?? '줌 아웃'
  const holdLabel = HOLD_MOTION_OPTIONS.find(option => option.value === holdMotion)?.label ?? '정지'

  return (
    <details className="group border border-border bg-bg-card open:xl:col-span-2">
      <summary className="flex h-12 cursor-pointer list-none items-center gap-3 px-3 hover:bg-bg-hover">
        <span className="shrink-0 text-xs font-black text-accent">프로젝트</span>
        <strong className="min-w-0 flex-1 truncate text-sm text-text-primary">{titleSummary}</strong>
        <span className="hidden text-xs text-text-tertiary md:inline">등장 {transitionLabel}</span>
        <span className="hidden h-4 w-px bg-border md:block" aria-hidden="true" />
        <span className="hidden text-xs text-text-tertiary md:inline">지속 {holdLabel}</span>
        <span className="text-text-tertiary group-open:rotate-180" aria-hidden="true">⌄</span>
      </summary>

      <div className="grid gap-4 border-t border-border p-3 xl:grid-cols-[minmax(0,1fr)_minmax(32rem,1.15fr)]">
        <fieldset className={`grid gap-2 ${editLang === 'both' ? 'md:grid-cols-2' : ''}`}>
          <legend className="mb-2 text-xs font-bold text-text-secondary">영상 제목</legend>
          {editLang !== 'en' && <textarea rows={2} aria-label="한국어 영상 제목" value={script.title} onChange={event => onChange({ title: event.target.value })} placeholder={'영상 제목\n보조 설명'} className={`${fieldClass} resize-y font-bold`} />}
          {editLang !== 'ko' && <textarea rows={2} aria-label="영문 영상 제목" value={script.titleEn ?? ''} onChange={event => onChange({ titleEn: event.target.value || undefined })} placeholder={'English title\nSupporting description'} className={`${fieldClass} resize-y font-bold`} />}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-bold text-text-secondary">기본 사진 움직임</legend>
          <div className="grid items-end gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="space-y-1"><span className="text-[11px] text-text-tertiary">등장 전환</span><select value={script.transition ?? 'zoomout'} onChange={event => onChange({ transition: event.target.value as FactionScript['transition'] })} className={fieldClass}><option value="auto">자동 순환</option><option value="zoomout">줌 아웃</option><option value="zoomin">줌 인</option><option value="kenburns">확대하며 위로 이동</option><option value="slideLeft">오른쪽에서 등장</option><option value="slideRight">왼쪽에서 등장</option><option value="glitch">TV 지직거림</option><option value="tear">가운데 갈라짐</option><option value="crt">옛 TV 켜지듯</option><option value="zoompunch">확 다가오기</option><option value="whip">빠르게 스쳐 지나기</option><option value="filmburn">필름 타들어가듯</option><option value="pixelate">흐림→선명</option><option value="shutter">블라인드 열리기</option></select></label>
            <label className="space-y-1"><span className="text-[11px] text-text-tertiary">지속 움직임</span><select value={holdMotion} onChange={event => onChange({ holdMotion: event.target.value as HoldMotion })} className={fieldClass}>{HOLD_MOTION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <button type="button" onClick={onOpenEffects} className="h-9 rounded-md border border-accent bg-accent/10 px-3 text-xs font-bold text-accent hover:bg-accent/20">전체 효과</button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => onApplyHold(holdMotion)} className="h-8 rounded-md border border-border px-2.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary">모든 컷에 적용</button>
            <button type="button" onClick={onClearHold} className="h-8 rounded-md border border-border px-2.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover hover:text-text-primary">모두 정지</button>
          </div>
        </fieldset>
      </div>
    </details>
  )
}
