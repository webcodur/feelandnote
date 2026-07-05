import React, { useContext } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../../Faction/constants'
import { nameHead } from '../../Faction/utils'
import { colorOf, clustersOf, GraphicBg, lighten, rgba, FramePadContext, CardPropsBase } from '../shared'
import type { FactionPerson } from '../../Faction/types'

export const MapCard: React.FC<CardPropsBase> = ({ script, episodeName, card, assetBase }) => {
  const { width, height } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const base = { fontFamily: FONT, color: '#e8e6e0', lineHeight: 1.5 } as const
  const { top: markPad, bottom: guidePad } = useContext(FramePadContext)

  const gi = card.groupIndex
  const g = script.groups[gi]
  const c = colorOf(g)
  const clusters = clustersOf(g)
  let ci = 0
  let local = card.personIndex ?? 0
  let person: FactionPerson | undefined = undefined

  if (card.personIndex != null) {
    for (let k = 0; k < clusters.length; k++) {
      const n = clusters[k].people.length
      if (local < n) { ci = k; break }
      local -= n
    }
    person = clusters[ci]?.people[local]
  }

  type MapRow = { label: string; sub?: string; depth: 0 | 1 | 2; active: boolean; dim: number }
  const rows: MapRow[] = []
  const visibleGroups = script.groups.filter(x => !x.disabled)
  const activeGroupIdx = visibleGroups.indexOf(g)
  visibleGroups.forEach((x, i) => {
    const gParts = (x.name ?? '').split('\n').map(t => t.trim()).filter(Boolean)
    rows.push({ label: gParts[0] || `세력 ${i + 1}`, sub: gParts.slice(1).join(' ') || undefined, depth: 0, active: x === g, dim: Math.abs(i - activeGroupIdx) })
    if (x !== g) return
    clusters.forEach((cl: any, k: number) => {
      rows.push({ label: nameHead(cl.label) || `그룹 ${k + 1}`, depth: 1, active: card.personIndex != null ? k === ci : false, dim: card.personIndex != null ? Math.abs(k - ci) : 1 })
      if (card.personIndex != null && k !== ci) return
      const ppl = (cl.people ?? []).filter((p: any) => !p.disabled)
      const activePersonIdx = person ? ppl.indexOf(person) : 0
      ppl.forEach((p: any, j: number) => rows.push({ label: p.name || `인물 ${j + 1}`, depth: 2, active: p === person, dim: card.personIndex != null ? Math.abs(j - activePersonIdx) : 1 }))
    })
  })

  const rowH = (row: MapRow): number => (row.active ? (row.depth === 2 ? r(42) : r(30)) : r(21))
  let activeCenter = 0
  let totalH = 0
  {
    let y = 0
    for (const row of rows) {
      const h = rowH(row)
      if (row.active && row.depth === 2) activeCenter = y + h / 2
      else if (row.active && row.depth === 1 && !activeCenter) activeCenter = y + h / 2
      else if (row.active && row.depth === 0 && !activeCenter) activeCenter = y + h / 2
      y += h
    }
    totalH = y
  }
  
  const listH = height - markPad - r(12 + 20) - guidePad
  const scroll = Math.min(Math.max(activeCenter - listH / 2, 0), Math.max(totalH - listH, 0))

  return (
    <AbsoluteFill style={{ ...base, overflow: 'hidden' }}>
      <GraphicBg c={c} r={r} />
      <div style={{ position: 'absolute', zIndex: 10, top: r(14), right: r(16), display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: r(7), fontFamily: FONT }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: r(6), fontSize: r(11.5), fontWeight: 900, letterSpacing: r(0.2),
          color: '#10130b', padding: `${r(6)}px ${r(11)}px`, borderRadius: r(999),
          background: `linear-gradient(180deg, ${lighten(c, 0.28)} 0%, ${c} 55%, rgba(0,0,0,0.22) 100%)`,
          boxShadow: `0 ${r(3)}px ${r(10)}px rgba(0,0,0,0.35), inset 0 ${r(1)}px 0 rgba(255,255,255,0.35)`,
        }}>
          <svg width={r(12)} height={r(12)} viewBox="0 0 24 24" fill="none" stroke="#10130b" strokeWidth={2.2} strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          feelandnote.com
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: r(6), fontSize: r(11.5), fontWeight: 900, letterSpacing: r(0.2),
          color: '#ffd9d9', padding: `${r(6)}px ${r(11)}px`, borderRadius: r(999),
          background: 'linear-gradient(180deg, #ff4b4b 0%, #e60000 55%, #b30000 100%)',
          boxShadow: `0 ${r(3)}px ${r(10)}px rgba(0,0,0,0.35), inset 0 ${r(1)}px 0 rgba(255,255,255,0.3)`,
        }}>
          <svg width={r(13)} height={r(13)} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#fff" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
            <path fill="#e60000" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          필앤노트
        </span>
      </div>
      <AbsoluteFill style={{ zIndex: 4, display: 'flex', flexDirection: 'column', padding: `${markPad}px ${r(26)}px ${r(20) + guidePad}px` }}>
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden', marginTop: r(12) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, transform: `translateY(${-scroll}px)` }}>
            {rows.map((row, i) => {
              const h = rowH(row)
              const opacity = row.active ? 1 : Math.max(0.14, 0.62 - row.dim * 0.13)
              const size = row.active ? (row.depth === 2 ? r(24) : r(16)) : r(12)
              return (
                <div key={i} style={{
                  height: h, display: 'flex', alignItems: 'center', gap: r(9),
                  paddingLeft: r(4) + row.depth * r(18), opacity,
                }}>
                  {row.active
                    ? <span style={{ width: r(4), height: size * 0.86, borderRadius: r(2), background: c, flexShrink: 0 }} />
                    : <span style={{ width: r(4), display: 'flex', justifyContent: 'center', flexShrink: 0, color: 'rgba(232,230,224,0.5)', fontSize: r(9) }}>·</span>}
                  <span style={{
                    fontSize: size, fontWeight: row.active ? 900 : 600, letterSpacing: row.active ? r(-0.6) : 0,
                    color: row.active ? '#fff' : '#e8e6e0', whiteSpace: 'nowrap',
                  }}>{row.label}</span>
                  {row.sub && (
                    <span style={{
                      fontSize: size * 0.78, fontWeight: 600, whiteSpace: 'nowrap',
                      color: row.active ? lighten(c, 0.45) : '#e8e6e0', opacity: row.active ? 1 : 0.6,
                    }}>{row.sub}</span>
                  )}
                </div>
              )
            })}
          </div>
          {scroll > 0 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: r(52), background: 'linear-gradient(180deg, rgba(6,7,10,1), rgba(6,7,10,0))' }} />
          )}
          {totalH - scroll > listH && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: r(52), background: 'linear-gradient(0deg, rgba(6,7,10,1), rgba(6,7,10,0))' }} />
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
