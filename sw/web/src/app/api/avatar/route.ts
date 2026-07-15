import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2, deleteFromR2, R2_PUBLIC_URL } from '@/lib/r2'

// 서버 검증 기준 (클라이언트 검증은 우회 가능하므로 여기가 본선)
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 8 * 1024 * 1024
const AVATAR_SIZE = 256
const WEBP_QUALITY = 82

// #region 옛 아바타 키 추출
/** 기존 avatar_url이 우리 R2 공개 URL이면 그 키를 돌려준다. 외부 URL이면 null */
function extractOwnR2Key(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null

  const prefix = `${R2_PUBLIC_URL}/`
  if (!avatarUrl.startsWith(prefix)) return null

  // 쿼리·해시를 떼고 순수 키만 남긴다
  const key = avatarUrl.slice(prefix.length).split(/[?#]/)[0]
  return key ? decodeURIComponent(key) : null
}
// #endregion

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: '지원하지 않는 이미지 형식입니다.' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '이미지 용량이 8MB를 넘습니다.' }, { status: 400 })
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer())

  // 실제로 디코딩되는 이미지인지 확인 (위조 확장자 차단)
  let width: number | undefined
  let height: number | undefined
  try {
    const meta = await sharp(inputBuffer).metadata()
    width = meta.width
    height = meta.height
  } catch {
    return NextResponse.json({ error: '이미지를 읽을 수 없습니다.' }, { status: 400 })
  }

  if (!width || !height) {
    return NextResponse.json({ error: '이미지를 읽을 수 없습니다.' }, { status: 400 })
  }

  // 정사각 중앙 크롭 + 256 리사이즈. 원본이 작으면 확대하지 않는다
  const targetSize = Math.min(width, height, AVATAR_SIZE)

  let output: Buffer
  try {
    output = await sharp(inputBuffer)
      .resize(targetSize, targetSize, {
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()
  } catch (e) {
    console.error('[아바타 업로드] 이미지 처리 실패:', e)
    return NextResponse.json({ error: '이미지 처리에 실패했습니다.' }, { status: 400 })
  }

  // 타임스탬프로 키를 갈아 CDN 캐시에 옛 사진이 남지 않게 한다
  const key = `users/${user.id}/avatar-${Date.now()}.webp`

  try {
    await uploadToR2(key, output, 'image/webp')
  } catch (e) {
    console.error('[아바타 업로드] R2 업로드 실패:', e)
    return NextResponse.json({ error: '업로드에 실패했습니다.' }, { status: 502 })
  }

  const url = `${R2_PUBLIC_URL}/${key}`

  // 지울 대상은 미리 알아두되, 삭제는 DB 갱신이 성공한 뒤에 한다.
  // 먼저 지우면 DB 갱신이 실패했을 때 옛 URL만 남고 파일은 사라져 프사가 깨진다.
  const { data: prev } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', user.id)

  if (error) {
    console.error('[아바타 업로드] 프로필 갱신 실패:', error)
    return NextResponse.json({ error: '프로필 저장에 실패했습니다.' }, { status: 500 })
  }

  // 옛 아바타 정리 — 우리 R2에 올린 것만 지운다. 실패해도 이미 갱신은 끝났으므로 막지 않는다
  const oldKey = extractOwnR2Key(prev?.avatar_url ?? null)
  if (oldKey && oldKey !== key) {
    try {
      await deleteFromR2(oldKey)
    } catch (e) {
      console.error('[아바타 업로드] 옛 아바타 삭제 실패:', oldKey, e)
    }
  }

  return NextResponse.json({ url })
}
