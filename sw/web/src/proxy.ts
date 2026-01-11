import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// 인증이 필요한 경로
const protectedPaths = [
  '/archive',
  '/feed',
  '/social',
  '/lounge',
  '/stats',
  '/achievements',
  '/settings'
]

// 인증된 사용자가 접근하면 안 되는 경로
const authPaths = ['/login', '/signup']

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // 보호된 경로에 비인증 사용자 접근 시
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  // 인증 경로에 인증된 사용자 접근 시
  if (authPaths.some((path) => pathname.startsWith(path))) {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/archive'
      return NextResponse.redirect(url)
    }
  }
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 다음으로 시작하는 경로를 제외한 모든 요청:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     * - 이미지 파일들
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
