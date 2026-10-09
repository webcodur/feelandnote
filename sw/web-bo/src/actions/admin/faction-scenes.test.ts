import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import sharp from 'sharp'
import { createClient, type DatabaseClient } from '@feelandnote/db'
import * as editor from '../../lib/faction-scene-editor'
import type { FactionTeamImage } from '@feelandnote/shared/lib/faction-team-image'

const req = createRequire(import.meta.url)
const code = ts.transpileModule(readFileSync(new URL('./faction-scenes.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText

function fixture(authorized = true, transportDb?: DatabaseClient) {
  let images: unknown = [
    { url: 'https://assets.test/group.png', label: '단체', custom: 'keep' },
    { url: 'https://assets.test/scene.webp', kind: 'scene', label: '장면', caption: '설명', labelEn: 'Scene', captionEn: 'Caption' },
  ]
  let writes = 0, race = false, version = 42, complete = false
  const uploads: Array<{ key: string; body: Buffer; contentType: string }> = []
  const sceneUploads: Array<{ lv2Id: string; image: string }> = []
  const db = { from(table: string) {
    assert.equal(table, 'faction_lv2')
    let update: { team_images: unknown; scenes_complete: boolean } | null = null
    const filters = new Map<string, unknown>()
    const query = {
      select() { return query },
      eq(key: string, value: unknown) { filters.set(key, value); return query },
      is(key: string, value: unknown) { filters.set(key, value); return query },
      update(value: { team_images: unknown; scenes_complete: boolean }) { update = value; return query },
      async single() { return { data: { id: 'entry', name: '신화', slug: 'myth', is_myth: true, team_images: structuredClone(images), scenes_complete: complete, xmin: String(version) }, error: null } },
      async maybeSingle() {
        if (!update) return query.single()
        assert.ok(filters.has('xmin'), '쓰기에는 방금 읽은 행 버전의 원자적 비교 조건이 필요하다')
        if (race) { images = [...images as unknown[], { url: 'https://assets.test/concurrent.png' }]; race = false; version++ }
        if (filters.get('xmin') !== String(version)) return { data: null, error: null }
        images = JSON.parse(editor.stableArtworkJSON(update.team_images)); complete = update.scenes_complete; writes++; version++
        return { data: { id: 'entry' }, error: null }
      },
    }
    return query
  } }
  const dependencies: Record<string, unknown> = {
    '@/lib/admin-auth': { requireAdmin: async () => { if (!authorized) throw new Error('관리자 권한이 필요합니다') } },
    '@/lib/db/server': { createClient: async () => transportDb ?? db },
    '@/lib/faction-scene-editor': editor,
    '@/lib/revalidate-web': { revalidateWebLists: async () => {} },
    '@/lib/r2': { uploadToR2: async (key: string, body: Buffer, contentType: string) => { uploads.push({ key, body, contentType }) }, R2_PUBLIC_URL: 'https://assets.test' },
    'next/cache': { revalidatePath() {} },
    './factions/entries': { getFactionMembers: async () => [] },
    './storage': { uploadFactionTeamImage: async (input: { lv2Id: string; image: string }) => { sceneUploads.push(input); return { success: true, url: 'https://assets.test/display.webp' } } },
  }
  const context = { exports: {}, require: (name: string) => dependencies[name] ?? req(name), Buffer, File, console }
  vm.runInNewContext(code, context)
  return { actions: context.exports as typeof import('./faction-scenes'), uploads, sceneUploads, images: () => images, complete: () => complete, writes: () => writes, race: () => { race = true }, externalCompletion: () => { complete = !complete; version++ }, externalEdit: () => { images = [...images as unknown[], { url: 'https://assets.test/external.png' }]; version++ } }
}

test('그림 변경 없이 완결 여부를 저장하고, 이후 해설 편집은 기존 완결 상태를 유지한다', async () => {
  const f = fixture(), initial = await f.actions.getSceneEditorData('entry')
  assert.ok(initial)
  const before = structuredClone(f.images())
  const saved = await f.actions.saveSceneArtwork({ id: 'entry', revision: initial.revision, scenes: initial.scenes, cover: initial.cover, scenesComplete: true })
  assert.ok(saved.success)
  assert.equal(f.complete(), true)
  assert.deepEqual(f.images(), before)
  const updated = await f.actions.getSceneEditorData('entry')
  assert.ok(updated?.scenesComplete)
  const edited = await f.actions.saveSceneArtwork({ id: 'entry', revision: updated.revision, scenes: [{ ...updated.scenes[0], caption: '새 해설' }], cover: updated.cover })
  assert.ok(edited.success)
  assert.equal(f.complete(), true)
  const reopened = await f.actions.saveSceneArtwork({ id: 'entry', revision: edited.revision!, scenes: [{ ...updated.scenes[0], caption: '새 해설' }], cover: updated.cover, scenesComplete: false })
  assert.ok(reopened.success)
  assert.equal(f.complete(), false)
})

test('다른 편집기가 완결 여부만 바꿔도 오래 열린 편집기는 그 상태를 덮어쓰지 않는다', async () => {
  const f = fixture(), initial = await f.actions.getSceneEditorData('entry')
  assert.ok(initial)
  f.externalCompletion()
  const saved = await f.actions.saveSceneArtwork({ id: 'entry', revision: initial.revision, scenes: initial.scenes, cover: initial.cover, scenesComplete: false })
  assert.equal(saved.success, false)
  assert.equal(f.complete(), true)
  assert.equal(f.writes(), 0)
})

test('116개 장면을 저장해도 REST 요청 주소는 짧고 전체 편집 내용은 본문에 실린다', async () => {
  let row = {
    id: 'entry', name: '오디세이아', slug: 'homer-odyssey', is_myth: false, xmin: '42',
    team_images: Array.from({ length: 116 }, (_, index) => ({
      url: `https://assets.test/scene-${index}.webp`, kind: 'scene' as const,
      label: `장면 ${index + 1}`, caption: '수정 전 장면 해설입니다. '.repeat(10),
    })),
  }
  const writes: Array<{ url: URL; body: typeof row }> = []
  const db = createClient('https://db.test', 'test-key', {
    auth: { persistSession: false },
    global: { fetch: async (input, options) => {
      const url = new URL(String(input))
      if (url.href.length > 8192) return new Response('', { status: 414 })
      if (options?.method === 'PATCH') {
        const body = JSON.parse(String(options.body))
        writes.push({ url, body })
        assert.equal(url.searchParams.get('xmin'), `eq.${row.xmin}`)
        row = { ...row, ...body, xmin: String(Number(row.xmin) + 1) }
      }
      const single = new Headers(options?.headers).get('Accept') === 'application/vnd.pgrst.object+json'
      return new Response(JSON.stringify(single ? row : [row]), { headers: { 'Content-Type': 'application/json' } })
    } },
  })
  const f = fixture(true, db), initial = await f.actions.getSceneEditorData('entry')
  assert.ok(initial)
  const scenes = initial.scenes.map((scene, index) => ({ ...scene, caption: `수정한 설명 ${index + 1}` }))
  const result = await f.actions.saveSceneArtwork({ id: 'entry', revision: initial.revision, scenes, cover: null })
  assert.ok(result.success, `실제 REST 요청 저장 실패: ${JSON.stringify(result)}`)
  assert.equal(writes.length, 1)
  assert.ok(writes[0].url.href.length < 512)
  assert.equal(writes[0].url.searchParams.has('team_images'), false)
  assert.deepEqual(writes[0].body.team_images, scenes)
})

test('실제 저장 액션으로 연속 저장해도 jsonb 키 순서와 무관하며 기존 단체 사진은 유지한다', async () => {
  const f = fixture(), initial = await f.actions.getSceneEditorData('entry')
  assert.ok(initial)
  const scenes: FactionTeamImage[] = [{ ...initial.scenes[0], caption: '수정 설명' }]
  const first = await f.actions.saveSceneArtwork({ id: 'entry', revision: initial.revision, scenes, cover: null })
  assert.ok(first.success)
  const second = await f.actions.saveSceneArtwork({ id: 'entry', revision: first.revision!, scenes: [{ ...scenes[0], captionEn: 'Updated caption' }], cover: null })
  assert.ok(second.success)
  assert.equal(f.writes(), 2)
  assert.deepEqual((f.images() as unknown[])[0], { url: 'https://assets.test/group.png', label: '단체', custom: 'keep' })
})

test('오래 열린 편집기와 읽기-쓰기 사이의 경합 모두 새 데이터를 덮어쓰지 않는다', async () => {
  for (const duringWrite of [false, true]) {
    const f = fixture(), initial = await f.actions.getSceneEditorData('entry')
    assert.ok(initial)
    if (duringWrite) f.race(); else f.externalEdit()
    const result = await f.actions.saveSceneArtwork({ id: 'entry', revision: initial.revision, scenes: [{ ...initial.scenes[0], caption: '수정' }], cover: null })
    assert.equal(result.success, false)
    assert.equal(f.writes(), 0)
    assert.equal((f.images() as unknown[]).length, 3)
  }
})

test('로그인하지 않은 호출은 조회·저장·업로드에 접근할 수 없다', async () => {
  const f = fixture(false)
  await assert.rejects(f.actions.getSceneEditorData('entry'), /관리자/)
  await assert.rejects(f.actions.saveSceneArtwork({ id: 'entry', revision: '', scenes: [], cover: null }), /관리자/)
  await assert.rejects(f.actions.uploadSceneArtwork(new FormData()), /관리자/)
  assert.equal(f.writes(), 0)
})

test('시작 그림은 해상도를 유지한 PNG와 버전 주소로, 장면은 기존 WebP 처리기로 보낸다', async () => {
  const f = fixture()
  const bytes = await sharp({ create: { width: 60, height: 40, channels: 3, background: '#243648' } }).jpeg().toBuffer()
  for (const role of ['cover', 'scene']) {
    const form = new FormData()
    form.set('id', 'entry'); form.set('role', role); form.set('file', new File([new Uint8Array(bytes)], 'image.jpg', { type: 'image/jpeg' }))
    const result = await f.actions.uploadSceneArtwork(form)
    assert.ok(result.success)
    if (role === 'cover') assert.match(result.url!, /myth\/title-art\/myth-[a-f0-9]{12}\.png$/)
  }
  assert.equal(f.uploads.length, 1)
  const meta = await sharp(f.uploads[0].body).metadata()
  assert.deepEqual([meta.format, meta.width, meta.height], ['png', 60, 40])
  assert.equal(f.sceneUploads.length, 1)
  assert.equal(Buffer.from(f.sceneUploads[0].image.split(',')[1], 'base64').compare(bytes), 0)
  assert.equal(f.writes(), 0, '업로드만으로 서비스의 이미지 연결은 바뀌지 않는다')
})
