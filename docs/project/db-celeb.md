# DB 스키마 - 셀럽

Supabase 프로젝트 ID: `wouqtpvfctednlffross`

## 셀럽 테이블

- **`profiles`**: 셀럽 기본 프로필. `profile_type = 'CELEB'`
  - `celeb_tier`: `'full'` / `'light'` / `'relation'` / `'fiction'` — 파이프라인·노출 차이는 `celeb-pipeline.md` 참조
    - `relation` = 관계 실존 인물(2026-07 신설). 다른 셀럽·영상(팩션 등)과의 관계 때문에 등록. basic 최소 + 아바타만, 홈·검색·탐색 비노출(연결로만)
    - `fiction` = 신화·전설·허구 속 존재(2026-07 신설, 실존 아님. 일리아스 신·영웅 등). 등록 수준은 relation과 동일, 비노출. 승격 대상 아님
  - `speech_tone` (text): 말투 6종 (loyal/composed/bold/humble/gentle/free). **profiles 테이블에 직접 존재** (celeb_persona 아님)
  - `wikidata_qid` (text): Wikidata 엔티티 ID (예: Q762 = 다빈치). 창작 서가 실시간 SPARQL 조회에 사용
  - `slug`: `nickname_en` 기반 generated column (아래 참조)
- **`celeb_influence`**: 영향력 6축(political/strategic/tech/social/economic/cultural, 각 0~10) + transhistoricity(0~40) = total_score(0~100)
- **`celeb_persona`**: 인물 페르소나 수치. **3개 카테고리를 반드시 구분할 것** (단일원천: `sw/web/src/lib/persona/constants.ts`)
  - **덕목 8개** (VirtueKey, 0~100): temperance, diligence, reflection, courage, loyalty, benevolence, fairness, humility
  - **능력 4개** (AbilityKey, 0~100): command, martial, intellect, charm
  - **성향 4개** (TendencyKey, -50~+50): pessimism_optimism, conservative_progressive, individual_social, cautious_bold
  - **rationale** (text): 페르소나 수치에 대한 역사적/비평적 근거
  - **i18n**: persona jsonb 내 `reason_ko`/`reason_en`, `rationale_ko`/`rationale_en`
  - ⚠️ 덕목(품성)과 능력(역량)은 별개. 혼용 금지
- **`celeb_dialogues`**: 인물별 고유 대사. celeb_id(PK, profiles FK), lines(JSONB: 7상황×3변형=21개)
  - **dialogueLines**: DB 개인화 대사 (celeb_dialogues 테이블, 인물별 고유)
  - **defaultLines**: 톤별 범용 대사 (코드 하드코딩, speech_tone 6종 기반)
- **`celeb_tags`** / **`celeb_tag_assignments`**: 스포트라이트 태그 → `celeb-tag-system.md` 참조
- **`celeb_task_queue`**: 작업 큐 → `celeb-pipeline.md` 참조
- **`celeb_works`**: ~~삭제됨 (2026-03-11)~~. 실시간 Wikidata 조회로 대체
- **퍼블릭 도메인 셀럽**: 1920년 이전 사망자. `isPublicDomainCeleb()` 함수로 필터링

### quote SSoT — celeb_dialogues

- **SSoT**: `celeb_dialogues.lines.quote` / `celeb_dialogues.lines_en.quote`
- `profiles.quotes/quotes_en`은 하위호환용 잔류 (일반 유저 프로필에서도 사용)
- **읽기**: 모든 셀럽 서버 액션이 celeb_dialogues에서 quote 추출
- **쓰기**: celeb_dialogues 우선 업데이트 + profiles 동기

---

## 셀럽 이미지 규격

R2 `celebs/{id}/` 경로. `web-bo`의 `lib/image.ts`에서 리사이즈.

| 파일명 | 크기 | 비율 | 용도 |
|--------|------|------|------|
| `avatar.webp` | 800×800 | 1:1 | 원형 아바타, 카드 썸네일, 모든 이미지 표시 (레티나 3x 대응) |

> 2026-03-24 이전 등록 셀럽은 300×300. 신규 업로드분만 800×800.

Portrait(9:16)은 전면 제거됨. DB 컬럼(`portrait_url`)만 잔류.

---

## profiles.slug

`slug`는 `nickname_en` 기반 **generated column** (직접 UPDATE 불가).
- 표현식: `lower(replace(trim(translate(nickname_en, <diacritics>, <ascii>)), ' ', '-')) || COALESCE('-' || slug_suffix, '')`
- `nickname_en`이 NULL이면 slug도 NULL → **셀럽 생성 시 `nickname_en` 필수**
- **강세부호(diacritics)는 ASCII로 자동 변환된다** (`José`→`jose`, `André`→`andre`, `Müller`→`muller`, `Shōwa`→`showa` 등). URL에 비ASCII가 새어나가 페이지가 404 나던 문제를 원천 차단(2026-07-14 마이그레이션 `slug_strip_diacritics`).
  - 변환은 `translate()` 문자 대치 방식(생성 컬럼이 요구하는 IMMUTABLE 보장). 라틴 확장 강세부호를 커버. 점(`.`)·어퍼스트로피(`'`)는 URL에서 정상 동작하므로 보존한다(`dr.-dre`, `shaquille-o'neal`).
  - 매핑 테이블에 없는 희귀 문자(예: `ß`, `æ`)가 새 인물에서 나오면 slug에 그대로 남아 404가 재발할 수 있다. 그때 `translate` 대치쌍을 추가한다.

---

## Wikidata QID 관리 프로세스

셀럽의 창작 서가는 `profiles.wikidata_qid`를 기반으로 실시간 Wikidata SPARQL 조회한다.

### QID 배정 규칙

1. **자동 배정 스크립트**: `sw/web/scripts/bulk-qid.mjs` — `wbsearchentities` API로 영문명 매칭
2. **1차 검증 (필수)**: `sw/web/scripts/verify-qid.mjs` — P31=Q5(인간) 확인
3. **2차 검증 (필수)**: `sw/web/scripts/verify-qid-birth.mjs` — DB birth_date와 Wikidata P569 생년 대조 (±3년 허용)
4. **수동 확인**: 2차 검증 미해결 건은 수동 QID 조회. 특히:
   - **BC 인물**: Wikidata 연도 절삭(-384 → -38)으로 거짓 양성 다수. QID 자체는 정상
   - **듀오/그룹**: Coen Brothers, Daft Punk 등 P31≠Q5. description 확인 필요
   - **동명이인**: Francis Bacon(철학자 vs 화가) 등. 생년 대조 필수
   - **Wikidata 미등재**: 일부 인물은 항목 자체가 없음

### 신규 셀럽 등록 시 QID 배정 절차

1. 영문명으로 Wikidata 검색 (`wbsearchentities`)
2. 후보 중 description에 인물 설명이 있는 항목 선택 (crater, asteroid 등 제외)
3. 생년 대조 확인 (DB birth_date vs Wikidata P569)
4. `profiles.wikidata_qid`에 저장

### 실시간 조회 아키텍처

- API: `/api/celeb-works?qid=Qxxx` — 2단계 SPARQL (목록→상세)
- 캐시: 24시간 인메모리 캐시
- UI: `CreativeLibrary.tsx` — 클라이언트 필터링/페이징
- 이미지 커버리지: 미술 85%, 클래식 24%, 영화 13%, 대중음악 4%
