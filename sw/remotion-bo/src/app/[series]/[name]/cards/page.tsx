'use client'

/**
 * 카드뉴스 미리보기 탭.
 * remotion BookCard 를 @remotion/player 로 띄운다. 로컬 표지는 /api/rm-asset 통로로 공급한다.
 * 두 편성(A·B)을 옆으로 넘기는 묶음으로 미리본다:
 *   A 「읽은 책 N권」 — 후크 → 인물소개 → 선별 권(표지+왜 읽었나) → 마무리
 *   B 「한 권 깊게」  — 책 소개 → 감상경위 문단별 → 마무리
 * 비율(4:5·1:1·9:16) 전환과 A 묶음 책 선별을 지원한다.
 */
import { useEffect, useMemo, useState } from 'react'
import { Player } from '@remotion/player'
import { useEpisode } from '@/lib/episode-context'
import { BookCard, type BookCardSpec } from '@feelandnote/remotion/src/compositions/BookCard'
import type { BookRecommendScript } from '@feelandnote/remotion/src/compositions/BookRecommend/types'

const ASSET_BASE = '/api/rm-asset'
const CARD_W = 200

const RATIOS = {
  '4:5': [1080, 1350],
  '1:1': [1080, 1080],
  '9:16': [1080, 1920],
} as const
type Ratio = keyof typeof RATIOS

export default function CardsPage() {
  const { episode, name, series } = useEpisode()
  const [mode, setMode] = useState<'A' | 'B' | 'X'>('A')
  const [ratio, setRatio] = useState<Ratio>('4:5')
  const [bookIdx, setBookIdx] = useState(0)
  const [sel, setSel] = useState<number[] | null>(null) // A 묶음 선별 권. null = 기본(앞 5권)
  const [overrides, setOverrides] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [activeEditorId, setActiveEditorId] = useState<string>('')

  useEffect(() => {
    document.title = `${episode?.host?.nickname ?? name} 카드 — Remotion BO`
  }, [episode, name])

  // 인물이 바뀌면 초기화하고 저장된 편성을 불러온다
  useEffect(() => {
    setBookIdx(0)
    setSel(null)
    setOverrides(null)
    fetch(`/api/${series}/cards/${name}`)
      .then(r => r.json())
      .then(d => { 
        if (Array.isArray(d?.selected) && d.selected.length) setSel(d.selected) 
        if (d?.overrides) setOverrides(d.overrides)
      })
      .catch(() => {})
  }, [series, name])

  const saveCards = async () => {
    setSaving(true)
    try {
      await fetch(`/api/${series}/cards/${name}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 1, selected, overrides }),
      })
      setSavedMsg('저장됨'); setTimeout(() => setSavedMsg(''), 2000)
    } catch {
      setSavedMsg('저장 실패'); setTimeout(() => setSavedMsg(''), 2000)
    } finally { setSaving(false) }
  }

  const scriptBase = episode as unknown as BookRecommendScript | null
  
  const script = useMemo(() => {
    if (!scriptBase) return null
    if (!overrides) return scriptBase
    const merged = JSON.parse(JSON.stringify(scriptBase)) as BookRecommendScript
    
    if (overrides.host) {
      Object.assign(merged.host, overrides.host)
    }
    if (overrides.host?.bio) {
      merged.narrator = merged.narrator || {}
      merged.narrator.celebIntro = overrides.host.bio
    }
    if (overrides.books) {
      Object.entries(overrides.books).forEach(([idxStr, bOv]: [string, any]) => {
        const i = Number(idxStr)
        if (merged.books[i]) {
          Object.assign(merged.books[i], bOv)
          if (bOv.context) merged.books[i].contextMain = bOv.context
        }
      })
    }
    return merged
  }, [scriptBase, overrides])

  const books = script?.books ?? []
  const selected = sel ?? books.map((_, i) => i).slice(0, 5)

  const toggle = (i: number) =>
    setSel(prev => {
      const cur = prev ?? books.map((_, k) => k).slice(0, 5)
      return cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i].sort((a, b) => a - b)
    })

  const cards: BookCardSpec[] = useMemo(() => {
    if (!script?.books?.length) return []
    const who = script.host?.nickname ?? ''
    if (mode === 'A') {
      const nc = overrides?.numberCard || {}
      return [
        { 
          type: 'number', 
          value: nc.value ?? String(script.books.length), 
          unit: nc.unit ?? '권의 책', 
          desc: nc.desc ?? `${who}의 서재`, 
          tag: nc.tag ?? '서재 탐방' 
        },
        { type: 'intro' },
        ...selected.map((i): BookCardSpec => ({ type: 'cover', bookIndex: i })),
        { type: 'cta' },
      ]
    }
    if (mode === 'X') {
      // X·쓰레드 단독 — 책별 인용 한 장(캐러셀 아님, 각자 독립 게시물)
      return selected.map((i): BookCardSpec => ({ type: 'quote', bookIndex: i }))
    }
    const b = script.books[bookIdx]
    const nParas = (b?.contextMain ?? '').split('\n\n').filter(Boolean).length || 1
    return [
      { type: 'cover', bookIndex: bookIdx },
      ...Array.from({ length: nParas }, (_, i): BookCardSpec => ({ type: 'context', bookIndex: bookIdx, partIndex: i })),
      { type: 'cta', headline: b?.title ?? '' },
    ]
  }, [script, mode, bookIdx, selected])

  useEffect(() => {
    if (cards.length > 0) {
      const c = cards[0]
      if (c.type === 'number') setActiveEditorId('edit-number')
      else if (c.type === 'intro') setActiveEditorId('edit-intro')
      else if ('bookIndex' in c) setActiveEditorId(`edit-book-${c.bookIndex}`)
    }
  }, [cards])

  if (!episode) return <div className="text-text-dim p-6">로딩...</div>
  if (!script?.books?.length) return <div className="text-text-dim p-6">책 데이터가 없습니다.</div>

  const [w, h] = RATIOS[ratio]
  const CARD_W = 240

  const pill = (active: boolean) =>
    `px-3 py-1.5 text-sm font-semibold rounded-full border transition-colors ${
      active ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-secondary hover:text-text-primary'
    }`
  const handleCardClick = (card: BookCardSpec) => {
    let targetId = ''
    if (card.type === 'number') targetId = 'edit-number'
    else if (card.type === 'intro') targetId = 'edit-intro'
    else if (card.type === 'cover' || card.type === 'context' || card.type === 'quote') targetId = `edit-book-${card.bookIndex}`

    if (targetId) {
      setActiveEditorId(targetId)
    }
  }

  const updateOverride = (path: string[], value: string) => {
    setOverrides((prev: any) => {
      const next = prev ? JSON.parse(JSON.stringify(prev)) : {}
      let cur = next
      for (let i = 0; i < path.length - 1; i++) {
        if (!cur[path[i]]) cur[path[i]] = {}
        cur = cur[path[i]]
      }
      cur[path[path.length - 1]] = value
      return next
    })
  }

  return (
    <div className="flex flex-col -m-6 min-h-[calc(100vh-64px)] bg-[var(--color-bg-main)]">
      {/* 상단 통합 설정 영역 (자연스럽게 스크롤됨) */}
      <div className="p-4 px-6 border-b border-border bg-[var(--color-bg-secondary)] shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2 items-center">
            <button onClick={() => setMode('A')} className={pill(mode === 'A')}>읽은 책 {books.length}권</button>
            <button onClick={() => setMode('B')} className={pill(mode === 'B')}>한 권 깊게</button>
            <button onClick={() => setMode('X')} className={pill(mode === 'X')}>X 단독</button>
            {mode === 'B' && (
              <select value={bookIdx} onChange={e => setBookIdx(Number(e.target.value))}
                className="ml-1 px-2 py-1 text-xs rounded bg-[var(--color-bg-card)] border border-border text-text-primary">
                {books.map((b, i) => <option key={i} value={i}>{i + 1}. {b.title}</option>)}
              </select>
            )}
          </div>
          
          <div className="flex gap-1 items-center">
             {(Object.keys(RATIOS) as Ratio[]).map(rk =>
                <button key={rk} onClick={() => setRatio(rk)} className={pill(ratio === rk)}>{rk}</button>)}
          </div>
        </div>
        
        {/* 책 선별 (A 묶음·X 단독 공용) */}
        {mode !== 'B' && (
          <div className="flex gap-2 items-center mt-3 flex-wrap">
            <span className="text-[11px] text-text-dim">묶음에 넣을 책 ({selected.length}권):</span>
            {books.map((b, i) => (
              <button key={i} onClick={() => toggle(i)}
                className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                  selected.includes(i) ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-dim hover:text-text-secondary'
                }`}>
                {i + 1}. {b.title}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3">
              {savedMsg && <span className="text-xs text-accent">{savedMsg}</span>}
              <button onClick={saveCards} disabled={saving}
                className="px-4 py-1.5 text-xs font-semibold rounded bg-accent text-white disabled:opacity-50">
                {saving ? '저장 중…' : '편성 및 텍스트 저장'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1행: 카드 미리보기 (가로 스크롤) */}
      <div className="sticky top-0 z-30 border-b border-border bg-[var(--color-bg-secondary)] overflow-x-auto shadow-sm">
        <div className="flex gap-10 items-center px-8 py-10 min-w-max w-max mx-auto">
        {cards.map((card, i) => (
          <div key={`${mode}-${bookIdx}-${ratio}-${i}`} className="flex-none flex flex-col items-center justify-center cursor-pointer group" onClick={() => handleCardClick(card)}>
            <div className="relative">
              <div className="absolute inset-0 z-10 group-hover:ring-4 ring-accent/50 transition-all rounded-[10px]" title="클릭하여 편집 영역으로 이동" />
              <Player
                component={BookCard}
                inputProps={{ script, episodeName: name, card, assetBase: ASSET_BASE }}
                durationInFrames={1}
                fps={1}
                compositionWidth={w}
                compositionHeight={h}
                style={{ width: CARD_W, height: (CARD_W * h) / w, borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
                controls={false}
              />
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* 2행: 에디터 (자연스러운 스크롤 영역) */}
      <div className="flex-1 bg-[var(--color-bg-main)]">
        <div className="p-8 max-w-4xl mx-auto space-y-12 pb-32">
          <div className="flex justify-between items-end border-b border-border pb-4">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">오버라이드 에디터</h2>
              <p className="text-sm text-text-dim mt-2">이곳에서 값을 수정하면 원본 영상 데이터를 덮어씁니다. 좌측 카드를 클릭하면 해당 항목으로 즉시 이동합니다.</p>
            </div>
          </div>

          {/* Number Card */}
          {activeEditorId === 'edit-number' && (
            <div id="edit-number" className="space-y-4 scroll-mt-10">
            <h3 className="text-lg font-bold text-accent">1. 읽은 책 N권 (Number Card)</h3>
            <div className="grid grid-cols-2 gap-5 p-6 rounded-2xl bg-[var(--color-bg-card)] border border-border shadow-sm">
              <label className="flex flex-col gap-2 text-sm text-text-dim font-medium">값 (Value)
                <input value={overrides?.numberCard?.value ?? ''} onChange={e => updateOverride(['numberCard', 'value'], e.target.value)} className="p-3 rounded-xl bg-[#ffffff] border border-border text-text-primary focus:border-accent focus:ring-1 ring-accent outline-none transition-all shadow-inner" placeholder={String(scriptBase?.books?.length ?? '')} />
              </label>
              <label className="flex flex-col gap-2 text-sm text-text-dim font-medium">단위 (Unit)
                <input value={overrides?.numberCard?.unit ?? ''} onChange={e => updateOverride(['numberCard', 'unit'], e.target.value)} className="p-3 rounded-xl bg-[#ffffff] border border-border text-text-primary focus:border-accent focus:ring-1 ring-accent outline-none transition-all shadow-inner" placeholder="권의 책" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-text-dim font-medium">설명 (Description)
                <input value={overrides?.numberCard?.desc ?? ''} onChange={e => updateOverride(['numberCard', 'desc'], e.target.value)} className="p-3 rounded-xl bg-[#ffffff] border border-border text-text-primary focus:border-accent focus:ring-1 ring-accent outline-none transition-all shadow-inner" placeholder={`${scriptBase?.host?.nickname}의 서재`} />
              </label>
              <label className="flex flex-col gap-2 text-sm text-text-dim font-medium">태그 (Tag)
                <input value={overrides?.numberCard?.tag ?? ''} onChange={e => updateOverride(['numberCard', 'tag'], e.target.value)} className="p-3 rounded-xl bg-[#ffffff] border border-border text-text-primary focus:border-accent focus:ring-1 ring-accent outline-none transition-all shadow-inner" placeholder="서재 탐방" />
              </label>
            </div>
          </div>
          )}

          {/* Intro Card */}
          {activeEditorId === 'edit-intro' && (
            <div id="edit-intro" className="space-y-4 scroll-mt-10">
            <h3 className="text-lg font-bold text-accent">2. 인물 소개 (Intro Card)</h3>
            <div className="grid grid-cols-2 gap-5 p-6 rounded-2xl bg-[var(--color-bg-card)] border border-border shadow-sm">
              <label className="flex flex-col gap-2 text-sm text-text-dim font-medium">이름 (Nickname)
                <input value={overrides?.host?.nickname ?? ''} onChange={e => updateOverride(['host', 'nickname'], e.target.value)} className="p-3 rounded-xl bg-[#ffffff] border border-border text-text-primary focus:border-accent focus:ring-1 ring-accent outline-none transition-all shadow-inner" placeholder={scriptBase?.host?.nickname} />
              </label>
              <label className="flex flex-col gap-2 text-sm text-text-dim font-medium">직함 (Title)
                <input value={overrides?.host?.title ?? ''} onChange={e => updateOverride(['host', 'title'], e.target.value)} className="p-3 rounded-xl bg-[#ffffff] border border-border text-text-primary focus:border-accent focus:ring-1 ring-accent outline-none transition-all shadow-inner" placeholder={scriptBase?.host?.title} />
              </label>
              <label className="flex flex-col gap-2 text-sm text-text-dim font-medium col-span-2">인물 설명 (Bio)
                <textarea value={overrides?.host?.bio ?? ''} onChange={e => updateOverride(['host', 'bio'], e.target.value)} className="p-3 rounded-xl bg-[#ffffff] border border-border text-text-primary h-24 focus:border-accent focus:ring-1 ring-accent outline-none transition-all shadow-inner leading-relaxed" placeholder={scriptBase?.narrator?.celebIntro} />
              </label>
              <label className="flex flex-col gap-2 text-sm text-text-dim font-medium col-span-2">핵심 철학 (Philosophy)
                <textarea value={overrides?.host?.philosophy ?? ''} onChange={e => updateOverride(['host', 'philosophy'], e.target.value)} className="p-3 rounded-xl bg-[#ffffff] border border-border text-text-primary h-24 focus:border-accent focus:ring-1 ring-accent outline-none transition-all shadow-inner leading-relaxed" placeholder={scriptBase?.host?.featuredQuote || scriptBase?.host?.philosophy} />
              </label>
            </div>
          </div>
          )}

          {/* Books */}
          {activeEditorId?.startsWith('edit-book-') && (
            <div className="space-y-6">
            <h3 className="text-lg font-bold text-accent">3. 책 정보 (Cover / Context)</h3>
            {books.map((b, i) => activeEditorId === `edit-book-${i}` && (
              <div key={i} id={`edit-book-${i}`} className={`space-y-5 p-6 rounded-2xl border shadow-sm scroll-mt-10 transition-all ${selected.includes(i) ? 'border-border bg-[var(--color-bg-card)]' : 'border-border/40 bg-[var(--color-bg-card)] opacity-40 grayscale-[20%]'}`}>
                <div className="font-bold text-lg text-text-primary flex items-center justify-between border-b border-border/50 pb-3">
                  <span>{i + 1}. {b.title} {selected.includes(i) ? '' : <span className="text-sm font-normal text-text-dim ml-2">(선택되지 않음)</span>}</span>
                </div>
                <div className="grid grid-cols-1 gap-5">
                  <label className="flex flex-col gap-2 text-sm text-text-dim font-medium">카드 표시용 단축 제목 (Title)
                    <input value={overrides?.books?.[i]?.title ?? ''} onChange={e => updateOverride(['books', String(i), 'title'], e.target.value)} className="p-3 rounded-xl bg-[#ffffff] border border-border text-text-primary focus:border-accent focus:ring-1 ring-accent outline-none transition-all shadow-inner" placeholder={b.title} />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-text-dim font-medium">감상배경 / 추천이유 (WHY READ)
                    <textarea value={overrides?.books?.[i]?.context ?? ''} onChange={e => updateOverride(['books', String(i), 'context'], e.target.value)} className="p-3 rounded-xl bg-[#ffffff] border border-border text-text-primary h-40 focus:border-accent focus:ring-1 ring-accent outline-none transition-all shadow-inner leading-relaxed" placeholder={b.contextMain} />
                  </label>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
