import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

type Element = { type: unknown; props: Record<string, unknown> }
const element = (type: unknown, props: Record<string, unknown>): Element => ({ type, props })
const compiled = ts.transpileModule(readFileSync(new URL('./FactionCard.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText

test('featured faction card opens its canonical theme slug', () => {
  const dependencies: Record<string, unknown> = {
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'next/image': { default: 'Image' },
    '@/components/ui/BlurDissolve': { default: 'BlurDissolve' },
    '@/i18n/navigation': { Link: 'Link' },
    './ExploreSkeleton': { HUB_FACTION_CARD: 'card', HUB_FACTION_GRID: 'grid' },
  }
  const module = { exports: {} as { default: (props: unknown) => Element } }
  new Function('require', 'module', 'exports', compiled)((id: string) => dependencies[id], module, module.exports)

  const tree = module.exports.default({ factions: [{ id: 'database-id', slug: 'ai-pioneers', name: 'AI pioneers', name_en: null, color: '#fff' }] })
  const card = (tree.props.children as Element[])[0]
  assert.equal(card.type, 'Link')
  assert.equal(card.props.href, '/explore/faction/ai-pioneers')
})
