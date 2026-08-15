'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { ChevronUp, ChevronDown, Trash2, Eye, EyeOff, Mic, Film, ArrowRightLeft, Play, Pause } from '@feelandnote/shared/bo/icons'
import type { FactionPerson, FactionImageCrop } from '@/lib/faction-types'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'
import { factionVoiceFile, stripCommonEpithetVoice, withCommonEpithetVoice } from '@/lib/faction-voice'
import { imageSrc, initial, factionStepsOf, applyFactionSteps, epithetIsNarrated, linesTypingOf } from '../../../shared/timing'
import {
  ImageCard, ImagePicker, MediaThumb, useImageDrop, cropToStyle, ANCHOR_THEMES, FACTION_IMAGE_DND,
} from '@feelandnote/shared/bo/media'
import { AutoResizeTextarea } from '../../../shared/AutoResizeTextarea'
import { FactionVoicePanel } from './FactionVoicePanel/FactionVoicePanel'
import { FactionVoiceSettingsModal } from './FactionVoicePanel/voice-panel'
import { QUOTE_SLOT, EPITHET_SLOT } from './FactionVoicePanel/voice-panel/voice-slots'
import { useFactionVoice } from '../../../shared/FactionVoiceContext'
import { CelebBadge } from '@/components/factions/shared/CelebBadge'
import type { EditLang } from '@feelandnote/shared/bo/editor'

type Props = {
  person: FactionPerson
  onChange: (next: FactionPerson) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  series: string
  episodeName: string
  /** 세력 인덱스 (0-based) — 음성 파일명 계산용 */
  groupIndex: number
  /** 그룹 내 로컬 인물 인덱스 (0-based) */
  personIndex: number
  /** 그룹 인덱스 (0-based) — 항상 존재(단일 모드·solo는 0) */
  clusterIndex: number
  /** 개인샷이 비었거나 같은 파일이면 대신 쓰는 그룹 화보 */
  inheritedImage?: string
  inheritedImageCrop?: FactionImageCrop
  editLang: EditLang
  /** 그룹 내 인물 총 수 (이전/다음 스크롤 버튼용) */
  totalPeople?: number
  /** 다른 그룹으로 이동 (cross-move 모달 열기) */
  onMoveCrossGroup?: () => void
  /** 셀럽 DB 등록 배지용 대조 결과 — 에피소드 레벨에서 인물 전체 slug를 배치 조회한 것을 그대로 내려받는다 */
  celebExisting: Set<string>
  celebLoaded: boolean
}

import { QuoteEditor, adjustImageChanges } from '@feelandnote/shared/bo/quote-editor'


import { PersonBasicInfo } from './sections/PersonBasicInfo'
import { PersonAtlasPanel } from './sections/PersonAtlasPanel'
import { ChevronLeft, ChevronRight } from '@feelandnote/shared/bo/icons'
import { folderToParam } from '@/lib/faction-edit-route'

export function FactionPersonRow({
  person, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName,
  groupIndex, personIndex, clusterIndex, inheritedImage, inheritedImageCrop,
  editLang, totalPeople = 1, onMoveCrossGroup, celebExisting, celebLoaded,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  // 인물 행 접기 — 기본 접힘(목록 조망). 펼치면 전체 편집 폼.
  const [collapsed, setCollapsed] = useState(true)

  // 외부(헤더 등)에서 이 인물로 스크롤 이동할 때 아코디언도 펼치기 위한 리스너
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail.id === `person-${groupIndex}-${clusterIndex}-${personIndex}`) {
        setCollapsed(false)
      }
    }
    document.addEventListener('faction-person-open', handler)
    return () => document.removeEventListener('faction-person-open', handler)
  }, [groupIndex, clusterIndex, personIndex])

  const [quoteExpanded, setQuoteExpanded] = useState(true)
  // 음성 설정 모달 — 접힘·펼침 무관하게 헤더 버튼으로 바로 연다. 대사·수식어 각각.
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [epithetModalOpen, setEpithetModalOpen] = useState(false)
  const ownImage = person.image && person.image !== inheritedImage ? person.image : undefined
  const imageInherited = !!inheritedImage && !ownImage
  const effectiveImage = ownImage ?? inheritedImage
  const effectiveImageCrop = ownImage ? person.imageCrop : inheritedImageCrop
  const changeImage = (next: string | undefined) => onChange({
    ...person,
    image: next && next !== inheritedImage ? next : undefined,
    ...(!next || next === inheritedImage ? { imageCrop: undefined } : {}),
  })
  // 이미지 풀에서 끌어온 이미지를 사진 칸에 놓으면 연결 — 드래그 중 하이라이트
  const { dragOver, dropProps } = useImageDrop(FACTION_IMAGE_DND, changeImage)
  // 대사 사진 카드는 ImageCard 가 스스로 끌어다 놓기를 받는다(공용 부품)
  // imageChanges 항목별 이미지 선택 모달 — 편집 중 항목 인덱스(null=닫힘)
  const [imgChangeEdit, setImgChangeEdit] = useState<number | null>(null)
  // 대사 사진(quoteImage) 선택 모달 — 대사 시작 시점에 바뀔 두 번째 사진
  const [quoteImgPickerOpen, setQuoteImgPickerOpen] = useState(false)
  const src = imageSrc(series, episodeName, effectiveImage)
  const quoteImgSrc = imageSrc(series, episodeName, person.quoteImage)
  const disabled = !!person.disabled
  const longformOnly = !!(person as any).longformOnly
  const voice = useFactionVoice()
  // 공용 낭독 목소리를 수식어 슬롯에만 펼친 편집용 객체.
  // 저장할 때는 공용값과 같은 필드를 다시 걷어내 인물 JSON에 중복 기록하지 않는다.
  const epithetPerson = withCommonEpithetVoice(person, voice?.commonNarrationVoice)
  const onEpithetChange = (next: FactionPerson) =>
    onChange(stripCommonEpithetVoice(next, voice?.commonNarrationVoice))
  // 셀럽 DB 등록 배지 — slug가 실제 DB에 있으면 ✓, 적혀 있는데 DB에 없으면 경고, 없으면 미연결.
  // 담화 인물 행과 같은 부품(CelebBadge)을 그대로 쓴다 — 대조 결과(celebExisting/celebLoaded)는 에피소드 레벨 배치 조회.
  const celebBadge = <CelebBadge speaker={person} existing={celebExisting} loaded={celebLoaded} />

  // 단일 필드 갱신 헬퍼
  const set = (key: keyof FactionPerson, val: string) => onChange({ ...person, [key]: val })

  // 이 인물 음성 파일명 — 렌더 인덱싱(vnPersonQuote)과 동일 규칙
  const voiceFile = factionVoiceFile(groupIndex, personIndex, clusterIndex)
  const hasQuote = !!(person.quoteChunks?.some(c => c.trim()) || person.quote?.trim())

  // 저장된 음원 메타 → 북리커맨드 VoiceFile 형태로 어댑트(존재 시). 패널·모달 공용.
  const meta = voice?.byFile.get(voiceFile)
  const metaDuration = meta?.duration
  const activeFile: VoiceFile | undefined = meta
    ? { name: voiceFile, sizeKB: Math.round(meta.size / 1024), duration: meta.duration, engine: 'gemini' }
    : undefined

  // 수식어 나레이션 슬롯 — 같은 자리 규칙, 파일만 -epithet. 수식어 텍스트가 있을 때만 패널 노출.
  const epithetFile = factionVoiceFile(groupIndex, personIndex, clusterIndex, 'epithet')
  const hasEpithet = !!person.epithet?.trim()
  const epithetMeta = voice?.byFile.get(epithetFile)
  const epithetMetaDuration = epithetMeta?.duration
  const epithetActiveFile: VoiceFile | undefined = epithetMeta
    ? { name: epithetFile, sizeKB: Math.round(epithetMeta.size / 1024), duration: epithetMeta.duration, engine: 'gemini' }
    : undefined

  // 디스크에 음원이 있는데 인물 quoteDuration 이 아직 「없을 때만」 디스크 길이로 채운다.
  // 파이프라인 밖에서 만든 기존 음원도 행이 그려지는 즉시 길이가 채워져 렌더에서 재생된다.
  //
  // ⚠ 이미 값이 있으면 덮어쓰지 않는다. 인물 위치 변경(reorder) 직후엔 음원 파일은 swap 됐지만
  //   voiceByFile 캐시(meta)가 아직 옛 길이를 들고 있어, 「어긋나면 보정」을 켜두면 방금 인물과 함께
  //   따라온 정확한 길이를 옛 인물 길이로 잘못 덮어쓴다. 생성·트림은 모달 onSaved 로 명시 갱신하고,
  //   외부 교체로 어긋난 길이는 `voice:faction --update-json` 으로 일괄 정정한다.
  useEffect(() => {
    if (!metaDuration || metaDuration <= 0) return
    const cur = person.quoteDuration ?? 0
    if (cur <= 0) onChange({ ...person, quoteDuration: metaDuration })
  }, [metaDuration, person, onChange])
  // 수식어 나레이션도 동일 — 디스크 음원이 있는데 epithetDuration 이 비어 있으면 디스크 길이로 채운다.
  useEffect(() => {
    if (!epithetMetaDuration || epithetMetaDuration <= 0) return
    const cur = person.epithetDuration ?? 0
    if (cur <= 0) onChange({ ...person, epithetDuration: epithetMetaDuration })
  }, [epithetMetaDuration, person, onChange])
  // 대사 처리 스텝(직함·수식어·음성) — 신모델. 접힌 줄 배지/체크박스에 공유.
  const stepsShorts = factionStepsOf(person, true)
  const stepsLongform = factionStepsOf(person, false)
  const toggleStepShorts = (key: keyof typeof stepsShorts) => onChange(applyFactionSteps(person, { ...stepsShorts, [key]: !stepsShorts[key] }, true))
  const toggleStepLongform = (key: keyof typeof stepsLongform) => onChange(applyFactionSteps(person, { ...stepsLongform, [key]: !stepsLongform[key] }, false))
  const stepLabelsShorts = [stepsShorts.credit && '직함', stepsShorts.epithet && '수식어', stepsShorts.voice && '음성'].filter(Boolean)
  const modeBadgeShorts = stepLabelsShorts.length ? stepLabelsShorts.join('·') : '없음'
  const stepLabelsLongform = [stepsLongform.credit && '직함', stepsLongform.epithet && '수식어', stepsLongform.voice && '음성'].filter(Boolean)
  const modeBadgeLongform = stepLabelsLongform.length ? stepLabelsLongform.join('·') : '없음'
  const summary = person.lines?.filter(Boolean).join(' · ') || person.quote?.trim() || ''

  const hasQuoteImage = !!person.quoteImage
  const imageChangeCount = person.imageChanges?.length ?? 0
  const hasQuoteImages = hasQuoteImage || imageChangeCount > 0

  // 이미지 연결된 청크 (0-based). quoteImage는 대사 시작(첫 청크) 표시
  const attachedQuoteLines = new Map<number, { hasImage: boolean; theme?: any }>()
  let themeIndex = 0
  
  if (hasQuoteImage) {
    attachedQuoteLines.set(0, { hasImage: true, theme: ANCHOR_THEMES[themeIndex++ % ANCHOR_THEMES.length] })
  }
  
  const sortedChanges = [...(person.imageChanges ?? [])].sort((a, b) => a.chunk - b.chunk)
  sortedChanges.forEach((ic) => {
    if (ic.image) {
      attachedQuoteLines.set(ic.chunk, { hasImage: true, theme: ANCHOR_THEMES[themeIndex++ % ANCHOR_THEMES.length] })
    } else {
      attachedQuoteLines.set(ic.chunk, { hasImage: false })
    }
  })

  const currentChunkCount = person.quoteChunks?.length || 0
  const maxChunk = Math.max(0, currentChunkCount - 1)

  // 영상 제외(눈) 버튼 — 접힘·펼침 공용
  const eyeButton = (
    <button
      type="button"
      onClick={() => onChange({ ...person, disabled: disabled ? undefined : true })}
      aria-pressed={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-md border ${disabled ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
      title={disabled ? '이 인물을 다시 영상에 포함' : '이 인물을 영상에서 제외 (데이터는 보존)'}
    >
      {disabled ? <Eye size={15} /> : <EyeOff size={15} />}
    </button>
  )
  // 롱폼 전용(필름) 버튼 — 켜면 이 인물은 모든 롱폼에 나오고 쇼츠에서만 빠진다
  const longformButton = (
    <button
      type="button"
      onClick={() => onChange({ ...person, longformOnly: longformOnly ? undefined : true })}
      aria-pressed={longformOnly}
      className={`flex h-8 w-8 items-center justify-center rounded-md border ${longformOnly ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
      title={longformOnly ? '이 인물을 쇼츠에도 다시 포함' : '이 인물을 롱폼에만 노출 (쇼츠에서 제외)'}
    >
      <Film size={15} />
    </button>
  )
  // 위/아래 이동 + 삭제 — 접힘·펼침 공용
  const moveDeleteButtons = (
    <>
      {onMoveCrossGroup && (
        <button type="button" onClick={onMoveCrossGroup} className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-bg-hover" title="다른 세력/그룹으로 이동">
          <ArrowRightLeft size={15} />
        </button>
      )}
      <button type="button" onClick={onMoveUp} disabled={personIndex === 0} className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40" title="위로">
        <ChevronUp size={15} />
      </button>
      <button type="button" onClick={onMoveDown} disabled={personIndex >= totalPeople - 1} className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40" title="아래로">
        <ChevronDown size={15} />
      </button>
      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
      <button type="button" onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/40 text-danger-text hover:border-danger/70 hover:bg-danger/15" title="삭제">
        <Trash2 size={15} />
      </button>
    </>
  )
  const picker = pickerOpen && (
    <ImagePicker
      value={ownImage}
      onChange={changeImage}
      crop={ownImage ? person.imageCrop : undefined}
      onCropChange={c => onChange({ ...person, imageCrop: c })}
      series={series}
      episodeName={episodeName}
      slug={person.slug}
      onClose={() => setPickerOpen(false)}
    />
  )
  // imageChanges 항목 이미지 선택 모달 — person.image 와 같은 picker, 대상만 해당 항목.
  const editIc = imgChangeEdit != null ? person.imageChanges?.[imgChangeEdit] : undefined
  const imgChangePicker = imgChangeEdit != null && editIc != null && (
    <ImagePicker
      value={editIc.image}
      onChange={next => {
        const list = [...(person.imageChanges ?? [])]
        list[imgChangeEdit] = { ...editIc, image: next ?? '' }
        onChange({ ...person, imageChanges: list })
      }}
      crop={editIc.crop}
      onCropChange={c => {
        const list = [...(person.imageChanges ?? [])]
        list[imgChangeEdit] = { ...editIc, crop: c }
        onChange({ ...person, imageChanges: list })
      }}
      filter={editIc.filter}
      onFilterChange={f => {
        const list = [...(person.imageChanges ?? [])]
        list[imgChangeEdit] = { ...editIc, filter: f }
        onChange({ ...person, imageChanges: list })
      }}
      series={series}
      episodeName={episodeName}
      slug={person.slug}
      onClose={() => setImgChangeEdit(null)}
    />
  )
  // 대사 사진(quoteImage) 선택 모달 — person.image 와 같은 picker, 대상만 quoteImage.
  const quoteImgPicker = quoteImgPickerOpen && (
    <ImagePicker
      value={person.quoteImage}
      onChange={next => onChange({ ...person, quoteImage: next })}
      crop={person.quoteImageCrop}
      onCropChange={c => onChange({ ...person, quoteImageCrop: c })}
      filter={person.quoteImageFilter}
      onFilterChange={f => onChange({ ...person, quoteImageFilter: f })}
      series={series}
      episodeName={episodeName}
      slug={person.slug}
      onClose={() => setQuoteImgPickerOpen(false)}
    />
  )

  return (
    <div
      id={`person-${groupIndex}-${clusterIndex}-${personIndex}`}
      className={`group flex scroll-mt-24 items-stretch overflow-hidden rounded-md border bg-bg-card ${longformOnly && !disabled ? 'border-accent/40' : 'border-border'}`}
      style={disabled ? { opacity: 0.5, filter: 'saturate(0.4)' } : undefined}
    >
      {/* 좌측 스크롤 이동 버튼 (독립 영역) */}
      {!collapsed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (personIndex === 0) {
              document.getElementById(`cluster-header-${groupIndex}-${clusterIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            } else {
              document.getElementById(`person-${groupIndex}-${clusterIndex}-${personIndex - 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
          className="flex w-10 shrink-0 cursor-pointer items-center justify-center border-r border-border text-text-dim hover:bg-slate-200/60 hover:text-text-secondary"
          title={personIndex === 0 ? "팀 화보로 이동" : "이전 인물로 이동"}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 헤더 — 미디어·요약 토글·명령을 각각 독립된 조작으로 둔다. */}
      <div
        className="flex items-center gap-2 p-2"
      >
        {/* 썸네일 — 클릭하면 이미지 변경. 풀에서 끌어온 이미지를 놓으면 그 자리에서 연결 */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setPickerOpen(true) }}
          {...dropProps}
          className={`relative shrink-0 overflow-hidden rounded border ${dragOver ? 'border-accent ring-2 ring-accent' : 'border-border'}`}
          title="클릭: 이미지 변경 · 풀에서 끌어다 놓기: 연결"
        >
          {src ? (
            <MediaThumb src={src} alt="" className="h-14 w-11 object-cover" style={cropToStyle(effectiveImageCrop)} />
          ) : (
            <span className="flex h-14 w-11 items-center justify-center bg-bg-secondary text-base font-bold text-text-secondary">
              {initial(person.name)}
            </span>
          )}
          {dragOver && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent/30 text-[10px] font-bold text-bg-main">
              연결
            </span>
          )}
          {imageInherited && !dragOver && (
            <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-sky-950/90 px-1 py-0.5 text-[8px] font-bold leading-none text-sky-200">
              상속
            </span>
          )}
        </button>
        {/* 이름 + 요약 + 처리 단계 */}
        <button
          type="button"
          onClick={() => setCollapsed(value => !value)}
          aria-expanded={!collapsed}
          aria-controls={`person-body-${groupIndex}-${clusterIndex}-${personIndex}`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          title={collapsed ? '인물 편집 펼치기' : '인물 편집 접기'}
        >
          <ChevronDown size={17} className={`shrink-0 text-text-dim transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{person.name || '이름 없음'}</span>
            {celebBadge}
            <span className="flex flex-col gap-0.5">
              <span className="rounded bg-bg-secondary px-1 text-[9px] text-text-dim">S: {modeBadgeShorts}</span>
              <span className="rounded bg-bg-secondary px-1 text-[9px] text-text-dim">L: {modeBadgeLongform}</span>
            </span>
          </span>
          {summary && <span className="line-clamp-1 text-xs text-text-dim">{summary}</span>}
          </span>
        </button>
        {/* 움직임 효과(전환·지속·줌 목표점·지지직·속도)는 상단 「효과 관리」 시트에서 설정 */}
        {/* 조작 — 헤더 클릭(토글)과 분리 */}
        <div className="flex shrink-0 items-center gap-1">
          {/* 대사 음성 설정 — 아코디언을 펼치지 않고도 바로 연다 (대사 있는 인물만) */}
          {voice && hasQuote && (
            <div className="flex items-stretch rounded-md border border-border bg-bg-main overflow-hidden">
              <button
                onClick={() => setVoiceModalOpen(true)}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover ${meta ? 'border-r border-border' : ''}`}
                title="이 인물 대사 음성 설정 열기"
              >
                <Mic size={14} /> 음성
                {meta && <span className="font-mono text-[10px] text-accent">{meta.duration.toFixed(1)}s</span>}
              </button>
              {meta && (
                <MiniAudioPlayer url={`/api/${series}/voice/${folderToParam(episodeName)}/${encodeURIComponent(voiceFile)}?t=${meta.size}`} rate={person[QUOTE_SLOT.fields.rate] as number | undefined} />
              )}
            </div>
          )}
          {/* 수식어 나레이션 설정 (수식어가 있는 인물만) */}
          {voice && hasEpithet && (
            <div className="flex items-stretch rounded-md border border-border bg-bg-main overflow-hidden">
              <button
                onClick={() => setEpithetModalOpen(true)}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover ${epithetMeta ? 'border-r border-border' : ''}`}
                title="이 인물 수식어 나레이션 설정 열기"
              >
                <Mic size={14} /> 수식어
                {epithetMeta && <span className="font-mono text-[10px] text-accent">{epithetMeta.duration.toFixed(1)}s</span>}
              </button>
              {epithetMeta && (
                <MiniAudioPlayer url={`/api/${series}/voice/${folderToParam(episodeName)}/${encodeURIComponent(epithetFile)}?t=${epithetMeta.size}`} rate={epithetPerson[EPITHET_SLOT.fields.rate] as number | undefined} />
              )}
            </div>
          )}
          {longformButton}
          {eyeButton}
          {moveDeleteButtons}
        </div>
      </div>

      {/* 펼침 폼 — 헤더 아래로 자연스럽게 늘어난다(세로 균형 안정) */}
      {!collapsed && (
      <div id={`person-body-${groupIndex}-${clusterIndex}-${personIndex}`} className="flex min-w-0 flex-col gap-2 border-t border-border p-2">
        <PersonBasicInfo person={person} onChange={onChange} editLang={editLang} />
        {/* 도감 표기 — 영상 원문 바로 아래에서 도감 손질(web_*)을 나란히 보고 고친다 */}
        <PersonAtlasPanel
          person={person}
          groupIndex={groupIndex}
          clusterIndex={clusterIndex}
          personIndex={personIndex}
          editLang={editLang}
        />
        {/* BookRecommend 스타일 시나리오 행 (한마디 대사 + 비주얼 트랙 통폐합) */}
        <div className="mb-2 rounded-lg border border-slate-400 bg-bg-card shadow-sm overflow-hidden">
          <button
            type="button"
            aria-expanded={quoteExpanded}
            aria-controls={`person-quote-${groupIndex}-${clusterIndex}-${personIndex}`}
            className="flex w-full cursor-pointer items-center justify-between border-b border-slate-400 bg-bg-secondary px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
            onClick={() => setQuoteExpanded(!quoteExpanded)}
            title={quoteExpanded ? '클릭하면 접기' : '클릭하면 펼치기'}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-xs font-black text-text-dim transition-transform duration-200" style={{ transform: quoteExpanded ? 'none' : 'rotate(-90deg)' }}>▼</span>
              <span className="bg-bg-hover border border-slate-400 text-text-primary font-bold text-xs px-1.5 py-0.5 rounded leading-none shrink-0">음성</span>
              인물 대사
            </div>
            <div className="text-xs text-text-dim">
              {hasQuoteImages && '이미지 연결됨'}
            </div>
          </button>
          
          {quoteExpanded && (
            <div id={`person-quote-${groupIndex}-${clusterIndex}-${personIndex}`} className="flex items-start gap-4 bg-bg-main/30 p-3">
              {/* 왼쪽: 텍스트 에디터 */}
              <div className="flex-1 min-w-0 flex gap-3">
                {editLang !== 'en' && (
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-xs text-text-dim flex items-center gap-1 mb-1 font-bold pl-1">
                      한국어 본문
                      {hasQuoteImages && (
                        <span className="text-[10px] text-text-dim font-normal ml-2">※ 번호(시점)에 따라 우측의 이미지 전환과 연결됨</span>
                      )}
                    </span>
                    <div className="rounded-lg border border-border bg-bg-card shadow-inner p-1 h-full">
                      <QuoteEditor
                        placeholder="엔터를 치면 덩어리가 분리됩니다"
                        value={person.quoteChunks?.join('\n') ?? person.quote ?? ''}
                        onChange={(raw) => {
                          const oldRaw = person.quoteChunks?.join('\n') ?? person.quote ?? ''
                          const ch = raw.split('\n')
                          const nextImageChanges = adjustImageChanges(oldRaw, raw, person.imageChanges ?? [])
                          onChange({ 
                            ...person, 
                            quoteChunks: ch, 
                            quote: ch.map((s) => s.trim()).filter(Boolean).join(' '),
                            imageChanges: nextImageChanges.length > 0 ? nextImageChanges : undefined
                          })
                        }}
                        anchors={attachedQuoteLines}
                        onAddAnchor={(chunkIndex) => {
                          const list = [...(person.imageChanges ?? [])]
                          const existingIdx = list.findIndex(ic => ic.chunk === chunkIndex)
                          if (existingIdx !== -1) {
                            setImgChangeEdit(existingIdx)
                          } else {
                            const nextList = [...list, { chunk: chunkIndex, image: '' }]
                            onChange({ ...person, imageChanges: nextList })
                            setImgChangeEdit(nextList.length - 1)
                          }
                        }}
                        onRemoveAnchor={(chunkIndex) => {
                          const list = (person.imageChanges ?? []).filter(ic => ic.chunk !== chunkIndex)
                          onChange({ ...person, imageChanges: list })
                        }}
                        onMoveAnchor={(fromIdx, toIdx) => {
                          const list = [...(person.imageChanges ?? [])]
                          const target = list.find(ic => ic.chunk === fromIdx)
                          if (target) {
                            const dest = list.find(ic => ic.chunk === toIdx)
                            if (dest) dest.chunk = fromIdx
                            target.chunk = toIdx
                            onChange({ ...person, imageChanges: list })
                          }
                        }}
                        className="text-text-primary placeholder:text-text-dim min-h-[84px]"
                      />
                    </div>
                  </div>
                )}
                {editLang !== 'ko' && (
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-xs text-text-dim mb-1 font-bold pl-1">(영문)</span>
                    <div className="rounded-lg border border-border bg-bg-card/60 shadow-inner p-1 h-full">
                      <QuoteEditor
                        placeholder="EN 대사 (엔터로 분리)"
                        value={person.quoteEnChunks?.join('\n') ?? person.quoteEn ?? ''}
                        onChange={(raw) => {
                          const ch = raw.split('\n')
                          onChange({ ...person, quoteEnChunks: ch, quoteEn: ch.map((s) => s.trim()).filter(Boolean).join(' ') })
                        }}
                        anchors={attachedQuoteLines}
                        className="italic text-text-secondary placeholder:text-text-dim min-h-[84px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 오른쪽: 이미지 앵커 수직 배열 (가로형 카드) */}
              <div className="flex flex-col gap-3 shrink-0 border-l border-border/50 pl-4 w-[296px]">
                {/* #1 대사 사진 (기본) */}
                <ImageCard
                  dnd={FACTION_IMAGE_DND}
                  src={quoteImgSrc}
                  crop={person.quoteImageCrop}
                  inheritedSrc={src}
                  inheritedCrop={effectiveImageCrop}
                  inheritedLabel="상속"
                  onDropImage={path => onChange({ ...person, quoteImage: path })}
                  onOpenPicker={() => setQuoteImgPickerOpen(true)}
                  label="#1 기본"
                  theme={hasQuoteImage ? attachedQuoteLines.get(0)?.theme : undefined}
                  filter={person.quoteImageFilter}
                  onFilterChange={f => onChange({ ...person, quoteImageFilter: f })}
                  onRemove={person.quoteImage ? () => onChange({ ...person, quoteImage: undefined, quoteImageCrop: undefined, quoteImageFilter: undefined }) : undefined}
                  caption={person.quoteChunks?.[0] || person.quote || ''}
                  captionEmpty="대사 시작"
                >
                  <div className="flex items-center gap-1 rounded bg-bg-hover px-1 py-0.5">
                    <span className="truncate text-[9px] leading-none text-text-dim">대사 시작점 고정</span>
                  </div>
                </ImageCard>

                {/* 대사 중 사진 전환 */}
                {[...(person.imageChanges ?? [])]
                  .map((ic, originalIdx) => ({ ic, originalIdx }))
                  .sort((a, b) => a.ic.chunk - b.ic.chunk)
                  .map(({ ic, originalIdx }) => {
                    const setIc = (patch: Partial<typeof ic>) => {
                      const list = [...(person.imageChanges ?? [])]
                      list[originalIdx] = { ...list[originalIdx], ...patch }
                      onChange({ ...person, imageChanges: list })
                    }
                    return (
                      <ImageCard
                        key={originalIdx}
                        dnd={FACTION_IMAGE_DND}
                        src={imageSrc(series, episodeName, ic.image)}
                        crop={ic.crop}
                        onDropImage={path => setIc({ image: path, crop: undefined })}
                        onOpenPicker={() => setImgChangeEdit(originalIdx)}
                        label={`#${ic.chunk + 1} 전환`}
                        theme={attachedQuoteLines.get(ic.chunk)?.theme}
                        filter={ic.filter}
                        onFilterChange={filter => setIc({ filter })}
                        onClearImage={() => setIc({ image: '' })}
                        onRemove={() => {
                          const list = (person.imageChanges ?? []).filter((_, i) => i !== originalIdx)
                          onChange({ ...person, imageChanges: list.length ? list : undefined })
                        }}
                        caption={person.quoteChunks?.[ic.chunk] ?? ''}
                        captionEmpty="빈 청크"
                      >
                        <div className="flex items-center rounded bg-bg-hover px-0.5 py-0.5">
                          <select
                            value={ic.chunk}
                            onChange={e => setIc({ chunk: Number(e.target.value) })}
                            onClick={e => e.stopPropagation()}
                            className="w-full rounded border border-border bg-bg-main px-1 py-0.5 text-[10px] focus:border-accent focus:outline-none"
                            title="이 대사 구절부터 왼쪽 사진으로 전환"
                          >
                            {(person.quoteChunks?.length ? person.quoteChunks : ['']).map((c, i) => (
                              <option key={i} value={i}>
                                [{i + 1}] {c.trim() ? (c.length > 8 ? `${c.slice(0, 8)}…` : c) : '(빈 줄)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </ImageCard>
                    )
                  })}

                <button type="button"
                  onClick={e => { e.stopPropagation(); onChange({ ...person, imageChanges: [...(person.imageChanges ?? []), { chunk: maxChunk, image: '' }] }) }}
                  className="flex flex-row gap-2 items-center justify-center w-[280px] shrink-0 h-[84px] rounded-md border border-dashed border-border text-xs text-text-dim hover:text-text-secondary hover:bg-bg-hover hover:border-text-secondary transition-colors mt-2">
                  <span className="text-lg leading-none">+</span>
                  <span className="mt-0.5 text-[10px]">전환 추가</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 제작 메모. 렌더 문구나 필수 출처로 사용하지 않는다. */}
        <div className="flex items-start gap-2">
          <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">대사 메모 -</span>
          <AutoResizeTextarea placeholder="필요할 때만 자유롭게 메모" value={person.quoteOrigin ?? ''} onChange={e => set('quoteOrigin', e.target.value)} rows={2} className="min-w-0 flex-1 resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs leading-snug text-text-secondary focus:border-accent focus:outline-none" />
        </div>
        {/* 소속 — 라벨·값 수평 */}
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-text-dim">소속 -</span>
          <input type="text" placeholder="소속" value={person.org ?? ''} onChange={e => set('org', e.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
        </div>

        {/* 전환효과는 헤더에서 선택한다 */}

        {/* 대사 화면 표시 — 에피소드 기본을 인물 단위로 덮어쓴다. 빈 값(기본)이면 에피소드 설정을 따른다 */}
        <div className="flex items-start gap-2 mt-2">
          <span className="mt-1 w-24 shrink-0 text-xs text-text-dim">대사 표시 -</span>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <select
              value={person.quoteDisplay ?? ''}
              onChange={e => {
                const v = e.target.value
                onChange({
                  ...person,
                  quoteDisplay: v === 'box' || v === 'caption' ? v : undefined,
                  // 박스로 돌리면 위치 지정은 의미 없음
                  ...(v !== 'caption' ? { quoteCaptionPos: undefined, quoteCaptionSize: undefined, quoteCaptionFont: undefined } : {}),
                })
              }}
              className="rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
              title="비우면 에피소드 기본(정비 탭)을 따른다. 박스는 큰 글씨 대사, 작은 자막은 글래스 태블릿"
            >
              <option value="">에피소드 기본</option>
              <option value="box">박스 (기존)</option>
              <option value="caption">작은 자막</option>
            </select>
            {person.quoteDisplay === 'caption' && (
              <>
                <select
                  value={person.quoteCaptionPos ?? 'bottom'}
                  onChange={e => onChange({ ...person, quoteCaptionPos: e.target.value === 'center' ? 'center' : 'bottom' })}
                  className="rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                  title="작은 자막 세로 위치 — 하단 또는 중하단 밴드"
                >
                  <option value="bottom">하단</option>
                  <option value="center">중하단</option>
                </select>
                <select
                  value={person.quoteCaptionSize ?? 'default'}
                  onChange={e => onChange({ ...person, quoteCaptionSize: e.target.value === 'large' ? 'large' : 'default' })}
                  className="rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                  title="자막 크기"
                >
                  <option value="default">기본 크기</option>
                  <option value="large">크게</option>
                </select>
                <select
                  value={person.quoteCaptionFont ?? 'default'}
                  onChange={e => onChange({ ...person, quoteCaptionFont: e.target.value === 'serif' ? 'serif' : 'default' })}
                  className="rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                  title="자막 폰트"
                >
                  <option value="default">고딕 (기본)</option>
                  <option value="serif">명조 (세리프)</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* 대사 처리 스텝 (쇼츠) */}
        <div className="flex items-start gap-2 mt-2">
          <span className="mt-1 w-24 shrink-0 text-xs text-text-dim">쇼츠(S) 처리 -</span>
          <div className="flex flex-1 items-start gap-1">
            {([
              { k: 'credit', l: '직함' },
              { k: 'epithet', l: '수식어' },
              { k: 'voice', l: '음성' },
            ] as const).map(o => (
              <div key={o.k} className="flex flex-1 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleStepShorts(o.k)}
                  className={`rounded-md border px-2 py-1 text-xs ${stepsShorts[o.k] ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                >
                  {stepsShorts[o.k] ? '☑ ' : '☐ '}{o.l}
                </button>
                {o.k === 'epithet' && stepsShorts.epithet && person.epithet && (
                  <div className="flex gap-1">
                    {([['🔊 낭독', true], ['⌨ 타이핑', false]] as const).map(([label, val]) => {
                      const narrated = epithetIsNarrated(person, true)
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => onChange({ ...person, epithetNarrateShorts: val })}
                          className={`flex-1 whitespace-nowrap rounded-md border px-1 py-1 text-[10px] ${narrated === val ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
                {o.k === 'credit' && stepsShorts.credit && (person.lines?.length ?? 0) > 0 && (
                  <div className="flex gap-1">
                    {([['순차등장', false], ['⌨ 타이핑', true]] as const).map(([label, val]) => {
                      const active = linesTypingOf(person, true) === val
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => onChange({ ...person, linesTypingShorts: val })}
                          className={`flex-1 whitespace-nowrap rounded-md border px-1 py-1 text-[10px] ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 대사 처리 스텝 (롱폼) */}
        <div className="flex items-start gap-2">
          <span className="mt-1 w-24 shrink-0 text-xs text-text-dim">롱폼(L) 처리 -</span>
          <div className="flex flex-1 items-start gap-1">
            {([
              { k: 'credit', l: '직함' },
              { k: 'epithet', l: '수식어' },
              { k: 'voice', l: '음성' },
            ] as const).map(o => (
              <div key={o.k} className="flex flex-1 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleStepLongform(o.k)}
                  className={`rounded-md border px-2 py-1 text-xs ${stepsLongform[o.k] ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                >
                  {stepsLongform[o.k] ? '☑ ' : '☐ '}{o.l}
                </button>
                {o.k === 'epithet' && stepsLongform.epithet && person.epithet && (
                  <div className="flex gap-1">
                    {([['🔊 낭독', true], ['⌨ 타이핑', false]] as const).map(([label, val]) => {
                      const narrated = epithetIsNarrated(person, false)
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => onChange({ ...person, epithetNarrateLongform: val })}
                          className={`flex-1 whitespace-nowrap rounded-md border px-1 py-1 text-[10px] ${narrated === val ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
                {o.k === 'credit' && stepsLongform.credit && (person.lines?.length ?? 0) > 0 && (
                  <div className="flex gap-1">
                    {([['순차등장', false], ['⌨ 타이핑', true]] as const).map(([label, val]) => {
                      const active = linesTypingOf(person, false) === val
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => onChange({ ...person, linesTypingLongform: val })}
                          className={`flex-1 whitespace-nowrap rounded-md border px-1 py-1 text-[10px] ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 대사 음성 — 설정 진입부 + 인라인 재생바. 본체는 모달(아래). (대사가 있을 때만 노출) */}
        {voice && hasQuote && (
          <FactionVoicePanel
            person={person}
            series={series}
            episodeName={episodeName}
            voiceFile={voiceFile}
            hasContent={hasQuote}
            meta={meta}
            activeFile={activeFile}
            onOpenModal={() => setVoiceModalOpen(true)}
            slot={QUOTE_SLOT}
            lang={editLang}
          />
        )}
        {/* 수식어 나레이션 — 대사 음성과 동일 패널, 슬롯만 수식어. (수식어가 있을 때만 노출) */}
        {voice && hasEpithet && (
          <FactionVoicePanel
            person={epithetPerson}
            series={series}
            episodeName={episodeName}
            voiceFile={epithetFile}
            hasContent={hasEpithet}
            meta={epithetMeta}
            activeFile={epithetActiveFile}
            onOpenModal={() => setEpithetModalOpen(true)}
            slot={EPITHET_SLOT}
            lang={editLang}
          />
        )}
      </div>
      )}

      {picker}
      {imgChangePicker}
      {quoteImgPicker}

      {/* 대사 음성 설정 모달 — 헤더 음성 버튼·펼침 폼 음성 패널 공용. 아코디언 접힘과 무관하게 열린다. */}
      {voice && hasQuote && voiceModalOpen && (
        <FactionVoiceSettingsModal
          person={person}
          onChange={onChange}
          series={series}
          episodeName={episodeName}
          voiceFile={voiceFile}
          activeFile={activeFile}
          onRefresh={() => voice.reload?.()}
          onClose={() => setVoiceModalOpen(false)}
          slot={QUOTE_SLOT}
          lang={editLang}
        />
      )}
      {/* 수식어 나레이션 설정 모달 — 대사와 동일, 슬롯만 수식어. */}
      {voice && hasEpithet && epithetModalOpen && (
        <FactionVoiceSettingsModal
          person={epithetPerson}
          onChange={onEpithetChange}
          series={series}
          episodeName={episodeName}
          voiceFile={epithetFile}
          activeFile={epithetActiveFile}
          onRefresh={() => voice.reload?.()}
          onClose={() => setEpithetModalOpen(false)}
          slot={EPITHET_SLOT}
          lang={editLang}
        />
      )}
      </div>

      {/* 우측 스크롤 이동 버튼 (독립 영역) */}
      {!collapsed && (
        <button
          type="button"
          disabled={personIndex >= (totalPeople ?? 1) - 1}
          onClick={(e) => {
            e.stopPropagation()
            document.getElementById(`person-${groupIndex}-${clusterIndex}-${personIndex + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className={`flex w-10 shrink-0 items-center justify-center border-l border-border ${
            personIndex >= (totalPeople ?? 1) - 1
              ? 'opacity-30 cursor-not-allowed bg-bg-secondary text-text-dim' 
              : 'hover:bg-slate-200/60 text-text-dim hover:text-text-secondary cursor-pointer'
          }`}
          title={personIndex >= (totalPeople ?? 1) - 1 ? "마지막 인물입니다" : "다음 인물로 이동"}
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  )
}

export function MiniAudioPlayer({ url, rate }: { url: string; rate?: number }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const id = useRef(Math.random().toString(36).substring(7)).current

  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail.id !== id) {
        if (audioRef.current) {
          audioRef.current.pause()
          setPlaying(false)
        }
      }
    }
    document.addEventListener('miniaudioplayer-play', handleOtherPlay)
    return () => {
      document.removeEventListener('miniaudioplayer-play', handleOtherPlay)
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [id])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const a = new Audio(url)
      if (rate) a.playbackRate = rate
      a.onended = () => setPlaying(false)
      a.onerror = () => setPlaying(false)
      a.play().then(() => {
        document.dispatchEvent(new CustomEvent('miniaudioplayer-play', { detail: { id } }))
      }).catch(() => setPlaying(false))
      audioRef.current = a
      setPlaying(true)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`px-2 py-1.5 flex items-center justify-center transition-colors ${playing ? 'text-accent bg-accent/10' : 'text-text-dim hover:text-text-secondary hover:bg-bg-hover'}`}
      title={playing ? '정지' : '재생'}
    >
      {playing ? <Pause size={14} /> : <Play size={14} />}
    </button>
  )
}
