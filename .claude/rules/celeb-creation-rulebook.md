# 셀럽 프로필 생성 룰북

Feelandnote 플랫폼의 셀럽 프로필 전체 생성 가이드. Claude Code agent와 web-bo에서 공통 참조.

---

## 작업 순서

| # | 단계 | 룰북 | 비고 |
|---|------|------|------|
| 1 | 기본 정보 | `.claude/rules/celeb-1-basic-profile.md` | 필수 |
| 2 | 콘텐츠 수집 | `.claude/rules/celeb-2-content-collector.md` | 요청 시 |
| 3 | 감상 철학 | `.claude/rules/celeb-3-philosophy.md` | 필수 |
| 4 | 영향력 평가 | `.claude/rules/celeb-4-influence.md` | 필수 |
| 5 | 페르소나 | `.claude/rules/celeb-5-persona.md` | 필수 |
| 6 | 고유 대사 | `.claude/rules/celeb-8-dialogue.md` | 조건부 (아래 참조) |
| 7 | 영문 번역 (i18n) | `docs/i18n-plan.md` Phase 5~6 참조 | 6단계 완료 후 |

**각 단계의 상세 규칙은 해당 룰북을 참조한다. 이 문서에서 중복 기술하지 않는다.**

---

## 고유 대사 자동 포함 규칙

6단계(고유 대사)는 **퍼블릭 도메인 셀럽**(1920년 이전 사망자)에게만 자동 실행한다.

| 조건 | 대사 생성 |
|------|----------|
| `death_date` ≤ 1920 | **자동 실행** (파이프라인에 포함) |
| `death_date` > 1920 또는 생존 | **실행하지 않음** (별도 요청 시만) |

- 판정 기준: 1단계(기본 정보)에서 확정된 `death_date` 값
- 퍼블릭 도메인 판정 함수: `isPublicDomainCeleb()` (AGENTS.md 참조)

---

## 판단 기준

- **이름만 제공**: 1 → 3 → 4 → 5 → (6) (콘텐츠 수집 건너뜀)
- **"컨텐츠 수집까지" 또는 "전체" 언급**: 1 → 2 → 3 → 4 → 5 → (6) (전체 실행)
- **모호한 요청**: 범위 명확화 요청

(6)은 퍼블릭 도메인 셀럽일 때만 자동 포함.
(7)은 6단계까지 완료된 셀럽에 대해 실행.

---

## 영문 번역 (i18n)

7단계는 1~6단계에서 생성된 한국어 데이터를 영문으로 번역하는 단계다. 별도 에이전트가 담당하며, 이 파이프라인에서 직접 실행하지 않는다.

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

- 6단계(고유 대사)까지 완료된 셀럽만 대상
- 번역 품질은 인물의 시대·말투·뉘앙스를 반영해야 함
- 상세 계획: `docs/i18n-plan.md` Phase 5~6 참조

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **파일 경로**: 상대 경로만 사용
- **`is_verified`**: 셀럽 계정 생성 시 **항상 false**
