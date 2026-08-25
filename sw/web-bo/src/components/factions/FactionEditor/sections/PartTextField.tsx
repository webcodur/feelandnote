import type { FactionScript } from '@/lib/faction-types'
import type { EditLang } from '@feelandnote/shared/bo/editor'

export function PartTextField({
  part,
  label,
  keys,
  multiline = false,
  multilineHint,
  compact = false,
  script,
  update,
  editLang,
}: {
  part: number
  label: string
  keys: { common: keyof FactionScript; byPart: keyof FactionScript; en?: keyof FactionScript; byPartEn?: keyof FactionScript }
  multiline?: boolean
  /** 여러 줄 입력 시 part 0 placeholder 안내 (미지정이면 영상 명칭용 기본 문구) */
  multilineHint?: string
  /** 아코디언 헤더용 소형 세로 배치. 라벨을 위에 두고 입력 폭을 고정한다. */
  compact?: boolean
  script: FactionScript
  update: (patch: Partial<FactionScript>) => void
  editLang: EditLang
}) {
  const byPartObj = (script[keys.byPart] as Record<number, string> | undefined) ?? {}
  const val = part === 0 ? ((script[keys.common] as string | undefined) ?? '') : (byPartObj[part] ?? '')
  
  const setVal = (v: string) => {
    if (part === 0) { update({ [keys.common]: v || undefined } as Partial<FactionScript>); return }
    const nx = { ...byPartObj }
    if (v) nx[part] = v; else delete nx[part]
    update({ [keys.byPart]: Object.keys(nx).length ? nx : undefined } as Partial<FactionScript>)
  }
  
  const localizedKey = part === 0 ? keys.en : keys.byPartEn
  const enByPartObj = keys.byPartEn
    ? ((script[keys.byPartEn] as Record<number, string> | undefined) ?? {})
    : {}
  const enVal = part === 0
    ? ((keys.en ? script[keys.en] : undefined) as string | undefined) ?? ''
    : (enByPartObj[part] ?? '')
  const setEnVal = (value: string) => {
    if (part === 0 && keys.en) {
      update({ [keys.en]: value || undefined } as Partial<FactionScript>)
      return
    }
    if (part > 0 && keys.byPartEn) {
      const next = { ...enByPartObj }
      if (value) next[part] = value
      else delete next[part]
      update({ [keys.byPartEn]: Object.keys(next).length ? next : undefined } as Partial<FactionScript>)
    }
  }
  // 별도 영문 필드가 없는 값(편별 영상 명칭 등)은 언어 공통값이다. EN 화면에서도 숨기지 않는다.
  const showCommonField = editLang !== 'en' || !localizedKey
  const commonOnlyInEnglish = editLang === 'en' && !localizedKey
  const koPlaceholder = part === 0
    ? (multilineHint ?? `${label} (첫 줄=앞부분, 둘째 줄부터=뒷부분)`)
    : `${commonOnlyInEnglish ? '언어 공통 · ' : ''}이 편 ${label} (비우면 공통)`
  const koField = showCommonField && (
    multiline ? (
      <textarea
        rows={2}
        placeholder={koPlaceholder}
        value={val}
        onChange={e => setVal(e.target.value)}
        className={compact
          ? 'h-14 w-40 resize-none rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none'
          : 'min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none'}
      />
    ) : (
      <input
        type="text"
        placeholder={part === 0 ? label : `이 편 ${label} (비우면 공통)`}
        value={val}
        onChange={e => setVal(e.target.value)}
        className={compact
          ? 'w-40 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none'
          : 'min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none'}
      />
    )
  )
  const enField = localizedKey && editLang !== 'ko' && (
    multiline ? (
      <textarea
        rows={2}
        placeholder={`EN ${label} (영문)`}
        value={enVal}
        onChange={e => setEnVal(e.target.value)}
        className={compact
          ? 'h-14 w-40 resize-none rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none'
          : 'min-w-0 flex-1 resize-y rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none'}
      />
    ) : (
      <input
        type="text"
        placeholder={`EN ${label} (영문)`}
        value={enVal}
        onChange={e => setEnVal(e.target.value)}
        className={compact
          ? 'w-40 rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none'
          : 'min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none'}
      />
    )
  )

  if (compact) {
    return (
      <div className="flex w-40 shrink-0 flex-col gap-1">
        <label className="text-[10px] font-semibold text-text-dim">{label}</label>
        {koField}
        {enField}
      </div>
    )
  }
  
  return (
    <div className={`flex gap-2 ${multiline ? 'items-start' : 'items-center'}`}>
      <label className={`w-20 shrink-0 text-xs text-text-dim ${multiline ? 'mt-1.5' : ''}`}>{label} -</label>
      {koField}
      {enField}
    </div>
  )
}
