import type { CelebHost, NarratorLines } from './types'

// --- UI helpers ---
export const SECTION_CLS = 'bg-bg-secondary border border-border rounded-lg overflow-hidden'
export const HEADER_CLS = 'flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-bg-hover transition-colors'
export const LABEL_CLS = 'text-[11px] text-text-secondary font-medium mb-0.5'
export const INPUT_CLS = 'w-full bg-bg-main border border-border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-accent'
export const BADGE_CLS = 'text-[10px] px-1.5 py-0.5 rounded bg-bg-main text-text-dim font-mono shrink-0'
export const BTN_SM = 'px-2 py-0.5 rounded text-xs font-semibold'
export const BTN_DANGER = `${BTN_SM} bg-danger text-danger-text hover:opacity-80`
export const BTN_ADD = `${BTN_SM} bg-bg-card border border-border text-accent hover:bg-bg-hover`

// --- Field components (horizontal: label — input) ---
export const FIELD_CLS = 'flex items-center gap-3'
export const FIELD_LABEL_CLS = 'text-[11px] text-text-secondary font-medium shrink-0 w-24 text-center'

// --- Main Editor ---
export const EMPTY_HOST: CelebHost = { nickname: '', nickname_en: '', speech_tone: 'calm', avatar_url: '', title: '' }
export const EMPTY_NARRATOR: NarratorLines = { bridge: '', bridgeDuration: 0, outro: '', outroDuration: 0 }
