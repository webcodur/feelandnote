'use client'

import type { EditLang } from '@feelandnote/shared/bo/editor'
import { QuoteEditor, type QuoteAnchor } from '@feelandnote/shared/bo/quote-editor'

type Props = {
  index: number
  editLang: EditLang
  isLine: boolean
  text: string
  textEn?: string
  onTextChange: (text: string) => void
  onTextEnChange: (textEn: string | undefined) => void
  anchors?: Map<number, QuoteAnchor>
  onAddAnchor?: (chunkIndex: number) => void
  onRemoveAnchor?: (chunkIndex: number) => void
  onMoveAnchor?: (fromIndex: number, toIndex: number) => void
  onOpenAnchor?: (chunkIndex: number) => void
}

/** 구 개인 대사의 줄 단위 화면 전환 편집 경험을 장면 컷 본문에 그대로 제공한다. */
export function FactionSceneBeatTextEditor({
  index,
  editLang,
  isLine,
  text,
  textEn,
  onTextChange,
  onTextEnChange,
  anchors,
  onAddAnchor,
  onRemoveAnchor,
  onMoveAnchor,
  onOpenAnchor,
}: Props) {
  return (
    <div className={`grid min-w-0 flex-1 gap-1.5 ${editLang === 'both' ? 'xl:grid-cols-2' : ''}`}>
      {editLang !== 'en' ? (
        <div className="rounded-lg border border-border bg-bg-card p-1 shadow-inner">
          <QuoteEditor
            value={text}
            onChange={onTextChange}
            anchors={anchors}
            onAddAnchor={onAddAnchor}
            onRemoveAnchor={onRemoveAnchor}
            onMoveAnchor={onMoveAnchor}
            onOpenAnchor={onOpenAnchor}
            labelText="화면 전환"
            emptyLabelText="화보 미지정"
            placeholder={isLine ? '대사 입력 · 줄 사이에서 화면을 전환할 수 있습니다' : '해설 입력 · 줄 사이에서 화면을 전환할 수 있습니다'}
            ariaLabel={`${index + 1}번 컷 본문`}
            className="min-h-[84px] text-text-primary placeholder:text-text-dim"
          />
        </div>
      ) : null}
      {editLang !== 'ko' ? (
        <div className="rounded-lg border border-border bg-bg-card/60 p-1 shadow-inner">
          <QuoteEditor
            value={textEn ?? ''}
            onChange={raw => onTextEnChange(raw || undefined)}
            anchors={anchors}
            labelText="화면 전환"
            emptyLabelText="화보 미지정"
            placeholder="EN text · add screen changes between lines"
            ariaLabel={`Beat ${index + 1} text`}
            className="min-h-[84px] italic text-text-secondary placeholder:text-text-dim"
          />
        </div>
      ) : null}
    </div>
  )
}
