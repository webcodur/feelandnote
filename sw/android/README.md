# Feel&Note 안드로이드 앱 (TWA 셸)

`feelandnote.com`을 안드로이드 앱으로 감싸는 껍데기다. 화면은 사용자의 브라우저가 그린다. 웹을 배포하면 앱 내용도 함께 갱신되므로 앱을 다시 낼 필요가 없다.

방식 선정 근거와 출시 조건은 `docs/project/apps/android-app-feasibility-review-2026-07-29.md`가 쥔다.

> **최종 실측 체크: 26.07.30** — 파일 구성은 실측이다. **빌드는 돌리지 않았다**(Android SDK·Gradle 미설치).

## 지금 상태

### 갖춘 것

| 항목 | 위치 |
|------|------|
| Gradle 설정 | `settings.gradle.kts` · `build.gradle.kts` · `app/build.gradle.kts` · `gradle.properties` |
| 버전 카탈로그 | `gradle/libs.versions.toml` |
| 앱 구성 | `app/src/main/AndroidManifest.xml` |
| 문자열·색·테마 | `app/src/main/res/values/` |
| 런처 아이콘 (밀도 5종 + adaptive) | `app/src/main/res/mipmap-*/` |
| 스플래시 | `app/src/main/res/drawable/splash.xml` |
| 런처 바로가기 3종 | `app/src/main/res/xml/shortcuts.xml` |
| bubblewrap 설정 | `twa-manifest.json` |
| 서명 견본 | `keystore.properties.example` |

자체 자바·코틴 코드는 없다. `androidbrowserhelper`의 `LauncherActivity`를 매니페스트에서 지목하고 시작 주소·색·스플래시만 넘긴다.

### 없는 것 — 이게 있어야 빌드된다

| 없는 것 | 얻는 법 |
|---------|---------|
| `gradle/wrapper/gradle-wrapper.jar` | 바이너리라 손으로 만들 수 없다. Android Studio가 프로젝트를 열 때 생성을 제안한다. 또는 Gradle이 설치된 환경에서 `gradle wrapper --gradle-version 8.11.1` |
| `gradlew` · `gradlew.bat` | 위 명령이 jar와 함께 만든다. 부정확한 손글씨 스크립트를 두는 것보다 정식 생성이 안전하다 |
| Android SDK | Android Studio 설치 시 함께 받는다. `local.properties`에 `sdk.dir` 자동 기록 |
| 서명 키스토어 | 아래 「키 만들기」 |
| 실제 서명 지문 | 키스토어를 만든 뒤 얻는다 |

## Android Studio로 열기

1. Android Studio에서 `Open` → `sw/android` 폴더 선택
2. Gradle 동기화가 뜨면 승인. Wrapper 생성을 제안하면 받는다
3. 동기화가 `compileSdk 36`을 문제 삼으면 `gradle/libs.versions.toml`의 `androidGradlePlugin`을 올린다. AGP를 올리면 `gradle/wrapper/gradle-wrapper.properties`의 Gradle 버전도 함께 맞춰야 한다
4. 실행: `Build` → `Generate Signed App Bundle`

## 키 만들기와 도메인 연결

앱과 웹이 같은 소유자임을 증명해야 TWA가 전체 화면으로 뜬다. 증명에 실패하면 주소창이 있는 일반 브라우저 창으로 물러난다(그렇게 물러나도록 설정해 뒀다).

### 1. 키스토어 생성

```bash
keytool -genkeypair -v -keystore feelandnote-release.jks \
  -alias feelandnote -keyalg RSA -keysize 2048 -validity 10000
```

`keystore.properties.example`을 `keystore.properties`로 복사해 값을 채운다.

🔴 키스토어와 비밀번호는 저장소에 올리지 않는다(`.gitignore`에 걸려 있다). 잃어버리면 같은 앱으로 갱신할 수 없으니 따로 보관한다.

### 2. 지문 얻기

```bash
keytool -list -v -keystore feelandnote-release.jks -alias feelandnote
```

출력의 `SHA256:` 값을 쓴다.

**Play App Signing을 쓰면 지문이 두 개다.** 위에서 만든 것은 업로드 키이고, 사용자 기기에 실제로 적용되는 지문은 Play Console → `설정` → `앱 완전성`에서 확인한다. **둘 다 넣어야 한다.**

### 3. 웹에 지문 심기

웹이 `/.well-known/assetlinks.json`을 환경변수로 만들어 응답한다(`sw/web/src/app/.well-known/assetlinks.json/route.ts`).

```
ANDROID_APP_PACKAGE_NAME=com.feelandnote.app
ANDROID_APP_CERT_FINGERPRINTS=AA:BB:...,CC:DD:...
```

지문을 넣지 않으면 빈 목록으로 응답하고 서버 로그에 경고를 남긴다. 그 상태로는 도메인 검증이 실패한다.

### 4. 검증 확인

```bash
curl https://feelandnote.com/.well-known/assetlinks.json
adb shell pm get-app-links com.feelandnote.app
```

## 확정해야 할 것

| 항목 | 현재 값 | 왜 확정이 필요한가 |
|------|---------|--------------------|
| 앱 식별자 | `com.feelandnote.app` | **배포 후 바꿀 수 없다.** 상표·조직 소유와 기존 사용 여부를 확인한 뒤 확정한다. 웹 라우트의 기본값과 반드시 같아야 한다 |
| `androidGradlePlugin` 8.9.1 | 미검증 | 내려받아 확인하지 못했다. compileSdk 36을 다루지 못하면 올린다 |
| `androidbrowserhelper` 2.5.0 | 미검증 | 같은 이유. 동기화 후 최신 안정판 확인 |
| Gradle 8.11.1 | 미검증 | AGP가 요구하는 최소 버전과 맞아야 한다 |
| `www` 하위 도메인 | 넣지 않음 | 쓰고 있다면 매니페스트에 host를 추가하고 그 주소에도 `assetlinks.json`이 응답해야 한다 |

## 아이콘 다시 뽑기

원본은 `sw/web/public/icon.png`다.

```bash
cd sw/web && node scripts/generate-android-launcher-icons.mjs
```

⚠️ **원본이 192px뿐이다.** 512 산출물은 확대본이라 Play Store 등록 이미지로는 아쉽다. 벡터나 1024px 원본을 확보하면 다시 뽑는 편이 좋다.

## Play 제출 전 남은 일

계획서 §5·§11이 조건을 쥔다. 이 앱 프로젝트 밖의 일이 대부분이다.

- [ ] 사용자 신고·차단 기능 (계획서 §5.1 — 웹 쪽 작업)
- [ ] 공개 계정 삭제 요청 주소 (계획서 §5.2 — `/account-deletion` 완료)
- [ ] Data Safety 응답을 실제 수집 항목과 맞추기 (§5.3)
- [ ] `광고 포함` 신고 (§5.4 — 웹이 AdSense를 싣는다)
- [ ] 심사용 이메일·비밀번호 계정 준비 (§5.5). OAuth만 제공하면 안 된다
- [ ] 개인 개발자 계정이면 비공개 테스트 12명·14일 (§5.6)
- [ ] 실기기에서 로그인·뒤로가기·외부 링크·광고·오프라인 확인 (§11)
