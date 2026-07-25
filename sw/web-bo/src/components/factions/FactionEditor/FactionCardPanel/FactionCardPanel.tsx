'use client'

import { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react'
import { mergeFactionCards, type FactionScript } from '@/lib/faction-types'
import type { FactionCardSpec } from '@feelandnote/remotion/src/compositions/FactionCard'
import type { FactionScript as RmFactionScript } from '@feelandnote/remotion/src/compositions/Faction/types'

import {
  RATIOS, COMMON_PERSON_CARD_GUIDES, peopleOf, FactionCardInitialTarget,
  findPersonSelection, resolveCardId, pushCardRoute, RatioId
} from './utils'
import { useFactionCardState } from './hooks/useFactionCardState'

import { CardToolbar } from './sections/CardToolbar'
import { DeployGuidePanel } from './sections/DeployGuidePanel'
import { CaptionEditor } from './sections/CaptionEditor'
import { CardTextEditor } from './sections/CardTextEditor'
import { CardGrid } from './sections/CardGrid'
import { CardEditModal } from './sections/CardEditModal'

export function FactionCardPanel({ script: videoScript, episodeName, series, initialTarget, routeBasePath }: {
  script: FactionScript
  episodeName: string
  series: string
  initialTarget?: FactionCardInitialTarget
  routeBasePath?: string
}) {
  const { cardsFile, cardsLoaded, saveCards, saveGroupCards } = useFactionCardState(series, episodeName)
  const script = useMemo(() => mergeFactionCards(videoScript, cardsFile), [videoScript, cardsFile])

  const [ratioId, setRatioId] = useState<RatioId>('4x5')
  const [view, setView] = useState<'person' | 'cluster' | 'group'>('person')
  const [gi, setGi] = useState(0)
  const [pi, setPi] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [allRatios, setAllRatios] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [edit, setEdit] = useState<{ id: string; label: string; card: FactionCardSpec } | null>(null)
  
  const appliedInitialSelection = useRef(false)
  const openedInitialTarget = useRef<string | null>(null)
  
  const [draftGuide, setDraftGuide] = useState('')
  const [draftStory, setDraftStory] = useState('')
  const [draftStoryImg, setDraftStoryImg] = useState('')
  const [draftQuote, setDraftQuote] = useState('')
  const [draftQImg, setDraftQImg] = useState('')
  const [draftFace, setDraftFace] = useState('')
  
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [quoteText, setQuoteText] = useState('')
  const [tlOn, setTlOn] = useState(false)
  const [tlTitle, setTlTitle] = useState('')
  const [tlItems, setTlItems] = useState<{ year: string; text: string }[]>([{ year: '', text: '' }])
  
  const [capFeed, setCapFeed] = useState('')
  const [capThreads, setCapThreads] = useState('')
  const [capX, setCapX] = useState('')

  useEffect(() => {
    const gs = script.groups ?? []
    const grp = gs[Math.min(gi, gs.length - 1)]
    if (!grp) return
    if (view === 'group') {
      setHeadline(grp.cardHeadline ?? '')
      setBody(grp.cardBody ?? '')
      setQuoteText('')
      setTlOn(false)
      setCapFeed(grp.cardCaptions?.feed ?? '')
      setCapThreads(grp.cardCaptions?.threads ?? '')
      setCapX(grp.cardCaptions?.x ?? '')
    } else {
      const ppl = peopleOf(grp)
      const p = ppl[Math.min(pi, Math.max(0, ppl.length - 1))]
      setHeadline(p?.cardHeadline ?? '')
      setBody(p?.cardBody ?? '')
      setQuoteText(p?.quoteCard ?? '')
      const tl = p?.cardTimeline
      setTlOn(!!tl)
      setTlTitle(tl?.title ?? '')
      setTlItems(tl?.items?.length ? tl.items.map(it => ({ ...it })) : [{ year: '', text: '' }])
      setCapFeed(p?.cardCaptions?.feed ?? '')
      setCapThreads(p?.cardCaptions?.threads ?? '')
      setCapX(p?.cardCaptions?.x ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, gi, pi, cardsFile])

  const ratio = RATIOS.find(r => r.id === ratioId) ?? RATIOS[0]
  const groups = script.groups ?? []
  const hasGroups = groups.length > 0
  
  const initialSelection = initialTarget?.personName ? findPersonSelection(groups, initialTarget.personName) : null
  useEffect(() => {
    if (appliedInitialSelection.current || !initialSelection) return
    appliedInitialSelection.current = true
    setView(initialSelection.view ?? 'person')
    setGi(initialSelection.gi)
    setPi(initialSelection.pi)
  }, [initialSelection?.view, initialSelection?.gi, initialSelection?.pi])

  const safeGi = hasGroups ? Math.min(gi, groups.length - 1) : 0
  const g = groups[safeGi] ?? ({ name: '', clusters: [], people: [] } as unknown as FactionScript['groups'][number])
  const people = peopleOf(g)
  const safePi = Math.min(pi, Math.max(0, people.length - 1))
  const person = people[safePi]

  const routeToCardBoard = (nextView = view, nextGroup = g) => pushCardRoute(routeBasePath, nextView, (nextGroup?.name || '').split('\n')[0])
  const routeToPerson = (nextPerson = person) => pushCardRoute(routeBasePath, 'person', nextPerson?.name)
  const routeToPersonCard = (cardId: string) => {
    if (view === 'person') pushCardRoute(routeBasePath, 'person', person?.name, cardId)
    else pushCardRoute(routeBasePath, view, (g?.name || '').split('\n')[0], cardId)
  }

  const selectView = (nextView: 'person' | 'cluster' | 'group') => {
    setView(nextView)
    if (nextView === 'person') routeToPerson()
    else routeToCardBoard(nextView, g)
  }
  const selectGroup = (nextGi: number) => {
    setGi(nextGi)
    setPi(0)
    const nextGroup = groups[nextGi] ?? ({ name: '', clusters: [], people: [] } as unknown as FactionScript['groups'][number])
    if (view !== 'person') {
      routeToCardBoard(view, nextGroup)
      return
    }
    routeToPerson(peopleOf(nextGroup)[0])
  }
  const selectPerson = (nextPi: number) => {
    setPi(nextPi)
    if (view === 'person') routeToPerson(people[nextPi])
  }

  const dHeadline = useDeferredValue(headline)
  const dBody = useDeferredValue(body)
  const dQuote = useDeferredValue(quoteText)
  const dTlTitle = useDeferredValue(tlTitle)
  const dTlItems = useDeferredValue(tlItems)

  const quoteCard: FactionCardSpec = {
    type: 'quote', groupIndex: safeGi, personIndex: safePi, bg: 'photo',
    ...(dQuote.trim() ? { quoteCard: dQuote } : {}),
  }
  const tlValidItems = dTlItems.filter(it => it.year.trim() || it.text.trim())
  const clusters = g.clusters ?? []
  
  let personCi = 0
  for (let ci = 0, acc = 0; ci < clusters.length; ci++) {
    const n = clusters[ci].people?.length ?? 0
    if (safePi < acc + n) { personCi = ci; break }
    acc += n
  }
  const clusterFlatStart = clusters.slice(0, personCi).reduce((s, c) => s + (c.people?.length ?? 0), 0)

  const cards: { id: string; label: string; card: FactionCardSpec }[] = view === 'group'
    ? [
      { id: 'cover', label: '표지', card: { type: 'cover', groupIndex: safeGi } },
      { id: 'context', label: '강령', card: { type: 'context', groupIndex: safeGi } },
      ...clusters.map((_, ci) => ({
        id: `shot${ci}`,
        label: clusters.length > 1 ? `그룹샷${ci + 1}` : '그룹샷',
        card: { type: 'groupshot', groupIndex: safeGi, clusterIndex: ci } as FactionCardSpec,
      })),
      { id: 'outro', label: '아웃트로', card: { type: 'outro', groupIndex: safeGi, headline: g.cardHeadline || '다음 편을\n기대해주세요', sub: '필앤노트 오리지널 연재', cta: '유튜브 · 필앤노트 닷컴' } as FactionCardSpec },
    ]
    : view === 'cluster'
      ? [
        { id: 'shot', label: '그룹샷', card: { type: 'groupshot', groupIndex: safeGi, clusterIndex: personCi } as FactionCardSpec },
        ...(clusters[personCi]?.people ?? []).flatMap((p, i) => {
          const flat = clusterFlatStart + i
          const name = p.name || `인물${i + 1}`
          const out: { id: string; label: string; card: FactionCardSpec }[] = [
            { id: `mystery${flat}`, label: `? ${name}`, card: { type: 'mystery', groupIndex: safeGi, personIndex: flat } },
          ]
          if (i === 0) {
            out.push({ id: `quote${flat}`, label: `“ ${name}`, card: { type: 'quote', groupIndex: safeGi, personIndex: flat, bg: 'photo' } })
          }
          if (p.cardTimeline?.items?.length) {
            out.push({ id: `tl${flat}`, label: `연표 ${name}`, card: { type: 'timeline', groupIndex: safeGi, title: p.cardTimeline.title, items: p.cardTimeline.items } })
          }
          return out
        }),
      ]
      : (() => {
        if (!person) return []
        const hasQuote = !!(dQuote.trim() || person.quoteCard || person.quote)
        const gd = person.cardGuides ?? {}
        const shotGuide = gd.shot?.trim() || COMMON_PERSON_CARD_GUIDES.shot
        return [
          ...(hasQuote
            ? [{ id: 'quote', label: '대사', card: { ...quoteCard, guide: gd.quote } as FactionCardSpec }]
            : []),
          { id: 'identity', label: '신원', card: { type: 'identity', groupIndex: safeGi, personIndex: safePi, guide: gd.identity ?? person.epithet } as FactionCardSpec },
          ...(clusters.length
            ? [{ id: 'shot', label: '소속', card: { type: 'groupshot', groupIndex: safeGi, clusterIndex: personCi, withFaction: true, guide: shotGuide } as FactionCardSpec }]
            : []),
        ]
      })()

  const shown = cards.filter(c => !hidden.has(c.id))
  const toggleType = (id: string) =>
    setHidden(h => { const n = new Set(h); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const previewW = 368
  const previewH = (previewW * ratio.h) / ratio.w

  const rm = script as unknown as RmFactionScript

  const persist = () => {
    const rawItems = tlItems.filter(it => it.year.trim() || it.text.trim())
    if (view === 'group') {
      if (!g) return
      saveGroupCards(g.name, {
        cardHeadline: headline.trim() || undefined,
        cardBody: body.trim() || undefined,
      })
    } else {
      if (!person) return
      saveCards(person.name, {
        cardHeadline: headline.trim() || undefined,
        cardBody: body.trim() || undefined,
        quoteCard: quoteText.trim() || undefined,
        cardTimeline: tlOn && rawItems.length ? { title: tlTitle.trim() || undefined, items: rawItems } : undefined,
      })
    }
  }

  const GUIDE_KEYS = ['brief', 'quote', 'identity', 'logo', 'shot', 'map', 'about'] as const
  type GuideKey = (typeof GUIDE_KEYS)[number]
  const editGuideKey: GuideKey | null = edit && (GUIDE_KEYS as readonly string[]).includes(edit.id) ? (edit.id as GuideKey) : null
  const editStoryIndex = edit?.id.startsWith('story') ? Number(edit.id.slice(5)) : null
  const editGuideFallback =
    editGuideKey === 'identity' ? person?.epithet
      : editGuideKey === 'brief' ? edit?.card.guide
        : editGuideKey === 'shot' ? COMMON_PERSON_CARD_GUIDES.shot
          : editGuideKey === 'map' ? COMMON_PERSON_CARD_GUIDES.map
            : undefined

  const openEdit = (id: string, label: string, card: FactionCardSpec) => {
    const gd2 = person?.cardGuides ?? {}
    setDraftGuide((GUIDE_KEYS as readonly string[]).includes(id) ? (gd2[id as GuideKey] ?? '') : '')
    if (id.startsWith('story')) {
      const beat = view === 'group' ? g.cardStory?.[Number(id.slice(5))] : person?.cardStory?.[Number(id.slice(5))]
      setDraftStory(beat?.text ?? '')
      setDraftStoryImg(beat?.image ?? '')
    }
    if (id === 'quote') setDraftQuote(person?.quoteCard ?? '')
    if (id === 'quote') setDraftQImg(person?.cardQuoteImage ?? '')
    if (id === 'identity') setDraftFace(person?.cardFace ?? '')
    setEdit({ id, label, card })
  }
  const openRoutedEdit = (id: string, label: string, card: FactionCardSpec) => {
    if (view === 'person') routeToPersonCard(id)
    else routeToCardBoard()
    openEdit(id, label, card)
  }
  const closeEdit = () => {
    setEdit(null)
    if (view === 'person') routeToPerson()
  }

  const editPreviewCard: FactionCardSpec | undefined = edit
    ? {
      ...edit.card,
      ...(editGuideKey ? { guide: draftGuide.trim() || editGuideFallback } : {}),
      ...(editStoryIndex != null ? { text: draftStory, ...(draftStoryImg.trim() ? { image: draftStoryImg.trim() } : {}) } : {}),
      ...(edit.id === 'quote' && draftQuote.trim() ? { quoteCard: draftQuote } : {}),
      ...(edit.id === 'identity' && draftFace.trim() ? { face: draftFace.trim() } : {}),
    } as FactionCardSpec
    : undefined

  const saveEdit = () => {
    if (!edit) return
    if (view === 'group') {
      if (!g) return
      const patch: Partial<import('@/lib/faction-types').FactionGroupCardFields> = {}
      if (editStoryIndex != null) {
        patch.cardStory = (g.cardStory ?? []).map((b, i) =>
          i === editStoryIndex
            ? { text: draftStory, ...(draftStoryImg.trim() ? { image: draftStoryImg.trim() } : {}) }
            : b,
        )
      }
      saveGroupCards(g.name, patch)
    } else {
      if (!person) return
      const patch: Partial<import('@/lib/faction-types').FactionCardFields> = {}
      if (editStoryIndex != null) {
        patch.cardStory = (person.cardStory ?? []).map((b, i) =>
          i === editStoryIndex
            ? { text: draftStory, ...(draftStoryImg.trim() ? { image: draftStoryImg.trim() } : {}) }
            : b,
        )
      }
      if (editGuideKey) {
        const gds = { ...(person.cardGuides ?? {}) }
        if (draftGuide.trim()) gds[editGuideKey] = draftGuide
        else delete gds[editGuideKey]
        patch.cardGuides = Object.keys(gds).length ? gds : undefined
      }
      if (edit.id === 'quote') patch.quoteCard = draftQuote.trim() || undefined
      if (edit.id === 'quote') patch.cardQuoteImage = draftQImg.trim() || undefined
      if (edit.id === 'identity') patch.cardFace = draftFace.trim() || undefined
      saveCards(person.name, patch)
    }
    closeEdit()
  }

  const initialCardId = resolveCardId(initialTarget?.cardPath, cards)
  useEffect(() => {
    if (!cardsLoaded || !initialTarget || !initialSelection || !initialCardId) return
    if (safeGi !== initialSelection.gi || safePi !== initialSelection.pi) return
    const target = cards.find(c => c.id === initialCardId)
    if (!target) return
    const key = `${initialTarget.personName}/${initialTarget.cardPath?.join('/') ?? ''}/${initialCardId}`
    if (openedInitialTarget.current === key) return
    openedInitialTarget.current = key

    setHidden(prev => {
      if (!prev.has(initialCardId)) return prev
      const next = new Set(prev)
      next.delete(initialCardId)
      return next
    })
    openEdit(target.id, target.label, target.card)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, cardsLoaded, initialCardId, initialSelection?.gi, initialSelection?.pi, initialTarget, safeGi, safePi])

  const setStoryImage = (index: number, path: string) => {
    if (view === 'group') {
      if (!g) return
      const list = (g.cardStory ?? []).map((b, i) => (i === index ? { ...b, image: path } : b))
      saveGroupCards(g.name, { cardStory: list })
    } else {
      if (!person) return
      const list = (person.cardStory ?? []).map((b, i) => (i === index ? { ...b, image: path } : b))
      saveCards(person.name, { cardStory: list })
    }
  }
  const setFace = (path: string) => {
    if (!person) return
    saveCards(person.name, { cardFace: path })
  }

  const buildGroupCards = (): FactionCardSpec[] => {
    const out: FactionCardSpec[] = [{ type: 'cover', groupIndex: safeGi }]
    let flat = 0
    clusters.forEach((cl, ci) => {
      out.push({ type: 'groupshot', groupIndex: safeGi, clusterIndex: ci })
        ; (cl.people ?? []).forEach((p, i) => {
          out.push({ type: 'mystery', groupIndex: safeGi, personIndex: flat })
          if (i === 0) {
            out.push({ type: 'quote', groupIndex: safeGi, personIndex: flat, bg: 'photo' })
          }
          if (p.cardTimeline?.items?.length) {
            out.push({ type: 'timeline', groupIndex: safeGi, title: p.cardTimeline.title, items: p.cardTimeline.items })
          }
          flat++
        })
    })
    return out
  }

  const runExport = async (specs: FactionCardSpec[], label: string) => {
    const ratios = allRatios ? RATIOS.map(r => r.id) : [ratioId]
    setExporting(true)
    try {
      let total = 0
      for (const rt of ratios) {
        const res = await fetch(`/api/${series}/card-export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episode: episodeName, ratio: rt, cards: specs }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { alert('내보내기 시작 실패: ' + (data.error ?? res.statusText)); return }
        total += data.taskIds?.length ?? 0
      }
      alert(`${label} ${total}장 내보내기를 시작했습니다.\n저장 위치: out/FactionCard/${episodeName} (작업 패널에서 진행 확인)`)
    } catch (e) {
      alert('내보내기 시작 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setExporting(false)
    }
  }
  const exportCurrent = () => runExport(shown.map(c => c.card), '현재 카드')
  const exportGroup = () => runExport(buildGroupCards(), '세력 전체')

  if (!hasGroups) return <div className="text-sm text-text-dim">세력이 없어 카드를 만들 수 없습니다.</div>

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-card/40 p-4">
      <CardToolbar
        view={view}
        selectView={selectView}
        safeGi={safeGi}
        selectGroup={selectGroup}
        groups={groups}
        safePi={safePi}
        selectPerson={selectPerson}
        people={people}
        ratioId={ratioId}
        setRatioId={setRatioId}
        allRatios={allRatios}
        setAllRatios={setAllRatios}
        exportCurrent={exportCurrent}
        exporting={exporting}
        exportGroup={exportGroup}
        cardsLength={cards.length}
        ratioLabel={ratio.label}
      />
      
      <DeployGuidePanel />

      <CaptionEditor
        view={view}
        person={person}
        g={g}
        capFeed={capFeed}
        setCapFeed={setCapFeed}
        capThreads={capThreads}
        setCapThreads={setCapThreads}
        capX={capX}
        setCapX={setCapX}
        saveCards={saveCards}
        saveGroupCards={saveGroupCards}
      />

      <CardTextEditor
        view={view}
        person={person}
        g={g}
        headline={headline}
        setHeadline={setHeadline}
        body={body}
        setBody={setBody}
        quoteText={quoteText}
        setQuoteText={setQuoteText}
        tlOn={tlOn}
        setTlOn={setTlOn}
        tlTitle={tlTitle}
        setTlTitle={setTlTitle}
        tlItems={tlItems}
        setTlItems={setTlItems}
        onSave={persist}
        saveGroupCards={saveGroupCards}
      />

      {/* 카드 종류 켜고 끄기 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-text-dim">담을 카드</span>
        {cards.map(({ id, label }) => {
          const on = !hidden.has(id)
          return (
            <button
              key={id}
              onClick={() => toggleType(id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${on ? 'bg-accent/15 text-accent ring-1 ring-accent/40' : 'bg-bg-card text-text-dim line-through ring-1 ring-border'
                }`}
              title={on ? '끄기' : '켜기'}
            >
              {label}
            </button>
          )
        })}
      </div>

      <CardGrid
        shown={shown}
        rm={rm}
        episodeName={episodeName}
        ratio={ratio}
        previewW={previewW}
        previewH={previewH}
        openRoutedEdit={openRoutedEdit}
        setStoryImage={setStoryImage}
        setFace={setFace}
      />

      {edit && (
        <CardEditModal
          edit={edit}
          closeEdit={closeEdit}
          rm={rm}
          episodeName={episodeName}
          ratio={ratio}
          editPreviewCard={editPreviewCard}
          person={person}
          editStoryIndex={editStoryIndex}
          draftStory={draftStory}
          setDraftStory={setDraftStory}
          view={view}
          g={g}
          saveGroupCards={saveGroupCards}
          draftStoryImg={draftStoryImg}
          setDraftStoryImg={setDraftStoryImg}
          draftFace={draftFace}
          setDraftFace={setDraftFace}
          draftQuote={draftQuote}
          setDraftQuote={setDraftQuote}
          editGuideKey={editGuideKey}
          draftGuide={draftGuide}
          setDraftGuide={setDraftGuide}
          saveEdit={saveEdit}
        />
      )}
    </div>
  )
}
