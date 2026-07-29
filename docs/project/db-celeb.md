# DB 스키마 - 셀럽

> **최종 실측 체크: 26.07.29** — 콘텐츠 조사 상태 컬럼·가드 트리거 반영

Supabase 프로젝트 ID: `wouqtpvfctednlffross`

## 셀럽 테이블

- **`profiles`**: 셀럽 기본 프로필. `profile_type = 'CELEB'`
  - `celeb_tier` (text, 기본값 `'full'`): `'full'` / `'light'` / `'relation'` / `'fiction'` — 파이프라인·노출 차이는 `celeb-pipeline.md` 참조
    - **DB CHECK 제약은 없다.** 4종은 코드·운영 규약이며 DB가 값을 강제하지 않는다
    - 실측 분포(2026-07-29): full 1273 / light 515 / fiction 48 / relation 2
    - `relation` = 관계 실존 인물(2026-07 신설). 다른 셀럽·영상(팩션 등)과의 관계 때문에 등록. basic 최소 + 아바타만, 홈·검색·탐색 비노출(연결로만)
    - `fiction` = 신화·전설·허구 속 존재(2026-07 신설, 실존 아님. 일리아스 신·영웅 등). 등록 수준은 relation과 동일, 비노출. 승격 대상 아님
  - `content_research_status` (text, 기본값 `'open'`): `open` / `queued` / `researching` / `deferred` / `confirmed_empty`
    - 실제 `user_contents`가 양수면 그 개수가 우선
    - 실제 0건 + `confirmed_empty`만 화면용 `-1`, 나머지는 열린 `0`
    - `content_research_updated_at`, `content_research_confirmed_empty_at`이 변경·확정 시각을 보존
    - DB 가드가 콘텐츠 보유자의 `confirmed_empty` 변경을 거부하고, 확정 뒤 콘텐츠 추가 시 `open`으로 자동 복귀
  - `speech_tone` (text): 말투 6종. **profiles 테이블에 직접 존재** (celeb_persona 아님)
    - CHECK 제약 있음: `loyal`|`composed`|`bold`|`humble`|`gentle`|`free`
  - `wikidata_qid` (text): Wikidata 엔티티 ID (예: Q762 = 다빈치). 창작 서가 실시간 SPARQL 조회에 사용
  - `slug`: `nickname_en` 기반 generated column (아래 참조)
  - `virtual_monologue` (text): 가상 독백 (2026-07-14 `add_virtual_monologue_column`)
  - `virtual_monologue_en` (text): 가상 독백 영문본 (2026-07-21 `add_virtual_monologue_en_column`). 생성기 `sw/web-bo/scripts/translate-virtual-monologue.ts`
  - `youtube_videos` (jsonb): 셀럽 유튜브 영상 목록 (2026-04-14)
  - 음성 관련: `has_voice`(bool), `voice_id_ko`, `voice_id_en`, `voice_v`(smallint), `voice_speed`(numeric, 기본 1.0)
  - `portrait_url` (text): 잔류 컬럼. Portrait(9:16) 기능은 전면 제거됨
- **`celeb_relations`**: 인물 관계망 (2026-07-22 `add_celeb_relations_table`). 위키데이터 사실 관계 + 수동 보강
  - `rel_type` = **"to_id가 from_id에게 무엇인가"** (father/mother/parent/child/spouse/partner/sibling/relative/teacher/student/influence/influenced/rival). 방향 규약·수집은 `sw/web-bo/scripts/sync-celeb-relations.ts`가 SSoT
  - `rel_group`: family(혈연)/thought(사상)/career(공동 창업)/friendship(지기)/rivalry(라이벌) · `source`: wikidata/manual. 재수집은 wikidata 출처만 갈아끼움(manual 보존)
  - 실측(2026-07-22): 방향 간선 1,972 — thought 1,110 / rivalry 456 / family 148 / friendship 140 / career(P112 조직 매개) 118
  - rivalry·friendship은 위키데이터에 사실상 없어 GPT 제안+전수 훑기(1,692명) → 병렬 검증 → `source='manual'`+`note`(근거 한 줄)로 적재했다. 재수집해도 manual 행은 보존된다
  - UNIQUE(from_id, to_id, rel_type) · 화면은 셀럽 상세 `RelationGraphSection.tsx`
- **`celeb_relations_external`**: 명단 밖 인물 (2026-07-22 `add_celeb_relations_external`). 짝이 셀럽이 아니면 명단 안 간선만으로는 텅 빈다 — 위키데이터 등재 인물을 이름·사진만 받아 이동 불가 노드로 띄운다
  - 실측: family 7,435 / rivalry 214 / friendship 158 행 · UNIQUE(from_id, qid, rel_type)
  - 가족은 위키데이터 속성 수집, 라이벌·지기는 전수 훑기 결과를 이름→QID 대조(wbsearchentities)로 적재. **접두 검색이라 수식어 넣으면 오배정된다** — 곤충 속(屬)·동명이인 사고로 라이벌 23건·지기 23건을 사후 교정했다(설명·생몰 검증 필수)
  - 실측 커버리지(내부+외부 합산): 관계 보유 셀럽 1,303/1,692(77%)
- **`celeb_influence`**: 영향력 6축(political/strategic/tech/social/economic/cultural) + transhistoricity
  - 각 6축 CHECK 0~10, transhistoricity CHECK 0~40, total_score CHECK 0~100
  - **total_score는 트리거 `trg_calc_influence_total`이 자동 계산**한다 (7개 값의 단순 합). 직접 써도 덮어써진다
  - 축별 설명 컬럼: `{축}_exp`, `{축}_exp_en`
  - UNIQUE(celeb_id)
- **`celeb_persona`**: 인물 페르소나 수치. **3개 카테고리를 반드시 구분할 것** (단일원천: `sw/web/src/lib/persona/constants.ts`)
  - **덕목 8개** (VirtueKey, 0~100): temperance, diligence, reflection, courage, loyalty, benevolence, fairness, humility
  - **능력 4개** (AbilityKey, 0~100): command, martial, intellect, charm
  - **성향 4개** (TendencyKey, -50~+50): pessimism_optimism, conservative_progressive, individual_social, cautious_bold
  - ⚠️ 위 수치 범위에 **DB CHECK 제약은 없다.** 코드 규약이다 (실측 데이터는 범위 내)
  - ⚠️ 덕목(품성)과 능력(역량)은 별개. 혼용 금지
  - UNIQUE(celeb_id)
- **`celeb_dialogues`**: 인물별 고유 대사. celeb_id(PK, profiles FK), lines(jsonb), lines_en(jsonb)
  - **dialogueLines**: DB 개인화 대사 (celeb_dialogues 테이블, 인물별 고유)
  - **defaultLines**: 톤별 범용 대사 (코드 하드코딩, speech_tone 6종 기반)
- **`celeb_timeline_events`**: 인물 생애 행적 (2026-07-26 `add_celeb_timeline_events`). 규격·조사 절차는 `docs/project/celeb-journey.md`가 SSoT
  - 사건 하나가 한 행. `year`는 정수이며 **기원전은 음수**(실측 최소 -551)
  - `lat`/`lng`는 **둘 다 있거나 둘 다 없거나**(CHECK). 좌표 있는 행만 활동 반경 지도에 오른다 — **활동 반경용 테이블은 없다**
  - `place_qid`(장소 위키데이터 식별자)는 좌표 재검증의 근거다. 비우지 마라
  - `source` CHECK: research·wikidata·manual. 재적재는 `research` 행만 갈아끼우고 `manual`은 보존
  - 실측(2026-07-26): 73명 1,231건, 좌표 1,215건, 장소 596곳. RLS 공개 읽기만
- **`celeb_tags`** / **`celeb_tag_assignments`**: 세력도감 태그 → `celeb-tag-system.md` 참조
- **`celeb_task_queue`**: 작업 큐 → `celeb-pipeline.md` 참조
  - PK(task_type, celeb_id). status CHECK: pending|in_progress|completed|failed|skipped
  - 리스 방식: claimed_by / claimed_at / lease_expires_at / attempt_count / last_error
- **`celeb_dialogues_bak_20260714`**: 2026-07-14 대사 교정(`fix_dialogue_object_lines_to_string`) 백업 테이블(18행). **RLS 비활성**
- **`celeb_works`**: ~~삭제됨 (2026-03-11)~~. 실시간 Wikidata 조회로 대체
- **퍼블릭 도메인 셀럽**: 1920년 이전 사망자. `isPublicDomainCeleb()` 함수로 필터링

### celeb_persona — persona jsonb가 원본

- `persona` (jsonb, NOT NULL)가 실질 원본이다. 최상위 키: `abilities`, `inner_virtues`, `outer_virtues`, `dispositions`, `rationale_ko`, `rationale_en`
- 각 항목은 `{ score, reason_ko, reason_en }` 형태
- **`rationale`이라는 text 컬럼은 없다.** 근거는 `persona->>'rationale_ko'` / `persona->>'rationale_en'`에 있다
- 평면 컬럼(temperance, command, cautious_bold 등 16개)은 정렬·조회용 사본이며, 트리거 `trg_sync_persona_columns`가 INSERT/UPDATE 시 persona jsonb에서 자동 동기한다. **평면 컬럼만 UPDATE하면 persona가 갱신되지 않아 다음 동기에서 되돌아간다 → persona jsonb에 쓸 것**

### celeb_dialogues — lines 구조

- `lines` (jsonb, NOT NULL): 7상황 × 3변형 = 21개. 각 상황 키의 값은 **문자열 3개 배열**
  - 7상황: `greeting`, `roll_call`, `deploy`, `clash_attack`, `battle_win`, `battle_lose`, `battle_draw`
  - 추가 키 `quote` (문자열, 배열 아님): 명언 SSoT
- `lines_en` (jsonb, nullable): 영문 대사. 실측 1520/1577행 보유
- 실측(2026-07-16): 전체 1577행, `quote` 키 보유 904행

### quote SSoT — celeb_dialogues

- **SSoT**: `celeb_dialogues.lines.quote` / `celeb_dialogues.lines_en.quote`
- ⚠️ **`profiles.quotes` / `profiles.quotes_en` 컬럼은 존재하지 않는다** (2026-03-23 `drop_profiles_quotes_and_recreate_compat_view`로 DROP). "하위호환 잔류"라는 과거 서술은 사실이 아니다. `profiles_compat` 뷰에도 quotes는 없다
- **읽기·쓰기 모두 celeb_dialogues 단독.** profiles로의 동기화 대상은 없다
- **화면 라벨은 "한마디"다**(2026-07-26 변경, `celebPage.dialogue_quote`). 영문은 `Quote` 유지. 독서 기록 기능의 "명언"(`reading.quote.*`)은 별개이므로 함께 바꾸지 않는다
- **검색 노출 설명문의 첫머리로 쓰인다**(`sw/web/src/lib/celeb/meta.ts`). 화면뿐 아니라 검색 결과에 그대로 실리는 자리라 오염이 곧 대외 노출이다
- ⚠️ **길이 상한은 언어별로 다르게 두어야 한다.** 같은 말이라도 영어로 옮기면 글자 수가 두 배 남짓 늘어난다(실측: 한국어 최대 90자 / 영어 최대 221자·평균 73자). 처음에 한쪽 기준(90자)만 걸었더니 **영어 화면에서 367명의 한마디가 조용히 탈락**해 소개문으로 되돌아갔다. 현재는 `QUOTE_MAX = { ko: 90, en: 170 }`이며, 설명문은 한마디를 먼저 싣고 자리가 남을 때만 뒤 안내를 붙인다(`composeDescription`)

#### 갱신은 `set_celeb_quote` RPC로만 (2026-07-26 신설)

🔴 **`lines` 를 통째로 덮는 방식은 금지다.** 2026-06-02 에 `lines = EXCLUDED.lines` 일괄 작업이 579행의 `quote` 키를 소멸시켜 544명분이 유실됐고 PITR 기간(28일)이 지나 복구가 불가능했다. `set_celeb_quote(p_celeb_id, p_quote_ko, p_quote_en)` 는 `jsonb_set` 으로 `quote` 키 하나만 건드리고, 대사 행이 없는 인물(fiction 등)에는 INSERT 한다. anon·authenticated 권한은 회수해 뒀다(서버 전용).

#### 2026-07-26 일괄 조사 — 201명 중 181명 확보

빈 자리가 201명이었다(full 107 · light 41 · fiction 48 · relation 5). GPT(codex, 종량 비용 없음)에 배치로 조사시키고 **채택 판정은 발주자가 쥐는** 방식으로 채웠다.

| 구분 | 대상 | 확보 | 실패 |
|------|------|------|------|
| 실존 인물 | 153 | 138 (90%) | 15 |
| 허구·신화 인물 | 48 | 43 | 5 |

결과: 활성 셀럽 1,526명 중 **한마디 보유 1,506명(98.7%)**.

**한·영 한쪽만 있는 경우는 0이다.** 조사에서 비영어권 인물 87명은 영문이 붙지 않아(원어→한국어만 확보) 뒤이어 영어 문장을 채웠다. 원어 원문(한문·일본어·러시아어·그리스어·산스크리트 등)을 기준으로 옮기고, 노벨 강연·고전 인용처럼 공식 영역이 있는 것은 그에 맞췄다. 최종 실측 — 양쪽 보유 1,506 / 국문만 0 / 영문만 0.
> 한마디를 채울 때는 **양방향을 함께 본다.** 한쪽만 채우면 다른 언어 화면에서 그 자리가 빈다.

**조사 규칙**(재실행 시 그대로 쓸 것): ① 실제 발언 원문만, 창작·의역 금지 ② 원어로 검색(일본어·한국어·프랑스어…) ③ 명언 모음 사이트(brainyquote·azquotes 류) 단독 근거 채택 금지 ④ 못 찾으면 비운다 ⑤ 동명이인 대조 ⑥ 허구 인물은 원전 권·행 특정, 후대 각색 배제.

**반영 전 위생 검사**(스크립트): 길이 8~90자 · 줄바꿈 없음 · 신뢰도 low 제외 · 출처 주소 필수 · 명언 모음 사이트 도메인 차단 · **소개문과 6글자 토막이 절반 넘게 겹치면 보류**(소개문을 1인칭으로 바꾼 위조가 과거 최다 유형이었다). 이번 201건에서 위생 위반은 0건, 보류 20건은 전부 조사 실패였다.

**확보 출처 분포**: perseus.tufts.edu 28 · theoi.com 14 · theguardian.com 10 · nobelprize.org 7 · 연합뉴스 4 · 국사편찬위 사료DB 3 · 조선왕조실록 2 · greek-language.gr 3 등. 명언 모음 사이트 0건. 출처 기록은 세션 임시 폴더의 `applied-quotes.json`에 남겼으나 보존되지 않으므로, 추적이 필요하면 재조사해야 한다.

**표본 원문 대조 완료**: 황희 = 실록 「臣竊聞義者, 利之和也, 而自無不利」(세종 28년 1446-02-08) · 김부식 = 진삼국사기표 「終無可觀之物, 則徒自愧耳」. 리들리 스콧(AP)은 사이트 접근이 막혀 **미확인**.

#### 자리 표시 값 — 빈 칸을 두지 않는다 (2026-07-26)

확인된 발언이 없는 20명에게는 **값으로 `[확인된 어록이 없습니다]` / `[No verified quote]` 를 넣어 두었다.** 빈 칸으로 두면 화면에서 아무 설명 없이 비어 보이므로, 없다는 사실을 명시한다.

⚠️ **대괄호로 통째 감싼 값은 실제 발언이 아니다.** `meta.ts` 의 `sanitizeQuote` 가 `/^\[.*\]$/` 를 배제하므로 **검색 결과 설명문에는 실리지 않고 소개문으로 넘어간다.** 화면에는 그대로 뜬다. 앞으로 자리 표시 문구를 새로 만들 때도 이 형태(대괄호 감싸기)를 지켜야 검색 노출에서 자동으로 걸러진다.

집계할 때 주의 — `quote` 키 보유 수는 이제 1,526명(전원)이지만 **실제 어록은 1,506명**이다. `ko not like '[%]'` 로 걸러야 실수가 나온다.

**여전히 빈 20명** — 채우려 하지 마라. 사유가 확인된 결과다. 저작 소실(에라토스테네스·히파티아·프톨레마이오스 1세·베르메르·조토·구텐베르크·엘 시드), 3인칭 헌정문뿐(마르쿠스 아그리파 — 판테온 명문은 발언이 아니고 카시우스 디오 연설은 2세기 뒤 재구성), 화자 훼손(네페르티티), 원본 소실(메흐메트 2세), 그리고 **허구 인물 중 원전에서 말을 하지 않는 5명**(아르고스는 개라서 꼬리로만 반응, 스킬라·카리브디스는 소리·현상 묘사뿐, 로토스파고스족·라이스트뤼고네스족은 직접화법 없음).

### full 티어 강제 트리거

`trg_celeb_full_requires_content` (BEFORE INSERT OR UPDATE ON profiles, 2026-06-22 `enforce_celeb_full_requires_content`)

- 조건: `profile_type='CELEB'` **AND** `celeb_tier='full'` **AND** (INSERT 이거나, 기존 티어가 full이 아니었거나, 기존 profile_type이 CELEB이 아니었을 때)
- 위 조건에서 해당 셀럽의 `user_contents` 행이 **0건이면 예외를 던진다** (ERRCODE `check_violation`)
- 즉 **full 티어는 콘텐츠 1건 이상 필수**. full이 필요하면 콘텐츠 수집을 먼저 하고, 아니면 light로 등록한다
- 이미 full인 행을 다른 컬럼만 UPDATE할 때는 검사하지 않는다(전이 시점에만 발동)

### celeb_tags / celeb_tag_assignments 컬럼

- **`celeb_tags`**: id, `name`(UNIQUE), name_en, description, description_en, `slug`, color(기본 `#7c4dff`), sort_order, is_featured(bool), start_date, end_date, `team_images`(jsonb NOT NULL 기본 `[]`), `parent_id`
  - **`parent_id`**(uuid, 자기참조 FK → `celeb_tags.id`, `on delete set null`, 인덱스 `idx_celeb_tags_parent_id`) — 상위 그룹 계층. null이면 무소속. **자식을 가진 태그가 곧 그룹 헤더다**(별도 플래그 없음). 26.07.26 마이그레이션 `add_celeb_tags_parent_id`로 코드 상수(`constants/factionGroups.ts`, 삭제됨)에서 승격했다. 위계는 두 단계까지
- **`celeb_tag_assignments`**: id, celeb_id, tag_id, assigned_at, short_desc, short_desc_en, long_desc, long_desc_en, sort_order, `spotlight_image_url`(물리 명칭은 옛 이름 유지)
  - UNIQUE(celeb_id, tag_id)

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
- 표현식: `nickname_en`이 NULL이면 NULL, 아니면 `lower(replace(trim(translate(nickname_en, <diacritics>, <ascii>)), ' ', '-')) || COALESCE('-' || slug_suffix, '')`
- `nickname_en`이 NULL이면 slug도 NULL → **셀럽 생성 시 `nickname_en` 필수**
- **강세부호(diacritics)는 ASCII로 자동 변환된다** (`José`→`jose`, `André`→`andre`, `Müller`→`muller`, `Shōwa`→`showa` 등). URL에 비ASCII가 새어나가 페이지가 404 나던 문제를 원천 차단(2026-07-14 마이그레이션 `slug_strip_diacritics`).
  - 변환은 `translate()` 문자 대치 방식(생성 컬럼이 요구하는 IMMUTABLE 보장). 실제 대치 대역: `ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøŌōÙÚÛÜùúûüÝýŸÿĆćČčŠšŽžŘř`. 점(`.`)·어퍼스트로피(`'`)는 URL에서 정상 동작하므로 보존한다(`dr.-dre`, `shaquille-o'neal`).
  - 위 대역에 없는 희귀 문자(예: `ß`, `æ`)가 새 인물에서 나오면 slug에 그대로 남아 404가 재발할 수 있다. 그때 `translate` 대치쌍을 추가한다.
- `slug_suffix` (text): 동명이인 구분용 접미사

---

## 셀럽 RPC

| 함수 | 인자 | 비고 |
|------|------|------|
| `get_celebs_sorted` | p_profession, p_nationality, p_content_type, p_sort_by, p_search, p_limit, p_offset, p_tag_id, p_min_content_count, p_gender, p_include_inactive, p_celeb_tier | 셀럽 목록 단일 진입점 |
| `get_tracker_candidates` | exclude_ids text[] | 아래 참조 |
| `get_tag_celeb_counts` | — | 태그별 인물 수 |
| `get_persona_extremes` | p_runners_up_limit | |
| `get_top_celebs_across_eras` | p_limit | |
| `get_shared_contents_by_celebs` | p_celeb_ids uuid[], p_content_type, p_limit | |
| `get_chosen_scriptures` / `get_scriptures_by_era` | p_category, p_limit, p_offset (+p_era) | |
| `get_review_celeb_ids` | — | |
| `get_celeb_content_counts` / `get_content_celeb_user_counts` | p_content_ids text[] | |
| `get_seed_eligible_celebs` | — | |
| `increment_celeb_view` | p_celeb_id uuid, p_increment boolean=true | 조회 1회 반영 후 **갱신된 누적 조회수를 반환**. `p_increment=false`면 세지 않고 값만 준다(같은 브라우저 24시간 내 재방문). 아래 참조 |
| `get_trending_celebs` | p_days integer=30, p_limit integer=12 | 최근 N일 조회 기준 인기 순위(id·조회수만). 누적으로 뽑으면 순위가 고정되므로 기간 창을 쓴다 |
| `get_celebs_trending` | p_days integer=30, p_limit integer=12 | 위와 같은 순위를 **`get_celebs_sorted`와 동일한 반환 형태**로 준다. `getCelebs({ sortBy: 'trending' })`가 이걸 호출해 기존 카드 조립(태그·대사·음성·영향력 결합)을 그대로 재사용한다. ⚠️ 목록 단일 진입점인 `get_celebs_sorted`에 정렬 옵션을 더하지 않고 별도 함수로 뺐다 — 그 함수가 깨지면 셀럽 목록 전반이 함께 깨진다 |

### 인물 조회수 (2026-07-26 신설)

| 저장소 | 용도 |
|--------|------|
| `profiles.view_count` (integer, default 0) | **누적** 조회수. 인물 상세 화면에 표시한다. `increment_celeb_view`로만 증가 |
| `celeb_views_daily` (celeb_id, view_date, views / PK 복합) | **일별** 집계. 최근 N일 인기 순위 산출용. RLS 활성·정책 없음 — 위 두 함수(security definer)로만 접근한다 |

**설계 이유 두 가지.**
1. **누적과 기간 창을 분리했다.** 누적만 있으면 앞에 세우는 순위가 영원히 고정된다(실측: 젠슨 황 누적 1위·30일 2위, 리처드 파인만 누적 18회인데 30일 17회로 최근 급등). 상세 화면은 누적, 목록·추천은 최근 30일을 쓴다.
2. **반환값으로 화면을 갱신한다.** 인물 화면은 `unstable_cache`(최대 7일)를 타므로 서버가 준 `view_count`는 낡아 있다. 함수가 갱신값을 돌려주므로 조회수를 따로 물어보는 요청이 없다.

**초기값은 GA4 90일 실적으로 시딩했다**(2026-07-26, 552명·일별 797행·누적 합계 2,809). 0부터 시작하면 순위가 한 달간 무의미하다. ⚠️ **시딩값은 GA 집계라 우리 중복 기준(브라우저당 24시간 1회)과 다르다** — 정확한 동일 기준 수치가 아니라 순위 출발점이다. 매칭 실패 1건(`joe-tsai`, 현재 DB에 없는 옛 주소)은 제외했다.

중복 방지는 `sw/web/src/lib/celeb/viewDedup.ts`(브라우저 저장소 24시간). 저장소를 못 쓰는 환경은 세지 않으므로 크롤러가 자연히 걸러진다. 남용(반복 호출로 부풀리기)은 막지 않는다 — 게시판 조회수도 동일하며 현재 규모에서 방어 이득이 없다.

### get_tracker_candidates (2026-07-15 교정)

마이그레이션 `fix_get_tracker_candidates`로 재정의됨. 현재 조건은 다음과 같다.

- 반환: id(text), slug, nickname, nickname_en, profession, avatar_url, nationality, birth_date, death_date
- 필터
  - `profile_type='CELEB'` AND `status='active'`
  - `cultural_journey`가 NULL도 빈 문자열도 아님
  - `death_date`가 NULL도 빈 문자열도 아님
  - **퍼블릭 도메인**: `death_date`가 `-`로 시작(BC)하거나, 앞 4자리가 숫자이고 1920 이하
  - `celeb_persona` 행 존재
  - `review`가 채워진 `user_contents`가 **4건 이상**
  - `id::text != ALL(exclude_ids)`

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
