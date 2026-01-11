# Vercel 모노레포 배포 설정

Feelnnote 모노레포에서 `sw/web`과 `sw/web-bo`를 각각 독립적으로 배포하는 방법.

## 개요

- 단일 Git repo에서 여러 Vercel 프로젝트 운영
- 각 앱 변경 시 해당 앱만 배포 (불필요한 재배포 방지)
- Vercel 무료 플랜(Hobby)에서 사용 가능

## 프로젝트 구조

```
feelnnote/
├── sw/
│   ├── web/          # 사용자 웹 (포트 3000)
│   └── web-bo/       # 관리자 백오피스 (포트 3001)
├── docs/
└── CLAUDE.md
```

## 설정 방법

### 1단계: Vercel 프로젝트 생성

#### web (사용자 웹)

1. [Vercel 대시보드](https://vercel.com/dashboard) > **Add New Project**
2. Git repo 선택: `feelnnote`
3. **Root Directory** 설정: `sw/web`
4. Framework Preset: Next.js (자동 감지)
5. **Deploy** 클릭

#### web-bo (관리자 백오피스)

1. 동일하게 **Add New Project**
2. 같은 Git repo 선택: `feelnnote`
3. **Root Directory** 설정: `sw/web-bo`
4. Framework Preset: Next.js
5. **Deploy** 클릭

### 2단계: Ignored Build Step 설정

각 프로젝트별로 설정하여 불필요한 빌드를 방지한다.

#### 설정 경로

```
Vercel 프로젝트 > Settings > Git > Ignored Build Step
```

#### 설정 값

**web 프로젝트:**
```bash
git diff --quiet HEAD^ HEAD -- ./
```

**web-bo 프로젝트:**
```bash
git diff --quiet HEAD^ HEAD -- ./
```

> Root Directory 기준으로 `./`를 사용하면 해당 폴더 내 변경사항만 감지한다.

### 3단계: 환경 변수 설정

각 프로젝트 > Settings > Environment Variables에서 설정:

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버사이드 전용 (선택) |

## 배포 동작

| 변경 위치 | web 배포 | web-bo 배포 |
|-----------|:--------:|:-----------:|
| `sw/web/` | ✅ | ❌ |
| `sw/web-bo/` | ❌ | ✅ |
| `docs/`, `CLAUDE.md` 등 | ❌ | ❌ |
| `sw/web/` + `sw/web-bo/` 동시 | ✅ | ✅ |

## 무료 플랜 제한사항

| 항목 | Hobby (무료) |
|------|-------------|
| 프로젝트 수 | 무제한 |
| 월간 빌드 시간 | 6,000분 |
| 동시 빌드 | 1개 |
| 대역폭 | 100GB/월 |

## 트러블슈팅

### 변경 없는데 빌드가 실행되는 경우

Ignored Build Step 명령어 확인:
- `git diff --quiet HEAD^ HEAD -- ./` 에서 `./` 경로가 올바른지 확인
- 첫 배포 시에는 항상 빌드 실행됨

### 공유 코드 변경 시 양쪽 배포가 필요한 경우

현재 구조에서는 공유 코드가 각 프로젝트에 복사되어 있으므로 해당 없음.
향후 `packages/shared` 같은 공유 패키지 도입 시 별도 설정 필요.

## 참고 자료

- [Vercel Monorepos 공식 문서](https://vercel.com/docs/monorepos)
- [Ignored Build Step 설정](https://vercel.com/docs/projects/overview#ignored-build-step)
