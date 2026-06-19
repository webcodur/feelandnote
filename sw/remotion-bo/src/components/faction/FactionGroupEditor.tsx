'use client'

import { useState } from 'react'
import type { FactionGroup, FactionPerson, FactionCluster } from '@/lib/faction-types'
import { imageSrc } from './timing'
import { ChevronUp, ChevronDown, Trash2, Search, UserPlus, ImageIcon, Plus, Eye, EyeOff } from './icons'
import { FactionPersonRow } from './FactionPersonRow'
import { FactionImagePicker } from './FactionImagePicker'
import { FactionCelebSearchModal, type CelebResult } from './FactionCelebSearchModal'

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
  }
}

// region 화보(그룹 이미지) 픽커 버튼
function CoverPickerButton({
  value, onChange, series, episodeName,
}: {
  value?: string
  onChange: (next: string | undefined) => void
  series: string
  episodeName: string
}) {
  const [open, setOpen] = useState(false)
  const src = imageSrc(series, episodeName, value)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative shrink-0 overflow-hidden rounded-md border border-border bg-bg-card hover:border-accent"
        title="화보 이미지 선택"
      >
        {src ? (
          <img src={src} alt="" className="h-28 w-48 object-cover" />
        ) : (
          <span className="flex h-28 w-48 flex-col items-center justify-center gap-1 text-sm text-text-secondary">
            <ImageIcon size={24} />
            화보 선택
          </span>
        )}
        <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-xs font-semibold text-white">
          화보
        </span>
      </button>
      {open && (
        <FactionImagePicker
          value={value}
          onChange={onChange}
          series={series}
          episodeName={episodeName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
// endregion

// region 인물 목록 (단일·묶음 공용)
function PersonList({
  people, onPeopleChange, onAddCeleb, series, episodeName, groupIndex, clusterIndex, solo,
}: {
  people: FactionPerson[]
  onPeopleChange: (next: FactionPerson[]) => void
  onAddCeleb: () => void
  series: string
  episodeName: string
  /** 세력 인덱스 (0-based) — 음성 파일명 계산용 */
  groupIndex: number
  /** 묶음 인덱스 (분할 세력) — 단일 모드면 미지정 */
  clusterIndex?: number
  /** 무소속 개인군 여부 — 파일명에 C 부착 여부 결정 */
  solo: boolean
}) {
  const setPerson = (i: number, p: FactionPerson) =>
    onPeopleChange(people.map((x, idx) => (idx === i ? p : x)))
  const deletePerson = (i: number) => onPeopleChange(people.filter((_, idx) => idx !== i))
  const movePerson = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= people.length) return
    const next = [...people]
    ;[next[i], next[j]] = [next[j], next[i]]
    onPeopleChange(next)
  }
  const addBlank = () => onPeopleChange([...people, { name: '', role: '', org: '' }])

  return (
    <div className="space-y-2">
      {people.map((p, i) => (
        <FactionPersonRow
          key={i}
          person={p}
          onChange={next => setPerson(i, next)}
          onDelete={() => deletePerson(i)}
          onMoveUp={() => movePerson(i, -1)}
          onMoveDown={() => movePerson(i, 1)}
          series={series}
          episodeName={episodeName}
          groupIndex={groupIndex}
          personIndex={i}
          clusterIndex={clusterIndex}
          solo={solo}
        />
      ))}
      {people.length === 0 && <p className="text-xs text-text-dim">아직 인물이 없습니다.</p>}
      <div className="flex gap-2">
        <button
          onClick={onAddCeleb}
          className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
        >
          <Search size={15} /> 셀럽에서 추가
        </button>
        <button
          onClick={addBlank}
          className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
        >
          <UserPlus size={15} /> 직접 추가
        </button>
      </div>
    </div>
  )
}
// endregion

export function FactionGroupEditor({ groupIndex, group, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName, musicList }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [logoOpen, setLogoOpen] = useState(false)
  // 셀럽 검색 대상: null=단일 people, 숫자=해당 묶음 인덱스
  const [celebTarget, setCelebTarget] = useState<number | null | undefined>(undefined)

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
  const logoSrc = imageSrc(series, episodeName, group.logo)
  const split = !!group.clusters?.length
  const clusters = group.clusters ?? []
  const people = group.people ?? []
  const totalCount = split
    ? clusters.reduce((s, c) => s + (c.people?.length ?? 0), 0)
    : people.length
  // 접힌 상태에서 보여줄 팀 비주얼 — 로고샷(titleArt)이 있으면 먼저, 그 뒤 그룹샷(화보).
  // 분할 세력은 묶음별 화보, 단일은 세력 화보.
  const covers = [group.titleArt, ...(split ? clusters.map(c => c.image) : [group.image])].filter(Boolean) as string[]

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
    if (!confirm('이 화보 묶음을 삭제하시겠습니까? (묶음 내 인물도 함께 삭제됩니다)')) return
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
      className="rounded-lg border border-border bg-bg-secondary"
      style={disabled ? { opacity: 0.5, filter: 'saturate(0.4)' } : undefined}
    >
      {/* 헤더 — 줄 전체가 세력 색 띠 + 어코디언 토글(클릭하면 펼치기/접기). 입력·버튼은 전파 차단 */}
      <div
        className="flex cursor-pointer items-center gap-2 rounded-t-lg p-3"
        style={{ backgroundColor: color }}
        onClick={() => setExpanded(v => !v)}
        title={expanded ? '클릭하면 접기' : '클릭하면 펼치기'}
      >
        {/* 세력 이름 + 세력 이름(영문) — 한 줄 나란히 */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <label className="w-20 shrink-0 text-xs" style={{ color: onColorDim }}>세력 이름 -</label>
          <input
            type="text"
            placeholder="세력명"
            value={group.name}
            onChange={e => onChange({ ...group, name: e.target.value })}
            onClick={e => e.stopPropagation()}
            className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm font-semibold focus:border-accent focus:outline-none"
          />
          <label className="w-12 shrink-0 text-xs" style={{ color: onColorDim }}>(영문) -</label>
          <input
            type="text"
            placeholder="EN 세력명 (영문)"
            value={group.nameEn ?? ''}
            onChange={e => onChange({ ...group, nameEn: e.target.value })}
            onClick={e => e.stopPropagation()}
            className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
          />
        </div>
        {disabled && (
          <span className="shrink-0 rounded border border-danger-text/40 bg-danger/20 px-2 py-0.5 text-xs font-semibold text-danger-text">
            영상 제외
          </span>
        )}
        {group.longformOnly && !disabled && (
          <span className="shrink-0 rounded border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
            롱폼 전용
          </span>
        )}
        <span className="shrink-0 text-xs" style={{ color: onColorDim }}>인물 {totalCount}</span>
        <button
          onClick={e => { e.stopPropagation(); toggleDisabled() }}
          className={`shrink-0 rounded-md border p-1.5 ${
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
        <button onClick={e => { e.stopPropagation(); onMoveDown() }} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="아래로">
          <ChevronDown size={15} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="rounded-md border border-border p-1.5 text-danger-text hover:bg-danger" title="세력 삭제">
          <Trash2 size={15} />
        </button>
      </div>

      {!expanded && (
        <div className="flex items-center gap-2 border-t border-border px-3 py-2">
          {covers.length ? (
            covers.map((img, i) => (
              <img key={i} src={imageSrc(series, episodeName, img)} alt="" className="h-16 w-28 shrink-0 rounded object-cover" style={{ border: `1px solid ${color}` }} />
            ))
          ) : (
            <span className="text-xs text-text-dim">화보 이미지 없음</span>
          )}
        </div>
      )}

      {expanded && (
        <div className="space-y-3 border-t border-border p-3">
          {/* 세력별 전환효과 — 이 세력만 다른 카메라 워크. 미지정이면 에피소드 전역 설정을 따른다 */}
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-text-dim">전환효과 -</label>
            <select
              value={group.transition ?? ''}
              onChange={e => onChange({ ...group, transition: (e.target.value || undefined) as FactionGroup['transition'] })}
              className="rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
            >
              <option value="">에피소드 설정 따름</option>
              <option value="auto">자동 (인물마다 번갈아)</option>
              <option value="zoomout">줌 아웃</option>
              <option value="zoomin">줌 인</option>
              <option value="kenburns">켄번스 (확대+이동)</option>
              <option value="slide">슬라이드</option>
            </select>
            <span className="text-xs text-text-dim">이 세력만 다른 카메라 워크</span>
          </div>
          {/* 한 줄 설명 + 색 + 로고 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 슬로건 + 슬로건(영문) — 한 줄 나란히 */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <label className="w-20 shrink-0 text-xs text-text-dim">슬로건 -</label>
              <input
                type="text"
                placeholder="한 줄 설명"
                value={group.tagline ?? ''}
                onChange={e => onChange({ ...group, tagline: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
              />
              <label className="w-12 shrink-0 text-xs text-text-dim">(영문) -</label>
              <input
                type="text"
                placeholder="EN 한 줄 설명 (영문)"
                value={group.taglineEn ?? ''}
                onChange={e => onChange({ ...group, taglineEn: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-xs text-text-dim">테마 색 · 로고 -</label>
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
                <button
                  onClick={() => setLogoOpen(true)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
                >
                  {logoSrc ? (
                    <img src={logoSrc} alt="" className="h-5 w-5 rounded object-cover" />
                  ) : (
                    <ImageIcon size={15} />
                  )}
                  로고
                </button>
              </div>
            </div>
          </div>

          {/* 모드 옵션 줄: 영상 제외 안내 + solo·롱폼 토글 + 화보 나누기/합치기 */}
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg-card px-3 py-2">
            {disabled && (
              <span className="w-full text-xs font-semibold text-danger-text">
                이 세력은 영상에서 빠집니다. 아래 설정은 다시 포함했을 때 적용됩니다.
              </span>
            )}
            <label
              className="flex items-center gap-1.5 text-sm text-text-secondary"
              title="회사·팀이 아닌 개인들의 모음입니다. 켜면 팀 이름 카드와 단체사진(화보)을 건너뛰고 인물만 차례로 나옵니다. 예: '재야'. 회사 세력이면 꺼두세요."
            >
              <input
                type="checkbox"
                checked={!!group.solo}
                onChange={e => onChange({ ...group, solo: e.target.checked || undefined })}
              />
              무소속 개인군 <span className="text-xs text-text-dim">(회사 아닌 개인 모음 · 팀 카드·단체사진 생략)</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={!!group.longformOnly}
                onChange={e => onChange({ ...group, longformOnly: e.target.checked || undefined })}
              />
              롱폼에만 넣기 <span className="text-xs text-text-dim">(세로 쇼츠 제외, 가로 롱폼만)</span>
            </label>
            <label
              className="flex items-center gap-1.5 text-sm text-text-secondary"
              title="이 세력이 시작될 때 배경음악을 이 곡으로 바꿉니다(이전 곡은 부드럽게 사라짐). '이전 곡 유지'로 두면 앞 세력의 곡이 계속 흐릅니다."
            >
              <span className="text-text-dim">세력 음악</span>
              <select
                value={group.music ?? ''}
                onChange={e => onChange({ ...group, music: e.target.value || undefined })}
                className="rounded-md border border-border bg-bg-card px-2 py-1 text-sm"
              >
                <option value="">이전 곡 유지</option>
                {(musicList ?? []).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            {/* 세력 곡 음량 — 곡을 지정한 세력만. 100%=원음, 곡마다 음량 편차를 잡는다(50%·40%…). */}
            {group.music && (
              <label
                className="flex items-center gap-1.5 text-sm text-text-secondary"
                title="이 세력 곡 음량. 100%가 원음, 왼쪽으로 줄인다"
              >
                <span className="text-text-dim">음량</span>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={group.musicVolume ?? 1}
                  onChange={e => { const v = Number(e.target.value); onChange({ ...group, musicVolume: v === 1 ? undefined : v }) }}
                  className="w-20 accent-accent"
                />
                <span className="w-10 text-right font-mono text-xs">{Math.round((group.musicVolume ?? 1) * 100)}%</span>
              </label>
            )}
            {!group.solo && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-text-dim">
                  {split ? '나뉜 단체사진을 한 장으로' : '인물이 많으면 단체사진을 인물군별로 분리'}
                </span>
                <button
                  onClick={split ? toSingle : toSplit}
                  title="한 팀의 단체사진(화보)을 한 장으로 합칠지, 인물군별 여러 장으로 나눌지 정합니다. 예: 구글을 '창업자'+'딥마인드' 두 묶음으로. 인물 2~3명 작은 팀은 한 장이면 충분합니다."
                  className="rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
                >
                  {split ? '화보 합치기 (단일)' : '화보 나누기 (묶음)'}
                </button>
              </div>
            )}
          </div>

          {/* 단일 모드: 팀 화보 + 인물 목록 */}
          {!split && (
            <div className="space-y-2">
              {!group.solo && (
                <div className="flex items-start gap-2">
                  <span className="pt-1 text-xs font-semibold text-text-secondary">팀 화보</span>
                  <CoverPickerButton
                    value={group.image}
                    onChange={next => onChange({ ...group, image: next })}
                    series={series}
                    episodeName={episodeName}
                  />
                </div>
              )}
              <PersonList
                people={people}
                onPeopleChange={next => onChange({ ...group, people: next })}
                onAddCeleb={() => setCelebTarget(null)}
                series={series}
                episodeName={episodeName}
                groupIndex={groupIndex}
                solo={!!group.solo}
              />
            </div>
          )}

          {/* 분할 모드: 묶음별 화보 + 인물 목록 */}
          {split && (
            <div className="space-y-3">
              {clusters.map((c, ci) => (
                <div key={ci} className="space-y-2 rounded-md border border-border bg-bg-main p-3">
                  <div className="flex flex-wrap items-start gap-2">
                    {/* 묶음 소제목 + 소제목(영문) — 한 줄 나란히 */}
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <label className="w-20 shrink-0 text-xs text-text-dim">묶음 소제목 -</label>
                      <input
                        type="text"
                        placeholder="묶음 소제목 (예: 창업자)"
                        value={c.label ?? ''}
                        onChange={e => setCluster(ci, { ...c, label: e.target.value })}
                        className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm font-semibold focus:border-accent focus:outline-none"
                      />
                      <label className="w-12 shrink-0 text-xs text-text-dim">(영문) -</label>
                      <input
                        type="text"
                        placeholder="EN 묶음 소제목 (영문)"
                        value={c.labelEn ?? ''}
                        onChange={e => setCluster(ci, { ...c, labelEn: e.target.value })}
                        className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
                      />
                    </div>
                    <CoverPickerButton
                      value={c.image}
                      onChange={next => setCluster(ci, { ...c, image: next })}
                      series={series}
                      episodeName={episodeName}
                    />
                    {c.longformOnly && (
                      <span className="shrink-0 rounded border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                        롱폼 전용
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-text-dim">인물 {c.people?.length ?? 0}</span>
                    <button onClick={() => moveCluster(ci, -1)} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="위로">
                      <ChevronUp size={15} />
                    </button>
                    <button onClick={() => moveCluster(ci, 1)} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="아래로">
                      <ChevronDown size={15} />
                    </button>
                    <button onClick={() => deleteCluster(ci)} className="rounded-md border border-border p-1.5 text-danger-text hover:bg-danger" title="묶음 삭제">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {/* 묶음 설명 + 설명(영문) — 한 줄 나란히 */}
                  <div className="flex items-center gap-2">
                    <label className="w-20 shrink-0 text-xs text-text-dim">묶음 설명 -</label>
                    <input
                      type="text"
                      placeholder="묶음 설명 (예: 딥러닝 혁명을 일으킨 세 석학)"
                      value={c.note ?? ''}
                      onChange={e => setCluster(ci, { ...c, note: e.target.value })}
                      className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                    />
                    <label className="w-12 shrink-0 text-xs text-text-dim">(영문) -</label>
                    <input
                      type="text"
                      placeholder="EN 묶음 설명 (영문)"
                      value={c.noteEn ?? ''}
                      onChange={e => setCluster(ci, { ...c, noteEn: e.target.value })}
                      className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={!!c.longformOnly}
                      onChange={e => setCluster(ci, { ...c, longformOnly: e.target.checked || undefined })}
                    />
                    이 묶음은 롱폼에만 넣기 <span className="text-xs text-text-dim">(세로 쇼츠 제외, 가로 롱폼만)</span>
                  </label>
                  <PersonList
                    people={c.people ?? []}
                    onPeopleChange={next => setCluster(ci, { ...c, people: next })}
                    onAddCeleb={() => setCelebTarget(ci)}
                    series={series}
                    episodeName={episodeName}
                    groupIndex={groupIndex}
                    clusterIndex={ci}
                    solo={false}
                  />
                </div>
              ))}
              <button
                onClick={addCluster}
                className="flex items-center gap-1.5 rounded-md border border-dashed border-border bg-bg-card px-3 py-1.5 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover"
              >
                <Plus size={15} /> 화보 묶음 추가
              </button>
            </div>
          )}
        </div>
      )}

      {logoOpen && (
        <FactionImagePicker
          value={group.logo}
          onChange={next => onChange({ ...group, logo: next })}
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
