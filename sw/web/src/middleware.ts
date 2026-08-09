import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import {
  canUseMaintenancePreview,
  MAINTENANCE_PREVIEW_COOKIE,
  MAINTENANCE_PREVIEW_PARAM,
} from '@/lib/maintenance';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

// 인증이 필요한 경로
const protectedPaths: string[] = [];

// 인증된 사용자가 접근하면 안 되는 경로
const authPaths = ['/login', '/signup'];

// 미들웨어를 건너뛸 SEO/메타데이터 경로
const SEO_PATHS = ['/sitemap.xml', '/robots.txt', '/feed.xml', '/opengraph-image']
const SEO_PATH_PREFIXES = ['/seo-image/', '/sitemaps/']

// 미들웨어를 건너뛸 PWA 정적 파일
// 아래 matcher는 .png·.webmanifest 등 확장자만 제외하고 .js·.html은 제외하지 않는다.
// 그대로 두면 next-intl이 /ko/sw.js 로 재작성해 404가 되고 서비스 워커 등록이 실패한다.
const PWA_PATHS = ['/sw.js', '/offline.html']
const MAINTENANCE_PATH_PREFIX = '/maintenance/'

export async function middleware(request: NextRequest) {
  const { pathname: rawPathname } = request.nextUrl

  // 0) 로컬 개발 환경에서만 점검 화면의 진입·종료를 시험한다.
  if (canUseMaintenancePreview()) {
    const previewControl = request.nextUrl.searchParams.get(MAINTENANCE_PREVIEW_PARAM)

    if (previewControl === '0') {
      const url = request.nextUrl.clone()
      url.searchParams.delete(MAINTENANCE_PREVIEW_PARAM)
      const response = NextResponse.redirect(url, 307)
      response.cookies.delete(MAINTENANCE_PREVIEW_COOKIE)
      return response
    }

    const previewActive = previewControl === '1'
      || request.cookies.get(MAINTENANCE_PREVIEW_COOKIE)?.value === '1'

    if (previewActive && !rawPathname.startsWith(MAINTENANCE_PATH_PREFIX)) {
      const locale = rawPathname === '/en' || rawPathname.startsWith('/en/') ? 'en' : 'ko'
      const previewEndsAt = request.nextUrl.searchParams.get('endsAt')
      const url = request.nextUrl.clone()
      url.pathname = `${MAINTENANCE_PATH_PREFIX}${locale}`
      url.search = ''
      url.searchParams.set('preview', '1')
      if (previewEndsAt) url.searchParams.set('endsAt', previewEndsAt)

      const response = NextResponse.redirect(url, 307)
      response.cookies.set(MAINTENANCE_PREVIEW_COOKIE, '1', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
      response.headers.set('Cache-Control', 'no-store, max-age=0')
      return response
    }
  }

  // 1) 점검 안내 화면은 다시 리다이렉트하지 않는다.
  if (rawPathname.startsWith(MAINTENANCE_PATH_PREFIX)) {
    return NextResponse.next()
  }

  // 2) SEO·PWA 정적 경로는 미들웨어 스킵 (next-intl이 가로채지 않도록)
  if (
    SEO_PATHS.includes(rawPathname)
    || SEO_PATH_PREFIXES.some((prefix) => rawPathname.startsWith(prefix))
    || PWA_PATHS.includes(rawPathname)
  ) {
    return NextResponse.next()
  }

  // 3) next-intl locale 처리
  const intlResponse = intlMiddleware(request);

  // 4) Supabase 세션 갱신. 익명 크롤러/방문자는 인증 쿠키가 없으므로
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

  // 5) Auth redirect — locale prefix 제거 후 경로 비교
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
