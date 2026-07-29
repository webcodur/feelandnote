# Feel&Note 안드로이드 앱 타당성 검토

> 조사일: 2026-07-29  
> 대상: 사용자 본서비스 `sw/web`  
> 목적: `feelandnote.com` 본서비스를 안드로이드 앱으로 제공할 때의 구현 방식, 정책 위험, 출시 범위를 결정한다.

## 1. 결론

Feel&Note 안드로이드 앱은 만들 수 있으며, 첫 버전은 **네이티브 재개발이 아니라 PWA 보강 후 TWA(Trusted Web Activity)로 배포하는 방식**이 가장 적합하다.

현재 웹은 모바일 내비게이션, 반응형 화면, 계정, 콘텐츠 탐색, 기록, 게임, 커뮤니티를 이미 갖추고 있다. 단순한 정적 웹페이지가 아니므로 웹 자산을 다시 구현할 이유가 없다. TWA를 쓰면 사용자의 안드로이드 브라우저가 본서비스를 전체 화면으로 렌더링하고, 웹 배포가 곧 앱 콘텐츠 업데이트가 된다.

다만 현재 상태로 Google Play에 바로 제출해서는 안 된다. 가장 큰 선결 과제는 앱 포장 기술이 아니라 **공개 게시판·방명록 등 사용자 생성 콘텐츠(UGC)의 신고·차단 체계**다. 저장소에는 운영용 `reports` 테이블이 있으나 사용자 대면 신고 기능과 사용자 차단 모델은 확인되지 않았다. Google Play는 공개 UGC를 제공하는 앱에 약관 동의, 콘텐츠·사용자 신고, 사용자 차단, 실제 운영 대응을 요구한다.

따라서 권장 순서는 다음과 같다.

1. UGC 신고·차단 및 약관 동의 보강
2. 공개 계정 삭제 요청 페이지 추가
3. PWA 설치·오프라인 요건 보강
4. TWA 안드로이드 프로젝트 생성
5. OAuth·광고·딥링크 실기기 검증
6. Play 비공개 테스트 및 출시

## 2. 조사 범위

### 코드 및 서비스

- `sw/web/src/app/manifest.ts`
- `sw/web/src/app/layout.tsx`
- `sw/web/src/app/[locale]/layout.tsx`
- `sw/web/src/components/layout/LayoutMain.tsx`
- `sw/web/src/components/layout/BottomNav.tsx`
- `sw/web/src/actions/auth/login.ts`
- `sw/web/src/actions/auth/deleteAccount.ts`
- `sw/web/src/app/auth/callback/route.ts`
- `sw/web/src/app/[locale]/(auth)/*`
- 공개 라이브 사이트와 `manifest.webmanifest`
- `/.well-known/assetlinks.json` 제공 여부
- 서비스 워커·오프라인·푸시·딥링크 관련 코드
- 사용자 신고·차단 관련 UI와 DB 모델

### 외부 기준

- Android Trusted Web Activity 공식 문서
- Google OAuth 내장 브라우저 정책
- Google Play 기능·콘텐츠·사용자 경험 정책
- Google Play UGC 정책
- 계정 삭제 및 Data Safety 요건
- 대상 API 수준과 개인 개발자 테스트 요건

## 3. 현재 준비 상태

### 3.1 이미 갖춘 것

#### 모바일 화면 구조

본서비스는 모바일 전용 하단 내비게이션을 갖고 있다.

- `BottomNav.tsx`는 모바일에서 화면 하단에 고정된다.
- `pb-safe`와 `safe-area-inset-bottom` 대응 코드가 있다.
- `LayoutMain.tsx`는 모바일과 데스크톱 구성을 구분한다.
- 헤더, 검색, 콘텐츠 카드와 주요 상세 화면이 반응형 클래스를 사용한다.

따라서 앱 셸을 만들기 위해 본서비스의 화면 전체를 다시 설계할 필요는 없다.

#### 웹 앱 manifest

`sw/web/src/app/manifest.ts`에 다음 항목이 이미 있다.

- `name`, `short_name`, `description`
- `start_url: '/'`
- `display: 'standalone'`
- 배경색과 테마색
- 192×192 PNG 아이콘
- 256×256 ICO 아이콘

라이브 `https://feelandnote.com/manifest.webmanifest`도 HTTP 200과 `application/manifest+json`으로 정상 제공된다.

#### 충분한 앱 기능과 콘텐츠

본서비스에는 다음과 같은 실제 기능이 있다.

- 인물·콘텐츠 탐색
- 인물 관계망·연표·영향력·페르소나
- 책·영상·게임·음악 감상 기록
- 사용자 기록관과 프로필
- 검색과 추천
- 게임
- 게시판·방명록·소셜 기능
- Google·Kakao·이메일 로그인

Google Play는 기능이 거의 없거나 정적 텍스트만 제공하는 앱을 허용하지 않는다. Feel&Note는 콘텐츠 양과 상호작용 측면에서 그 유형에 해당하지 않는다. 다만 앱 심사는 전체적인 안정성과 실제 모바일 사용성을 함께 판단하므로 자동 승인된다는 뜻은 아니다.

#### 계정 삭제

`sw/web/src/actions/auth/deleteAccount.ts`에 다음 삭제 절차가 구현돼 있다.

1. 현재 사용자 확인
2. `profiles` 삭제 및 연결 데이터 CASCADE 삭제
3. Supabase `auth.users` 삭제
4. 세션 로그아웃

프로필 설정 화면에서도 회원탈퇴 UI를 제공한다. 앱 내부 삭제 경로는 이미 확보돼 있다.

### 3.2 부족한 것

#### 서비스 워커와 오프라인 화면

저장소에서 다음 항목은 확인되지 않았다.

- 서비스 워커 등록
- Workbox 또는 동등한 캐시 계층
- 오프라인 대체 화면
- 네트워크 복구 UI
- Web Push 등록

TWA는 웹을 브라우저로 렌더링하므로 네트워크가 끊겼을 때 웹 자체가 대응하지 않으면 브라우저 오류 화면이 그대로 나타난다. 첫 버전에서 모든 데이터를 오프라인 저장할 필요는 없지만, 최소한 브랜드 오프라인 화면과 재시도 버튼은 필요하다.

인증 화면과 동적 사용자 데이터는 캐시하지 않는다. 권장 캐시 정책은 다음과 같다.

| 대상 | 정책 |
|------|------|
| 페이지 이동 | network-first, 실패 시 오프라인 화면 |
| `/_next/static/*` | immutable/cache-first |
| 로고·앱 셸 아이콘 | cache-first |
| 인물·책 이미지 | 용량 상한을 둔 제한적 캐시 |
| 인증 응답·사용자 기록 | 캐시 금지 |
| Server Action·API 응답 | 기본적으로 캐시 금지 |

#### 앱 아이콘 규격

현재 manifest에는 192×192 PNG와 256×256 ICO만 있다. 다음 자산이 추가로 필요하다.

- 512×512 일반 PNG
- 512×512 maskable PNG
- Android adaptive icon의 foreground/background
- Play Store 512×512 아이콘
- 앱 스플래시에서 안전하게 잘리지 않는 로고 여백

#### Digital Asset Links

라이브 `https://feelandnote.com/.well-known/assetlinks.json`은 조사 시점에 404였다.

TWA와 Android App Links는 앱 패키지명, 앱 서명 인증서 SHA-256 지문, 도메인을 `assetlinks.json`으로 연결해야 한다. Play App Signing을 사용하면 로컬 업로드 키가 아니라 Play가 실제 사용자 앱에 적용하는 앱 서명 인증서 지문도 반영해야 한다.

#### 앱 전용 계측

현재 GA4는 웹 방문을 계측하지만 TWA 앱 실행을 별도로 구별하는 장치가 없다.

권장 방식:

- TWA 시작 URL에 `utm_source=android_app&utm_medium=twa` 부여
- 앱 셸 최초 실행 이벤트
- App Link 진입과 런처 진입 구분
- 빠른 기록 시작·완료 이벤트
- OAuth 성공·실패 이벤트
- 오프라인 화면 노출과 복구 성공 이벤트

앱 성과는 설치 수보다 다음 지표로 판단한다.

- 설치 사용자당 기록 생성 수
- D7·D30 재실행률
- 앱 진입 후 기록 완료율
- OAuth 성공률
- 오류 없는 세션 비율

#### 비로그인 계정 삭제 요청 URL

앱 내부 회원탈퇴는 구현돼 있지만, Play Console에 제출할 공개 계정 삭제 URL은 별도로 마련하는 편이 안전하다.

권장 경로:

```text
/account-deletion
/en/account-deletion
```

이 페이지는 로그인을 강제하지 않고 다음을 제공해야 한다.

- Feel&Note 계정 삭제 안내
- 로그인 후 직접 삭제하는 경로
- 로그인할 수 없는 사용자의 삭제 요청 수단
- 삭제되는 데이터와 법적 보존 대상
- 처리 예상 기간
- 운영자 연락처

개인정보처리방침에서 탈퇴 시 삭제를 언급하는 것만으로는 Play가 요구하는 전용 삭제 요청 경로로 인정되지 않을 가능성이 있다.

## 4. 구현 방식 비교

| 방식 | 장점 | 단점·위험 | 판정 |
|------|------|-----------|------|
| 단순 Android WebView | 제작이 가장 빠름 | Google OAuth 내장 user-agent 제한, 광고 WebView 연동, 쿠키·파일·뒤로가기·외부 링크·보안 직접 처리 | 제외 |
| **PWA + TWA** | 현재 웹 재사용, 브라우저 보안·쿠키 활용, 작은 앱 크기, 웹 배포 즉시 반영, App Links 지원 | 서비스 워커·DAL·아이콘 보강 필요, 네이티브 API 직접 접근 제한 | **1차 권장** |
| Capacitor | 푸시·공유·카메라·파일 등 네이티브 확장 용이 | WebView 기반 OAuth·광고·플러그인 유지보수, 앱과 웹의 경계 복잡 | 2차 후보 |
| Kotlin/Compose | 완전한 네이티브 UX와 기능 | 웹 기능 이중 구현, 개발·QA·다국어·접근성 비용 급증 | 현 단계 과투자 |
| React Native | 웹과 언어 일부 공유 | UI와 데이터 접근은 다시 구현, Next.js Server Action을 그대로 재사용하기 어려움 | 현 단계 과투자 |

### 4.1 TWA를 권장하는 이유

TWA는 사용자의 지원 브라우저가 웹 콘텐츠를 전체 화면으로 렌더링한다. 앱과 웹이 같은 소유자임을 Digital Asset Links로 검증하며, 검증에 실패하면 일반 Custom Tab으로 폴백한다.

Feel&Note에 유리한 점:

- 이미 모바일 UI가 존재한다.
- 웹과 앱의 콘텐츠를 한 원천에서 관리할 수 있다.
- 인물·콘텐츠 데이터가 자주 갱신돼도 앱 업데이트가 필요 없다.
- 브라우저의 쿠키와 저장소를 이용하므로 현재 Supabase SSR 인증 구조를 유지하기 쉽다.
- `feelandnote.com/celeb/*` 같은 기존 검색·SNS 링크를 앱 딥링크로 재사용할 수 있다.
- Android 앱이 웹 인증 세션에 직접 접근할 필요가 없다.

제약:

- 네이티브 앱 셸이 웹의 쿠키나 `localStorage`를 직접 읽을 수 없다.
- 화면 하나는 웹 또는 네이티브 중 하나로 구성해야 한다.
- 고급 네이티브 기능이 필요해지면 별도의 Android Activity 또는 Capacitor 전환을 검토해야 한다.

### 4.2 WebView를 제외하는 이유

Google OAuth는 개발자가 통제하는 내장 user-agent로 인증 요청을 보내는 것을 금지한다. 일반 WebView에서 Google 로그인을 그대로 띄우면 차단되거나 심사·보안 문제가 발생할 수 있다. 시스템 브라우저 또는 Custom Tab으로 OAuth를 분리하고 앱 딥링크로 복귀시키는 별도 작업이 필요하다.

광고도 그대로 둘 수 없다. WebView에서 AdSense 태그를 제공한다면 Google Mobile Ads SDK의 WebView API for Ads 등록과 동의 처리를 검토해야 한다. 반면 TWA는 일반 WebView가 아니라 사용자의 브라우저가 렌더링하는 구조다. 기존 웹 광고가 동일하게 동작할 가능성은 높지만, 출시 전 실제 광고 노출·동의·Play의 `광고 포함` 표시를 함께 검증해야 한다.

## 5. Google Play 정책 선결 과제

### 5.1 UGC 신고·차단

본서비스는 공개 게시판, 피드, 방명록 등 사용자 생성 콘텐츠를 제공한다. Google Play 정책은 앱이 UGC를 일부만 제공하더라도 다음을 요구한다.

- 사용자가 게시 전에 이용약관 또는 사용자 정책에 동의
- 금지 콘텐츠와 행위를 약관에 명시
- 콘텐츠 신고
- 사용자 신고
- 사용자 차단
- 신고에 대한 실제 검토와 적절한 조치

조사 결과:

- `reports` 테이블 타입은 존재한다.
- 사용자 대면 신고 액션·컴포넌트는 검색되지 않았다.
- `blocked_users`, `user_blocks` 등 사용자 차단 모델은 검색되지 않았다.
- 피드백 게시판의 `CONTENT_REPORT`는 서비스 콘텐츠 제보 범주이며 UGC 신고·즉시 차단 기능을 대신하지 못한다.

권장 최소 구현:

```text
user_blocks
  blocker_id
  blocked_id
  created_at
  unique(blocker_id, blocked_id)

reports
  reporter_id
  target_type
  target_id
  target_user_id
  reason
  detail
  status
  resolved_by
  resolved_at
  created_at
```

사용자 화면:

- 게시물 메뉴: `게시물 신고`, `작성자 신고`, `사용자 차단`
- 방명록 메뉴: `방명록 신고`, `작성자 차단`
- 프로필 메뉴: `사용자 신고`, `사용자 차단`
- 차단 사용자 관리 화면
- 차단 즉시 해당 사용자의 공개 콘텐츠를 현재 사용자 화면에서 숨김

운영 화면:

- 신고 큐
- 신고 대상 원문 스냅샷
- 처리 상태와 처리자
- 콘텐츠 숨김·삭제
- 사용자 제한·정지
- 반복 신고와 악용 탐지

UGC 정책 보강 전에는 공개 Play 제출을 진행하지 않는다.

### 5.2 계정 삭제

앱에서 계정을 만들 수 있으면 다음 두 경로가 모두 필요하다.

1. 앱 내부에서 계정 삭제를 시작하는 경로
2. 앱을 설치하지 않은 사용자도 접근할 수 있는 공개 웹 삭제 요청 경로

현재 1번은 충족하지만 2번은 전용 페이지가 없다.

### 5.3 Data Safety

Play Data Safety에는 앱이 제어하는 웹 콘텐츠에서 수집되는 데이터도 포함해야 한다. 다음 사용을 전수 대조한다.

- Supabase Auth 이메일·닉네임·프로필 이미지
- 사용자의 감상 기록과 게시물
- 접속 로그와 기기 정보
- Google Analytics
- Google AdSense 및 광고 쿠키
- 운영 로그와 신고 데이터

개인정보처리방침, 앱 실제 동작, Play Data Safety 응답이 서로 달라서는 안 된다.

### 5.4 광고

본서비스 루트 레이아웃은 AdSense 스크립트를 불러온다. Play Console에서 앱을 `광고 포함`으로 선언해야 한다. 광고와 광고가 연결하는 콘텐츠도 앱 콘텐츠 등급과 Play 정책의 적용 대상이다.

첫 버전에서 별도 AdMob 광고를 추가하지 않는다. 기존 웹 광고와 네이티브 광고를 동시에 넣으면 동의·Data Safety·레이아웃·중복 광고 문제가 늘어난다.

### 5.5 로그인 심사 계정

앱의 일부 기능이 로그인 뒤에 있으면 Play 심사팀이 항상 사용할 수 있는 재사용 가능한 계정을 제공해야 한다.

권장:

- 이메일·비밀번호 방식의 전용 심사 계정
- 2단계 인증과 일회용 코드를 사용하지 않음
- 한국어·영어 기능을 모두 확인할 수 있음
- 기록 생성·삭제·프로필·UGC 신고 기능을 확인할 수 있음
- 심사 기간 중 비밀번호를 바꾸거나 계정을 삭제하지 않음

Google·Kakao OAuth만 심사 수단으로 제공하지 않는다.

### 5.6 대상 API와 개발자 계정

2026년 8월 31일부터 신규 앱과 업데이트는 Android 16, API 36 이상을 대상으로 해야 한다. 조사일이 마감 직전이므로 처음부터 `targetSdk 36`으로 만든다.

2023년 11월 13일 이후 생성된 개인 Play 개발자 계정이면 다음 조건을 충족해야 한다.

- 비공개 테스트
- 최소 12명
- 최소 14일 연속 참여
- 조건 충족 후 프로덕션 접근 신청

조직 계정이면 D-U-N-S 번호와 조직 검증 준비가 필요하다. 2026년 9월 30일부터 Play 패키지명 등록과 개발자 검증 요건도 적용되므로 패키지명과 서명키를 임시로 정하지 않는다.

## 6. 권장 앱 구조

```text
sw/
  web/
    public/
      .well-known/
        assetlinks.json
      icons/
        android-192.png
        android-512.png
        android-maskable-512.png
      offline.html
      sw.js
    src/
      app/
        manifest.ts
        [locale]/
          (policy)/
            account-deletion/
      components/
        pwa/
          ServiceWorkerRegistrar.tsx

  android/
    app/
    gradle/
    build.gradle.kts
    settings.gradle.kts
    gradle.properties
    twa-manifest.json
```

원칙:

- Android 프로젝트는 `sw/android`에 둔다.
- 생성된 Gradle Wrapper는 저장소에 포함한다.
- 키스토어와 비밀번호는 저장소에 넣지 않는다.
- Play App Signing을 사용한다.
- `assetlinks.json`에는 개발·업로드·Play 앱 서명 지문을 용도에 맞게 관리한다.
- 앱 패키지명은 Play Console 등록 전에 확정한다.

패키지명 후보:

```text
com.feelandnote.app
```

패키지명은 배포 후 사실상 바꿀 수 없으므로 기존 사용 여부와 상표·조직 소유를 확인한 뒤 확정한다.

## 7. 1차 출시 범위

### 반드시 포함

- TWA 전체 화면 실행
- 앱 소유 도메인 검증
- Android App Links
- 512px 및 maskable 아이콘
- 브랜드 스플래시
- 오프라인 화면과 재시도
- 시스템 뒤로가기
- 외부 링크의 Custom Tab 또는 외부 앱 전환
- Google·Kakao·이메일 로그인
- 로그아웃과 세션 유지
- 앱 내부 회원탈퇴
- 공개 계정 삭제 요청 페이지
- UGC 콘텐츠·사용자 신고
- 사용자 차단
- 앱 전용 GA 계측
- 한국어·영어 진입
- Play 심사 계정

### 2차로 미룸

- 네이티브 푸시 알림
- 홈 화면 위젯
- 카메라·바코드 스캔
- 공유받기용 Android Share Target
- 생체 인증
- 오프라인 기록 작성·동기화
- 네이티브 AdMob
- 완전한 네이티브 화면

## 8. 앱의 제품 정의

앱을 단순히 “Feel&Note 웹사이트”로 설명하지 않는다. 권장 제품 문장은 다음과 같다.

> 인물의 책장과 감상 경로를 탐색하고, 나의 문화 기록을 빠르게 남기는 앱

Play Store 핵심 가치:

1. 인물이 실제로 읽고 보고 들은 콘텐츠 탐색
2. 작품이 인물의 삶과 업적에 미친 맥락 확인
3. 나만의 책·영상·게임·음악 기록
4. 인물 관계망·연표·세력도감 탐색

권장 런처 바로가기:

- 오늘의 인물
- 검색
- 빠른 기록
- 내 기록관

## 9. 사업적 타당성

`docs/project/traffic-audit-2026-07-25.md` 기준:

- 하루 평균 사용자 약 26명
- 모바일 71%
- 재방문 5.3%
- 90일 로그인 화면 도달 7명

모바일 사용 비중이 높기 때문에 앱 화면 적합성은 있다. 그러나 현재 절대 방문자와 로그인 전환이 작으므로 앱 출시 자체를 신규 유입 전략으로 보아서는 안 된다.

앱의 현실적인 가치는 다음과 같다.

- Play Store의 공식 브랜드 거점
- 반복 사용자의 접근성 향상
- App Links로 검색·SNS 링크를 앱에 연결
- 빠른 기록과 향후 푸시를 통한 재방문 기반 마련

앱 출시만으로 검색 유입, 색인, AdSense 승인 또는 대규모 신규 가입이 개선되지는 않는다. 유입 전략과 앱 전략을 섞지 않는다.

## 10. 예상 일정

| 단계 | 예상 작업 |
|------|-----------|
| 정책 보강 | UGC 신고·차단, 약관 동의, 공개 계정 삭제 페이지 |
| PWA 보강 | 서비스 워커, 오프라인 화면, 아이콘, manifest |
| Android 셸 | Bubblewrap/TWA 프로젝트, API 36, 앱 링크, 서명 |
| 실기기 QA | OAuth, 세션, 뒤로가기, 외부 링크, 광고, 오프라인 |
| Play 자료 | 아이콘, 스크린샷, 설명, Data Safety, 콘텐츠 등급, 심사 계정 |
| 비공개 테스트 | 신규 개인 계정이면 12명·14일 |
| 프로덕션 심사 | 테스트 결과 반영 후 제출 |

TWA 셸 자체는 작지만 정책 보강과 실기기 QA가 실제 작업의 대부분이다. UGC 보강을 제외하고 포장만 빨리 끝내는 일정은 출시 가능 일정으로 계산하지 않는다.

## 11. 출시 판정 기준

다음 조건을 모두 충족하면 Play 제출 가능으로 판정한다.

- [ ] `manifest.webmanifest`에 192px·512px·maskable 아이콘이 있다.
- [ ] 오프라인 상태에서 브라우저 오류 대신 브랜드 화면이 나온다.
- [ ] `assetlinks.json` 검증이 통과한다.
- [ ] 모든 `feelandnote.com` 주요 URL이 앱으로 정상 연결된다.
- [ ] Google·Kakao·이메일 로그인이 실기기에서 성공한다.
- [ ] 로그인 세션이 앱 재실행 후 유지된다.
- [ ] 사용자와 UGC 콘텐츠를 각각 신고할 수 있다.
- [ ] 사용자를 차단하면 해당 사용자의 콘텐츠가 즉시 숨겨진다.
- [ ] 운영자가 신고를 확인하고 처리할 수 있다.
- [ ] 계정 삭제가 앱 내부와 공개 웹 양쪽에서 가능하다.
- [ ] 개인정보처리방침과 Data Safety 응답이 실제 수집 항목과 일치한다.
- [ ] 광고 포함 여부와 콘텐츠 등급을 정확히 신고했다.
- [ ] Play 심사 계정이 상시 작동한다.
- [ ] API 36을 대상으로 AAB가 빌드된다.
- [ ] 뒤로가기·외부 링크·파일 다운로드·음성 재생을 실기기에서 확인했다.
- [ ] 앱 진입과 기록 완료를 웹 방문과 구분해 계측할 수 있다.

## 12. 최종 판정

### 진행

다음 목적이라면 TWA 앱을 진행할 가치가 있다.

- 공식 Android 배포 거점 확보
- 반복 사용자의 접근성 개선
- 딥링크와 향후 푸시 기반 마련
- 웹과 앱의 이중 개발 방지

### 보류

다음 기대만으로는 우선순위가 낮다.

- 앱 출시만으로 신규 유입 증가
- 앱 출시만으로 낮은 재방문율 해결
- 앱 출시만으로 AdSense 승인 또는 SEO 개선

### 최종 권고

**UGC 정책을 먼저 보강한다는 조건으로 PWA + TWA 1차 앱을 진행한다.**  
단순 WebView와 완전 네이티브 재개발은 채택하지 않는다.

## 13. 공식 참고자료

- Android Developers, Trusted Web Activities  
  https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities
- Chrome for Developers, TWA Quick Start와 Bubblewrap  
  https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
- Android Developers, Digital Asset Links  
  https://developer.android.com/training/app-links/configure-assetlinks
- Google OAuth 2.0 정책, 내장 user-agent 금지  
  https://developers.google.com/identity/protocols/oauth2/policies
- Google Play, 기능·콘텐츠·사용자 경험  
  https://support.google.com/googleplay/android-developer/answer/9898783
- Google Play, 사용자 생성 콘텐츠 정책  
  https://support.google.com/googleplay/android-developer/answer/9876937
- Google Play, UGC 조정·신고·차단 안내  
  https://support.google.com/googleplay/android-developer/answer/12923286
- Google Play, 계정 삭제 요건  
  https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play, Data Safety 작성  
  https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play, 대상 API 수준  
  https://support.google.com/googleplay/android-developer/answer/11926878
- Google Play, 신규 개인 개발자 테스트 요건  
  https://support.google.com/googleplay/android-developer/answer/14151465
- Google Play, 심사용 로그인 정보  
  https://support.google.com/googleplay/android-developer/answer/15748846
- Google Mobile Ads, WebView API for Ads  
  https://developers.google.com/admob/android/browser/webview/api-for-ads

