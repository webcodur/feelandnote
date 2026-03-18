'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import type { Faction, TerritoryId, RegionId } from '@/lib/game/suikoden/types'
import { TERRITORIES, REGIONS } from '@/lib/game/suikoden/constants'
import { getSuikodenText, stripSuikodenFactionSuffix } from '../i18n'
import type { Props, TopoData, RenderContext } from './types'
import {
  COUNTRY_TO_REGION, TERRITORY_MAP, REGION_MAP, isPointVisible,
} from './constants'
import { renderMap } from './sections/renderMap'

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
  const zoomRef = useRef(0.45)
  const getScale = () => Math.min(sizeRef.current.w, sizeRef.current.h) * zoomRef.current
  const isDraggingRef = useRef(false)
  const didDragRef = useRef(false)
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

  const currentRegionId = state.wandering?.currentRegionId ?? null

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
      const region = REGION_MAP.get(currentRegionId)
      if (region) {
        const [lat, lng] = region.latlng
        rotationRef.current = [-lng, -lat]
      }
    } else if (phase === 'strategy' && viewingTerritoryId) {
      const t = TERRITORY_MAP.get(viewingTerritoryId)
      if (t) {
        const [lat, lng] = t.latlng
        rotationRef.current = [-lng, -lat]
      }
    }
  }, [topoData, phase, currentRegionId, viewingTerritoryId])

  // ── focusTerritoryId 변경 시 지구본 회전 ──
  useEffect(() => {
    if (!focusTerritoryId) return
    const t = TERRITORY_MAP.get(focusTerritoryId)
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

    const countries = countriesRef.current
    if (!countries) return

    const playerTerritoryIds = new Set(playerFaction?.territories.map(t => t.id) ?? []) as Set<TerritoryId>

    const rc: RenderContext = {
      ctx, w, h, rotation, projection, path,
      state, playerFaction, playerFactionId,
      playerTerritoryIds,
      viewingTerritoryId, selectedTerritoryId,
      hoverTerritory, hoverRegion,
      phase, currentRegionId,
      pulse: pulseRef.current,
      getOwner, territoryLabel, regionLabel, ownerLabelText, text,
      countries,
    }

    renderMap(rc, meshRef.current)
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

  // ── 펄스 애니메이션 루프 ──
  const hasPlayerTerritories = (playerFaction?.territories.length ?? 0) > 0
  useEffect(() => {
    if (!hasPlayerTerritories) {
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

  // ── 휠 줌 ──
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

  const handleMouseMove2 = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current) return
    const hit = getHitTerritory(e.clientX, e.clientY)
    setHoverTerritory(hit)

    if (!hit) {
      const regionHit = getHitRegion(e.clientX, e.clientY)
      setHoverRegion(regionHit)
    } else {
      const t = TERRITORY_MAP.get(hit)
      setHoverRegion(t?.regionId ?? null)
    }
  }, [getHitTerritory, getHitRegion])

  const handleMouseLeave = useCallback(() => {
    setHoverTerritory(null)
    setHoverRegion(null)
  }, [])

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
    if (phase === 'wandering' && currentRegionId) {
      const region = REGION_MAP.get(currentRegionId)
      if (region) {
        const [lat, lng] = region.latlng
        rotationRef.current = [-lng, -lat]
      }
    } else if (phase === 'strategy' && viewingTerritoryId) {
      const t = TERRITORY_MAP.get(viewingTerritoryId)
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
