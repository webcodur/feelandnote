'use client'

import type { FactionScript } from '@/lib/faction-types'

type Props = {
  script: FactionScript
  onChange: (patch: Partial<FactionScript>) => void
  onApplyAll: () => void
  onClearOverrides: () => void
}

const fieldClass = 'h-9 rounded-md border border-border bg-bg-main px-2.5 text-xs text-text-primary focus:border-accent focus:outline-none'

export function FactionDialogueSettings({ script, onChange, onApplyAll, onClearOverrides }: Props) {
  const caption = (script.quoteDisplay ?? 'box') === 'caption'

  return (
    <section className="flex flex-wrap items-end gap-2 border border-border bg-bg-card p-2.5">
      <header className="mr-2 w-44 shrink-0 self-center">
        <h2 className="text-sm font-black text-text-primary">대사·장면 자막</h2>
        <p className="mt-0.5 text-[11px] text-text-tertiary">에피소드 기본값</p>
      </header>

        <div role="group" aria-label="대사 표시 방식" className="flex h-9 shrink-0 overflow-hidden rounded-md border border-border bg-bg-main">
          <button
            type="button"
            aria-pressed={!caption}
            onClick={() => onChange({ quoteDisplay: 'box' })}
            className={`px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${!caption ? 'bg-accent text-bg-main' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}`}
            title="화자 정보와 대사를 박스로 표시"
          >
            대사형
          </button>
          <button
            type="button"
            aria-pressed={caption}
            onClick={() => onChange({ quoteDisplay: 'caption' })}
            className={`border-l border-border px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${caption ? 'bg-accent text-bg-main' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}`}
            title="이름 뒤 같은 자리에 타이핑 자막 표시"
          >
            자막형
          </button>
        </div>

          <label className="space-y-1">
            <span className="block text-[10px] font-bold text-text-tertiary">자막 위치</span>
            <select value={script.quoteCaptionPos ?? 'bottom'} onChange={event => onChange({ quoteCaptionPos: event.target.value === 'center' ? 'center' : 'bottom' })} className={`${fieldClass} w-full`}>
              <option value="bottom">하단</option>
              <option value="center">중하단</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[10px] font-bold text-text-tertiary">글자 크기</span>
            <select value={script.quoteCaptionSize ?? 'default'} onChange={event => onChange({ quoteCaptionSize: event.target.value === 'large' ? 'large' : 'default' })} className={`${fieldClass} w-full`}>
              <option value="default">기본</option>
              <option value="large">크게</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[10px] font-bold text-text-tertiary">글꼴</span>
            <select value={script.quoteCaptionFont ?? 'default'} onChange={event => onChange({ quoteCaptionFont: event.target.value === 'serif' ? 'serif' : 'default' })} className={`${fieldClass} w-full`}>
              <option value="default">고딕</option>
              <option value="serif">명조</option>
            </select>
          </label>
      <span className="mx-1 hidden h-8 w-px self-end bg-border xl:block" aria-hidden="true" />
      <button type="button" onClick={onApplyAll} className="h-9 rounded-md border border-border px-3 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary">모든 인물 적용</button>
      <button type="button" onClick={onClearOverrides} className="h-9 rounded-md border border-border px-3 text-xs font-semibold text-text-secondary hover:bg-bg-hover hover:text-text-primary">개별값 지우기</button>
      <p className="min-w-48 flex-1 self-center text-right text-[11px] text-text-tertiary">미할당 해설은 에피소드 기본값, 인물 할당 대사는 그 인물의 개별값을 우선합니다.</p>
    </section>
  )
}
