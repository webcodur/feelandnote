'use client'

import { useId, type ComponentType } from 'react'
import type { ContentType } from '@/types/database'

type Paint = { surface: string; metal: string }

function Book({ surface }: Paint) {
  return <g stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
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
  return <g stroke="currentColor" strokeWidth="1.8">
    <circle cx="72" cy="72" r="58" fill={surface} />
    {[52, 47, 42, 37, 32].map(r => <circle key={r} cx="72" cy="72" r={r} opacity=".5" />)}
    <path d="M35 35a52 52 0 0 1 50-13M109 109a52 52 0 0 1-50 13" strokeWidth="4" strokeLinecap="round" opacity=".65" />
    <circle cx="72" cy="72" r="23" fill="currentColor" stroke="none" />
    <circle cx="72" cy="72" r="18" stroke="var(--color-bg-main)" opacity=".6" />
    <path d="M62 64h20M66 80h12" stroke="var(--color-bg-main)" strokeWidth="2" />
    <circle cx="72" cy="72" r="4" fill="var(--color-bg-main)" stroke="none" />
  </g>
}

function Video({ surface }: Paint) {
  return <g transform="rotate(-7 72 72)" stroke="currentColor" strokeWidth="1.8">
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
  return <g stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
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
