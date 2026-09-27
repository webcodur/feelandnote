import { ACCESS_SOURCES, type AccessSourceState, type AccessStreamEvent } from './contentAccess'

export function applyAccessEvent(previous: AccessSourceState, event: AccessStreamEvent): AccessSourceState {
  // 도착이 늦은 진행 알림/연결 종료가 이미 받은 링크를 지우지 않는다.
  if (previous.status === 'ready' && event.kind !== 'result') return previous
  if (event.kind === 'result') return { status: 'ready', phase: previous.phase, data: event.data }
  if (event.kind === 'error') return { status: 'error', phase: previous.phase }
  return { status: 'loading', phase: event.phase, detail: event.detail }
}

export async function readAccessStream(body: ReadableStream<Uint8Array>, onEvent: (event: AccessStreamEvent) => void) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const consume = (line: string) => {
    if (!line.trim()) return
    const event = JSON.parse(line) as AccessStreamEvent
    if (!Object.values(ACCESS_SOURCES).flat().includes(event.source) || !['progress', 'result', 'error'].includes(event.kind)) throw new Error('Invalid access stream')
    onEvent(event)
  }
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      let end: number
      while ((end = buffer.indexOf('\n')) >= 0) { consume(buffer.slice(0, end)); buffer = buffer.slice(end + 1) }
      if (buffer.length > 100000) throw new Error('Access event too large')
      if (done) { consume(buffer); break }
    }
  } finally { reader.releaseLock() }
}
