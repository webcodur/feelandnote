'use client'

/**
 * 가상 담화(Discourse) 편집기 — 「원고」·「인물」 두 탭.
 *
 * 편집 골격: 전체 스크립트를 통째로 저장(부분 저장 없음),
 * 언어 모드(한국어/영어/둘 다), Ctrl+S, 탭 주소 동기화.
 *
 * 뼈대가 인물 명단이 아니라 **발언 순서(turns)** 라는 점이 이 편집기의 축이다.
 * 「원고」가 대본 전체를 글로 다루고(경계·발언 나누기·세부 패널), 「인물」이 말하는 사람의 실체를 다룬다.
 * 발언을 옮기면 음원 자리가 밀리므로 원고 탭이 음원 파일과 발언 배열을 대조해 경고를 띄운다(discourse.md §5-1).
 *
 * 이 앱(web-bo)은 DB 가 대본의 원본이다. 창구(fetch)로 파일을 읽고 쓰던 remotion-bo 시절과 달리
 * 서버 액션(loadDiscourseScript·saveDiscourseScript)으로 불러오고 저장하며, 저장 시점의 updatedAt 을
 * 낙관적 잠금 기준으로 들고 다닌다(팩션 편집기와 같은 방식 — FactionEditor.tsx 참조).
 *
 * 기획·완성 정의 SSoT: docs/project/remotion/discourse.md §7
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import type { DiscourseScript, Speaker, Turn } from '@/lib/discourse-types'
import {
  type DiscourseEditTab, DISCOURSE_TAB_SEGMENT, folderToParam,
} from '@/lib/discourse-edit-route'
import { Eye, Film, ImageIcon } from '@feelandnote/shared/bo/icons'
import { useImagePoolToggle } from '@/lib/useImagePoolToggle'
import {
  EditLangSwitch, FloatingSaveButton, formatMmss, useEpisodeEditor, type EditLang,
} from '@feelandnote/shared/bo/editor'
import { totalSec, buildCues } from './shared/timing'
import { DiscourseInfoTab } from './DiscourseEditor/DiscourseInfoTab'
import { DiscourseScriptTab } from './DiscourseEditor/DiscourseScriptTab'
import { DiscourseLinesPanel } from './DiscourseEditor/DiscourseLinesPanel'
import { SourceMonologuePanel } from './DiscourseEditor/SourceMonologuePanel'
import { TurnOriginPanel } from './DiscourseEditor/TurnOriginPanel'
import { DiscoursePreview } from './DiscourseEditor/DiscoursePreview'
import { ImagePool, DISCOURSE_IMAGE_DND } from '@feelandnote/shared/bo/media'
import { collectUsedImages, remapDiscourseImages } from './shared/imageUsage'
import type { DiscourseVoiceMeta } from './DiscourseEditor/voice-meta'
import { loadDiscourseScript, saveDiscourseScript } from '@/actions/admin/discourses/script'

/** 편집 화면 주소 뿌리 — 목록도 상세도 이 아래에 있다 */
const EDIT_BASE = '/discourses'

type Props = {
  series: string
  name: string
  initialTab: DiscourseEditTab
}

export function DiscourseEditor({ series, name, initialTab }: Props) {
  const [script, setScript] = useState<DiscourseScript | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [editLang, setEditLang] = useState<EditLang>('both')
  const [tab, setTab] = useState<DiscourseEditTab>(initialTab)
  const [musicList, setMusicList] = useState<string[]>([])
  const [voiceFiles, setVoiceFiles] = useState<DiscourseVoiceMeta[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showLines, setShowLines] = useState(false)
  const [showMonologue, setShowMonologue] = useState(false)
  const [showOrigin, setShowOrigin] = useState(false)
  // 사진 목록 — 진입 시 펼침 + Ctrl+Q 로 여닫는다(팩션과 같은 조작)
  const { open: showPool, setOpen: setShowPool } = useImagePoolToggle()

  /**
   * 저장이 통째로 실어 보낼 최신 대본.
   *
   * 원본(remotion-bo)은 렌더 도중에 `scriptRef.current = script` 로 대입했다. 그리기 중에 참조를
   * 건드리는 방식이라 React 규칙 위반으로 걸린다. 공용 훅이 이 참조를 **누름·저장 같은 사건 처리
   * 안에서만** 읽으므로(`shared/bo/editor` 의 save·폴더 정리) 화면이 그려진 뒤에 채워도 값이 같다.
   */
  const scriptRef = useRef<DiscourseScript | null>(null)
  useEffect(() => { scriptRef.current = script }, [script])

  /**
   * 저장 기준 시각 — 대본을 불러온 순간의 값이다. 저장할 때 이 값을 함께 보내 그 사이 다른 곳에서
   * 먼저 저장했는지 대조한다(어긋나면 DB가 거부한다). 저장이 성공하면 새 값으로 갈아 둔다.
   */
  const updatedAtRef = useRef<string | null>(null)

  /**
   * 대본 저장 — 이 앱은 DB가 원본이라 창구가 아니라 서버 액션으로 저장한다.
   * 저장이 끝나면 렌더용 파일도 자동으로 다시 만들어진다.
   */
  const persistScript = useCallback(async (next: DiscourseScript) => {
    const base = updatedAtRef.current
    if (!base) throw new Error('대본을 아직 다 불러오지 못했습니다 — 잠시 후 다시 저장하세요')
    const res = await saveDiscourseScript(name, next as unknown as Record<string, unknown>, base)
    updatedAtRef.current = res.updatedAt
    if (res.exported && !res.exported.written) {
      // 저장은 됐지만 렌더용 파일을 못 갈았다 — 그대로 두면 옛 내용으로 영상이 나간다
      alert(`저장은 됐지만 렌더용 파일을 새로 쓰지 못했습니다.\n${res.exported.reason}`)
    }
  }, [name])

  /**
   * 편집기 뼈대 — 대본 전체 저장·손댐 표시·Ctrl+S·사진 폴더 조작. 시리즈 공용 부품을 쓴다.
   * 담화가 갈리는 지점은 사진 경로 순회 하나뿐이다(인물·발언 구조).
   */
  const {
    dirty, setDirty, saving, save, createFolder, deleteFolder, moveFile, renameFolder,
  } = useEpisodeEditor({
    series,
    episodeName: name,
    scriptRef,
    setScript,
    remapImages: remapDiscourseImages,
    persist: persistScript,
  })

  // 에피소드 로드 — 글과 구성의 원본은 DB다. 서버 액션으로 대본을 조립해 받는다.
  useEffect(() => {
    loadDiscourseScript(name)
      .then((loaded) => {
        updatedAtRef.current = loaded.updatedAt
        const data = loaded.script as unknown as DiscourseScript
        setScript({ ...data, cast: data.cast ?? [], turns: data.turns ?? [] })
        setDirty(false)
        setLoadError(null)
      })
      // 조용한 폴백 금지 — 못 불러온 것을 빈 대본으로 위장하면 그대로 저장해 통째로 날린다
      .catch(e => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [name, setDirty])

  // 배경음악 목록 — 시리즈 공용 public/music/ 을 그대로 읽는다
  useEffect(() => {
    fetch(`/api/${series}/music`)
      .then(r => r.json())
      .then(d => setMusicList(Array.isArray(d) ? d : (d?.files ?? [])))
      .catch(() => setMusicList([]))
  }, [series])

  // 음원 목록 — 발언 자리 대조(vnVerify)와 길이·미리듣기 표시에 쓴다
  const loadVoices = useCallback(() => {
    fetch(`/api/discourse/voice/${folderToParam(name)}`)
      .then(r => r.json())
      .then(d => setVoiceFiles(Array.isArray(d?.files) ? d.files : []))
      .catch(() => setVoiceFiles([]))
  }, [name])

  useEffect(() => { loadVoices() }, [loadVoices])

  // 미저장 이탈 경고 — 변경분이 있는 채로 페이지를 떠나면 브라우저가 한 번 붙잡는다
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  useEffect(() => {
    if (script) document.title = `${script.title?.split('\n')[0] || name} — 가상 담화`
  }, [script, name])

  const update = useCallback((patch: Partial<DiscourseScript>) => {
    setScript(prev => (prev ? { ...prev, ...patch } : prev))
    setDirty(true)
    // 원본은 의존 목록이 비어 있었다 — setDirty 가 빠져 있어 규칙에 걸린다.
    // 상태 설정 함수라 값이 바뀌지 않으므로 채워 넣어도 동작은 그대로다.
  }, [setDirty])

  const setCast = useCallback((cast: Speaker[]) => update({ cast }), [update])
  const setTurns = useCallback((turns: Turn[]) => update({ turns }), [update])

  // 대본이 실제로 쓰는 사진 — 목록에서 「쓰는 중 / 아직 안 씀」을 가른다
  const usedImages = useMemo(() => collectUsedImages(script), [script])

  const goTab = useCallback((next: DiscourseEditTab) => {
    setTab(next)
    // 주소 어휘는 공용 상수를 따른다 — 원고는 'shorts', 인물은 'info' 자리에 올린다
    window.history.pushState(null, '', `${EDIT_BASE}/${folderToParam(name)}/${editLang}/${DISCOURSE_TAB_SEGMENT[next]}`)
  }, [name, editLang])

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
    // remotion-ui — 이 가지 안쪽만 글자·선 보정을 받는다(globals.css 끝 절 참조).
    <div className="remotion-ui relative pb-12">
      {/* 상단 바 */}
      <div className="mb-4 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Link href={EDIT_BASE} className="text-sm text-text-secondary hover:text-accent">← 목록</Link>

          {/* 편집 언어 */}
          <EditLangSwitch value={editLang} onChange={setEditLang} />

          {/* 탭 — 원고=대사와 순서(이 담화의 본문), 인물=말하는 사람의 실체 */}
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg-card p-0.5">
            <button
              onClick={() => goTab('script')}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${tab === 'script' && !showPreview ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
              title="원고 — 대본을 글로 읽고, 문장 사이 클릭으로 경계·발언 나누기를 지정합니다"
            >
              원고 {script.turns.length}
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
              onClick={() => setShowPool(v => !v)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold ${
                showPool ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card text-text-secondary hover:bg-bg-hover'
              }`}
              title="사진 목록 — 폴더별로 조망하고 끌어다 놓습니다 · Ctrl+Q"
            >
              <ImageIcon size={15} /> 사진 목록
            </button>
            <button
              onClick={() => setShowLines(true)}
              title="인물을 번호로, 발언을 순서대로 펼쳐 뽑아냅니다 — 밖에서 대사 손보기 편하게"
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              대사 뽑기
            </button>
            <button
              onClick={() => setShowOrigin(true)}
              title="인물이 실제로 한 말과 그 출처를 한 화면에서 정리합니다 — 발언마다 흩어 두지 않습니다"
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              발언 원문
            </button>
            <button
              onClick={() => setShowMonologue(true)}
              title="이 인물들이 실제로 남긴 (가상) 독백 원문을 보여줍니다 — 담화 대사는 이 글을 사람이 읽고 다시 쓴 것입니다"
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              원천 독백
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
            <FloatingSaveButton dirty={dirty} saving={saving} onSave={save} />
          </div>
        </div>
        <p className="text-[11px] text-text-dim">
          담화 영상 출고는 아직 준비되지 않았습니다. 지금은 대본·인물·발언 순서를 다듬고 저장하는 단계입니다.
        </p>
      </div>

      {/* 본문 — 넓은 화면에서는 오른쪽에 사진 목록을 붙여 둔 채로 대사를 손본다 */}
      <div className={showPreview ? '' : 'flex flex-col gap-4 xl:flex-row xl:items-start'}>
        <div className="min-w-0 flex-1">
          {showPreview ? (
            <DiscoursePreview script={script} series={series} episodeName={name} />
          ) : tab === 'info' ? (
            <DiscourseInfoTab
              script={script}
              update={update}
              setCast={setCast}
              episodeName={name}
              series={series}
              editLang={editLang}
              musicList={musicList}
            />
          ) : (
            <DiscourseScriptTab
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
        </div>

        {!showPreview && showPool && (
          <aside className="w-full shrink-0 rounded-lg border border-border bg-bg-card/40 p-3 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:w-[26rem] xl:overflow-y-auto">
            <ImagePool
              series={series}
              episodeName={name}
              usedImages={usedImages}
              dnd={DISCOURSE_IMAGE_DND}
              onMoveFile={moveFile}
              onCreateFolder={createFolder}
              onRenameFolder={renameFolder}
              onDeleteFolder={deleteFolder}
            />
          </aside>
        )}
      </div>

      {showLines && (
        <DiscourseLinesPanel
          cast={script.cast}
          turns={script.turns}
          editLang={editLang}
          onClose={() => setShowLines(false)}
        />
      )}

      {showOrigin && (
        <TurnOriginPanel
          cast={script.cast}
          turns={script.turns}
          setTurn={(i, next) => setTurns(script.turns.map((t, idx) => (idx === i ? next : t)))}
          onClose={() => setShowOrigin(false)}
        />
      )}

      {showMonologue && (
        <SourceMonologuePanel
          cast={script.cast}
          editLang={editLang}
          onClose={() => setShowMonologue(false)}
        />
      )}
    </div>
  )
}
