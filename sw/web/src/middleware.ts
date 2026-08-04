import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

// 인증이 필요한 경로
const protectedPaths: string[] = [];

// 인증된 사용자가 접근하면 안 되는 경로
const authPaths = ['/login', '/signup'];

// 미들웨어를 건너뛸 SEO/메타데이터 경로
const SEO_PATHS = ['/sitemap.xml', '/robots.txt', '/feed.xml', '/opengraph-image']

// 미들웨어를 건너뛸 PWA 정적 파일
// 아래 matcher는 .png·.webmanifest 등 확장자만 제외하고 .js·.html은 제외하지 않는다.
// 그대로 두면 next-intl이 /ko/sw.js 로 재작성해 404가 되고 서비스 워커 등록이 실패한다.
const PWA_PATHS = ['/sw.js', '/offline.html']

export async function middleware(request: NextRequest) {
  // 0) SEO·PWA 정적 경로는 미들웨어 스킵 (next-intl이 가로채지 않도록)
  const { pathname: rawPathname } = request.nextUrl
  if (SEO_PATHS.includes(rawPathname) || PWA_PATHS.includes(rawPathname)) {
    return NextResponse.next()
  }

  // 1) next-intl locale 처리
  const intlResponse = intlMiddleware(request);

  // 2) Supabase 세션 갱신. 익명 크롤러/방문자는 인증 쿠키가 없으므로
  // auth.getUser() 왕복을 만들지 않는다. 로그인 쿠키가 있을 때만 기존 갱신을 수행한다.
  const hasSupabaseAuthCookie = request.cookies.getAll().some(({ name }) =>
    name.startsWith('sb-') && name.includes('-auth-token')
  );
  let user: Awaited<ReturnType<typeof updateSession>>['user'] = null;

  if (hasSupabaseAuthCookie) {
    const session = await updateSession(request);
    user = session.user;

    // Supabase가 갱신한 쿠키를 intl response에 복사
    session.supabaseResponse.cookies.getAll().forEach((cookie) => {
      intlResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as 'lax' | 'strict' | 'none' | undefined,
      });
    });
  }

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
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|api/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4|ogg|wav|woff2?|ttf|eot|ico|json|xml|txt|webmanifest)$).*)'
  ]
};
