# 안드로이드 앱 (TWA 셸)

Feel&Note 안드로이드 앱은 네이티브 재개발이 아니라 **PWA를 보강한 사용자 웹(`sw/web`)을 TWA(Trusted Web Activity)로 감싼 셸**이다. 사용자 기기의 브라우저가 본서비스를 전체 화면으로 렌더링하므로 웹 배포가 곧 앱 콘텐츠 업데이트다. WebView 앱은 OAuth 내장 브라우저 정책과 웹 자산 이중 관리 때문에 쓰지 않는다.

셸 빌드·서명 키·도메인 연결 절차는 [`sw/android/README.md`](../../../sw/android/README.md)가 쥔다. 출시 전 남은 일은 [`docs/todo/android-release.md`](../../todo/android-release.md)가 쥔다.

## 1. 구성

| 층 | 위치 | 역할 |
|---|---|---|
| 앱 셸 | `sw/android/` | Gradle 프로젝트(`compileSdk`·`targetSdk` 36, `minSdk` 23). `androidbrowserhelper`의 LauncherActivity·DelegationService·FileProvider, App Links는 `feelandnote.com` 전체. 서명은 추적 밖 `keystore.properties`에서만 읽는다 |
| 도메인 검증 | `/.well-known/assetlinks.json` 라우트 | 패키지명·SHA-256 지문을 환경변수 `ANDROID_APP_PACKAGE_NAME`·`ANDROID_APP_CERT_FINGERPRINTS`로 읽는다([환경변수](../platform/platform-04-env-vars.md)). 지문이 없으면 빈 값으로 응답해 앱 도메인 검증이 실패한다 |
| PWA | `sw/web/src/app/manifest.ts`, `public/sw.js`, `public/offline.html`, `public/icons/` | 아이콘 192·512·maskable 512·Play 512, 런처 바로가기 3종, `start_url`에 TWA 계측 표시. 서비스 워커는 인증·API·Server Action·비GET·Range를 전부 우회하고, 개발 환경에서는 등록하지 않는다 |
| 정책 창구 | `/account-deletion`(ko·en, 비로그인 접근, 사이트맵 등재), 이용약관 제7조·제8조 | 앱 밖 계정 삭제 요청 경로, 금지 콘텐츠·신고·차단 조항 |
| 신고·차단 | 웹 `src/actions/moderation/`·`src/components/features/moderation/`, 테이블 `reports`·`blocks` | 자유게시판 글·댓글, 방명록, 프로필에서 신고·차단. 차단 필터는 조회 지점에서, `unstable_cache`를 쓰는 방명록은 캐시 밖 래퍼에서 적용한다 |
| 신고 운영 | web-bo `/reports` | 신고 큐, 대상 원문 스냅샷, 처리·반려·되돌리기, 대상 숨김·삭제, 계정 정지·해제 |

미들웨어는 `/sw.js`·`/offline.html`을 로케일 접두어 없이 통과시킨다. 이것이 빠지면 둘 다 404다.

## 2. Google Play 요건

- **UGC** — 공개 게시판·방명록이 있으므로 게시 전 약관 동의, 금지 콘텐츠 명시, 콘텐츠·사용자 신고, 사용자 차단, 신고에 대한 실제 검토·조치가 필요하다. 이 체계 없이 공개 제출하지 않는다.
- **계정 삭제** — 앱 안에서 탈퇴를 시작하는 경로와 앱을 설치하지 않은 사람도 여는 공개 웹 삭제 요청 경로가 모두 필요하다.
- **Data Safety** — 앱이 띄우는 웹 콘텐츠의 수집까지 포함한다. 계정 정보, 감상 기록·게시물, 접속 로그·기기 정보, Google Analytics, AdSense 광고 쿠키, 신고 데이터를 개인정보처리방침·실제 동작과 일치시킨다.
- **광고** — 루트 레이아웃이 AdSense를 불러오므로 `광고 포함`으로 선언한다. 첫 버전에 AdMob을 겹치지 않는다.
- **심사 계정** — 2단계 인증 없는 이메일·비밀번호 전용 계정을 준다. OAuth만 심사 수단으로 주지 않는다.
- **대상 API** — 2026-08-31부터 신규 앱·업데이트는 API 36 이상이다. 2023-11-13 이후 만든 개인 개발자 계정은 12명·14일 연속 비공개 테스트를 거쳐야 프로덕션을 신청할 수 있다. 조직 계정은 D-U-N-S와 조직 검증이 필요하다.
- **패키지명·서명** — 배포 뒤 바꿀 수 없다. Play App Signing을 쓰고 `assetlinks.json`에 개발·업로드·앱 서명 지문을 용도별로 둔다. 키스토어와 비밀번호는 저장소에 넣지 않는다.

## 3. 출시 범위

1차에 넣는 것: TWA 전체 화면, 도메인 검증·App Links, maskable 아이콘·스플래시, 오프라인 화면과 재시도, 시스템 뒤로가기, 외부 링크의 Custom Tab 전환, Google·Kakao·이메일 로그인과 세션 유지, 앱 내 탈퇴, 공개 삭제 요청 페이지, UGC 신고·차단, 앱 전용 GA 계측, 한국어·영어 진입.

2차로 미루는 것: 네이티브 푸시, 위젯, 카메라·바코드, Share Target, 생체 인증, 오프라인 기록 동기화, AdMob, 네이티브 화면.

## 4. 알려진 제약

- **차단은 단방향이다.** 내가 차단한 사람은 숨기지만 나를 차단한 사람은 숨기지 못한다. `blocks` RLS가 blocker 본인 행만 select를 허용하기 때문이다. 양방향이 필요하면 `SECURITY DEFINER` RPC나 RLS 정책 추가가 먼저다.
- **목록 전체 건수는 차단 필터 후 근사값이다.** 걸러낸 만큼만 빼므로 뒷 페이지의 차단 글은 반영되지 않는다.
- **게시 전 약관 동의는 안내 표시 방식이다.** 제출을 막는 확인 절차 없이 약관 제7조의 「게시 시 동의로 본다」로 받친다. 심사가 명시적 동의를 요구하면 확인 절차로 바꾼다.
- **런처 바로가기 「빠른 기록」은 없다.** 홈 안의 탭으로만 열려 바로 들어갈 주소가 없다. 「내 기록관」은 고정 주소가 없어 로그인 화면의 자동 이동에 기댄다.
