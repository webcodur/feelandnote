# 셀럽 프로필 생성 룰북

Feelandnote 플랫폼의 셀럽 프로필 전체 생성 가이드. Claude Code agent와 web-bo에서 공통 참조.

---

## 셀럽 티어 (celeb_tier)

`profiles.celeb_tier` 컬럼으로 두 가지 티어를 구분한다.

| 티어 | 설명 | 콘텐츠 수집 | 프로필 페이지 |
|------|------|------------|-------------|
| **full** | 감상 콘텐츠 보유 셀럽 (기본값) | O | 콘텐츠 탭 표시 |
| **light** | 감상 콘텐츠 없는 셀럽 | X | 콘텐츠 탭 숨김 |

- 두 티어 모두 **감상 철학(consumption_philosophy)은 필수**
- light → full 승격: 콘텐츠 수집 후 `UPDATE profiles SET celeb_tier = 'full'`

---

## 작업 순서 (병렬 파이프라인)

basic 완료 후 4개 트랙이 **병렬**로 실행 가능하다. 각 트랙은 서로 독립적이다.

```
basic ─┬─ content ── philosophy   (full 전용: content → philosophy 순차)
       ├─ influence
       ├─ persona
       └─ speech (tone → quotes → dialogue*)
                                    *퍼블릭 도메인만

모든 트랙 완료 → i18n
```

### full 파이프라인

| 트랙 | 단계 | 룰북 | 의존 |
|------|------|------|------|
| - | 기본 정보 | `celeb-1-basic-profile.md` | 없음 (최초) |
| A | 콘텐츠 수집 | `celeb-2-content-collector.md` | basic |
| A | 감상 철학 | `celeb-3-philosophy.md` | content |
| B | 영향력 평가 | `celeb-4-influence.md` | basic |
| C | 페르소나 | `celeb-5-persona.md` | basic |
| D | Speech 트랙 | `celeb-7-speech.md` | basic |
| - | 영문 번역 (i18n) | `docs/i18n-plan.md` | 모든 트랙 완료 |

### light 파이프라인

| 트랙 | 단계 | 룰북 | 의존 |
|------|------|------|------|
| - | 기본 정보 | `celeb-1-basic-profile.md` | 없음 (최초) |
| A | 감상 철학 | `celeb-3-philosophy.md` | basic (웹 리서치 기반) |
| B | 영향력 평가 | `celeb-4-influence.md` | basic |
| C | 페르소나 | `celeb-5-persona.md` | basic |
| D | Speech 트랙 | `celeb-7-speech.md` | basic |
| - | 영문 번역 (i18n) | `docs/i18n-plan.md` | 모든 트랙 완료 |

**각 단계의 상세 규칙은 해당 룰북을 참조한다. 이 문서에서 중복 기술하지 않는다.**

---

## Speech 트랙 (tone → quotes → dialogue)

Speech 트랙은 `docs/project/celeb/celeb-7-speech.md`에서 상세 관리한다.

- **speech_tone**: basic만 완료되면 독립 배정 가능 (persona 의존 없음)
- **quotes**: speech_tone 확정 후 작성 (어조 일치 필수)
- **dialogue**: 퍼블릭 도메인 셀럽(1920년 이전 사망자)만 자동 생성

| 조건 | dialogue 생성 |
|------|--------------|
| `death_date` ≤ 1920 | **자동 실행** — greeting_only (3개) |
| `death_date` > 1920 또는 생존 | **자동 실행** — greeting_only (3개). full은 별도 요청 시 |

- 퍼블릭 도메인 판정 함수: `isPublicDomainCeleb()` (AGENTS.md 참조)

---

## 판단 기준

- **"라이트"/"light" 명시**: light 파이프라인 (콘텐츠 수집 생략)
- **"컨텐츠 수집까지" 또는 "전체" 언급**: full 파이프라인 확정
- **티어 미지정 (이름만 제공 등)**: **content-collector를 먼저 실행**하여 수집 결과로 티어 결정

### 티어 미지정 시 흐름

1. basic 생성
2. **content-collector 실행** (celeb-2-content-collector.md)
3. 수집 결과로 티어 판정 및 **즉시 DB 반영**:
   - **1건 이상 수집** → `UPDATE profiles SET celeb_tier = 'full'` (수집 결과를 philosophy에 활용)
   - **0건** → **light** 유지 (웹 리서치 기반 philosophy)
4. 이후 병렬 트랙 진행

> **주의**: 최초 light로 생성 후 콘텐츠 수집에 성공하면 반드시 `celeb_tier = 'full'`로 UPDATE해야 한다. 누락 시 콘텐츠 탭이 숨겨진다.

고유 대사는 퍼블릭 도메인 셀럽일 때만 자동 포함.
영문 번역은 모든 트랙이 완료된 셀럽에 대해 실행.

---

## 영문 번역 (i18n)

모든 트랙(A~D) 완료 후 한국어 데이터를 영문으로 번역하는 단계다. 별도 에이전트가 담당하며, 이 파이프라인에서 직접 실행하지 않는다.

### 번역 대상

| 데이터 | 소스 테이블/컬럼 | 번역 컬럼 |
|--------|----------------|----------|
| 수식어 | `profiles.title` | `title_en` |
| 소개글 | `profiles.bio` | `bio_en` |
| 명언 | `profiles.quotes` | `quotes_en` |
| 감상 철학 | `profiles.consumption_philosophy` | `consumption_philosophy_en` |
| 영향력 설명 | `celeb_influence.*_exp` (7개) | `*_exp_en` |
| 고유 대사 | `celeb_dialogues.lines` (21개) | locale별 구조 (`docs/i18n-plan.md` 6.6절 참조) |

### 실행 조건

- 모든 트랙(A~D) 완료된 셀럽만 대상
- 번역 품질은 인물의 시대·말투·뉘앙스를 반영해야 함
- 상세 계획: `docs/i18n-plan.md` Phase 5~6 참조

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **파일 경로**: 상대 경로만 사용
- **`is_verified`**: 셀럽 계정 생성 시 **항상 false**
- **`nickname_en`**: basic 단계에서 **필수 설정**. slug가 generated column으로 `nickname_en`에서 자동 생성됨. 미설정 시 slug=NULL → web-bo 404 발생
