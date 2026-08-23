export type BookPersonBook = {
  title: string
  text: string
  duration?: number
  image?: string
  voice?: string
}

export type BookPersonScript = {
  person: string
  role?: string
  lead?: string
  intro: string
  books: BookPersonBook[]
  title?: string
  bg?: string
  locale?: 'ko' | 'en'
}

export type BookPersonSummary = {
  folder: string
  person: string
  role: string
  bookCount: number
  hasIntro: boolean
  hasLead: boolean
  hasDraft: boolean
}

export function emptyScript(person: string, role?: string): BookPersonScript {
  return { person, intro: '', books: [], ...(role?.trim() ? { role: role.trim() } : {}) }
}

/** Remotion 쪽 bookPersonLabel 과 같은 규칙. 컴포지션 ID는 a-zA-Z0-9- 만 받는다 */
export function bookPersonCompId(name: string): string {
  const label = name.split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('').replace(/[^A-Za-z0-9-]/g, '')
  return `BookPerson-${label}-KO-S-VID`
}

export function studioUrl(name: string): string {
  return `http://localhost:3002/${bookPersonCompId(name)}`
}
