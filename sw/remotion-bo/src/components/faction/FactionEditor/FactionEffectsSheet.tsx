'use client'

import React, { useRef, useState } from 'react'
import type { FactionScript, FactionGroup, FactionPerson, FactionTransition, HoldMotion, EnterMotion, ZoomFocus, GlitchSetting, GlitchLevel } from '@/lib/faction-types'
import { HOLD_MOTION_OPTIONS } from '../shared/holdMotion'
import { imageSrc } from '../shared/timing'
import { ImageFocusPicker } from '@/components/media'

/**
 * 세력도 "움직임 효과" 통합 관리 시트.
 * 전환·지속·줌 목표점·지지직·속도를 에피소드 전역 → 세력 → 그룹샷 → 인물 한 화면에서,
 * 모든 대상에 동일한 컨트롤로 다룬다(여기저기 흩어진 효과 입력을 이 한 곳으로 모은다).
 * 빈 값 = 상위(전역·세력) 설정을 따른다. 명시한 값만 그 대상에 덮어쓴다.
 */

// 전환 전용 옵션 — 실제 전환 모션이 있는 것만(줌인·켄번스는 지속 효과로 분리, 줌아웃은 빠른 전환)
const TRANSITION_OPTIONS: { value: Exclude<FactionTransition, never>; label: string }[] = [
  { value: 'auto', label: '자동 (번갈아)' },
  { value: 'zoompunch', label: '확 다가오기 (줌인)' },
  { value: 'slideLeft', label: '슬라이드 (오른쪽에서)' },
  { value: 'slideRight', label: '슬라이드 (왼쪽에서)' },
  { value: 'glitch', label: 'TV 지직거림' },
  { value: 'tear', label: '찢기 (가운데 갈라짐)' },
  { value: 'crt', label: '옛 TV 켜지듯' },
  { value: 'whip', label: '빠르게 스쳐 지나기' },
  { value: 'filmburn', label: '필름 타들어가듯' },
  { value: 'pixelate', label: '모자이크로 흩어지기' },
  { value: 'shutter', label: '블라인드 열리기' },
]

// 시작 효과 옵션 — 컷 등장 직후 짧은 도입 임팩트
const ENTER_MOTION_OPTIONS: { value: EnterMotion; label: string }[] = [
  { value: 'none', label: '없음' },
  { value: 'zoomout', label: '줌아웃 (팍 빠짐)' },
  { value: 'zoomin', label: '줌인 (팍 다가옴)' },
]

const SELECT_CLS = 'w-full min-w-0 truncate rounded bg-bg-card px-1.5 py-1 text-xs border border-border/50 focus:border-accent focus:outline-none'

type EffectFields = {
  transition?: FactionTransition
  holdMotion?: HoldMotion
  enterMotion?: EnterMotion
  holdGlitch?: GlitchSetting
  holdShake?: boolean
  zoomFocus?: ZoomFocus
  zoomSpeed?: number
}
type Kind = 'global' | 'group' | 'cluster' | 'person'

/**
 * 줌 목표점 지정 대상 한 장 — 한 컷에 사진이 여러 장(기본·대사·교체)일 때
 * 사진마다 따로 목표점을 찍도록 대상 목록으로 넘긴다.
 */
type FocusTarget = {
  /** 버튼에 띄울 짧은 이름 (기본·대사·교체1…) */
  label: string
  src: string
  focus?: ZoomFocus
  onChange: (zf?: ZoomFocus) => void
}

/** 상위에서 내려온 effective 값(계승값) — "상위 따름" 라벨에 실제 값을 보여주기 위한 것 */
type Inherited = {
  transition?: FactionTransition
  enterMotion?: EnterMotion
  holdMotion?: HoldMotion
  holdGlitch?: GlitchSetting
  holdShake?: boolean
  zoomSpeed?: number
}

// OPTIONS 배열에서 값 → 한글 라벨 변환(없으면 undefined)
const labelOf = <T,>(opts: { value: T; label: string }[], v: T | undefined): string | undefined =>
  v === undefined ? undefined : opts.find(o => o.value === v)?.label

// 테이블 UI 컴포넌트
function TableColGroup() {
  return (
    <colgroup>
      <col className="w-[180px] sm:w-[220px]" />
      <col className="w-[13%]" />
      <col className="w-[12%]" />
      <col className="w-[12%]" />
      <col className="w-[11%]" />
      <col className="w-[11%]" />
      <col className="w-[9%]" />
      <col className="w-[13%]" />
    </colgroup>
  )
}

function TableHead() {
  return (
    <thead className="bg-bg-main/60 text-xs text-text-dim border-b border-border/50">
      <tr>
        <th className="p-2 font-semibold">대상</th>
        <th className="p-2 font-semibold text-center">전환</th>
        <th className="p-2 font-semibold text-center">시작</th>
        <th className="p-2 font-semibold text-center">지속</th>
        <th className="p-2 font-semibold text-center">흔들림</th>
        <th className="p-2 font-semibold text-center">지지직</th>
        <th className="p-2 font-semibold text-center">속도</th>
        <th className="p-2 font-semibold text-center">줌 목표점</th>
      </tr>
    </thead>
  )
}

// 효과 컨트롤 한 줄 — 모든 대상에 동일하게 재사용한다.
function EffectTableRow({ targetName, value, onChange, kind, focusTargets, inherited, locked }: {
  targetName: React.ReactNode
  value: EffectFields
  onChange: (patch: Partial<EffectFields>) => void
  kind: Kind
  /** 줌 목표점을 찍을 사진 목록 — 컷에 들어가는 사진(기본·대사·교체)마다 한 항목 */
  focusTargets?: FocusTarget[]
  inherited?: Inherited
  locked?: boolean
}) {
  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  const targets = focusTargets ?? []
  const openTarget = focusIdx != null ? targets[focusIdx] : undefined
  const showTransition = kind !== 'cluster'
  const glitchDefaultOn = kind === 'cluster'
  const shownTransition = locked ? value.transition ?? inherited?.transition : value.transition
  const shownEnter = locked ? value.enterMotion ?? inherited?.enterMotion : value.enterMotion
  const shownHold = locked ? value.holdMotion ?? inherited?.holdMotion : value.holdMotion
  const shownGlitch = locked ? value.holdGlitch ?? inherited?.holdGlitch : value.holdGlitch
  const shownShake = locked ? value.holdShake ?? inherited?.holdShake : value.holdShake
  const shownSpeed = locked ? value.zoomSpeed ?? inherited?.zoomSpeed : value.zoomSpeed

  const followWith = (effLabel: string | undefined, globalDefault: string) =>
    kind === 'global' ? `기본(${globalDefault})` : effLabel ? `상위 따름 (${effLabel})` : '상위 따름'

  const transitionFollow = followWith(labelOf(TRANSITION_OPTIONS, inherited?.transition) ?? '크로스페이드', '크로스페이드')
  const enterFollow = followWith(labelOf(ENTER_MOTION_OPTIONS, inherited?.enterMotion) ?? '없음', '없음')
  const holdFollow = followWith(labelOf(HOLD_MOTION_OPTIONS, inherited?.holdMotion) ?? '정지', '정지')
  const glitchInheritLabel = inherited?.holdGlitch === undefined ? undefined
    : inherited.holdGlitch === false ? '꺼짐'
    : inherited.holdGlitch === 'light' ? '라이트'
    : inherited.holdGlitch === 'tail' ? '막판 1초' : '헤비'
  const glitchFollow = kind === 'global'
    ? '기본(그룹샷만)'
    : glitchInheritLabel ? `상위 따름 (${glitchInheritLabel})` : glitchDefaultOn ? '상위 따름 (헤비)' : '상위 따름'
  const shakeInheritLabel = inherited?.holdShake === undefined ? undefined : inherited.holdShake ? '켜짐' : '꺼짐'
  const shakeFollow = kind === 'global' ? '기본(꺼짐)' : shakeInheritLabel ? `상위 따름 (${shakeInheritLabel})` : '상위 따름'
  const speedPlaceholder = inherited?.zoomSpeed != null ? String(inherited.zoomSpeed) : '1'

  return (
    <>
      <tr className="border-b border-border/30 hover:bg-bg-hover/30 transition-colors">
        <td className="p-2 align-middle">
          {targetName}
        </td>
        <td className="p-1 align-middle">
          {showTransition ? (
            <select
              value={shownTransition ?? ''}
              disabled={locked}
              onChange={e => onChange({ transition: (e.target.value || undefined) as FactionTransition | undefined })}
              className={SELECT_CLS}
              title="컷이 바뀌는 순간의 효과(세로 쇼츠 인물 컷만). 그룹샷·로고·가로 롱폼엔 적용 안 됨"
            >
              <option value="">{transitionFollow}</option>
              {TRANSITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : <div className="text-center text-xs text-text-dim">-</div>}
        </td>
        <td className="p-1 align-middle">
          <select
            value={shownEnter ?? ''}
            disabled={locked}
            onChange={e => onChange({ enterMotion: (e.target.value || undefined) as EnterMotion | undefined })}
            className={SELECT_CLS}
            title="컷이 등장한 직후 짧은 도입 임팩트"
          >
            <option value="">{enterFollow}</option>
            {ENTER_MOTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </td>
        <td className="p-1 align-middle">
          <select
            value={shownHold ?? ''}
            disabled={locked}
            onChange={e => onChange({ holdMotion: (e.target.value || undefined) as HoldMotion | undefined })}
            className={SELECT_CLS}
            title="컷이 머무는 동안의 카메라 움직임"
          >
            <option value="">{holdFollow}</option>
            {HOLD_MOTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </td>
        <td className="p-1 align-middle">
          <select
            value={shownShake === undefined ? '' : shownShake ? 'on' : 'off'}
            disabled={locked}
            onChange={e => onChange({ holdShake: e.target.value === '' ? undefined : e.target.value === 'on' })}
            className={SELECT_CLS}
            title="줌·이동 위에 겹쳐 거는 흔들림(핸드헬드). 평소 잔잔하다 가끔 흔들린다"
          >
            <option value="">{shakeFollow}</option>
            <option value="on">켜기</option>
            <option value="off">끄기</option>
          </select>
        </td>
        <td className="p-1 align-middle">
          <select
            value={shownGlitch === undefined ? '' : shownGlitch === false ? 'off' : shownGlitch === true ? 'heavy' : shownGlitch}
            disabled={locked}
            onChange={e => onChange({ holdGlitch: e.target.value === '' ? undefined : e.target.value === 'off' ? false : (e.target.value as GlitchLevel) })}
            className={SELECT_CLS}
            title="라이트=내내 은은, 헤비=내내 강함, 막판 1초=컷 끝 직전 1초만 강하게"
          >
            <option value="">{glitchFollow}</option>
            <option value="off">끄기</option>
            <option value="light">라이트</option>
            <option value="heavy">헤비</option>
            <option value="tail">막판 1초</option>
          </select>
        </td>
        <td className="p-1 align-middle">
          <div className="flex items-center gap-1 justify-center">
            <input
              type="number" min={0} step={0.1}
              value={shownSpeed ?? ''}
              disabled={locked}
              placeholder={speedPlaceholder}
              onChange={e => onChange({ zoomSpeed: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="w-14 min-w-0 bg-bg-card px-1.5 py-1 text-center text-[11px] border border-border/50 rounded focus:border-accent focus:outline-none disabled:opacity-50"
              title="줌·이동 속도 배수"
            />
            <span className="text-[10px] text-text-dim shrink-0">배</span>
          </div>
        </td>
        <td className="p-1 align-middle">
          {targets.length ? (
            <div className="flex flex-wrap gap-1 justify-center">
              {targets.map((t, i) => {
                const has = t.focus?.x != null || t.focus?.y != null
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={locked}
                    onClick={() => setFocusIdx(v => (v === i ? null : i))}
                    className={`flex items-center justify-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 border ${has ? 'border-amber-400/60 bg-amber-400/10 text-amber-500' : 'border-border/30 bg-bg-main/50 text-text-secondary hover:bg-bg-hover hover:text-text-primary'} ${focusIdx === i ? 'ring-1 ring-accent/60' : ''}`}
                    title="줌인(다가가는 줌)이 다가갈 지점을 이미지에서 클릭해 정한다"
                  >
                    {targets.length > 1 && <span className="shrink-0 text-[10px] text-text-dim">{t.label}</span>}
                    {has ? <span className="font-bold">{t.focus!.x ?? 50}·{t.focus!.y ?? 50}</span> : <span>{targets.length > 1 ? '지정' : '목표점 지정'}</span>}
                  </button>
                )
              })}
            </div>
          ) : <div className="text-center text-xs text-text-dim">-</div>}
        </td>
      </tr>
      {openTarget && (
        <tr>
          <td colSpan={8} className="p-0 border-b border-border/30 bg-bg-main/10">
            <div className="space-y-1 p-2">
              {targets.length > 1 && (
                <div className="text-[11px] font-semibold text-text-secondary">{openTarget.label} 사진의 줌 목표점</div>
              )}
              <ImageFocusPicker src={openTarget.src} focus={openTarget.focus} onChange={openTarget.onChange} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-semibold text-text-secondary">{children}</div>
)

// 효과 6개 필드 — 전체/세력 덮어쓰기 때 비울 대상
const EFFECT_KEYS = ['transition', 'holdMotion', 'enterMotion', 'holdGlitch', 'holdShake', 'zoomFocus', 'zoomSpeed'] as const

// 객체에서 6개 효과 필드를 모두 비운다(상위를 따르게).
// 사진별 줌 목표점(quoteZoomFocus·imageChanges[].zoomFocus)도 개별 설정이므로 함께 비운다.
function stripEffects<T extends EffectFields>(obj: T): T {
  const next = { ...obj }
  const r = next as Record<string, unknown>
  for (const k of EFFECT_KEYS) delete r[k]
  delete r.quoteZoomFocus
  delete r.logoEffects
  if (Array.isArray(r.imageChanges)) {
    r.imageChanges = (r.imageChanges as Record<string, unknown>[]).map(({ zoomFocus: _zf, ...rest }) => rest)
  }
  return next
}

// 시스템 기본(전역의 상위가 없을 때) — "상위 따름" 라벨 기준값
const SYSTEM_DEFAULT: Inherited = {
  transition: undefined,
  enterMotion: undefined,
  holdMotion: undefined,
  holdGlitch: undefined,
  holdShake: undefined,
  zoomSpeed: undefined,
}

export function FactionEffectsSheet({ script, onChange, series, episodeName, onClose }: {
  script: FactionScript
  onChange: (next: FactionScript) => void
  series: string
  episodeName: string
  onClose: () => void
}) {
  const groups = script.groups
  // 세력별 접힘 상태(기본 펼침)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  // 세력 섹션 DOM 참조(네비 점프용)
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({})

  const patchScript = (p: Partial<EffectFields>) => onChange({ ...script, ...p })
  const patchGroup = (gi: number, p: Partial<FactionGroup>) =>
    onChange({ ...script, groups: groups.map((g, i) => (i === gi ? { ...g, ...p } : g)) })
  const patchCluster = (gi: number, ci: number, p: Partial<EffectFields>) =>
    onChange({ ...script, groups: groups.map((g, i) => (i === gi ? { ...g, clusters: (g.clusters ?? []).map((c, j) => (j === ci ? { ...c, ...p } : c)) } : g)) })
  const patchClusterPerson = (gi: number, ci: number, pi: number, p: Partial<FactionPerson>) =>
    onChange({ ...script, groups: groups.map((g, i) => (i === gi ? { ...g, clusters: (g.clusters ?? []).map((c, j) => (j === ci ? { ...c, people: c.people.map((pp, k) => (k === pi ? { ...pp, ...p } : pp)) } : c)) } : g)) })

  // 인물 컷에 들어가는 사진 전부(기본 → 대사 → 교체 순)를 줌 목표점 지정 대상으로 편다.
  const personFocusTargets = (gi: number, ci: number, pi: number, pp: FactionPerson): FocusTarget[] => {
    const out: FocusTarget[] = []
    const mainSrc = imageSrc(series, episodeName, pp.image)
    if (mainSrc) out.push({ label: '기본', src: mainSrc, focus: pp.zoomFocus, onChange: zf => patchClusterPerson(gi, ci, pi, { zoomFocus: zf }) })
    const quoteSrc = imageSrc(series, episodeName, pp.quoteImage)
    if (quoteSrc) out.push({ label: '대사', src: quoteSrc, focus: pp.quoteZoomFocus, onChange: zf => patchClusterPerson(gi, ci, pi, { quoteZoomFocus: zf }) })
    // 렌더러는 imageChanges 를 chunk 순으로 정렬해 틀므로(PersonCard), 여기서도 재생 순서로 정렬해서 보여준다.
    // 배열 저장 순서대로 나열하면 "교체1"이 실제로는 뒤에 나오는 사진일 수 있어 줌 목표점을 엉뚱한 컷에 찍게 된다.
    ;(pp.imageChanges ?? [])
      .map((ic, ii) => ({ ic, ii }))
      .sort((a, b) => a.ic.chunk - b.ic.chunk)
      .forEach(({ ic, ii }, di) => {
        const src = imageSrc(series, episodeName, ic.image)
        if (!src) return
        out.push({
          label: `교체${di + 1}`,
          src,
          focus: ic.zoomFocus,
          onChange: zf => patchClusterPerson(gi, ci, pi, {
            imageChanges: (pp.imageChanges ?? []).map((c, k) => (k === ii ? { ...c, zoomFocus: zf } : c)),
          }),
        })
      })
    return out
  }

  const nameHead = (s?: string) => (s ?? '').split('\n')[0] || '(이름 없음)'

  // 계승값 계산 — 전역 effective는 script 자체(없으면 시스템 기본)
  const globalEff: Inherited = {
    transition: script.transition,
    enterMotion: script.enterMotion,
    holdMotion: script.holdMotion,
    holdGlitch: script.holdGlitch,
    holdShake: script.holdShake,
    zoomSpeed: script.zoomSpeed,
  }
  // 세력 effective = 세력 값 ?? 전역
  const groupEffOf = (g: FactionScript['groups'][number]): Inherited => ({
    transition: g.transition ?? globalEff.transition,
    enterMotion: g.enterMotion ?? globalEff.enterMotion,
    holdMotion: g.holdMotion ?? globalEff.holdMotion,
    holdGlitch: g.holdGlitch ?? globalEff.holdGlitch,
    holdShake: g.holdShake ?? globalEff.holdShake,
    zoomSpeed: g.zoomSpeed ?? globalEff.zoomSpeed,
  })

  // 전역값을 모든 하위(세력·그룹샷·인물)에 통일 — 하위 개별 지정을 모두 비운다.
  const applyGlobalToAll = () => {
    if (!confirm('전역 효과로 모든 세력·그룹샷·인물을 통일한다. 하위의 개별 설정은 모두 지워진다. 진행한다?')) return
    onChange({
      ...script,
      groups: groups.map(g => ({
        ...stripEffects(g),
        clusters: (g.clusters ?? []).map(c => ({
          ...stripEffects(c),
          people: (c.people ?? []).map(pp => stripEffects(pp)),
        })),
      })),
    })
  }

  // 네비 점프 — 해당 세력 펼치고 스크롤
  const jumpTo = (gi: number) => {
    setCollapsed(c => ({ ...c, [gi]: false }))
    requestAnimationFrame(() => sectionRefs.current[gi]?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const setAllCollapsed = (v: boolean) =>
    setCollapsed(Object.fromEntries(groups.map((_, i) => [i, v])))

  // 전체 고정 — 켜면 하위 컨트롤이 잠기고 전역값으로 렌더된다.
  const locked = script.lockEffects === true

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-3">
          <div>
            <span className="font-semibold text-text-primary">움직임 효과 관리</span>
            <span className="ml-2 text-xs text-text-dim">전환(컷 교체) · 시작(도입) · 지속(컷 내내) · 줌 목표점 · 지지직 · 줌 속도 — 빈 칸은 상위 설정을 따름</span>
          </div>
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">닫기</button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* 전역 기본 */}
          <section className="space-y-2 rounded-md border border-accent/40 bg-accent/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle>에피소드 전역 (모든 세력·인물의 기본값)</SectionTitle>
              <button
                type="button"
                onClick={applyGlobalToAll}
                disabled={locked}
                className="rounded-md border border-accent/50 px-2 py-1 text-[11px] text-accent hover:bg-accent/10 disabled:opacity-40"
                title="모든 세력·그룹샷·인물의 개별 효과 설정을 지워 전역값으로 통일한다(1회성)"
              >
                이 전역값을 모든 하위에 적용
              </button>
            </div>
            <div className="overflow-x-auto rounded border border-border bg-bg-card">
              <table className="w-full text-left text-sm table-fixed min-w-[700px]">
                <TableColGroup />
                <TableHead />
                <tbody>
                  <EffectTableRow
                    targetName={<span className="font-semibold text-text-primary">전역 설정</span>}
                    value={script} kind="global" inherited={SYSTEM_DEFAULT} onChange={patchScript}
                  />
                </tbody>
              </table>
            </div>
            {/* 전체 고정 토글 — 켜면 하위 개별값을 무시하고 전역값으로 렌더 */}
            <label className="flex items-center gap-2 border-t border-accent/30 pt-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={locked}
                onChange={e => onChange({ ...script, lockEffects: e.target.checked || undefined })}
                className="h-3.5 w-3.5 accent-accent"
              />
              <span className="font-semibold text-text-primary">전체 고정 — 전역값으로 잠금</span>
              <span className="text-[11px] text-text-dim">켜면 아래 세력·그룹샷·인물 개별 설정이 비활성화되고 전역값으로 렌더됨</span>
            </label>
          </section>

          {/* 세력 점프 네비 + 전체 접기/펼치기 */}
          {groups.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border border-border bg-bg-main/30 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">바로가기</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setAllCollapsed(true)}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-hover"
                  >
                    전체 접기
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllCollapsed(false)}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-hover"
                  >
                    전체 펼치기
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g, gi) => (
                  <button
                    key={gi}
                    type="button"
                    onClick={() => jumpTo(gi)}
                    className="rounded-full border border-border bg-bg-card px-3 py-1 text-[11px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  >
                    {nameHead(g.name)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 세력별 */}
          {groups.map((g, gi) => {
            const clusters = g.clusters ?? []
            // 그룹을 나눈 세력(2개 이상)만 그룹 번호 라벨을 쓴다 — 1개짜리는 세력 이름으로
            const split = clusters.length > 1
            const isCollapsed = collapsed[gi] ?? false
            const groupEff = groupEffOf(g)
            return (
              <section
                key={gi}
                ref={el => { sectionRefs.current[gi] = el }}
                className="overflow-hidden rounded-md border border-border bg-bg-card shadow-sm"
              >
                <div className="flex items-center border-b border-border bg-bg-main/60 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setCollapsed(c => ({ ...c, [gi]: !isCollapsed }))}
                    className="flex items-center gap-2 text-sm font-bold text-text-primary hover:text-text-secondary"
                    title="클릭하면 이 세력 섹션을 접거나 편다"
                  >
                    <span className="text-xs text-text-dim">{isCollapsed ? '▶' : '▼'}</span>
                    {nameHead(g.name)}
                  </button>
                </div>
                
                {!isCollapsed && (
                  <div className="overflow-x-auto p-1.5">
                    <table className="w-full text-left text-sm table-fixed min-w-[700px]">
                      <TableColGroup />
                      <TableHead />
                      <tbody>
                        {/* 세력 자체 설정 */}
                        <EffectTableRow
                          targetName={<span className="font-bold text-text-primary">▼ 세력 전역</span>}
                          value={g} kind="group" inherited={globalEff} locked={locked} onChange={p => patchGroup(gi, p)}
                        />

                        {/* 로고 화면 설정 */}
                        {(g.logoImg || g.logoVid) && (
                          <EffectTableRow
                            targetName={<span className="pl-4 font-semibold text-text-secondary">로고 (타이틀)</span>}
                            value={g.logoEffects ?? {}} kind="cluster" inherited={locked ? globalEff : groupEff} locked={locked}
                            focusTargets={(() => {
                              // 영상 로고일 수도 있으나, 포커스 피커용으로는 일단 로고를 쓴다.
                              const src = imageSrc(series, episodeName, g.logoVid ?? g.logoImg)
                              return src ? [{ label: '로고', src, focus: g.logoEffects?.zoomFocus, onChange: (zf?: ZoomFocus) => patchGroup(gi, { logoEffects: { ...(g.logoEffects ?? {}), zoomFocus: zf } }) }] : []
                            })()}
                            onChange={p => patchGroup(gi, { logoEffects: { ...(g.logoEffects ?? {}), ...p } })}
                          />
                        )}

                        {/* 그룹샷 및 인물 — 인물은 항상 그룹(clusters) 안에 있다. solo 세력은 그룹샷 컷이 없어 그룹샷 줄을 생략 */}
                        {clusters.map((c, ci) => (
                          <React.Fragment key={`c-${ci}`}>
                            {!g.solo && (
                              <EffectTableRow
                                targetName={<span className="pl-4 font-semibold text-text-secondary">그룹샷 · {nameHead(c.label) || (split ? `그룹 ${ci + 1}` : nameHead(g.name))}</span>}
                                value={c} kind="cluster" inherited={locked ? globalEff : groupEff} locked={locked}
                                focusTargets={(() => {
                                  const src = imageSrc(series, episodeName, c.image)
                                  return src ? [{ label: '그룹샷', src, focus: c.zoomFocus, onChange: (zf?: ZoomFocus) => patchCluster(gi, ci, { zoomFocus: zf }) }] : []
                                })()}
                                onChange={p => patchCluster(gi, ci, p)}
                              />
                            )}
                            {(c.people ?? []).map((pp, pi) => (
                              <EffectTableRow
                                key={`cp-${ci}-${pi}`}
                                targetName={<span className="pl-8 text-[12px] text-text-secondary">↳ {pp.name || '(이름 없음)'}</span>}
                                value={pp} kind="person" inherited={locked ? globalEff : groupEff} locked={locked}
                                focusTargets={personFocusTargets(gi, ci, pi, pp)}
                                onChange={p => patchClusterPerson(gi, ci, pi, p)}
                              />
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
