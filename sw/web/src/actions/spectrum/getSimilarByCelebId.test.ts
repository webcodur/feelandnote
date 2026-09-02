import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actionSource = readFileSync(
  new URL('./getSimilarByCelebId.ts', import.meta.url),
  'utf8',
)
const migrationSource = readFileSync(
  new URL('../../../database/migrations/20260825090000_add_spectrum_list_revalidation.sql', import.meta.url),
  'utf8',
)

test('all-spectrum-vectors uses the seven-day spectrum and celeb dependencies', () => {
  assert.match(actionSource, /import \{[^}]*STATIC_REVALIDATE[^}]*\} from ['"]@\/lib\/cache['"]\n/)
  assert.match(
    actionSource,
    /cachedList\(CACHE_TAGS\.SPECTRUM, \['all-spectrum-vectors'\][\s\S]*?revalidate: STATIC_REVALIDATE[\s\S]*?extraTags: \[CACHE_TAGS\.CELEBS\]/,
  )
})

test('persona revalidation preserves list, item, and celeb tags on three statement triggers', () => {
  assert.match(migrationSource, /'spectrum',/)
  assert.match(migrationSource, /'spectrum:' \|\| r\.celeb_id/)
  assert.match(migrationSource, /'celebs:' \|\| r\.celeb_id/)
  assert.match(migrationSource, /'celebs:' \|\| \(select c\.slug[\s\S]*?r\.celeb_id\)/)
  assert.match(migrationSource, /execute function public\.web_revalidate_trigger\(%L, %L, %L\)/)
  assert.match(migrationSource, /v_expected_args[\s\S]*?tgargs = v_expected_args/)
  assert.match(migrationSource, /tgname in \([\s\S]*?'web_reval_ins'[\s\S]*?'web_reval_upd'[\s\S]*?'web_reval_del'/)
  assert.match(migrationSource, /if v_matching_triggers <> 3 then/)
})
