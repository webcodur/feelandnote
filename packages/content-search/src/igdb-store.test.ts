import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

test('Steam reverse lookup requires one exact external identity and rejects ambiguous games', async () => {
  let rows: unknown[] = []
  let requests = 0
  const code = ts.transpileModule(readFileSync(new URL('./igdb.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loaded = { exports: {} as { getGameIdFromSteam: (id: number) => Promise<number | null> } }
  const fetcher = async (url: string, options: RequestInit) => {
    requests++
    if (url.startsWith('https://id.twitch.tv/')) return Response.json({ access_token: 'test-token', expires_in: 3600 })
    assert.equal(url, 'https://api.igdb.com/v4/external_games')
    assert.match(String(options.body), /where uid = "570" & external_game_source\.name = "Steam"/)
    return Response.json(rows)
  }
  new Function('fetch', 'process', 'module', 'exports', code)(fetcher,
    { env: { TWITCH_CLIENT_ID: 'test-client', TWITCH_CLIENT_SECRET: 'test-secret' } }, loaded, loaded.exports)
  const lookup = loaded.exports.getGameIdFromSteam
  assert.equal(await lookup(-1), null)
  assert.equal(requests, 0)
  const match = { uid: '570', game: 2963, external_game_source: { name: 'Steam' } }
  rows = [match]
  assert.equal(await lookup(570), 2963)
  rows = [match, { ...match, game: 999 }]
  assert.equal(await lookup(570), null)
  rows = [{ ...match, uid: '730' }, { ...match, external_game_source: { name: 'GOG' } }]
  assert.equal(await lookup(570), null)
  rows = []
  assert.equal(await lookup(570), null)
})
