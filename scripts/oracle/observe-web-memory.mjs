// Run on the VM after explicitly opening Node's loopback inspector with SIGUSR1.
// Samples allocations (not object contents); exits and closes the inspector after a bounded session.
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const seconds = Number(process.argv[2] ?? 900)
const output = process.argv[3] ?? '/opt/feelandnote/diagnostics'
if (!Number.isInteger(seconds) || seconds < 10 || seconds > 1800) throw new Error('Duration must be 10–1800 seconds')
const [target] = await (await fetch('http://127.0.0.1:9229/json', { signal: AbortSignal.timeout(3000) })).json()
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let nextId = 0
const pending = new Map()
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data)
  const call = pending.get(message.id)
  if (!call) return
  pending.delete(message.id)
  clearTimeout(call.timer)
  if (message.error) call.reject(new Error(message.error.message))
  else call.resolve(message.result)
}
function post(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)) }, 10000)
    pending.set(id, { resolve, reject, timer })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
const started = Date.now()
const stamp = new Date(started).toISOString().replaceAll(':', '-')
try {
  await post('HeapProfiler.startSampling', { samplingInterval: 524288 })
  while (Date.now() - started < seconds * 1000) {
    const { result } = await post('Runtime.evaluate', {
      expression: 'JSON.stringify({pid:process.pid,memory:process.memoryUsage(),heap:process.getBuiltinModule("v8").getHeapStatistics(),resources:process.getActiveResourcesInfo().reduce((a,k)=>(a[k]=(a[k]||0)+1,a),{})})',
      returnByValue: true,
    })
    if (result?.type !== 'string') throw new Error('Memory sampling returned no metrics')
    console.log(JSON.stringify({ time: new Date().toISOString(), ...JSON.parse(result.value) }))
    if (Math.floor((Date.now() - started) / 5000) % 12 === 0) {
      const profile = await post('HeapProfiler.getSamplingProfile')
      writeFileSync(path.join(output, `web-${stamp}.heapprofile`), JSON.stringify(profile.profile), { mode: 0o600 })
    }
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
} finally {
  try {
    const profile = await post('HeapProfiler.stopSampling')
    writeFileSync(path.join(output, `web-${stamp}.heapprofile`), JSON.stringify(profile.profile), { mode: 0o600 })
  } finally {
    try {
      // Also close when saving the profile fails. Delay until the evaluation reply is delivered.
      await post('Runtime.evaluate', { expression: 'setTimeout(()=>process.getBuiltinModule("inspector").close(),100).unref(); undefined' })
    } finally {
      socket.close()
    }
  }
}
