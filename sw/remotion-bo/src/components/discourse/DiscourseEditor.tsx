'use client'

/**
 * 가상 담화(Discourse) 편집기 — 「정보」·「편성」 두 탭.
 *
 * 팩션 편집기(FactionEditor)의 골격을 그대로 따른다: 전체 스크립트를 통째로 PUT 하는 저장(부분 저장 없음),
 * 언어 모드(한국어/영어/둘 다), Ctrl+S, 탭 주소 동기화.
 *
 * 팩션과 갈리는 축은 하나다 — **뼈대가 인물 명단이 아니라 발언 순서(turns)** 다.
 * 그래서 「정보」는 인물의 실체를, 「편성」은 발언의 순서를 다룬다. 발언을 옮기면 음원 자리가 밀리므로
 * 편성 탭이 음원 파일과 발언 배열을 대조해 경고를 띄운다(discourse.md §5-1).
 *
 * 기획·완성 정의 SSoT: docs/project/remotion/discourse.md §7
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { DiscourseScript, Speaker, Turn } from '@/lib/discourse-types'
import type { FactionEditTab } from '@/lib/faction-edit-route'
import { Save, Eye, Film } from '@/components/faction/shared/icons'
import { EDIT_LANGS, type EditLang } from './shared/editLang'
import { totalSec, buildCues, formatMmss } from './shared/timing'
import { DiscourseInfoTab } from './DiscourseEditor/DiscourseInfoTab'
import { DiscourseTurnsTab } from './DiscourseEditor/DiscourseTurnsTab'
import { DiscourseLinesPanel } from './DiscourseEditor/DiscourseLinesPanel'
import { DiscoursePreview } from './DiscourseEditor/DiscoursePreview'
import type { DiscourseVoiceMeta } from './DiscourseEditor/voice-meta'

type Props = {
  series: string
  name: string
  initialTab: FactionEditTab
}

/** 편집 탭 — 팩션의 정비(info)/편성(shorts·longform) 주소 어휘를 공유한다. 담화는 편성이 한 화면이다 */
const toTab = (t: FactionEditTab): 'info' | 'turns' => (t === 'info' ? 'info' : 'turns')

export function DiscourseEditor({ series, name, initialTab }: Props) {
  const [script, setScript] = useState<DiscourseScript | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [editLang, setEditLang] = useState<EditLang>('both')
  const [tab, setTab] = useState<'info' | 'turns'>(toTab(initialTab))
  const [musicList, setMusicList] = useState<string[]>([])
  const [voiceFiles, setVoiceFiles] = useState<DiscourseVoiceMeta[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showLines, setShowLines] = useState(false)

  const scriptRef = useRef<DiscourseScript | null>(null)
  scriptRef.current = script

  // 에피소드 로드 — 시리즈 공용 창구(dataModel 로 담화 IO 가 선택된다)
  useEffect(() => {
    fetch(`/api/${series}/episodes/${encodeURIComponent(name)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('불러오지 못했습니다'))))
      .then((data: DiscourseScript) => {
        setScript({ ...data, cast: data.cast ?? [], turns: data.turns ?? [] })
        setDirty(false)
        setLoadError(null)
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [series, name])

  // 배경음악 목록 — 팩션과 같은 public/music/ 을 공유한다
  useEffect(() => {
    fetch(`/api/${series}/faction-music`)
      .then(r => r.json())
      .then(d => setMusicList(Array.isArray(d) ? d : (d?.files ?? [])))
      .catch(() => setMusicList([]))
  }, [series])

  // 음원 목록 — 발언 자리 대조(vnVerify)와 길이·미리듣기 표시에 쓴다
  const loadVoices = useCallback(() => {
    fetch(`/api/${series}/discourse-voice/${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => setVoiceFiles(Array.isArray(d?.files) ? d.files : []))
      .catch(() => setVoiceFiles([]))
  }, [series, name])

  useEffect(() => { loadVoices() }, [loadVoices])

  useEffect(() => {
    if (script) document.title = `${script.title?.split('\n')[0] || name} — 가상 담화`
  }, [script, name])

  const update = useCallback((patch: Partial<DiscourseScript>) => {
    setScript(prev => (prev ? { ...prev, ...patch } : prev))
    setDirty(true)
  }, [])

  const setCast = useCallback((cast: Speaker[]) => update({ cast }), [update])
  const setTurns = useCallback((turns: Turn[]) => update({ turns }), [update])

  // 저장 — 팩션과 동일하게 스크립트 전체를 한 번에 기록한다(부분 저장 없음)
  const save = useCallback(async () => {
    const current = scriptRef.current
    if (!current) return
    setSaving(true)
    try {
      const res = await fetch(`/api/${series}/episodes/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? res.statusText)
      }
      setDirty(false)
    } catch (e) {
      alert('저장 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }, [series, name])

  // Ctrl+S 저장
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty && !saving) save()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dirty, saving, save])

  const goTab = useCallback((next: 'info' | 'turns') => {
    setTab(next)
    // 주소 어휘는 팩션과 공유한다 — 편성은 'shorts' 자리에 올린다
    window.history.pushState(null, '', `/${series}/${encodeURIComponent(name)}/${editLang}/${next === 'info' ? 'info' : 'shorts'}`)
  }, [series, name, editLang])

  if (loadError) {
    return (
      <div className="p-6 text-sm text-danger-text">
        담화 에피소드를 불러오지 못했습니다 — {series} / {name} ({loadError})
      </div>
    )
  }
  if (!script) return <div className="p-6 text-text-dim">불러오는 중...</div>

  const lvTotal = totalSec(script, false)
  const cutCount = buildCues(script, false).length

  return (
    <div className="relative pb-12">
      {/* 상단 바 */}
      <div className="mb-4 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Link href={`/${series}`} className="text-sm text-text-secondary hover:text-accent">← 목록</Link>

          {/* 편집 언어 */}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg-card p-0.5">
            {EDIT_LANGS.map(([v, lbl]) => (
              <button
                key={v}
                onClick={() => setEditLang(v)}
                className={`rounded px-2 py-1 text-xs ${editLang === v ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* 탭 — 발언=대사(주인공), 인물=말하는 사람의 실체.
              팩션 어휘(정보/편성)를 그대로 쓰면 대사가 어디 있는지 읽히지 않는다(실제 신고). */}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg-card p-0.5">
            <button
              onClick={() => goTab('turns')}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${tab === 'turns' && !showPreview ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
              title="대사와 순서 — 이 담화의 본문입니다"
            >
              발언 {script.turns.length}
            </button>
            <button
              onClick={() => goTab('info')}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${tab === 'info' && !showPreview ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
              title="말하는 사람 — 이름·직함·색·목소리와 영상 전체 설정"
            >
              인물 {script.cast.length}
            </button>
          </div>

          <span className="text-xs text-text-secondary">
            인물 {script.cast.length}명 · 발언 {script.turns.length}개 · 롱폼 {formatMmss(lvTotal)} · 컷 {cutCount}개
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowPreview(v => !v)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold ${
                showPreview ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Eye size={15} /> {showPreview ? '편집' : '미리보기'}
            </button>
            <button
              onClick={() => setShowLines(true)}
              title="인물을 번호로, 발언을 순서대로 펼쳐 뽑아냅니다 — 밖에서 대사 손보기 편하게"
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              대사 뽑기
            </button>
            {/*
              렌더 — 담화 렌더 CLI 가 아직 없다(api/[series]/render 가 501 을 돌려준다).
              버튼을 감추지 않고 눌리지 않는 상태로 두되 준비 중임을 문구로 밝힌다.
              다른 시리즈 경로로 흘리거나 조용히 실패시키지 않는다.
            */}
            <button
              disabled
              title="담화 렌더는 아직 준비되지 않았습니다. 영상 출고 명령이 만들어지면 이 버튼이 열립니다."
              className="flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-dim opacity-60"
            >
              <Film size={15} /> 렌더 — 준비 중
            </button>
            <button
              onClick={save}
              disabled={saving || !dirty}
              className={`fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${
                dirty ? 'bg-accent text-bg-main hover:bg-accent-hover' : 'border border-border bg-bg-card text-text-dim'
              } disabled:opacity-50`}
            >
              <Save size={16} /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-text-dim">
          담화 영상 출고는 아직 준비되지 않았습니다. 지금은 대본·인물·발언 순서를 다듬고 저장하는 단계입니다.
        </p>
      </div>

      {/* 본문 */}
      {showPreview ? (
        <DiscoursePreview script={script} episodeName={name} />
      ) : tab === 'info' ? (
        <DiscourseInfoTab
          script={script}
          update={update}
          setCast={setCast}
          episodeName={name}
          editLang={editLang}
          musicList={musicList}
        />
      ) : (
        <DiscourseTurnsTab
          script={script}
          update={update}
          setTurns={setTurns}
          series={series}
          episodeName={name}
          editLang={editLang}
          voiceFiles={voiceFiles}
          reloadVoices={loadVoices}
        />
      )}

      {showLines && (
        <DiscourseLinesPanel
          cast={script.cast}
          turns={script.turns}
          editLang={editLang}
          onClose={() => setShowLines(false)}
        />
      )}
    </div>
  )
}
