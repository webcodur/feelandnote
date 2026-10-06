import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProfessionProvider, useProfessions } from '@feelandnote/shared/hooks/use-professions'
import { getCelebProfessionMessages, type ProfessionOption } from '@feelandnote/shared/constants/celeb-professions'
import { getProfessionIcon, getProfessionColor } from '@/constants/professionIcons'
import { affiliateBookToShelfBook } from '@/components/shared/BookShelf/types'
import { getProfessionShelfChoices } from './professionShelf'

test('DB가 추가한 직업을 이름·설명·필터·기본 표식·두 책장 분류에 표시한다', () => {
  const profession: ProfessionOption = { value: 'physician', label: '의사', label_en: 'Physician', description: '질병을 진단하고 치료합니다.', description_en: 'Diagnoses and treats illness.' }
  function Probe() {
    const { getLabel, getProfession, filters } = useProfessions()
    return <div>{getLabel('physician')}|{getLabel('physician', 'en')}|{getProfession('physician')?.description}|{filters.map(p => p.value).join(',')}</div>
  }
  const html = renderToStaticMarkup(<ProfessionProvider professions={[profession]}><Probe /></ProfessionProvider>)
  assert.match(html, /의사\|Physician\|질병을 진단하고 치료합니다\.\|all,physician/)
  assert.equal(getCelebProfessionMessages('en', [profession]).physician, 'Physician')
  assert.equal(getProfessionIcon('physician'), getProfessionIcon('other'))
  assert.equal(getProfessionColor('physician'), getProfessionColor('other'))
  const books = ['become', 'about'].map(category => affiliateBookToShelfBook({
    contentId: category, title: category, creator: 'Test', url: '',
    professionCategory: category as 'become' | 'about', selectionReason: category, selectionSourceUrl: 'https://example.com/source',
  }))
  const choices = getProfessionShelfChoices(books, { become: 'Learn', about: 'Explore', becomeIntro: 'Learn', aboutIntro: 'Explore' })
  assert.deepEqual(choices.map(choice => [choice.label, choice.books.length]), [['Learn', 1], ['Explore', 1]])
  assert.ok(choices.every(choice => choice.books.every(book => book.selectionReason && book.selectionSourceUrl)))
})
