# 배경연출 이미지 생성 가이드

## 개요

각 책의 핵심요약(summary)과 감상경위(context) 섹션에 표시되는 시네마틱 배경 이미지.
롱폼 레이아웃에서 포스터 우측에 16:9 비율로 표시된다.

## 이미지 생성 방법 확인

**이미지 생성은 유료 API를 사용한다. 반드시 유저 사전 승인 후 실행.**

## API 생성

### 스크립트

```bash
cd sw/remotion
pnpm tsx scripts/image/generate-images.ts --episode <name> --gemini              # Gemini Imagen 4 (기본)
pnpm tsx scripts/image/generate-images.ts --episode <name> --only 1-1            # 특정 슬롯만
pnpm tsx scripts/image/generate-images.ts --episode <name> --force               # 기존 파일 덮어쓰기
pnpm tsx scripts/image/generate-images.ts --episode <name> --dry                 # 프롬프트만 확인
pnpm tsx scripts/image/generate-images.ts --episode <name>                       # fal.ai (레거시)
```

### 모델

| 플래그 | 모델 | 단가 | 용도 |
|--------|------|------|------|
| `--gemini` | Imagen 4 Standard | $0.04/장 | **기본. 고품질** |
| (없음) | fal.ai Flux Dev | ~$0.04/장 | 레거시 |

Imagen 4는 `GOOGLE_GENAI_API_KEY_PAID1` 유료 키를 사용한다.

## 이미지 전환 시스템

### 신규: `images` 배열 (텍스트 앵커 기반 N장 전환)

나레이션 대사에 이미지를 묶는다. 분량에 관계없이 서사 흐름에 맞춰 N장이 전환된다.

**JSON 구조:**
```jsonc
"images": [
  { "file": "1-1.jpg", "keyword": "트로이의 분노" },                             // 첫 이미지 — 북 섹션 시작
  { "file": "1-2.jpg", "text": "알렉산더 대왕에게 일리아스는", "keyword": "영웅의 무덤" },  // context 진입 시
  { "file": "1-3.jpg", "text": "그로부터 3년 뒤", "keyword": "가우가멜라", "prompt": "...", "ko": "..." }
]
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `file` | O | 이미지 파일명 (확장자 포함, `images/` 기준) |
| `text` | △ | 텍스트 앵커 — 나레이션에서 이 텍스트가 시작될 때 전환. 첫 이미지는 생략 |
| `keyword` | △ | Studio 표시용 키워드 |
| `prompt` | △ | 영문 이미지 프롬프트 (생성용) |
| `ko` | △ | 한국어 이미지 프롬프트 (생성용) |

**동작 원리:**
1. `BookCardVisual`이 voiceTimings에서 `text` 앵커를 검색하여 프레임 위치 계산
2. `CinematicPanel`이 해당 프레임에서 0.67초 크로스페이드로 전환
3. 이미지 장수에 제한 없음 — 책 1권 리뷰 에피소드에서 10장도 가능

**파일 경로:**
```
public/episodes/{status}/{person}/images/{n}-{slot}.{ext}
  예: episodes/done/alexander-the-great/images/1-1.jpg
      episodes/done/alexander-the-great/images/1-3.jpg  ← 3번째 이미지
```

### 레거시: `imagePrompts` (2슬롯 고정)

`images` 배열이 없는 에피소드는 기존 방식으로 동작한다.

| 슬롯 | 파일명 | 표시 구간 | 설명 |
|------|--------|----------|------|
| `1` | `{n}-1.jpg` | 핵심요약 페이즈 | 책의 세계관/핵심 장면 |
| `2` | `{n}-2.jpg` | 감상경위 페이즈 | 셀럽이 책을 만난 맥락 |

`CinematicPanel`이 `frame < sLabelContext ? '1' : '2'`로 전환.

**`images`가 있으면 `imagePrompts`보다 우선한다.** 레거시 에피소드 마이그레이션 시 `images` 배열을 추가하면 자동 전환.

## 이미지 규칙

### 필수
- **16:9 가로 비율**
- **하이퍼리얼리스틱** — 21세기 카메라로 실제 촬영한 것처럼
- **텍스트/글자 금지** — 프롬프트에 `no text, no letters, no words` 포함

### 허용
- 인물 얼굴 묘사 (Imagen 4 이상)
- CG, 마법, 판타지 장면 — 실사 촬영처럼 보이면 OK
- 시네마틱 조명, 다크 톤, 밝은 톤 모두 장면에 맞게 자유

### 피할 것
- AI 생성 특유의 텍스트/기호 아티팩트
- 밝고 평면적인 일러스트 스타일

## 이미지 카탈로그 시스템

이미지는 R2에 저장하고 Supabase `remotion_images` 테이블에 메타데이터를 관리한다.
에피소드 간 이미지 재활용이 가능하다 (같은 책의 summary 이미지 등).

### DB 테이블: `remotion_images`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | TEXT PK | `long-{episode}-b{n}-{slot}` 또는 시맨틱 ID |
| `type` | TEXT | `nano` (1:1 쇼츠) / `long` (16:9 롱폼) |
| `desc_ko` | TEXT | 한국어 설명 (검색용) |
| `tags` | TEXT[] | 태그 배열 (GIN 인덱스) |
| `prompt` | TEXT | 원본 생성 프롬프트 |
| `source` | TEXT | `fal-pro`, `fal-dev`, `gemini`, `nanobana`, `manual` |
| `r2_url` | TEXT | R2 공개 URL |

### 에피소드 JSON에서 참조

```jsonc
"imagePrompts": {
  "1": {
    "prompt": "...",
    "keyword": "트로이의 분노",
    "imageId": "long-alexander-the-great-b1-1"  // ← 카탈로그 참조
  }
}
```

`imageId`가 있으면 R2 URL을 사용, 없으면 로컬 파일 폴백.

### 스크립트

```bash
cd sw/remotion

# 에피소드 이미지 일괄 등록 (R2 업로드 + DB + JSON에 imageId 기입)
pnpm tsx scripts/image/register-images.ts --episode <name> --source fal-pro --update-json

# 단건 업로드
pnpm tsx scripts/image/upload-image.ts --id long-troy-001 --file <path> \
  --desc "트로이 전투" --tags troy,battle,iliad --source fal-pro

# 카탈로그 검색
pnpm tsx scripts/image/search-images.ts --tags troy,battle
pnpm tsx scripts/image/search-images.ts --query "트로이"
pnpm tsx scripts/image/search-images.ts --all
```

### 렌더링 해석 우선순위

1. `imageId` 있음 → R2 URL
2. `imageId` 없음 → 로컬 `public/episodes/{status}/{ep}/images/{n}-{1|2}.jpg`
3. 둘 다 없음 → Studio placeholder

### R2 경로

```
remotion/images/{id}.jpg
```

## 쇼츠 배경 이미지

쇼츠 전용 배경 이미지는 별도 경로에 관리한다. 롱폼 이미지와 독립적.

상세 스펙은 [`shorts.md` — 배경 이미지 (4장 레이어 시스템)](shorts.md#배경-이미지-4장-레이어-시스템) 참조.

### 경로

```
public/episodes/{person}/images/
  shorts-1.png      ← hook~celeb-mid 배경 (Layer 1)
  shorts-2.png      ← book 구간 폴백 (Layer 2)
  shorts-3.png      ← book 구간 커스텀 (Layer 3, seg.image)
  shorts-4.png      ← book 구간 커스텀 (Layer 3, imageChangeAt)
```

- **person**: 인물명 (한/영 공유, `-en` 제거 불필요)
- **비율**: 1:1 (1024×1024 권장). 렌더러가 `object-fit: cover`로 MID 영역에 맞춤
- `.gitignore` 포함 (AI 생성 이미지, 로컬 전용)

### 이미지 생성 가이드

- 어두운 톤 + 시네마틱 조명 (Neo-Pantheon 톤)
- 인물 얼굴 금지 — 실루엣, 오브젝트, 풍경만
- 텍스트/글자 금지
- 에피소드 스토리 흐름에 맞춰 4장 내러티브 구성:
  - 1번: 인물/시대 분위기 (hook~celeb-mid용)
  - 2~4번: book-context 텍스트 흐름에 매칭 (장면 전환)

---

## 레거시: 로컬 파일 기반

`CINEMATIC_EPISODES` Set에 등록된 에피소드는 로컬 파일로도 동작한다 (하위 호환).

### 출력 경로

```
public/episodes/{person}/images/
  1-1.jpg, 1-2.jpg, 2-1.jpg, ...
```
