'use strict'

// Next 16.1 filesystem format stays intact. Only Oracle's linked FETCH directory
// and its tag invalidations survive a release; HTML/RSC stay in their own slot.
const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const FileSystemCache = require('next/dist/server/lib/incremental-cache/file-system-cache').default
const { tagsManifest } = require('next/dist/server/lib/incremental-cache/tags-manifest.external')
const states = new Map()

function sharedFetchRoot(ctx) {
  if (ctx.dev || !ctx.flushToDisk) return null
  const directory = path.resolve(ctx.serverDistDir, '../cache/fetch-cache')
  try {
    return fs.lstatSync(directory).isSymbolicLink() ? fs.realpathSync(directory) : null
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function refreshTags(logPath) {
  let fd
  try {
    fd = fs.openSync(logPath, 'r')
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }
  try {
    const state = states.get(logPath) ?? { offset: 0, events: new Map() }
    states.set(logPath, state)
    const size = fs.fstatSync(fd).size
    if (size < state.offset) throw new Error('Shared cache invalidation log was truncated')
    while (state.offset < size) {
      const buffer = Buffer.alloc(Math.min(64 * 1024, size - state.offset))
      const bytes = fs.readSync(fd, buffer, 0, buffer.length, state.offset)
      const end = buffer.lastIndexOf(10, bytes - 1)
      // An append still in progress is read on the next request.
      if (end < 0) break
      for (const line of buffer.subarray(0, end).toString('utf8').split('\n')) {
        const event = JSON.parse(line)
        if (typeof event.tag !== 'string' || !Number.isFinite(event.at)) {
          throw new Error('Invalid shared cache invalidation record')
        }
        if (event.at < (state.events.get(event.tag) ?? 0)) continue
        state.events.set(event.tag, event.at)
        const entry = { ...tagsManifest.get(event.tag) }
        if (event.durations) {
          entry.stale = Math.max(entry.stale ?? 0, event.at)
          if (event.durations.expire !== undefined) entry.expired = event.at + event.durations.expire * 1000
        } else {
          entry.expired = event.at
        }
        tagsManifest.set(event.tag, entry)
      }
      state.offset += end + 1
    }
  } finally {
    fs.closeSync(fd)
  }
}

module.exports = class SharedDataCache extends FileSystemCache {
  constructor(ctx) {
    const root = sharedFetchRoot(ctx)
    // A per-process FETCH memory copy would miss the other slot's updates.
    super(root ? { ...ctx, maxMemoryCacheSize: 0 } : ctx)
    this.sharedRoot = root
    this.tagLog = root ? path.join(path.dirname(root), 'tags.ndjson') : null
  }

  async get(key, ctx) {
    if (this.tagLog) refreshTags(this.tagLog)
    return super.get(key, ctx)
  }

  async set(key, data, ctx) {
    if (!this.sharedRoot || data?.kind !== 'FETCH') return super.set(key, data, ctx)
    if (!/^[a-f0-9]{64}$/u.test(key)) throw new Error('Invalid shared FETCH cache key')
    const target = path.join(this.sharedRoot, key)
    const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`
    try {
      fs.writeFileSync(temporary, JSON.stringify({ ...data, tags: ctx.fetchCache ? ctx.tags : [] }), { flag: 'wx', mode: 0o600 })
      fs.renameSync(temporary, target)
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
    }
  }

  async revalidateTag(tags, durations) {
    if (!this.tagLog) return super.revalidateTag(tags, durations)
    const list = typeof tags === 'string' ? [tags] : tags
    if (!list.length) return
    const at = Date.now()
    const fd = fs.openSync(this.tagLog, 'a', 0o600)
    try {
      for (const tag of list) {
        // One short O_APPEND write per tag: concurrent processes cannot overwrite
        // each other's invalidations. Sync before acknowledging revalidation.
        fs.writeSync(fd, JSON.stringify({ tag, at, durations }) + '\n')
      }
      fs.fdatasyncSync(fd)
    } finally {
      fs.closeSync(fd)
    }
    refreshTags(this.tagLog)
  }
}
