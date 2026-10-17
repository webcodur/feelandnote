import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { load } from 'cheerio'
import type { FilmographyWork } from '@/lib/celeb/filmography'
import FilmographyList from './FilmographyList'

test('the initial list shows newest credits first even when notable works arrive first', () => {
  const works: FilmographyWork[] = ['2000', '2025', null, '2023'].map((year, index) => ({
    id: `tmdb-movie-${index + 1}`, mediaType: 'movie', title: `Film ${year ?? 'undated'}`,
    year, poster: null, roles: ['acting'], characters: [], jobs: [],
  }))
  const messages = JSON.parse(readFileSync('messages/ko/celeb.json', 'utf8'))
  const page = load(renderToStaticMarkup(
    <NextIntlClientProvider locale="ko" messages={messages} timeZone="UTC">
      <FilmographyList works={works} />
    </NextIntlClientProvider>,
  ))
  assert.deepEqual(page('li h3').map((_, title) => page(title).text()).get(), [
    'Film 2025', 'Film 2023', 'Film 2000', 'Film undated',
  ])
})
