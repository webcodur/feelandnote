import assert from 'node:assert/strict'
import test from 'node:test'
import { createCuratedListCsv, curatedListCsvFilename, type CuratedListCsvData, type CuratedListCsvLabels } from './curatedListCsv'

const labels: CuratedListCsvLabels = { number: '번호', title: '제목', creator: '저자', rank: '순위', year: '연도', note: '비고', curator: '기관', list: '목록', source: '출처' }
const item = (number: number): CuratedListCsvData['items'][number] => ({ rawTitle: `작품 ${number}`, rawCreator: null, rank: null, year: null, note: null })
const list = (items: CuratedListCsvData['items']): CuratedListCsvData => ({ title: '필독도서', curatorName: '대학교', sourceUrl: 'https://example.com/source', items })

test('exports all 200 source entries in order, including unmatched works and duplicate titles', () => {
  const items = Array.from({ length: 200 }, (_, index) => item(index + 1))
  items[1].rawTitle = items[0].rawTitle
  const csv = createCuratedListCsv(list(items), labels)
  assert.ok(csv.startsWith('\uFEFF'))
  const rows = csv.slice(1).split('\r\n')
  assert.equal(rows.length, 202)
  assert.equal(rows[0], '"번호","제목","저자","기관","목록","출처"')
  assert.ok(rows[1].startsWith('"1","작품 1",""'))
  assert.ok(rows[2].startsWith('"2","작품 1",""'))
  assert.ok(rows[200].startsWith('"200","작품 200",""'))
  assert.ok(rows[200].endsWith('"대학교","필독도서","https://example.com/source"'))
})

test('escapes commas, quotes and line breaks, and retains rank, year and selection notes', () => {
  const entry = { ...item(1), rawTitle: '제목, "인용"\n둘째 줄', rawCreator: '저자', rank: 1, year: 2026, note: '첫째\r\n둘째' }
  const csv = createCuratedListCsv(list([entry]), labels)
  assert.ok(csv.includes('"순위","연도","비고"'))
  assert.ok(csv.includes('"제목, ""인용""\n둘째 줄","저자","1","2026","첫째\r\n둘째"'))
})

test('spreadsheet formulas remain literal text in exported source fields', () => {
  for (const rawTitle of ['=1+2', '+SUM(A1:A2)', '-1+2', '@SUM(A1)', '  =1+2', '\t=1+2', '\r=1+2']) {
    const csv = createCuratedListCsv(list([{ ...item(1), rawTitle }]), labels)
    assert.ok(csv.includes(`"'${rawTitle}"`), rawTitle)
  }
})

test('exports keep all rows beyond the display limit and support translated column names', () => {
  const csv = createCuratedListCsv(list(Array.from({ length: 1005 }, (_, index) => item(index + 1))), { ...labels, title: 'Title', creator: 'Author' })
  assert.equal(csv.split('\r\n').length, 1007)
  assert.ok(csv.includes('"Title","Author"'))
  assert.ok(csv.includes('"1005","작품 1005"'))
})

test('download filenames preserve Korean and replace filesystem control characters', () => {
  assert.equal(curatedListCsvFilename('연세 필독도서 200선'), '연세 필독도서 200선.csv')
  assert.equal(curatedListCsvFilename('목록: "책"/영상?'), '목록- -책--영상-.csv')
  assert.equal(curatedListCsvFilename(' . '), 'curated-list.csv')
})
