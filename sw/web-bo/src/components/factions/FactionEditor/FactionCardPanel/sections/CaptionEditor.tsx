import type { FactionCardFields, FactionGroupCardFields } from '@/lib/faction-types'

export function CaptionEditor({
  view, person, g, capFeed, setCapFeed, capThreads, setCapThreads, capX, setCapX, saveCards, saveGroupCards
}: {
  view: 'person' | 'cluster' | 'group'
  person?: any
  g?: any
  capFeed: string
  setCapFeed: (v: string) => void
  capThreads: string
  setCapThreads: (v: string) => void
  capX: string
  setCapX: (v: string) => void
  saveCards: (name: string, patch: Partial<FactionCardFields>) => void
  saveGroupCards: (name: string, patch: Partial<FactionGroupCardFields>) => void
}) {
  if (view === 'cluster') return null

  return (
    <details className="rounded-md border border-border/60 bg-bg-card/30 p-3">
      <summary className="cursor-pointer select-none text-xs font-semibold text-text-secondary">
        게시 캡션 — {view === 'person' ? person?.name : g?.name?.split('\n')[0]} <span className="font-normal text-text-dim">(게시물과 함께 나갈 글 · 복사해서 사용)</span>
      </summary>
      <div className="mt-3 space-y-3">
        <div className="flex items-start gap-2">
          <div className="w-28 shrink-0 pt-1.5 text-[11px] text-text-dim">
            피드 캡션
            <div className="font-normal opacity-70">인스타·틱톡 캐러셀 캡션. 첫 줄이 후크, 나머지는 접힘</div>
          </div>
          <textarea
            rows={4}
            value={capFeed}
            onChange={e => setCapFeed(e.target.value)}
            placeholder={`예) ${(person?.cardGuides?.brief ?? `오늘의 인물, ${person?.name ?? ''}`).split('\n')[0]}`}
            className="w-full resize-y rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs leading-relaxed focus:border-accent focus:outline-none"
          />
          <button
            onClick={() => navigator.clipboard.writeText(capFeed)}
            disabled={!capFeed.trim()}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-hover disabled:opacity-40"
            title="피드 캡션 복사"
          >복사</button>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-28 shrink-0 pt-1.5 text-[11px] text-text-dim">
            쓰레드 본문
            <div className="font-normal opacity-70">글이 주인공. 첫 줄이 후크 전체를 책임짐, 해시태그 없음</div>
          </div>
          <textarea
            rows={3}
            value={capThreads}
            onChange={e => setCapThreads(e.target.value)}
            placeholder="예) 대화를 여는 한 문장 후크 + 카드 예고 한 줄"
            className="w-full resize-y rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs leading-relaxed focus:border-accent focus:outline-none"
          />
          <button
            onClick={() => navigator.clipboard.writeText(capThreads)}
            disabled={!capThreads.trim()}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-hover disabled:opacity-40"
            title="쓰레드 본문 복사"
          >복사</button>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-28 shrink-0 pt-1.5 text-[11px] text-text-dim">
            X 본문
            <div className="font-normal opacity-70">단독 대사 카드와 함께. 대사 반복 말고 맥락 담당</div>
          </div>
          <textarea
            rows={3}
            value={capX}
            onChange={e => setCapX(e.target.value)}
            placeholder={`예) ${(person?.cardGuides?.quote ?? '').split('\n')[0] || '대사의 배경 맥락 한두 문장'}`}
            className="w-full resize-y rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs leading-relaxed focus:border-accent focus:outline-none"
          />
          <button
            onClick={() => navigator.clipboard.writeText(capX)}
            disabled={!capX.trim()}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-hover disabled:opacity-40"
            title="X 본문 복사"
          >복사</button>
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 pt-2">
          <span className="text-[10px] text-text-dim">저장하면 카드 대본 파일(person-cards/인물명.json)에 기록됩니다 · 링크는 캡션에 넣지 말 것(도달 저하) — 답글·바이오에</span>
          <button
            onClick={() => {
              const data = capFeed.trim() || capThreads.trim() || capX.trim()
                ? {
                  ...(capFeed.trim() ? { feed: capFeed } : {}),
                  ...(capThreads.trim() ? { threads: capThreads } : {}),
                  ...(capX.trim() ? { x: capX } : {}),
                }
                : undefined
              if (view === 'group' && g) saveGroupCards(g.name, { cardCaptions: data })
              else if (person) saveCards(person.name, { cardCaptions: data })
            }}
            className="ml-auto shrink-0 rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20"
          >
            캡션 저장
          </button>
        </div>
      </div>
    </details>
  )
}
