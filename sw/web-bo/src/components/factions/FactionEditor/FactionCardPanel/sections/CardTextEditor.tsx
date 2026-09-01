import type { Dispatch, SetStateAction } from 'react'
import type { FactionGroupCardFields } from '@/lib/faction-types'

export function CardTextEditor({
  view, person, g,
  headline, setHeadline, body, setBody, quoteText, setQuoteText,
  tlOn, setTlOn, tlTitle, setTlTitle, tlItems, setTlItems,
  onSave, saveGroupCards
}: {
  view: 'person' | 'cluster' | 'group'
  person?: any
  g?: any
  headline: string
  setHeadline: (v: string) => void
  body: string
  setBody: (v: string) => void
  quoteText: string
  setQuoteText: (v: string) => void
  tlOn: boolean
  setTlOn: (v: boolean) => void
  tlTitle: string
  setTlTitle: (v: string) => void
  tlItems: { year: string; text: string }[]
  setTlItems: Dispatch<SetStateAction<{ year: string; text: string }[]>>
  onSave: () => void
  saveGroupCards: (name: string, patch: Partial<FactionGroupCardFields>) => void
}) {
  if (view === 'cluster') return null

  return (
    <details className="rounded-md border border-border/60 bg-bg-card/30 p-3" open={view === 'group'}>
      <summary className="cursor-pointer select-none text-xs font-semibold text-text-secondary">
        카드 문구 편집{view === 'person' ? (person ? ` — ${person.name}` : '') : (g ? ` — ${g.name?.split('\n')[0]}` : '')} <span className="font-normal text-text-dim">(비우면 데이터 자동)</span>
      </summary>
      <div className="mt-3 space-y-3">
        {(view === 'person' ? person : g) && (
          <>
            <div className="flex items-start gap-2">
              <label className="w-24 shrink-0 pt-1.5 text-[11px] text-text-dim">후크 문구</label>
              <input
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder={person?.lines?.[0] || '예: 은행 없는 돈을 만들고 사라진 사람 (줄바꿈은 \\n)'}
                className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex items-start gap-2">
              <label className="w-24 shrink-0 pt-1.5 text-[11px] text-text-dim">소개 글</label>
              <textarea
                rows={3}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={person?.epithet || '인물 한 문단 소개'}
                className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </div>
            {view === 'person' && (
              <div className="flex items-start gap-2">
                <label className="w-24 shrink-0 pt-1.5 text-[11px] text-text-dim">대사</label>
                <textarea
                  rows={2}
                  value={quoteText}
                  onChange={e => setQuoteText(e.target.value)}
                  placeholder={person?.quote || '카드용 대사(영상 대사보다 짧게)'}
                  className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                />
              </div>
            )}
            {view === 'group' && g && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => saveGroupCards(g.name, { cardStory: [...(g.cardStory ?? []), { text: '' }] })}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                >+ 스토리 장 추가</button>
              </div>
            )}
          </>
        )}
        {/* 연표 카드 — 인물별 데이터가 없어 직접 작성한다. 켜면 카드 목록에 들어간다 */}
        {view === 'person' && (
          <div className="flex items-start gap-2 border-t border-border/60 pt-2">
            <label className="flex w-24 shrink-0 cursor-pointer items-center gap-1.5 pt-1.5 text-[11px] font-semibold text-text-secondary">
              <input type="checkbox" checked={tlOn} onChange={e => setTlOn(e.target.checked)} className="accent-accent" />
              연표 카드
            </label>
            {tlOn ? (
              <div className="min-w-0 flex-1 space-y-1.5">
                <input
                  value={tlTitle}
                  onChange={e => setTlTitle(e.target.value)}
                  placeholder="연표 제목 (예: 그가 남긴 것)"
                  className="w-full rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                />
                {tlItems.map((it, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={it.year}
                      onChange={e => setTlItems(items => items.map((x, idx) => (idx === i ? { ...x, year: e.target.value } : x)))}
                      placeholder="연도"
                      className="w-20 shrink-0 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                    />
                    <input
                      value={it.text}
                      onChange={e => setTlItems(items => items.map((x, idx) => (idx === i ? { ...x, text: e.target.value } : x)))}
                      placeholder="그 해의 사건"
                      className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                    />
                    <button
                      onClick={() => setTlItems(items => (items.length > 1 ? items.filter((_, idx) => idx !== i) : items))}
                      className="shrink-0 px-1 text-danger-text hover:underline"
                      title="이 줄 삭제"
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => setTlItems(items => [...items, { year: '', text: '' }])}
                  className="rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-hover"
                >+ 줄 추가</button>
              </div>
            ) : null}
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-border/60 pt-2">
          <span className="text-[10px] text-text-dim">저장하면 카드 대본 파일({view === 'group' ? 'group-cards' : 'person-cards'})에 바로 기록됩니다</span>
          <button
            onClick={onSave}
            className="ml-auto shrink-0 rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20"
            title="이 문구를 카드 대본에 저장 — 영상 데이터는 건드리지 않는다"
          >
            이 {view === 'group' ? '세력' : '인물'}에 문구 저장
          </button>
        </div>
      </div>
    </details>
  )
}
