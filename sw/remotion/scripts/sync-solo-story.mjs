#!/usr/bin/env node
/** 검토용 SOLO Markdown의 본문만 solo.{locale}.json에 되돌린다. 기본은 dry-run. */
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function findEpisodeDir(person) {
  const root = join(ROOT, 'public', 'episodes')
  function walk(dir) {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return null }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue
      const sub = join(dir, entry.name)
      if (entry.name === person && existsSync(join(sub, '_status.json'))) return sub
      const found = walk(sub)
      if (found) return found
    }
    return null
  }
  const found = walk(root)
  if (!found) throw new Error(`Episode not found: ${person}`)
  return found
}

function parseMarkdown(source) {
  const header = source.match(/<!-- SOLO_STORY person="([^"]+)" locale="(ko|en)" -->/)
  if (!header) throw new Error('SOLO_STORY 헤더가 없다. extract-story.mjs로 만든 원고인지 확인한다.')
  const entries = []
  const pattern = /<!-- SOLO_SECTION folder="([^"]+)" id="([^"]+)" -->\r?\n([\s\S]*?)\r?\n<!-- \/SOLO_SECTION -->/g
  for (const match of source.matchAll(pattern)) {
    entries.push({ folder: match[1], id: match[2], text: match[3].trim() })
  }
  if (entries.length === 0) throw new Error('SOLO_SECTION 본문이 없다.')
  return { person: header[1], locale: header[2], entries }
}

function assertExactStructure(sections, entries, folder) {
  const actual = sections.map(section => section.id)
  const edited = entries.map(entry => entry.id)
  if (new Set(edited).size !== edited.length) throw new Error(`${folder}: 중복 장면 번호가 있다.`)
  if (actual.length !== edited.length || actual.some((id, index) => id !== edited[index])) {
    throw new Error(`${folder}: 장면 추가·삭제·순서 변경은 Markdown에서 반영하지 않는다. JSON 구조를 별도로 수정한다.`)
  }
}

try {
  const args = process.argv.slice(2)
  const markdownFile = args.find(arg => !arg.startsWith('--'))
  if (!markdownFile) throw new Error('Usage: sync-solo-story.mjs <story.md|-> [--apply]')
  const parsed = parseMarkdown(readFileSync(markdownFile === '-' ? 0 : markdownFile, 'utf8'))
  const dir = findEpisodeDir(parsed.person)
  const grouped = Map.groupBy(parsed.entries, entry => entry.folder)
  let changes = 0

  for (const [folder, entries] of grouped) {
    const file = join(dir, 'books', folder, `solo.${parsed.locale}.json`)
    if (!existsSync(file)) throw new Error(`Missing SOLO data: ${file}`)
    const document = JSON.parse(readFileSync(file, 'utf8'))
    const sections = Array.isArray(document) ? document : document.sections
    if (!Array.isArray(sections)) throw new Error(`Invalid SOLO data: ${file}`)
    assertExactStructure(sections, entries, folder)

    let fileChanges = 0
    entries.forEach((entry, index) => {
      if (sections[index].text !== entry.text) {
        changes += 1
        fileChanges += 1
        console.log(`${folder}/${entry.id}: ${sections[index].text.length}자 → ${entry.text.length}자`)
        sections[index].text = entry.text
      }
    })

    if (args.includes('--apply') && fileChanges > 0) {
      const temp = `${file}.tmp`
      writeFileSync(temp, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
      renameSync(temp, file)
    }
  }

  console.log(args.includes('--apply') ? `반영 완료: ${changes}개 본문` : `미리보기: ${changes}개 본문 변경 예정 (--apply로 반영)`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
