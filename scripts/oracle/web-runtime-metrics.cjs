// Preload before Next starts. Only fixed route groups and numeric counters are retained.
const dc = require('node:diagnostics_channel')
const v8 = require('node:v8')
const key = Symbol.for('feelandnote.runtime-metrics')
if (!globalThis[key]) {
  const groups = new Map()
  let active = 0
  let peak = 0
  function group(url = '') {
    const pathname = url.split('?', 1)[0].replace(/^\/(en|ko)(?=\/|$)/, '')
    if (!pathname || pathname === '/') return 'home'
    const first = pathname.split('/')[1]
    return ['celeb', 'content', 'explore', 'library', 'api', '_next', 'search', 'seo-image'].includes(first) ? first : 'other'
  }
  function start({ request, response }) {
    try {
      const name = group(request.url)
      const began = performance.now()
      active++
      peak = Math.max(peak, active)
      response.once('close', () => {
        active--
        const row = groups.get(name) || { requests: 0, errors: 0, aborted: 0, maxMs: 0 }
        row.requests++
        row.errors += Number(response.statusCode >= 500)
        row.aborted += Number(!response.writableFinished)
        row.maxMs = Math.max(row.maxMs, Math.round(performance.now() - began))
        groups.set(name, row)
      })
    } catch { /* Observability must never interrupt an HTTP request. */ }
  }
  function snapshot() {
    const result = { tag: 'feelandnote-runtime', time: new Date().toISOString(), pid: process.pid,
      memory: process.memoryUsage(), heapLimit: v8.getHeapStatistics().heap_size_limit,
      active, peak, routes: Object.fromEntries(groups) }
    groups.clear()
    peak = active
    return result
  }
  dc.subscribe('http.server.request.start', start)
  const timer = setInterval(() => {
    try { console.log(JSON.stringify(snapshot())) } catch { /* Keep the app running. */ }
  }, 15000)
  timer.unref()
  globalThis[key] = { snapshot, stop() { clearInterval(timer); dc.unsubscribe('http.server.request.start', start); delete globalThis[key] } }
}
module.exports = globalThis[key]
