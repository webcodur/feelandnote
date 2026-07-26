# 담화 완전 통합 (discourse-unification)

> 실측 대조: 26.07.26 — 에피소드 5편·발언 66·인물 9 전수, remotion-bo 담화 코드 전수(21+3파일), 읽기/쓰기 주체 전수, 팩션 5테이블 DDL 실조회, 셀럽 slug 8건 전수. 선례: `faction-unification.md`(Phase 1~5 완료). 기획 원문: `discourse.md`(§0에 실효 항목 정리).
> 골격은 팩션과 동일: DB 단일 원천 + web-bo 단일 편집기 + export 산출물 강등 + remotion-bo 담화 구역 폐기.

## 0. 실측이 뒤집은 전제 4개

1. **담화는 기획 단계가 아니라 실재하지만, 팩션보다 한 자릿수 작다** — 편집기 21파일 3,027줄(팩션 56/11,912), BO lib 3종 546줄, 전용 API 2개(팩션 16), 데이터 5편·9인물·66발언·67.9KB, **wav 0개·발화시각 파일 0개·렌더 CLI·SRT·유튜브 전무**.
2. **음성 파이프라인이 아직 없다 → 팩션 최상위 위험 R1·R2가 담화엔 아직 존재하지 않는다.** `voice:discourse` 스크립트 부재, `duration` 필드 사용 0건. **음성 착수 전에 통합을 끝내면 그 위험 자체가 발생하지 않는다 — 이것이 최대 이득이자 착수 시점의 근거다.**
3. **타입 드리프트가 없고 셀럽 연결이 100%다** — 렌더/BO 타입 diff는 목록 카드 6필드뿐, 선언 외 필드 0건(팩션의 사문 12종+와 대조). cast slug 8종 전부 profiles 실재 + virtual_monologue(ko·en) 보유. `Turn.cast`·`to` 인덱스 이탈 0건.
4. **원천 `profiles.virtual_monologue`는 런타임 의존이 아니다** — 코드에서 읽는 곳 0곳(주석 2곳뿐). 사람이 읽고 재작문하는 사료. → `discourse_speakers.celeb_id` FK만 세우면 되고, web-bo 이식 때 「원천 독백 보기」 패널을 덤으로 붙일 수 있다(같은 DB — 조인 한 번).

**discourse.md 실효 항목**: "3편"→실제 5편(peter-thiel·qin-shi-huang-court 추가, 전부 등록·todo) · musk-altman 발언 14→13 · 이미지 "미착수"→71장 실재(musk-altman 30·peter-thiel 25·jensen-huang 16, qin 계열 2편은 0장) · remotion-bo 팩션 서술은 Phase 5 소멸로 무효(`SeriesDataModel = 'book'|'discourse'`, middleware.ts 삭제됨).

## 1. 데이터 읽기/쓰기 주체 전수

**쓰기 = 실질 1계열**(팩션은 2): W1 BO 편집 저장 — `PUT /api/[series]/episodes/[name]` → `discourse-utils.ts:94 saveDiscourseEpisode`가 **세 파일**(discourse-data.json 메타 / cast.json / turns.json)로 분해 기록 → DB 액션으로 대체. W1b 생성(`createDiscourseEpisode`), W1c 상태(`_status.json`) → DB. **W2(음성 파이프라인) 부재.** W3 사진 파일 조작(shared media 부품)은 파일만 — 그대로.

**읽기 = 9곳**(팩션 21): **R1 렌더 로더** `Discourse/script.ts:26-29` — require.context 3개(빌드타임 정적·동기) + `_episodes.json` static import(:23). **R2** `Root.tsx:310-355` — `calcDiscourseFrames` 동기 호출, 컴포지션 ID가 `shortsPartNumbers`·`longformPartNumbers` 의존. → **DB 직접 fetch 불가, export 방식 확정.** R3 타이밍 파일(이관 범위 밖) · R4 BO 편집기 로드 · R5 목록(전편 로드로 집계 — DB 쿼리로 대체 시 개선) · R6·R7 음원 목록/재생 · R8 음악 목록 · R9 셀럽 존재 배지.

## 2. 필드 규모

선언 외 필드 0건. Turn 선언 21/사용 10(cast·kind·text·chunks 66, origin·originRef 37, part 35, to 28, image 27, imageChanges 13) · Speaker 18/12 · Script ~30/15. → **핫 컬럼 33 + jsonb 3개**로 전량 수용. `mined` 같은 크기 격리 불필요(최대 파일 18.8KB).

## 3. DB 스키마 (DDL 초안)

구조: 팩션 5테이블 → **담화 3테이블**. 차이 4: ① 계층 2단(인물 평면, 순서는 발언이 정함) ② `turns`는 `speakers`의 형제(episode_id 직속, speaker_id는 링크) ③ **celeb_tags 투영 없음**(도감 무관 → faction-sync 대응물 없음, 작업량 급감) ④ 편별 부속 테이블 없음(titleByPart 등은 data jsonb).

```sql
-- create_discourse_tables
create table public.discourse_episodes (
  id uuid primary key default gen_random_uuid(),
  folder text not null unique,
  title text not null, title_en text,
  topic text, topic_en text, logline text, logline_en text, notice text, notice_en text,
  status text not null default 'todo' check (status in ('todo','live','done')),
  registered boolean not null default false,
  sort_order integer not null default 0,
  longform_layout jsonb,               -- [{cut}|{era}|{turn:n}] — turn은 정수 유지(아래 판단 ③)
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.discourse_speakers (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.discourse_episodes(id) on delete cascade,
  position integer not null,           -- C{pos:02d}
  name text not null, name_en text,
  slug text,
  celeb_id uuid references public.profiles(id) on delete set null,
  lines text[], lines_en text[], epithet text, epithet_en text,
  epithet_duration numeric,            -- 파이프라인 소유
  era text, color text, image text,
  living boolean not null default false, mythical boolean not null default false,
  disabled boolean not null default false,
  data jsonb not null default '{}',    -- voice·imageCrop·holdMotion·transition
  unique (episode_id, position)
);
create table public.discourse_turns (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.discourse_episodes(id) on delete cascade,
  position integer not null,           -- T{pos:02d}
  speaker_id uuid not null references public.discourse_speakers(id) on delete restrict,
  to_speaker_id uuid references public.discourse_speakers(id) on delete set null,
  kind text not null check (kind in ('monologue','accuse','rebuttal','reply','agree')),
  text text not null, text_en text,
  chunks text[], chunks_en text[],
  origin text, origin_ref text,
  image text, part integer,
  duration numeric, gain_db numeric, playback_rate numeric,  -- duration은 파이프라인 소유
  disabled boolean not null default false,
  data jsonb not null default '{}',    -- imageChanges·imageCrop·voice·transition·holdMotion
  unique (episode_id, position)
);
create index discourse_turns_speaker_idx on public.discourse_turns(speaker_id);
create index discourse_speakers_celeb_idx on public.discourse_speakers(celeb_id);
-- RLS: 3테이블 × admin 전용 4정책(팩션 규격). 서비스(web)는 담화 테이블을 읽지 않는다.
```

**판단 4건**: ① position UUID화 금지 — `Discourse/voice-names.ts:35 vnTurn`(`T{n:02d}-{slug}.wav`)·`:44 vnCastEpithet`·`:57 vnTimingKey`가 위치 기반. wav 0개라 지금 바꿔도 무비용이지만 팩션과 규칙 통일이 시리즈 공용 음성 스크립트의 전제라 유지. ② `Turn.cast`(정수) → `speaker_id`(FK) 승격 — 팩션 `{group:index}`→`{groupId:uuid}`와 같은 안전망(FK 위반 = 전체 롤백). `to_speaker_id`는 set null(범위 밖 to가 정상 경로). ③ `longform_layout`의 `{turn:n}`은 **정수 유지** — 행 참조가 아니라 경계 위치이고 n=turns.length(맨 끝)가 실사용, UUID로 표현 불가. 현행과 동일하므로 회귀 아님. ④ 크기 격리 컬럼 불요.

**원자 저장 RPC**: `discourse_replace_episode(p_folder, p_episode, p_speakers, p_turns, p_expected_updated_at)` — 팩션 RPC 규칙 그대로(security definer·service_role 전용·jsonb_populate_recordset·TS가 uuid 선생성·낙관적 잠금).

## 4. 이관·왕복 검증

도구 대칭: `packages/shared/src/lib/discourse-schema.ts`(HOT 맵만 신설 — **faction-schema의 범용부(splitBy/joinBy·checksum·withGenerated/stripGenerated·diffPointers·U+FFFD)를 series-agnostic 모듈로 승격해 공유, 복제 금지**) · `discourse-assemble.ts`(cast↔speaker_id 환원 + 세 파일 분해) · `bo/discourse-export.ts` · `scripts/discourse/{lib,import,export,verify}.ts`(`pnpm discourse:import|export|verify`).

split 규칙: 팩션 §5 그대로(false≡키 부재 · Number() 복원 · .in() 200청크 · slug 컬럼 보존+celeb_id 파생 · `_generated` strip 필수).

**왕복 검증 게이트 7종**(렌더 함수 직접 import, 복제 없음): ① 정규화 JSON(병합 DiscourseScript, JSON Pointer 전량) ② **세 파일 분해 재현**(cast·turns가 메타에 안 새는 불변식 — `discourse-utils.ts:95`) ③ 컴포지션 ID 집합(`Root.tsx:51 discourseCompBase`+`timing.ts:107,114` — **이 검증을 위해 `discourseVariants()`를 `packages/shared/src/lib/youtube-discourse-meta.ts`로 승격**, discourse.md §9 미착수 해소) ④ `calcTotalFrames` 전 종류 일치 ⑤ `buildCues` 완전 일치 ⑥ 음원 파일명·합성 텍스트(vnTurn/vnCastEpithet/turnText — **wav 0개인 지금 계약을 고정**) ⑦ SRT 바이트(`subs.ts:28`)+U+FFFD. **검증기 반증 시험 10종**(to 삭제·chunks 제거·part 변경·turn±1·originRef 삭제·color·voice.style(jsonb 생존)·living·speaker 순서·imageChanges) 재현. 멱등 2회차 확인.

## 5. export 경로

```
DB → pnpm discourse:export → discourse-data.json + cast.json + turns.json (+_episodes.json) → 렌더 무수정
```
**세 파일 문제의 해법**: `_generated` 마커는 discourse-data.json 첫 키에 **하나만**, checksum은 **병합된 DiscourseScript 전체**로 계산 — cast.json·turns.json 손 편집도 잡힌다(두 파일은 최상위 배열이라 마커 자리도 없음). 재사용: 손 편집 중단+diff+--force · pristine 파일은 DB 대조 차단(R3 가드) · `.export-backup/<ts>/`(3파일 세트, 10회)+`_original/` · `_episodes.json` 재생성 · `--drift` · 저장 직후 자동 export. **음성 길이 병합(팩션 §7①)은 코드만 넣어둔다**(~10줄, 착수 시 즉시 유효).

## 6. web-bo 이식

전략 동일: **복사 이식(21파일 3,027줄) + 데이터층 4곳만 교체**(로드→`loadDiscourseScript` 액션, 저장→공용 뼈대 `persist` 인자(팩션 4b 신설분 재사용), 창구 주소 `/api/discourse/…`, 화면 주소 `/discourses/{편}/{lang}/{tab}`). **시리즈 이름을 주소 첫 토막에**(shared media 부품이 `/api/${series}/media` 하드코딩 — 팩션 4a 판단 재사용).

규모: 화면 4 라우트 · 액션 3종(episodes=DB 집계 목록·script(+`lib/discourse-save`)·export) · fs 라우트 8종 · lib 5종. 신규·재작성 ~2,600줄(+복사 3,027). **publish·themes·avatar·voice 생성 계열 없음**(도감 투영 무관).

보안 재현 필수: `proxy.ts` matcher가 이미지 확장자 주소를 로그인 검사에서 제외 → 라우트마다 관리자 확인 + 경로 잠금(`lib/discourse-asset.ts`) 이중. **로컬 가드는 `REMOTION_LOCAL`로 일반화**(FACTION_LOCAL 별칭 유지). 색 토막은 팩션 4b 치환표 44종 재사용(신규 조사 불요, sed 중첩 사고 재발 금지 — 이름 단위 1회 치환). `.faction-ui` 보정은 `.remotion-ui`로 일반화. 딸림: GeminiVoiceSelect 포함 여부 확인(미확인 §11-1) · useCelebExists → 서버 액션 대체(+독백 보기 패널 덤) · faction-edit-route는 web-bo 기존 것 재사용.

## 7. 음성 길이 소유권 — 지금 못 박는 규칙

① 편집기에 duration·epithet_duration 사람 입력 칸 금지(§팩션 7 금기) ② 저장 시 DB 값 우선(`loadExistingDurations` 대응 절차) ③ 🔴 **길이 조회 기준은 자리(위치)가 아니라 「사람 + 그 사람의 n번째 발언」** — 팩션 4b가 실측으로 잡은 결함. 담화는 한 인물 다발언이 기본이라 더 흔하다 ④ durations-pull·--verify DB 열은 음성 CLI와 함께 ⑤ gotchas 폐기 3방향 재제안 금지.

## 8. remotion-bo 폐기

삭제 ≈31파일 3,700줄 + 라우트 3: `components/discourse/**`(21) · `lib/discourse-{types,utils,voice}` · `api/[series]/discourse-voice/**`(2) · Sidebar DiscourseList · **`[series]/[name]/[lang]/**` 언어·탭 화면 트리 전체**(유일 사용자였음) · `lib/faction-edit-route`(참조 3곳 전부 삭제분) · `useCelebExists`+`api/celebs/exists`(참조 1곳뿐).

**폐기 스위치**: `series-registry.ts`의 `SeriesDataModel` 유니온에서 `'discourse'` 제거 — 등록표 9곳(SERIES_EPISODE_IO·EPISODE_LISTS·SERIES_HOMES·EDITORS·FILE_SERIES·STATUS_WRITERS·usesLangTabEditor·render/youtube 501 가드·guide 문구)을 타입 에러가 지목한다.

**소멸 후 remotion-bo = 북리커맨드 하나뿐**(약 27,500줄). `[series]` 추상화 전체가 단일 멤버 의례가 된다 — 최종 종착은 북리커맨드 이관 + remotion-bo 소멸(별건).

죽은 호출 점검(팩션 Phase 5 선례 — 담화 음악 목록이 죽은 팩션 창구를 불러 항상 비어 있었음): 서재 탐방이 담화 전용 창구를 부르는지 grep. 실측 1건: shared media.tsx:623이 `/api/${series}/faction-avatar`를 부르나 담화 SpeakerCard가 slug를 안 넘겨 현재는 버튼 미렌더 — web-bo 이식 후 켜려면 라우트 필요(`celeb-avatar`로 개명 후보).

`voice-names.ts` 96줄 복제본(`remotion-bo/lib/discourse-voice.ts`, "양쪽 동시 수정" 경고 부착) → **shared/lib/discourse-voice-names.ts로 승격해 복제 영구 소거**, 엔진은 재export.

## 9. Phase (각 단계 끝에 시스템 동작)

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | 담화 WIP 커밋 정착 + `_episodes.json`↔폴더 대조 + 5편 백업 | **완료 26.07.26** — WIP 0건(기준 `048bb1f0`), 목록↔폴더 5/5 일치, 백업은 P2 첫 발효의 `_original/` 이 겸함 |
| 1 | 마이그레이션+RPC + schema/assemble + CLI + **왕복 7종 5/5 + 반증 10종** | **완료 26.07.26** — 3테이블·인덱스 2·RLS 12정책(pg_policies 팩션 실물 대조 일치)·`discourse_replace_episode`. 인물 9·발언 66·셀럽 연결 9/9. 7종 5/5, 반증 10/10 검출, 멱등 2회차 동일 |
| 2 | export 발효(마커·가드·3파일 백업·재생성·drift) | **완료 26.07.26** — 5편 첫 발효, `_original/` 보존(마커 없음 확인), 손편집 1글자(cast.json) 차단→diff 1곳 지목→`--force` 바이트 복구, `--drift` 동일 5편 |
| 3 | shared 승격(voice-names·discourseVariants·schema 범용부 분리) | **완료 26.07.26** — `lib/series-schema.ts`(P1) · `lib/discourse-voice-names.ts`(렌더·BO 96줄 복제 소거, 양쪽 재export) · `lib/youtube-discourse-meta.ts`(`discourseVariants`·`discourseCompBase`, Root.tsx 재import). 검증 ③이 공용 산출 ↔ Root.tsx 등록 규칙 일치까지 본다 |
| 4a | web-bo 서버 기반(원자 저장·액션 3·fs 라우트 8·목록·사이드바) — 팩션 4a 검증 6항목 대칭 | **완료 26.07.26** — `lib/discourse-{paths,route,asset,db,save,edit-route}` · 액션 3 + 원천 독백 조회 · fs 라우트 8 · `/discourses` 목록(DB 집계) · 사이드바. `REMOTION_LOCAL` 일반화(`FACTION_LOCAL` 별칭 유지). 검증 6/6 |
| 4b | 편집기 21파일 이식 + 데이터층 4곳 + 색 토막 + 독백 패널 — 검수 편 `qin-shi-huang-court`(인물 4·발언 21 최복잡) | **완료 26.07.26** — 20파일 이식(+`DiscourseSeriesHome`은 DB 집계 목록으로 대체) · 데이터층 4곳 교체 · `.remotion-ui` 일반화 · **원천 독백 패널 신설**. 저장 경로 실물 검증 4/4 |
| 5 | remotion-bo 담화 폐기(31파일·스위치·등록표 9·죽은 호출·문서) | **완료 26.07.26** — 36파일 삭제(예상 31 + 죽은 사진 창구 4 + `lib/media-root` 1) · `SeriesDataModel` 유니온 축소로 등록표 9곳 정리 · 문서 6종 동기화. 서재 탐방 무손상(dev 실측 200), 담화 주소 404 |
| 6(선택) | 음성 CLI 착수(voice:discourse·align·transcribe·srt·youtube·durations-pull·reorder) — **통합 완료 후에만** | |
| 7(선택) | 북리커맨드 이관 or [series] 추상화 붕괴 | 별건 — **판단 필요 시점이 왔다**(§8.4 관찰이 현실이 됐다). `remotion-bo-plan.md` 「단일 시리즈가 된 뒤」에 선택지 둘을 적어 뒀다 |

## 10. 위험

**D1(최상) 음성 착수가 통합보다 먼저** — 팩션 R1·R2를 담화에서 재현하게 됨. 지금이 유일한 무비용 창. **D2(최상) 유저 WIP 충돌** — P0 정착 + pristine 가드. **D3(상·잠재) 발언 순서 변경 vs 미래 wav** — 사람 기준 조회(§7-③)+vnVerify+reorder 계약 문서 고정. **D4(상) 이관 사문화** — P5까지 완주. D5 미지 필드(낮음 — 선언 외 0건) · D6 세 파일 분해 파손(검증 ②) · D7 손 편집(checksum 전체 커버) · D8 컴포지션 ID(검증 ③+shared 단일원천) · D9 turn 경계(현행 동일) · D10 화면 육안(사람) · D11 eslint(담화는 작으니 예외 없이 실수정 시도).

## 11. 미확인

> 26.07.26 Phase 3~4 에서 해소된 항목: **GeminiVoiceSelect** — web-bo 폐포에 없었다(상수 `GEMINI_VOICES_*` 만 있었다). 그대로 복사 이식했다.
> **discourse-voice 라우트 응답 모양** — 팩션 voice 라우트와 같다(`{ files: VoiceFile[] }`, 공용 `listVoices`). 주소만 `/api/discourse/voice/{편}[/{파일}]` 로 옮겼다.
> **색 토막 44종 커버리지** — 담화가 실제로 쓰는 색은 52토막이고 **전부 web-bo `@theme` 에 이미 있었다**(팩션 4b 가 세운 것). 손댈 것은 `bg-{danger,warning,info,success}` 계열뿐이었다 — 두 앱의 배경 밝기가 반대라 배경으로 쓰인 자리를 `/15`~`/25` 틴트로 낮췄다.

GeminiVoiceSelect의 web-bo 폐포 포함 여부 · discourse-voice 라우트 응답 모양 vs 팩션 voice 라우트 · 색 토막 44종 커버리지 · peter-thiel/qin-court의 `_docs/sources.md` 유무 · qin 계열 이미지 0장 렌더 폴백 · titleByPart 정규화 여부(현행 jsonb 유지) · 배포본 /discourses 노출 정책 · 북리커맨드 이관 계획.

## 진행 로그

- 26.07.26 설계 확정(정찰 전수 실측 기반).
- 26.07.26 **Phase 0~2 완료.** DB 가 담화의 단일 원천이 됐고 세 파일은 렌더용 산출물로 강등됐다.
  - 신설: `packages/shared/src/lib/series-schema.ts`(시리즈 무관 공통부) · `lib/discourse-schema.ts` · `lib/discourse-assemble.ts` · `bo/discourse-export.ts` · `sw/remotion/scripts/lib/series-cli.ts` · `scripts/discourse/{lib,import,export,verify}.ts` · `tsconfig.scripts.json`.
  - 개조: `lib/faction-schema.ts`·`scripts/faction/lib.ts` 가 승격분을 재사용(공개 이름·시그니처 불변). **팩션 왕복 검증 95편 전량 통과로 영향 0 실증.**
  - ⚠ 승격 규칙: 새 시리즈를 붙일 때 split/join·비교·체크섬 절차를 다시 짜지 마라. `series-schema` 에 HOT 맵과 컬럼 성질만 주입한다.
  - ⚠ 세 파일 마커 전략이 실제로 먹힌다는 증거: 마커가 없는 `cast.json` 의 **색 코드 한 글자**를 고쳤더니 병합 체크섬이 어긋나 export 가 중단되고 `/cast/0/color` 를 정확히 지목했다.
  - 반증 시험은 상설 도구로 남았다(`pnpm discourse:verify -- --all --falsify`). 통과만 보고 안심하지 않기 위한 장치다.
  - 임의 결정 3건: ① `longform_layout` 을 값 변환 없는 일반 핫 컬럼으로 둠(`{turn:n}` 정수 유지 판단의 귀결) ② `to` 인덱스가 인물 범위를 벗어나면 저장 전 중단(실측 이탈 0건이라 조용한 null 화보다 안전) ③ `.export-backup/` 을 `.gitignore` 에 추가(담화 데이터 세 파일 자체는 계속 추적).
- 26.07.26 **Phase 3~4 완료.** 편집·출간의 유일한 자리가 web-bo `/discourses` 가 됐다(remotion-bo 담화 구역은 P5 에서 걷어낸다).
  - 승격: `lib/discourse-voice-names.ts`(복제 96줄 소거 — 렌더·BO 가 재export 만 한다) · `lib/youtube-discourse-meta.ts`(영상 종류·컴포지션 ID). Root.tsx 는 컴포지션 ID 앞머리만 재import 하고 등록 루프는 그대로다 — 대신 **왕복 검증 ③이 공용 산출과 Root.tsx 등록 규칙이 어긋나면 잡는다**(설계 §10 D8 대비, 렌더 로직 무변경 원칙과 양립).
  - web-bo 신설 34파일: lib 6 · 액션 3 · fs 라우트 8 · 화면 5 · 이식 부품 20(원천 독백 패널 포함) 등.
  - ⚠ **`REMOTION_LOCAL` 로 일반화**했다. 시리즈마다 스위치를 따로 두면 하나만 켜 놓고 다른 화면이 왜 안 되는지 찾게 된다. 옛 이름 `FACTION_LOCAL` 도 계속 인정하므로 `.env` 를 고칠 필요는 없다.
  - ⚠ **음성 길이 병합이 실제로 작동한다는 실측**: DB 의 길이를 비우고 저장해도 **파일에 적힌 값이 되살아난다**(설계 §5 · 팩션 §7①). 파이프라인이 파일에만 기록한 길이를 지키는 규칙이라 의도된 동작이다 — 되돌리려면 파일 쪽도 함께 지워야 한다. 시험 중 이 규칙을 몰라 "복구 실패"로 오판했다.
  - ⚠ **§7-③ 규칙 실증**: 길이를 심어 놓고 발언 순서를 바꿨더니 그 값이 **자리에 남지 않고 사람의 n번째 발언을 따라갔다.** 담화는 한 인물이 여러 번 말하는 것이 기본이라 이 규칙이 없으면 음원과 컷 길이가 어긋난다.
  - 임의 결정 4건: ① `DiscourseSeriesHome`(옛 목록 화면)은 이식하지 않고 **DB 집계 목록으로 대체** — 원본은 전 편의 파일을 통째로 읽어 목록을 만들었다(§1 R5). ② `useCelebExists` 는 새로 만들지 않고 **web-bo 에 이미 있던 공용 창구를 재사용**(팩션이 쓰던 것 — 중복을 만들 뻔했다). ③ 표 부품은 `components/factions/FactionTable` 을 빌려 씀(시리즈 지식 없는 순수 표 부품). ④ eslint 예외 목록에 담화 경로를 **넣지 않고** 지적 3건을 실제로 고쳤다(설계 §10 D11).
- 26.07.26 **Phase 5 완료 — 담화 통합 종료.** 편집·출간의 유일한 자리가 web-bo `/discourses` 가 됐고 remotion-bo 에 담화 코드는 남지 않았다.
  - 삭제 36파일: 편집기 21 · 데이터층 3 · 음성 창구 2 · 사이드바 목록 1 · **언어·탭 화면 트리 2**(유일 사용자가 담화였다) · 딸림 3(`faction-edit-route`·`useCelebExists`+`api/celebs/exists`) · **죽은 사진 창구 4**.
  - ⚠ **죽은 사진 창구를 함께 걷어낸 근거**: `mediaRootOf()` 가 담화에만 폴더를 내주고 있었다. 담화가 빠지자 모든 시리즈에 `undefined` 를 돌려주게 돼 **어떤 요청이 와도 404 를 뱉는 창구**가 됐다(호출처 0곳). 쓰이지 않는 정도가 아니라 동작하지 않는 코드다.
  - ⚠ **남겨 둔 것**: `api/[series]/music`(목록·폴더 열기)은 호출처가 담화 편집기뿐이었으나 **동작 자체는 멀쩡하다**(시리즈 공용 `public/music/` 을 읽는다). 고장이 아니라 부르는 사람이 없어진 것이라 그대로 뒀다 — 지우려면 별도 판단이 필요하다.
  - 등록표 9곳은 `SeriesDataModel` 유니온에서 `'discourse'` 를 빼자 타입 검사기가 전부 지목했다(팩션 P5 와 같은 방법). `usesLangTabEditor` 는 정의째 소멸했다 — 쓰는 시리즈가 없어졌다.
  - **§8.5 죽은 호출 재확인**: shared `media.tsx:623` 이 `/api/${series}/faction-avatar` 를 부르는 배선은 그대로다. 담화 인물 카드가 slug 를 넘기지 않아 **버튼 자체가 안 그려지므로 지금은 호출되지 않는다.** web-bo 이식본도 같은 상태다 — 이 버튼을 켜려면 라우트 신설(`celeb-avatar` 로 개명 후보)이 선행돼야 한다.
  - 문서 6종 동기화: 이 문서 · `discourse.md`(머리에 통합 완료 표기) · `web-bo.md`(「가상 담화」 절 신설) · `remotion-bo-plan.md`(폐기 실적 + **「단일 시리즈가 된 뒤」 관찰**) · `AGENTS.md` · `faction-unification.md`(형제 통합 완료 1줄).
  - 🔴 **이 앱에 남은 시리즈는 서재 탐방 하나다.** 계열별 등록표 5개가 전부 빈 표가 됐고 `[series]` 세그먼트는 언제나 한 값이다. 새 시리즈를 remotion-bo 에 얹기 전에 Phase 7 선택지부터 정해야 한다.
