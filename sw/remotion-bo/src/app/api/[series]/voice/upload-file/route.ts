import { NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { VOICE_DIR, loadR2Manifest, fileHash } from '@/lib/server-utils'
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
    const filePath = path.join(VOICE_DIR, episode, fileName)
    const buf = await readFile(filePath)
    const hash = fileHash(buf)
    const r2Key = `${R2_PREFIX}/${episode}/${fileName}`

    const r2 = getR2Client()
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: r2Key,
      Body: buf,
      ContentType: 'audio/wav',
    }))

    // Update manifest
    const manifest = await loadR2Manifest(episode)
    manifest[fileName] = { hash, size: buf.length, uploadedAt: new Date().toISOString() }
    await writeFile(
      path.join(VOICE_DIR, episode, 'r2-manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
      'utf-8',
    )

    return NextResponse.json({ success: true, bytes: buf.length })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) })
  }
}
