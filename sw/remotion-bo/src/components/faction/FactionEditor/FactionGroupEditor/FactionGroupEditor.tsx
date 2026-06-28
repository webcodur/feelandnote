'use client'

import { useState } from 'react'
import type { FactionGroup, FactionPerson, FactionCluster, FactionImageCrop, ZoomFocus } from '@/lib/faction-types'
import { factionVoiceFile } from '@/lib/faction-voice'
import { imageSrc } from '../../shared/timing'
import { ChevronUp, ChevronDown, Trash2, Search, UserPlus, ImageIcon, Plus, Eye, EyeOff } from '../../shared/icons'
import { FactionPersonRow } from './FactionPersonRow/FactionPersonRow'
import { useFactionVoice } from '../../shared/FactionVoiceContext'
import { FactionImagePicker } from './FactionPersonRow/FactionImagePicker/FactionImagePicker'
import { FactionMediaThumb } from '../../shared/FactionMediaThumb'
import { FactionCelebSearchModal, type CelebResult } from './FactionCelebSearchModal'
import { useFactionImageDrop } from '../../shared/useFactionImageDrop'
import { PersonList } from './PersonList/PersonList'
import { CoverPickerButton } from './CoverPickerButton/CoverPickerButton'

import type { EditLang } from '../../FactionEditor'

type Props = {
  /** 세력 인덱스 (0-based) — 음성 파일명 계산용 */
  groupIndex: number
  group: FactionGroup
  onChange: (next: FactionGroup) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  series: string
  episodeName: string
  /** 선택 가능한 음악 목록 (세력별 곡 지정용) */
  musicList?: string[]
  editLang: EditLang
}

const DEFAULT_COLOR = '#92400e'

// 셀럽 검색 결과 → 인물 변환
function celebToPerson(c: CelebResult): FactionPerson {
  return {
    name: c.nickname,
    role: c.title || c.profession || '',
    org: '',
    image: c.avatar_url || undefined,
    slug: c.slug,
    // 불변 셀럽 ID — 앞으로 보이스·셀럽 정보 연동의 열쇠
    celebId: c.id,
    // DB에 국문 보이스가 있으면 그대로 끌어와 ElevenLabs 대사 음성으로 채운다
    ...(c.voice_id_ko ? { quoteElevenlabsVoiceId: c.voice_id_ko, quoteEngine: 'elevenlabs' as const } : {}),
  }
}

export function FactionGroupEditor({
  groupIndex, group, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName, musicList, editLang,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [logoOpen, setLogoOpen] = useState(false)
  const [expandedClusters, setExpandedClusters] = useState<Record<number, boolean>>({})
  // 단일 모드(묶음 안 나눈 세력)도 묶음 하나짜리 아코디언으로 보여준다 — 묶음 나눈 세력과 모양 통일. 기본 열림.
  const [singleExpanded, setSingleExpanded] = useState(true)
  // 셀럽 검색 대상: null=단일 people, 숫자=해당 묶음 인덱스
  const [celebTarget, setCelebTarget] = useState<number | null | undefined>(undefined)
  // 이미지 풀에서 끌어온 이미지를 로고 칸에 놓으면 연결 (로고 = titleArt)
  const { dragOver: logoDragOver, dropProps: logoDropProps } = useFactionImageDrop(path => onChange({ ...group, titleArt: path }))

  const color = group.color ?? DEFAULT_COLOR
  // 헤더 배경(세력 색)의 명도로 위에 얹을 글자 색을 정한다 — 밝은 배경엔 어두운 글자, 어두운 배경엔 밝은 글자
  const headerLum = (() => {
    const c = color.replace('#', '')
    if (c.length < 6) return 128
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16)
    return 0.299 * r + 0.587 * g + 0.114 * b
  })()
  const onColor = headerLum > 150 ? '#1a1a1a' : '#ffffff'
  const onColorDim = headerLum > 150 ? 'rgba(0,0,0,0.62)' : 'rgba(255,255,255,0.78)'
  const disabled = !!group.disabled
  // 영상 제외 토글: disabled: true ↔ undefined
  const toggleDisabled = () => onChange({ ...group, disabled: disabled ? undefined : true })
  // 로고 = 타이틀 카드 풀스크린 배경(titleArt). 렌더는 titleArt만 보고 타이틀 컷을 만든다(group.logo는 미사용 사장 필드).
  const logoSrc = imageSrc(series, episodeName, group.titleArt)
  const split = !!group.clusters?.length
  const clusters = group.clusters ?? []
  const people = group.people ?? []
  const totalCount = split
    ? clusters.reduce((s, c) => s + (c.people?.length ?? 0), 0)
    : people.length
  // 접힌 상태에서 보여줄 팀 비주얼 — 그룹샷(화보)들. 로고(titleArt)는 logoSrc로 따로 표시한다.
  // 분할 세력은 묶음별 화보, 단일은 세력 화보.
  const covers = [...(split ? clusters.map(c => c.image) : [group.image])].filter(Boolean) as string[]

  // region 모드 전환 (단일 ↔ 분할) — clusters와 people이 동시에 차지 않게 한다
  const toSplit = () => {
    // 단일 → 분할: group.people를 clusters[0]로 옮기고 people 비움
    onChange({
      ...group,
      clusters: [{ label: '', image: group.image, people }],
      people: [],
      image: undefined,
    })
  }
  const toSingle = () => {
    // 분할 → 단일: 모든 묶음 인물을 순서대로 합치고 clusters 제거
    const merged = clusters.flatMap(c => c.people ?? [])
    const firstImage = clusters.find(c => c.image)?.image
    onChange({
      ...group,
      people: merged,
      image: group.image ?? firstImage,
      clusters: undefined,
    })
  }
  // endregion

  // region 묶음 조작
  const setClusters = (next: FactionCluster[]) => onChange({ ...group, clusters: next })
  const setCluster = (i: number, c: FactionCluster) =>
    setClusters(clusters.map((x, idx) => (idx === i ? c : x)))
  const addCluster = () => setClusters([...clusters, { label: '', people: [] }])
  const deleteCluster = (i: number) => {
    if (!confirm('이 그룹을 삭제하시겠습니까? (그룹 내 인물도 함께 삭제됩니다)')) return
    setClusters(clusters.filter((_, idx) => idx !== i))
  }
  const moveCluster = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= clusters.length) return
    const next = [...clusters]
    ;[next[i], next[j]] = [next[j], next[i]]
    setClusters(next)
  }
  // endregion

  // 셀럽 선택 반영 — 대상 모드에 맞게 인물 추가
  const addCeleb = (c: CelebResult) => {
    const person = celebToPerson(c)
    if (typeof celebTarget === 'number') {
      const target = clusters[celebTarget]
      if (target) setCluster(celebTarget, { ...target, people: [...(target.people ?? []), person] })
    } else {
      onChange({ ...group, people: [...people, person] })
    }
  }

  return (
    <div
      className={`rounded-lg border ${disabled ? 'border-dashed border-border/60 bg-bg-secondary/50' : 'border-border bg-bg-secondary'}`}
    >
      {/* 헤더 — 줄 전체가 세력 색 띠 + 어코디언 토글(클릭하면 펼치기/접기). 입력·버튼은 전파 차단 */}
      <div
        className="flex min-h-24 cursor-pointer items-stretch gap-2 rounded-t-lg p-3"
        style={{ backgroundColor: color }}
        onClick={() => setExpanded(v => !v)}
        title={expanded ? '클릭하면 접기' : '클릭하면 펼치기'}
      >
        {/* 미리보기 — 로고·로고아트·화보 전부 헤더 세로폭에 꽉 차게. 영상/이미지는 확장자 배지로 구분 */}
        <div className={`flex min-w-0 flex-1 items-stretch gap-1.5 overflow-hidden py-1 ${disabled ? 'opacity-40 saturate-50' : ''}`}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLogoOpen(true) }}
            {...logoDropProps}
            className={`group relative flex w-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded border bg-bg-card/30 p-0.5 transition-all ${logoDragOver ? 'ring-2 ring-accent' : 'hover:brightness-110 hover:shadow-sm'}`}
            style={{ borderColor: logoDragOver ? undefined : onColorDim }}
            title="클릭: 로고 선택 · 풀에서 끌어다 놓기: 연결"
          >
            {logoSrc ? (
              <FactionMediaThumb src={logoSrc} alt="" showExt fit="contain" className="h-full w-full" />
            ) : (
              <div style={{ color: onColorDim }} className="flex flex-col items-center">
                <ImageIcon size={18} className="opacity-70 group-hover:opacity-100" />
                <span className="mt-0.5 text-[9px] font-bold opacity-70 group-hover:opacity-100">로고</span>
              </div>
            )}
            {logoDragOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent/30 text-[10px] font-bold text-white">
                연결
              </div>
            )}
          </button>
          {covers.map((img, i) => (
            <FactionMediaThumb key={i} src={imageSrc(series, episodeName, img)!} alt="" showExt className="w-24 shrink-0 rounded border" style={{ borderColor: onColorDim }} />
          ))}
        </div>
        {/* 세력 명칭 — 한 칸(개행 입력). 첫 줄=명칭(식별자), 둘째 줄부터=설명(세력색). 국문/영문 두 행. 라벨은 입력칸 왼쪽에 한 줄 가로 배치 */}
        <div className={`flex shrink-0 flex-col gap-1 ${disabled ? 'opacity-40 saturate-50' : ''}`}>
          {editLang !== 'en' && (
            <label className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
              <span className="mt-1.5 w-20 shrink-0 whitespace-nowrap text-right text-xs" style={{ color: onColorDim }}>세력 명칭 -</span>
              <textarea
                rows={2}
                placeholder={'첫 줄=명칭, 둘째 줄부터=설명(세력색)'}
                value={group.name}
                onChange={e => onChange({ ...group, name: e.target.value })}
                className="w-[22rem] resize-y rounded-md border border-border bg-bg-card px-2 py-1 text-sm font-semibold focus:border-accent focus:outline-none"
              />
            </label>
          )}
          {editLang !== 'ko' && (
            <label className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
              <span className="mt-1.5 w-20 shrink-0 whitespace-nowrap text-right text-xs" style={{ color: onColorDim }}>세력 명칭 (영문) -</span>
              <textarea
                rows={2}
                placeholder={'첫 줄=명칭, 둘째 줄부터=설명'}
                value={group.nameEn ?? ''}
                onChange={e => onChange({ ...group, nameEn: e.target.value || undefined })}
                className="w-[22rem] resize-y rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
              />
            </label>
          )}
        </div>
        {disabled && (
          <span className="shrink-0 self-center rounded border border-danger-text/40 bg-danger/20 px-2 py-0.5 text-xs font-semibold text-danger-text">
            영상 제외
          </span>
        )}
        {group.longformOnly && !disabled && (
          <span className="shrink-0 self-center rounded border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
            롱폼 전용
          </span>
        )}
        {/* 편 배정 — 이 세력을 어느 쇼츠 편에 넣을지 (헤더에서 바로 변경) */}
        <select
          value={group.part ?? 0}
          onChange={e => { const v = Number(e.target.value); onChange({ ...group, part: v === 0 ? undefined : v }) }}
          onClick={e => e.stopPropagation()}
          className={`shrink-0 self-center rounded-md border border-border bg-bg-card px-1.5 py-1 text-xs focus:border-accent focus:outline-none ${disabled ? 'opacity-40 saturate-50' : ''}`}
          title="이 세력이 들어갈 쇼츠 편 (공통 = 모든 편)"
        >
          <option value={0}>공통</option>
          <option value={1}>1편</option>
          <option value={2}>2편</option>
        </select>
        <span className={`shrink-0 self-center text-xs ${disabled ? 'opacity-40 saturate-50' : ''}`} style={{ color: onColorDim }}>인물 {totalCount}</span>
        {/* 조작 버튼 2×2 — 상단: 눈/위로, 하단: 삭제/아래로 */}
        <div className="grid shrink-0 self-center grid-cols-2 gap-1">
          <button
            onClick={e => { e.stopPropagation(); toggleDisabled() }}
            className={`rounded-md border p-1.5 ${
              disabled
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-text-secondary hover:bg-bg-hover'
            }`}
            title={disabled ? '이 세력을 다시 영상에 포함' : '이 세력을 영상에서 제외 (데이터는 보존)'}
          >
            {disabled ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button onClick={e => { e.stopPropagation(); onMoveUp() }} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="위로">
            <ChevronUp size={15} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} className="rounded-md border border-border p-1.5 text-danger-text hover:bg-danger" title="세력 삭제">
            <Trash2 size={15} />
          </button>
          <button onClick={e => { e.stopPropagation(); onMoveDown() }} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="아래로">
            <ChevronDown size={15} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className={`space-y-3 border-t border-border p-3 ${disabled ? 'opacity-40 saturate-50' : ''}`}>
          {/* 움직임 효과(전환·지속·지지직·줌 속도·줌 목표점)는 상단 「효과 관리」 시트에서 전 대상 일괄 설정 */}
          {/* 세력 설정 패널: 필드명-필드값 정렬 구조 */}
          <div className="space-y-3 rounded-md border border-border bg-bg-card p-3">
            {disabled && (
              <div className="mb-2 border-b border-border/50 pb-2 text-xs font-semibold text-danger-text">
                이 세력은 영상에서 제외되어 있습니다. 아래 설정은 다시 포함했을 때 적용됩니다.
              </div>
            )}

            {/* 필드: 테마 색 */}
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right text-xs font-semibold text-text-dim">테마 색 -</span>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={color}
                  onChange={e => onChange({ ...group, color: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-bg-card"
                  title="테마 색"
                />
                <input
                  type="text"
                  value={color}
                  onChange={e => onChange({ ...group, color: e.target.value })}
                  className="w-24 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                />
              </div>
              <span className="ml-2 hidden text-[10px] text-text-dim sm:inline-block">
                세력 명칭은 상단 헤더 영역에서 직접 입력합니다. (첫 줄=명칭, 둘째 줄부터=설명)
              </span>
            </div>

            {/* 필드: 노출 모드 */}
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right text-xs font-semibold text-text-dim">노출 모드 -</span>
              <div className="flex flex-wrap items-center gap-4">
                <label
                  className="flex cursor-pointer items-center gap-1.5 text-sm text-text-secondary"
                  title="회사·팀이 아닌 개인들의 모음입니다. 켜면 팀 이름 카드와 단체사진(화보)을 건너뛰고 인물만 차례로 나옵니다. 예: '재야'. 회사 세력이면 꺼두세요."
                >
                  <input
                    type="checkbox"
                    checked={!!group.solo}
                    onChange={e => onChange({ ...group, solo: e.target.checked || undefined })}
                  />
                  무소속 개인군 <span className="text-[10px] text-text-dim">(팀 화보 생략)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={!!group.longformOnly}
                    onChange={e => onChange({ ...group, longformOnly: e.target.checked || undefined })}
                  />
                  롱폼 전용 <span className="text-[10px] text-text-dim">(쇼츠 제외)</span>
                </label>
              </div>
            </div>

            {/* 필드: 등장 음악 */}
            <div className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right text-xs font-semibold text-text-dim">등장 음악 -</span>
              <div className="flex flex-wrap items-center gap-4">
                <select
                  value={group.music ?? ''}
                  onChange={e => onChange({ ...group, music: e.target.value || undefined })}
                  className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
                >
                  <option value="">이전 곡 유지</option>
                  {(musicList ?? []).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {group.music && (
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-[10px] text-text-dim">음량</span>
                    <input
                      type="range" min={0} max={1} step={0.05}
                      value={group.musicVolume ?? 1}
                      onChange={e => { const v = Number(e.target.value); onChange({ ...group, musicVolume: v === 1 ? undefined : v }) }}
                      className="w-20 accent-accent"
                    />
                    <span className="w-8 text-right font-mono text-xs">{Math.round((group.musicVolume ?? 1) * 100)}%</span>
                  </label>
                )}
              </div>
            </div>

            {/* 필드: 화보 구조 */}
            {!group.solo && (
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-right text-xs font-semibold text-text-dim">화보 구조 -</span>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={split ? toSingle : toSplit}
                    title="한 팀의 단체사진(화보)을 한 장으로 합칠지, 인물군별 여러 장으로 나눌지 정합니다. 예: 구글을 '창업자'+'딥마인드' 두 그룹으로."
                    className="rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover"
                  >
                    {split ? '화보 합치기 (단일)' : '화보 나누기 (그룹)'}
                  </button>
                  <span className="text-[10px] text-text-dim">
                    {split ? '여러 장으로 나뉜 팀 화보를 하나로 합칩니다.' : '인물이 많을 경우 팀 화보를 여러 장(그룹)으로 분리합니다.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 단일 모드(무소속 개인군): 화보 없이 인물 목록만 */}
          {!split && group.solo && (
            <PersonList
              people={people}
              onPeopleChange={next => onChange({ ...group, people: next })}
              onAddCeleb={() => setCelebTarget(null)}
              series={series}
              episodeName={episodeName}
              groupIndex={groupIndex}
              solo
              editLang={editLang}
            />
          )}

          {/* 단일 모드(묶음 안 나눈 일반 세력): 묶음 하나짜리 아코디언으로 — 묶음 나눈 세력과 모양 통일 */}
          {!split && !group.solo && (
            <div className={`rounded-lg border transition-all duration-200 overflow-hidden ${singleExpanded ? 'border-border bg-bg-card shadow-sm' : 'border-border bg-bg-main'}`}>
              {/* 상단 헤더: 팀 화보 + 인물 수 (아코디언 토글) */}
              <div
                className={`flex cursor-pointer select-none items-center gap-3 p-2.5 hover:bg-bg-secondary ${singleExpanded ? 'border-b border-border/50 bg-bg-main/40' : ''}`}
                onClick={() => setSingleExpanded(v => !v)}
                title={singleExpanded ? '클릭하면 접기' : '클릭하면 펼치기'}
              >
                {/* 아코디언 방향 아이콘 */}
                <div className="flex shrink-0 items-center justify-center px-1 text-text-dim">
                  <ChevronDown size={20} className={`transition-transform duration-200 ${singleExpanded ? '' : '-rotate-90'}`} />
                </div>
                <CoverPickerButton
                  value={group.image}
                  onChange={next => onChange({ ...group, image: next })}
                  crop={group.imageCrop}
                  onCropChange={c => onChange({ ...group, imageCrop: c })}
                  series={series}
                  episodeName={episodeName}
                  className="h-20 w-36 shrink-0"
                />
                <div className="flex w-16 shrink-0 flex-col gap-0.5">
                  <span className="text-sm font-bold text-text-primary">팀 화보</span>
                  <span className="text-[10px] text-text-dim">인물 {people.length}</span>
                </div>
                {/* 그룹명 — 분할 모드의 각 그룹 행과 같은 위치·위계. 비우면 세력 명칭 둘째 줄을 그룹샷 카드에 그대로 쓴다 */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {editLang !== 'en' && (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <span className="w-12 shrink-0 text-right text-xs text-text-dim">그룹명 -</span>
                      <textarea
                        rows={2}
                        placeholder={'그룹명 (비우면 세력 명칭 둘째 줄)\n첫 줄=명칭, 둘째 줄부터=설명(세력색)'}
                        value={group.label ?? ''}
                        onChange={e => onChange({ ...group, label: e.target.value || undefined })}
                        className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-2 py-1 text-sm font-semibold focus:border-accent focus:outline-none"
                      />
                    </div>
                  )}
                  {editLang !== 'ko' && (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <span className="w-12 shrink-0 text-right text-xs text-text-dim">영문 -</span>
                      <textarea
                        rows={2}
                        placeholder={'EN 그룹명 (영문)\n첫 줄=명칭, 둘째 줄부터=설명'}
                        value={group.labelEn ?? ''}
                        onChange={e => onChange({ ...group, labelEn: e.target.value || undefined })}
                        className="min-w-0 flex-1 resize-y rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {singleExpanded && (
                <div className="space-y-3 border-t border-border/50 p-3">
                  <PersonList
                    people={people}
                    onPeopleChange={next => onChange({ ...group, people: next })}
                    onAddCeleb={() => setCelebTarget(null)}
                    series={series}
                    episodeName={episodeName}
                    groupIndex={groupIndex}
                    solo={false}
                    editLang={editLang}
                  />
                </div>
              )}
            </div>
          )}

          {/* 분할 모드: 묶음별 화보 + 인물 목록 */}
          {split && (
            <div className="space-y-3">
              {clusters.map((c, ci) => {
                const isClusterExpanded = expandedClusters[ci] ?? true;
                return (
                <div key={ci} className={`rounded-lg border transition-all duration-200 overflow-hidden ${isClusterExpanded ? 'border-border bg-bg-card shadow-sm' : 'border-border bg-bg-main'}`}>
                  {/* 상단 헤더: 제목 및 순서/삭제 컨트롤 (아코디언 토글) */}
                  <div 
                    className={`flex cursor-pointer select-none items-center gap-3 p-2.5 transition-none hover:bg-bg-secondary ${isClusterExpanded ? 'border-b border-border/50 bg-bg-main/40' : ''}`}
                    onClick={() => setExpandedClusters(prev => ({ ...prev, [ci]: !isClusterExpanded }))}
                    title={isClusterExpanded ? '클릭하면 접기' : '클릭하면 펼치기'}
                  >
                    {/* 아코디언 방향 아이콘 */}
                    <div className="flex shrink-0 items-center justify-center text-text-dim px-1">
                      <ChevronDown size={20} className={`transition-transform duration-200 ${isClusterExpanded ? '' : '-rotate-90'}`} />
                    </div>
                    <CoverPickerButton
                      value={c.image}
                      onChange={next => setCluster(ci, { ...c, image: next })}
                      crop={c.imageCrop}
                      onCropChange={cr => setCluster(ci, { ...c, imageCrop: cr })}
                      series={series}
                      episodeName={episodeName}
                      className="h-20 w-36 shrink-0"
                    />
                    <div className="flex w-16 shrink-0 flex-col gap-0.5">
                      <span className="text-sm font-bold text-text-primary">그룹 {ci + 1}</span>
                      <span className="text-[10px] text-text-dim">인물 {c.people?.length ?? 0}{c.longformOnly ? '·롱폼' : ''}</span>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {editLang !== 'en' && (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <span className="w-12 shrink-0 text-right text-xs text-text-dim">그룹명 -</span>
                          <textarea
                            rows={2}
                            placeholder={'그룹명 (예: 창업자)\n첫 줄=명칭, 둘째 줄부터=설명(세력색)'}
                            value={c.label ?? ''}
                            onChange={e => setCluster(ci, { ...c, label: e.target.value || undefined })}
                            className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-2 py-1 text-sm font-semibold focus:border-accent focus:outline-none"
                          />
                        </div>
                      )}
                      {editLang !== 'ko' && (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <span className="w-12 shrink-0 text-right text-xs text-text-dim">영문 -</span>
                          <textarea
                            rows={2}
                            placeholder={'EN 그룹명 (영문)\n첫 줄=명칭, 둘째 줄부터=설명'}
                            value={c.labelEn ?? ''}
                            onChange={e => setCluster(ci, { ...c, labelEn: e.target.value || undefined })}
                            className="min-w-0 flex-1 resize-y rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1 self-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => moveCluster(ci, -1)} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="위로">
                        <ChevronUp size={15} />
                      </button>
                      <button onClick={() => moveCluster(ci, 1)} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="아래로">
                        <ChevronDown size={15} />
                      </button>
                      <button onClick={() => deleteCluster(ci)} className="rounded-md border border-border p-1.5 text-danger-text hover:bg-danger" title="그룹 삭제">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {isClusterExpanded && (
                    <div className="space-y-3 p-3 pt-0 border-t border-border/50">


                      <label className="flex items-center gap-1.5 text-sm text-text-secondary pt-1">
                        <input
                          type="checkbox"
                          checked={!!c.longformOnly}
                          onChange={e => setCluster(ci, { ...c, longformOnly: e.target.checked || undefined })}
                        />
                        이 그룹은 롱폼에만 넣기 <span className="text-xs text-text-dim">(세로 쇼츠 제외, 가로 롱폼만)</span>
                      </label>
                      {/* 그룹샷·인물의 움직임 효과는 상단 「효과 관리」 시트에서 설정(줌 목표점 클릭 포함) */}
                      <PersonList
                        people={c.people ?? []}
                        onPeopleChange={next => setCluster(ci, { ...c, people: next })}
                        onAddCeleb={() => setCelebTarget(ci)}
                        series={series}
                        episodeName={episodeName}
                        groupIndex={groupIndex}
                        clusterIndex={ci}
                        solo={false}
                        editLang={editLang}
                      />
                    </div>
                  )}
                </div>
              )})}
              <button
                onClick={addCluster}
                className="flex items-center gap-1.5 rounded-md border border-dashed border-border bg-bg-card px-3 py-1.5 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover"
              >
                <Plus size={15} /> 그룹 추가
              </button>
            </div>
          )}
        </div>
      )}

      {logoOpen && (
        <FactionImagePicker
          value={group.titleArt}
          onChange={next => onChange({ ...group, titleArt: next })}
          crop={group.titleArtCrop}
          onCropChange={c => onChange({ ...group, titleArtCrop: c })}
          cropFit="contain"
          series={series}
          episodeName={episodeName}
          onClose={() => setLogoOpen(false)}
        />
      )}

      <FactionCelebSearchModal
        open={celebTarget !== undefined}
        onClose={() => setCelebTarget(undefined)}
        onSelect={addCeleb}
      />
    </div>
  )
}
