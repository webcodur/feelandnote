import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { VOICE_DIR } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? 'feelandnote'
const R2_PREFIX = 'remotion/voice'

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, fileName } = await req.json()
  if (!episode || !fileName) {
    return NextResponse.json({ success: false, error: 'episode, fileName required' }, { status: 400 })
  }

  try {
    const r2Key = `${R2_PREFIX}/${episode}/${fileName}`
    const r2 = getR2Client()
    const res = await r2.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
    }))

    if (!res.Body) {
      return NextResponse.json({ success: false, error: 'R2 파일 없음' })
    }

    const chunks: Uint8Array[] = []
    // @ts-expect-error readable stream
    for await (const chunk of res.Body) chunks.push(chunk)
    const buf = Buffer.concat(chunks)

    const filePath = path.join(VOICE_DIR, episode, fileName)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, buf)

    return NextResponse.json({ success: true, bytes: buf.length })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) })
  }
}
