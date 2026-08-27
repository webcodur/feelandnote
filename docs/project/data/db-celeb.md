# DB 스키마 - 셀럽

> **최종 실측 체크: 26.08.10** — `celebs` 원본, 셀럽 전용 외래키,
> `celeb_contents`·`celeb_metrics`, 현역 RPC·트리거를 운영 DB와 대조했다. 옛
> `profiles`·`user_contents`와 호환 구조는 26.08.10 운영 DB에서 최종 제거됐다.

운영 위치와 접속 경로는 [`external-services.md`](../platform/external-services.md)의 `Supabase self-hosted` 절이 쥔다.

## 셀럽 테이블

- **`celebs`**: 로그인 계정과 독립된 셀럽 기본 프로필. 저장형 `profile_type`이 없다
  - `celeb_tier` (text, 기본값 `'full'`): `'full'` / `'light'` / `'fiction'` — **DB에 CHECK 제약이 없어 허용값·노출 게이트의 원천은 코드다**(`packages/shared/src/constants/celeb-tiers.ts`). 파이프라인·노출 차이 설명은 `celeb-pipeline.md`
    - **DB CHECK 제약은 없다.** 3종은 코드·운영 규약이며 DB가 값을 강제하지 않는다
    - 실측 분포(2026-08-04): 전체 full 1,461 / light 954 / fiction 255, 그중 active full 1,362 / light 118 / fiction 252
    - 정상적인 실존 인물은 등록 목적과 무관하게 최소 `light`로 둔다
    - `fiction` = 신화·전설·허구 속 존재(2026-07 신설, 실존 아님. 일리아스 신·영웅 등). 상단 인물 검색과 대표 원전 연결로 노출하며 승격 대상은 아님
  - `content_research_confirmed_empty_at` (timestamptz, nullable): 네 유형을 조사했지만 유효한 콘텐츠가 0건임을 확정한 시각
    - 표시값 규약과 조사 대상 범위의 SSoT는 코드다 — `packages/shared/src/constants/celeb-content-research.ts`. 여기 다시 적지 않는다
    - 요약만: 실제 개수가 양수면 그 값, 0건이면 확정 시각이 있을 때 `-1`, 아니면 `0`. **노출 상태는 개입하지 않는다**
    - DB 가드가 콘텐츠 보유자의 확정 시각 기록을 거부한다. 확정 뒤 콘텐츠가 추가되면 트리거가 확정 시각을 비운다
    - 조사 진행 상태는 오케스트레이터가 관리하며 DB에 저장하지 않는다
  - `publication_status` (text, 기본값 `'active'`): CHECK `active`|`inactive`|`deleted`. **인물에게는 노출 상태 하나만 뜻한다.**
    - 26.08.07 이전 `profiles.status`는 「계정 제재」와 「인물 공개」 두 뜻으로 겹쳐 읽혔다. 가짜 Auth 계정을 폐기하고 `celebs.publication_status`로 옮겨 의미를 물리적으로 분리했다
    - 공개 전 인물은 모두 `inactive`다. 서비스에 필요 없는 인물은 상태로 묶어두지 않고 행을 지운다(26.08.14 `suspended` 폐지, 224명을 `inactive`로 이관)
    - 실측 분포(26.08.14): active 1,858 / inactive 1,110
    - **목록 노출은 이 값 하나가 아니라 `celeb_tier` 필터도 함께 가른다.** `publication_status`는 공개 여부만 뜻하며 조사 여부·관계·태그 배정 같은 독립 사실을 대신하지 않는다. “내일 active로 바꾸면 해당 값이 저절로 맞아지는가?”가 아니라면 이 열을 조건에 넣지 않는다. 26.07.26 관계망, 26.07.27 세력도감 태그, 26.08.07 콘텐츠 조사에서 같은 혼용 사고를 교정했다
    - **계정 전용 열은 `celebs`에 없다.** 회원 계정 상태는 `user_accounts.account_status`이며 셀럽 공개 상태와 다른 축이다. 관리자 판정은 `is_admin()` 하나가 쥔다
  - `updated_at` (timestamptz, nullable): 프로필 내용이 실제로 변경된 시각. 2026-08-09 도입 이전 행은 다음 변경 전까지 null이다. 조회수와 마지막 접속 시각만 바뀐 경우에는 갱신하지 않는다
  - `birth_date` / `death_date`는 BC 표기(`-384`)를 담기 위한 **text**다
  - `claimed_by_member_id`는 인수 회원의 `user_accounts.id`를 참조한다. 셀럽 자신의 로그인
    계정이 아니다
  - `cultural_journey` / `cultural_journey_en`이 정식 저장 열이다. `consumption_philosophy*`는 레거시 호환 열이므로 직접 쓰지 않는다
  - `speech_tone` (text): 말투 6종. **`celebs` 테이블에 직접 존재** (celeb_persona 아님)
    - CHECK 제약 있음: `loyal`|`composed`|`bold`|`humble`|`gentle`|`free`
  - `wikidata_qid` (text): Wikidata 엔티티 ID (예: Q762 = 다빈치). 창작 서가 실시간 SPARQL 조회와 상세 소개의 공식 채널·인물 자료 연결에 사용
  - `slug`: `nickname_en` 기반 generated column (아래 참조)
  - `youtube_videos` (jsonb): 셀럽 유튜브 영상 목록 (2026-04-14)
  - 음성 관련: `has_voice`(bool), `voice_id_ko`, `voice_id_en`, `voice_v`(smallint), `voice_speed`(numeric, 기본 1.0)
  - `portrait_url` (text): 인물 상세 PC 상단 대표사진 URL. 옛 Portrait 기능의 잔류 컬럼을 재사용한다. 옛 값은 **2026-07-31 전량 비움(817건 → 0)** — 815건이 가리키던 Supabase Storage `avatars` 버킷에 실제 portrait 파일은 0개였다. 같은 날 정사각 대표사진으로 재도입했고, 2026-08-05부터 공용 규격 상수에 따라 세로로 표시·편집한다
- **`celeb_contents`**: 셀럽 감상경위. `celeb_id → celebs.id`, `content_id → contents.id`,
  UNIQUE(`celeb_id`, `content_id`). 출처 가드·0건 확정 해제·파생 개수는 이 테이블 기준이다
- **`celeb_metrics`**: 셀럽별 `follower_count`·`content_count` 캐시. `celeb_id`가 PK이자
  `celebs.id` FK다
- **공개 RLS 경계**: `celebs`·`celeb_contents`·`celeb_metrics`는 일반적으로
  `publication_status='active'`만 공개한다. 다만 `faction_atlas_members`에서 `hidden=false`로
  명시 출간된 인물은 비활성이어도 세력도감 표면에 필요한 세 테이블 행을 읽을 수 있다.
  일반 셀럽 목록 RPC는 별도로 공개 상태를 필터링한다
- **`celeb_explanations`**: 인물당 한 행으로 `인물 안내`와 `인물 탐구`를 보관한다. 열 이름은 역사적으로 `profile_id`지만 FK 부모는 `celebs.id`이며 PK라 1:1이다
  - `plain_text`는 처음 보는 독자를 위한 인물 안내, `interpretive_title`·`interpretive_text`는 그 사실을 반복하지 않고 선택과 긴장을 읽는 인물 탐구다. 영문 필드는 각각 `_en`
  - `review_status`는 `null`(미검수) / `ai_reviewed` / `human_reviewed` 셋이다. CHECK 제약에는 두 문자열만 두고 미검수는 실제 SQL `NULL`로 표현한다
  - `published_at`은 게시 여부와 시각의 SSoT다. `null`이면 미게시다. RLS는 게시된 행만 공개하고 작성·수정은 `service_role`에만 허용한다
  - 작성·검토·배치 규칙은 `docs/project/celeb/person-reading.md`, 최초 스키마는 `20260803181502_create_celeb_explanations.sql`, 현행 검수 상태는 `20260804060931_replace_celeb_explanation_sources_with_review_status.sql` 참조
  - `celeb_explanation_sources`는 2026-08-04 폐기했다. 사실 조사는 계속 수행하지만 URL은 집필 캐시에만 임시 보관하고 서비스 DB에는 적재하지 않는다
- **`celeb_relations`**: 인물 관계망 (2026-07-22 `add_celeb_relations_table`). 위키데이터 사실 관계 + 수동 보강
  - `rel_type` = **"to_id가 from_id에게 무엇인가"** (father/mother/parent/child/spouse/partner/sibling/relative/teacher/student/influence/influenced/rival). 방향 규약·수집은 `sw/web-bo/scripts/celeb/relations.ts`가 SSoT
  - `rel_group`: family(혈연)/thought(사상)/career(공동 창업)/friendship(지기)/rivalry(라이벌) · `source`: wikidata/manual. 재수집은 wikidata 출처만 갈아끼움(manual 보존)
  - `publication_status`가 비공개인 내부 상대도 관계 사실에서는 제외하지 않는다. 화면은 이름 노드로 표시하고 이동만 막는다(`slug=null`); 위키데이터 링크는 `celebs.wikidata_qid`를 쓴다
  - 근거 설명은 `note`(한국어)와 `note_en`(영문)을 짝으로 쓴다. `label_ko`·`label_en`은 소비처가 없는 레거시 열이므로 새 값을 넣지 않는다
  - 혈연은 세대·형제 수 자체가 정보이므로 인원 상한을 적용하지 않는다. 화면의 접이식 상한은 사회 관계에만 적용한다
  - `celeb/relations.ts` 재실행은 `source='wikidata'` 행을 교체한다. 수동 보강은 반드시 `source='manual'`로 저장한다
  - 실측(2026-07-22): 방향 간선 1,972 — thought 1,110 / rivalry 456 / family 148 / friendship 140 / career(P112 조직 매개) 118
  - rivalry·friendship은 위키데이터에 사실상 없어 GPT 제안+전수 훑기(1,692명) → 병렬 검증 → `source='manual'`+`note`(근거 한 줄)로 적재했다. 재수집해도 manual 행은 보존된다
  - UNIQUE(from_id, to_id, rel_type) · 화면은 셀럽 상세 `RelationGraphSection.tsx`
- **`celeb_relations_external`**: 명단 밖 인물 (2026-07-22 `add_celeb_relations_external`). 짝이 셀럽이 아니면 명단 안 간선만으로는 텅 빈다 — 위키데이터 등재 인물을 이름·사진만 받아 이동 불가 노드로 띄운다. **본짝이 명단 밖이라고 다른 셀럽을 그 칸에 넣지 않는다.** 맞수·지기는 이 테이블, 스승·영향·창업은 비운다.
  - 실측: family 7,435 / rivalry 214 / friendship 158 행 · UNIQUE(from_id, qid, rel_type)
  - 가족은 위키데이터 속성 수집, 라이벌·지기는 전수 훑기 결과를 이름→QID 대조(wbsearchentities)로 적재. **접두 검색이라 수식어 넣으면 오배정된다** — 곤충 속(屬)·동명이인 사고로 라이벌 23건·지기 23건을 사후 교정했다(설명·생몰 검증 필수)
  - 실측 커버리지(내부+외부 합산): 관계 보유 셀럽 1,303/1,692(77%)
- **`fiction_source_contents`**: 기존 `contents` 중 신화·전설·허구 작품을 대표할 행을 관리자가 지정한다
  - PK/FK `content_id → contents.id`, 삭제 RESTRICT. 작품·판본 테이블을 새로 복제하지 않고 기존 콘텐츠를 정본 링크로 재사용한다
  - 공개 SELECT만 허용하고 쓰기는 service role 전용이다
- **`fiction_source_characters`**: 대표 원전 콘텐츠 ↔ fiction 인물 다대다 연결
  - PK `(content_id, celeb_id)`, `celeb_id → celebs.id`, `relation_type`은 appearance/origin/adaptation, `sort_order`로 화면 순서를 고정한다
  - 트리거가 `celebs.celeb_tier='fiction'`인 대상만 허용한다
  - 저장 RPC `set_fiction_source_characters(text, uuid[])`는 대표 지정과 인물 목록 교체를 한 트랜잭션으로 처리하며 anon·authenticated 실행 권한은 회수했다
  - **`celeb_contents`와 혼용 금지.** 이 관계는 인물이 그 작품에 등장한다는 뜻이지, 작품을 감상했다는 뜻이 아니다
  - 현행 데이터(2026-07-29): 대표 원전 20건, 관계 285행. fiction 257명 중
    255명이 하나 이상의 원전에 연결
    - 팩션 18편·인물 배치 285건을 정규 인물 257명으로 통합했다. 프로필·태그
      미해소 0, 아바타 없는 데이터형 프로필 209명
    - 모든 대표 원전에 국·영문 locale이 있고, 인물 0명인 원전·실재하지 않는
      content FK·non-fiction 관계는 각각 0건
    - 미연결 2명은 펜테실레이아·멤논. 직접 원전인 소실 서사시
      《아이티오피스》를 후대 작품으로 대체하지 않고 보류
    - 재현·감사: `sw/web-bo/scripts/fiction/audit.ts`
      (여기 함께 적혀 있던 `sync-fiction-source-rosters.ts`는 저장소에 없다 —
      26.08.06 확인. 이름이 비슷한 `sync-fiction-profiles.ts`·
      `sync-faction-fiction-data.ts`가 그 역할을 나눠 가졌는지는 **미확인**)
- **`celeb_influence`**: 영향력 6축(political/strategic/tech/social/economic/cultural) + transhistoricity
  - 각 6축 CHECK 0~10, transhistoricity CHECK 0~40, total_score CHECK 0~100
  - **total_score는 트리거 `trg_calc_influence_total`이 자동 계산**한다 (7개 값의 단순 합). 직접 써도 덮어써진다
  - 축별 설명 컬럼: `{축}_exp`, `{축}_exp_en`
  - UNIQUE(celeb_id)
- **`celeb_persona`**: 인물 스펙트럼 수치. 테이블명은 레거시 저장소 식별자다. **3개 카테고리를 반드시 구분할 것** (단일원천: `sw/web/src/lib/spectrum/constants.ts`)
  - **덕목 8개** (VirtueKey, 0~100): temperance, diligence, reflection, courage, loyalty, benevolence, fairness, humility
  - **능력 4개** (AbilityKey, 0~100): command, martial, intellect, charm
  - **성향 4개** (TendencyKey, -50~+50): pessimism_optimism, conservative_progressive, individual_social, cautious_bold
  - ⚠️ 위 수치 범위에 **DB CHECK 제약은 없다.** 코드 규약이다 (실측 데이터는 범위 내)
  - ⚠️ 덕목(품성)과 능력(역량)은 별개. 혼용 금지
  - UNIQUE(celeb_id)
- **`celeb_dialogues`**: 인물별 고유 대사. `celeb_id`(PK, `celebs` FK), lines(jsonb), lines_en(jsonb)
  - **dialogueLines**: DB 개인화 대사 (celeb_dialogues 테이블, 인물별 고유)
  - **defaultLines**: 톤별 범용 대사 (코드 하드코딩, speech_tone 6종 기반)
- **`celeb_timeline_events`**: 실존 인물·fiction 인물 타임라인 사건 (2026-07-26 도입, 2026-07-30 서사 순서 확장). 규격·조사 절차는 `docs/project/celeb/celeb-timeline.md`가 SSoT
  - 사건 하나가 한 행. 실존 인물은 `year` 정수(**기원전은 음수**), fiction은
    `year=null` + `sequence_label(_en)` + `sort_order`를 쓴다. 둘을 동시에 쓰지
    못하도록 CHECK가 막는다
  - `lat`/`lng`는 **둘 다 있거나 둘 다 없거나**(CHECK). 좌표 있는 행만 활동 반경 지도에 오른다 — **활동 반경용 테이블은 없다**
  - `source_url`·`place_qid`·`month`·`day`는 **2026-08-14에 폐기했다.** 어느 화면도 읽지 않으면서
    조사 비용만 발생시켰다. 되살리자는 제안이 나오면 「누가 그 값을 그리는가」부터 답한다 →
    `celeb-timeline.md` 「폐기한 필드」
  - `source` CHECK: research·wikidata·manual. 값은 사건이 등록된 경로만 표시한다
  - 별도 조사 이력 테이블·작업 큐·조사 RPC는 없다. 조사자는 인물 한 명을 조사·자체검증한 뒤
    최종 사건만 이 테이블에 직접 반영한다
  - RLS 공개 읽기만 허용하며 쓰기는 관리자 서버에서 수행한다
- **`celeb_tags`** / **`celeb_tag_assignments`**: 세력도감 테마·영상 없는 테마의 수동 명단. 별도 태그 기능이 아니며, 서비스 읽기는 `faction_atlas_members` 뷰 하나로 합친다. 운영은 `web-bo.md` 「세력도감」, 단일화 설계는 `remotion/faction/unification.md` §4-3 참조
- **`celeb_task_queue`**: 작업 큐 → `celeb-pipeline.md` 참조
  - PK(task_type, celeb_id). status CHECK: pending|in_progress|completed|failed|skipped
  - 리스 방식: claimed_by / claimed_at / lease_expires_at / attempt_count / last_error
  - 인물 타임라인 조사는 이 큐를 사용하지 않는다
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
- ⚠️ **`celebs.quotes` / `celebs.quotes_en` 컬럼은 존재하지 않는다.** 물리 분리 전
  `profiles.quotes` / `profiles.quotes_en`도 2026-03-23에 제거됐으며 호환 뷰에도 없었다
- **읽기·쓰기 모두 `celeb_dialogues` 단독.** 다른 프로필 테이블로의 동기화 대상은 없다
- **화면 라벨은 "한마디"다**(2026-07-26 변경, `celebPage.dialogue_quote`). 영문은 `Quote`를 쓴다
- **검색 노출 설명문의 첫머리로 쓰인다**(`sw/web/src/lib/celeb/meta.ts`). 화면뿐 아니라 검색 결과에 그대로 실리는 자리라 오염이 곧 대외 노출이다
- ⚠️ **길이 상한은 언어별로 다르게 두어야 한다.** 같은 말이라도 영어로 옮기면 글자 수가 두 배 남짓 늘어난다(실측: 한국어 최대 90자 / 영어 최대 221자·평균 73자). 처음에 한쪽 기준(90자)만 걸었더니 **영어 화면에서 367명의 한마디가 조용히 탈락**해 소개문으로 되돌아갔다. 현재는 `QUOTE_MAX = { ko: 90, en: 170 }`이며, 설명문은 한마디를 먼저 싣고 자리가 남을 때만 뒤 안내를 붙인다(`composeDescription`)

#### 갱신은 `set_celeb_quote` RPC로만 (2026-07-26 신설)

🔴 **`lines` 를 통째로 덮는 방식은 금지다.** 2026-06-02 에 `lines = EXCLUDED.lines` 일괄 작업이 579행의 `quote` 키를 소멸시켜 544명분이 유실됐고 PITR 기간(28일)이 지나 복구가 불가능했다. `set_celeb_quote(p_celeb_id, p_quote_ko, p_quote_en)` 는 `jsonb_set` 으로 `quote` 키 하나만 건드리고, 대사 행이 없는 인물(fiction 등)에는 INSERT 한다. anon·authenticated 권한은 회수해 뒀다(서버 전용).

#### 최소 조사와 자리 표시 값

한마디는 최소 조사 전체가 아니라 그 결과에서 선정한 직접 발언 한 개다. 최소 조사 묶음과 21개 상황 대사의 유지·교정 규칙은 `docs/project/celeb/celeb-speech.md` §6.0이 쥔다. 한마디를 채울 때는 한·영을 함께 갱신한다.

검증 가능한 발언을 여러 검색 경로에서 끝내 확보하지 못한 인물에게만 **`[확인된 어록이 없습니다]` / `[No verified quote]`**를 넣는다. 공란이라는 이유만으로 이 값을 넣지 않는다. 기존 자리 표시 보유자도 새 최소 조사에서 직접 발언이 나오면 교체하며, 예외 게이트를 다시 통과한 경우에만 유지한다.

⚠️ **대괄호로 통째 감싼 값은 실제 발언이 아니다.** `meta.ts`의 `sanitizeQuote`와 화면 조회 헬퍼 `getDisplayDialogueQuote`가 대괄호 값을 배제한다. 따라서 검색 결과 설명문은 소개문으로 넘어가고, 상세 화면의 한마디에도 표시되지 않는다. 앞으로 자리 표시 문구를 새로 만들 때도 이 형태를 지켜 자동으로 걸러지게 한다.

집계할 때는 대괄호 자리 표시 값을 실제 어록에서 제외한다. 키 보유 수만 세면 품질 감사가 통과한 것처럼 보이므로 금지한다.

### full 티어 강제 트리거

`trg_celeb_full_requires_content` (BEFORE INSERT OR UPDATE OF `celeb_tier` ON `celebs`,
2026-06-22 도입·2026-08-10 새 도메인으로 이전)

- 조건: `celeb_tier='full'` **AND** (INSERT 이거나 기존 티어가 full이 아니었을 때)
- 위 조건에서 해당 셀럽의 `celeb_contents` 행이 **0건이면 예외를 던진다**
  (ERRCODE `check_violation`)
- 즉 **full 티어는 콘텐츠 1건 이상 필수**. full이 필요하면 콘텐츠 수집을 먼저 하고, 아니면 light로 등록한다
- 이미 full인 행을 다른 컬럼만 UPDATE할 때는 검사하지 않는다(전이 시점에만 발동)

### celeb_tags / celeb_tag_assignments 컬럼

- **`celeb_tags`**: id, `name`(UNIQUE), name_en, description, description_en, `slug`, color(기본 `#7c4dff`), sort_order, is_featured(bool), start_date, end_date, `team_images`(jsonb NOT NULL 기본 `[]`), `parent_id`
  - **`parent_id`**(uuid, 자기참조 FK → `celeb_tags.id`, `on delete set null`, 인덱스 `idx_celeb_tags_parent_id`) — 상위 그룹 계층. null이면 무소속. **자식을 가진 태그가 곧 그룹 헤더다**(별도 플래그 없음). 26.07.26 마이그레이션 `add_celeb_tags_parent_id`로 코드 상수(`constants/factionGroups.ts`, 삭제됨)에서 승격했다. 위계는 두 단계까지
- **`celeb_tag_assignments`**: id, celeb_id, tag_id, assigned_at, short_desc, short_desc_en, long_desc, long_desc_en, sort_order, `faction_image_url`, hidden
  - UNIQUE(celeb_id, tag_id)
  - **26.08.03 단일화로 웹 전용 명단(영상 없는 태그의 수동 배정) 214행 전용이 됐다.** 제작 유래 사본 650행은 26.08.03 삭제(백업: `_backup/celeb-tag-assignments-full-2026-08-03.json`)
- **인물 텍스트(대사·직함·소개)의 유일 원천은 `faction_people`이다(26.08.03).** 제작 유래 인물의 도감 한줄은 직함 첫 항목(JSON `lines[0]`, PostgreSQL `lines[1]`)으로 고정한다. 도감 손질은 `web_long_desc`(±en, 상세 소개)·`web_image_url`(개인샷)·`web_hidden`(숨김)만 허용한다. 옛 `web_short_desc`(±en)는 26.08.03 폐기해 조회·편집·저장에 쓰지 않는다
- **읽기 창구는 DB 뷰 `faction_atlas_members`다** — 제작 유래(한줄=`lines[1]`, 상세=`web_long_desc` 우선, 태그당 셀럽 중복은 제작 앞자리 채택, disabled 제외) ∪ 웹 전용 배정. 정렬은 제작 순번 우선, 웹 전용은 10000+ 순번. 행 식별자 `source`(production/manual)·`person_id`·`assignment_id` 포함. 노출 결정은 `celeb_tags.is_featured` 스위치 하나다

---

## 셀럽 이미지 규격

R2 `celebs/{id}/` 경로. `web-bo`의 `lib/image.ts`에서 리사이즈.

> **비율·표시 크기·저장 크기의 코드 SSoT는 `packages/shared/src/constants/celeb-hero-photo.ts`의 `CELEB_HERO_PHOTO_SPEC`이다.** 웹, 백오피스, 일괄 스크립트에서 숫자를 다시 선언하지 않는다. 이 문서는 용도·구도·운영 정책을 설명한다.

| 파일명 | 크기 | 비율 | 용도 |
|--------|------|------|------|
| `avatar.webp` | 800×800 | 1:1 | 원형 아바타, 카드 썸네일, 일반 이미지 표시 (레티나 3x 대응) |
| `avatar-sm.webp` | 공용 상수 참조 | 1:1 | **얼굴이 지름 40px 안팎으로 나오는 화면 전용**(2026-08-08 신설). 원본에서 줄여 만든 별도 파일이며 원본은 그대로 둔다 |
| `photo.webp` | 공용 상수 참조 | 세로 | **인물 상세 PC 상단 대표 화보**(2026-07-31 신설, 2026-08-05 세로 전환). 얼굴 크롭이 아니라 복식·배경이 있는 환경 인물사진 |

**작은 판(`avatar-sm.webp`)을 왜 두나.** 원본이 800×800 한 장뿐이라 성향 분포(`/explore`)처럼 얼굴을 한 화면에 200장 넘게 까는 곳도 800px을 그대로 받았다. 합계 1억 4천만 화소가 되어 브라우저가 그림 준비를 감당하지 못했고, 자리가 빈 채로 남아 **마우스가 지나간 자리만 뒤늦게 나타났다**(26.08.08 실측: 사진은 222장 전부 도착 완료였는데 화면에는 없었다). 규격·주소 규칙의 코드 원천은 `packages/shared/src/constants/celeb-avatar-small.ts`다.

- 주소는 원본에서 파일명만 바꿔 얻는다(`celebAvatarSmallUrl`). DB에 별도 컬럼을 두지 않는다 — 26.08.08 실측으로 아바타 보유 2,483명 전원이 예외 없이 `celebs/{id}/avatar.webp` 규칙을 따랐다.
- **어느 자리가 작은 판을 쓰는지는 화면이 아니라 표시 크기가 정한다.** 상한(`maxDisplayPx`)은 위 상수 파일에 있고, 웹은 세 갈래로 그 판정을 공유한다 — 훅 `sw/web/src/hooks/useCelebAvatarSrc.ts`, 그 훅을 쓰는 공용 부품 `components/ui/CelebImage.tsx`·`CelebAvatarImage.tsx`. 새 화면은 표시 크기(`sizes`)만 정확히 넘기면 되고, 판정을 다시 적지 않는다.
- 작은 판이 없는 인물은 화면이 원본으로 되돌린다. 그래서 생성이 밀려도 얼굴이 사라지지는 않는다.
- 만드는 곳은 넷이다 — 일괄 생성 `sw/web-bo/scripts/avatar/sm.ts`, 그리고 아바타를 올리는 세 경로(백오피스 화면 `actions/admin/storage.ts`, 등록 스크립트 `scripts/avatar/upload.ts`, 배경 지우기 `lib/image-processing/nobg-avatar.ts`)가 모두 원본과 함께 만든다.

**아바타 구도 규격**

> 프레임 기하(눈과 턱이 화면 어디에 오는가)·안전 영역·발주 프롬프트·판정 기준은 **`docs/project/celeb/celeb-avatar-spec.md`가 SSoT다.** 아래는 요약이다.

- 얼굴이 화면 대부분을 채우는 타이트한 헤드숏이다. **눈·턱·콧대의 기준 좌표와 허용 범위는 여기 옮겨 적지 않는다** — 계산에 쓰이는 값은 `sw/web-bo/src/lib/avatar-geometry.ts`의 `AVATAR_SPEC`이 갖고 있고, 그 배경과 판정 절차는 `celeb-avatar-spec.md` §1이다.
- **머리 위는 자유다.** 머리카락·모자·투구·왕관이 화면 위로 잘려도 무방하다. 다만 이마·눈썹·귀 등 얼굴 자체가 잘리면 불합격이다.
- **턱 아래도 자유다.** 맨 목·옷깃·갑옷·머리카락 무엇이 채우든 되고 어깨가 안 보여도 된다. 어깨를 담으려고 카메라를 빼지 않는다. 쇄골·가슴이 드러나 상반신이 길어지는 것만 막는다.
- **얼굴이 없는 인물은 규격 밖이다.** 사토시 나카모토·클로윈디처럼 신원이 공개되지 않은 인물은 눈·턱 기준이 면제되고 사람이 직접 등록한다.
- 정면 또는 3/4 15도 이내와 카메라를 향한 시선을 기본으로 한다. 옆모습, 과도한 얼굴 확대, 상반신이 길게 들어오는 구도는 불량이다.
- 의상은 목과 쇄골을 가리고, 배경 제거 후에도 머리카락·귀·어깨 외곽이 자연스러운 투명 RGBA여야 한다.
- 고대·중세 인물도 회화·삽화·흑백 복원풍이 아니라 21세기 카메라로 촬영한 듯한 컬러 하이퍼리얼리즘을 사용한다.

> 2026-03-24 이전 등록 셀럽은 300×300. 신규 업로드분만 800×800.

**대표 화보 규격 (`photo.webp` → `celebs.portrait_url`)**

- 얼굴만 담는 아바타와 정반대다. **복식·배경·소품이 있는 세로 환경 인물사진**이고, 상반신~무릎이 들어간다.
- PC 상세 상단에서만 세로 대표사진을 직접 노출한다. 모바일 상단은 원형 아바타를 유지하되, 아바타를 누른 확대 모달은 `portrait_url`을 우선 연다.
- 기존 정사각 `photo.webp`는 원본을 덮어쓰지 않고 화면의 `object-cover`로 중앙 크롭한다. 신규 업로드는 백오피스 편집기에서 공용 상수의 비율로 자르고, 저장 크기 상한도 같은 상수에서 읽는다.
- **대표 사진이 비면 화면이 세력도감 개인화보(제작 유래는 `faction_people.web_image_url`, 수동 배정은 `celeb_tag_assignments.faction_image_url` — 조회는 뷰 `faction_atlas_members`) → 얼굴 아바타 순으로 물러난다.** 그래서 전량을 채우지 않아도 화면이 깨지지 않는다(`getCelebBySlug`의 `photoUrl`).
- 2026-07-31 제거한 옛 Portrait 파일을 복구한 것이 아니다. 비어 있던 물리 컬럼만 현재 대표사진 용도로 재사용한다.

**대표 화보 채우는 세 경로**

| 경로 | 도구 | 비고 |
|------|------|------|
| 손에 있는 파일 등록 | `sw/web-bo/scripts/photo/hero-upload.ts` | 배치 JSON `[{slug, celeb_id, nickname, image}]`. id-slug 일치를 확인한 뒤에만 쓴다 |
| 팩션 폴더에서 전용 | `scan-faction-portrait-candidates.mjs` 로 후보 수집 → 눈으로 1장 선별 → 위 등록 도구 | **유튜브에 올라간 편만 대상**(`scripts/youtube/faction-lineup.json`). 팩션 원본은 영상 자산이므로 절대 삭제하지 않는다 |
| codex 로 생성 | `generate-celeb-hero-photos.mjs` | 얼굴 아바타를 REF로 붙여 생성 → 진위검사 → 등록 → 생성물 로컬 삭제까지 한 건에 끝낸다. 대상 추출은 `pick-hero-photo-targets.mjs` |

**생성 시 함정 (2026-07-31 실측)**

- 실사 질감 강제 문구를 빼면 **회화체로 나온다.** 러너의 `RENDERING` 블록이 그 방어막이고 지우면 안 된다.
- codex 프로세스가 시간 초과로 죽어도 **그림은 이미 나와 있는 경우가 있다.** 실패를 바로 던지지 말고 산출물 회수를 먼저 시도한다.
- 생성 실패 세션에서 최장 base64를 뽑으면 **넣어준 REF가 그대로 돌아온다.** 축소 지문(64×64 md5) 대조로 걸러야 한다.
- 발주서는 인물마다 앵글·조명·시선을 새로 짠다. 골격을 고정하면 "같은 날 같은 스튜디오에서 찍은 증명사진"이 된다(`docs/project/production/image-generation.md` §5.2). **연출문 양식과 두 갈래(화보형·본업 몰입형) 규칙은 `docs/project/celeb/hero-photo-status.md` 「연출문 양식」이 SSoT다.** 러너가 갈래 표기를 검사해 없으면 생성을 거부한다.
  > 2026-08-01 이전에는 이 자리가 `BRIEF-GUIDE.md`를 가리켰으나 **그런 파일은 저장소에 없다**(전수 검색 확인). 이전 회차의 인물별 연출문 실물도 남아 있지 않다.

**인물 이미지가 자리마다 여섯 종으로 갈린다** — 어느 그림이 어디로 가는지는 `docs/project/celeb/person-image-map.md`가 지도다.

---

## celebs.slug

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
| `get_celebs_sorted` | p_profession, p_nationality, p_content_type, p_sort_by, p_search, p_limit, p_offset, p_tag_id, p_min_content_count, p_gender, p_include_inactive, p_celeb_tiers text[] | 셀럽 목록 단일 진입점. NULL은 티어 제한 없음이며 사용자 웹은 코드 기본 티어를 명시하고 web-bo만 전체 조회에 NULL을 쓴다 |
| `get_tracker_candidates` | exclude_ids text[] | 아래 참조 |
| `get_tag_celeb_counts` | — | 레거시 함수. 수동 배정만 세므로 세력도감 인원 수에 쓰지 않는다. 현행 web-bo는 `faction_atlas_members`를 센다 |
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
| `celebs.view_count` (integer, default 0) | **누적** 조회수. 인물 상세 화면에 표시한다. `increment_celeb_view`로만 증가 |
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
  - `publication_status='active'`
  - `cultural_journey`가 NULL도 빈 문자열도 아님
  - `death_date`가 NULL도 빈 문자열도 아님
  - **퍼블릭 도메인**: `death_date`가 `-`로 시작(BC)하거나, 앞 4자리가 숫자이고 1920 이하
  - `celeb_persona` 행 존재
  - `review`가 채워진 `celeb_contents`가 **4건 이상**
  - `id::text != ALL(exclude_ids)`

---

## Wikidata QID 관리 프로세스

셀럽의 창작 서가는 `celebs.wikidata_qid`를 기반으로 실시간 Wikidata SPARQL 조회한다.

### QID 배정 규칙

1. **자동 배정 스크립트**: `sw/web/scripts/bulk-qid.mjs` — `wbsearchentities` API로 영문명 매칭
2. **1차 검증 (필수)**: P31=Q5(인간) 확인
3. **2차 검증 (필수)**: DB `birth_date`와 Wikidata P569 생년 대조 (±3년 허용)

> ⚠️ **검증 도구가 없다** (26.08.06 전수 검색 확인). 이 자리에는 `verify-qid.mjs`·`verify-qid-birth.mjs`가 있다고 적혀 있었으나 저장소에 존재하지 않는다. 실재하는 QID 도구는 배정용 `bulk-qid.mjs` 하나뿐이다. **두 검증을 "필수"로 두려면 도구부터 만들어야 한다** — 그 전까지는 사람이 Wikidata 항목을 직접 열어 확인한다. 검증 없는 자동 배정이 실제로 사고를 냈다 — 라오서에게 미국 여성 소설가(`Q204168`, Lorrie Moore)의 QID가 붙어 있었고 생몰년이 비슷해 이름·설명을 봐야 잡혔다(`docs/project/celeb/celeb-avatar-spec.md`에 경위 기록).
4. **수동 확인**: 2차 검증 미해결 건은 수동 QID 조회. 특히:
   - **BC 인물**: Wikidata 연도 절삭(-384 → -38)으로 거짓 양성 다수. QID 자체는 정상
   - **듀오/그룹**: Coen Brothers, Daft Punk 등 P31≠Q5. description 확인 필요
   - **동명이인**: Francis Bacon(철학자 vs 화가) 등. 생년 대조 필수
   - **Wikidata 미등재**: 일부 인물은 항목 자체가 없음

### 신규 셀럽 등록 시 QID 배정 절차

1. 영문명으로 Wikidata 검색 (`wbsearchentities`)
2. 후보 중 description에 인물 설명이 있는 항목 선택 (crater, asteroid 등 제외)
3. 생년 대조 확인 (DB birth_date vs Wikidata P569)
4. `celebs.wikidata_qid`에 저장

### 실시간 조회 아키텍처

- API: `/api/celeb-works?qid=Qxxx` — 2단계 SPARQL (목록→상세)
- 캐시: 24시간 인메모리 캐시
- UI: `CreativeLibrary.tsx` — 클라이언트 필터링/페이징
- 이미지 커버리지: 미술 85%, 클래식 24%, 영화 13%, 대중음악 4%
