import 'server-only'

import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { isVoiceDirection } from './voice-directions'
import { jobDirectory } from './paths'
import type { AudioJob, OutputAudio, OutputRun, VoiceDirection } from './types'

type LocatedAudio = OutputAudio & { absolutePath: string; updatedAt: string }
type RunMetadata = {
  generatedAt?: string
  text?: string
  voiceDirections?: unknown[]
  files?: Array<{ name?: string; verification?: string; textMatchPercent?: number }>
}

export function outputDirectory(id: string) {
  return path.join(jobDirectory(id), 'output')
}

export function resolveOutputFile(id: string, relativePath: string) {
  const root = path.resolve(outputDirectory(id))
  const file = path.resolve(root, relativePath)
  const relative = path.relative(root, file)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || path.extname(file).toLowerCase() !== '.wav') return null
  return file
}

export async function listOutputRuns(job: AudioJob): Promise<OutputRun[]> {
  const root = outputDirectory(job.id)
  const current = new Set(Object.values(job.files).filter((value): value is string => typeof value === 'string').map((value) => path.resolve(value)))
  const located = await collectAudio(root, root, current).catch(() => [])
  const groups = groupAudio(located)
  const runs = await Promise.all([...groups].map(async ([id, files]) => {
    const metadata = id === 'legacy' ? {} : await readMetadata(path.join(root, id, 'run.json'))
    const generatedAt = metadata.generatedAt ?? files.map(({ updatedAt }) => updatedAt).toSorted().at(-1) ?? new Date(0).toISOString()
    return {
      id, generatedAt, text: metadata.text,
      voiceDirections: (metadata.voiceDirections ?? []).filter(isVoiceDirection) as VoiceDirection[],
      current: files.some((file) => file.current),
      files: files.map(({ absolutePath: _, updatedAt: __, ...file }) => {
        const details = metadata.files?.find((item) => item.name === file.name)
        return { ...file, verification: details?.verification, textMatchPercent: details?.textMatchPercent }
      }).toSorted((a, b) => kindOrder(a.kind) - kindOrder(b.kind)),
    }
  }))
  return runs.toSorted((a, b) => Number(b.current) - Number(a.current) || b.generatedAt.localeCompare(a.generatedAt))
}

async function collectAudio(directory: string, root: string, current: Set<string>): Promise<LocatedAudio[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectAudio(absolutePath, root, current)
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.wav') return []
    const info = await stat(absolutePath)
    return [{
      kind: path.parse(entry.name).name, name: entry.name,
      relativePath: path.relative(root, absolutePath).split(path.sep).join('/'),
      sizeBytes: info.size, durationSeconds: await wavDuration(absolutePath),
      current: current.has(path.resolve(absolutePath)), absolutePath,
      updatedAt: info.mtime.toISOString(),
    }]
  }))
  return nested.flat()
}

async function readMetadata(file: string): Promise<RunMetadata> {
  try { return JSON.parse(await readFile(file, 'utf8')) as RunMetadata } catch { return {} }
}

async function wavDuration(file: string) {
  try {
    const data = await readFile(file)
    if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WAVE') return 0
    let offset = 12, byteRate = 0, dataSize = 0
    while (offset + 8 <= data.length) {
      const id = data.toString('ascii', offset, offset + 4)
      const size = data.readUInt32LE(offset + 4)
      if (id === 'fmt ' && offset + 20 <= data.length) byteRate = data.readUInt32LE(offset + 16)
      if (id === 'data') { dataSize = size; break }
      offset += 8 + size + size % 2
    }
    return byteRate ? Math.round(dataSize / byteRate * 100) / 100 : 0
  } catch { return 0 }
}

function kindOrder(kind: string) {
  return ({ base: 0, trained: 1, polished: 2 } as Record<string, number>)[kind] ?? 3
}

function groupAudio(files: LocatedAudio[]) {
  const groups = new Map<string, LocatedAudio[]>()
  for (const file of files) {
    const directory = path.dirname(file.relativePath)
    const id = directory === '.' ? 'legacy' : directory
    groups.set(id, [...(groups.get(id) ?? []), file])
  }
  return groups
}
