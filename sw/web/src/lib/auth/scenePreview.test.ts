import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

test('only the signed-in 주인장 account with active super-admin access can preview scenes', async () => {
  let id: string | undefined, authError: unknown = null, success = true, role = 'super_admin'
  const mocks: Record<string, unknown> = {
    react: { cache: (fn: unknown) => fn },
    './checkAdmin': { checkAdmin: async () => ({ success, role }) },
    '@/lib/db/server': { getRequestUser: async () => ({ data: { user: id ? { id } : null }, error: authError }), createClient: async () => ({}) },
  }
  const source = readFileSync(new URL('./scenePreview.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const loaded = { exports: {} as { canPreviewScenes: () => Promise<boolean> } }
  new Function('require', 'exports', code)((name: string) => { assert.ok(name in mocks, name); return mocks[name] }, loaded.exports)
  for (const other of [undefined, 'ordinary-user', '3cbbf29b-65b5-4b02-b051-21e4e3d2a025']) {
    id = other
    assert.equal(await loaded.exports.canPreviewScenes(), false)
  }
  id = '5e1d704d-c4fc-46c7-a595-513ceeac5bf2'
  assert.equal(await loaded.exports.canPreviewScenes(), true)
  role = 'admin'
  assert.equal(await loaded.exports.canPreviewScenes(), false)
  role = 'super_admin'; success = false
  assert.equal(await loaded.exports.canPreviewScenes(), false)
  success = true; authError = new Error('Invalid session')
  assert.equal(await loaded.exports.canPreviewScenes(), false)
})
