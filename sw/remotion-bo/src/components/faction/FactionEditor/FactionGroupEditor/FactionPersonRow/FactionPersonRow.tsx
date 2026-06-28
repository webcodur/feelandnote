'use client'

import { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown, Trash2, Eye, EyeOff, Mic } from '../../../shared/icons'
import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '../../../../voice-utils'
import { factionVoiceFile } from '@/lib/faction-voice'
import { imageSrc, initial, cropToStyle, factionStepsOf, applyFactionSteps } from '../../../shared/timing'
import { FactionMediaThumb } from '../../../shared/FactionMediaThumb'
import { FactionImagePicker } from './FactionImagePicker/FactionImagePicker'
import { FactionVoicePanel } from './FactionVoicePanel/FactionVoicePanel'
import { FactionVoiceSettingsModal } from './FactionVoicePanel/voice-panel'
import { QUOTE_SLOT, EPITHET_SLOT } from './FactionVoicePanel/voice-panel/voice-slots'
import { useFactionVoice } from '../../../shared/FactionVoiceContext'
import { useFactionImageDrop } from '../../../shared/useFactionImageDrop'
import type { EditLang } from '../../../FactionEditor'

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
  /** 묶음(또는 묶음 없을 때 세력) 내 로컬 인물 인덱스 (0-based) */
  personIndex: number
  /** 묶음 인덱스 (분할 세력) — 단일 모드면 미지정 */
  clusterIndex?: number
  /** 무소속 개인군 여부 — 파일명에 C 부착 여부 결정 */
  solo: boolean
  editLang: EditLang
}

export function FactionPersonRow({ person, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName, groupIndex, personIndex, clusterIndex, solo, editLang }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  // 인물 행 접기 — 기본 접힘(목록 조망). 펼치면 전체 편집 폼.
  const [collapsed, setCollapsed] = useState(true)
  // 음성 설정 모달 — 접힘·펼침 무관하게 헤더 버튼으로 바로 연다. 대사·수식어 각각.
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [epithetModalOpen, setEpithetModalOpen] = useState(false)
  // 이미지 풀에서 끌어온 이미지를 사진 칸에 놓으면 연결 — 드래그 중 하이라이트
  const { dragOver, dropProps } = useFactionImageDrop(path => onChange({ ...person, image: path }))
  // 대사 사진 칸도 동일하게 풀에서 끌어다 놓기 지원
  const { dragOver: quoteImgDragOver, dropProps: quoteImgDropProps } = useFactionImageDrop(path => onChange({ ...person, quoteImage: path }))
  // imageChanges 항목별 이미지 선택 모달 — 편집 중 항목 인덱스(null=닫힘)
  const [imgChangeEdit, setImgChangeEdit] = useState<number | null>(null)
  // 대사 사진(quoteImage) 선택 모달 — 대사 시작 시점에 바뀔 두 번째 사진
  const [quoteImgPickerOpen, setQuoteImgPickerOpen] = useState(false)
  const src = imageSrc(series, episodeName, person.image)
  const quoteImgSrc = imageSrc(series, episodeName, person.quoteImage)
  const disabled = !!person.disabled
  const voice = useFactionVoice()

  // 단일 필드 갱신 헬퍼
  const set = (key: keyof FactionPerson, val: string) => onChange({ ...person, [key]: val })

  // 이 인물 음성 파일명 — 렌더 인덱싱(vnPersonQuote)과 동일 규칙
  const voiceFile = factionVoiceFile(groupIndex, personIndex, solo, clusterIndex)
  const hasQuote = !!(person.quoteChunks?.some(c => c.trim()) || person.quote?.trim())

  // 저장된 음원 메타 → 북리커맨드 VoiceFile 형태로 어댑트(존재 시). 패널·모달 공용.
  const meta = voice?.byFile.get(voiceFile)
  const activeFile: VoiceFile | undefined = meta
    ? { name: voiceFile, sizeKB: Math.round(meta.size / 1024), duration: meta.duration, engine: 'gemini' }
    : undefined

  // 수식어 나레이션 슬롯 — 같은 자리 규칙, 파일만 -epithet. 수식어 텍스트가 있을 때만 패널 노출.
  const epithetFile = factionVoiceFile(groupIndex, personIndex, solo, clusterIndex, 'epithet')
  const hasEpithet = !!person.epithet?.trim()
  const epithetMeta = voice?.byFile.get(epithetFile)
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
    if (!meta || meta.duration <= 0) return
    const cur = person.quoteDuration ?? 0
    if (cur <= 0) onChange({ ...person, quoteDuration: meta.duration })
  }, [meta?.duration, person, onChange])
  // 수식어 나레이션도 동일 — 디스크 음원이 있는데 epithetDuration 이 비어 있으면 디스크 길이로 채운다.
  useEffect(() => {
    if (!epithetMeta || epithetMeta.duration <= 0) return
    const cur = person.epithetDuration ?? 0
    if (cur <= 0) onChange({ ...person, epithetDuration: epithetMeta.duration })
  }, [epithetMeta?.duration, person, onChange])
  // 대사 처리 스텝(직함·수식어·음성) — 신모델. 접힌 줄 배지/체크박스에 공유.
  const steps = factionStepsOf(person)
  const toggleStep = (key: keyof typeof steps) => onChange(applyFactionSteps(person, { ...steps, [key]: !steps[key] }))
  const stepLabels = [steps.credit && '직함', steps.epithet && '수식어', steps.voice && '음성'].filter(Boolean)
  const modeBadge = stepLabels.length ? stepLabels.join('·') : '없음'
  const summary = person.lines?.filter(Boolean).join(' · ') || person.quote?.trim() || ''

  // 영상 제외(눈) 버튼 — 접힘·펼침 공용
  const eyeButton = (
    <button
      onClick={() => onChange({ ...person, disabled: disabled ? undefined : true })}
      className={`rounded-md border p-1.5 ${disabled ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
      title={disabled ? '이 인물을 다시 영상에 포함' : '이 인물을 영상에서 제외 (데이터는 보존)'}
    >
      {disabled ? <Eye size={15} /> : <EyeOff size={15} />}
    </button>
  )
  // 위/아래 이동 + 삭제 — 접힘·펼침 공용
  const moveDeleteButtons = (
    <>
      <button onClick={onMoveUp} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="위로">
        <ChevronUp size={15} />
      </button>
      <button onClick={onMoveDown} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="아래로">
        <ChevronDown size={15} />
      </button>
      <button onClick={onDelete} className="rounded-md border border-border p-1.5 text-danger-text hover:bg-danger" title="삭제">
        <Trash2 size={15} />
      </button>
    </>
  )
  const picker = pickerOpen && (
    <FactionImagePicker
      value={person.image}
      onChange={next => onChange({ ...person, image: next })}
      crop={person.imageCrop}
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
    <FactionImagePicker
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
      series={series}
      episodeName={episodeName}
      slug={person.slug}
      onClose={() => setImgChangeEdit(null)}
    />
  )
  // 대사 사진(quoteImage) 선택 모달 — person.image 와 같은 picker, 대상만 quoteImage.
  const quoteImgPicker = quoteImgPickerOpen && (
    <FactionImagePicker
      value={person.quoteImage}
      onChange={next => onChange({ ...person, quoteImage: next })}
      crop={person.quoteImageCrop}
      onCropChange={c => onChange({ ...person, quoteImageCrop: c })}
      series={series}
      episodeName={episodeName}
      slug={person.slug}
      onClose={() => setQuoteImgPickerOpen(false)}
    />
  )

  return (
    <div
      className="rounded-md border border-border bg-bg-card"
      style={disabled ? { opacity: 0.5, filter: 'saturate(0.4)' } : undefined}
    >
      {/* 헤더 — 항상 보임. 헤더(빈 영역·이름)를 누르면 접기/펼치기 */}
      <div
        className={`flex cursor-pointer items-center gap-2 p-2 transition-none hover:bg-bg-secondary ${collapsed ? 'rounded-md' : 'rounded-t-md'}`}
        onClick={() => setCollapsed(v => !v)}
        title={collapsed ? '펼쳐서 편집' : '접기'}
      >
        {/* 썸네일 — 클릭하면 이미지 변경. 풀에서 끌어온 이미지를 놓으면 그 자리에서 연결 */}
        <button
          onClick={e => { e.stopPropagation(); setPickerOpen(true) }}
          {...dropProps}
          className={`relative shrink-0 overflow-hidden rounded border ${dragOver ? 'border-accent ring-2 ring-accent' : 'border-border'}`}
          title="클릭: 이미지 변경 · 풀에서 끌어다 놓기: 연결"
        >
          {src ? (
            <FactionMediaThumb src={src} alt="" className="h-14 w-11 object-cover" style={cropToStyle(person.imageCrop)} />
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
        </button>
        {/* 이름 + 요약 + 처리 단계 */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{person.name || '이름 없음'}</span>
            <span className="rounded bg-bg-secondary px-1 text-[9px] text-text-dim">{modeBadge}</span>
          </span>
          {summary && <span className="line-clamp-1 text-xs text-text-dim">{summary}</span>}
        </div>
        {/* 움직임 효과(전환·지속·줌 목표점·지지직·속도)는 상단 「효과 관리」 시트에서 설정 */}
        {/* 조작 — 헤더 클릭(토글)과 분리 */}
        <div className="flex shrink-0 items-center gap-1" onClick={e => e.stopPropagation()}>
          {/* 대사 음성 설정 — 아코디언을 펼치지 않고도 바로 연다 (대사 있는 인물만) */}
          {voice && hasQuote && (
            <button
              onClick={() => setVoiceModalOpen(true)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
              title="이 인물 대사 음성 설정 열기"
            >
              <Mic size={14} /> 음성
              {meta && <span className="font-mono text-[10px] text-accent">{meta.duration.toFixed(1)}s</span>}
            </button>
          )}
          {/* 수식어 나레이션 설정 (수식어가 있는 인물만) */}
          {voice && hasEpithet && (
            <button
              onClick={() => setEpithetModalOpen(true)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
              title="이 인물 수식어 나레이션 설정 열기"
            >
              <Mic size={14} /> 수식어
              {epithetMeta && <span className="font-mono text-[10px] text-accent">{epithetMeta.duration.toFixed(1)}s</span>}
            </button>
          )}
          {eyeButton}
          {moveDeleteButtons}
        </div>
      </div>

      {/* 펼침 폼 — 헤더 아래로 자연스럽게 늘어난다(세로 균형 안정) */}
      {!collapsed && (
      <div className="flex min-w-0 flex-col gap-2 border-t border-border p-2">
        {/* 이름 + 이름(영문) — 라벨·값 수평 */}
        <div className="flex items-center gap-2">
          {editLang !== 'en' && (
            <>
              <span className="w-24 shrink-0 text-xs text-text-dim">이름 -</span>
              <input type="text" placeholder="이름" value={person.name} onChange={e => set('name', e.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
            </>
          )}
          {editLang !== 'ko' && (
            <>
              <span className="w-12 shrink-0 text-xs text-text-dim">(영문) -</span>
              <input type="text" placeholder="EN 이름" value={person.nameEn ?? ''} onChange={e => set('nameEn', e.target.value)} className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none" />
            </>
          )}
        </div>
        {/* 직함·이력 + (영문) — 라벨·값 수평 */}
        <div className="flex items-start gap-2">
          {editLang !== 'en' && (
            <>
              <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">직함·이력 -</span>
              <textarea placeholder="줄바꿈으로 줄 구분 (최대 3줄)" value={person.lines?.join('\n') ?? ''} onChange={e => onChange({ ...person, lines: e.target.value.split('\n') })} rows={3} className="min-w-0 flex-1 resize-none rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm leading-snug focus:border-accent focus:outline-none" />
            </>
          )}
          {editLang !== 'ko' && (
            <>
              <span className="w-12 shrink-0 pt-1.5 text-xs text-text-dim">(영문) -</span>
              <textarea placeholder="EN 직함·이력 (줄바꿈 구분)" value={person.linesEn?.join('\n') ?? ''} onChange={e => onChange({ ...person, linesEn: e.target.value.split('\n') })} rows={3} className="min-w-0 flex-1 resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs leading-snug text-text-secondary focus:border-accent focus:outline-none" />
            </>
          )}
        </div>
        {/* 수식어(문장형) + (영문) — 직함과 별개 값. 세로 쇼츠에서 대사 직전 먼저 떠오른다 */}
        <div className="flex items-start gap-2">
          {editLang !== 'en' && (
            <>
              <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">수식어 -</span>
              <textarea placeholder="대사 전에 띄울 한 문장 (예: 1988년 사이퍼펑크 선언문을 세상에 던져, 암호로 국가의 감시를 끝내려 한 예언자)" value={person.epithet ?? ''} onChange={e => set('epithet', e.target.value.replace(/\n/g, ' '))} rows={2} className="min-w-0 flex-1 resize-none rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm leading-snug focus:border-accent focus:outline-none" />
            </>
          )}
          {editLang !== 'ko' && (
            <>
              <span className="w-12 shrink-0 pt-1.5 text-xs text-text-dim">(영문) -</span>
              <textarea placeholder="EN epithet (one sentence)" value={person.epithetEn ?? ''} onChange={e => set('epithetEn', e.target.value.replace(/\n/g, ' '))} rows={2} className="min-w-0 flex-1 resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs leading-snug text-text-secondary focus:border-accent focus:outline-none" />
            </>
          )}
        </div>
        {/* 한마디 대사 + 대사(영문) — 라벨·값 수평 */}
        <div className="flex items-start gap-2">
          {editLang !== 'en' && (
            <>
              <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">한마디 대사 -</span>
              <textarea placeholder="줄바꿈으로 의미 덩어리 구분" value={person.quoteChunks?.join('\n') ?? person.quote ?? ''} onChange={e => { const ch = e.target.value.split('\n'); onChange({ ...person, quoteChunks: ch, quote: ch.map(s => s.trim()).filter(Boolean).join(' ') }) }} rows={4} className="min-w-0 flex-1 resize-none rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm italic leading-snug focus:border-accent focus:outline-none" />
            </>
          )}
          {editLang !== 'ko' && (
            <>
              <span className="w-12 shrink-0 pt-1.5 text-xs text-text-dim">(영문) -</span>
              <textarea placeholder="EN 대사 (줄바꿈으로 덩어리)" value={person.quoteEnChunks?.join('\n') ?? person.quoteEn ?? ''} onChange={e => { const ch = e.target.value.split('\n'); onChange({ ...person, quoteEnChunks: ch, quoteEn: ch.map(s => s.trim()).filter(Boolean).join(' ') }) }} rows={4} className="min-w-0 flex-1 resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs italic leading-snug text-text-secondary focus:border-accent focus:outline-none" />
            </>
          )}
        </div>
        {/* 대사 사진 — 직함 소개 동안엔 헤더 사진, 대사가 시작되는 순간 이 두 번째 사진으로 크로스페이드 */}
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-text-dim">대사 사진 -</span>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {quoteImgSrc && (
              <FactionMediaThumb src={quoteImgSrc} alt="" className="h-10 w-8 shrink-0 rounded border border-border object-cover" style={cropToStyle(person.quoteImageCrop)} />
            )}
            <button type="button" onClick={e => { e.stopPropagation(); setQuoteImgPickerOpen(true) }} {...quoteImgDropProps}
              title="클릭: 사진 선택 · 풀에서 끌어다 놓기: 연결"
              className={`min-w-0 flex-1 truncate rounded-md border bg-bg-main px-2 py-1 text-left text-xs hover:bg-bg-hover ${quoteImgDragOver ? 'border-accent ring-2 ring-accent' : 'border-border'}`}>
              {quoteImgDragOver ? '여기에 놓기' : (person.quoteImage || '대사 시작 시 바뀔 사진 선택…')}
            </button>
            {person.quoteImage && (
              <button type="button" onClick={e => { e.stopPropagation(); onChange({ ...person, quoteImage: undefined, quoteImageCrop: undefined }) }}
                className="shrink-0 rounded-md border border-border p-1 text-danger-text hover:bg-danger" title="삭제">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        {/* 대사 중 사진 전환 — 특정 의미 덩어리부터 다른 사진으로 크로스페이드 */}
        <div className="flex items-start gap-2">
          <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">사진 전환 -</span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {(person.imageChanges ?? []).map((ic, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="number" min={1} value={ic.chunk + 1}
                  onChange={e => { const list = [...(person.imageChanges ?? [])]; list[idx] = { ...list[idx], chunk: Math.max(0, Number(e.target.value) - 1) }; onChange({ ...person, imageChanges: list }) }}
                  onClick={e => e.stopPropagation()}
                  className="w-14 shrink-0 rounded-md border border-border bg-bg-main px-1.5 py-1 text-xs focus:border-accent focus:outline-none"
                  title="이 덩어리(번째)부터 아래 사진으로 전환"
                />
                <span className="shrink-0 text-[11px] text-text-dim">번째부터</span>
                <button type="button" onClick={e => { e.stopPropagation(); setImgChangeEdit(idx) }}
                  className="min-w-0 flex-1 truncate rounded-md border border-border bg-bg-main px-2 py-1 text-left text-xs hover:bg-bg-hover">
                  {ic.image || '이미지 선택…'}
                </button>
                <button type="button" onClick={e => { e.stopPropagation(); const list = (person.imageChanges ?? []).filter((_, i) => i !== idx); onChange({ ...person, imageChanges: list.length ? list : undefined }) }}
                  className="shrink-0 rounded-md border border-border p-1 text-danger-text hover:bg-danger" title="삭제">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button type="button"
              onClick={e => { e.stopPropagation(); onChange({ ...person, imageChanges: [...(person.imageChanges ?? []), { chunk: 0, image: '' }] }) }}
              className="self-start rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover">+ 사진 전환 추가</button>
            {!!person.quoteChunks?.length && (
              <span className="text-[10px] text-text-dim">의미 덩어리 {person.quoteChunks.length}개 — 1~{person.quoteChunks.length}번째 중 어디서 바꿀지 지정</span>
            )}
          </div>
        </div>
        {/* 대사 원문 — 라벨·값 수평 (영문 또는 통합 모드에서만 노출) */}
        {editLang !== 'ko' && (
          <div className="flex items-start gap-2">
            <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">대사 원문 -</span>
            <textarea placeholder="실제 발언 영어 원문" value={person.quoteOrigin ?? ''} onChange={e => set('quoteOrigin', e.target.value)} rows={2} className="min-w-0 flex-1 resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs italic leading-snug text-text-secondary focus:border-accent focus:outline-none" />
          </div>
        )}
        {/* 소속 — 라벨·값 수평 */}
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-text-dim">소속 -</span>
          <input type="text" placeholder="소속" value={person.org ?? ''} onChange={e => set('org', e.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
        </div>

        {/* 전환효과는 헤더에서 선택한다 */}

        {/* 대사 처리 스텝 — 직함·수식어·음성 3개 독립 체크박스. 수식어를 켜면 그 칸이 펼쳐져
            음성 해설(낭독/타이핑)을 그 안에서 고른다. 켜진 스텝이 직함→수식어→대사 순서로 나온다. 음성을 끄면 대사는 안 뜬다 */}
        <div className="flex items-start gap-2">
          <span className="mt-1 w-24 shrink-0 text-xs text-text-dim">대사 처리 -</span>
          <div className="flex flex-1 items-start gap-1">
            {([
              { k: 'credit', l: '직함' },
              { k: 'epithet', l: '수식어' },
              { k: 'voice', l: '음성' },
            ] as const).map(o => (
              <div key={o.k} className="flex flex-1 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleStep(o.k)}
                  className={`rounded-md border px-2 py-1 text-xs ${steps[o.k] ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
                >
                  {steps[o.k] ? '☑ ' : '☐ '}{o.l}
                </button>
                {/* 수식어를 켠 인물만 — 음성 해설 켜기(낭독: 나레이터 음성 재생) / 끄기(타이핑: 음원 없이 글자만).
                    미지정이면 음원이 있으면 낭독으로 동작하므로, 음원이 있어도 끄려면 타이핑을 명시한다. */}
                {o.k === 'epithet' && steps.epithet && person.epithet && (
                  <div className="flex gap-1">
                    {([['🔊 낭독', true], ['⌨ 타이핑', false]] as const).map(([label, val]) => {
                      const narrated = person.epithetNarrate !== undefined ? person.epithetNarrate : !!(person.epithetDuration && person.epithetDuration > 0)
                      return (
                        <button
                          key={label}
                          type="button"
                          title={val ? '낭독 — 나레이터 음성 재생' : '타이핑 — 음원 없이 글자만'}
                          onClick={() => onChange({ ...person, epithetNarrate: val })}
                          className={`flex-1 whitespace-nowrap rounded-md border px-1 py-1 text-xs ${narrated === val ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
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
          />
        )}
        {/* 수식어 나레이션 — 대사 음성과 동일 패널, 슬롯만 수식어. (수식어가 있을 때만 노출) */}
        {voice && hasEpithet && (
          <FactionVoicePanel
            person={person}
            series={series}
            episodeName={episodeName}
            voiceFile={epithetFile}
            hasContent={hasEpithet}
            meta={epithetMeta}
            activeFile={epithetActiveFile}
            onOpenModal={() => setEpithetModalOpen(true)}
            slot={EPITHET_SLOT}
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
        />
      )}
      {/* 수식어 나레이션 설정 모달 — 대사와 동일, 슬롯만 수식어. */}
      {voice && hasEpithet && epithetModalOpen && (
        <FactionVoiceSettingsModal
          person={person}
          onChange={onChange}
          series={series}
          episodeName={episodeName}
          voiceFile={epithetFile}
          activeFile={epithetActiveFile}
          onRefresh={() => voice.reload?.()}
          onClose={() => setEpithetModalOpen(false)}
          slot={EPITHET_SLOT}
        />
      )}
    </div>
  )
}
