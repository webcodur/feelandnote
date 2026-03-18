import * as d3 from 'd3'
import { TERRITORIES, REGIONS } from '@/lib/game/suikoden/constants'
import { stripSuikodenFactionSuffix } from '../../i18n'
import type { RenderContext } from '../types'
import {
  COUNTRY_TO_REGION, REGION_FILL, LAND_DEFAULT, BORDER_COLOR,
  DOT_NEUTRAL, GLOW_COLOR, lightenColor,
  TERRITORY_MAP, REGION_MAP, EDGES, isPointVisible,
} from '../constants'

// ── 대륙 country fill + 국경선 ──

function renderCountries(rc: RenderContext) {
  const { ctx, path, state, hoverRegion, phase, currentRegionId, countries } = rc

  const activeRSet = state.activeRegionIds.length > 0 ? new Set(state.activeRegionIds) : null
  for (const feat of countries.features) {
    const countryId = String(feat.id ?? '')
    const regionId = COUNTRY_TO_REGION[countryId]

    ctx.beginPath()
    path(feat)

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
}

// ── 연결선 (great arc) ──

function renderEdges(rc: RenderContext) {
  const { ctx, state, rotation, projection, playerTerritoryIds } = rc

  const activeTSet = state.activeTerritoryIds.length > 0 ? new Set(state.activeTerritoryIds) : null
  for (const [from, to] of EDGES) {
    if (activeTSet && (!activeTSet.has(from) || !activeTSet.has(to))) continue
    const tFrom = TERRITORY_MAP.get(from)!
    const tTo = TERRITORY_MAP.get(to)!

    if (!isPointVisible(tFrom.latlng, rotation) && !isPointVisible(tTo.latlng, rotation)) continue

    const p1 = projection(tFrom.latlng.slice().reverse() as [number, number])
    const p2 = projection(tTo.latlng.slice().reverse() as [number, number])
    if (!p1 || !p2) continue

    const bothPlayer = playerTerritoryIds.has(from) && playerTerritoryIds.has(to)
    ctx.beginPath()
    ctx.moveTo(p1[0], p1[1])

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
}

// ── 거점 dot + hover 레이블 ──

function renderTerritoryDots(rc: RenderContext) {
  const {
    ctx, rotation, projection, hoverTerritory, viewingTerritoryId,
    selectedTerritoryId, playerFactionId, getOwner, phase, territoryLabel, text, state,
  } = rc

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

    // 이름 레이블 (hover 시만)
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
}

// ── 펄스 + 깃발 ──

function renderPulseAndFlag(rc: RenderContext) {
  const { ctx, rotation, projection, playerTerritoryIds, pulse, selectedTerritoryId, viewingTerritoryId } = rc

  // 펄스: 내 거점에만
  for (const tId of playerTerritoryIds) {
    const tDef = TERRITORY_MAP.get(tId)
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

  // 깃발: 현재 살펴보는 거점
  const flagTerritoryId = selectedTerritoryId ?? viewingTerritoryId
  if (flagTerritoryId) {
    const ft = TERRITORY_MAP.get(flagTerritoryId)
    if (ft && isPointVisible(ft.latlng, rotation)) {
      const fpos = projection([ft.latlng[1], ft.latlng[0]])
      if (fpos) {
        const fx = fpos[0], fy = fpos[1]
        ctx.beginPath()
        ctx.moveTo(fx, fy - 4)
        ctx.lineTo(fx, fy - 18)
        ctx.strokeStyle = '#fef3c7'
        ctx.lineWidth = 1.5
        ctx.stroke()
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
}

// ── 우하단 HUD ──

function renderHUD(rc: RenderContext) {
  const {
    ctx, w, h, phase, currentRegionId, viewingTerritoryId,
    hoverTerritory, hoverRegion, playerFactionId,
    getOwner, ownerLabelText, territoryLabel, regionLabel, text,
  } = rc

  let hudLocationLabel = ''
  if (phase === 'wandering' && currentRegionId) {
    hudLocationLabel = currentRegionId ? regionLabel(currentRegionId) : ''
  } else if (phase === 'strategy' && viewingTerritoryId) {
    hudLocationLabel = viewingTerritoryId ? territoryLabel(viewingTerritoryId) : ''
  }

  const hudLines: { label: string; value: string; color: string }[] = []

  if (hudLocationLabel) {
    hudLines.push({ label: text.map.current, value: hudLocationLabel, color: '#38bdf8' })
  }

  if (hoverTerritory) {
    const ht = TERRITORY_MAP.get(hoverTerritory)
    if (ht) {
      const hOwner = getOwner(ht.id)
      const ownerText = ownerLabelText(hOwner, hOwner?.id === playerFactionId)
      hudLines.push({ label: text.map.territory, value: `${territoryLabel(ht.id)} · ${ownerText}`, color: '#a8a29e' })
    }
  } else if (hoverRegion) {
    const hr = REGION_MAP.get(hoverRegion)
    if (hr) hudLines.push({ label: text.map.continent, value: regionLabel(hr.id), color: '#a8a29e' })
  }

  if (hudLines.length === 0) return

  const hudPadX = 8, hudPadY = 5, hudLineH = 16
  const hudH = hudPadY * 2 + hudLines.length * hudLineH

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

// ── 대륙 중심점 + 인접 연결선 ──

function renderRegionCenters(rc: RenderContext) {
  const { ctx, state, rotation, projection, hoverRegion } = rc

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
        const neighbor = REGION_MAP.get(neighborId)
        if (!neighbor) continue
        if (!isPointVisible(neighbor.latlng, rotation)) continue
        const nPos = projection(neighbor.latlng.slice().reverse() as [number, number])
        if (!nPos) continue

        const interp = d3.geoInterpolate(
          region.latlng.slice().reverse() as [number, number],
          neighbor.latlng.slice().reverse() as [number, number]
        )

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

    // 대륙 중심 다이아몬드
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
}

// ── 대륙 이름 (상단 중앙) ──

function renderRegionLabel(rc: RenderContext) {
  const { ctx, w, hoverRegion, regionLabel } = rc
  if (!hoverRegion) return

  const hr = REGION_MAP.get(hoverRegion)
  if (!hr) return

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

// ── 범례 (좌하단) ──

function renderLegend(rc: RenderContext) {
  const { ctx, h, playerFaction, text } = rc

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

  ctx.beginPath()
  ctx.arc(lx + 12, ly + 20, 3, 0, Math.PI * 2)
  ctx.fillStyle = playerFaction?.color ?? '#ef4444'
  ctx.fill()
  ctx.font = '9px sans-serif'
  ctx.fillStyle = '#d6d3d1'
  ctx.fillText(text.map.myTerritory, lx + 22, ly + 16)

  ctx.beginPath()
  ctx.arc(lx + 12, ly + 34, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = DOT_NEUTRAL
  ctx.fill()
  ctx.fillStyle = '#78716c'
  ctx.fillText(text.map.otherTerritory, lx + 22, ly + 30)
}

// ── 메인 렌더 함수 ──

export function renderMap(rc: RenderContext, mesh: GeoJSON.MultiLineString | null) {
  const { ctx, w, h, path } = rc

  // 바다
  ctx.fillStyle = '#0c0a09'
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

  renderCountries(rc)

  // 대륙 외곽선
  if (mesh) {
    ctx.beginPath()
    path(mesh)
    ctx.strokeStyle = 'rgba(168,162,158,0.2)'
    ctx.lineWidth = 0.3
    ctx.stroke()
  }

  renderEdges(rc)
  renderTerritoryDots(rc)
  renderPulseAndFlag(rc)
  renderHUD(rc)
  renderRegionCenters(rc)
  renderRegionLabel(rc)
  renderLegend(rc)
}
