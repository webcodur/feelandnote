# Web BO

> **최종 실측 체크: 26.07.16** — `(admin)` 라우트 52개 전수 실측 + 적대적 재검증, 결함 조치 반영

서비스 운영용 관리자 백오피스다. 실제 서비스(web)의 데이터 — 셀럽, 유저, 콘텐츠, 기록, 커뮤니티, 게임 점수 — 를 조회·편집·제재하는 화면 모음이며, Supabase를 단일 데이터원으로 삼는다.

같은 층위의 다른 BO와 역할이 다르다. 혼동하지 않는다.

| 프로젝트 | 포트 | 역할 | 데이터원 |
| --- | --- | --- | --- |
| **web-bo** | 3001 | **서비스 운영.** 셀럽·유저·콘텐츠·커뮤니티 관리 + **세력도 영상 제작**(26.07.25 이관) | Supabase |
| remotion-bo | 3003 | 영상 관리 대시보드. 서재 탐방·가상 담화만 남았다(세력도는 폐기·이관) | 파일시스템(JSON) |
| audio-bo | 3005 | 로컬 음성 작업실. 받아쓰기·화자 학습·합성 | D드라이브 |

remotion-bo는 [remotion-bo 기획서](./remotion-bo-plan.md), audio-bo는 [Audio BO](./audio-bo.md)를 참조한다.

## 실행

```bash
pnpm dev:bo
```

- 화면: `http://localhost:3001`
- 빌드는 webpack 고정이다(`next dev -p 3001 --webpack`, `next build --webpack`).

## 접근 권한

`(admin)` 그룹의 모든 화면은 레이아웃에서 두 단계로 막는다. 로그인하지 않았으면 `/login`으로 보내고, 로그인했더라도 `profiles.role`이 `admin` 또는 `super_admin`이 아니면 역시 `/login`으로 보낸다. 개별 화면은 권한을 다시 검사하지 않는다.

`/login`은 Supabase 이메일·비밀번호 인증을 사용하며 성공 시 `?redirect` 값 또는 `/users`로 이동한다.

단 **창구(API)는 화면 검사에 기댈 수 없다.** `src/proxy.ts`의 matcher가 이미지 확장자로 끝나는 주소를 제외하므로 세력도 자산 창구는 라우트마다 스스로 관리자 확인을 한다(위 [세력도](#세력도) 절).

## 화면 구성

전체 페이지는 52개다. 이 중 11개는 화면이 없는 리다이렉트 통로이므로(아래 [정리 대상](#정리-대상) 참조) 실제 화면은 41개다. **이 수치는 26.07.16 실측이라 26.07.25에 붙은 세력도 화면은 빠져 있다.**

왼쪽 메뉴는 `src/components/layout/Sidebar.tsx`의 `menuGroups` 배열이 단일원천이며 8개 묶음 26개 라우트로 나뉜다(26.07.25 세력도 1건 추가). 상세 화면(`[id]`·`[slug]`)은 목록에서 눌러 들어가므로 메뉴에 없고, `/celebs/new`도 셀럽 목록 안의 버튼으로만 들어간다.

### 대시보드

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/` | 대시보드 | 유저·콘텐츠·감상·기록 총계, 콘텐츠 유형별 비율, 최근 가입자 5명, 최근 활동 10건. 읽기 전용 | `profiles`, `contents`, `records`, `user_contents`, `activity_logs` |

### 셀럽

셀럽 관련 데이터의 생성·검수 파이프라인 전반을 다룬다. 각 항목의 작성 기준과 에이전트 규칙은 [셀럽 파이프라인](./celeb/celeb-pipeline.md)에 있다.

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/celebs` | 셀럽 관리 | 셀럽 목록 조회·검색·필터(상태/직군/등급)·정렬·페이지네이션. 하위 도구 허브 | `profiles` (`profile_type='CELEB'`) |
| `/celebs/new` | 셀럽 계정 생성 | 신규 셀럽 생성 폼 | `profiles` |
| `/celebs/[slug]` | (셀럽 닉네임) | 단건 상세·편집. 기본정보·영향력·감상철학·태그 + 페르소나·고유대사·계정정보 | `profiles`, `celeb_dialogues`, `celeb_influence`, `celeb_tag_assignments` |
| `/celebs/[slug]/contents` | (셀럽 닉네임) | 셀럽에 등록된 콘텐츠 목록·필터·추가·내보내기, 하단에 수집기 | `user_contents`, `contents`, `content_locales` |
| `/celebs/[slug]/contents/collect` | (수집) | 콘텐츠 수집 전용 화면. 구현은 `members/[id]/contents/collect/CollectView`에 있다 | `user_contents` |
| `/celebs/titles` | 셀럽 수식어 편집 | 전체 셀럽 수식어 일괄 편집 | `profiles` |
| `/celebs/titles/[slug]` | (닉네임) 수식어 편집 | 단건 수식어 수정 | `profiles` |
| `/celebs/professions` | 셀럽 직군 편집 | 전체 셀럽 직군 일괄 편집 | `profiles` |
| `/celebs/professions/[slug]` | (닉네임) 직업 편집 | 단건 직업 수정 | `profiles` |
| `/celebs/tags` | → 리다이렉트 | `/factions`로 보낸다. 도감 테마 관리는 26.07.25에 세력도 화면으로 흡수됐다 | — |
| `/celebs/journeys` | 셀럽 감상 여정 편집 | `cultural_journey` 일괄 편집, 50건 단위 | `profiles` |
| `/celebs/journeys/[slug]` | (닉네임) 감상 철학 편집 | 단건 감상 철학 집중 수정 | `profiles` |
| `/celebs/vectors` | 페르소나 분석 | 덕목·능력·성향 16개 축 벡터 열람(레퍼런스 패널 + 대시보드) | `celeb_persona` |
| `/celebs/vectors/[slug]` | (닉네임) 페르소나 분석 | 단건 페르소나 축 확인 | `celeb_persona` |
| `/celebs/influence` | 영향력 평가 | 6개 영역 + 통시성 영향력 대시보드 | `celeb_influence` |
| `/celebs/influence/[slug]` | (닉네임) 영향력 평가 | 단건 영향력 축 확인 | `celeb_influence` |
| `/celebs/voice-gen` | 대사/음성 워크스페이스 | 고유 대사 작성, 말투(`speech_tone`)·속도 설정, ElevenLabs 음성 생성 | `celeb_dialogues`, `profiles` |
| `/celebs/voice-gen/[slug]` | 대사/음성 워크스페이스 | 위와 동일하되 특정 셀럽 선택 상태로 진입 | `celeb_dialogues`, `profiles` |
| `/celebs/stats` | 셀럽 통계 | 총수·활성률·직군 수·국적 수 요약, 직군 분포, 팔로워 TOP 10, 콘텐츠 수 TOP 10, 최근 등록 | `profiles`, `user_contents`, `user_social`, `user_scores` |

관련 문서: 태그 체계는 [celeb-tag-system.md](./celeb/celeb-tag-system.md), 영향력은 [celeb-4-influence.md](./celeb/celeb-4-influence.md), 페르소나는 [celeb-5-persona.md](./celeb/celeb-5-persona.md), 감상 여정은 [celeb-3-cultural-journey.md](./celeb/celeb-3-cultural-journey.md), 대사·말투는 [celeb-speech.md](./celeb/celeb-speech.md), 콘텐츠 수집은 [celeb-2-content-collector.md](./celeb/celeb-2-content-collector.md), 콘텐츠 검증은 [celeb-content-audit.md](./celeb/celeb-content-audit.md), 영문화는 [celeb-i18n.md](./celeb/celeb-i18n.md)를 본다. 스키마는 [db-celeb.md](./db-celeb.md)가 단일원천이다.

### 유저

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/users` | 유저 관리 | 일반 유저 목록(검색·상태·역할·정렬, 20건 단위) | `profiles` (`profile_type='USER'`) |
| `/users/[id]` | 유저 상세 | 프로필·역할·상태·정지 사유·콘텐츠/팔로워/점수 표시, 정지·해제·역할 변경 등 제재 실행. 셀럽이면 404 | `profiles` |

셀럽과 유저는 같은 `profiles` 테이블을 쓰며 `profile_type` 값으로만 갈린다. 유저를 셀럽으로 승격하는 동작(`promoteToCeleb`)은 이 컬럼을 `USER`에서 `CELEB`으로 바꾼다.

### 콘텐츠

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/contents` | 콘텐츠 관리 | 콘텐츠 목록(제목·제작자 검색, 유형 필터). 도서는 한국어·영문 판본 카드를 나란히 띄워 썸네일 출처까지 진단 | `contents`, `content_locales`, `user_contents` |
| `/contents/[id]` | (콘텐츠 제목) | 메타·판본·제휴링크 표시, 수정·삭제·제휴링크 관리, 등록 사용자·관련 기록 | `contents`, `content_locales`, `user_contents`, `records` |
| `/records` | 기록 관리 | 감상 기록(노트·인용) 목록, 유형·공개범위 필터 + 본문 검색 | `records`, `profiles`, `contents`, `content_locales` |
| `/records/[id]` | 기록 상세 | 본문·작성자·연결 콘텐츠·반응 수·출처 표시, 공개범위 변경·삭제, 댓글 목록 | `records`, `profiles`, `contents` |
| `/notes` | 노트 관리 | 노트 목록(24건 단위), 공개설정 필터와 설정별 개수, 섹션 완료 여부 | `notes`, `note_sections`, `profiles`, `contents` |
| `/playlists` | 플레이리스트 관리 | 플레이리스트 목록, 콘텐츠 유형·공개여부 필터, 항목 수 통계 | `playlists`, `playlist_items`, `profiles` |

도서 메타 출처 규칙(네이버·OpenLibrary만 허용)은 [external-services.md](./external-services.md)를 따른다. 스키마는 [db-core.md](./db-core.md)에 있다.

### 세력도

> 26.07.25 신설 — 팩션(세력도) 영상의 제작 화면이 remotion-bo에서 이곳으로 옮겨 왔다. remotion-bo의 팩션 구역은 전량 폐기됐고 그 주소는 404다.

영상 시리즈 「세력도」의 **텍스트·구성 단일 원천은 Supabase 5테이블**(`faction_episodes`·`faction_groups`·`faction_clusters`·`faction_people`·`faction_episode_parts`)이다. 렌더 엔진이 읽는 `sw/remotion/public/factions/<편>/faction-data.json`은 **저장할 때 DB에서 만들어 내는 산출물**이며 직접 편집하지 않는다(첫 키 `_generated` 마커의 checksum이 어긋나면 내보내기가 중단된다). 시리즈 자체의 SSoT는 [faction.md](./remotion/faction.md), 통합 설계는 [faction-unification.md](./remotion/faction-unification.md)다.

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/factions` | 세력도 | **표 2개.** 위=「영상 편」(유튜브로 나가는 제작 데이터): 제목·상태(todo/live/done)·렌더 편성·세력 수·인물 수·연결 테마 + 생성·복제·이름 변경·삭제·내보내기. 아래=「도감 테마」(서비스 세력도감 진열분, `celeb_tags` 40종): 테마명(위계)·인물 수·도감 노출·단체샷/개인샷·연결 영상 편·순서(끌어 옮기기). 두 표는 `components/factions/FactionTable.tsx` 를 함께 쓴다(26.07.26에 카드형·줄형 혼재를 표로 통일). 목록은 폴더가 아니라 DB에서 센다 | `faction_episodes`, `celeb_tags` |
| `/factions/themes/[tagId]` | 도감 테마 편집 | 테마 하나가 화면 한 장. 메타(이름·영문·설명·색·slug·노출·기간)·인물 배정(검색 추가·제거·끌어 정렬·한줄/상세 소개문 ko/en)·단체샷 여러 장·인물별 개인샷. **영상 편이 없는 글 전용 테마도 여기서 다 만든다** | `celeb_tags`, `celeb_tag_assignments` |
| `/factions/[episode]` | → 리다이렉트 | `…/ko/info`로 보낸다. `[lang]`만 있는 주소도 같은 탭으로 보낸다 | — |
| `/factions/[episode]/[lang]/[tab]` | (편 이름) | 편집기 본체. `[lang]`은 `ko`·`en`·`both`, `[tab]`은 `info`(정비)·`shorts`(편성 쇼츠)·`longform`(편성 롱폼) | 위 5테이블 |
| `/factions/[episode]/[lang]/[tab]/card/…` | (편 이름) 카드 | 카드뉴스 편성·미리보기·출고. 정비 탭 아래에만 있어 다른 탭으로 들어오면 `info`로 보낸다 | — |

편집기 탭은 위 세 개다. **정비**는 세력·인물의 실체(이름·이력·대사·음성·컷 효과)와 전역 설정, **편성 쇼츠**는 세력을 편별로 배치하고 편 화면·음악을 정하는 곳, **편성 롱폼**은 세력 순서·시대 문구·편 경계를 짜는 곳이다. 헤더에 「출간」·「렌더」·「유튜브」 패널 버튼이 있다.

#### 서버 액션

`src/actions/admin/factions/` 4개 파일이다. 편집기는 창구(API)가 아니라 이 액션들을 부른다.

| 파일 | 담는 것 |
| --- | --- |
| `episodes.ts` | 편 목록·생성·복제·이름 변경·삭제·상태·노출 여부·순서 |
| `themes.ts` | 도감 테마 목록(`listFactionThemes`)·테마↔영상 편 역조회(`getThemeEpisodeLinks`, 근거는 `faction_groups.tag_id`). 테마 CRUD 자체는 `src/actions/admin/tags.ts`가 그대로 맡는다 |
| `script.ts` | 대본 불러오기(`loadFactionScript`)·저장(`saveFactionScript`). 저장은 원자 RPC 하나로 묶이고 기준 시각이 어긋나면 거부한다. 저장 절차 본체는 `src/lib/faction-save.ts`에 있다(인증 밖에 둬서 Next 밖에서도 검증할 수 있게 했다) |
| `export.ts` | `faction-data.json` 내보내기·노출 목록 재생성·파일 상태 조회. 저장 시 자동으로 따라 붙는다 |
| `publish.ts` | 세력도감 출간 — 진단(`diagnoseFactionPublish`)·출간(`publishFactionEpisode`) |

**음성 길이는 사람이 입력하지 않는다.** `quote_duration`·`epithet_duration`은 음성 파이프라인 소유라 DB에 값이 있으면 저장이 덮지 않고, 반영은 `pnpm faction:durations-pull`(wav 실측)이 한다.

#### 로컬 자산 창구 (`/api/faction/**`)

사진·음성·발화 시각·렌더 산출물은 용량이 커서 DB로 올리지 않고 `sw/remotion/` 디스크에 남긴다. 그래서 이 창구들은 **개발자 로컬에서만 동작한다**.

- `sw/web-bo/.env`의 `FACTION_LOCAL=1`이 없으면 **503과 사유**를 낸다(조용히 빈 결과를 주지 않는다). 렌더 저장소 위치는 `REMOTION_ROOT`로 옮긴다.
- 창구 묶음: `media`(목록·업로드·삭제)·`media/folder`·`media/[episode]/[...path]`·`asset/[...path]`·`voice`(+`[episode]`·`[file]`·`save`·`age`·`reorder`·`timing`·`analyze`)·`voice/{gemini,gemini-v3,elevenlabs}/preview`·`task`(+`[id]`)·`render`·`youtube/{status,sync,upload}`·`cards/[episode]`·`card-export`·`music`(+곡 서빙)·`sfx`·`comment/[episode]`·`faction-avatar`·`status`.
- 주소 첫 토막을 `faction`으로 잡은 이유는 공용 편집 부품이 `/api/${series}/media` 식으로 시리즈 이름을 넣어 부르기 때문이다. 하이픈(`api/faction-media`)으로 잡으면 그 부품을 포크해야 한다.

**⚠ 진입 검사가 이미지 확장자를 건너뛴다.** `src/proxy.ts`의 matcher가 `.svg|.png|.jpg|.jpeg|.gif|.webp`로 끝나는 주소를 제외하므로 `/api/faction/asset/x/y.png`는 로그인 검사를 지나쳐 라우트에 곧바로 닿는다(실측). 그래서 팩션 창구는 라우트마다 `guardFactionRoute()`(로컬 가드 + 자체 관리자 확인)를 **첫 줄에** 두고, 경로 잠금은 `src/lib/faction-asset.ts`로 분리했다. 화면 인증만 믿으면 뚫린다. 같은 함정으로 이미지 프록시가 무방비였던 이력이 있다.

**카드 출고의 한 번짜리 열쇠.** 카드 출고는 서버가 아니라 헤드리스 브라우저가 사진을 가져가고 그 프로세스에는 로그인 정보가 없다. 그래서 열쇠를 경로 앞 토막에 실어 통과시킨다 — `/api/rm-asset/_k/<열쇠>/…`(`src/lib/faction-render-token.ts`, 메모리 보관 30분). 물음표 뒤 질의가 아니라 경로인 이유는 렌더 쪽이 `기준주소/상대경로`로 이어 붙이기 때문이다. 엉뚱한 열쇠는 401이다.

#### 출간 (세력도감 반영)

편집기 헤더 「출간」 버튼이 `src/components/factions/FactionPublishPanel.tsx`를 펼친다. 배관은 `src/lib/faction-sync/` 8파일(`types`·`supabase`·`r2`·`image`·`manifest`·`collect`·`diagnose`·`publish`)이고, 창구는 API 라우트가 아니라 위 서버 액션 2개다 — **`curl`로 찌를 수 없다.**

제작과 서비스가 같은 DB 안에 있어 **텍스트 대조는 사라졌다.** 진단 항목은 5종이다.

| 진단 | 판정 기준 |
| --- | --- |
| 셀럽 미해소 인물 | `faction_people.celeb_id`가 null (연결 키가 없거나, 있어도 그 셀럽이 DB에 없다) |
| 태그 미지정 세력 | `faction_groups.tag_id`가 null |
| 개인샷·그룹샷 저장소 동기 상태 | 로컬 파일 해시 ↔ 매니페스트(`_db-sync.json`) 대조 |
| 얼굴 사진(아바타) 유무 | `profiles.avatar_url` |
| 신화 표시 ↔ 셀럽 등급 어긋남 | `mythical`과 `fiction` 등급이 서로 다름 |

투영 규칙:

- `faction_groups.tag_id` → `celeb_tags`, `faction_people.celeb_id` → `celeb_tag_assignments`.
- 소개문은 **채움 전용** — 도감에서 사람이 다듬은 글은 덮지 않는다(`force`로만 덮음).
- `sort_order`는 태그를 관통하는 전역 순번으로 항상 다시 쓴다.
- 같은 셀럽이 한 태그 안 여러 자리에 있으면 **자리가 가장 앞인 배치만** 채택하고 나머지는 건너뛴다. 판정은 편 전체를 보므로 세력을 하나씩 출간해도 결과가 같다.
- 이미지는 개인샷 `spotlight/{tagId}/celeb-{celebId}.webp`(고정 키 + `?v=`), 그룹샷 `spotlight/{tagId}/team/g{NN}c{NN}-{hash8}.webp`. 그룹샷 배열(`team_images`)은 **태그 단위로 다시 만든다** — 그 태그를 나눠 쓰는 편 전체 세력의 사진을 세력→묶음 순으로 모으며, 한 장이라도 실패하면 배열 교체를 보류한다.
- 태그가 없으면 출간이 만들 수 있다(항상 숨김 `is_featured=false`). 만든 뒤 `faction_groups.tag_id`를 되쓴다. 연결 키(`tagSlug`)조차 없으면 `tag-slug-missing`으로 막힌다.
- 사진 범위를 켰는데 `FACTION_LOCAL`이 없으면 조용히 건너뛰지 않고 사유를 들고 실패한다.

캐시 무효화는 **출간할 때만** 돈다 — `faction-sync/publish.ts`가 앱 공용 `revalidateWebCache([TAGS, CELEBS])`를 부른다(`src/lib/revalidate-web.ts` — 내부적으로 web `/api/revalidate`를 `CRON_SECRET`으로 호출하고, 값이 없는 로컬에서는 건너뛴다). 제작 데이터는 서비스에 나오지 않으므로 그 밖의 태그는 건드리지 않는다. faction-sync가 `WEB_BASE_URL`을 직접 읽어 부르던 remotion-bo 시절 배선은 폐기했다.

### 게임

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/blind-game` | 블라인드 게임 | 점수 랭킹(30건 단위), 최고점·최고 연승·평균, 상위 3명 | `blind_game_scores`, `profiles` |
| `/scores` | 점수 / 랭킹 | 랭킹과 점수 로그 두 탭, 총합·평균·최고 점수 | `user_scores`, `score_logs`, `profiles` |
| `/tier-lists` | 티어 리스트 관리 | 티어 리스트 목록, 유형·공개여부 필터와 통계 | `tier_lists`, `profiles` |

### 운영

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/today-figure` | 오늘의 인물 | 오늘 기준 앞뒤 7일(15건) 날짜별 선정 셀럽 확인. 출처 배지(뉴스·시드·예측). 조회 전용 | `daily_figures`, `profiles`, `user_contents` |
| `/guestbooks` | 방명록 관리 | 방명록 목록, 비공개·미확인 필터와 미확인 배지 | `guestbook_entries`, `profiles` |
| `/free-board` | 자유게시판 관리 | 글·댓글 탭, 노출·숨김 필터. 부적절한 글과 댓글을 숨김 처리 | `free_posts`, `free_post_comments`, `profiles` |
| `/reports` | 신고 관리 | 신고 목록, 상태(대기·처리완료·반려) 필터 | `reports`, `profiles` |
| `/reports/[id]` | 신고 상세 | 신고자·타임라인·대상 정보·처리 메모. 대기 상태에서만 처리·반려 실행 | `reports`, `profiles` |
| `/titles` | 칭호 관리 | 칭호 카드 그리드(등급·분류·보너스 점수·획득자 수) | `titles`, `user_titles` |

`/free-board`는 `(admin)` **화면** 중 유일하게 service-role 클라이언트(`createAdminClient()`)를 직접 사용한다. 다른 화면은 모두 일반 클라이언트로 읽는다. 단 서버 액션은 별개다 — `celebs.ts`, `contents.ts`, `records.ts`, `reports.ts`, `dialogues.ts`, `today-figure.ts`, `members.ts`가 service-role을 쓴다.

### 시스템

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/activity-logs` | 활동 로그 | 활동 로그(30건 단위), 동작 유형 필터와 유형별 개수. 화면 안내상 90일 보관 | `activity_logs`, `profiles` |
| `/api-usage` | API 사용량 | 외부 API 키 호출 로그(50건 단위), 키·성공여부 필터, 성공률·키별·동작별 통계 | `api_keys`, `api_key_usage` |
| `/settings` | 설정 | Supabase 프로젝트·DB·스토리지 사용량, Egress·Vercel 한도 안내와 외부 대시보드 링크 | Supabase 시스템 통계(RPC) |

## API 라우트

서비스 운영용 창구는 `src/app/api/` 아래 4개다. 모두 GET만 받는다. 세력도 로컬 자산 창구(`api/faction/**`·`api/rm-asset/**`)는 별개이므로 위 [세력도](#세력도) 절을 본다.

| 라우트 | 입력 | 하는 일 |
| --- | --- | --- |
| `/api/image-proxy` | `?url=` | 외부 이미지를 서버에서 받아 중계한다. **허용 호스트 11종만 통과**(아래 참조). `books.google.com`은 https로 강제한다. 429·403은 원본 URL로 넘기고, 204는 404로, 그 밖의 실패는 투명 1x1 PNG로 응답한다. 하루 캐시 |
| `/api/contents/search` | `?q=` (2자 이상) | 판본 제목으로 콘텐츠를 찾아 최대 20건 반환. 한국어 우선, 없으면 영문 |
| `/api/celebs/search` | `?q=` (1자 이상) | 셀럽을 한글·영문 닉네임으로 찾아 최대 10건 반환. 상태가 `active`·`inactive`·`suspended`인 것만 |
| `/api/voice/[...path]` | 경로 세그먼트 | 로컬 `sw/remotion/public/voice/` 아래 wav 파일을 서빙한다. 경로에 `..`이 있으면 400 |

`/api/voice`는 로컬 파일시스템에 직접 의존하므로 remotion 프로젝트가 같은 위치에 있어야 동작한다.

### image-proxy 허용 호스트 (26.07.16 신설)

`proxy.ts:15`가 이 창구만 로그인 검사에서 제외한다. 즉 **인증 없이 호출된다.** 대상 주소 제한이 없으면 임의 호스트로 서버 요청이 나가므로(SSRF) 허용 목록이 유일한 방어선이다.

허용 11종은 `content_locales.thumbnail_url` 전량(13,489행)을 실측해 확정했다 — 네이버(쇼핑·책), Spotify, TMDB, Goodreads, OpenLibrary, Google Books, IGDB, 알라딘, YES24, 위키미디어. **R2는 이 창구를 타지 않는다**(셀럽 아바타 전용)라 제외했다.

지킬 것.
- **호스트 정확 일치로 검사한다.** 부분 일치(`includes`)는 `evil.com/?x=books.google.com` 우회를 허용한다.
- **내부망 판정을 프로토콜 검사보다 먼저 한다.** 순서가 반대면 `http://127.0.0.1`이 "프로토콜 오류"로 보고돼 사유가 흐려진다.
- **리다이렉트 경유지는 내부망 여부만 검사한다.** `covers.openlibrary.org`가 `archive.org` → `ia600507.us.archive.org`(가변 노드)로 2단 우회하므로, 경유지까지 허용 목록으로 묶으면 표지 1,681건이 깨진다. 최초 주소는 이미 허용 목록으로 확정된 상태다.
- 썸네일 출처가 늘면 이 목록에 추가해야 한다. 누락 시 해당 이미지는 403이 되고 화면은 `onError` 대체 아이콘을 띄운다.

## 캐시 무효화

서버 액션이 `revalidatePath`로 갱신한다. `unstable_cache`는 `(admin)` 화면 어디에도 적용돼 있지 않다.

| 액션 파일 | 무효화 대상 |
| --- | --- |
| `actions/admin/contents.ts` | `/contents`, `/contents/[id]` |
| `actions/admin/records.ts` | `/records`, `/records/[id]` |
| `actions/admin/reports.ts` | `/reports`, `/reports/[id]` |
| `actions/admin/titles.ts` | `/titles` |
| `actions/admin/free-board.ts` | `/free-board` |
| `actions/admin/users.ts` | `/users`, `/users/[id]` |
| `actions/admin/members.ts` | `/members` 계열 (아래 결함 참조) |
| `actions/admin/tags.ts` | `/members` 계열만 14건. `/celebs`는 0건 (아래 결함 참조) |
| `actions/admin/celebs.ts` | `/celebs` 계열 일부 + `/members` 계열 잔재 + 죽은 `/celebs/quotes` |
| `actions/admin/dialogues.ts` | `/celebs/voice-gen` + 죽은 `/celebs/dialogues` |
| `actions/admin/api-keys.ts` | `/celebs` (아래 결함 참조) |

조회 전용 화면(`/`, `/notes`, `/playlists`, `/guestbooks`, `/today-figure`, `/blind-game`, `/scores`, `/tier-lists`, `/activity-logs`, `/settings`)은 무효화 대상이 없다.

서비스(web) 쪽 캐시 정책과 `/api/revalidate` 사용은 [external-services.md](./external-services.md)를 참조한다.

## 정리 대상

조사 중 확인한 문제다. 코드는 수정하지 않았다.

### members 경로 — 리다이렉트 통로 9개

`(admin)/members/` 아래 9개 page.tsx는 전부 화면 없는 리다이렉트다. 과거 셀럽과 유저를 `profile_type` 탭으로 함께 보던 통합 "멤버 관리" 화면이 커밋 `ce9fc57c`에서 `/celebs`와 `/users` 둘로 갈라졌고, 옛 경로만 하위호환용으로 남았다.

| 경로 | 보내는 곳 |
| --- | --- |
| `/members` | `/users` |
| `/members/new` | `/celebs/new` |
| `/members/[id]` | `profile_type`으로 분기해 `/celebs/[slug]` 또는 `/users/[id]` |
| `/members/[id]/contents` | `/celebs/[id]/contents` (쿼리 보존) |
| `/members/[id]/contents/collect` | `/celebs/[id]/contents/collect` |
| `/members/journeys` · `professions` · `tags` · `titles` | `/celebs/` 대응 경로 |

**단, `members/` 디렉터리 자체는 현역이다.** `CelebForm`, `TagList`, `CelebTitleEditor`, `CelebProfessionEditor`, `CelebJourneyEditor`, `ContentList`, `ContentCollector`, `CollectView`, `StatusToggle`, `NationalityBadge`, `MemberActions` 등 공용 컴포넌트가 여기 있고 `celebs/`·`users/` 화면 19곳에서 가져다 쓴다. `actions/admin/members.ts`도 계속 호출된다. 라우트만 죽었지 코드는 살아 있으므로 통째로 지우면 안 된다.

살아 있는 화면에서 `/members/[id]`로 나가는 링크가 19곳 있다(`playlists` 2, `notes` 2, `scores` 4, `tier-lists` 2, `guestbooks` 4, `activity-logs` 2, `blind-game` 3의 목록 컴포넌트). 동작하되 한 번 더 우회한다.

### celebs/dialogues · celebs/quotes — 리다이렉트 통로 2개

둘 다 `/celebs/voice-gen`으로 보내는 5줄짜리 스텁이다. 어디서도 링크되지 않는 고아다. `dialogues/DialogueEditor.tsx`는 아무 데서도 import되지 않는 죽은 파일이며, `actions/admin/dialogues.ts`와 `celebs.ts`가 이 죽은 경로를 계속 무효화한다.

### 그 밖

**26.07.16 조치 완료** (아래 5건)

- ~~CelebForm 이탈 경로~~ → `/celebs`로 교정. 취소·삭제 후 이동 **둘 다** 같은 깨진 주소였다. `CELEB_LIST_PATH` 상수로 통일. CelebForm은 `celebs/new`·`celebs/[slug]` 두 곳에서만 쓰므로 복귀 목록은 하나로 확정된다.
- ~~유저 제재 후 무효화 경로~~ → `/users`·`/users/[id]`·`/celebs`·`/celebs/[slug]`로 교정. StatusToggle이 셀럽·유저 표 양쪽에 걸려 id만으로 대상을 못 가리므로 양쪽 갱신한다.
- ~~`/celebs/tags` 무효화 부재~~ → 16건 교정. 셀럽 목록 1건은 태그를 안 띄우므로 삭제(국소화).
- ~~api-keys 무효화 대상~~ → `/api-usage`로 교정(3건).
- ~~죽은 컴포넌트·고아 라우트~~ → `celebs/dialogues/`·`celebs/quotes/` 디렉토리와 죽은 컴포넌트 3종 제거(945줄). **`members/` 트리는 보존** — `CelebForm`·`StatusToggle`·`MemberActions`·`CelebTagSelector`·`NationalityBadge`가 살아 있다.

> **함께 잡은 것**: `/celebs/[slug]`는 slug 주소인데 여러 액션이 `/celebs/${id}`로 무효화하고 있었다. 키가 어긋나 무효화가 빗나간다. 라우트 패턴(`'/celebs/[slug]', 'page'`)으로 정확히 지정했다.
>
> 여기서 고친 `revalidatePath`는 **백오피스 자체 캐시**다. egress 사고와 직결된 `revalidateWebCache`(서비스 캐시 태그)는 이미 국소화돼 있어 건드리지 않았다.

**2차 조치 (26.07.16)**

- ~~1x1 픽셀 폴백이 실패를 은폐~~ → 제거. 네트워크 예외는 502, 원본에 없으면 404로 응답한다. **429·403 원본 리다이렉트와 204→404 변환은 의도된 처리라 보존했다** — 전자는 이 서버가 대신 뚫을 수 없는 제한이라 브라우저가 자기 쿠키로 직접 받으면 성공할 여지가 있고, 후자는 본문 없는 200이 나가면 브라우저가 빈 이미지로 읽기 때문이다.
- ~~고아 서버 액션 3개~~ → 제거. `getCelebsForQuotesEdit`·`updateCelebQuotes`·`getCelebsForDialogueEdit` 모두 `/celebs/voice-gen`이 대체한다(목록=`getCelebsForVoiceGen`, 저장=`voice-gen.ts`의 `saveQuote`). 제거한 쪽은 ko만 저장했고 voice-gen은 ko·en 둘 다 하는 상위 호환이었다.
- ~~`/celebs/stats` 404~~ → `getCelebStats` 조회에 slug 추가, 링크를 slug 기반으로 교정. **셀럽 1,674명 전원이 slug를 보유하므로(26.07.16 실측) 링크는 전부 유효해진다.** slug 없는 경우 링크를 걸지 않는 폴백은 안전장치다.
- ~~`/today-figure` 404~~ → 위와 **동일 결함**이라 같은 방식으로 교정.
- ~~`/settings` 거짓 문구~~ → "unstable_cache 적용으로 해결 완료" 삭제(근거 없음). 미구현 카드 4종은 갈 곳 없는 주소를 떼고 점선 테두리 + "준비 중" 배지로 바꿔 눌러지지 않음을 드러냈다.
- ~~`/login` 자동 로그인~~ → 체크박스와 `bo_auto_login` 저장·복원 코드 제거. 구현하지 않았다. 한번 로그인하면 Supabase가 세션을 유지하므로 실사용 손해는 없다.

**미해결 — 판단 필요**

- **`promoteToCeleb`(유저 → 셀럽 승격) 기능이 사라졌다.** 액션은 살아 있으나 유일한 화면(`ProfileTypeSwitch`)이 죽은 컴포넌트로 판정돼 제거됐다. **대체 경로가 없다** — `createCeleb`은 더미 계정을 새로 파는 것이라 기존 유저 승격과 다른 일이고, `/users/[id]`는 셀럽이면 `notFound()`로 밀어낼 뿐이다. 화면만 되살리면 복구된다. **되살릴지 결정 필요.**
- **`/titles` 버튼 2개가 여전히 무동작.** `actions/admin/titles.ts`에 `createTitle`·`updateTitle`이 이미 있으나 연결만으로 끝나지 않는다 — 획득 조건(`condition`)이 자유 형식 JSON이라 입력 화면과 조건 편집기를 새로 만들어야 한다. 새 기능 개발에 해당해 보류했다.
- **1x1 픽셀 폴백이 실패를 은폐한다.** image-proxy가 네트워크·404 실패 시 200 + 투명 픽셀을 반환해 `onError`가 뜨지 않고 빈칸이 남는다(실측: 없는 URL이 200 OK로 응답). 프로젝트의 조용한 폴백 금지 규칙 위반이다.
- **`/celebs/stats`의 링크가 404로 떨어진다.** TOP 10과 최근 등록 링크가 `/celebs/{id}`를 가리키는데, 상세 라우트가 쓰는 `getMemberBySlug`는 `slug` 컬럼만 조회하고 id 폴백이 없다. 조회 실패 시 `notFound()`를 부르므로 이 링크들은 모두 404다.
- **`/titles`의 버튼이 동작하지 않는다.** "새 칭호 추가"·"수정" 버튼에 핸들러가 없어 사실상 조회 전용이다.
- **`/settings`의 설정 카드 4개가 껍데기다.** 알림·보안·데이터·테마 카드에 주소만 있고 이동하지 않는다. 또한 화면 본문의 "unstable_cache 적용으로 해결 완료" 문구는 코드상 근거가 없다.
- **`/login`의 자동 로그인이 미구현이다.** 체크박스 값을 `bo_auto_login`으로 저장하고 읽기는 하지만, 읽은 값은 체크박스 표시 상태를 복원하는 데만 쓴다. 이 값으로 로그인을 자동 실행하는 코드는 없다.
- **위키미디어 썸네일 2행이 비승인 크기다.** 저장된 주소가 위키미디어 정책상 거부된다("Use thumbnail sizes listed on..."). 데이터 문제.
- **생성 직후 `/members/${id}` 이동**(CelebForm 409행). 스텁이 `profile_type`으로 분기해 `/celebs/[slug]`에 정상 도달하므로 동작은 한다(한 번 우회). 교정하려면 생성 응답에 없는 slug가 필요하다.

## 변경 후 확인

```bash
pnpm --filter @feelandnote/web-bo lint
pnpm --filter @feelandnote/web-bo build
```

메뉴를 바꿀 때는 `src/components/layout/Sidebar.tsx`의 `menuGroups`가 단일원천임을 지킨다. 화면만 추가하고 메뉴에 등록하지 않으면 위 `members` 사례처럼 접근할 수 없는 경로가 쌓인다.
