import Link from 'next/link'
import { StatusIcon } from '../StatusIcon'
import { fmtYear } from '../utils'
import type { PersonGroup } from '../types'

type GroupListProps = {
  filteredPersons: PersonGroup[]
  activeSeries: string
  pathname: string
  episodesLength: number
}

export function GroupList({ filteredPersons, activeSeries, pathname, episodesLength }: GroupListProps) {
  return (
    <div className="space-y-0.5">
      {filteredPersons.map(person => {
        const firstPart = person.parts[0]
        const primary = firstPart.ko ?? firstPart.en!
        const isSingle = person.parts.length === 1
        const activePart = person.parts.find(p => {
          const epName = (p.ko ?? p.en!)?.name
          return epName && (pathname.startsWith(`/${activeSeries}/${epName}/`) || pathname === `/${activeSeries}/${epName}`)
        })
        const isActive = !!activePart

        const content = (
          <>
            <StatusIcon status={person.status} hasVoice={(primary?.voiceCount ?? 0) > 0} />
            <span className="font-semibold truncate">{person.nickname}</span>
            <span className="ml-auto flex items-center gap-1 shrink-0">
              {!isSingle && person.parts.map(p => {
                const ep = p.ko ?? p.en!
                if (!ep) return null
                const isActivePart = activePart?.baseName === p.baseName
                return (
                  <Link key={p.baseName} href={`/${activeSeries}/${ep.name}`}
                    onClick={e => e.stopPropagation()}
                    className={`text-[9px] w-4 h-4 flex items-center justify-center rounded font-bold ${isActivePart ? 'bg-accent text-bg-main' : 'bg-bg-main border border-border text-text-dim hover:text-accent hover:border-accent/40'}`}>
                    {p.partNum}
                  </Link>
                )
              })}
              <span className="text-[10px] text-text-dim">{fmtYear(person.birthYear)}</span>
            </span>
          </>
        )

        if (isSingle) {
          return (
            <Link key={person.personKey} href={`/${activeSeries}/${primary.name}`}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs ${isActive ? 'bg-bg-card border border-border-active' : 'hover:bg-bg-hover'}`}>
              {content}
            </Link>
          )
        }

        return (
          <div key={person.personKey}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs ${isActive ? 'bg-bg-card border border-border-active' : 'hover:bg-bg-hover'}`}>
            {content}
          </div>
        )
      })}
      {filteredPersons.length === 0 && (
        <div className="text-xs text-text-dim py-4 text-center">
          {episodesLength === 0 ? '에피소드 없음' : '검색 결과 없음'}
        </div>
      )}
    </div>
  )
}
