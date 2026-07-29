# 팩션 완전 통합 (faction-unification)

> 실측 대조: 26.07.25 — 23개 에피소드 JSON 전수(537 인물 배치)·faction-data.json 읽기/쓰기 주체 21곳 전수·web-bo 구조·DB 실측 기반 설계. Phase 1(스키마·이관·왕복 검증)은 26.07.25 완료 — 하단 진행 로그 참조.
>
> **26.07.27 — 영상에서 도감으로 넘기는 작업을 대대적으로 진행했다.** 도감 테마 40→76개, 대분류 10개로 재편, 인물 소개문 300여 건 신규. 편 상태는 두 값(`ready`/`blocked`)으로 축소. 도감 쪽 변경(노출 스위치·단체 사진 구조·인원 상한)은 **`docs/project/celeb/celeb-tag-system.md` 의 「26.07.27 개편」 절이 정본**이다.
> **이 문서가 `faction-db-sync.md`(다리 방식)를 대체한다.** 다리(양방향 동기화)는 폐기 개념이고, 목표는 집 하나다. faction-sync 코드는 이관·이미지 배관 도구로 개조되어 살아남는다.

## 확정 방향 (유저 지시 — 재론 금지)

- **텍스트·구성 데이터의 단일 원천 = Supabase DB.** 로컬 `faction-data.json`은 렌더용 빌드 산출물로 강등(수정 금지).
- **편집 화면 = web-bo 하나.** 팩션에 관해 remotion-bo는 **렌더·유튜브 버튼까지 포함해 전체 폐기**(26.07.25 결정 — "출고만 remotion-bo 잔류" 절충안은 기각, 플랫폼 소거가 목적). 담화·북리커맨드는 후속 단계에서 같은 길을 밟아 remotion-bo를 최종 소멸시킨다.
- **후속 완료(26.07.29):** 담화와 북리커맨드도 같은 길을 밟아 remotion-bo 앱 전체가 폐기됐다.
- Remotion(렌더 엔진)은 플랫폼이 아니라 빌드 도구. 대용량 미디어(wav 443개 297MB·이미지 2,245장)는 로컬 유지.
- 미등록 9개 에피소드도 `registered=false`로 이관. 사문 필드는 보존. 구버전 중복 에피소드(Path-of-Kings·Iliad-Odyssey 등)도 이관하되 미등록 유지.

## 0. 실측이 뒤집은 전제 3개

1. **인물은 배치(placement) 단위다** — 고유 slug 374 중 147개가 2곳 이상 배치, 60개는 배치마다 quote가 다르다(elon-musk 5곳, odysseus는 한 에피소드 안 2회). `faction_people`은 `(cluster_id, position)` 배치 행이고 `celeb_id`는 nullable 링크. `celeb_tag_assignments`는 `unique(celeb_id, tag_id)`라 N배치→1배정 투영 필수.
2. **`celebId`는 데이터에 0건** — 연결 키는 `slug`(534/537)뿐. 이관 시 `slug→profiles.id` 해소, 실패분 null+진단.
3. **타입 선언이 데이터를 못 따라간다** — 선언에 없는 실데이터 필드 12종+(`outroTitle` 23/23, `group.musicLongform`은 선언 없이 `FactionBgm.tsx:17`이 사용). 렌더/BO 타입 두 벌도 서로 어긋남(79 vs 71+9 필드). → **롱테일은 jsonb 통째 보존**(블랙리스트 방식)이 왕복 동일성을 구조적으로 보장한다.

## 1. faction-data.json 읽기/쓰기 주체 전수 (통합의 급소)

**쓰기 = 실질 2계열**:
- **W1 BO 편집 저장** — `faction-utils.ts:84` 전문 덮어쓰기 (`PUT /api/[series]/episodes/[name]`) → DB 액션으로 대체.
- **W2 음성 파이프라인** — `sw/remotion/scripts/voice/faction/data.ts:110 writeQuoteDurations`(`pnpm voice:faction`)가 **`person.quoteDuration` 단 1필드** 기록 → 보존 후 역흡수(§7).
- (W3 생성·복제 → DB로. W4 일회성 이관 스크립트들 → 사문화 표기. W1↔W2 duration 유실 충돌은 현재도 실재.)

**읽기 = 21곳**. 핵심:
- **R1 렌더 로더** `Faction/script.ts:20` — **webpack `require.context` 빌드타임 정적 스캔 + 동기**, `_episodes.json` static import(:17). R2 `Root.tsx:207,230,253` — `calcFactionFrames` 동기 호출로 duration 확정, 컴포지션 ID 집합이 `part`·`longformLayout` cut에 의존. → **DB 직접 fetch 불가의 구조적 근거.**
- R5 SRT(`faction-srt.ts:87`, `scaleVoiceTimings` 복제본 보유) · R6 음성 잡(`buildVoiceJobs` — `buildCues` 재사용) · R8 WhisperX(`3-transcribe.py:631`, `F{g:02d}C{c:02d}P{p:02d}-quote` 키 재현) · R9 유튜브(`youtube-faction.ts:43`) · R12 렌더 트리거 · R15 faction-sync · R16 카드뉴스(`person-cards/*.json` 이름 키 병합).
- **인물 위치(FxxCxxPxx)가 음성 자산의 물리적 신원** — `faction-voice/[episode]/reorder` 라우트가 wav + `data.timing.pN.*.json` 키 + `voice/2-word-timings.json` targets 3곳을 함께 옮긴다. DB 편집기의 순서 변경도 이 3중 동기를 재현해야 한다(web-bo 로컬 실행이 요구사항인 이유).
- 발화시각(`data.timing.*`)·단어타이밍은 별도 파일 — **DB 이관 범위 밖(로컬 유지)**.

## 2. 필드 규모

FactionPerson 79종(채움율 ≥90% 11종 / <5% 34종, `minedQuotes` 68인물=380KB로 인물 바이트의 70%) · Group 22종(+선언외 musicLongform/Shorts) · Cluster 14종 · Script 52종(+사문 outroTitle 등). → 핫 컬럼 54개 + jsonb 5개로 167필드 수용.

## 3. DB 스키마 — **적용 완료(26.07.25, 마이그레이션 `add_celeb_tags_slug_unique`·`create_faction_tables`)**

정규화 수위: **핫 컬럼 + 단일 `data` jsonb + `mined` jsonb 분리. 버킷 분할 안 함.** 근거: 채움율, 드리프트 만성, 왕복 동일성, minedQuotes 크기 격리(detoast 회피), jsonb→컬럼 승격은 무손실.

테이블 5종(정본은 DB — `information_schema`가 정확):
- `faction_episodes` — folder(unique)·title(+en)·logline(+en)·**status(ready/blocked)**·**block_note**·registered(現 _episodes.json)·sort_order·longform_layout(jsonb, 항목 {groupId:uuid}|{era}|{cut}|{chapter} — 내보내기가 인덱스로 환원)·data(jsonb)
  - **`status` 는 두 값뿐이다(26.07.27 마이그레이션 `simplify_faction_episode_status_to_two_values`).** 묻는 것은 하나다 — 이 편을 도감으로 옮길 수 있는가. `ready`(인물이 인명부에 있다, 이미 옮긴 편 포함) / `blocked`(출연진이 사람이 아니거나 등록 인물이 셋 미만). 26.07.29 실측은 ready 52 · blocked 40.
  - 옛 다섯 값(idea/todo/live/done/shelved)은 **폐기**했다. 「할 것인가」와 「어디까지 왔나」를 한 칸에 섞어 놓은 데다 렌더·출간 코드가 이 값을 읽지 않아 실제와 계속 어긋났다(유튜브에 나간 편은 둘인데 「준비」로 남은 20편 중 12편이 이미 렌더 편성에 올라 있었다).
  - **`block_note`** — 못 옮기는 이유 한 줄(26.07.27 신설). 이유가 편마다 제각각이라 분류로 묶으면 뭉뚱그려진다. 목록에서 폴더 경로 자리에 이 줄이 대신 뜬다.
  - 렌더·음성·출간에 딸려 가지 않는 근거는 예전과 같이 **`registered=false`** 다(렌더 대상은 `_episodes.json`, 그 파일은 `registered=true`만 담는다). 26.07.29 현재 등록 13편·미등록 80편이다.
  - **folder 는 한 단계짜리 고유 슬러그다.** 모든 편은 `sw/remotion/public/factions/<folder>`에 나란히 있고 주소도 같은 값을 그대로 인코딩한다. 폴더 위치에 활성·비활성 의미를 싣지 않는다.
  - **활성 여부의 단일 원천은 `registered`다(26.07.29).** `registered=true`만 `_episodes.json`에 실리고 렌더·음성·출간 대상이 된다. `status=ready|blocked`는 도감 테마로 옮길 수 있는지의 판단일 뿐 활성 여부가 아니다.
- `faction_groups` — episode_id·position(1-based = 음성 파일명 F{pos:02d})·name(+en)·color·**tag_id(celeb_tags N:1)**·part·disabled·longform_only·data. unique(episode_id, position)
- `faction_clusters` — group_id·position(C{pos:02d})·label(+en)·image·disabled·longform_only·data. unique(group_id, position)
- `faction_people` — cluster_id·position(P{pos:02d})·name(+en)·slug·celeb_id(profiles, nullable)·org·mythical·epithet(+en)·lines(+en, text[])·image·quote(+en)·quote_chunks(+en)·quote_origin·**quote_duration/epithet_duration(파이프라인 소유)**·disabled·longform_only·**mined(jsonb 크기 격리)**·data. unique(cluster_id, position)
  - `mythical=true` 인물은 `profiles.celeb_tier='fiction'` 프로필에 연결한다.
    얼굴이 없어도 `avatar_url=null`인 active 데이터형 프로필을 만들 수 있으며,
    아바타 부재는 출간·검색 연결을 막지 않는다
  - 2026-07-29 전수 기준: 신화·서사 18편, 285배치, 정규 fiction 257명.
    `celeb_id` 미해소 0, 태그 배정 누락 0, 원전 연결 255명(20작품·285관계)
- `faction_episode_parts` — (episode_id, part) PK·comment(現 comment.p<N>.txt)

RLS: 5테이블 전부 admin(role admin|super_admin) 전용 4정책. 서비스(web)는 celeb_tags만 읽는다 — 제작 데이터 비공개가 의도적 차이.

**position을 UUID로 안 바꾸는 이유**: 음성 파일명(`voice-names.ts:14`)·타이밍 키·받아쓰기 키·SRT stem이 전부 위치 기반. 바꾸면 wav 443개 개명 = 음성 파이프라인 파손 1등급. position + unique로 강제, 재배치 시 파일 3종 동기(§8).

## 4. celeb_tags와의 경계

```
제작(비공개)                                   서비스(공개)
faction_episodes                               celeb_tags (40행, slug unique 인덱스 26.07.25)
 └ faction_groups ─tag_id(N:1)──────────▶       · name/color/slug/team_images(R2 그룹샷)/youtube_videos/theme_music
    └ faction_clusters                         celeb_tag_assignments (unique(celeb,tag))
       └ faction_people ─celeb_id─┐   투영       · short_desc(세력별 한줄 소개)
            quote·음성설정·컷효과   │ ─────▶      · long_desc(세력별 상세 설명, 사람이 다듬음)
            lines[0]·epithet ─────┘             · sort_order · spotlight_image_url(R2 개인샷)
                                               profiles — 불가침
```

- 투영은 제작→서비스 **단방향·채움 전용**(force로만 덮음). 상위 그룹 계층은 출간 범위 밖이며 `celeb_tags.parent_id`가 정본이다(26.07.26 승격 — 아래 진행 로그).
- **영상과 웹의 '수식어'는 동일 필드가 아니다.** 영상 `epithet`은 화면에 띄우거나 낭독하는 한 문장 소개이고, 웹 `short_desc`는 같은 인물도 태그마다 달라지는 10자 내외 한줄 소개다. 신규 배정의 초안은 `lines[0] → short_desc`, `epithet → long_desc`로 투영한다. `epithet`이 없을 때만 직함 2·3번 줄을 `long_desc`의 재료로 쓴다. 기존 웹 소개는 출간해도 보존되며, 같은 값으로 맞추는 일괄 동기화는 하지 않는다.
- **배치 충돌 규칙**: 같은 celeb·같은 tag에 여러 배치 → `(group.position, cluster.position, person.position)` 최소 배치 채택. sort_order는 태그 관통 전역 순번(기존 `assignTagOrder` 유지).
- 이미지 R2 출간: 기존 `faction-sync/{r2,image,manifest}.ts` 배관 그대로(불변 캐시 + ?v= 정책 적용됨).
- **되쓰기 예외 3종(채움 전용 아님)** — 사람이 도감에서 다듬는 값이 아니라 제작·업로드 기록이 유일한 출처라 force와 무관하게 항상 되쓴다. 원천이 비면 서비스도 비운다.
  - 인물 대사 → `celeb_tag_assignments.quote/quote_en` (`publish.ts` 의 `mirrorValue`)
  - **테마 영상 → `celeb_tags.youtube_videos`** (26.07.26 신설, §4-1)
  - **테마 배경음악 → `celeb_tags.theme_music`** (26.07.26 신설, §4-2)

### 4-1. 테마 영상 투영 (`faction-sync/videos.ts`, 26.07.26)

세력도감 테마에서 그 편의 유튜브 영상을 바로 보게 하는 값이다. 컬럼 주석이 형태 SSoT.

- **원천**: `sw/remotion/scripts/youtube/faction-lineup.json` 의 `<편>.uploads.<variant>`(`{videoId, uploadedAt}`). 공개 여부 필드는 **없다** — 그래서 매 출간마다 유튜브에 직접 물어본다(`youtube-liveness.checkUploadsLive`, KO 채널 1회 = 쿼터 1 unit).
- **선정 규칙** — 태그 하나에 롱폼 1편·쇼츠 1편.
  - 롱폼: 편 경계(`longformLayout` 의 `cut`)가 없으면 통짜 `ko-longform`. 있으면 그 태그 세력이 처음 나타나는 편(`ko-longform-N`).
  - 쇼츠: 그 태그 세력들의 `part` 중 가장 앞 번호. 편을 나누지 않은 에피소드는 단일 `ko-shorts-1`.
  - `disabled`·`longformOnly` 세력만 가진 태그는 세로 영상 어디에도 안 나오므로 **영상 없음**(현행 실측: AI-Supremacy 의 hugging-face).
  - variant 키 목록은 `factionVariants()` 가 단일원천 — 여기서 규칙을 복제하지 않는다.
- **공개 상태**: `public` 만 싣는다. `private`·`unlisted`·삭제(`missing`)는 사유를 남기고 제외. **조회 자체가 실패하면(토큰 만료 등) 아무것도 바꾸지 않는다** — 한 번의 인증 실패로 전 테마 영상이 지워지는 사고 방지.
- **출간 범위**: `scope.videos`. 업로드 기록 파일을 읽으므로 사진과 마찬가지로 `REMOTION_LOCAL=1`(옛 `FACTION_LOCAL=1`)이 필요하다.
- **서비스 노출**: 아래 §4-2 와 **같은 부품**(`components/features/faction/FactionMediaLinks.tsx`)이 영상·음악을 한 줄에 함께 그린다. 영상은 세로 9:16 embed 모달. 없으면 아무것도 그리지 않는다.

### 4-2. 테마 배경음악 투영 (`faction-sync/music.ts` + `scripts/faction/theme-music.ts`, 26.07.26)

테마 구간에서 실제로 흐르는 곡을 도감에서 들어볼 수 있게 하는 값이다. 컬럼 주석이 형태 SSoT.

- **원천은 엔진 선곡이다** — `src/compositions/Faction/bgm-select.ts`. **web-bo 에 판정을 재구현하지 않는다.**
  렌더 저장소의 얇은 CLI `scripts/faction/theme-music.ts --episode <편>` 이 `buildCues`·`chapterMusicBounds`·
  `chapterBgmSegments`·`globalBgmTracks` 를 그대로 불러 **세력 index별 실사용 곡**을 JSON 으로 내놓고,
  출간이 그것을 자식 프로세스로 불러 결과만 쓴다(개인샷 아바타 승격과 같은 방식).
  - `usesChapterBgm` 이 `!portrait && bounds>0` 이고 `portrait = isShorts` 이므로 **롱폼은 챕터 단위, 쇼츠는 전역 모드**다
    (`stage.ts` 의 `portrait: v.isShorts` 와 같은 해석).
- **선정 규칙** — 테마당 대표 1곡.
  - 변형은 영상과 같은 방식으로 고른다. **롱폼을 먼저 본다**(챕터마다 곡이 갈려 세력 단위 해상도가 가장 높다), 못 찾으면 그 세력의 쇼츠 편.
  - 롱폼(챕터 모드): 그 세력의 첫 컷 프레임을 덮는 곡 구간의 파일. 전역 모드: 재생 목록 **첫 곡**.
  - 태그를 여러 세력이 나눠 쓰면 **자리가 가장 앞인 세력**의 곡. `disabled`·`longformOnly` 세력은 곡 없음.
- **곡 파일**: `faction-music/<내용 sha1 앞 8자>-<파일명>` 키로 R2 업로드. **내용 해시가 키라 같은 곡은 한 번만 올라간다**(여러 테마·여러 편이 한 객체를 공유). 1년 불변 캐시 그대로, `?v=` 없음.
- **출간 범위**: `scope.music`. 선곡 도구와 mp3 를 읽으므로 `REMOTION_LOCAL=1` 필요. **선곡 조회가 실패하면 아무것도 바꾸지 않는다**(한 번의 실행 실패로 전 테마 음악이 지워지는 사고 방지).
- **반증 시험(26.07.26 실측)**: 6편 전량에서 CLI 판정이 엔진 `collectBgmFiles` 의 같은 변형 결과 안에 있는지 대조 — 불일치 0. 편별 결과: PayPal-Mafia 4세력 전부 `Velvet_Side_Door`(렌더 창고 실측값과 일치) · Digital-Resistance 3+3(`Black_Rain_Protocol`/`Cipher_in_Ashes`) · Gods-Greek 2+2+2 · Homer-Iliad 3+2 · korea-football-best11 4세력 + 가로 전용 1세력 제외 · **AI-Supremacy 는 곡 자체가 없어 전 테마 null**.
- ⚠ `sw/remotion/scripts/` 는 `tsconfig.json` include 밖이다 — 이 CLI 는 `npx tsc -p tsconfig.scripts.json --noEmit` 으로 따로 검사한다(기존 오류 1건 `scripts/voice/faction/engine.ts` 의 `wav` 타입 부재는 종전 상태).

## 5. 이관·왕복 검증 — **완료(26.07.25)**

- 도구: `packages/shared/src/lib/faction-schema.ts`(split/join — 핫 필드만 추출하고 **나머지 전부 data에 보존하는 블랙리스트 방식**, 미지 필드 자동 생존) + `sw/remotion/scripts/faction/{lib,import,export,verify}.ts` (`pnpm faction:import|export|verify`).
- 이관 실적: 에피소드 23(등록 14)·세력 123(태그 연결 21)·클러스터 184·인물 537(셀럽 연결 435)·편 댓글 6·quoteDuration 301·longformLayout 6. 멱등(2회차 동일 행수·에러 0).
- **왕복 검증 6종 — 23/23편 전부 통과**: ① 정규화 JSON 비교(키순 무시·undefined≡부재·빈배열≡부재·duration 2자리, 불일치 JSON Pointer 전량) ② `factionVariants` fileSuffix 집합 ③ `analyzeTiming` totalFrames 전 편 ④ `buildVoiceJobs` file·text·chunks ⑤ SRT 바이트 ⑥ 한글 U+FFFD. 검증기 자체를 10종 변조 주입으로 반증 시험(오탐 0·미탐 0).
- 이관 구현 규칙: NOT NULL boolean의 false ≡ 키 부재 · numeric은 Number() 복원(PostgREST 문자열 함정) · `.in()` 200개 청크(462개 실패 실측 이력) · tagSlug 원문은 data에 보존(tag_id는 파생) · sort_order=_episodes.json 순번.
- **미해소 명단**: 프로필 없는 slug 99명(Path-of-Kings 계열 42·korea-sports 14·great-hackers 8·해적 6·world-football 5·Gods-Greek 계열 10·Digital-Resistance 5·cold-war 5·기타 4) — celeb_id null, slug 문자열 보존. 등록 필요 시 celeb 파이프라인.

## 6. 렌더 경로 — 내보내기(export) 방식 확정

DB 직접 fetch 기각(R1·R2 구조적 장벽 + 부수 소비자 4곳 개조 + 렌더 재현성 악화). 확정:

```
DB → pnpm faction:export → faction-data.json(+_episodes.json 재생성) → 렌더·SRT·유튜브·음성 파이프라인 전부 무수정
```

수정 금지 강제(Phase 2에서 발효): 파일 첫 키 `_generated {from,at,episodeId,checksum}` 마커(렌더는 미지 키 무시) + export가 checksum 불일치(손 편집) 시 중단·diff 출력·`--force` 요구 + `faction:verify --drift` 상시 감시 + export 전 `.export-backup/<ts>/`(최근 10회 — git 미추적이라 필수).

## 7. quoteDuration 3단 처리 — 파이프라인 코드 무수정 원칙

① **export 병합(영구 안전망)**: DB 값 null이면 기존 JSON의 quoteDuration/epithetDuration 이어받음(Phase 1 export에 구현됨). ② **역흡수**: `pnpm faction:durations-pull` — wav 실측 길이를 DB UPDATE(buildVoiceJobs·measureWavDuration 재사용). **faction-voice-sync 스킬 Step 3 으로 편입 완료(26.07.26)** — 그전까지 스킬이 이 단계를 빠뜨려, 대사를 새로 쓴 인물의 화면 유지 시간이 옛 음원 기준으로 남아 목소리가 잘리는 사고가 있었다(Gods-Greek 아폴론 8.21초 화면 / 13.92초 음성). ③ **감시**: `voice:faction --verify`에 DB↔JSON duration 열 추가. **금지: 편집기가 quoteDuration을 사람 입력으로 받는 것**(파이프라인 소유. 현행 BO save 응답 기록 경로는 DB UPDATE로 전환).
`gotchas.md` 폐기 3방향(wav2vec2 원고 직접·silence 분할·자동 청크 분할) 재제안 금지.

## 8. web-bo 이식

- **하이브리드**: 공유 부품 4종(`media` 1,304 · `editor` 329 · `voice` 741 · `episode-store` 366 = 2,740줄, 담화 공용)은 `packages/shared` 승격(복사 금지 — 갈라짐 이력 있음). **완료 26.07.25 — `packages/shared/src/bo/`, 실측 승격량은 의존 폐포 포함 3,900여 줄(§10 Phase 3 참조).** 편집기 본체(56파일 11,912줄)는 **복사 이식 + 데이터층만 재작성**(~1,500줄). `FactionPreview`는 DOM 목업(@remotion/player 미사용)이라 이식 용이. Task Queue(`runTask` 계열)도 shared 승격(렌더 버튼용).
- 라우트(**4a 에서 확정된 실제 주소**): `(admin)/factions/…`(목록·[episode]), 액션 `actions/admin/factions/{episodes,script,export,publish}.ts`, 로컬 fs 라우트는 **`api/faction/` 아래**로 잡았다 — `media`·`media/folder`·`media/[episode]/[...path]`·`asset/[...path]`·`voice`(+`[episode]`·`[file]`·`save`·`age`·`reorder`·`timing`·`analyze`)·`task`(+`[id]`). 하이픈(`api/faction-media`)이 아닌 이유: 공용 부품이 `/api/${series}/media` 를 하드코딩해 부르므로 시리즈 이름을 첫 토막에 둬야 부품을 고치지 않고 쓴다. 화면 인증은 (admin)/layout.tsx 가 하지만 **창구는 스스로 확인해야 한다** — `proxy.ts` matcher 가 이미지 확장자로 끝나는 주소를 제외하기 때문이다(진행 로그 참조). 사이드바 menuGroups 「세력도」 — nextjs-page 스킬 규약.
- **저장 방식(26.07.25 실행 전략 확정)**: 편집기의 기존 "전체 스크립트 저장" 계약을 유지하고, DB 쪽은 **원자 RPC `faction_save_episode(folder, script jsonb)`**(plpgsql 트랜잭션: delete-then-insert + split 규칙 SQL 재현 또는 서버 액션에서 split 후 jsonb 전달)로 받는다. 부분 저장(savePerson 등)은 후속 최적화로 미룬다 — 데이터층 재작성량 최소화 + 저장 중 크래시 시 DB 반파 위험 제거. 낙관적 잠금은 `updated_at` 대조 유지. **reorder는 여전히 최난점** — 저장으로 position이 바뀌면 wav·timing 키·word-timings targets 3중 이동이 필요하므로, 기존 `faction-voice/[episode]/reorder` 라우트를 web-bo로 이식하고 편집기의 순서 변경 흐름이 그것을 호출하는 기존 계약을 그대로 유지한다.
- 낙관적 잠금: `updated_at` 대조. 로컬 전용 라우트 가드: `FACTION_LOCAL=1` 미설정 시 503+사유. `REMOTION_ROOT` env 파라미터화.
- 캐시: 제작 데이터는 web 미노출이라 revalidate 불필요. **출간 액션만** `[TAGS, CELEBS]`. Tailwind 토큰 치환표는 Phase 4 착수 시 작성.

## 9. 폐기 (팩션 전량 — 렌더·유튜브 포함)

remotion-bo에서 제거: `components/faction/**`(56파일 11,912줄) · `api/[series]/faction-*` 16라우트 · `api/faction/db-sync/*` · faction lib 5종 · `faction-sync/*`(이동·개조) · Sidebar FactionList · series-registry `faction` 항목(**폐기 스위치** — 제거 시 가드 전부 404). `faction-utils.ts`는 render/youtube 라우트가 import하므로 그 이식 완료 후 삭제.
faction-sync 개조: `collectEpisode` 입력을 DB로, 진단은 이미지·연결 항목만 잔존(텍스트 진단 소거), 텍스트 투영은 DB→DB SQL로 단순화, r2/image/manifest 그대로.

## 10. Phase (각 단계 끝에 시스템 동작)

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | 팩션 WIP 커밋 정착(기준 SHA) + web-bo 배포본 확인 | P3 착수 전 필수 |
| 1 | 마이그레이션 + schema lib + import/export/verify + 왕복 검증 | **완료 26.07.25 (23/23)** |
| 2 | export 발효: `_generated` 마커·checksum 가드·`.export-backup/`·`_episodes.json` 재생성·durations-pull·verify duration 열 | **완료 26.07.25** — 실측 확인: 파일 첫 키 `_generated{from,at,episodeId,checksum}` 실재 · `faction-export.ts` 의 손 편집 감지·`force` 요구·`.export-backup/`(최근 10회 + `_original/`) · `pnpm faction:durations-pull` · `faction:verify --drift` · `voice:faction` 의 quoteDuration↔DB 대조 |
| 3 | 공유 부품 4종+Task Queue shared 승격(~2,900줄, import ~60곳) | **완료 26.07.25** — `packages/shared/src/bo/` 22파일 4,425줄. 4종만으로는 컴파일이 안 돼 의존 폐포까지 올렸다(icons·voice-utils·audio-wave-player·time-ruler·gain + `EleSettings`·`GenEngine`·`TempPreview`·`playDing`). remotion-bo 의 shared 참조 168줄/109파일, 껍데기 재export 0, tsc 3종(remotion-bo·remotion·web-bo) 0, 화면 5종 브라우저 실측(콘솔 오류 0) |
| 4a | **web-bo 서버 기반** — 원자 저장 RPC + 조립기 shared 화 + 액션 4종 + fs 라우트 14종 + 목록 화면 | **완료 26.07.25** — 아래 진행 로그 참조 |
| 4b | **web-bo 편집기 UI** — 편집기 본체 56파일 이식 + 데이터층 배선(4a 액션 호출) — PayPal-Mafia 선검수 | **완료 26.07.25** — 아래 진행 로그 참조 |
| 5 | faction-sync 이동·개조 + series-registry 스위치 + 92파일 삭제 + 문서 7종 갱신 | **완료 26.07.25** — 아래 진행 로그 참조 |
| 6(선택) | 카드뉴스 person-cards/group-cards → data.card 이관(이름 키→UUID) | |

## 11. 위험 상위

- **R1 음성 파이프라인 파손(최상)** — 무수정 원칙 + export 병합 안전망 + `--verify` 게이트.
- **R2 재배치 시 wav·타이밍 오배치(최상)** — reorder 3중 동기 재현 + 원자성 + Phase 4 검수 1순위.
- **R3 유저 WIP 충돌(최상)** — Phase 0 커밋 정착이 P3·P4 착수 조건.
- R5 미지 필드 소실 — 블랙리스트 split + 왕복 검증(사문 필드 생존 포함). R7 JSON 손 편집 — checksum·drift 감시·문서 명기. **R8 DB 이관 사문화 선례**(remotion_images 폐기 이력) — Phase 4까지 가야 통합 성립, P1~2 방치 금지. R11 컴포지션 ID 변동→업로드 키 오염 — factionVariants 검증. R12 배치 충돌 — 최소 위치 규칙.

## 12. 미확인

web-bo 프로덕션 배포본 유무 · remotion-bo 디자인 토큰 목록 · 사문 필드 최종 폐기 여부(현재 보존) · fiction 티어 vs mythical 98건 정합.

## 진행 로그

- 26.07.26 **참조 기반 렌더 창고** — 렌더가 `public/` 7.3GB를 통째로 번들에 복사하던 것을 그 편 자산 + 공용만 모은 임시 폴더로 줄였다. **PayPal-Mafia 기준 7.3GB → 189MB(150파일, 전부 하드링크, 56ms, 용량 순증 0).**
  - `scripts/render/stage.ts`(창고 조립·정리) + `scripts/render/render-staged.ts`(껍데기 CLI, `pnpm render:staged`). 담는 것은 `factions/<편>/`(`_refs`·`_docs`·`quotes`·`_archive`·`.export-backup`·`voice/.raw` 제외) + `common`·`music`·`fonts`. 담화도 `--series discourse` 로 같은 원리.
  - **기본이 창고, 통짜는 `--full-public` 명시.** 조립 실패 시 조용히 통짜로 넘어가지 않고 사유와 함께 멈춘다.
  - web-bo 렌더 버튼(영상·롱폼 썸네일)이 이 경로를 쓴다. Studio는 복사를 안 하므로 대상 아님.
  - **실렌더 실증(PayPal-Mafia KO-S1, 150프레임)**: 창고 산출물과 통짜 산출물이 **637,810바이트로 동일**(앞 구간). 대사가 재생되는 구간(1200~1349프레임)에서는 **오디오 트랙 md5 완전 일치**(영상 크기 0.19% 차이는 h264 인코더 비결정성). **반증 시험** — 창고에서 음성 폴더만 떼고 같은 구간을 뽑으니 `F01C01P01-quote.wav` 404로 실패했다. 즉 그 구간이 실제로 대사를 물고 있고, 창고가 그것을 공급했다는 뜻이다. 썸네일(still) 경로도 창고로 출고 성공.

- 26.07.26 **아이디어 보관함 196MB를 `public/` 밖으로 이송** — `sw/remotion/public/factions/not-using/` → **`sw/remotion/idea-bank/`**(분류/이름 구조 그대로, 743개 205,745,126바이트 이동 전후 완전 일치). 렌더는 `public/` 을 통째로 임시 폴더에 복사하는데 영상에 한 번도 쓰이지 않는 보관함이 매번 딸려 갔다.
  - **DB 폴더 키는 불변**(`not-using/<분류>/<이름>`) — 키를 바꾸면 주소·매니페스트·저장된 사진 경로가 흔들린다. 대응은 **`resolveEpisodeLocation`(shared `bo/episode-store`) 한 함수**가 맡고 `episodeDirOf` 가 그것을 지난다.
  - **흩어져 있던 경로 조립을 이번에 수렴** — `factionEpisodePaths`(shared `bo/faction-export`)가 `path.join(factionsDir, path.basename(folder))` 였다. 보관함 편이 들어온 뒤로 **web-bo 자동 내보내기가 `public/factions/<이름>` 이라는 없는 자리를 가리키고 있었다**(CLI 는 스캔 결과 경로를 써서 멀쩡했으므로 드러나지 않았다). `episodeDirOf` 로 교체. 자산 창구(`lib/faction-asset.ts`)도 같은 함수로 뿌리를 정한다.
  - 스캔 쪽은 `scripts/faction/lib.ts` 의 `IDEA_BANK_DIR`. `.gitignore` 에 새 경로 항목 추가(옛 `public/factions/` 패턴이 못 덮는다).
  - **실측**: `faction:verify --all` 95/95 통과 · 이동 후 보관함 편 내보내기가 새 위치에 기록되고 백업(`.export-backup/_original`)도 그 아래 생성 · 승격(보관함→뿌리) 실이동 왕복 성공 · `public/factions` 스캔 23편 유지 · `remotion compositions` 경고 0(팩션 컴포지션은 등록 14편분) · tsc web-bo·remotion 0.
- 26.07.29 **폐기된 `great-hackers-state`의 로컬 실물 제거** — 26.07.28 DB·인물 삭제 뒤 `idea-bank/shadow-world/great-hackers-state`만 남아 있던 26파일·20,087,954바이트를 제거했다. 현재 보관함은 DB 후보 71편 ↔ 로컬 71편이며 정규화 내용 대조 불일치 0.
- 26.07.29 **활성·비활성 팩션 실물 1차 재통합** — 사용자 운영 판단에 따라 `sw/remotion/idea-bank/`의 71편·719파일·210,216,734바이트를 원래 자리인 **`sw/remotion/public/factions/not-using/`** 로 이동했다. DB 키와 내용은 불변이며 전용 `resolveEpisodeLocation`·`IDEA_BANK_ROOT`·`IDEA_BANK_DIR` 분기를 제거했다. 로더는 `not-using/`의 데이터와 발화 시각을 모두 제외하고, 표준 렌더는 기존 참조 기반 창고를 쓰므로 활성 영상의 입력은 변하지 않는다. `--full-public`을 명시한 옛 통짜 렌더만 후보 자산까지 포함한다.
  - DB 92편 ↔ 로컬 92편 키 전수 일치. `_episodes.json`에만 남아 있던 DB 부재 별칭 `Gods-Greek-Compact`를 제거하고 `registered=true` 13편으로 재생성했다.
- 26.07.29 **경로 상태값 최종 폐기** — `not-using/<분류>/<이름>` 71편을 전부 `public/factions/<이름>`으로 평탄화하고 DB `folder`도 함께 바꿨다. 활성 `Social-Network`와 충돌한 옛 소형 초안만 `social-network-draft`로 명시했다. 분류 서랍에 남은 기획 문서는 `_docs/idea-bank/`로 옮겼다. 이후 활성 여부는 오직 `registered`, 도감 이전 가능 여부는 `status=ready|blocked`가 맡는다. 렌더 로더와 활성 편 정비 스크립트도 `_episodes.json` 화이트리스트를 읽는다.
  - **최종 실측**: DB 92편·슬래시/레거시 키 0 · 로컬 92편 · registered 13 / 미등록 79 · ready 52 / blocked 40. `faction:verify --all` 92/92 왕복 통과, import dry-run 92/92 스캔, Remotion 번들 성공 및 등록 13편의 컴포지션 76종만 노출.
- 26.07.29 **영상 소개문 ↔ 웹 세력별 소개 감사·투영 교정** — 원격 DB를 읽기 전용으로 대조했다. 승리 배치 452건 중 웹 배정이 있는 443건의 국문은 동일 4 · 서로 다름 169 · 영상 소개문 없음 270이었다. 유튜브 업로드 기록이 있는 6편 134건도 동일 4 · 서로 다름 115 · 영상 소개문 없음 15였다. 영상 소개문 중앙값은 편별 28~81자, 웹 한줄 소개는 10~19자였고, 여러 태그에 속한 셀럽 60명은 태그마다 `short_desc`가 달랐다(최대 일론 머스크 11종). 즉 두 값의 차이는 단순 드리프트가 아니라 매체·세력 맥락의 차이다.
  - 신규 배정에서 긴 `epithet`을 `short_desc`에 넣던 잘못된 투영을 `lines[0] → short_desc`, `epithet → long_desc`로 교정했다. 기존 웹 글은 채움 전용 보호를 유지하며 DB 값은 변경하지 않았다. 편집 화면도 제작 필드를 「영상 소개문」으로 명시하고 force 경고에 정확한 덮어쓰기 방향을 표시한다.
- 26.07.26 **형제 통합 완료 — 가상 담화도 같은 골격으로 web-bo 로 옮겨졌다**(`discourse-unification.md`). 이 문서가 세운 방식(DB 단일 원천 · 원자 저장 RPC · 왕복 검증 게이트 · 내보내기 마커와 손 편집 가드 · remotion-bo 구역 폐기)이 두 번째 시리즈에서 그대로 재현됐다. 그 과정에서 팩션 코드의 **시리즈 무관 부분이 공용으로 승격**됐다 — `lib/series-schema.ts`(분해·재조립·비교·체크섬 절차) · `scripts/lib/series-cli.ts`(env·CLI 인자) · `lib/remotion-local.ts`(`REMOTION_LOCAL`, 옛 이름 `FACTION_LOCAL` 별칭 유지) · `.remotion-ui`(`.faction-ui` 별칭 유지). **팩션 왕복 검증 95편은 승격 전후 전량 통과**해 영향 0을 실증했다.

- 26.07.26 **상위 그룹 위계를 코드 상수에서 DB로 승격.** 마이그레이션 `add_celeb_tags_parent_id`(자기참조 FK + 인덱스) 후 옛 상수 8그룹·자식 31종을 slug 대조로 백필하고 `sort_order`를 그룹→자식 차례로 0~39 재부여했다(자식 표시 순서 보존). `sw/web/src/constants/factionGroups.ts` 삭제, `getFeaturedTags`는 자식 보유 여부로 그룹을 판정한다. web-bo `/factions` 목록에 들여쓰기 위계, 테마 편집에 「상위 묶음」 지정(두 단계 제한·자기참조·순환 차단) 신설.

- 26.07.25 **Phase 5 완료 — 출간 개조 + remotion-bo 팩션 구역 폐기 + 문서 동기화.** 팩션 통합 종료.
  - **출간 배관을 옮기며 진단을 다시 정의했다.** `sw/web-bo/src/lib/faction-sync/` 8파일(`types`·`supabase`·`r2`·`image`·`manifest`·`collect`·`diagnose`·`publish`). `image`·`manifest` 는 규격 그대로, 업로드는 이 앱에 이미 있던 `lib/r2.ts` 를 재사용하고 출간에만 필요한 `missingR2Env`·`publicUrl` 만 새로 뒀다.
  - **입력이 파일에서 DB 로 바뀌었다** — `collect.ts` 가 `faction_{episodes,groups,clusters,people}` 을 읽어 출간 모형을 만든다. **대본 조립기(`assembleFactionEpisode`)를 쓰지 않는 이유**: 조립기는 `faction-data.json` 모양을 내므로 해소된 열쇠(`tag_id`·`celeb_id`)를 결과에 담지 않는데, 출간은 바로 그 두 열쇠가 본체다. 사진은 여전히 로컬 파일이라 경로 해석·해시는 그대로 남았다.
  - **텍스트 대조 진단을 소거했다**(제작·서비스가 한 DB). 옛 `desc: db|fillable|none` 폐기. 남는 항목 5종 — ① 셀럽 미해소 ② 태그 미지정 ③ 개인샷·그룹샷 저장소 동기(매니페스트 해시) ④ 얼굴 사진 유무 ⑤ 신화 표시 ↔ 셀럽 등급(`fiction`) 어긋남. ④⑤ 는 출간을 막지 않고 알리기만 한다.
  - **§4 배치 충돌 규칙을 실제 규칙으로 승격했다.** 옛 코드는 "이번 호출에서 먼저 만난 배치"를 채택해 세력을 하나씩 출간하면 결과가 갈릴 수 있었다. 이제 자리(세력·묶음·인물 순번) 최소 배치를 **편 전체를 보고** 미리 정한다(`winningPlacements`) — 세력별 순차 출간과 전체 출간의 결과가 같다.
  - **태그 묶음 열쇠는 `tag_id` 가 아니라 연결 키(`data.tagSlug`)를 먼저 본다.** `tag_id` 는 연결 키의 파생값이라 한쪽 세력만 이어져 있는 상태가 실재하는데, `tag_id` 로 묶으면 태그를 나눠 쓰는 세력이 남남이 되어 **도감 단체사진 배열을 한쪽 몫만으로 갈아끼우는 사고**가 난다(페이팔 마피아 4장이 그 위험이었다).
  - **태그 연결을 그 자리에서 되쓴다** — 연결 키로 태그를 찾았거나 새로 만들었으면 `faction_groups.tag_id` 를 채운다. 안 그러면 다음 저장까지 진단이 계속 「태그 미지정」이라 알린다. 팩션 5테이블에 **트리거가 없음을 실측 확인**(`information_schema.triggers` 0건)했으므로 열려 있는 편집 화면의 저장 잠금(에피소드 갱신 시각)을 방해하지 않는다.
  - **창구는 API 라우트가 아니라 서버 액션**이다 — `actions/admin/factions/publish.ts` 의 `diagnoseFactionPublish`·`publishFactionEpisode`. 로직은 `lib/faction-sync/` 에 두고 액션은 사람 확인·환경 점검만 한다(Next 밖에서 부를 수 있어야 검증이 된다 — `lib/faction-save.ts` 와 같은 이유). 옛 타입 파일 `lib/faction-sync-types.ts` 삭제.
  - 캐시는 출간할 때만 `revalidateWebCache([TAGS, CELEBS])`(이 앱 관례). 사진 범위를 켰는데 `FACTION_LOCAL` 이 없으면 조용히 건너뛰지 않고 사유를 들고 실패한다. **출간 패널 스위치(`PUBLISH_READY`)를 걷어내고 살렸다.**
  - **remotion-bo 팩션 구역 92파일 삭제** — `components/faction/**` 55 · `api/[series]/faction-*` 16라우트 · `api/faction/db-sync/*` 2 · `api/elevenlabs/{voice-history,voice-notes}` 2 · lib 5종(`faction-types`·`faction-utils`·`faction-voice`·`faction-voice-casting-history`·`ele-voice-notes`) · `lib/faction-sync/` 7 · `[lang]/[tab]/card/**` 3 · `Sidebar/sections/FactionList.tsx` · `src/middleware.ts`(팩션 카드 주소 rewrite 전용이었다). `series-registry` 의 `id:'faction'` 정의와 `SeriesDataModel` 유니온 멤버 제거가 폐기 스위치다. 공용 코드 12곳에서 팩션 분기를 도려냈다.
  - **이름만 팩션인 것은 남겼다** — `lib/faction-edit-route.ts`(담화가 쓰는 언어·탭 공용 상수) · `api/[series]/cards/[name]`(서재 탐방 카드뉴스. 디스크 파일명이 `faction-cards.json` 이라 개명하면 데이터가 끊긴다) · `api/elevenlabs/voices`. `components/faction/shared/holdMotion.ts` 는 담화가 써서 담화 폴더로 옮겼다.
  - 🔴 **폐기가 죽은 호출을 드러냈다** — 담화 편집기가 배경음악 목록을 `/api/{시리즈}/faction-music` 으로 부르고 있었고 그 창구의 팩션 가드 때문에 **원래도 404, 목록이 항상 비어 있었다.** 시리즈 공용 `api/[series]/music` 으로 다시 세웠다(담화에서 목록이 실제로 내려오는 것 확인). 또 미등록 시리즈 주소가 200 으로 빈 화면을 내던 것을 `notFound()` 로 바로잡았다.
  - **검증 실측**: tsc 4종(web-bo·remotion-bo·remotion·web) 0 · web-bo `next build` 통과 · `faction:verify --all` **23/23**(등록 14편 5종 전부 + 미등록 9편 ①⑥. 4a 에서 남았던 `Gods-Greek-Compact` 드리프트도 해소돼 전량 통과) · 담화·서재 탐방 화면·창구 200 / 팩션 주소·창구 404.
  - **출간 진단·미리보기 3편 실측(실출간 안 함 — dry-run 까지)**:
    · **Digital-Resistance** 미리보기 **created 0 / updated 0** — 멱등 증명. 이 편만 `_db-sync.json` 매니페스트를 갖는다(예전에 이 배관으로 실제 출간한 편). 셀럽 미해소 **5명**(에릭 휴즈·데이비드 차움·할 피니·로저 딩글다인·클로윈디)이 §5 「미해소 명단」과 일치.
    · **PayPal-Mafia** 세력 4가 태그 하나를 나눠 쓴다. 인물 14 전원 연결·배정, `sort_order` 0~13 이 전역 순번 계산과 정확히 일치(옛 일회성 스크립트 결과와 대조 성공). updated 25 는 ① 영문 소개문 10명분 채움 ② 개인샷 14장(주소 키는 이미 같은데 매니페스트가 없어 재업로드) ③ 단체사진 4장(도감이 옛 `team/0~3.webp` 키를 쥠) — **전부 실제 어긋남이고 결함이 아니다.**
    · **Path-of-Kings-East** 세력 3 전부 `tag-slug-missing` 으로 막히고 쓰기 0(가드 확인).
  - ⚠ **「PayPal-Mafia 변경 0」은 성립하지 않는 기대였다** — 매니페스트가 없는 편은 첫 회에 이미지 기록이 발생한다. 멱등성의 증인은 매니페스트를 가진 Digital-Resistance 다.
  - ⚠ **남은 것**: 실출간은 사람이 판단해 실행한다(PayPal-Mafia 영문 소개문·단체사진 키 이관, AI-Supremacy 개인샷 70장). remotion-bo 에는 eslint 설정이 없어(`eslint.config.*` 부재) 그 앱의 검사 통과는 주장할 수 없다. Phase 4b 가 web-bo 이식 경로에 둔 검사 규칙 임시 예외는 이번에 걷지 않았다 — 효과 구조를 다시 짜야 하고 그것이 곧 편집 감각 회귀 위험이다.
- 26.07.25 **Phase 4b 완료 — web-bo 편집 화면 본체 이식**(출간 배관은 5단계).
  - **복사 이식 + 데이터층만 교체.** 편집기 본체 56파일 11,889줄을 `sw/web-bo/src/components/factions/` 로 그대로 옮겼고, 딸린 부품 24파일 3,057줄(`components/{scenario-voice,VoiceTimingEditor,scenario/EditorPanel,TaskPanel}`)도 **원본과 같은 자리**에 뒀다 — 팩션 파일들이 `../../../../../../scenario-voice/…` 처럼 상대 경로로 부르므로 자리를 맞추면 import 를 한 줄도 고칠 필요가 없다. remotion-bo 는 이 단계에서 **한 글자도 고치지 않았다**(git status 0).
  - **`scenario-voice` 는 폐포만 남겼다** — 37파일 중 팩션이 실제로 부르는 4개 진입점의 폐포 11파일만. 나머지는 서재 탐방 편집기 전용이라 `EpisodeEditor`·`episode-context` 를 물고 들어왔다. 남은 한 곳(`ExpandedVoicePanel/types.ts` 의 `EpisodeData`)은 열린 모양으로 바꿨다.
  - **데이터층 교체점 4곳**: ① 대본 불러오기 `fetch(/api/{시리즈}/episodes/{편})` → 서버 액션 `loadFactionScript` ② 저장 → `saveFactionScript`(기준 시각 대조·자동 내보내기). 공용 편집기 뼈대(`shared/bo/editor` 의 `useEpisodeEditor`)에 **`persist` 선택 인자를 신설**해 저장 실행부만 갈아끼웠다 — remotion-bo 는 인자를 안 주므로 예전 동작 그대로다(복사 금지 원칙 유지). ③ 창구 주소에서 `faction-` 접두를 떼 `/api/{시리즈}/{voice,cards,card-export,music,sfx,comment}` 로. 시리즈 이름이 `faction` 이라 `/api/faction/…` 로 맞는다. ④ 화면 주소 뿌리 `/{시리즈}/{편}/…` → `/factions/{편}/…`.
  - **사진 창구는 무수정** — P4a 에서 주소를 `/api/faction/media` 로 잡아 둔 판단이 맞았다. 공용 사진 부품에 `series='faction'` 만 넘기면 그대로 붙는다(실측).
  - **창구 22종 추가 이식** — 렌더·유튜브 4(`render`·`youtube/{status,upload,sync}`) · 카드·음악·자산 10(`cards/[편]`·`card-export`·`music`+곡서빙·`sfx`·`comment/[편]`·`faction-avatar`·`status`·`rm-asset`) · 음성 합성·셀럽 9(`voice/{gemini,gemini-v3,elevenlabs}/preview`·`elevenlabs/{voices,voice-history,voice-notes}`·`celebs/{[slug],[slug]/voice,exists}`). 전부 시리즈 판별을 걷어내고 팩션 분기만 남겼으며, 에피소드 데이터는 파일이 아니라 **DB 조립기**(`lib/faction-episode-data`)로 읽는다. 렌더·업로드처럼 파일을 읽는 스크립트를 돌리기 직전에는 `ensureFactionExport` 로 파일을 DB 와 맞춘다.
  - 🔴 **저장이 음성 길이를 자리에 붙여 두던 결함을 실측으로 잡았다(§11 R2 그 자체).** P4a 의 저장 규칙이 "DB 의 기존 길이를 **순번 기준으로** 유지"였는데, 인물 순서를 바꾸면 음원 파일은 인물을 따라 옮겨 가고 길이만 자리에 남아 **컷 길이가 다른 인물 값으로 틀어졌다**(왕복 검사에서 `epithetDuration` 이 엉뚱한 인물에게 붙는 것으로 드러났다). 조회 기준을 **사람(연결 키 없으면 이름)**으로 바꿨다. 같은 사람이 한 편에 두 번 나오는 경우(오디세우스)는 나온 순서로 짝짓는다. 조립기 콜백에 인물을 함께 넘기도록 `DurationLookup` 을 확장했다.
  - **음성 길이 사람 입력 경로는 없다**(§7 금기 확인) — 편집기가 길이를 건드리는 세 지점 전부 **음원에서 실측한 값**을 쓴다(저장 응답·다듬기 확정·디스크 길이 자동 채움). 사람이 숫자를 적는 칸은 없다.
  - **출간 화면은 옮겼지만 끄고 뒀다** — 스위치(`PUBLISH_READY=false`) + "다음 단계" 안내 + 버튼 비활성. 없는 창구를 찔러 붉은 오류가 뜨면 고장으로 오해하므로 조회 자체를 하지 않는다.
  - **카드 출고가 사진을 못 받는 문제를 미리 막았다** — 카드 출고는 서버가 아니라 **헤드리스 브라우저**가 사진을 가져가고 그 프로세스엔 로그인 정보가 없다. 한 번짜리 열쇠를 사진 주소의 앞 토막(`/api/rm-asset/_k/<열쇠>/…`)에 실어 통과시킨다(`lib/faction-render-token`, 메모리 보관·30분). 물음표 뒤가 아니라 경로인 이유는 렌더 쪽이 `기준주소/상대경로` 로 이어 붙이기 때문이다. 엉뚱한 열쇠는 401(실측).
  - **카드 출고의 파일 맞추기는 뺐다** — 출고 스크립트(`faction-card-still.ts`)를 직접 열어 확인한 결과 manifest 만 읽고 `faction-data.json` 은 열지 않는다. 그대로 두면 필요 없는 이유로 출고가 400 으로 멈춘다.
  - **셀럽 검색 창구를 합쳤다** — 팩션 검색창은 배열, 기존 web-bo 화면은 `{celebs}` 를 기대해 그대로면 검색 결과가 항상 0건이었다. 응답 모양을 `{celebs}` 하나로 통일하고(`limit`·`includeFiction`·연결 키 검색·직함·국적 추가) 팩션 검색창이 그 모양을 읽게 했다. **"이미 나온 편" 표시는 폴더 훑기에서 DB 조회로 바뀌었다**(이제 등장 인물이 DB 에 있다).
  - **색 토막 치환** — 두 앱의 `@theme` 를 실측 대조해 실사용 44종을 A(그대로 26)·B(투명도로 틴트화 10)·C(토큰 신설 4)로 갈랐다. 원본이 밝은 배경 앱이라 `bg-danger` 가 '연한 분홍 배경'이었는데 이 앱에선 같은 이름이 '진한 원색'이다 — 배경·테두리로 쓰인 것만 `bg-danger/10` 식으로 바꾸고, 글자색(`text-danger-text` 등)은 토큰을 새로 세워 이름을 유지했다. 신설: `bg-hover`·`text-dim`·`info`·`info-text`·`{danger,warning,success}-text`·`border-active`. 덤으로 **정의 없이 쓰이던 `bg-bg-tertiary`(기존 화면 4곳)도 함께 세웠다.** ⚠ 클래스 토막을 '이름 단위'로 인식해 **한 번만** 바꿔야 한다 — sed 를 겹쳐 돌려 `border-danger/40§TEXT§/40` 처럼 깨뜨린 뒤 원본에서 다시 복사했다.
  - **글자·선 보정은 가지 안쪽으로 좁혔다** — 원본 앱은 아주 작은 글자를 화면 전체에서 키우는 전역 보정을 깔고 있고 팩션의 촘촘한 표가 거기에 기대어 읽힌다. 그걸 web-bo 전체에 깔면 다른 화면이 다 바뀌므로 `.faction-ui` 클래스 안쪽에만 적용하고 편집기 뿌리에 그 클래스를 줬다.
  - **검사 규칙 예외를 한 곳에 모았다** — 옮겨온 코드가 이 앱의 더 엄격한 규칙에 19+6곳 걸린다(느슨한 타입·효과 안 상태 변경·렌더 중 참조 대입). 규칙에 맞추려면 효과 구조를 다시 짜야 하고 그게 곧 편집 감각 회귀 위험이라, `eslint.config.mjs` 에 **이식 경로 한정 예외**를 사유와 함께 두고 안전한 것(느슨한 타입 검사 1건·`prefer-const` 1건)만 실제로 고쳤다. 임시 예외임을 주석에 못 박았다.
  - **web-bo 의존성 추가** — `@feelandnote/remotion`·`@remotion/player`·`remotion`(카드 미리보기가 렌더 저장소의 화면 부품을 그대로 띄운다) + `@google/genai`(제미니 미리듣기). 저장소에 이미 있던 버전이라 내려받기 없이 링크만 됐다. `transpilePackages` 에 `@feelandnote/remotion` 추가. `.env` 에 제미니 키 100개를 옮겼다(미리듣기가 그 키로 목소리를 만든다).
  - **검증 실측(PayPal-Mafia 12항목 전부 통과)**: 대본 조립 → 인물 글 수정 저장 → DB 반영 → 그 밖의 내용 차이 0 → 자동 내보내기·파일 반영 → **자리 맞바꾸기(음원 크기 307,134↔247,182 실제 교차 + `data.timing.p1.ko.json` 이름표도 교차)** → 순서 변경 저장 후 `faction:verify` 6종 통과 → **원상 복구(음원·발화 시각·대본 모두 처음 상태와 차이 0)**. 대형 편 열람 smoke: AI-Supremacy 세력 11·인물 70(활성 67)·컷 100·롱폼 배치 10, Path-of-Kings-East 세력 3·인물 39 — 저장 없이 계산까지 정상.
  - tsc 3종(web-bo·remotion-bo·remotion) 0 · eslint 이식 경로 0 · `next build` 로 창구 29종·화면 6종 컴파일 확인 · 미로그인 접근은 화면·창구 전부 차단(이미지 확장자 우회 경로도 401) · `faction:verify --all` 22/23(실패 1편은 4a 에서 적은 `Gods-Greek-Compact` 데이터 드리프트 그대로).
  - ⚠ **못 한 검증**: 브라우저 자동화 도구가 이 환경에 없어 **로그인한 화면에서의 하이드레이션·콘솔 오류 확인을 못 했다.** 로그인 게이트를 우회하지 않기로 해서(진입 검사를 약화시키지 않는다) 화면 단 검증은 컴파일·주소 응답까지만이다. 편집 화면 3탭·사진 풀·음성 재생·카드 화면은 **사람이 로그인해 한 번 열어봐야 한다.**
  - 남은 것(5단계): 출간 배관(`faction-sync`) 이동·개조, `series-registry` 스위치, remotion-bo 팩션 87파일 삭제, 문서 갱신. 그때 이 단계에서 둔 검사 규칙 예외와 출간 스위치를 함께 걷어낸다.
- 26.07.25 **Phase 4a 완료 — web-bo 서버 기반**(편집기 UI 본체는 4b).
  - **원자 저장 RPC** `faction_replace_episode(p_folder, p_episode, p_groups, p_clusters, p_people, p_parts, p_expected_updated_at)` 적용(마이그레이션 `faction_replace_episode_rpc`). security definer, 실행 권한 `service_role` 만(실측 acl `postgres=X | service_role=X`). **행 분해는 TS 담당, RPC 는 꽂기만** — `jsonb_populate_recordset(null::faction_groups, …)` 로 테이블 행 모양에 그대로 채워 컬럼이 늘어도 SQL 무수정. 하위 FK 는 TS 가 uuid 를 미리 만들어 맺고, 알 수 없는 `episode_id` 만 RPC 가 채운다.
  - **조립·기록 코어 shared 화** — `packages/shared/src/lib/faction-assemble.ts`(DB→FactionScript 조립 + FactionScript→행 분해) · `packages/shared/src/bo/faction-export.ts`(마커·손 편집 가드·백업·등록 목록). CLI `scripts/faction/export.ts` 는 얇은 래퍼로 축소. **동작 불변을 바이트로 증명** — 옛 코드와 새 코드의 조립 결과를 23편 전량 대조해 전부 동일(`85224 vs 85224` 식). `faction:verify --all` 은 22/23(실패 1편은 아래 참조).
  - **shared 추가 승격** — `bo/voice-age`·`bo/voice-normalize`(remotion-bo 에서 git mv, 팩션·서재 탐방 4곳 import 교체). 팩션 음성 저장/연령 창구가 web-bo 로 오면서 두 앱이 같은 부품을 봐야 했다.
  - **web-bo 액션** `src/actions/admin/factions/{episodes,script,export,publish}.ts`. 저장 절차는 `src/lib/faction-save.ts` 로 빼 인증 밖에 뒀다 — 액션 안에 두면 Next 밖에서 부를 수 없어 검증이 불가능하다.
  - **fs 라우트 14종** — `api/faction/{media,media/folder,media/[episode]/[...path],asset/[...path],voice(+[episode]·[file]·save·age·reorder·timing·analyze),task,task/[id]}`. 전부 `FACTION_LOCAL=1` 가드(미설정 503+사유) + **자체 관리자 확인**.
  - **주소를 `api/faction-media` 대신 `api/faction/media` 로 잡았다** — P3 에서 올린 공용 부품이 `/api/${series}/media`·`/media/folder`·`/faction-avatar` 를 하드코딩해 부른다. 시리즈 이름 `faction` 을 첫 토막에 두면 그 부품을 한 줄도 고치지 않고 쓴다. 하이픈으로 잡으면 4b 가 공용 부품을 포크해야 해서 §8 「복사 금지」와 충돌한다.
  - 🔴 **진입 검사가 이미지 확장자를 통째로 건너뛴다** — `sw/web-bo/src/proxy.ts` 의 matcher 가 `.*\.(svg|png|jpg|jpeg|gif|webp)$` 를 제외한다. 즉 `/api/faction/asset/x/y.png` 는 로그인 검사를 지나쳐 라우트에 곧바로 닿는다(실측 확인). 그래서 라우트마다 `guardFactionRoute()`(로컬 가드+관리자 확인)를 첫 줄에 두고, 경로 잠금은 `lib/faction-asset.ts` 로 분리했다. **둘 중 하나만 있으면 뚫린다.** 같은 함정으로 이미지 프록시가 무방비였던 이력이 있다(AGENTS.md).
  - **검증 실측(PayPal-Mafia)**: ① 조립기 ≡ CLI 내보내기(25,550 bytes, 차이 0) ② 저장 왕복 동일(세력 4·묶음 4·인물 14·편댓글 1, 차이 0) ②-b 음성 길이 15건 보존 ③ 어긋난 기준 시각 거부 ④ 자동 내보내기 → 마커 기록·파일 ≡ DB·원본 백업 보존 ⑤ **없는 묶음을 가리키는 인물 행을 섞으니 FK 위반으로 전체 롤백**(세력 4→4·묶음 4→4·인물 14→14·updated_at 불변 — 부분 반영 0) ⑥ 이후 `faction:verify --episode PayPal-Mafia` 6종 전부 통과. 경로 이탈 12종 전량 차단(뿌리 밖 해석 0), 확장자 화이트리스트가 json·txt·확장자 없음 거절. tsc 3종 0 · eslint 0 · `next build` 로 라우트 14종·화면 2종 컴파일 확인.
  - **음성 길이 소유권(§7) 강제 지점** — 저장 시 DB 값이 있으면 그것을 신뢰하고 편집기가 보낸 값으로 덮지 않는다. DB 가 비고 대본에 있을 때만 채운다(`lib/faction-save.ts` 의 `loadExistingDurations`). 저장 창구 응답의 길이는 화면 표시용이고 DB 반영은 `faction:durations-pull` 이 wav 실측으로 한다.
  - ⚠ **`Gods-Greek-Compact` 는 파일이 DB 보다 새롭다** — 파일 mtime 26.07.25 19:35 vs DB 행 18:59(KST), 대사 148곳이 다르고 파일 쪽 `quoteOrigin` 이 "GPT-5.6 신규 작성(2026-07-25)"이다. 즉 Phase 1 이관 뒤 사람이 JSON 을 더 고쳤다(§11 R3 그 자체). **이번 작업의 회귀가 아니다**(옛·새 조립기 바이트 동일로 증명). 내보내기는 발효 전 가드가 이 편을 막으므로 되돌림 사고는 안 난다. 흡수하려면 `pnpm faction:import -- --episode Gods-Greek-Compact` 를 사람이 판단해 실행해야 한다 — 임의로 실행하지 않았다.
  - 남은 것(4b): 편집기 본체 56파일 이식과 배선. 순서 변경 흐름은 `api/faction/voice/[episode]/reorder` 를 부르는 기존 계약을 그대로 유지한다(§11 R2).
- 26.07.25 **Phase 3 완료** — 공용 부품을 `packages/shared/src/bo/` 로 승격(git mv 로 이력 보존). 실측 교훈 두 가지. ① **4종만 옮기면 컴파일이 안 된다** — `media`·`editor` 는 아이콘, `voice` 는 파형 재생기·음성 유틸·합성 설정 타입·알림음에 매달려 있었다. 의존 폐포(icons·voice-utils·audio-wave-player·time-ruler·gain)까지 올려 22파일 4,425줄이 됐다. ② **`next/navigation` 을 쓰는 부품이 있어 shared 가 next 를 알아야 한다** — peerDependency(next·react-dom, optional) + 타입 확인용 devDependency 로 두고 버전을 앱과 일치시켰다(pnpm 저장소 같은 항목으로 해소돼 인스턴스가 갈리지 않음을 실측). remotion-bo `next.config.ts` 의 transpilePackages 에 shared 추가. 시리즈 이름을 아는 `mediaRootOf` 만 앱에 남겼다(`lib/media-root.ts`). 렌더 저장소 위치는 `REMOTION_ROOT` 로 옮길 수 있게 했다(`bo/remotion-root`).
- 26.07.25 설계 확정, 스키마 적용, Phase 1 완료(이관 23편·왕복 검증 23/23·검증기 반증 시험 통과). 부수 발견: `_backup_virtual_monologue_{ko,en}_v1` 2테이블 RLS 미적용으로 anon 전량 노출(각 1,692행) — 즉시 조치 대상.
