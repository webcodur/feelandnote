# remotion-bo 기획서

영상 제작 관리 대시보드. Remotion 영상의 기획·제작·관리 전 과정을 한 곳에서 다룬다.

> **NOTE (26.03.23):** R2 음성 동기화 시스템 폐기. 이 문서의 R2 관련 기획(R2 현황 페이지, R2 동기화 UI, R2 상태 표시)은 더 이상 유효하지 않다. 영상 음성 파일은 로컬 전용으로 관리한다.

## 정체성

- **web-bo** = 서비스 운영 (셀럽 CRUD, 콘텐츠, 사용자)
- **remotion-bo** = 영상 제작 (시나리오, 음성, 렌더링, 편성)

web-bo의 셀럽 데이터를 읽기 전용으로 참조하되, 영상 제작에 필요한 워크플로만 담당한다.

---

## 규모 전제

- 인물 풀: 624명 (DB 등록 기준)
- 에피소드: 시리즈별 수백 개 (서재 탐방만 624개 가능)
- 시리즈: 3개 시작 → 향후 5~10개
- 음성 파일: 에피소드당 ~30 WAV → 전체 ~18,000개, ~8.5GB
- 렌더 결과: 에피소드당 롱폼+쇼츠 2개 → 수백 영상

---

## IA (Information Architecture)

```
┌─ 헤더 ──────────────────────────────────────────┐
│  Remotion BO    [인물 검색...]           [R2 ●]  │
├─ 1단 사이드바 ──┬───────────────────────────────┤
│                 │                               │
│ 📺 서재 탐방     │   (메인 콘텐츠 영역)          │
│ 🎭 라이벌 대담   │                               │
│ 📢 서비스 소개   │                               │
│ ···(향후 시리즈) │                               │
│                 │                               │
│ ─────────────  │                               │
│ ⚙ 인프라        │                               │
│  ├ R2 현황      │                               │
│  └ 렌더 큐      │                               │
│                 │                               │
├─ 2단 사이드바 ──┤   (시리즈 선택 시 펼침)        │
│ [검색/필터]     │                               │
│ ★ 최근 작업     │                               │
│ ─────────      │                               │
│ 편성표          │                               │
│ + 새 에피소드   │                               │
│ ─────────      │                               │
│ 알렉산더 대왕 ● │                               │
│ 다빈치       ◐ │                               │
│ 나폴레옹     ○ │                               │
│ ... (가상스크롤) │                               │
└─────────────────┴───────────────────────────────┘

● = 렌더 완료   ◐ = 음성 완료   ○ = JSON만
```

### 1단 사이드바: 시리즈 + 인프라

시리즈를 클릭하면 2단이 펼쳐진다. 인프라는 시리즈 독립.

### 2단 사이드바: 시리즈 내 에피소드

- **상단**: 검색/필터 (시대, 직군, 제작 상태)
- **최근 작업**: 최근 편집한 에피소드 3~5개 핀
- **편성표**: 해당 시리즈의 편성표 링크
- **에피소드 목록**: 가상 스크롤 (수백 개 대응). 상태 아이콘(●/◐/○) 표시

### 시리즈 레지스트리

시리즈마다 구조가 다르므로, 각 시리즈는 레지스트리에 등록한다:

```typescript
interface SeriesDefinition {
  id: string                      // 'book-recommend'
  label: string                   // '서재 탐방'
  icon: string                    // '📺'
  composition: string             // 'BookRecommend'
  episodeDir: string              // 'book-recommend' (episodes/ 하위)
  jsonSchema: ZodSchema           // 에피소드 JSON 검증
  scenarioView: React.ComponentType  // 시나리오 뷰 컴포넌트
  ttsJobBuilder: (ep) => Job[]    // TTS 작업 목록 생성
  renderConfig: RenderConfig      // 코덱, 해상도 등
}
```

새 시리즈 추가 = 레지스트리에 정의 1개 추가. UI/라우팅은 자동 생성.

---

## 라우팅

```
/                                    → 대시보드 (전체 현황)
/search?q=알렉산더                    → 인물 검색 결과

── 시리즈 공통 패턴 (/[series]/...) ──
/[series]                            → 시리즈 홈 (편성표 + 에피소드 목록)
/[series]/lineup                     → 편성표 상세
/[series]/new                        → 새 에피소드 스캐폴딩
/[series]/[name]                     → 에피소드 관리 (시나리오+음성+렌더+JSON)
/[series]/[name]/scenario            → 시나리오 전용 뷰

── 인프라 ──
/infra/r2                            → R2 스토리지 현황
/infra/render-queue                  → 렌더 큐
```

`[series]`가 동적 세그먼트. 레지스트리에 등록된 시리즈만 유효. 시리즈별 별도 라우트 파일이 불필요하다.

---

## 에피소드 디렉토리 구조

### 현재 (플랫)

```
episodes/
  alexander-the-great.json
  elon-musk.json
```

### 확장 후 (시리즈별)

```
episodes/
  book-recommend/
    alexander-the-great.json
    elon-musk.json
  rival-talk/
    davinci-vs-michelangelo.json
  service-intro/
    main.json
```

### 마이그레이션 계획

1. `episodes/book-recommend/` 디렉토리 생성, 기존 JSON 이동
2. `1-tts.ts`에 `--series` 플래그 추가 (기본값 `book-recommend`)
3. `voice-r2.ts`의 R2 경로에 시리즈 프리픽스 추가: `remotion/voice/{series}/{name}/`
4. `render-all.ts`에 시리즈 인식 추가
5. `script.ts`의 episodes import를 시리즈별 동적 로드로 전환
6. Root.tsx의 Composition 자동 등록에 시리즈 프리픽스 추가

**호환성**: 마이그레이션 완료 전까지 `--series` 미지정 시 기존 플랫 경로 폴백.

---

## 페이지별 상세

### 대시보드 (`/`)

```
┌─────────────────────────────────────────────┐
│ 시리즈 현황                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │서재 탐방  │ │라이벌 대담│ │서비스 소개│     │
│ │ 4/624    │ │ 0/40+    │ │ 1/1 완료 │     │
│ │ ●2 ◐1 ○1│ │          │ │          │     │
│ └──────────┘ └──────────┘ └──────────┘     │
│                                             │
│ R2 현황        최근 작업                     │
│ 129 files      voice alexander  2분 전 done │
│ 56.1MB / 10GB  render napoleon  진행 중...  │
│ 3 unsynced                                  │
└─────────────────────────────────────────────┘
```

### 인물 검색 (`/search`)

DB에서 셀럽을 검색하여 영상 제작에 활용.

- Supabase `profiles` 테이블 검색 (nickname, nickname_en)
- 검색 결과 컬럼: 닉네임, 시대, 직군, 책 수, 음성 보유, 감상여정 보유, **기존 에피소드 여부**
- 결과에서 "에피소드 스캐폴딩" 버튼 → 시리즈 선택 → JSON 뼈대 생성
- 필터: 시대, 직군, 책 수 범위, 음성 보유 여부
- **기존 에피소드가 있으면** 해당 에피소드로 바로 이동

### 에피소드 스캐폴딩 (`/[series]/new`)

DB 데이터 → JSON 뼈대 생성 → AI 초안 → 수동 검수.

**자동 매핑 (DB → JSON)**:
| JSON 필드 | DB 소스 | 자동 |
|-----------|---------|------|
| `host.nickname` | `profiles.nickname` | ✓ |
| `host.avatar_url` | `profiles.avatar_url` | ✓ |
| `host.bio` | `profiles.bio` | ✓ |
| `host.speech_tone` | `profiles.speech_tone` | ✓ |
| `host.elevenlabsVoiceId` | `celeb_voice.elevenlabs_id` | ✓ |
| `books[].title/creator` | `content_celebs + contents` | ✓ |
| `books[].thumbnail_url` | `contents.thumbnail_url` | ✓ |
| `books[].stats` | 집계 쿼리 | ✓ |

**AI 초안 (ai-services → JSON)**:
| JSON 필드 | 생성 방식 |
|-----------|-----------|
| `host.philosophy` | DB consumption_philosophy + speech_tone → 1인칭 재작성 |
| `books[].summary` | DB review → 책 자체 설명 추출 |
| `books[].contextMain` | DB review → 감상 배경 추출 (3인칭) |
| `narrator.celebIntro` | DB bio → 위키백과 서술체 재작성 |
| `narrator.outro` | 템플릿 + 인물명/책 수 자동 삽입 |

**수동 검수 필수**:
| JSON 필드 | 이유 |
|-----------|------|
| `books[].quotePairs` | 인용문+후속맥락 배열. 검증된 인용문만 허용. AI 창작 금지 |
| `shorts.segments` | 훅/CTA 등 크리에이티브 |
| `narrator.serviceIntro` | 에피소드별 커스텀 |

### 편성표 (`/[series]/lineup`)

#### 데이터 소스: lineup.json

`lineup.md` → `lineup.json` 구조화. 시리즈별 1개 파일.

```typescript
// episodes/book-recommend/lineup.json
interface Lineup {
  phases: Phase[]
  rivalGroups: RivalGroup[]
  politicalBalance: PoliticalSlot[]
}

interface Phase {
  id: string            // 'phase-1'
  label: string         // 'Phase 1: 음성 보유'
  slots: LineupSlot[]
}

interface LineupSlot {
  order: number
  celebSlug: string     // DB 참조
  nickname: string
  era: string
  profession: string
  bookCount: number
  status: 'pending' | 'json' | 'voice' | 'rendered'
  episodeName?: string  // episodes/ 내 파일명
}

interface RivalGroup {
  id: string
  label: string         // '삼국지'
  slots: [LineupSlot, LineupSlot]  // 반드시 2명
  notes?: string
}
```

#### 편성표 UI

- Phase별 진행률 바
- 라이벌 묶음: 양쪽 인물 카드 쌍. 한쪽만 완료면 경고
- 상태별 필터 (pending/json/voice/rendered)
- 드래그로 순서 조정 → lineup.json 저장

### 에피소드 관리 (`/[series]/[name]`)

단일 페이지, 섹션 스크롤. 시나리오만 별도 페이지.

```
┌─────────────────────────────────────────┐
│ 알렉산더 대왕            [시나리오 보기] │
│ book-recommend · 8권 · Shorts ✓  ● 완료│
├─────────────────────────────────────────┤
│ ▼ VOICE                                │
│   [엔진▼] [역할▼] [only___] [생성] [+R2]│
│   ▶ book-0-title.wav    4.09s   192KB  │
│   ▶ book-0-summary.wav  28.77s  1349KB │
│   ...                                  │
├─────────────────────────────────────────┤
│ ▼ R2 STORAGE                           │
│   [업로드] [다운로드] [전체 재업로드]     │
├─────────────────────────────────────────┤
│ ▼ RENDER                               │
│   [전체] [롱폼만] [쇼츠만]              │
├─────────────────────────────────────────┤
│ ▼ TASKS                                │
│   (진행 중/완료 작업 로그)               │
├─────────────────────────────────────────┤
│ ▼ JSON EDITOR                          │
│   (textarea + 저장/새로고침)             │
└─────────────────────────────────────────┘
```

### R2 현황 (`/infra/r2`)

#### 소규모 (현재)
- 에피소드별: 로컬 WAV 수, R2 업로드 수, unsynced 수, 용량
- 일괄 동기화 버튼

#### 대규모 (18,000+ 파일)
- **시리즈별 집계**: 시리즈당 총 파일 수, 용량
- **용량 추이**: 월별 누적 그래프 (R2 무료 10GB 한도 대비)
- **해시 캐싱**: `r2-manifest.json`의 해시를 신뢰하고, 전체 재검증은 `--force` 옵션으로만
- **무료 한도 초과 알림**: 8GB 도달 시 경고

### 렌더 큐 (`/infra/render-queue`)

#### 소규모 (현재): 인메모리
- 진행 중/완료/실패 작업 목록
- stdout 로그 실시간 표시

#### 대규모 전환 기준: 큐 파일 영속화
- 전환 시점: 배치 렌더링(10개+) 도입 시
- `remotion/render-queue.json`에 상태 저장
- 서버 재시작 후 미완료 작업 재개
- 동시 렌더 수 제한 (CPU/메모리 보호)

---

## 헤더

```
[Remotion BO]  [인물 검색 입력...]  [R2 ● synced | ▲ 3 unsynced]
```

- **인물 검색**: 글로벌. 결과에서 에피소드 이동/스캐폴딩 생성
- **R2 아이콘**: 전체 동기화 상태 (초록=전부 synced, 노랑=unsynced 있음)
- 시리즈 전환은 사이드바 1단에서만 (헤더와 중복 제거)

---

## API

### 기존 (유지, 시리즈 대응 확장)

```
GET     /api/episodes?series=          에피소드 목록 (시리즈 필터)
GET/PUT /api/episodes/:series/:name    에피소드 CRUD
POST    /api/episodes/:series          새 에피소드 생성 (스캐폴딩)

GET     /api/voice/files/:series/:ep   음성 파일 목록
GET     /api/voice/play/[...path]      음성 재생
POST    /api/voice/generate            TTS 생성 (series 파라미터 추가)
POST    /api/voice/upload              R2 업로드
POST    /api/voice/pull                R2 다운로드
GET     /api/voice/status              R2 동기화 현황

POST    /api/render                    렌더링 트리거
GET     /api/tasks                     작업 큐
GET     /api/tasks/:id                 작업 상세
```

### 추가

```
── 인물 (Supabase 읽기 전용) ──
GET  /api/celebs/search?q=&era=&profession=  셀럽 검색
GET  /api/celebs/:slug                       셀럽 상세 (프로필+콘텐츠)

── 편성 ──
GET  /api/lineup/:series                     편성표 데이터
PUT  /api/lineup/:series                     편성 저장

── 인프라 ──
GET  /api/infra/r2/summary                   R2 전체 현황 (시리즈별 집계)
```

---

## 다국어 영상

### 채널 전략

| 채널 | 언어 | 용도 |
|------|------|------|
| Feel & Note | 한국어 | 기존 채널 |
| Feel & Note EN | 영어 | 신설. 동일 구글 계정에서 채널 추가 |

한 채널에 한국어/영어를 섞으면 알고리즘 성과가 떨어진다. 언어별 채널 분리가 표준이다(Kurzgesagt, TED 등).

영상 내부에 텍스트(자막, 라벨, 책 제목, CTA)가 직접 렌더링되므로, 유튜브 CC 자막으로 대체 불가. **영문 에피소드를 별도 렌더**해야 한다.

### 파일 구조

```
episodes/book-recommend/
  alexander-the-great.json        ← 한국어 (기본)
  alexander-the-great.en.json     ← 영어
```

로케일별 별도 파일. 한 파일에 통합하지 않는다:
- 한국어/영어의 문장 수, 길이, TTS duration이 전혀 다르다
- 영어 에피소드는 번역이 아니라 재작성이다 (문화적 맥락, 어투)
- 기존 스크립트에 `--locale en` 플래그만 추가하면 된다

### 영문 에피소드에서 달라지는 것

| 항목 | 한국어 | 영어 |
|------|--------|------|
| 나레이터 TTS | Kore (ko-KR) | Gemini Journey / Cloud en-US |
| 요약맨 TTS | Charon (ko-KR) | Gemini Puck / Cloud en-US |
| 셀럽 TTS | ElevenLabs | ElevenLabs (동일 보이스 가능) |
| 화면 라벨 | "핵심 요약" / "감상 배경" | "Key Summary" / "Why They Read It" |
| 브랜드 | FEEL & NOTE | 동일 |
| CTA | "Feel & Note 앱에서 만나보세요" | "Discover more at feelandnote.com" |
| quotePairs[].quote | 한국어 번역본 | **영문 원전에서 인용** (번역 금지) |

### 영문 에피소드 생성 파이프라인

```
1. 한국어 에피소드 완성 (기존 흐름)
      ↓
2. AI 번역 + 재작성 → .en.json 생성
   - celebIntro: 영문 위키백과 톤
   - philosophy: 1인칭 영문 재작성
   - summary/contextMain: 영어 자연어순
   - quotePairs[].quote: 영문 원전 조회 (번역 아님!)
      ↓
3. 수동 검수 (특히 quotePairs[].quote 원전 확인)
      ↓
4. 영문 TTS 생성 (--locale en)
      ↓
5. 영문 렌더 (동일 Composition, locale prop)
```

### Remotion 코드 변경

최소한의 변경. 에피소드 JSON이 이미 모든 텍스트를 담고 있으므로:

- `BookRecommend.tsx`: `locale` prop 추가. 라벨/CTA만 분기
- `Root.tsx`: 로케일별 Composition 자동 등록 (`{Label}En`)
- `1-tts.ts`: `--locale en` → 영문 보이스 매핑
- `render-all.ts`: 로케일별 출력 파일 분리

### remotion-bo 반영

- 사이드바 에피소드 목록에 로케일 배지 (🇰🇷/🇺🇸)
- 에피소드 관리에서 "영문 버전 생성" 버튼
- 편성표에 로케일별 진행 상태 표시
- R2 경로: `remotion/voice/{series}/{name}.{locale}/`

---

## 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| DB 접근 | Supabase 직접 연결 (anon key, 읽기 전용) | web-bo와 동일 URL/키. 환경변수 공유, 타입은 독립 정의 |
| 상태 관리 | React state + fetch | 로컬 도구. 복잡한 상태관리 불필요 |
| 에피소드 저장 | 파일 기반 (`episodes/{series}/{person}/{locale}.json`) | Remotion이 파일을 직접 import. DB화하면 빌드 파이프라인 복잡해짐 |
| 편성 데이터 | `episodes/{series}/lineup.json` | lineup.md를 구조화. DB 불필요 (편성은 로컬 판단) |
| 렌더 큐 | 인메모리 → 파일 영속화 (배치 도입 시 전환) | 초기는 간단하게, 규모 커지면 전환 |
| 시리즈 확장 | 레지스트리 패턴 | 새 시리즈 = 정의 1개 추가. UI/라우팅 자동 |
| AI 초안 | `@feelandnote/ai-services` 연동 | 수백 에피소드를 수동 작성하는 건 비현실적 |
| 다국어 | 로케일별 별도 JSON (`{name}.en.json`) | 번역이 아니라 재작성. duration/문장 구조가 달라 통합 불가 |
| 유튜브 채널 | 언어별 분리 (KR + EN) | 알고리즘 최적화. 영상 내 텍스트가 렌더링되므로 CC 자막 대체 불가 |

---

## 구현 현황

### Phase 1: 구조 잡기 ✅ 완료

1. ✅ 헤더 + 2단 사이드바 (1단: 시리즈 아이콘, 2단: 에피소드 목록)
2. ✅ 시리즈 레지스트리 (`lib/series-registry.ts` — BookRecommend 등록)
3. ✅ 라우팅 재구성 (`/[series]/[name]` 패턴)
4. ✅ 에피소드 디렉토리 마이그레이션 (`episodes/book-recommend/`)
5. ✅ 대시보드 시리즈 현황 카드 (●/◐/○ 상태 표시)

### Phase 2: 인물 연동 ✅ 완료 (AI 초안 미구현)

6. ✅ Supabase 연결 (anon key 읽기 전용)
7. ✅ 셀럽 검색 API (`/api/celebs/search`, `/api/celebs/[slug]`)
8. ✅ 인물 검색 페이지 (`/search` — 직군·음성 필터, 에피소드 존재 여부 표시)
9. ✅ 에피소드 스캐폴딩 (`POST /api/[series]/episodes` — DB→JSON 뼈대 생성)
10. ⏸ AI 초안 (philosophy, summary, contextMain, celebIntro) — LLM 연동 시 별도 작업

### Phase 3: 편성 관리 — 미착수

11. lineup.json 구조화 (lineup.md → JSON 전환)
12. 편성표 UI
13. 에피소드 상태 추적 (사이드바 상태 아이콘) — 사이드바에 ●/◐/○ 아이콘은 이미 구현

### Phase 4: 시리즈 확장 — 미착수

14. 서비스 소개 레지스트리 등록
16. 사이드바 2단 에피소드 목록 가상 스크롤

### Phase 5: 다국어 — 미착수

17. 에피소드 JSON 로케일 체계 (`{name}.en.json`)
18. Composition locale prop + 라벨/CTA 분기
19. 영문 TTS 보이스 매핑 + 1-tts.ts --locale 플래그
20. 영문 에피소드 AI 재작성 파이프라인 (quotePairs[].quote 원전 조회 포함)
21. remotion-bo 로케일 배지 + "영문 버전 생성" 버튼

### Phase 6: 인프라 고도화 — 미착수

22. R2 시리즈별 집계 + 용량 추이 + 한도 알림
23. 렌더 큐 파일 영속화 + 배치 렌더링
24. 해시 캐싱 (대규모 R2 동기화 성능)

---

## 코드 구조

### 디렉토리

```
sw/remotion-bo/src/
├── app/
│   ├── layout.tsx               ← 루트 레이아웃 (헤더 + 사이드바 + main)
│   ├── page.tsx                 ← 대시보드 (시리즈 현황 카드)
│   ├── search/page.tsx          ← 인물 검색 (Supabase 셀럽 검색)
│   ├── [series]/
│   │   ├── page.tsx             ← 시리즈 홈 (에피소드 그리드)
│   │   └── [name]/
│   │       ├── page.tsx         ← 에피소드 관리 (음성/R2/렌더/JSON)
│   │       └── scenario/page.tsx ← 시나리오 뷰 (롱폼/쇼츠)
│   └── api/
│       ├── [series]/            ← 시리즈별 API
│       │   ├── episodes/        ← GET 목록 / POST 스캐폴딩
│       │   ├── render/          ← POST 렌더링
│       │   └── voice/           ← generate/files/play/upload/pull/status
│       ├── celebs/              ← Supabase 셀럽 (시리즈 무관)
│       │   ├── search/          ← GET 검색
│       │   └── [slug]/          ← GET 상세+도서
│       └── tasks/               ← GET 작업 큐
├── components/
│   ├── Header.tsx               ← 헤더 바 (로고 + 검색 링크)
│   ├── Sidebar.tsx              ← 2단 사이드바 (시리즈 + 에피소드)
│   └── TaskPanel.tsx            ← 작업 상태 패널 (폴링)
└── lib/
    ├── series-registry.ts       ← 시리즈 정의 + 레지스트리
    ├── server-utils.ts          ← 파일 I/O + 작업 큐
    └── supabase.ts              ← Supabase anon 클라이언트
```

### 핵심 설계

- **시리즈 확장**: `series-registry.ts`에 정의 1개 추가 → UI/라우팅/API 자동 대응
- **에피소드 파일 기반**: `episodes/{series}/{person}/{locale}.json` (DB 아닌 파일)
- **Supabase 읽기 전용**: 셀럽 프로필·도서만 조회. 쓰기는 JSON 파일로
- **스캐폴딩**: DB → JSON 뼈대 자동 생성. AI 초안 필드는 빈 문자열 (LLM 연동 시 채움)
