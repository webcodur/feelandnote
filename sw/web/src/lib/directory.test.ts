import assert from 'node:assert/strict'
import test from 'node:test'
import type { CelebDirectoryRow } from '@/actions/celebs/getCelebDirectory'
import { directoryName, groupDirectory, sortDirectory } from './directory'

function figure(nickname: string, nickname_en: string): CelebDirectoryRow {
  return { slug: nickname_en, nickname, nickname_en, profession: 'author', nationality: null, title: null, title_en: null }
}

const figures = [figure('제인', 'Jane'), figure('에밀', 'Émile'), figure('아론', 'Aaron'), figure('마크', 'Mark'), figure('숫자', '2Pac')]

test('직군 명부는 한국어 DB 순서와 관계없이 표시 언어의 이름순을 따른다', () => {
  const input = [...figures]
  assert.deepEqual(sortDirectory(figures, 'en').map(item => directoryName(item, 'en')), ['2Pac', 'Aaron', 'Émile', 'Jane', 'Mark'])
  assert.deepEqual(sortDirectory(figures, 'ko').map(item => directoryName(item, 'ko')), ['마크', '숫자', '아론', '에밀', '제인'])
  assert.deepEqual(figures, input)
})

test('영문 악센트 이름도 해당 알파벳에 모으고 기타 이름은 끝에 둔다', () => {
  const groups = groupDirectory(figures, 'en')
  assert.deepEqual(groups.map(([key]) => key), ['A', 'E', 'J', 'M', '#'])
  assert.equal(groups[1][1][0].nickname_en, 'Émile')
  assert.equal(groups.reduce((count, [, items]) => count + items.length, 0), figures.length)
})

test('한글 초성은 영문 알파벳 앞에 정렬한다', () => {
  assert.deepEqual(groupDirectory([...figures, figure('Alice', 'Alice')], 'ko').map(([key]) => key), ['ㅁ', 'ㅅ', 'ㅇ', 'ㅈ', 'A'])
})
