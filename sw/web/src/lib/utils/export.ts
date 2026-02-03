import type { ExportContentRow } from '@/actions/contents/exportContents'

const CSV_HEADERS = [
  '제목',
  '저자/감독',
  '타입',
  '상태',
  '분류',
  '평점',
  '리뷰',
  '추가일',
  '수정일',
  '완료일',
]

function escapeCSV(value: string | number | null): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function convertToCSV(rows: ExportContentRow[]): string {
  const headerLine = CSV_HEADERS.join(',')

  const dataLines = rows.map(row => [
    escapeCSV(row.title),
    escapeCSV(row.creator),
    escapeCSV(row.type),
    escapeCSV(row.status),
    escapeCSV(row.category),
    escapeCSV(row.rating),
    escapeCSV(row.review),
    escapeCSV(row.created_at),
    escapeCSV(row.updated_at),
    escapeCSV(row.completed_at),
  ].join(','))

  return [headerLine, ...dataLines].join('\n')
}

export function downloadCSV(csv: string, filename: string): void {
  // BOM 추가 (Excel에서 한글 깨짐 방지)
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generateExportFilename(type?: string): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const typeLabel = type || 'ALL'
  return `feelandnote_${typeLabel}_${date}.csv`
}
