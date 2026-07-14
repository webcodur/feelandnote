import { readFile } from 'node:fs/promises'
import { getJob } from '@/lib/jobs'
import { NextResponse } from 'next/server'

type Context = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Context) {
  const job = await getJob((await params).id)
  const file = job?.files.source
  if (!file) return NextResponse.json({ message: '원본 음원이 없습니다.' }, { status: 404 })
  try {
    const buffer = await readFile(file)
    return NextResponse.json({ peaks: createPeaks(buffer, 6000) }, { headers: { 'Cache-Control': 'private, max-age=3600' } })
  } catch {
    return NextResponse.json({ message: '파형을 만들지 못했습니다.' }, { status: 500 })
  }
}

function createPeaks(buffer: Buffer, points: number) {
  let channels = 1
  let bits = 16
  let offset = 12
  let dataStart = 44
  let dataLength = Math.max(buffer.length - dataStart, 0)
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString('ascii', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    if (chunk === 'fmt ') { channels = buffer.readUInt16LE(offset + 10); bits = buffer.readUInt16LE(offset + 22) }
    if (chunk === 'data') { dataStart = offset + 8; dataLength = size; break }
    offset += 8 + size + size % 2
  }
  const bytesPerSample = bits / 8
  const frames = Math.floor(dataLength / Math.max(bytesPerSample * channels, 1))
  const framesPerPoint = Math.max(Math.floor(frames / points), 1)
  const sampleStep = Math.max(Math.floor(framesPerPoint / 80), 1)
  return Array.from({ length: points }, (_, index) => {
    const first = index * framesPerPoint
    const last = Math.min(first + framesPerPoint, frames)
    let peak = 0
    for (let frame = first; frame < last; frame += sampleStep) {
      const position = dataStart + frame * channels * bytesPerSample
      if (position + 1 >= buffer.length) break
      const value = bits === 16 ? Math.abs(buffer.readInt16LE(position) / 32768) : Math.abs((buffer[position] - 128) / 128)
      peak = Math.max(peak, value)
    }
    return Math.round(peak * 1000) / 1000
  })
}
