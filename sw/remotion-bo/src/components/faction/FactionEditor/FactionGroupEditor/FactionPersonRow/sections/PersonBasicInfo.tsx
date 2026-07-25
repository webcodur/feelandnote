import { AutoResizeTextarea } from '../../../../shared/AutoResizeTextarea'
import type { FactionPerson } from '@/lib/faction-types'
import type { EditLang } from '@/components/editor'

export function PersonBasicInfo({
  person,
  onChange,
  editLang,
}: {
  person: FactionPerson
  onChange: (person: FactionPerson) => void
  editLang: EditLang
}) {
  const set = (key: keyof FactionPerson, val: string) => onChange({ ...person, [key]: val })

  return (
    <>
      <div className="flex items-center gap-2">
        {editLang !== 'en' && (
          <>
            <span className="w-24 shrink-0 text-xs text-text-dim">이름 -</span>
            <input type="text" placeholder="이름" value={person.name} onChange={e => set('name', e.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
          </>
        )}
        {editLang !== 'ko' && (
          <>
            <span className="w-12 shrink-0 text-xs text-text-dim">(영문) -</span>
            <input type="text" placeholder="EN 이름" value={person.nameEn ?? ''} onChange={e => set('nameEn', e.target.value)} className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none" />
          </>
        )}
      </div>
      <div className="flex items-start gap-2">
        {editLang !== 'en' && (
          <>
            <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">직함(3줄) -</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <input
                type="text"
                placeholder="1번째 직함 (이름 옆 고정)"
                value={person.lines?.[0] ?? ''}
                onChange={e => {
                  const lines = [...(person.lines ?? ['', '', ''])]
                  lines[0] = e.target.value
                  onChange({ ...person, lines })
                }}
                className="w-full rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm font-semibold focus:border-accent focus:outline-none"
              />
              {[1, 2].map(idx => (
                <div key={idx} className="flex items-start gap-1.5 w-full">
                  <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-border" />
                  <AutoResizeTextarea
                    placeholder={`${idx + 1}번째 이력`}
                    value={person.lines?.[idx] ?? ''}
                    onChange={e => {
                      const lines = [...(person.lines ?? ['', '', ''])]
                      lines[idx] = e.target.value.replace(/\n/g, ' ')
                      onChange({ ...person, lines })
                    }}
                    rows={1}
                    className="min-w-0 flex-1 resize-none rounded-md border border-border bg-bg-main px-2 py-1 text-sm leading-snug focus:border-accent focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </>
        )}
        {editLang !== 'ko' && (
          <>
            <span className="w-12 shrink-0 pt-1.5 text-xs text-text-dim">(영문) -</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 opacity-80">
              <input
                type="text"
                placeholder="EN 1번째 직함"
                value={person.linesEn?.[0] ?? ''}
                onChange={e => {
                  const linesEn = [...(person.linesEn ?? ['', '', ''])]
                  linesEn[0] = e.target.value
                  onChange({ ...person, linesEn })
                }}
                className="w-full rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs font-semibold focus:border-accent focus:outline-none"
              />
              {[1, 2].map(idx => (
                <div key={idx} className="flex items-start gap-1.5 w-full">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border/50" />
                  <AutoResizeTextarea
                    placeholder={`EN ${idx + 1}번째 이력`}
                    value={person.linesEn?.[idx] ?? ''}
                    onChange={e => {
                      const linesEn = [...(person.linesEn ?? ['', '', ''])]
                      linesEn[idx] = e.target.value.replace(/\n/g, ' ')
                      onChange({ ...person, linesEn })
                    }}
                    rows={1}
                    className="min-w-0 flex-1 resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1 text-[11px] leading-snug focus:border-accent focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex items-start gap-2">
        {editLang !== 'en' && (
          <>
            <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">수식어 -</span>
            <div className="min-w-0 flex-1 flex flex-col gap-1.5">
              <AutoResizeTextarea placeholder="대사 전에 띄울 한 문장 (예: 1988년 사이퍼펑크 선언문을 세상에 던져, 암호로 국가의 감시를 끝내려 한 예언자)" value={person.epithet ?? ''} onChange={e => set('epithet', e.target.value.replace(/\n/g, ' '))} rows={2} className="w-full resize-none rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm leading-snug focus:border-accent focus:outline-none" />
            </div>
          </>
        )}
        {editLang !== 'ko' && (
          <>
            <span className="w-12 shrink-0 pt-1.5 text-xs text-text-dim">(영문) -</span>
            <AutoResizeTextarea placeholder="EN epithet (one sentence)" value={person.epithetEn ?? ''} onChange={e => set('epithetEn', e.target.value.replace(/\n/g, ' '))} rows={2} className="min-w-0 flex-1 resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs leading-snug text-text-secondary focus:border-accent focus:outline-none" />
          </>
        )}
      </div>
    </>
  )
}
