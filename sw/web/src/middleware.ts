import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

// 인증이 필요한 경로
const protectedPaths: string[] = [];

// 인증된 사용자가 접근하면 안 되는 경로
const authPaths = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  // 1) next-intl locale 처리
  const intlResponse = intlMiddleware(request);

  // 2) Supabase 세션 갱신
  const { supabaseResponse, user } = await updateSession(request);

  // Supabase 쿠키를 intl response에 복사
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      maxAge: cookie.maxAge,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite as 'lax' | 'strict' | 'none' | undefined,
    });
  });

  // 3) Auth redirect — locale prefix 제거 후 경로 비교
  const pathname = request.nextUrl.pathname;
  const strippedPath = pathname.replace(/^\/(ko|en)/, '') || '/';

  // 보호된 경로에 비인증 사용자 접근 시
  if (protectedPaths.some((path) => strippedPath.startsWith(path))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', strippedPath);
      return NextResponse.redirect(url);
    }
  }

  // 인증 경로에 인증된 사용자 접근 시
  if (authPaths.some((path) => strippedPath.startsWith(path))) {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${user.id}/reading`;
      return NextResponse.redirect(url);
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    /*
     * 다음으로 시작하는 경로를 제외한 모든 요청:
     * - _next/static, _next/image (빌드 에셋)
     * - favicon.ico
     * - assets/ (게임 오디오 등 정적 에셋)
     * - 미디어/폰트/데이터 확장자 (svg, png, mp3, woff2, json 등)
     * - auth/callback (OAuth 콜백)
     * - api/ (API 라우트)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|api/|assets/|sitemap|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4|ogg|wav|woff2?|ttf|eot|ico|json|xml|txt|webmanifest)$).*)'
  ]
};
