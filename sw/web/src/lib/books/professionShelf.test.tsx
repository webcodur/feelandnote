import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProfessionProvider, useProfessions } from '@feelandnote/shared/hooks/use-professions'
import { getCelebProfessionMessages, type ProfessionOption } from '@feelandnote/shared/constants/celeb-professions'
import { getProfessionIcon, getProfessionColor } from '@/constants/professionIcons'
import { affiliateBookToShelfBook } from '@/components/shared/BookShelf/types'
import { getProfessionShelfChoices } from './professionShelf'
import { PROFESSION_BOOK_GUIDES } from './professionBookGuides'
import { PROFESSION_BOOK_CATEGORIES } from '@feelandnote/shared/constants/profession-books'

test('DB가 추가한 직업을 이름·설명·필터·기본 표식·세 책장 분류에 표시한다', () => {
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
  const books = (['train', 'become', 'about'] as const).map(category => affiliateBookToShelfBook({
    contentId: category, title: category, creator: 'Test', url: '',
    professionCategory: category, selectionReason: category, selectionSourceUrl: 'https://example.com/source',
  }))
  const choices = getProfessionShelfChoices(books, { train: 'Train', become: 'Learn', about: 'Explore', trainIntro: 'Train', becomeIntro: 'Learn', aboutIntro: 'Explore' })
  assert.deepEqual(choices.map(choice => [choice.label, choice.books.length]), [['Train', 1], ['Learn', 1], ['Explore', 1]])
  assert.ok(choices.every(choice => choice.books.every(book => book.selectionReason && book.selectionSourceUrl)))
})

test('훈련의 추천 순서를 지키고 같은 작품의 수업 선정 이유와 섞지 않는다', () => {
  const books = [
    { contentId: 'second', title: 'Second', professionCategory: 'train' as const, selectionReason: '응용' },
    { contentId: 'first', title: 'First', professionCategory: 'train' as const, selectionReason: '기초' },
    { contentId: 'second', title: 'Second', professionCategory: 'become' as const, selectionReason: '큰 그림' },
  ].map(book => affiliateBookToShelfBook({ ...book, url: '' }))
  const choices = getProfessionShelfChoices(books, { train: 'Train', become: 'Learn', about: 'Explore', trainIntro: '순서', becomeIntro: '교양', aboutIntro: '경험' })
  assert.deepEqual(choices[0].books.map(book => book.id), ['second', 'first'])
  assert.equal(choices[0].books[0].selectionReason, '응용')
  assert.equal(choices[1].books[0].selectionReason, '큰 그림')
  assert.equal(choices[2].books.length, 0)
})

test('직군 식별자로 한영 선정 개요를 연결하고 새 직군에는 기존 안내를 유지한다', () => {
  const labels = { train: 'Train', become: 'Learn', about: 'Explore', trainIntro: 'Basics', becomeIntro: 'Perspectives', aboutIntro: 'Experience' }
  assert.equal(Object.keys(PROFESSION_BOOK_GUIDES).length, 15)
  for (const profession of Object.keys(PROFESSION_BOOK_GUIDES)) {
    for (const locale of ['ko', 'en']) {
      const choices = getProfessionShelfChoices([], labels, { profession, locale })
      assert.deepEqual(choices.map(choice => choice.key), [...PROFESSION_BOOK_CATEGORIES])
      assert.equal(new Set(choices.map(choice => choice.overview?.title)).size, 3)
      for (const choice of choices) {
        assert.ok(choice.overview?.title)
        assert.equal(choice.overview.paragraphs.length, 2)
        assert.ok(choice.overview.paragraphs.every(paragraph => paragraph.trim().length > 40))
        assert.equal(/[가-힣]/u.test(choice.overview.title), locale === 'ko')
      }
    }
  }
  const future = getProfessionShelfChoices([], labels, { profession: 'physician', locale: 'en' })
  assert.ok(future.every(choice => choice.overview === undefined))
  assert.deepEqual(future.map(choice => choice.intro), ['Basics', 'Perspectives', 'Experience'])
  assert.ok(getProfessionShelfChoices([], labels).every(choice => choice.overview === undefined))
})
