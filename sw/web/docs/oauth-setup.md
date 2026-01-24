# OAuth 인증 설정 가이드

Feelnnote 프로젝트의 OAuth 소셜 로그인 설정 문서.

## 아키텍처 개요

```
사용자 → 로그인 버튼 클릭
      → Supabase Auth (/authorize)
      → 소셜 프로바이더 (Google/Kakao)
      → Supabase Auth (/callback)
      → 우리 앱 (/auth/callback)
      → 로그인 완료
```

Supabase가 중간에서 OAuth flow를 처리하므로, 소셜 프로바이더의 Redirect URI는 **Supabase URL**로 설정해야 한다.

---

## 1. Supabase 설정

### 대시보드 위치
- URL: https://supabase.com/dashboard/project/wouqtpvfctednlffross
- 메뉴: Authentication → URL Configuration

### 현재 설정값

| 항목 | 값 |
|------|-----|
| Site URL | `https://feelnnote.com` |
| Redirect URLs | `https://feelnnote.com/auth/callback` |
| | `http://localhost:3000/**` |

### Providers 설정 (Authentication → Providers)

#### Google
| 항목 | 값 |
|------|-----|
| Client ID | Google Cloud Console에서 발급 |
| Client Secret | Google Cloud Console에서 발급 |

#### Kakao
| 항목 | 값 |
|------|-----|
| Client ID | `71f1e68e2d8d0c7f8218259357912e2c` (REST API 키) |
| Client Secret | `CG9wIsVORxCiKho5qwEWuQRGyW1Lwhxw` |

---

## 2. Google Cloud Console 설정

### 대시보드 위치
- URL: https://console.cloud.google.com/apis/credentials
- 프로젝트 선택 후 OAuth 2.0 클라이언트 ID 수정

### 현재 설정값

#### 승인된 JavaScript 원본
```
https://feelnnote.com
http://feelnnote.com
https://localhost:3000
http://localhost:3000
```

#### 승인된 리디렉션 URI
```
https://wouqtpvfctednlffross.supabase.co/auth/v1/callback
```

> Supabase를 거치므로 Supabase callback URL만 등록하면 된다.

---

## 3. Kakao Developers 설정

### 대시보드 위치
- URL: https://developers.kakao.com
- 내 애플리케이션 → 앱 선택 → 카카오 로그인

### 현재 설정값

| 항목 | 값 |
|------|-----|
| REST API 키 | `71f1e68e2d8d0c7f8218259357912e2c` |
| 클라이언트 시크릿 (카카오 로그인) | `CG9wIsVORxCiKho5qwEWuQRGyW1Lwhxw` |
| 클라이언트 시크릿 활성화 | ON |
| Redirect URI | `https://wouqtpvfctednlffross.supabase.co/auth/v1/callback` |

### 카카오 로그인 동의항목 (필요시 확인)
- 메뉴: 카카오 로그인 → 동의항목
- 필요 항목: `profile_nickname`, `profile_image`

---

## 4. 환경변수 설정

### 로컬 개발 (.env)
```env
NEXT_PUBLIC_SUPABASE_URL=https://wouqtpvfctednlffross.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 프로덕션 (Vercel 환경변수)
```env
NEXT_PUBLIC_SITE_URL=https://feelnnote.com
```

> `.env` 파일에 `NEXT_PUBLIC_SITE_URL`을 중복 정의하면 마지막 값이 적용되므로 주의.

---

## 5. 코드 위치

| 파일 | 역할 |
|------|------|
| `src/actions/auth/login.ts` | OAuth 로그인 함수 (loginWithGoogle, loginWithKakao) |
| `src/app/auth/callback/route.ts` | OAuth 콜백 처리 |
| `src/middleware.ts` | 세션 갱신 (auth/callback 경로 제외) |
| `src/lib/supabase/server.ts` | Supabase 서버 클라이언트 |
| `src/lib/supabase/middleware.ts` | 미들웨어용 Supabase 클라이언트 |

---

## 6. 트러블슈팅

### "code challenge does not match" 에러
- **원인**: PKCE flow에서 code_verifier 불일치
- **해결**: middleware.ts에서 `/auth/callback` 경로 제외
```typescript
// middleware.ts matcher
'/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
```

### 로컬에서 로그인 후 프로덕션으로 리다이렉트됨
- **원인**: `.env`에 `NEXT_PUBLIC_SITE_URL`이 프로덕션 URL로 설정됨
- **해결**: 로컬용 값(`http://localhost:3000`)만 남기고 프로덕션은 Vercel 환경변수로 관리

### 로컬 OAuth 테스트 시 필요한 설정
1. Supabase Redirect URLs에 `http://localhost:3000/**` 추가
2. `.env`에서 `NEXT_PUBLIC_SITE_URL=http://localhost:3000` 확인
3. 서버 재시작

---

## 7. 새 환경 추가 시 체크리스트

Preview/Staging 환경 추가 시:

- [ ] Supabase Redirect URLs에 새 URL 패턴 추가
- [ ] Google Cloud Console 승인된 JavaScript 원본에 새 도메인 추가
- [ ] (필요시) Kakao Redirect URI 추가 (보통 Supabase URL만 있으면 됨)
- [ ] Vercel 환경변수에 `NEXT_PUBLIC_SITE_URL` 설정
