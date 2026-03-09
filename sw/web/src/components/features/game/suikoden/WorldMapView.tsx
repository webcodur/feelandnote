'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import type { GameState, Faction, TerritoryId, RegionId } from '@/lib/game/suikoden/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TopoData = any
import { TERRITORIES, REGIONS } from '@/lib/game/suikoden/constants'
import { getSuikodenText, stripSuikodenFactionSuffix } from './i18n'

interface Props {
  state: GameState
  viewingTerritoryId?: TerritoryId | null
  selectedTerritoryId?: TerritoryId | null
  onSelectTerritory: (id: TerritoryId) => void
  onSelectRegion?: (id: RegionId) => void
  phase: 'wandering' | 'strategy'
  /** 이 ID가 변경되면 해당 거점이 보이도록 지구본 회전 */
  focusTerritoryId?: TerritoryId | null
  /** focusTerritoryId가 같은 값이더라도 재트리거를 위한 키 */
  focusKey?: number
}

// ── 국가 ID → 게임 RegionId 매핑 ──

const COUNTRY_TO_REGION: Record<string, RegionId> = {
  // 동아시아
  '156': 'east_asia', '392': 'east_asia', '410': 'east_asia',
  '408': 'east_asia', '496': 'east_asia', '158': 'east_asia',
  // 동남아시아
  '704': 'southeast_asia', '764': 'southeast_asia', '116': 'southeast_asia',
  '104': 'southeast_asia', '608': 'southeast_asia', '360': 'southeast_asia',
  '458': 'southeast_asia', '702': 'southeast_asia', '418': 'southeast_asia',
  '096': 'southeast_asia', '626': 'southeast_asia',
  // 남아시아
  '356': 'south_asia', '050': 'south_asia', '144': 'south_asia',
  '524': 'south_asia', '586': 'south_asia', '064': 'south_asia',
  // 중앙아시아
  '398': 'central_asia', '860': 'central_asia', '795': 'central_asia',
  '417': 'central_asia', '762': 'central_asia', '004': 'central_asia',
  '643': 'central_asia', '804': 'central_asia', '616': 'central_asia',
  '112': 'central_asia', '642': 'central_asia', '348': 'central_asia',
  '268': 'central_asia', '051': 'central_asia', '031': 'central_asia',
  // 중동
  '364': 'middle_east', '368': 'middle_east', '682': 'middle_east',
  '792': 'middle_east', '818': 'middle_east', '376': 'middle_east',
  '760': 'middle_east', '422': 'middle_east', '784': 'middle_east',
  '400': 'middle_east', '512': 'middle_east', '887': 'middle_east',
  '196': 'middle_east', '414': 'middle_east', '048': 'middle_east',
  '634': 'middle_east', '275': 'middle_east',
  // 동유럽
  '300': 'east_europe', '100': 'east_europe', '688': 'east_europe',
  '191': 'east_europe', '203': 'east_europe', '703': 'east_europe',
  '040': 'east_europe', '705': 'east_europe', '070': 'east_europe',
  '807': 'east_europe', '008': 'east_europe', '499': 'east_europe',
  // 서유럽
  '380': 'west_europe', '250': 'west_europe', '826': 'west_europe',
  '276': 'west_europe', '724': 'west_europe', '620': 'west_europe',
  '528': 'west_europe', '056': 'west_europe', '756': 'west_europe',
  '372': 'west_europe', '442': 'west_europe', '752': 'west_europe',
  '578': 'west_europe', '208': 'west_europe', '246': 'west_europe',
  '440': 'west_europe', '428': 'west_europe', '233': 'west_europe',
  '498': 'west_europe', '352': 'west_europe',
  '304': 'west_europe',
  // 아프리카
  '012': 'africa', '788': 'africa', '504': 'africa', '434': 'africa',
  '566': 'africa', '404': 'africa', '231': 'africa', '710': 'africa',
  '288': 'africa', '180': 'africa', '800': 'africa', '834': 'africa',
  '508': 'africa', '024': 'africa', '120': 'africa', '384': 'africa',
  '854': 'africa', '562': 'africa', '466': 'africa', '694': 'africa',
  '736': 'africa', '728': 'africa', '646': 'africa', '148': 'africa',
  '516': 'africa', '072': 'africa', '426': 'africa', '748': 'africa',
  '174': 'africa', '262': 'africa', '232': 'africa', '226': 'africa',
  '678': 'africa', '768': 'africa', '204': 'africa', '324': 'africa',
  '270': 'africa', '624': 'africa',
  '108': 'africa', '140': 'africa', '178': 'africa', '266': 'africa',
  '430': 'africa', '450': 'africa', '454': 'africa', '478': 'africa',
  '686': 'africa', '706': 'africa', '716': 'africa', '894': 'africa',
  '729': 'africa', '132': 'africa', '480': 'africa',
  '732': 'africa',
  // 아메리카
  '840': 'americas', '124': 'americas', '484': 'americas',
  '076': 'americas', '032': 'americas', '152': 'americas',
  '170': 'americas', '604': 'americas', '862': 'americas',
  '218': 'americas', '068': 'americas', '600': 'americas',
  '858': 'americas', '328': 'americas', '740': 'americas',
  '192': 'americas', '332': 'americas', '214': 'americas',
  '388': 'americas', '780': 'americas', '591': 'americas',
  '188': 'americas', '340': 'americas', '320': 'americas',
  '558': 'americas', '222': 'americas',
  '044': 'americas', '052': 'americas', '084': 'americas',
  '474': 'americas', '630': 'americas', '660': 'americas',
  '238': 'americas',
  // 오세아니아
  '036': 'oceania', '554': 'oceania', '598': 'oceania',
  '242': 'oceania', '090': 'oceania', '548': 'oceania',
  '776': 'oceania', '882': 'oceania', '584': 'oceania',
  '540': 'oceania',
  // 특수
  '260': 'africa', '010': 'oceania',
}

// Region 색상 (반투명 fill)
const REGION_FILL: Record<RegionId, string> = {
  east_asia:      'rgba(239,68,68,0.15)',
  southeast_asia: 'rgba(249,115,22,0.15)',
  south_asia:     'rgba(234,179,8,0.15)',
  central_asia:   'rgba(132,204,22,0.15)',
  middle_east:    'rgba(34,197,94,0.15)',
  east_europe:    'rgba(6,182,212,0.15)',
  west_europe:    'rgba(59,130,246,0.15)',
  africa:         'rgba(139,92,246,0.15)',
  americas:       'rgba(236,72,153,0.15)',
  oceania:        'rgba(245,158,11,0.15)',
}

/** hex 색상을 밝게 보정 (hover용) */
function lightenColor(hex: string, amount: number): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return hex
  const r = Math.min(255, parseInt(c.slice(0, 2), 16) + Math.round(255 * amount))
  const g = Math.min(255, parseInt(c.slice(2, 4), 16) + Math.round(255 * amount))
  const b = Math.min(255, parseInt(c.slice(4, 6), 16) + Math.round(255 * amount))
  return `rgb(${r},${g},${b})`
}

const OCEAN_COLOR = '#0c0a09'
const LAND_DEFAULT = 'rgba(41,37,36,0.6)'
const BORDER_COLOR = 'rgba(120,113,108,0.3)'
const DOT_NEUTRAL = '#57534e'
const GLOW_COLOR = '#fbbf24'

// 거점/대륙 룩업 맵 (한 번만 계산)
const TERRITORY_MAP = new Map(TERRITORIES.map(t => [t.id, t]))
const REGION_MAP = new Map(REGIONS.map(r => [r.id, r]))

// 인접 엣지 집합 (한 번만 계산)
const EDGES: [TerritoryId, TerritoryId][] = []
const _seen = new Set<string>()
for (const t of TERRITORIES) {
  for (const n of t.neighbors) {
    const key = t.id < n ? `${t.id}-${n}` : `${n}-${t.id}`
    if (!_seen.has(key)) { _seen.add(key); EDGES.push([t.id, n as TerritoryId]) }
  }
}

/** 좌표가 현재 가시 반구(앞면)에 있는지 판별 */
function isPointVisible(latlng: [number, number], rotation: [number, number]): boolean {
  const [lat, lng] = latlng
  // rotation = [-lambda, -phi] → 중심점은 [-rotation[0], -rotation[1]]
  const centerLng = -rotation[0]
  const centerLat = -rotation[1]
  const dist = d3.geoDistance(
    [lng, lat],
    [centerLng, centerLat]
  )
  return dist < Math.PI / 2 // 90도 이내 = 가시 반구
}

export default function WorldMapView({
  state, viewingTerritoryId, selectedTerritoryId,
  onSelectTerritory, onSelectRegion, phase, focusTerritoryId, focusKey,
}: Props) {
  const locale = useLocale()
  const tS = useTranslations('rest.arena.suikoden')
  const text = getSuikodenText(locale)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [topoData, setTopoData] = useState<TopoData | null>(null)
  const [hoverTerritory, setHoverTerritory] = useState<TerritoryId | null>(null)
  const [hoverRegion, setHoverRegion] = useState<RegionId | null>(null)
  const rotationRef = useRef<[number, number]>([0, -20])
  const zoomRef = useRef(0.45)  // 줌 팩터 (컨테이너 크기 대비 비율)
  const getScale = () => Math.min(sizeRef.current.w, sizeRef.current.h) * zoomRef.current
  const isDraggingRef = useRef(false)
  const didDragRef = useRef(false) // 실제 드래그 발생 여부 (클릭 억제용)
  const dragStartRef = useRef({ x: 0, y: 0, r0: 0, r1: 0 })
  const rafRef = useRef<number>(0)
  const sizeRef = useRef({ w: 500, h: 400 })
  const canvasSizedRef = useRef({ w: 0, h: 0 })
  const pulseRef = useRef(0)
  const animatingRef = useRef(false)

  const playerFactionId = state.playerFactionId
  const playerFaction = state.factions.find(f => f.id === playerFactionId) ?? null
  const territoryLabel = useCallback((territoryId: TerritoryId) => tS(`territory.${territoryId}`), [tS])
  const regionLabel = useCallback((regionId: RegionId) => tS(`region.${regionId}`), [tS])
  const ownerLabelText = useCallback((owner: Faction | null, isPlayer: boolean) => {
    if (!owner) return text.map.unclaimed
    if (isPlayer) return text.map.ally
    return stripSuikodenFactionSuffix(owner.name)
  }, [text.map.ally, text.map.unclaimed])

  // ── 현재 region (방랑용) ──
  const currentRegionId = state.wandering?.currentRegionId ?? null

  // ── owner 룩업 ──
  const getOwner = useCallback((tId: TerritoryId): Faction | null =>
    state.factions.find(f => f.territories.some(t => t.id === tId)) ?? null
  , [state.factions])

  // ── TopoJSON 로드 + 파생 데이터 캐싱 ──
  const countriesRef = useRef<GeoJSON.FeatureCollection | null>(null)
  const meshRef = useRef<GeoJSON.MultiLineString | null>(null)
  const initialFocusDone = useRef(false)
  useEffect(() => {
    fetch('/data/world-110m.json')
      .then(r => r.json())
      .then((data: TopoData) => {
        countriesRef.current = topojson.feature(
          data, data.objects.countries
        ) as unknown as GeoJSON.FeatureCollection
        meshRef.current = topojson.mesh(data, data.objects.countries) as unknown as GeoJSON.MultiLineString
        setTopoData(data)
      })
      .catch(() => {})
  }, [])

  // ── 초기 로드 시 현재 위치로 자동 회전 ──
  useEffect(() => {
    if (!topoData || initialFocusDone.current) return
    initialFocusDone.current = true

    if (phase === 'wandering' && currentRegionId) {
      const region = REGION_MAP.get( currentRegionId)
      if (region) {
        const [lat, lng] = region.latlng
        rotationRef.current = [-lng, -lat]
      }
    } else if (phase === 'strategy' && viewingTerritoryId) {
      const t = TERRITORY_MAP.get( viewingTerritoryId)
      if (t) {
        const [lat, lng] = t.latlng
        rotationRef.current = [-lng, -lat]
      }
    }
  }, [topoData, phase, currentRegionId, viewingTerritoryId])

  // ── focusTerritoryId 변경 시 지구본 회전 ──
  useEffect(() => {
    if (!focusTerritoryId) return
    const t = TERRITORY_MAP.get( focusTerritoryId)
    if (!t) return
    const [lat, lng] = t.latlng
    rotationRef.current = [-lng, -lat]
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(renderFrame)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTerritoryId, focusKey])

  // ── Canvas 렌더링 ──
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !topoData) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w, h } = sizeRef.current
    const dpr = window.devicePixelRatio || 1
    // canvas 크기는 변경 시에만 재설정 (매 프레임 재설정 방지)
    if (canvasSizedRef.current.w !== w || canvasSizedRef.current.h !== h) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      canvasSizedRef.current = { w, h }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const rotation = rotationRef.current

    const projection = d3.geoOrthographic()
      .scale(getScale())
      .translate([w / 2, h / 2])
      .rotate(rotation as [number, number])
      .clipAngle(90)

    const path = d3.geoPath(projection, ctx)

    // 바다
    ctx.fillStyle = OCEAN_COLOR
    ctx.fillRect(0, 0, w, h)

    // 지구본 원형 배경
    const sphere: d3.GeoPermissibleObjects = { type: 'Sphere' }
    ctx.beginPath()
    path(sphere)
    ctx.fillStyle = '#1c1917'
    ctx.fill()
    ctx.strokeStyle = '#292524'
    ctx.lineWidth = 1
    ctx.stroke()

    // 대륙 — country 단위 fill (캐싱된 FeatureCollection 사용)
    const countries = countriesRef.current
    if (!countries) return

    const activeRSet = state.activeRegionIds.length > 0 ? new Set(state.activeRegionIds) : null
    for (const feat of countries.features) {
      const countryId = String(feat.id ?? '')
      const regionId = COUNTRY_TO_REGION[countryId]

      ctx.beginPath()
      path(feat)

      // 비활성 지역은 어둡게
      const isRegionActive = !activeRSet || (regionId != null && activeRSet.has(regionId))

      if (regionId && isRegionActive) {
        const isHoveredRegion = regionId === hoverRegion
        if (phase === 'wandering' && regionId === currentRegionId) {
          ctx.fillStyle = REGION_FILL[regionId].replace('0.15', '0.35')
        } else if (isHoveredRegion) {
          ctx.fillStyle = REGION_FILL[regionId].replace('0.15', '0.3')
        } else {
          ctx.fillStyle = REGION_FILL[regionId] ?? LAND_DEFAULT
        }
      } else {
        ctx.fillStyle = LAND_DEFAULT
      }
      ctx.fill()

      // 호버 대륙 국가 경계선 강조 (활성 지역만)
      const countryRegion = COUNTRY_TO_REGION[countryId]
      if (countryRegion === hoverRegion && isRegionActive) {
        ctx.strokeStyle = REGION_FILL[countryRegion].replace('0.15', '0.6')
        ctx.lineWidth = 1
      } else {
        ctx.strokeStyle = BORDER_COLOR
        ctx.lineWidth = 0.5
      }
      ctx.stroke()
    }

    // 대륙 외곽선 (캐싱된 mesh 사용)
    if (meshRef.current) {
      ctx.beginPath()
      path(meshRef.current)
      ctx.strokeStyle = 'rgba(168,162,158,0.2)'
      ctx.lineWidth = 0.3
      ctx.stroke()
    }

    // 연결선 (great arc) — 활성 거점 간만, 양쪽 다 가시 반구에 있을 때만
    const activeTSet = state.activeTerritoryIds.length > 0 ? new Set(state.activeTerritoryIds) : null
    const playerTerritoryIds = new Set(playerFaction?.territories.map(t => t.id) ?? [])
    for (const [from, to] of EDGES) {
      if (activeTSet && (!activeTSet.has(from) || !activeTSet.has(to))) continue
      const tFrom = TERRITORY_MAP.get( from)!
      const tTo = TERRITORY_MAP.get( to)!

      if (!isPointVisible(tFrom.latlng, rotation) && !isPointVisible(tTo.latlng, rotation)) continue

      const p1 = projection(tFrom.latlng.slice().reverse() as [number, number])
      const p2 = projection(tTo.latlng.slice().reverse() as [number, number])
      if (!p1 || !p2) continue

      const bothPlayer = playerTerritoryIds.has(from) && playerTerritoryIds.has(to)
      ctx.beginPath()
      ctx.moveTo(p1[0], p1[1])

      // Great arc interpolation — 각 세그먼트가 가시 반구에 있는지 체크
      const interp = d3.geoInterpolate(
        tFrom.latlng.slice().reverse() as [number, number],
        tTo.latlng.slice().reverse() as [number, number]
      )
      let penUp = false
      for (let t = 0.05; t <= 1; t += 0.05) {
        const geoCoord = interp(t)
        const ptVisible = d3.geoDistance(geoCoord, [-rotation[0], -rotation[1]]) < Math.PI / 2
        const pt = projection(geoCoord)
        if (pt && ptVisible) {
          if (penUp) { ctx.moveTo(pt[0], pt[1]); penUp = false }
          else ctx.lineTo(pt[0], pt[1])
        } else {
          penUp = true
        }
      }

      ctx.strokeStyle = bothPlayer ? 'rgba(217,119,6,0.5)' : 'rgba(68,64,60,0.3)'
      ctx.lineWidth = bothPlayer ? 1.5 : 0.8
      ctx.setLineDash(bothPlayer ? [4, 3] : [2, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 거점 dot — 활성 거점 중 가시 반구에 있는 것만 렌더링
    const activeTs = state.activeTerritoryIds.length > 0
      ? TERRITORIES.filter(t => state.activeTerritoryIds.includes(t.id))
      : TERRITORIES
    for (const territory of activeTs) {
      if (!isPointVisible(territory.latlng, rotation)) continue

      const [lat, lng] = territory.latlng
      const pos = projection([lng, lat])
      if (!pos) continue

      const owner = getOwner(territory.id)
      const isPlayer = owner?.id === playerFactionId
      const isViewing = territory.id === viewingTerritoryId
      const isSelected = territory.id === selectedTerritoryId
      const isHover = territory.id === hoverTerritory
      const color = owner?.color ?? DOT_NEUTRAL

      const baseR = isPlayer ? 4.5 : owner ? 3.5 : 2.5
      const r = isHover ? baseR + 1.5 : baseR

      // glow 효과 (hover, viewing, selected)
      if (isHover || isViewing || isSelected) {
        ctx.beginPath()
        ctx.arc(pos[0], pos[1], r + 4, 0, Math.PI * 2)
        ctx.fillStyle = isViewing
          ? 'rgba(251,191,36,0.25)'
          : isHover
            ? `rgba(255,255,255,0.12)`
            : `${color}33`
        ctx.fill()
      }

      // 점
      ctx.beginPath()
      ctx.arc(pos[0], pos[1], r, 0, Math.PI * 2)
      ctx.fillStyle = isHover ? lightenColor(color, 0.3) : color
      ctx.fill()

      if (isViewing) {
        ctx.strokeStyle = GLOW_COLOR
        ctx.lineWidth = 2
        ctx.stroke()
      } else if (isHover) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else if (isPlayer) {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // 이름 레이블 (hover 시만 — 거점 위 툴팁)
      if (isHover) {
        const label = territoryLabel(territory.id)
        ctx.font = 'bold 11px sans-serif'
        const metrics = ctx.measureText(label)
        const tw = metrics.width + 8
        const th = 18
        const tx = pos[0] - tw / 2
        const ty = pos[1] - r - th - 4

        ctx.fillStyle = 'rgba(12,10,9,0.85)'
        ctx.beginPath()
        ctx.roundRect(tx, ty, tw, th, 3)
        ctx.fill()
        ctx.strokeStyle = isViewing ? GLOW_COLOR : '#57534e'
        ctx.lineWidth = 0.8
        ctx.stroke()

        ctx.fillStyle = isViewing ? '#fef3c7' : '#e7e5e4'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, pos[0], ty + th / 2)

        // strategy: 소유자 + 건물수 표시
        if (phase === 'strategy') {
          const ownerLabel = owner
            ? isPlayer ? `★ ${text.map.ally}` : stripSuikodenFactionSuffix(owner.name)
            : text.map.unclaimed
          const tData = owner?.territories.find(t => t.id === territory.id)
          const buildCount = tData ? tData.buildingCards.length : 0
          const subLabel = owner ? `${ownerLabel} · ${text.map.buildings(buildCount)}` : ownerLabel

          ctx.font = '9px sans-serif'
          const sm = ctx.measureText(subLabel)
          const sw = sm.width + 8
          const sh = 14
          const sx = pos[0] - sw / 2
          const sy = ty - sh - 2

          ctx.fillStyle = 'rgba(12,10,9,0.8)'
          ctx.beginPath()
          ctx.roundRect(sx, sy, sw, sh, 2)
          ctx.fill()

          ctx.fillStyle = owner ? (isPlayer ? '#fcd34d' : '#a8a29e') : '#57534e'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(subLabel, pos[0], sy + sh / 2)
        }
      }
    }

    // ── 펄스: 내 거점에만 ──
    const pulse = pulseRef.current
    let hudLocationLabel = ''

    if (phase === 'wandering' && currentRegionId) {
      hudLocationLabel = currentRegionId ? regionLabel(currentRegionId) : ''
    } else if (phase === 'strategy' && viewingTerritoryId) {
      hudLocationLabel = viewingTerritoryId ? territoryLabel(viewingTerritoryId) : ''
    }

    for (const tId of playerTerritoryIds) {
      const tDef = TERRITORY_MAP.get( tId)
      if (!tDef || !isPointVisible(tDef.latlng, rotation)) continue
      const pos = projection([tDef.latlng[1], tDef.latlng[0]])
      if (!pos) continue

      const r1 = 4 + pulse * 10
      const alpha1 = 0.4 * (1 - pulse)
      ctx.beginPath()
      ctx.arc(pos[0], pos[1], r1, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(239,68,68,${alpha1})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // ── 깃발: 현재 살펴보는 거점 ──
    const flagTerritoryId = selectedTerritoryId ?? viewingTerritoryId
    if (flagTerritoryId) {
      const ft = TERRITORY_MAP.get( flagTerritoryId)
      if (ft && isPointVisible(ft.latlng, rotation)) {
        const fpos = projection([ft.latlng[1], ft.latlng[0]])
        if (fpos) {
          const fx = fpos[0], fy = fpos[1]
          // 깃대
          ctx.beginPath()
          ctx.moveTo(fx, fy - 4)
          ctx.lineTo(fx, fy - 18)
          ctx.strokeStyle = '#fef3c7'
          ctx.lineWidth = 1.5
          ctx.stroke()
          // 깃발 삼각형
          ctx.beginPath()
          ctx.moveTo(fx, fy - 18)
          ctx.lineTo(fx + 8, fy - 15)
          ctx.lineTo(fx, fy - 12)
          ctx.closePath()
          ctx.fillStyle = '#fbbf24'
          ctx.fill()
        }
      }
    }

    // ── 우하단 HUD: 현재 위치 + 호버 정보 ──
    {
      const hudLines: { label: string; value: string; color: string }[] = []

      // 현재 위치
      if (hudLocationLabel) {
        hudLines.push({ label: text.map.current, value: hudLocationLabel, color: '#38bdf8' })
      }

      // 호버 거점 정보
      if (hoverTerritory) {
        const ht = TERRITORY_MAP.get( hoverTerritory)
        if (ht) {
          const hOwner = getOwner(ht.id)
          const ownerText = ownerLabelText(hOwner, hOwner?.id === playerFactionId)
          hudLines.push({ label: text.map.territory, value: `${territoryLabel(ht.id)} · ${ownerText}`, color: '#a8a29e' })
        }
      } else if (hoverRegion) {
        const hr = REGION_MAP.get( hoverRegion)
        if (hr) hudLines.push({ label: text.map.continent, value: regionLabel(hr.id), color: '#a8a29e' })
      }

      if (hudLines.length > 0) {
        const hudPadX = 8, hudPadY = 5, hudLineH = 16
        const hudH = hudPadY * 2 + hudLines.length * hudLineH

        // 최대 너비 계산
        ctx.font = '9px sans-serif'
        let maxW = 0
        for (const line of hudLines) {
          const labelW = ctx.measureText(`${line.label}  `).width
          ctx.font = 'bold 10px sans-serif'
          const valW = ctx.measureText(line.value).width
          ctx.font = '9px sans-serif'
          maxW = Math.max(maxW, labelW + valW)
        }
        const hudW = maxW + hudPadX * 2 + 4

        const hx = w - hudW - 10
        const hy = h - hudH - 10

        ctx.fillStyle = 'rgba(12,10,9,0.85)'
        ctx.beginPath()
        ctx.roundRect(hx, hy, hudW, hudH, 4)
        ctx.fill()
        ctx.strokeStyle = '#292524'
        ctx.lineWidth = 0.8
        ctx.stroke()

        for (let i = 0; i < hudLines.length; i++) {
          const line = hudLines[i]
          const ly = hy + hudPadY + i * hudLineH

          ctx.font = '9px sans-serif'
          ctx.fillStyle = '#57534e'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.fillText(line.label, hx + hudPadX, ly + 1)

          const labelW = ctx.measureText(line.label + '  ').width
          ctx.font = 'bold 10px sans-serif'
          ctx.fillStyle = line.color
          ctx.fillText(line.value, hx + hudPadX + labelW, ly)
        }
      }
    }

    // ── 대륙 중심점 + 인접 연결선 ──
    const activeRs = state.activeRegionIds.length > 0
      ? REGIONS.filter(r => state.activeRegionIds.includes(r.id))
      : REGIONS
    for (const region of activeRs) {
      if (!isPointVisible(region.latlng, rotation)) continue
      const pos = projection(region.latlng.slice().reverse() as [number, number])
      if (!pos) continue

      const isHovered = region.id === hoverRegion

      // 인접 대륙 연결선 (hover 시, 활성 지역만)
      if (isHovered) {
        for (const neighborId of region.neighbors) {
          if (state.activeRegionIds.length > 0 && !state.activeRegionIds.includes(neighborId)) continue
          const neighbor = REGION_MAP.get( neighborId)
          if (!neighbor) continue
          if (!isPointVisible(neighbor.latlng, rotation)) continue
          const nPos = projection(neighbor.latlng.slice().reverse() as [number, number])
          if (!nPos) continue

          // great arc 보간
          const interp = d3.geoInterpolate(
            region.latlng.slice().reverse() as [number, number],
            neighbor.latlng.slice().reverse() as [number, number]
          )

          // 연결선 (약한 점선)
          ctx.beginPath()
          ctx.moveTo(pos[0], pos[1])
          let penUp = false
          for (let t = 0.02; t <= 1; t += 0.02) {
            const gc = interp(t)
            const vis = d3.geoDistance(gc, [-rotation[0], -rotation[1]]) < Math.PI / 2
            const pt = projection(gc)
            if (pt && vis) {
              if (penUp) { ctx.moveTo(pt[0], pt[1]); penUp = false }
              else ctx.lineTo(pt[0], pt[1])
            } else { penUp = true }
          }
          ctx.strokeStyle = 'rgba(251,191,36,0.3)'
          ctx.lineWidth = 1
          ctx.setLineDash([4, 4])
          ctx.stroke()
          ctx.setLineDash([])

          // 인접 대륙 중심점 (다이아몬드)
          const ns = 2.5
          ctx.beginPath()
          ctx.moveTo(nPos[0], nPos[1] - ns)
          ctx.lineTo(nPos[0] + ns, nPos[1])
          ctx.lineTo(nPos[0], nPos[1] + ns)
          ctx.lineTo(nPos[0] - ns, nPos[1])
          ctx.closePath()
          ctx.fillStyle = 'rgba(251,191,36,0.25)'
          ctx.fill()
          ctx.strokeStyle = 'rgba(251,191,36,0.4)'
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      }

      // 대륙 중심 다이아몬드 (◇)
      const s = isHovered ? 4.5 : 3
      if (isHovered) {
        ctx.beginPath()
        const gs = 8
        ctx.moveTo(pos[0], pos[1] - gs)
        ctx.lineTo(pos[0] + gs, pos[1])
        ctx.lineTo(pos[0], pos[1] + gs)
        ctx.lineTo(pos[0] - gs, pos[1])
        ctx.closePath()
        ctx.fillStyle = 'rgba(251,191,36,0.15)'
        ctx.fill()
      }
      ctx.beginPath()
      ctx.moveTo(pos[0], pos[1] - s)
      ctx.lineTo(pos[0] + s, pos[1])
      ctx.lineTo(pos[0], pos[1] + s)
      ctx.lineTo(pos[0] - s, pos[1])
      ctx.closePath()
      ctx.fillStyle = isHovered ? '#fbbf24' : 'rgba(94,234,212,0.35)'
      ctx.fill()
      ctx.strokeStyle = isHovered ? '#fbbf24' : 'rgba(94,234,212,0.25)'
      ctx.lineWidth = 0.8
      ctx.stroke()

    }

    // ── 대륙 이름: 지도 상단 중앙 ──
    if (hoverRegion) {
      const hr = REGION_MAP.get( hoverRegion)
      if (hr) {
        ctx.font = 'bold 11px sans-serif'
        const label = regionLabel(hr.id)
        const metrics = ctx.measureText(label)
        const tw = metrics.width + 16
        const th = 20
        const tx = w / 2 - tw / 2
        const ty = 8

        ctx.fillStyle = 'rgba(12,10,9,0.85)'
        ctx.beginPath()
        ctx.roundRect(tx, ty, tw, th, 4)
        ctx.fill()
        ctx.strokeStyle = 'rgba(251,191,36,0.4)'
        ctx.lineWidth = 0.8
        ctx.stroke()

        ctx.fillStyle = '#fef3c7'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, w / 2, ty + th / 2)
      }
    }

    // 범례 (좌하단)
    const lx = 10, ly = h - 52
    ctx.fillStyle = 'rgba(12,10,9,0.8)'
    ctx.beginPath()
    ctx.roundRect(lx, ly, 120, 46, 4)
    ctx.fill()
    ctx.strokeStyle = '#292524'
    ctx.lineWidth = 0.8
    ctx.stroke()

    ctx.font = 'bold 9px sans-serif'
    ctx.fillStyle = '#78716c'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(text.map.legend, lx + 6, ly + 4)

    // 내 영토
    ctx.beginPath()
    ctx.arc(lx + 12, ly + 20, 3, 0, Math.PI * 2)
    ctx.fillStyle = playerFaction?.color ?? '#ef4444'
    ctx.fill()
    ctx.font = '9px sans-serif'
    ctx.fillStyle = '#d6d3d1'
    ctx.fillText(text.map.myTerritory, lx + 22, ly + 16)

    // 무주지/타
    ctx.beginPath()
    ctx.arc(lx + 12, ly + 34, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = DOT_NEUTRAL
    ctx.fill()
    ctx.fillStyle = '#78716c'
    ctx.fillText(text.map.otherTerritory, lx + 22, ly + 30)

  }, [topoData, state, playerFaction, playerFactionId, viewingTerritoryId, selectedTerritoryId, hoverTerritory, hoverRegion, getOwner, phase, currentRegionId, territoryLabel, regionLabel, ownerLabelText, text])

  // ── 리사이즈 ──
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        const h = Math.max(280, Math.min(w * 0.85, 500))
        sizeRef.current = { w, h }
        renderFrame()
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [renderFrame])

  // ── 펄스 애니메이션 루프 (내 거점이 있을 때만) ──
  const hasPlayerTerritories = (playerFaction?.territories.length ?? 0) > 0
  useEffect(() => {
    if (!hasPlayerTerritories) {
      // 거점 없으면 정적 렌더 1회
      renderFrame()
      return
    }
    animatingRef.current = true
    let lastTime = 0
    const tick = (time: number) => {
      if (!animatingRef.current) return
      if (time - lastTime > 50) {
        pulseRef.current = (time % 2000) / 2000
        renderFrame()
        lastTime = time
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { animatingRef.current = false; cancelAnimationFrame(rafRef.current) }
  }, [renderFrame, hasPlayerTerritories])

  // ── 휠 줌 (native listener — passive: false로 페이지 스크롤 차단) ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY < 0 ? 0.03 : -0.03
      zoomRef.current = Math.max(0.2, Math.min(1.2, zoomRef.current + delta))
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(renderFrame)
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [renderFrame])

  // ── 드래그 회전 ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true
    didDragRef.current = false
    dragStartRef.current = {
      x: e.clientX, y: e.clientY,
      r0: rotationRef.current[0], r1: rotationRef.current[1],
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const rawDx = e.clientX - dragStartRef.current.x
    const rawDy = e.clientY - dragStartRef.current.y
    if (!didDragRef.current && (Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3)) {
      didDragRef.current = true
    }
    const sensitivity = 0.3
    const dx = rawDx * sensitivity
    const dy = rawDy * sensitivity
    rotationRef.current = [
      dragStartRef.current.r0 + dx,
      Math.max(-80, Math.min(80, dragStartRef.current.r1 - dy)),
    ]
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(renderFrame)
  }, [renderFrame])

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // ── hover / click ──
  const getHitTerritory = useCallback((clientX: number, clientY: number): TerritoryId | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top

    const { w, h } = sizeRef.current
    const rotation = rotationRef.current
    const projection = d3.geoOrthographic()
      .scale(getScale())
      .translate([w / 2, h / 2])
      .rotate(rotation as [number, number])
      .clipAngle(90)

    let closest: TerritoryId | null = null
    let closestDist = Infinity
    const HIT_RADIUS = 18

    const hitTargets = state.activeTerritoryIds.length > 0
      ? TERRITORIES.filter(t => state.activeTerritoryIds.includes(t.id))
      : TERRITORIES
    for (const t of hitTargets) {
      // 반대편 거점 무시
      if (!isPointVisible(t.latlng, rotation)) continue

      const [lat, lng] = t.latlng
      const pos = projection([lng, lat])
      if (!pos) continue
      const dx = mx - pos[0]
      const dy = my - pos[1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < HIT_RADIUS && dist < closestDist) {
        closest = t.id
        closestDist = dist
      }
    }
    return closest
  }, [])

  // 마우스 위치에서 대륙 감지
  const getHitRegion = useCallback((clientX: number, clientY: number): RegionId | null => {
    const canvas = canvasRef.current
    if (!canvas || !topoData) return null
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const { w, h } = sizeRef.current
    const projection = d3.geoOrthographic()
      .scale(getScale())
      .translate([w / 2, h / 2])
      .rotate(rotationRef.current as [number, number])
      .clipAngle(90)
    const coords = projection.invert?.([mx, my])
    if (!coords) return null

    const cf = countriesRef.current
    if (!cf) return null
    for (const feat of cf.features) {
      if (d3.geoContains(feat, coords)) {
        return COUNTRY_TO_REGION[String(feat.id ?? '')] ?? null
      }
    }
    return null
  }, [topoData])

  // hover
  const handleMouseMove2 = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current) return
    const hit = getHitTerritory(e.clientX, e.clientY)
    setHoverTerritory(hit)

    // 거점 hover가 없으면 대륙 감지
    if (!hit) {
      const regionHit = getHitRegion(e.clientX, e.clientY)
      setHoverRegion(regionHit)
    } else {
      // 거점 hover 중엔 해당 거점의 대륙
      const t = TERRITORY_MAP.get( hit)
      setHoverRegion(t?.regionId ?? null)
    }
  }, [getHitTerritory, getHitRegion])

  const handleMouseLeave = useCallback(() => {
    setHoverTerritory(null)
    setHoverRegion(null)
  }, [])

  // click
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current || didDragRef.current) return
    const hit = getHitTerritory(e.clientX, e.clientY)

    if (phase === 'strategy' && hit) {
      onSelectTerritory(hit)
      return
    }

    if (phase === 'wandering') {
      if (hit) {
        onSelectTerritory(hit)
        return
      }

      // 거점 없는 대륙 클릭: canvas 좌표 → 역투영 → 국가 검색
      if (!hit && onSelectRegion) {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const { w, h } = sizeRef.current
        const projection = d3.geoOrthographic()
          .scale(getScale())
          .translate([w / 2, h / 2])
          .rotate(rotationRef.current as [number, number])
          .clipAngle(90)
        const coords = projection.invert?.([mx, my])
        if (!coords || !topoData) return

        const cf = countriesRef.current
        if (!cf) return
        for (const feat of cf.features) {
          if (d3.geoContains(feat, coords)) {
            const regionId = COUNTRY_TO_REGION[String(feat.id ?? '')]
            if (regionId) onSelectRegion(regionId)
            return
          }
        }
      }
    }
  }, [phase, onSelectTerritory, onSelectRegion, getHitTerritory, topoData])

  // ── 리셋 ──
  const handleReset = useCallback(() => {
    // 내 현재 위치로 복귀
    if (phase === 'wandering' && currentRegionId) {
      const region = REGION_MAP.get( currentRegionId)
      if (region) {
        const [lat, lng] = region.latlng
        rotationRef.current = [-lng, -lat]
      }
    } else if (phase === 'strategy' && viewingTerritoryId) {
      const t = TERRITORY_MAP.get( viewingTerritoryId)
      if (t) {
        const [lat, lng] = t.latlng
        rotationRef.current = [-lng, -lat]
      }
    }
    zoomRef.current = 0.45
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(renderFrame)
  }, [renderFrame, phase, currentRegionId, viewingTerritoryId])

  return (
    <div
      ref={containerRef}
      className="bg-stone-900 border border-stone-700 rounded overflow-hidden relative select-none"
    >
      {/* 컨트롤 */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => {
            zoomRef.current = Math.min(1.2, zoomRef.current + 0.05)
            cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(renderFrame)
          }}
          className="w-6 h-6 bg-stone-800/90 border border-stone-600 rounded text-text-primary hover:bg-stone-700 hover:text-white text-sm font-bold flex items-center justify-center"
          title={text.map.zoomIn}
        >+</button>
        <button
          onClick={() => {
            zoomRef.current = Math.max(0.2, zoomRef.current - 0.05)
            cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(renderFrame)
          }}
          className="w-6 h-6 bg-stone-800/90 border border-stone-600 rounded text-text-primary hover:bg-stone-700 hover:text-white text-sm font-bold flex items-center justify-center"
          title={text.map.zoomOut}
        >−</button>
        <button
          onClick={handleReset}
          className="w-6 h-6 bg-stone-800/90 border border-stone-600 rounded text-text-secondary hover:bg-stone-700 hover:text-white text-[9px] font-bold flex items-center justify-center"
          title={text.map.reset}
        >↺</button>
      </div>

      <div className="absolute top-2 left-2 z-10 text-[9px] text-text-secondary pointer-events-none">
        {text.map.controls}
      </div>

      <canvas
        ref={canvasRef}
        style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab', display: 'block', width: '100%' }}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => { handlePointerMove(e); handleMouseMove2(e) }}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { handlePointerUp(); handleMouseLeave() }}
        onClick={handleClick}
      />
    </div>
  )
}
