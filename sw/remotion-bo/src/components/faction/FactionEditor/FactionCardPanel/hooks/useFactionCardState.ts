import { useState, useEffect } from 'react'
import type { FactionCardsFile, FactionCardFields, FactionGroupCardFields } from '@/lib/faction-types'

export function useFactionCardState(series: string, episodeName: string) {
  const [cardsFile, setCardsFile] = useState<FactionCardsFile>({ people: {}, groups: {} })
  const [cardsLoaded, setCardsLoaded] = useState(false)

  useEffect(() => {
    setCardsLoaded(false)
    fetch(`/api/${series}/faction-cards/${encodeURIComponent(episodeName)}`)
      .then(r => (r.ok ? r.json() : { people: {}, groups: {} }))
      .then((d: FactionCardsFile) => {
        setCardsFile({ people: d?.people ?? {}, groups: d?.groups ?? {} })
        setCardsLoaded(true)
      })
      .catch(() => {
        setCardsFile({ people: {}, groups: {} })
        setCardsLoaded(true)
      })
  }, [series, episodeName])

  const saveCards = async (personName: string, patch: Partial<FactionCardFields>) => {
    const entry: Record<string, unknown> = { ...(cardsFile.people?.[personName] ?? {}), ...patch }
    for (const k of Object.keys(entry)) if (entry[k] === undefined) delete entry[k]
    const next: FactionCardsFile = { ...cardsFile, people: { ...(cardsFile.people ?? {}), [personName]: entry as Partial<FactionCardFields> } }
    if (!Object.keys(entry).length) delete next.people![personName]
    setCardsFile(next)
    
    const res = await fetch(`/api/${series}/faction-cards/${encodeURIComponent(episodeName)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personName, card: entry }),
    })
    if (!res.ok) alert('카드 대본 저장 실패: ' + res.statusText)
  }

  const saveGroupCards = async (groupName: string, patch: Partial<FactionGroupCardFields>) => {
    const entry: Record<string, unknown> = { ...(cardsFile.groups?.[groupName] ?? {}), ...patch }
    for (const k of Object.keys(entry)) if (entry[k] === undefined) delete entry[k]
    const next: FactionCardsFile = { ...cardsFile, groups: { ...(cardsFile.groups ?? {}), [groupName]: entry as Partial<FactionGroupCardFields> } }
    if (!Object.keys(entry).length) delete next.groups![groupName]
    setCardsFile(next)
    
    const res = await fetch(`/api/${series}/faction-cards/${encodeURIComponent(episodeName)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupName, card: entry }),
    })
    if (!res.ok) alert('세력 대본 저장 실패: ' + res.statusText)
  }

  return { cardsFile, cardsLoaded, saveCards, saveGroupCards }
}
