'use client'

import { useState } from 'react'
import type { FactionGroup, FactionPerson, FactionCluster } from '@/lib/faction-types'
import { buildClusterMoveRenames, reorderFactionVoice, factionVoiceFile } from '@/lib/faction-voice'
import { imageSrc } from '../../shared/timing'
import { ChevronUp, ChevronDown, Trash2, ImageIcon, Plus, Eye, EyeOff } from '@/components/icons'
import { FactionPersonRow, MiniAudioPlayer } from './FactionPersonRow/FactionPersonRow'
import { useFactionVoice } from '../../shared/FactionVoiceContext'
import { ImagePicker, MediaThumb, useImageDrop, FACTION_IMAGE_DND } from '@/components/media'
import { FactionCelebSearchModal, type CelebResult } from './FactionCelebSearchModal'
import { PersonList } from './PersonList/PersonList'
import { CoverPickerButton } from './CoverPickerButton/CoverPickerButton'

import type { EditLang } from '@/components/editor'

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
  musicList: string[]
  editLang: EditLang
  onMoveCrossGroup?: (clusterIndex: number, personIndex: number) => void
  /** 셀럽 DB 등록 배지용 대조 결과 — 에피소드 레벨에서 인물 전체 slug를 배치 조회한 것을 그대로 내려받는다 */
  celebExisting: Set<string>
  celebLoaded: boolean
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
  groupIndex, group, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName, editLang, onMoveCrossGroup,
  celebExisting, celebLoaded,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [logoOpen, setLogoOpen] = useState(false)
  const [logoImgOpen, setLogoImgOpen] = useState(false)
  const [expandedClusters, setExpandedClusters] = useState<Record<number, boolean>>({})
  // 단일 모드(그룹 1개짜리 세력)도 그룹 하나짜리 아코디언으로 보여준다 — 나눈 세력과 모양 통일. 기본 열림.
  const [singleExpanded, setSingleExpanded] = useState(true)
  // 셀럽 검색 대상 그룹 인덱스 (undefined=닫힘). 단일 모드는 0
  const [celebTarget, setCelebTarget] = useState<number | undefined>(undefined)
  // 이미지 풀에서 끌어온 파일을 각 로고 칸에 놓으면 연결 — 영상 칸(logoVid)·이미지 칸(logoImg) 별개
  const { dragOver: logoDragOver, dropProps: logoDropProps } = useImageDrop(FACTION_IMAGE_DND, path => onChange({ ...group, logoVid: path }))
  const { dragOver: logoImgDragOver, dropProps: logoImgDropProps } = useImageDrop(FACTION_IMAGE_DND, path => onChange({ ...group, logoImg: path }))
  const voiceCtx = useFactionVoice()

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
  // 로고 두 칸 — 영상(타이틀 카드 우선)·이미지(타이틀 카드 폴백 + 카드뉴스). 썸네일은 각자 제 것만 보여준다.
  const logoVidSrc = imageSrc(series, episodeName, group.logoVid)
  const logoImgSrc = imageSrc(series, episodeName, group.logoImg)
  const clusters = group.clusters ?? []
  // "그룹 나누기" 판정 — 그룹(clusters)이 2개 이상일 때만 분할 UI. 1개짜리는 단순 UI(내부적으로 clusters[0] 편집)
  const split = clusters.length > 1
  // 단일 모드에서 편집하는 그룹 — 항상 clusters[0]
  const c0: FactionCluster = clusters[0] ?? { people: [] }
  const totalCount = clusters.reduce((s, c) => s + (c.people?.length ?? 0), 0)
  // 접힌 상태에서 보여줄 팀 비주얼 — 그룹샷(화보)들만. 로고(logoVid·logoImg)는 logoSrc로 따로 표시한다.
  // 클릭하면 해당 그룹 헤더로 이동해야 하므로 그룹 순번을 함께 든다
  const covers = clusters
    .map((c, ci) => ({ image: c.image, ci }))
    .filter(c => c.image) as { image: string; ci: number }[]
  // 공간이 남을 때 그룹샷 뒤에 이어서 보여줄 인물 개인샷(아바타). 최대 20명 — 클릭하면 그 인물 행으로 이동해야 하므로 소속 그룹·순번을 함께 든다
  const avatars = clusters
    .flatMap((c, ci) => (c.people ?? []).map((p, pi) => ({ image: p.image, name: p.name, ci, pi })))
    .filter(a => a.image)
    .slice(0, 20) as { image: string; name: string; ci: number; pi: number }[]

  // 헤더 썸네일 클릭 공통 — 세력 카드와 해당 그룹을 펼치고, 펼침이 DOM에 반영된 다음 프레임에
  // 대상 요소를 화면 중앙으로 스크롤(접혀 있던 경우 그제야 그려진다)
  const jumpTo = (ci: number, elementId: string) => {
    setExpanded(true)
    if (split) setExpandedClusters(prev => ({ ...prev, [ci]: true }))
    else setSingleExpanded(true)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }),
    )
  }
  // 헤더의 개인샷 클릭 — 그 인물 행으로
  const jumpToPerson = (ci: number, pi: number) => {
    const id = `person-${groupIndex}-${ci}-${pi}`
    jumpTo(ci, id)
    // 약간의 딜레이 후(DOM 렌더링 이후) 커스텀 이벤트를 발생시켜 아코디언도 열도록 함
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent('faction-person-open', { detail: { id } }))
      })
    })
  }
  // 헤더의 그룹샷 클릭 — 그 그룹 헤더로
  const jumpToCluster = (ci: number) => jumpTo(ci, `cluster-header-${groupIndex}-${ci}`)


  // region 그룹 조작
  const setClusters = (next: FactionCluster[]) => onChange({ ...group, clusters: next })
  const setCluster = (i: number, c: FactionCluster) =>
    setClusters(clusters.map((x, idx) => (idx === i ? c : x)))
  // 단일 모드용 — clusters[0] 갱신 (혹시 그룹이 비어 있으면 새로 만든다)
  const setC0 = (c: FactionCluster) =>
    setClusters(clusters.length ? clusters.map((x, idx) => (idx === 0 ? c : x)) : [c])
  const addCluster = () => setClusters([...clusters, { label: '', people: [] }])
  const deleteCluster = (i: number) => {
    if (clusters.length <= 1) return // 그룹은 최소 1개 — 마지막 그룹은 지울 수 없다
    if (!confirm('이 그룹을 삭제하시겠습니까? (그룹 내 인물도 함께 삭제됩니다)')) return
    setClusters(clusters.filter((_, idx) => idx !== i))
  }

  // 모드 전환 (단일 ↔ 분할)
  // 나누기 시작: 빈 그룹을 하나 더 붙인다(2개가 되면 분할 UI로 전환)
  const toSplit = () => addCluster()
  // 나누기 해제(합치기): 모든 그룹 인물을 순서대로 clusters[0] 하나로 합친다
  const toSingle = () => {
    const merged = clusters.flatMap(c => c.people ?? [])
    setClusters([{ ...c0, people: merged }])
  }
  // 묶음 순서 변경 — 음원은 묶음 위치(C번호) 기반이라, 인물 이동과 똑같이 wav를 먼저 재배치하고
  // 성공하면 묶음 배열을 바꾼다(quote+epithet·발화시각 키 모두 reorder API가 함께 옮긴다).
  const moveCluster = async (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= clusters.length) return
    const renames = [
      ...buildClusterMoveRenames(group, groupIndex, i, j),
      ...buildClusterMoveRenames(group, groupIndex, j, i),
    ]
    const { ok, error } = await reorderFactionVoice(series, episodeName, renames)
    if (!ok) {
      console.error('[FactionGroupEditor] 묶음 음원 재배치 실패:', error)
      alert('그룹 순서를 바꾸지 못했습니다. 음성 파일 이동에 실패했습니다.')
      return
    }
    const next = [...clusters]
    ;[next[i], next[j]] = [next[j], next[i]]
    setClusters(next)
    voiceCtx?.reload?.()
  }
  // endregion

  // 셀럽 선택 반영 — 대상 그룹에 인물 추가
  const addCeleb = (c: CelebResult) => {
    if (celebTarget === undefined) return
    const target = clusters[celebTarget]
    if (target) setCluster(celebTarget, { ...target, people: [...(target.people ?? []), celebToPerson(c)] })
  }

  return (
    <div
      className={`rounded-lg border ${disabled ? 'border-dashed border-border/60 bg-bg-secondary/50' : 'border-border bg-bg-secondary'}`}
    >
      {/* 헤더 — 줄 전체가 세력 색 띠 + 어코디언 토글(클릭하면 펼치기/접기). 입력·버튼은 전파 차단 */}
      <div
        className="flex min-h-24 cursor-pointer select-none items-stretch gap-2 rounded-t-lg p-3 hover:brightness-[1.15] hover:shadow-md transition-all z-10 relative"
        style={{ backgroundColor: color }}
        onClick={() => setExpanded(v => !v)}
        title={expanded ? '클릭하면 접기' : '클릭하면 펼치기'}
      >
        {/* 미리보기 — 로고·로고아트·화보 전부 헤더 세로폭에 꽉 차게. 넘치면 가로 스크롤(바는 숨김) */}
        <div className={`flex min-w-0 flex-1 items-stretch gap-1.5 overflow-x-auto scrollbar-hide py-1 ${disabled ? 'opacity-40 saturate-50' : ''}`}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLogoOpen(true) }}
            {...logoDropProps}
            className={`group relative flex w-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded border bg-bg-card/30 p-0.5 transition-all ${logoDragOver ? 'ring-2 ring-accent' : 'hover:brightness-110 hover:shadow-sm'}`}
            style={{ borderColor: logoDragOver ? undefined : onColorDim }}
            title="클릭: 로고 영상 선택(영상 타이틀 카드 배경, 우선) · 풀에서 끌어다 놓기: 연결"
          >
            {logoVidSrc ? (
              <MediaThumb src={logoVidSrc} alt="" showExt fit="contain" className="h-full w-full" />
            ) : (
              <div style={{ color: onColorDim }} className="flex flex-col items-center">
                <ImageIcon size={18} className="opacity-70 group-hover:opacity-100" />
                <span className="mt-0.5 text-[9px] font-bold opacity-70 group-hover:opacity-100">로고 영상</span>
              </div>
            )}
            {logoDragOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent/30 text-[10px] font-bold text-white">
                연결
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLogoImgOpen(true) }}
            {...logoImgDropProps}
            className={`group relative flex w-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded border bg-bg-card/30 p-0.5 transition-all ${logoImgDragOver ? 'ring-2 ring-accent' : 'hover:brightness-110 hover:shadow-sm'}`}
            style={{ borderColor: logoImgDragOver ? undefined : onColorDim }}
            title="클릭: 로고 이미지 선택(카드뉴스 표지·소속 배지, 로고 영상 없으면 타이틀 카드도) · 풀에서 끌어다 놓기: 연결"
          >
            {logoImgSrc ? (
              <MediaThumb src={logoImgSrc} alt="" showExt fit="contain" className="h-full w-full" />
            ) : (
              <div style={{ color: onColorDim }} className="flex flex-col items-center">
                <ImageIcon size={18} className="opacity-70 group-hover:opacity-100" />
                <span className="mt-0.5 text-[9px] font-bold opacity-70 group-hover:opacity-100">로고 이미지</span>
              </div>
            )}
            {logoImgDragOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent/30 text-[10px] font-bold text-white">
                연결
              </div>
            )}
          </button>
          {covers.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={e => { e.stopPropagation(); jumpToCluster(c.ci) }}
              className="shrink-0 cursor-pointer rounded transition-transform hover:scale-105 hover:ring-2 hover:ring-accent"
              title="그룹 화보 — 클릭하면 그룹 헤더로 이동"
            >
              <MediaThumb src={imageSrc(series, episodeName, c.image)!} alt="" showExt className="h-full w-24 rounded border" style={{ borderColor: onColorDim }} />
            </button>
          ))}
          {avatars.map((a, i) => {
            const voiceFile = factionVoiceFile(groupIndex, a.pi, a.ci)
            const meta = voiceCtx?.byFile.get(voiceFile)
            const person = clusters[a.ci]?.people?.[a.pi]
            const rate = person ? (person as any).quotePlaybackRate : undefined
            
            return (
              <div key={`avatar-${i}`} className="relative h-full shrink-0 group">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); jumpToPerson(a.ci, a.pi) }}
                  className="block h-full w-14 shrink-0 cursor-pointer rounded transition-transform hover:scale-105 hover:ring-2 hover:ring-accent"
                  title={`${a.name} — 클릭하면 인물 행으로 이동`}
                >
                  <MediaThumb src={imageSrc(series, episodeName, a.image)!} alt={a.name} className="h-full w-full rounded border bg-bg-main object-cover" style={{ borderColor: onColorDim }} />
                </button>
                {meta && (
                  <div className="absolute bottom-0.5 right-0.5 z-10 scale-75 origin-bottom-right pointer-events-auto opacity-80 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <div className="rounded-full bg-bg-main/90 backdrop-blur-sm shadow-sm border border-border overflow-hidden">
                      <MiniAudioPlayer url={`/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/${encodeURIComponent(voiceFile)}?t=${meta.size}`} rate={rate as number | undefined} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {/* 세력 명칭 — 한 칸(개행 입력). 첫 줄=명칭(식별자), 둘째 줄부터=설명(세력색). 국문/영문 두 행. 라벨은 입력칸 왼쪽에 한 줄 가로 배치 */}
        <div className={`flex shrink-0 flex-col gap-1 ${disabled ? 'opacity-40 saturate-50' : ''}`}>
          {editLang !== 'en' && (
            <label className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
              <textarea
                rows={2}
                placeholder={'첫 줄=명칭, 둘째 줄부터=설명(세력색)'}
                value={group.name}
                onChange={e => onChange({ ...group, name: e.target.value })}
                className="w-[18rem] resize-y rounded-md border border-border bg-bg-card px-2 py-1 text-sm font-semibold focus:border-accent focus:outline-none"
              />
            </label>
          )}
          {editLang !== 'ko' && (
            <label className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
              <textarea
                rows={2}
                placeholder={'첫 줄=명칭, 둘째 줄부터=설명'}
                value={group.nameEn ?? ''}
                onChange={e => onChange({ ...group, nameEn: e.target.value || undefined })}
                className="w-[18rem] resize-y rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
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
        {/* 편 배정(part)은 편성 탭에서 관리한다 — 정보 탭 세력 카드에서는 편을 다루지 않는다 */}
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

            {/* 세력 배경음악(롱폼용·쇼츠용)은 편성 탭에서 지정한다 — 곡 전환은 영상 흐름(편성)의 문제라 롱폼 편성/쇼츠 편성 각 맥락에 둔다. */}

            {/* 로고 영상·로고 이미지는 헤더의 두 칸에서 편집한다 — 영상 타이틀 카드=로고 영상 우선, 카드뉴스=로고 이미지 */}

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

          {/* 단일 모드(무소속 개인군): 화보 없이 인물 목록만 — clusters[0] 편집 */}
          {!split && group.solo && (
            <PersonList
              people={c0.people ?? []}
              onPeopleChange={next => setC0({ ...c0, people: next })}
              onAddCeleb={() => setCelebTarget(0)}
              series={series}
              episodeName={episodeName}
              groupIndex={groupIndex}
              clusterIndex={0}
              editLang={editLang}
              onMoveCrossGroup={onMoveCrossGroup ? (pi) => onMoveCrossGroup(0, pi) : undefined}
              celebExisting={celebExisting}
              celebLoaded={celebLoaded}
            />
          )}

          {/* 단일 모드(그룹 안 나눈 일반 세력): 그룹 하나짜리 아코디언으로 — 나눈 세력과 모양 통일. 대상은 clusters[0] */}
          {!split && !group.solo && (
            <div className={`rounded-lg border transition-all duration-200 overflow-hidden ${singleExpanded ? 'border-border bg-bg-card shadow-sm' : 'border-border bg-bg-main'}`}>
              {/* 상단 헤더: 팀 화보 + 인물 수 (아코디언 토글) */}
              <div
                id={`cluster-header-${groupIndex}-0`}
                className={`flex cursor-pointer select-none items-center gap-3 p-2.5 hover:bg-bg-secondary hover:shadow-inner transition-colors duration-200 z-10 relative ${singleExpanded ? 'border-b border-border/50 bg-bg-main/40' : ''}`}
                onClick={() => setSingleExpanded(v => !v)}
                title={singleExpanded ? '클릭하면 접기' : '클릭하면 펼치기'}
              >
                {/* 아코디언 방향 아이콘 */}
                <div className="flex shrink-0 items-center justify-center px-1 text-text-dim">
                  <ChevronDown size={20} className={`transition-transform duration-200 ${singleExpanded ? '' : '-rotate-90'}`} />
                </div>
                <CoverPickerButton
                  value={c0.image}
                  onChange={next => setC0({ ...c0, image: next })}
                  crop={c0.imageCrop}
                  onCropChange={c => setC0({ ...c0, imageCrop: c })}
                  series={series}
                  episodeName={episodeName}
                  className="h-20 w-36 shrink-0"
                />
                <div className="flex w-16 shrink-0 flex-col gap-0.5">
                  <span className="text-sm font-bold text-text-primary">팀 화보</span>
                  <span className="text-[10px] text-text-dim">인물 {c0.people?.length ?? 0}</span>
                </div>
                {/* 그룹명 — 분할 모드의 각 그룹 행과 같은 위치·위계. 비우면 세력 명칭 둘째 줄을 그룹샷 카드에 그대로 쓴다 */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {editLang !== 'en' && (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <span className="w-12 shrink-0 text-right text-xs text-text-dim">그룹명 -</span>
                      <textarea
                        rows={2}
                        placeholder={'그룹명 (비우면 세력 명칭 둘째 줄)\n첫 줄=명칭, 둘째 줄부터=설명(세력색)'}
                        value={c0.label ?? ''}
                        onChange={e => setC0({ ...c0, label: e.target.value || undefined })}
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
                        value={c0.labelEn ?? ''}
                        onChange={e => setC0({ ...c0, labelEn: e.target.value || undefined })}
                        className="min-w-0 flex-1 resize-y rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {singleExpanded && (
                <div className="space-y-3 border-t border-border/50 p-3">
                  <PersonList
                    people={c0.people ?? []}
                    onPeopleChange={next => setC0({ ...c0, people: next })}
                    onAddCeleb={() => setCelebTarget(0)}
                    series={series}
                    episodeName={episodeName}
                    groupIndex={groupIndex}
                    clusterIndex={0}
                    editLang={editLang}
                    onMoveCrossGroup={onMoveCrossGroup ? (pi) => onMoveCrossGroup(0, pi) : undefined}
                    celebExisting={celebExisting}
                    celebLoaded={celebLoaded}
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
                    id={`cluster-header-${groupIndex}-${ci}`}
                    className={`flex cursor-pointer select-none items-center gap-3 p-2.5 hover:bg-bg-secondary hover:shadow-inner transition-colors duration-200 z-10 relative ${isClusterExpanded ? 'border-b border-border/50 bg-bg-main/40' : ''} ${c.disabled ? 'opacity-40 saturate-50' : ''}`}
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
                      {c.disabled && <span className="rounded bg-danger/20 px-1 py-0.5 text-center text-[9px] font-semibold text-danger-text w-fit">영상 제외</span>}
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
                      <button onClick={() => setCluster(ci, { ...c, disabled: c.disabled ? undefined : true })} className={`rounded-md border p-1.5 ${c.disabled ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`} title={c.disabled ? '이 그룹을 다시 영상에 포함' : '이 그룹을 영상에서 제외'}>
                        {c.disabled ? <Eye size={15} /> : <EyeOff size={15} />}
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
                        editLang={editLang}
                        onMoveCrossGroup={onMoveCrossGroup ? (pi) => onMoveCrossGroup(ci, pi) : undefined}
                        celebExisting={celebExisting}
                        celebLoaded={celebLoaded}
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
        <ImagePicker
          value={group.logoVid}
          onChange={next => onChange({ ...group, logoVid: next })}
          crop={group.logoCrop}
          onCropChange={c => onChange({ ...group, logoCrop: c })}
          cropFit="contain"
          series={series}
          episodeName={episodeName}
          onClose={() => setLogoOpen(false)}
        />
      )}
      {logoImgOpen && (
        <ImagePicker
          value={group.logoImg}
          onChange={next => onChange({ ...group, logoImg: next })}
          crop={group.logoCrop}
          onCropChange={c => onChange({ ...group, logoCrop: c })}
          cropFit="contain"
          series={series}
          episodeName={episodeName}
          onClose={() => setLogoImgOpen(false)}
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
