# 팩션 완전 통합 (faction-unification)

> 실측 대조: 26.07.25 — 23개 에피소드 JSON 전수(537 인물 배치)·faction-data.json 읽기/쓰기 주체 21곳 전수·web-bo 구조·DB 실측 기반 설계. Phase 1(스키마·이관·왕복 검증)은 26.07.25 완료 — 하단 진행 로그 참조.
> **이 문서가 `faction-db-sync.md`(다리 방식)를 대체한다.** 다리(양방향 동기화)는 폐기 개념이고, 목표는 집 하나다. faction-sync 코드는 이관·이미지 배관 도구로 개조되어 살아남는다.

## 확정 방향 (유저 지시 — 재론 금지)

- **텍스트·구성 데이터의 단일 원천 = Supabase DB.** 로컬 `faction-data.json`은 렌더용 빌드 산출물로 강등(수정 금지).
- **편집 화면 = web-bo 하나.** 팩션에 관해 remotion-bo는 **렌더·유튜브 버튼까지 포함해 전체 폐기**(26.07.25 결정 — "출고만 remotion-bo 잔류" 절충안은 기각, 플랫폼 소거가 목적). 담화·북리커맨드는 후속 단계에서 같은 길을 밟아 remotion-bo를 최종 소멸시킨다.
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
- `faction_episodes` — folder(unique)·title(+en)·logline(+en)·status(todo/live/done)·registered(現 _episodes.json)·sort_order·longform_layout(jsonb, 항목 {groupId:uuid}|{era}|{cut}|{chapter} — 내보내기가 인덱스로 환원)·data(jsonb)
- `faction_groups` — episode_id·position(1-based = 음성 파일명 F{pos:02d})·name(+en)·color·**tag_id(celeb_tags N:1)**·part·disabled·longform_only·data. unique(episode_id, position)
- `faction_clusters` — group_id·position(C{pos:02d})·label(+en)·image·disabled·longform_only·data. unique(group_id, position)
- `faction_people` — cluster_id·position(P{pos:02d})·name(+en)·slug·celeb_id(profiles, nullable)·org·mythical·epithet(+en)·lines(+en, text[])·image·quote(+en)·quote_chunks(+en)·quote_origin·**quote_duration/epithet_duration(파이프라인 소유)**·disabled·longform_only·**mined(jsonb 크기 격리)**·data. unique(cluster_id, position)
- `faction_episode_parts` — (episode_id, part) PK·comment(現 comment.p<N>.txt)

RLS: 5테이블 전부 admin(role admin|super_admin) 전용 4정책. 서비스(web)는 celeb_tags만 읽는다 — 제작 데이터 비공개가 의도적 차이.

**position을 UUID로 안 바꾸는 이유**: 음성 파일명(`voice-names.ts:14`)·타이밍 키·받아쓰기 키·SRT stem이 전부 위치 기반. 바꾸면 wav 443개 개명 = 음성 파이프라인 파손 1등급. position + unique로 강제, 재배치 시 파일 3종 동기(§8).

## 4. celeb_tags와의 경계

```
제작(비공개)                                   서비스(공개)
faction_episodes                               celeb_tags (40행, slug unique 인덱스 26.07.25)
 └ faction_groups ─tag_id(N:1)──────────▶       · name/color/slug/team_images(R2 그룹샷)
    └ faction_clusters                         celeb_tag_assignments (unique(celeb,tag))
       └ faction_people ─celeb_id─┐   투영       · short_desc/long_desc(사람이 다듬음)
            quote·음성설정·컷효과   │ ─────▶      · sort_order · spotlight_image_url(R2 개인샷)
            epithet·lines ────────┘            profiles — 불가침
```

- 투영은 제작→서비스 **단방향·채움 전용**(force로만 덮음). 상위 그룹 계층은 web 코드 상수 유지(범위 밖).
- **배치 충돌 규칙**: 같은 celeb·같은 tag에 여러 배치 → `(group.position, cluster.position, person.position)` 최소 배치 채택. sort_order는 태그 관통 전역 순번(기존 `assignTagOrder` 유지).
- 이미지 R2 출간: 기존 `faction-sync/{r2,image,manifest}.ts` 배관 그대로(불변 캐시 + ?v= 정책 적용됨).

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

① **export 병합(영구 안전망)**: DB 값 null이면 기존 JSON의 quoteDuration/epithetDuration 이어받음(Phase 1 export에 구현됨). ② **역흡수**: `pnpm faction:durations-pull` — wav 실측 길이를 DB UPDATE(buildVoiceJobs·measureWavDuration 재사용). faction-voice-sync 스킬 순서에 추가. ③ **감시**: `voice:faction --verify`에 DB↔JSON duration 열 추가. **금지: 편집기가 quoteDuration을 사람 입력으로 받는 것**(파이프라인 소유. 현행 BO save 응답 기록 경로는 DB UPDATE로 전환).
`gotchas.md` 폐기 3방향(wav2vec2 원고 직접·silence 분할·자동 청크 분할) 재제안 금지.

## 8. web-bo 이식

- **하이브리드**: 공유 부품 4종(`media` 1,304 · `editor` 329 · `voice` 741 · `episode-store` 366 = 2,740줄, 담화 공용)은 `packages/shared` 승격(복사 금지 — 갈라짐 이력 있음). **완료 26.07.25 — `packages/shared/src/bo/`, 실측 승격량은 의존 폐포 포함 3,900여 줄(§10 Phase 3 참조).** 편집기 본체(56파일 11,912줄)는 **복사 이식 + 데이터층만 재작성**(~1,500줄). `FactionPreview`는 DOM 목업(@remotion/player 미사용)이라 이식 용이. Task Queue(`runTask` 계열)도 shared 승격(렌더 버튼용).
- 라우트: `(admin)/factions/…`(목록·[episode]/[lang]/[tab]·cards·publish), 액션 `actions/admin/factions/{episodes,script,people,export,publish}.ts`, 로컬 fs 라우트(`faction-media`·`faction-asset/[...path]`(api/voice 동형, `..` 차단)·`faction-voice` 6종·`faction-task`). 인증은 (admin)/layout.tsx가 담당. 사이드바 menuGroups 「세력도」 — nextjs-page 스킬 규약.
- **부분 저장 전환**: savePerson/saveCluster/saveGroup/saveEpisode(핫 컬럼 + `data || $patch` merge). **reorder 액션이 최난점** — DB position swap + wav·timing 키·word-timings targets 3중 이동 + 실패 시 롤백. 세력·클러스터 재배치는 확인 모달 + dry-run.
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
| 2 | export 발효: `_generated` 마커·checksum 가드·`.export-backup/`·`_episodes.json` 재생성·durations-pull·verify duration 열 | |
| 3 | 공유 부품 4종+Task Queue shared 승격(~2,900줄, import ~60곳) | **완료 26.07.25** — `packages/shared/src/bo/` 22파일 4,425줄. 4종만으로는 컴파일이 안 돼 의존 폐포까지 올렸다(icons·voice-utils·audio-wave-player·time-ruler·gain + `EleSettings`·`GenEngine`·`TempPreview`·`playDing`). remotion-bo 의 shared 참조 168줄/109파일, 껍데기 재export 0, tsc 3종(remotion-bo·remotion·web-bo) 0, 화면 5종 브라우저 실측(콘솔 오류 0) |
| 4 | **web-bo 편집기**(라우트+액션 ~1,200줄·fs 라우트 ~600줄·56파일 이식+데이터층 ~1,500줄·reorder 원자성 ~250줄) — PayPal-Mafia 선검수 | |
| 5 | faction-sync 이동·개조 + series-registry 스위치 + 87파일 삭제 + 문서 6종 갱신 | |
| 6(선택) | 카드뉴스 person-cards/group-cards → data.card 이관(이름 키→UUID) | |

## 11. 위험 상위

- **R1 음성 파이프라인 파손(최상)** — 무수정 원칙 + export 병합 안전망 + `--verify` 게이트.
- **R2 재배치 시 wav·타이밍 오배치(최상)** — reorder 3중 동기 재현 + 원자성 + Phase 4 검수 1순위.
- **R3 유저 WIP 충돌(최상)** — Phase 0 커밋 정착이 P3·P4 착수 조건.
- R5 미지 필드 소실 — 블랙리스트 split + 왕복 검증(사문 필드 생존 포함). R7 JSON 손 편집 — checksum·drift 감시·문서 명기. **R8 DB 이관 사문화 선례**(remotion_images 폐기 이력) — Phase 4까지 가야 통합 성립, P1~2 방치 금지. R11 컴포지션 ID 변동→업로드 키 오염 — factionVariants 검증. R12 배치 충돌 — 최소 위치 규칙.

## 12. 미확인

web-bo 프로덕션 배포본 유무 · remotion-bo 디자인 토큰 목록 · 사문 필드 최종 폐기 여부(현재 보존) · fiction 티어 vs mythical 98건 정합.

## 진행 로그

- 26.07.25 **Phase 3 완료** — 공용 부품을 `packages/shared/src/bo/` 로 승격(git mv 로 이력 보존). 실측 교훈 두 가지. ① **4종만 옮기면 컴파일이 안 된다** — `media`·`editor` 는 아이콘, `voice` 는 파형 재생기·음성 유틸·합성 설정 타입·알림음에 매달려 있었다. 의존 폐포(icons·voice-utils·audio-wave-player·time-ruler·gain)까지 올려 22파일 4,425줄이 됐다. ② **`next/navigation` 을 쓰는 부품이 있어 shared 가 next 를 알아야 한다** — peerDependency(next·react-dom, optional) + 타입 확인용 devDependency 로 두고 버전을 앱과 일치시켰다(pnpm 저장소 같은 항목으로 해소돼 인스턴스가 갈리지 않음을 실측). remotion-bo `next.config.ts` 의 transpilePackages 에 shared 추가. 시리즈 이름을 아는 `mediaRootOf` 만 앱에 남겼다(`lib/media-root.ts`). 렌더 저장소 위치는 `REMOTION_ROOT` 로 옮길 수 있게 했다(`bo/remotion-root`).
- 26.07.25 설계 확정, 스키마 적용, Phase 1 완료(이관 23편·왕복 검증 23/23·검증기 반증 시험 통과). 부수 발견: `_backup_virtual_monologue_{ko,en}_v1` 2테이블 RLS 미적용으로 anon 전량 노출(각 1,692행) — 즉시 조치 대상.
