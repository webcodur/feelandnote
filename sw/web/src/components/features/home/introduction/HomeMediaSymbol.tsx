'use client'

import { useId, type ComponentType } from 'react'
import type { ContentType } from '@/types/database'

type Paint = { surface: string; metal: string }

function Book({ surface }: Paint) {
  return <g stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
    <path d="m24 25 72-13 12 8-74 13Z" fill="var(--color-text-secondary)" />
    <path d="m31 24 64-11M32 28l69-12" opacity=".35" />
    <path d="m24 25 10 8v94l-10-9Z" fill="var(--color-bg-stone-light)" />
    <path d="m34 33 74-13v94l-74 13Z" fill={surface} />
    <path d="m44 42 54-10v72l-54 10Z" opacity=".35" />
    <path d="m56 62 30-5m-30 12 23-4" strokeWidth="2" />
    <path d="m27 39 4 3m-4 60 4 3" opacity=".6" />
  </g>
}

function Music({ surface }: Paint) {
  return <g stroke="currentColor" strokeWidth="1.1">
    <circle cx="85" cy="61" r="45" fill="var(--color-bg-secondary)" />
    {[40, 36, 31, 27].map(r => <circle key={r} cx="85" cy="61" r={r} opacity=".3" />)}
    <path d="M61 29a40 40 0 0 1 48 1M110 92a40 40 0 0 1-18 8" strokeWidth="3" opacity=".45" />
    <circle cx="85" cy="61" r="13" fill="var(--color-bg-stone-light)" />
    <circle cx="85" cy="61" r="3" fill="var(--color-bg-secondary)" />
    <path d="m16 55 6-6h63l-6 6Z" fill="var(--color-text-tertiary)" />
    <path d="M16 55h63v67H16Z" fill={surface} />
    <path d="M22 55v67M31 72h31M31 78h20" opacity=".45" />
    <circle cx="48" cy="99" r="9" opacity=".65" />
    <path d="M48 94v10m-5-5h10" opacity=".65" />
  </g>
}

function Video({ surface }: Paint) {
  return <g transform="rotate(-7 72 72)" stroke="currentColor" strokeWidth="1.1">
    <rect x="32" y="12" width="80" height="120" rx="3" fill={surface} />
    {[20, 34, 48, 62, 76, 90, 104, 118].map(y => <g key={y} fill="currentColor" stroke="none" opacity=".65">
      <rect x="37" y={y} width="5" height="7" rx="1" /><rect x="102" y={y} width="5" height="7" rx="1" />
    </g>)}
    <path d="M47 14v116m50-116v116" opacity=".4" />
    <rect x="49" y="24" width="46" height="39" rx="1" fill="var(--color-bg-secondary)" />
    <rect x="49" y="79" width="46" height="39" rx="1" fill="var(--color-bg-secondary)" />
    <path d="m67 36 13 8-13 8Zm0 55 13 8-13 8Z" fill="currentColor" stroke="none" opacity=".7" />
    <path d="M49 71h46" opacity=".4" />
  </g>
}

function Game({ metal }: Paint) {
  return <g stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
    <path d="M40 19h60l13 14v88H28V33h12Z" fill={metal} />
    <path d="M41 19v14h59V19M35 40h71v59H35Z" fill="var(--color-bg-card)" />
    {[46, 54, 62, 70, 78, 86, 94].map(x => <path key={x} d={`M${x} 23v7`} opacity=".5" />)}
    <path d="M52 57h36l9 23c1 7-5 10-10 3l-5-6H58l-5 6c-5 7-11 4-10-3Z" fill="var(--color-bg-raised)" />
    <path d="M56 61v12m-6-6h12" strokeWidth="2" />
    <circle cx="85" cy="64" r="2" fill="currentColor" /><circle cx="79" cy="71" r="2" fill="currentColor" />
    <path d="M47 121v-12h48v12" fill="var(--color-bg-secondary)" />
    {[54, 62, 70, 78, 86].map(x => <path key={x} d={`M${x} 113v7`} opacity=".6" />)}
    <circle cx="36" cy="108" r="2" /><circle cx="104" cy="108" r="2" />
  </g>
}

const SYMBOLS: Record<ContentType, ComponentType<Paint>> = { BOOK: Book, MUSIC: Music, VIDEO: Video, GAME: Game }

export default function HomeMediaSymbol({ type }: { type: ContentType }) {
  const id = useId()
  const Symbol = SYMBOLS[type]
  return <svg viewBox="0 0 144 144" fill="none" aria-hidden="true" data-media-symbol={type}>
    <defs>
      <linearGradient id={`${id}-surface`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="var(--color-bg-stone-light)" /><stop offset="1" stopColor="var(--color-bg-secondary)" />
      </linearGradient>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="var(--color-text-secondary)" /><stop offset=".45" stopColor="var(--color-text-tertiary)" />
        <stop offset="1" stopColor="var(--color-bg-stone-light)" />
      </linearGradient>
    </defs>
    <Symbol surface={`url(#${id}-surface)`} metal={`url(#${id}-metal)`} />
  </svg>
}
