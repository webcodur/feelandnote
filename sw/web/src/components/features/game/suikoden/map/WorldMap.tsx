/*
  천도 v2 — 천하 지도. 실제 세계지도 위에 영토 46곳을 점으로 세우고,
  점마다 가까운 땅을 세력권으로 물들인다(보로노이 칸 ∩ 영토 크기만 한 원 — 먼 벌판까지 번지지 않는다).
  길은 대권 항로로 그리고, 이름표는 겹치지 않는 자리를 찾아 선다. 휠·손가락으로 확대하고 끌어서 옮긴다.
*/
'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { celebAvatarSmallUrl } from '@feelandnote/shared/constants/celeb-avatar-small'
import { Delaunay, geoCircle, geoGraticule10, geoNaturalEarth1, geoPath, select, zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from 'd3'
import { feature, mesh } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import { ROUTES, TERRITORIES, type TerritoryId } from '@/lib/game/suikoden/map'
import type { GameState } from '@/lib/game/suikoden/types'
import { alpha, INK } from '../ui/theme'
import { clipToConvex, layoutLabels, polygonPath, type Box, type LabelItem, type Pt } from './geometry'

type WorldTopo = Topology<{ countries: GeometryCollection; land: GeometryCollection }>

let topoCache: Promise<WorldTopo> | null = null
function loadWorld(): Promise<WorldTopo> {
  if (!topoCache) {
    topoCache = fetch('/data/world-110m.json').then((r) => {
      if (!r.ok) throw new Error(`world ${r.status}`)
      return r.json() as Promise<WorldTopo>
    })
    topoCache.catch(() => { topoCache = null })
  }
  return topoCache
}

function subscribeHover(onChange: () => void): () => void {
  const media = window.matchMedia('(hover: hover)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

const NEUTRAL = '#6d6a60'
const NODE_R = { l: 6.5, m: 5.2, s: 4.2 } as const
/** 세력권 반경(도) — 큰 도시일수록 넓게 물든다 */
const REACH_DEG = { l: 11, m: 8.5, s: 7 } as const
const TOKEN_R = 15

export interface MapMarker {
  territory: TerritoryId
  /** empty — 지키는 무장이 없는 우리 땅, lead — 소문·점괘로 알게 된 인물이 있는 땅 */
  kind: 'party' | 'battle' | 'threat' | 'empty' | 'lead'
  /** 일행 표지에 얹을 얼굴 */
  avatar?: string | null
  name?: string
}

/** 판을 덮는 창의 두께. 숫자는 px, '62%'처럼 쓰면 판 크기에 대한 비율이다 */
type InsetLength = number | `${number}%`
export interface MapInset { left?: InsetLength; right?: InsetLength; top?: InsetLength; bottom?: InsetLength }

function insetPx(v: InsetLength | undefined, total: number): number {
  if (v === undefined) return 0
  return typeof v === 'number' ? v : (parseFloat(v) / 100) * total
}

/** 창에 가려지지 않은 판 영역 */
function openArea(ins: MapInset | undefined, width: number, height: number) {
  const left = insetPx(ins?.left, width)
  const right = width - insetPx(ins?.right, width)
  const top = insetPx(ins?.top, height)
  const bottom = height - insetPx(ins?.bottom, height)
  return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 }
}

interface WorldMapProps {
  state: GameState
  selected: TerritoryId | null
  onSelect: (id: TerritoryId) => void
  /** 강조할 땅(이동·출진 가능한 곳) */
  targets?: Set<TerritoryId>
  markers?: MapMarker[]
  focus?: TerritoryId | null
  labelOf: (id: TerritoryId) => string
  ownerName?: (factionId: string | null) => string
  /** 길을 밝혀 줄 기준 땅(방랑 중 현재 위치 등) */
  home?: TerritoryId | null
  /** 판 위를 덮는 창 너비 — 초점을 맞출 때 가려지지 않은 가운데로 옮긴다 */
  inset?: MapInset
  /** 빈 성 표지 아래 글씨 */
  emptyLabel?: string
  className?: string
}

/** 첫 초점 배율 — 넓은 화면은 한 대륙, 좁은 화면은 한 나라 둘 정도가 보이게 */
function initialScale(width: number): number {
  const spanDeg = Math.max(42, Math.min(118, width / 12))
  return Math.max(1.6, Math.min(8, 313 / spanDeg))
}

export const WorldMap = memo(function WorldMap({ state, selected, onSelect, targets, markers, focus, labelOf, ownerName, home, inset, emptyLabel, className }: WorldMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [world, setWorld] = useState<WorldTopo | null>(null)
  const [failed, setFailed] = useState(false)
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 })
  const [hover, setHover] = useState<TerritoryId | null>(null)
  const focusedOnce = useRef(false)
  const canHover = useSyncExternalStore(subscribeHover, () => window.matchMedia('(hover: hover)').matches, () => true)
  const insetRef = useRef<MapInset | undefined>(inset)
  useEffect(() => { insetRef.current = inset }, [inset])

  useEffect(() => {
    let alive = true
    loadWorld().then((w) => { if (alive) setWorld(w) }).catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ width: el.clientWidth, height: el.clientHeight }))
    ro.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const geo = useMemo(() => {
    if (!world || size.width === 0) return null
    const projection = geoNaturalEarth1().fitWidth(size.width, { type: 'Sphere' })
    const [, [, bottom]] = geoPath(projection).bounds({ type: 'Sphere' })
    // 세로가 남으면 가운데로
    const offset = Math.max(0, (size.height - bottom) / 2)
    projection.translate([projection.translate()[0], projection.translate()[1] + offset])
    const path = geoPath(projection)
    const land = feature(world, world.objects.land)
    const borders = mesh(world, world.objects.countries, (a, b) => a !== b)
    const points = TERRITORIES.map((t) => projection([t.lng, t.lat]) as Pt)
    const delaunay = Delaunay.from(points)
    const voronoi = delaunay.voronoi([-40, -40, size.width + 40, Math.max(size.height, bottom + offset) + 40])
    const circle = geoCircle().precision(6)
    const cells = TERRITORIES.map((t, i) => {
      const cell = voronoi.cellPolygon(i) as Pt[] | null
      const ring = circle.center([t.lng, t.lat]).radius(REACH_DEG[t.size])().coordinates[0]
      const projected = ring.slice(0, -1).map((c) => projection(c as [number, number])).filter((p): p is Pt => !!p)
      if (!cell) return polygonPath(projected)
      return polygonPath(clipToConvex(projected, cell.slice(0, -1), points[i]))
    })
    const routes = ROUTES.map((r) => {
      const a = TERRITORIES.find((t) => t.id === r.a)!
      const b = TERRITORIES.find((t) => t.id === r.b)!
      return { ...r, d: path({ type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] }) ?? '' }
    })
    return {
      sphere: path({ type: 'Sphere' }) ?? '',
      graticule: path(geoGraticule10()) ?? '',
      land: path(land) ?? '',
      borders: path(borders) ?? '',
      points,
      cells,
      routes,
    }
  }, [world, size.width, size.height])

  // 확대·이동
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !geo) return
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([[-size.width * 0.15, -size.height * 0.15], [size.width * 1.15, size.height * 1.15]])
      .on('zoom', (event) => {
        const t = event.transform
        setTransform({ k: t.k, x: t.x, y: t.y })
      })
    zoomRef.current = behavior
    select(svg).call(behavior).on('dblclick.zoom', null)
    return () => { select(svg).on('.zoom', null) }
  }, [geo, size.width, size.height])

  const focusOn = useCallback((id: TerritoryId, k: number, animate: boolean) => {
    const svg = svgRef.current
    if (!svg || !geo || !zoomRef.current) return
    const i = TERRITORIES.findIndex((t) => t.id === id)
    const [px, py] = geo.points[i]
    const { cx, cy } = openArea(insetRef.current, size.width, size.height)
    const t = zoomIdentity.translate(cx - px * k, cy - py * k).scale(k)
    // 앞서 걸어 둔 이동이 뒤늦게 시작해 새 초점을 덮어쓰지 않게 끊는다
    const sel = select(svg).interrupt()
    if (animate) sel.transition().duration(650).call(zoomRef.current.transform, t)
    else sel.call(zoomRef.current.transform, t)
  }, [geo, size.width, size.height])

  // 고른 땅이 창 밑에 깔리면 배율은 두고 보이는 쪽 가운데로 옮긴다(휴대폰 아래 창, 넓은 화면 오른쪽 창)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !geo || !selected || !focusedOnce.current) return
    const i = TERRITORIES.findIndex((t) => t.id === selected)
    const cur = zoomTransform(svg)
    const [sx, sy] = cur.apply(geo.points[i])
    const area = openArea(insetRef.current, size.width, size.height)
    const pad = 36
    if (sx >= area.left + pad && sx <= area.right - pad && sy >= area.top + pad && sy <= area.bottom - pad) return
    focusOn(selected, cur.k, true)
  }, [selected, geo, focusOn, size.width, size.height])

  useEffect(() => {
    if (!geo || !focus) return
    const base = initialScale(size.width)
    focusOn(focus, focusedOnce.current ? Math.max(transform.k, base * 0.85) : base, focusedOnce.current)
    focusedOnce.current = true
    // transform.k를 의존에 넣으면 확대할 때마다 다시 끌려간다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, focus, focusOn])

  const ownerColor = useCallback((owner: string | null) => (owner ? state.factions[owner]?.color ?? NEUTRAL : null), [state.factions])

  const k = transform.k
  // 점 크기는 확대할수록 조금만 커진다
  const nodeScale = Math.pow(k, 0.3) / k
  const partyAt = markers?.find((m) => m.kind === 'party')?.territory ?? null

  // 이름표 자리 — 배율과 강조 대상이 바뀔 때만 다시 잡는다
  const labels = useMemo(() => {
    if (!geo) return new Map()
    const obstacles: Box[] = []
    const items: LabelItem[] = TERRITORIES.map((t, i) => {
      const [x, y] = geo.points[i]
      const ts = state.territories[t.id]
      const isPlayer = !!state.playerFaction && ts.owner === state.playerFaction
      const isSel = selected === t.id
      const isTarget = !!targets?.has(t.id)
      const isHome = home === t.id
      const isCapital = !!ts.owner && state.factions[ts.owner]?.capital === t.id
      const base = NODE_R[t.size] * nodeScale
      const r = partyAt === t.id ? (TOKEN_R + 3) / k : isSel ? base * 2.6 : isTarget ? base * 2.2 : base * 1.2
      obstacles.push({ x0: x - r, y0: y - r, x1: x + r, y1: y + r })
      const priority = (isSel ? 100 : 0) + (isHome ? 90 : 0) + (isTarget ? 60 : 0) + (isPlayer ? 50 : 0) + (isCapital ? 30 : 0) + (t.size === 'l' ? 12 : t.size === 'm' ? 6 : 0)
      return { id: t.id, x, y, r, text: labelOf(t.id), priority, force: isSel || isHome || isTarget || isPlayer }
    })
    return layoutLabels(items, k, obstacles)
  }, [geo, state.territories, state.factions, state.playerFaction, selected, targets, home, partyAt, k, nodeScale, labelOf])

  if (!geo) {
    return (
      <div ref={wrapRef} className={className} style={{ background: INK.ocean }}>
        {failed && <p className="grid h-full place-items-center text-[12px]" style={{ color: INK.mute }}>—</p>}
      </div>
    )
  }

  // 손가락으로 누르면 mouseenter도 함께 와서 말풍선이 남는다 — 가리킬 수 있는 기기에서만 띄운다
  const hovered = hover && canHover ? state.territories[hover] : null
  const hoverIndex = hover ? TERRITORIES.findIndex((t) => t.id === hover) : -1
  const hoverPos = hoverIndex >= 0 ? [geo.points[hoverIndex][0] * k + transform.x, geo.points[hoverIndex][1] * k + transform.y] : null

  return (
    <div ref={wrapRef} className={className} style={{ background: `radial-gradient(ellipse at 50% 40%, #10222a 0%, ${INK.ocean} 72%)`, position: 'relative', overflow: 'hidden' }}>
      <svg ref={svgRef} width={size.width} height={size.height} className="block touch-none select-none" style={{ cursor: 'grab' }}>
        <defs>
          <clipPath id="cheondo-land-clip"><path d={geo.land} /></clipPath>
          <clipPath id="cheondo-token-clip"><circle r={TOKEN_R - 2} /></clipPath>
          <filter id="cheondo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="cheondo-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(236,230,214,0.035)" strokeWidth="1" />
          </pattern>
        </defs>
        <g transform={`translate(${transform.x},${transform.y}) scale(${k})`}>
          <path d={geo.sphere} fill="none" stroke="rgba(236,230,214,0.07)" strokeWidth={1 / k} />
          <path d={geo.graticule} fill="none" stroke="rgba(236,230,214,0.035)" strokeWidth={0.6 / k} />
          <path d={geo.land} fill={INK.land} />
          <path d={geo.land} fill="url(#cheondo-hatch)" />
          {/* 세력권 */}
          <g clipPath="url(#cheondo-land-clip)">
            {TERRITORIES.map((t, i) => {
              const owner = state.territories[t.id].owner
              const color = ownerColor(owner)
              const isSel = selected === t.id
              const isHover = hover === t.id
              const mine = !!owner && owner === state.playerFaction
              return (
                <path
                  key={t.id}
                  d={geo.cells[i]}
                  fill={color ? alpha(color, mine ? 0.38 : 0.26) : isHover || isSel ? 'rgba(236,230,214,0.05)' : 'transparent'}
                  stroke={isSel ? INK.goldBright : color ? alpha(color, 0.6) : isHover ? 'rgba(236,230,214,0.2)' : 'none'}
                  strokeWidth={(isSel ? 1.8 : 0.8) / k}
                  onClick={() => onSelect(t.id)}
                  onMouseEnter={() => setHover(t.id)}
                  onMouseLeave={() => setHover((h) => (h === t.id ? null : h))}
                  style={{ cursor: 'pointer' }}
                />
              )
            })}
          </g>
          <path d={geo.borders} fill="none" stroke={INK.landLine} strokeWidth={0.5 / k} pointerEvents="none" />
          <path d={geo.land} fill="none" stroke="rgba(236,230,214,0.2)" strokeWidth={0.7 / k} pointerEvents="none" />
          {/* 길 */}
          <g pointerEvents="none">
            {geo.routes.map((r) => {
              // 기준 땅에서 갈 수 있는 길은 옅은 금빛, 그중 고른 곳으로 가는 길은 밝은 금빛
              const open = !!home && !!targets && ((r.a === home && targets.has(r.b)) || (r.b === home && targets.has(r.a)))
              const chosen = open && !!selected && selected !== home && (r.a === selected || r.b === selected)
              return (
                <path
                  key={`${r.a}-${r.b}`}
                  d={r.d}
                  fill="none"
                  stroke={chosen ? INK.goldBright : open ? alpha(INK.gold, 0.6) : r.sea ? 'rgba(111,168,220,0.38)' : 'rgba(236,230,214,0.2)'}
                  strokeWidth={(chosen ? 2.2 : open ? 1.4 : 0.9) / k}
                  strokeDasharray={r.sea ? `${3 / k} ${3 / k}` : undefined}
                />
              )
            })}
          </g>
          {/* 영토 점 */}
          {TERRITORIES.map((t, i) => {
            const ts = state.territories[t.id]
            const [x, y] = geo.points[i]
            const color = ownerColor(ts.owner) ?? NEUTRAL
            const isPlayer = !!state.playerFaction && ts.owner === state.playerFaction
            const isSel = selected === t.id
            const isTarget = targets?.has(t.id)
            const isCapital = !!ts.owner && state.factions[ts.owner]?.capital === t.id
            const r = NODE_R[t.size] * nodeScale
            const label = labels.get(t.id)
            return (
              // data-territory — 이름표가 숨는 배율에서도 브라우저 점검 스크립트가 땅을 찾아 누를 수 있게
              <g key={t.id} data-territory={t.id} transform={`translate(${x},${y})`} onClick={() => onSelect(t.id)} onMouseEnter={() => setHover(t.id)} onMouseLeave={() => setHover((h) => (h === t.id ? null : h))} style={{ cursor: 'pointer' }}>
                <circle r={Math.max(r * 2.4, 12 / k)} fill="transparent" />
                {isTarget && <circle r={r * 2.2} fill="none" stroke={INK.goldBright} strokeWidth={1.2 / k} strokeDasharray={`${2.5 / k} ${2 / k}`} className="cheondo-spin" />}
                {isSel && <circle r={r * 2.6} fill="none" stroke={INK.goldBright} strokeWidth={1.4 / k} className="cheondo-pulse" />}
                <circle r={r} fill={color} stroke={isPlayer ? INK.goldBright : '#0b0c0f'} strokeWidth={(isPlayer ? 1.6 : 1) / k} filter={isSel ? 'url(#cheondo-glow)' : undefined} />
                {isCapital && <path d={starPath(r * 0.72)} fill="#0b0c0f" />}
                {ts.threat && <circle cx={r * 1.1} cy={-r * 1.1} r={r * 0.55} fill={INK.seal} stroke="#0b0c0f" strokeWidth={0.6 / k} />}
                {label && (
                  <text
                    x={label.x - x}
                    y={label.y - y}
                    textAnchor={label.anchor}
                    dominantBaseline="central"
                    fontSize={11 / k}
                    fontWeight={isSel || isPlayer ? 800 : 600}
                    fill={isSel ? INK.goldBright : isPlayer || isTarget ? INK.text : 'rgba(236,230,214,0.74)'}
                    stroke="#07080a"
                    strokeWidth={3 / k}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {labelOf(t.id)}
                  </text>
                )}
              </g>
            )
          })}
          {/* 표지 */}
          {markers?.map((m) => {
            const i = TERRITORIES.findIndex((t) => t.id === m.territory)
            if (i < 0) return null
            const [x, y] = geo.points[i]
            if (m.kind === 'party') {
              const src = m.avatar ? celebAvatarSmallUrl(m.avatar) ?? m.avatar : null
              return (
                <g key={`${m.kind}-${m.territory}`} transform={`translate(${x},${y}) scale(${1 / k})`} pointerEvents="none">
                  <circle r={TOKEN_R + 6} fill="none" stroke={INK.goldBright} strokeWidth={1.2} className="cheondo-pulse" />
                  <circle r={TOKEN_R} fill="#0b0c0f" stroke={INK.goldBright} strokeWidth={2} />
                  {src ? (
                    <image href={src} x={-(TOKEN_R - 2)} y={-(TOKEN_R - 2)} width={(TOKEN_R - 2) * 2} height={(TOKEN_R - 2) * 2} clipPath="url(#cheondo-token-clip)" preserveAspectRatio="xMidYMid slice">
                      {m.name && <title>{m.name}</title>}
                    </image>
                  ) : (
                    <path d="M -1 -9 L -1 9 M -1 -9 L 9 -5 L -1 -1" stroke={INK.goldBright} strokeWidth={2} fill={INK.seal} />
                  )}
                </g>
              )
            }
            if (m.kind === 'lead') {
              // 찾아갈 인물 — 금빛 점선 고리와 이름
              return (
                <g key={`${m.kind}-${m.territory}`} transform={`translate(${x},${y}) scale(${1 / k})`} pointerEvents="none">
                  <circle r={15} fill="none" stroke={INK.goldBright} strokeWidth={1.6} strokeDasharray="4 3" className="cheondo-spin" />
                  {m.name && <text y={28} textAnchor="middle" fontSize={10} fontWeight={800} fill={INK.goldBright} stroke="#07080a" strokeWidth={3} paintOrder="stroke">{m.name}</text>}
                </g>
              )
            }
            if (m.kind === 'empty') {
              // 빈 성 — 점 둘레에 끊긴 붉은 고리
              return (
                <g key={`${m.kind}-${m.territory}`} transform={`translate(${x},${y}) scale(${1 / k})`} pointerEvents="none">
                  <circle r={13} fill="none" stroke={INK.sealBright} strokeWidth={1.6} strokeDasharray="3 3" />
                  {emptyLabel && <text y={24} textAnchor="middle" fontSize={10} fontWeight={800} fill="#ffb8a6" stroke="#07080a" strokeWidth={3} paintOrder="stroke">{emptyLabel}</text>}
                </g>
              )
            }
            return (
              <g key={`${m.kind}-${m.territory}`} transform={`translate(${x},${y}) scale(${1 / k})`} pointerEvents="none">
                <circle r={14} fill="none" stroke={INK.sealBright} strokeWidth={2} className="cheondo-pulse" />
                <path d="M -5 -5 L 5 5 M 5 -5 L -5 5" stroke={INK.sealBright} strokeWidth={2.2} />
              </g>
            )
          })}
        </g>
      </svg>
      {hovered && hoverPos && (
        <div
          className="pointer-events-none absolute whitespace-nowrap border px-2.5 py-1.5 text-[12px]"
          style={{
            left: Math.min(size.width - 160, Math.max(8, hoverPos[0] + 16)),
            top: Math.max(8, hoverPos[1] - 46),
            background: 'rgba(10,11,14,0.94)',
            borderColor: INK.line,
            color: INK.text,
          }}
        >
          <div className="font-bold">{labelOf(hovered.id)}</div>
          <div style={{ color: INK.sub }}>{ownerName ? ownerName(hovered.owner) : hovered.owner ?? '—'}</div>
        </div>
      )}
    </div>
  )
})

function starPath(r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.45
    pts.push(`${Math.cos(a) * rr},${Math.sin(a) * rr}`)
  }
  return `M${pts.join('L')}Z`
}
