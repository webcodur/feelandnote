import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 루트 경로는 /celebs로 리다이렉트
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/celebs', request.url))
  }

  // 로그인 페이지와 public API는 체크 제외
  if (pathname === '/login' || pathname.startsWith('/api/image-proxy')) {
    return NextResponse.next()
  }

  const isBookRecommendProductionApi =
    pathname.startsWith('/api/book-recommend')
    || pathname.startsWith('/api/tasks')
    || pathname.startsWith('/api/open-folder')
  const remotionLocal =
    process.env.REMOTION_LOCAL === '1' || process.env.FACTION_LOCAL === '1'
  if (isBookRecommendProductionApi && !remotionLocal) {
    return NextResponse.json(
      { error: '서재 탐방 제작 API는 로컬 렌더 환경에서만 동작합니다.' },
      { status: 503 },
    )
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 로그인 안 됨 → 로그인 페이지로
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 역할과 활성 계정 상태를 DB의 단일 관리자 판정으로 확인한다.
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')

  if (adminError || !isAdmin) {
    // 권한 없음 → 로그인 페이지로 (에러 메시지 포함)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // 확장자로 끝나는 서재 탐방 이미지·음성 API도 반드시 관리자 인증을 거친다.
    '/api/book-recommend/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
