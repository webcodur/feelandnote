'use client'

/**
 * 한국어·영문 나란히 입력칸 — 편집 언어 모드(한국어만/영어만/둘 다)에 따라 칸을 가린다.
 * 팩션 편집기가 입력칸마다 editLang 삼항식을 되풀이하던 것을 담화에서는 이 한 겹으로 묶는다.
 */

import type { EditLang } from '@feelandnote/shared/bo/editor'

type Base = {
  label: string
  editLang: EditLang
  ko: string
  en: string
  onKo: (v: string) => void
  onEn: (v: string) => void
  placeholder?: string
  placeholderEn?: string
  /** 입력칸 아래 안내 문구 */
  hint?: string
}

const KO_CLASS = 'min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none'
const EN_CLASS = 'min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-3 py-2 text-xs text-text-secondary focus:border-accent focus:outline-none'

/** 한 줄 입력 */
export function LangText({ label, editLang, ko, en, onKo, onEn, placeholder, placeholderEn, hint }: Base) {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <label className="mt-2 w-20 shrink-0 text-xs text-text-dim">{label}</label>
        {editLang !== 'en' && (
          <input value={ko} placeholder={placeholder} onChange={e => onKo(e.target.value)} className={KO_CLASS} />
        )}
        {editLang !== 'ko' && (
          <input value={en} placeholder={placeholderEn ?? 'EN'} onChange={e => onEn(e.target.value)} className={EN_CLASS} />
        )}
      </div>
      {hint && <p className="ps-22 text-[11px] text-text-dim">{hint}</p>}
    </div>
  )
}

/** 여러 줄 입력 */
export function LangArea({ label, editLang, ko, en, onKo, onEn, placeholder, placeholderEn, hint, rows = 2 }: Base & { rows?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <label className="mt-2 w-20 shrink-0 text-xs text-text-dim">{label}</label>
        {editLang !== 'en' && (
          <textarea rows={rows} value={ko} placeholder={placeholder} onChange={e => onKo(e.target.value)} className={`${KO_CLASS} resize-y`} />
        )}
        {editLang !== 'ko' && (
          <textarea rows={rows} value={en} placeholder={placeholderEn ?? 'EN'} onChange={e => onEn(e.target.value)} className={`${EN_CLASS} resize-y`} />
        )}
      </div>
      {hint && <p className="ps-22 text-[11px] text-text-dim">{hint}</p>}
    </div>
  )
}
