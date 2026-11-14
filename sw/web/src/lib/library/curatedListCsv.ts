import type { CuratedListItem } from '@/actions/library/types'

export interface CuratedListCsvData {
  title: string
  curatorName: string
  sourceUrl: string
  items: Pick<CuratedListItem, 'rawTitle' | 'rawCreator' | 'rank' | 'year' | 'note'>[]
}

export type CuratedListCsvLabels = Record<
  'number' | 'title' | 'creator' | 'rank' | 'year' | 'note' | 'curator' | 'list' | 'source',
  string
>

function csvCell(value: string | number | null): string {
  const text = String(value ?? '')
  // Spreadsheet apps must display imported titles and notes as text.
  const literal = /^[\u0000-\u0020]*[=+\-@]|^[\t\r\n]/.test(text) ? `'${text}` : text
  return `"${literal.replace(/"/g, '""')}"`
}

/** Preserve every public source entry and its order, including works without a service match. */
export function createCuratedListCsv(list: CuratedListCsvData, labels: CuratedListCsvLabels): string {
  const hasRank = list.items.some(item => item.rank !== null)
  const hasYear = list.items.some(item => item.year !== null)
  const hasNote = list.items.some(item => item.note?.trim())
  const header = [labels.number, labels.title, labels.creator,
    ...(hasRank ? [labels.rank] : []), ...(hasYear ? [labels.year] : []), ...(hasNote ? [labels.note] : []),
    labels.curator, labels.list, labels.source]
  const rows = list.items.map((item, index) => [index + 1, item.rawTitle, item.rawCreator,
    ...(hasRank ? [item.rank] : []), ...(hasYear ? [item.year] : []), ...(hasNote ? [item.note] : []),
    list.curatorName, list.title, list.sourceUrl])
  // BOM and CRLF keep Korean text readable in Excel and preserve CSV record boundaries.
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function curatedListCsvFilename(title: string): string {
  const stem = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim().replace(/[. ]+$/g, '').slice(0, 140)
  return `${stem || 'curated-list'}.csv`
}
