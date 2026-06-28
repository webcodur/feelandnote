import type { FactionScript } from '@/lib/faction-types'
import type { EditLang } from '../../FactionEditor'

export function PartTextField({
  part,
  label,
  keys,
  multiline = false,
  multilineHint,
  script,
  update,
  editLang,
}: {
  part: number
  label: string
  keys: { common: keyof FactionScript; byPart: keyof FactionScript; en?: keyof FactionScript }
  multiline?: boolean
  /** 여러 줄 입력 시 part 0 placeholder 안내 (미지정이면 영상 명칭용 기본 문구) */
  multilineHint?: string
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
  
  const enVal = (script[keys.en as keyof FactionScript] as string | undefined) ?? ''
  
  return (
    <div className={`flex gap-2 ${multiline ? 'items-start' : 'items-center'}`}>
      <label className={`w-20 shrink-0 text-xs text-text-dim ${multiline ? 'mt-1.5' : ''}`}>{label} -</label>
      {editLang !== 'en' && (
        multiline ? (
        <textarea
          rows={2}
          placeholder={part === 0 ? (multilineHint ?? `${label} (첫 줄=앞부분, 둘째 줄부터=뒷부분)`) : `이 편 ${label} (비우면 공통)`}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
      ) : (
        <input
          type="text"
          placeholder={part === 0 ? label : `이 편 ${label} (비우면 공통)`}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
      ))}
      {part === 0 && keys.en && editLang !== 'ko' && (
        multiline ? (
          <textarea
            rows={2}
            placeholder={`EN ${label} (영문)`}
            value={enVal}
            onChange={e => update({ [keys.en as keyof FactionScript]: e.target.value || undefined } as Partial<FactionScript>)}
            className="min-w-0 flex-1 resize-y rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
          />
        ) : (
          <input
            type="text"
            placeholder={`EN ${label} (영문)`}
            value={enVal}
            onChange={e => update({ [keys.en as keyof FactionScript]: e.target.value || undefined } as Partial<FactionScript>)}
            className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
          />
        )
      )}
    </div>
  )
}
