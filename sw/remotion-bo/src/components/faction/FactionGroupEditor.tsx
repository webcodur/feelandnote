'use client'

import { useState } from 'react'
import type { FactionGroup, FactionPerson, FactionCluster } from '@/lib/faction-types'
import { imageSrc } from './timing'
import { ChevronUp, ChevronDown, Trash2, Search, UserPlus, ImageIcon, Plus, Eye, EyeOff } from './icons'
import { FactionPersonRow } from './FactionPersonRow'
import { FactionImagePicker } from './FactionImagePicker'
import { FactionCelebSearchModal, type CelebResult } from './FactionCelebSearchModal'

type Props = {
  group: FactionGroup
  onChange: (next: FactionGroup) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  series: string
  episodeName: string
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
  people, onPeopleChange, onAddCeleb, series, episodeName,
}: {
  people: FactionPerson[]
  onPeopleChange: (next: FactionPerson[]) => void
  onAddCeleb: () => void
  series: string
  episodeName: string
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

export function FactionGroupEditor({ group, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [logoOpen, setLogoOpen] = useState(false)
  // 셀럽 검색 대상: null=단일 people, 숫자=해당 묶음 인덱스
  const [celebTarget, setCelebTarget] = useState<number | null | undefined>(undefined)

  const color = group.color ?? DEFAULT_COLOR
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
      {/* 헤더 */}
      <div className="flex items-center gap-2 p-3">
        <span className="h-4 w-4 shrink-0 rounded-full border border-border" style={{ backgroundColor: color }} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <label className="w-24 shrink-0 text-xs text-text-dim">세력 이름 -</label>
            <input
              type="text"
              placeholder="세력명"
              value={group.name}
              onChange={e => onChange({ ...group, name: e.target.value })}
              className="w-full rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm font-semibold focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-24 shrink-0 text-xs text-text-dim">세력 이름(영문) -</label>
            <input
              type="text"
              placeholder="EN 세력명 (영문)"
              value={group.nameEn ?? ''}
              onChange={e => onChange({ ...group, nameEn: e.target.value })}
              className="w-full rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
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
        <span className="shrink-0 text-xs text-text-dim">인물 {totalCount}</span>
        <button
          onClick={toggleDisabled}
          className={`shrink-0 rounded-md border p-1.5 ${
            disabled
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-text-secondary hover:bg-bg-hover'
          }`}
          title={disabled ? '이 세력을 다시 영상에 포함' : '이 세력을 영상에서 제외 (데이터는 보존)'}
        >
          {disabled ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button onClick={() => setExpanded(v => !v)} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title={expanded ? '접기' : '펼치기'}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        <button onClick={onMoveUp} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="위로">
          <ChevronUp size={15} />
        </button>
        <button onClick={onMoveDown} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="아래로">
          <ChevronDown size={15} />
        </button>
        <button onClick={onDelete} className="rounded-md border border-border p-1.5 text-danger-text hover:bg-danger" title="세력 삭제">
          <Trash2 size={15} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border p-3">
          {/* 한 줄 설명 + 색 + 로고 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="w-24 shrink-0 text-xs text-text-dim">슬로건 -</label>
                <input
                  type="text"
                  placeholder="한 줄 설명"
                  value={group.tagline ?? ''}
                  onChange={e => onChange({ ...group, tagline: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 shrink-0 text-xs text-text-dim">슬로건(영문) -</label>
                <input
                  type="text"
                  placeholder="EN 한 줄 설명 (영문)"
                  value={group.taglineEn ?? ''}
                  onChange={e => onChange({ ...group, taglineEn: e.target.value })}
                  className="w-full rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
                />
              </div>
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
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={!!group.solo}
                onChange={e => onChange({ ...group, solo: e.target.checked || undefined })}
              />
              무소속 개인군 <span className="text-xs text-text-dim">(팀 이름·화보 없이 인물만)</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={!!group.longformOnly}
                onChange={e => onChange({ ...group, longformOnly: e.target.checked || undefined })}
              />
              롱폼에만 넣기 <span className="text-xs text-text-dim">(세로 쇼츠 제외, 가로 롱폼만)</span>
            </label>
            {!group.solo && (
              <button
                onClick={split ? toSingle : toSplit}
                className="ml-auto rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
              >
                {split ? '화보 합치기 (단일)' : '화보 나누기 (묶음)'}
              </button>
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
              />
            </div>
          )}

          {/* 분할 모드: 묶음별 화보 + 인물 목록 */}
          {split && (
            <div className="space-y-3">
              {clusters.map((c, ci) => (
                <div key={ci} className="space-y-2 rounded-md border border-border bg-bg-main p-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <label className="w-24 shrink-0 text-xs text-text-dim">묶음 소제목 -</label>
                        <input
                          type="text"
                          placeholder="묶음 소제목 (예: 창업자)"
                          value={c.label ?? ''}
                          onChange={e => setCluster(ci, { ...c, label: e.target.value })}
                          className="w-full rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm font-semibold focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="w-24 shrink-0 text-xs text-text-dim">소제목(영문) -</label>
                        <input
                          type="text"
                          placeholder="EN 묶음 소제목 (영문)"
                          value={c.labelEn ?? ''}
                          onChange={e => setCluster(ci, { ...c, labelEn: e.target.value })}
                          className="w-full rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>
                    <CoverPickerButton
                      value={c.image}
                      onChange={next => setCluster(ci, { ...c, image: next })}
                      series={series}
                      episodeName={episodeName}
                    />
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
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="w-24 shrink-0 text-xs text-text-dim">묶음 설명 -</label>
                      <input
                        type="text"
                        placeholder="묶음 설명 (예: 딥러닝 혁명을 일으킨 세 석학)"
                        value={c.note ?? ''}
                        onChange={e => setCluster(ci, { ...c, note: e.target.value })}
                        className="w-full rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="w-24 shrink-0 text-xs text-text-dim">설명(영문) -</label>
                      <input
                        type="text"
                        placeholder="EN 묶음 설명 (영문)"
                        value={c.noteEn ?? ''}
                        onChange={e => setCluster(ci, { ...c, noteEn: e.target.value })}
                        className="w-full rounded-md border border-border/60 bg-bg-card/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                  <PersonList
                    people={c.people ?? []}
                    onPeopleChange={next => setCluster(ci, { ...c, people: next })}
                    onAddCeleb={() => setCelebTarget(ci)}
                    series={series}
                    episodeName={episodeName}
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
