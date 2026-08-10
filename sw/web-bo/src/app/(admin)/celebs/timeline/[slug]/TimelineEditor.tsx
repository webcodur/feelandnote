'use client'

import { useState, useTransition } from 'react'
import { MapPin, Plus, Search, Trash2, X } from 'lucide-react'
import {
  createTimelineEvent,
  deleteTimelineEvent,
  searchPlace,
  updateTimelineEvent,
  type PlaceCandidate,
  type TimelineEvent,
} from '@/actions/admin/timeline'
import { TIMELINE_KINDS, TIMELINE_KIND_LABELS } from '@/constants/timeline'

interface Props {
  celebId: string
  initialEvents: TimelineEvent[]
  isFiction: boolean
}

type Draft = Omit<TimelineEvent, 'id' | 'celeb_id' | 'source'>

const makeEmpty = (isFiction: boolean): Draft => ({
  year: isFiction ? null : new Date().getFullYear(),
  year_end: null,
  month: null,
  day: null,
  sequence_label: isFiction ? '' : null,
  sequence_label_en: isFiction ? '' : null,
  title: '',
  title_en: null,
  description: null,
  description_en: null,
  kind: 'other',
  place_name: null,
  place_name_en: null,
  lat: null,
  lng: null,
  place_qid: null,
  source_url: null,
  sort_order: 0,
})

const num = (v: string): number | null => (v.trim() === '' ? null : Number(v))

const sortEvents = (a: TimelineEvent, b: TimelineEvent) => {
  return a.sort_order - b.sort_order || a.id.localeCompare(b.id)
}

export default function TimelineEditor({ celebId, initialEvents, isFiction }: Props) {
  const [events, setEvents] = useState(initialEvents)
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // 장소 검색
  const [placeTerm, setPlaceTerm] = useState('')
  const [placeLang, setPlaceLang] = useState<'en' | 'ko'>('en')
  const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null)
  const [searching, setSearching] = useState(false)

  const openEdit = (e: TimelineEvent) => {
    setAdding(false)
    setOpenId(e.id)
    setCandidates(null)
    setPlaceTerm(e.place_name_en ?? e.place_name ?? '')
    const rest = { ...e }
    delete (rest as Partial<TimelineEvent>).id
    delete (rest as Partial<TimelineEvent>).celeb_id
    delete (rest as Partial<TimelineEvent>).source
    setDraft(rest)
  }

  const openAdd = () => {
    setOpenId(null)
    setAdding(true)
    setCandidates(null)
    setPlaceTerm('')
    setDraft(makeEmpty(isFiction))
  }

  const close = () => {
    setOpenId(null)
    setAdding(false)
    setDraft(null)
  }

  const runSearch = async () => {
    if (!placeTerm.trim()) return
    setSearching(true)
    setCandidates(null)
    try {
      setCandidates(await searchPlace(placeTerm, placeLang))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '장소를 찾지 못했습니다.')
    } finally {
      setSearching(false)
    }
  }

  const pickPlace = (c: PlaceCandidate) => {
    if (!draft) return
    setDraft({
      ...draft,
      place_name: draft.place_name?.trim() ? draft.place_name : (c.labelKo ?? c.label),
      place_name_en: c.label,
      lat: c.lat,
      lng: c.lng,
      place_qid: c.qid,
    })
    setCandidates(null)
  }

  const clearPlace = () => {
    if (!draft) return
    setDraft({ ...draft, lat: null, lng: null, place_qid: null })
  }

  const save = () => {
    if (!draft) return
    setMsg(null)
    startTransition(async () => {
      try {
        if (adding) {
          const id = await createTimelineEvent(celebId, draft)
          setEvents((prev) =>
            [...prev, { ...draft, id, celeb_id: celebId, source: 'manual' }].sort(sortEvents),
          )
        } else if (openId) {
          await updateTimelineEvent(openId, draft)
          setEvents((prev) =>
            prev
              .map((e) => (e.id === openId ? { ...e, ...draft, source: 'manual' } : e))
              .sort(sortEvents),
          )
        }
        close()
        setMsg('저장했습니다.')
      } catch (e) {
        setMsg(e instanceof Error ? e.message : '저장하지 못했습니다.')
      }
    })
  }

  const remove = (id: string, title: string) => {
    if (!window.confirm(`「${title}」 항목을 지웁니다. 되돌릴 수 없습니다.`)) return
    setMsg(null)
    startTransition(async () => {
      try {
        await deleteTimelineEvent(id)
        setEvents((prev) => prev.filter((e) => e.id !== id))
        setMsg('지웠습니다.')
      } catch (e) {
        setMsg(e instanceof Error ? e.message : '지우지 못했습니다.')
      }
    })
  }

  const field = 'w-full rounded border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary'
  const label = 'block text-xs text-text-secondary mb-1'
  const isUndatedLife = !isFiction && draft?.year === null

  const toggleUndatedLife = () => {
    if (!draft || isFiction) return
    setDraft(isUndatedLife
      ? { ...draft, year: new Date().getFullYear() }
      : {
          ...draft,
          year: null,
          year_end: null,
          month: null,
          day: null,
          sequence_label: null,
          sequence_label_en: null,
        })
  }

  const form = draft && (
    <div className="space-y-3 rounded-lg border border-accent/40 bg-bg-secondary p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">
          {adding
            ? (isFiction ? '서사 사건 추가' : '행적 추가')
            : (isFiction ? '서사 사건 수정' : '행적 수정')}
        </p>
        <button type="button" onClick={close} className="text-text-secondary hover:text-text-primary">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!isFiction && (
        <button
          type="button"
          aria-pressed={isUndatedLife}
          onClick={toggleUndatedLife}
          className={`rounded border px-3 py-1.5 text-sm ${
            isUndatedLife
              ? 'border-accent bg-accent/15 text-accent hover:bg-accent/25'
              : 'border-border text-text-secondary hover:border-accent hover:text-text-primary'
          }`}
        >
          날짜 미상
        </button>
      )}

      <div className={`grid grid-cols-2 gap-3 ${isFiction ? 'sm:grid-cols-4' : 'sm:grid-cols-5'}`}>
        {isFiction ? (
          <>
            <div>
              <label className={label}>서사 단계</label>
              <input
                value={draft.sequence_label ?? ''}
                onChange={(e) => setDraft({ ...draft, sequence_label: e.target.value })}
                placeholder="예: 원탁의 성립"
                className={field}
              />
            </div>
            <div>
              <label className={label}>서사 단계 (영문)</label>
              <input
                value={draft.sequence_label_en ?? ''}
                onChange={(e) => setDraft({ ...draft, sequence_label_en: e.target.value || null })}
                placeholder="e.g. The Round Table Rises"
                className={field}
              />
            </div>
          </>
        ) : !isUndatedLife ? (
          <>
            <div>
              <label className={label}>연도 (기원전은 음수)</label>
              <input
                type="number"
                value={draft.year ?? ''}
                onChange={(e) => setDraft({ ...draft, year: num(e.target.value) })}
                className={field}
              />
            </div>
            <div>
              <label className={label}>끝 연도</label>
              <input
                type="number"
                value={draft.year_end ?? ''}
                onChange={(e) => setDraft({ ...draft, year_end: num(e.target.value) })}
                className={field}
              />
            </div>
            <div>
              <label className={label}>월</label>
              <input
                type="number"
                value={draft.month ?? ''}
                onChange={(e) => setDraft({ ...draft, month: num(e.target.value) })}
                className={field}
              />
            </div>
          </>
        ) : null}
        <div>
          <label className={label}>종류</label>
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
            className={field}
          >
            {TIMELINE_KINDS.map((k) => (
              <option key={k} value={k}>
                {TIMELINE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{isFiction ? '서사 순서' : '표시 순서'}</label>
          <input
            type="number"
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })}
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>제목</label>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className={field}
          />
        </div>
        <div>
          <label className={label}>제목 (영문)</label>
          <input
            value={draft.title_en ?? ''}
            onChange={(e) => setDraft({ ...draft, title_en: e.target.value || null })}
            className={field}
          />
        </div>
        <div>
          <label className={label}>서술</label>
          <textarea
            rows={4}
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
            className={field}
          />
        </div>
        <div>
          <label className={label}>서술 (영문)</label>
          <textarea
            rows={4}
            value={draft.description_en ?? ''}
            onChange={(e) => setDraft({ ...draft, description_en: e.target.value || null })}
            className={field}
          />
        </div>
      </div>

      {/* 장소 — 좌표는 위키데이터에서 찾아 넣는다. 손으로 적으면 동명 지명에 물린다 */}
      <div className="space-y-2 rounded border border-border p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>장소</label>
            <input
              value={draft.place_name ?? ''}
              onChange={(e) => setDraft({ ...draft, place_name: e.target.value || null })}
              className={field}
            />
          </div>
          <div>
            <label className={label}>장소 (영문)</label>
            <input
              value={draft.place_name_en ?? ''}
              onChange={(e) => setDraft({ ...draft, place_name_en: e.target.value || null })}
              className={field}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className={label}>좌표 찾기</label>
            <input
              value={placeTerm}
              onChange={(e) => setPlaceTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void runSearch()
                }
              }}
              placeholder="지명을 넣고 엔터"
              className={field}
            />
          </div>
          <select
            value={placeLang}
            onChange={(e) => setPlaceLang(e.target.value as 'en' | 'ko')}
            className="rounded border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary"
          >
            <option value="en">영문</option>
            <option value="ko">한국어</option>
          </select>
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={searching}
            className="flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm text-text-secondary hover:border-accent hover:text-text-primary disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {searching ? '찾는 중' : '찾기'}
          </button>
        </div>

        {candidates && candidates.length === 0 && (
          <p className="text-xs text-text-secondary">
            좌표를 가진 후보가 없습니다. 다른 이름이나 상위 지명으로 찾아보세요.
          </p>
        )}
        {candidates && candidates.length > 0 && (
          <ul className="space-y-1">
            {candidates.map((c) => (
              <li key={c.qid}>
                <button
                  type="button"
                  onClick={() => pickPlace(c)}
                  className="w-full rounded border border-border px-2 py-1.5 text-left text-xs text-text-secondary hover:border-accent hover:text-text-primary"
                >
                  <span className="font-medium text-text-primary">{c.label}</span>
                  {c.labelKo && c.labelKo !== c.label && <span> ({c.labelKo})</span>}
                  <span className="ml-2 font-mono">
                    {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                  </span>
                  {c.description && <span className="ml-2 opacity-70">{c.description}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="flex items-center gap-2 text-xs text-text-secondary">
          <MapPin className="h-3 w-3" />
          {draft.lat != null ? (
            <>
              <span className="font-mono">
                {draft.lat.toFixed(4)}, {draft.lng!.toFixed(4)}
              </span>
              {draft.place_qid && <span className="opacity-70">{draft.place_qid}</span>}
              <button type="button" onClick={clearPlace} className="underline hover:text-text-primary">
                좌표 비우기
              </button>
            </>
          ) : (
            <span>좌표 없음 — 연표에만 뜨고 지도에는 나오지 않습니다.</span>
          )}
        </p>
      </div>

      <div>
        <label className={label}>근거 링크</label>
        <input
          value={draft.source_url ?? ''}
          onChange={(e) => setDraft({ ...draft, source_url: e.target.value || null })}
          className={field}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-black hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? '저장 중' : '저장'}
        </button>
        <button
          type="button"
          onClick={close}
          className="rounded border border-border px-4 py-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          취소
        </button>
        <span className="text-xs text-text-secondary">
          저장하면 이 항목은 손질본으로 표시되어 조사 결과를 다시 넣어도 덮이지 않습니다.
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {isFiction ? '서사 사건' : '행적'} {events.length}건 · 좌표{' '}
          {events.filter((e) => e.lat != null).length}건
        </p>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm text-text-secondary hover:border-accent hover:text-text-primary"
        >
          <Plus className="h-4 w-4" />
          {isFiction ? '서사 사건 추가' : '행적 추가'}
        </button>
      </div>

      {msg && <p className="rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary">{msg}</p>}

      {adding && form}

      <ol className="space-y-2">
        {events.map((e) => (
          <li key={e.id}>
            {openId === e.id ? (
              form
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-bg-secondary p-3">
                <button
                  type="button"
                  onClick={() => openEdit(e)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-sm text-accent">
                      {e.sequence_label
                        ? e.sequence_label
                        : e.year != null
                          ? `${e.year < 0 ? `BC ${Math.abs(e.year)}` : e.year}${
                              e.year_end != null && e.year_end !== e.year
                                ? `–${Math.abs(e.year_end)}`
                                : ''
                            }`
                          : ''}
                    </span>
                    <span className="text-sm text-text-primary">{e.title}</span>
                    <span className="rounded bg-bg-primary px-1.5 py-0.5 text-[11px] text-text-secondary">
                      {TIMELINE_KIND_LABELS[e.kind] ?? e.kind}
                    </span>
                    {e.source === 'manual' && (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[11px] text-accent">손질본</span>
                    )}
                  </div>
                  {e.place_name && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
                      <MapPin className={`h-3 w-3 ${e.lat == null ? 'opacity-40' : ''}`} />
                      {e.place_name}
                      {e.lat == null && <span className="opacity-70">(좌표 없음)</span>}
                    </p>
                  )}
                  {e.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{e.description}</p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(e.id, e.title)}
                  disabled={pending}
                  className="flex-shrink-0 p-1 text-text-secondary hover:text-red-400 disabled:opacity-50"
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
