# Web BO

> **최종 실측 체크: 26.08.10** — 회원·셀럽 물리 도메인 전환, 현역 화면·서버 액션·
> 비타임라인 운영 스크립트와 프로덕션 빌드를 대조했다. 새 코드 전환과 구버전 종료 뒤
> 최종 제거 migration까지 적용해 운영 DB의 레거시 호환 테이블은 제거됐다.

서비스 운영과 영상 제작 관리를 함께 담당하는 관리자 백오피스다. 실제 서비스 데이터는
DB, 렌더용 서재 탐방 자산은 `sw/remotion/public/episodes`를 원천으로 삼는다.

| 프로젝트 | 포트 | 역할 | 데이터원 |
| --- | --- | --- | --- |
| **web-bo** | 3001 | **서비스 운영 + 영상 제작 관리.** 셀럽·유저·콘텐츠·커뮤니티와 세력도감·가상 담화·서재 탐방·책과 사람 | DB + 로컬 Remotion |
| audio-bo | 3005 | 로컬 음성 작업실. 받아쓰기·화자 학습·합성 | D드라이브 |

구 remotion-bo는 이 앱으로 이관하고 폐기했다. audio-bo는 [Audio BO](./audio-bo.md)를 참조한다.

## 실행

```bash
pnpm dev:bo
```

- 화면: `http://localhost:3001`
- 빌드는 webpack 고정이다(`next dev -p 3001 --webpack`, `next build --webpack`).

## 접근 권한

`(admin)` 그룹의 모든 화면은 레이아웃에서 두 단계로 막는다. 로그인하지 않았으면 `/login`으로 보내고, 로그인했더라도 `user_accounts.role`이 `admin` 또는 `super_admin`이 아니면 역시 `/login`으로 보낸다. DB의 관리자 판정은 `is_admin()`을 쓴다. 개별 화면은 권한을 다시 검사하지 않는다.

`/login`은 Auth의 이메일·비밀번호 인증을 사용하며 성공 시 `?redirect` 값 또는 `/users`로 이동한다.

단 **창구(API)는 화면 검사에 기댈 수 없다.** `src/proxy.ts`의 matcher가 이미지 확장자로 끝나는 주소를 제외하므로 세력도감·가상 담화 자산 창구는 라우트마다 스스로 관리자 확인을 한다(위 [세력도감](#세력도감)·[가상 담화](#가상-담화) 절).

## 화면 구성

26.07.16 전수 감사 당시 페이지는 52개였고 그중 11개가 화면 없는 리다이렉트 통로였다.
이후 세력도감·가상 담화·서재 탐방이 추가됐으므로 이 숫자는 현재 총계로 사용하지 않는다.
아래 표와 실제 `app/` 라우트를 기준으로 본다.

왼쪽 메뉴는 `src/components/layout/Sidebar.tsx`의 `menuGroups` 배열이 단일원천이다.
리모션 시리즈(서재 탐방·책과 사람·세력도감·가상 담화·랭킹)는 「영상」 묶음 아래 둔다.
상세 화면(`[id]`·`[slug]`)은 목록에서 눌러 들어가므로 메뉴에 없고, `/celebs/new`도
셀럽 목록 안의 버튼으로만 들어간다.

### 대시보드

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/` | 대시보드 | 유저·콘텐츠·감상·기록 총계, 콘텐츠 유형별 비율, 최근 가입자 5명, 최근 활동 10건. 읽기 전용 | `user_accounts`, `member_profiles`, `contents`, `records`, `member_contents`, `celeb_contents`, `activity_logs` |

### 셀럽

셀럽 관련 데이터의 생성·검수 파이프라인 전반을 다룬다. 각 항목의 작성 기준과 에이전트 규칙은 [셀럽 파이프라인](../celeb/celeb-pipeline.md)에 있다.

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/celebs` | 셀럽 관리 | 셀럽 목록 조회·검색·필터(상태/직군/등급)·정렬·페이지네이션. 하위 도구 허브 | `celebs` |
| `/celebs/images` | 셀럽 이미지 작업 | 아바타·대표 사진·각성 이미지를 크게 비교하고 드롭 교체·원본 열기·클립보드 복사를 수행한다. 아바타는 CPU nobg 대기열도 제공한다. 바깥 브라우저에서 Alt+클릭한 일반 사진은 아바타·대표 사진의 빈 자리로만 받는다([`tools/celeb-image-grabber`](../../../tools/celeb-image-grabber/README.md)) | `celebs` (`avatar_url`, `portrait_url`, `awakened_image_url`) |
| `/celebs/new` | 셀럽 등록 | 로그인 계정 없이 신규 셀럽을 직접 등록 | `celebs` |
| `/celebs/[slug]` | (셀럽 닉네임) | 단건 상세·편집. 기본정보·아바타 CPU nobg 대기열·영향력·감상철학 + 스펙트럼·고유대사. 세력도감 편성은 이 화면에서 고치지 않는다 | `celebs`, `celeb_dialogues`, `celeb_influence` |
| `/celebs/[slug]/contents` | (셀럽 닉네임) | 셀럽에 등록된 콘텐츠 목록·필터·추가·내보내기, 하단에 수집기 | `celeb_contents`, `contents`, `content_locales` |
| `/celebs/[slug]/contents/collect` | (수집) | 콘텐츠 수집 전용 화면. 구현은 `members/[id]/contents/collect/CollectView`에 있다 | `celeb_contents` |
| `/celebs/titles` | 셀럽 수식어 편집 | 전체 셀럽 수식어 일괄 편집 | `celebs` |
| `/celebs/titles/[slug]` | (닉네임) 수식어 편집 | 단건 수식어 수정 | `celebs` |
| `/celebs/professions` | 셀럽 직군 편집 | 전체 셀럽 직군 일괄 편집 | `celebs` |
| `/celebs/professions/[slug]` | (닉네임) 직업 편집 | 단건 직업 수정 | `celebs` |
| `/celebs/journeys` | 셀럽 감상 여정 편집 | `cultural_journey` 일괄 편집, 50건 단위 | `celebs` |
| `/celebs/journeys/[slug]` | (닉네임) 감상 철학 편집 | 단건 감상 철학 집중 수정 | `celebs` |
| `/celebs/content-research` | Light 콘텐츠 조사 목록 | 실제 콘텐츠 수·활성 여부·0건 확정 여부·영향력·자료형 직군·세력도감 연결로 작업 대상을 분류하고, 0건 인물의 `-1` 확정·해제만 관리한다 | `celebs`, `celeb_contents` |
| `/celebs/vectors` | 스펙트럼 분석 | 덕목·능력·성향 16개 축 열람(레퍼런스 패널 + 대시보드) | `celeb_persona` |
| `/celebs/vectors/[slug]` | (닉네임) 스펙트럼 분석 | 단건 스펙트럼 축 확인 | `celeb_persona` |
| `/celebs/influence` | 영향력 평가 | 6개 영역 + 통시성 영향력 대시보드 | `celeb_influence` |
| `/celebs/influence/[slug]` | (닉네임) 영향력 평가 | 단건 영향력 축 확인 | `celeb_influence` |
| `/celebs/voice-gen` | 대사/음성 워크스페이스 | 고유 대사 작성, 말투(`speech_tone`)·속도 설정, KO·EN별 GEM/ELE 엔진·보이스 선택, 단건·일괄 생성, 공용 파형 트림·들숨 제거. `celebs.voice_id_ko/en`은 실제 인물용 ElevenLabs ID만 영구 저장하고 GEM 선택은 현재 생성 작업에만 적용 | `celeb_dialogues`, `celebs` |
| `/celebs/voice-gen/[slug]` | 대사/음성 워크스페이스 | 위와 동일하되 특정 셀럽 선택 상태로 진입 | `celeb_dialogues`, `celebs` |
| `/celebs/stats` | 셀럽 통계 | 총수·활성률·직군 수·국적 수 요약, 직군 분포, 팔로워 TOP 10, 콘텐츠 수 TOP 10, 최근 등록 | `celebs`, `celeb_contents`, `celeb_metrics` |

관련 문서: 영향력은 [celeb-4-influence.md](../celeb/celeb-4-influence.md), 스펙트럼은 [celeb-5-spectrum.md](../celeb/celeb-5-spectrum.md), 대사·말투는 [celeb-speech.md](../celeb/celeb-speech.md), 콘텐츠 수집은 [celeb-2-content-collector.md](../celeb/celeb-2-content-collector.md), 콘텐츠 검증은 [celeb-content-audit.md](../celeb/celeb-content-audit.md), 영문화는 [celeb-i18n.md](../celeb/celeb-i18n.md)를 본다. 세력도감 편성은 아래 「세력도감」 절, 셀럽 스키마는 [db-celeb.md](../data/db-celeb.md)가 단일원천이다.

### 유저

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/users` | 유저 관리 | 일반 유저 목록(검색·상태·역할·정렬, 20건 단위) | `user_accounts`, `member_profiles` |
| `/users/[id]` | 유저 상세 | 프로필·역할·상태·정지 사유·콘텐츠/팔로워/점수 표시, 정지·해제·역할 변경 등 제재 실행 | `user_accounts`, `member_profiles`, `member_social_stats`, `member_scores` |

백오피스는 26.08.10부터 회원과 셀럽을 전용 테이블에서 직접 읽고 쓴다. 회원을 셀럽으로
바꾸는 동작은 없다. 같은 사람이 두 영역에 필요하면 별도 UUID 행과 명시적 인수 관계를 쓴다.

### 콘텐츠

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/contents` | 콘텐츠 관리 | 콘텐츠 목록(제목·제작자 검색, 유형 필터). 도서는 한국어·영문 판본 카드를 나란히 띄워 썸네일 출처까지 진단 | `contents`, `content_locales`, `member_contents`, `celeb_contents` |
| `/contents/[id]` | (콘텐츠 제목) | 메타·판본·제휴링크 표시, 수정·삭제·제휴링크 관리, 등록 회원·셀럽·관련 기록. BOOK은 KO·EN 표지 URL·출처 편집과 서재 탐방 사용 현황 진입 제공. 픽션 대표 원전은 지정 해제 전 삭제를 거부한다 | `contents`, `content_locales`, `member_contents`, `celeb_contents`, `records` |
| `/fiction-sources` | 픽션 원전 관리 | 기존 콘텐츠를 대표 원전으로 지정·해제하고 fiction 인물을 검색·선택해 등장 관계를 저장한다. 연결된 인물마다 해당 작품에서의 역할·사건·결말 설명을 한국어·영어로 편집한다 | `fiction_source_contents`, `fiction_source_characters`, `contents`, `celebs` |
| `/records` | 기록 관리 | 감상 기록(노트·인용) 목록, 유형·공개범위 필터 + 본문 검색 | `records`, `member_profiles`, `contents`, `content_locales` |
| `/records/[id]` | 기록 상세 | 본문·작성자·연결 콘텐츠·반응 수·출처 표시, 공개범위 변경·삭제, 댓글 목록 | `records`, `member_profiles`, `contents` |

### 서재 탐방 제작·리소스 통합

| 라우트 | 화면 | 하는 일 | 주요 원천 |
| --- | --- | --- | --- |
| `/book-recommend` | 제작 현황·리소스 | 제작 상태·후보·음성 저장소·작업 큐와 콘텐츠 ID·표지 무결성 감사를 탭으로 통합 | DB + `sw/remotion/public/episodes` |
| `/book-recommend/search` | 새 에피소드 | 셀럽 검색과 기존 에피소드 중복 확인 | `celebs`, 에피소드 목록 |
| `/book-recommend/guide` | 운영 가이드 | 현행 제작 흐름·로컬 가동 조건 | 코드·운영 규칙 |
| `/book-recommend/[name]/scenario` | 원고 | 메타·책·쇼츠 분산 JSON 편집, 이미지·영상·배경음·효과음 관리 | 에피소드 JSON·미디어 |
| `/book-recommend/[name]/voice` | 음성 | 보이스 선택·생성·발화 시각·파이프라인 진단 | 에피소드 음성·timing JSON |
| `/book-recommend/[name]/render` | 렌더 | 롱폼·쇼츠·SOLO·카드 렌더 작업 실행·상태 | `sw/remotion` |
| `/book-recommend/[name]/youtube` | 출고 | 영상·자막·썸네일·메타·업로드 | Remotion out·YouTube lineup |
| `/book-recommend/[name]/cards` | 카드 | BookCard 미리보기·편성 | 에피소드 JSON·`faction-cards.json` |
| `/book-recommend/youtube` | 편성 현황 | 에피소드 전체 업로드·동기화 상태 | lineup·YouTube API |

관련 서버 창구는 `/api/book-recommend/**` 42라우트와 `/api/tasks`,
`/api/open-folder`다. 모든 동적 시리즈 창구는 `book-recommend`만 허용하며,
파일 조작·렌더·업로드는 `REMOTION_LOCAL=1`(옛 별칭 `FACTION_LOCAL=1`)인 로컬 환경에서만
동작한다. 표지 원본 URL은 공용 외부 이미지 검증기를 통과해야 하며, 렌더 캐시는
`covers/content/<contentId>/<locale>.webp`에 만든다.

콘텐츠 관계·표지 운영 규격은
[서재 탐방 1차 통합](../remotion/book-recommend/unification-phase1.md)을 참조한다.
| `/notes` | 노트 관리 | 노트 목록(24건 단위), 공개설정 필터와 설정별 개수, 섹션 완료 여부 | `notes`, `note_sections`, `member_profiles`, `contents` |
| `/playlists` | 묶음 관리(옛 라우트명) | 플로우 목록, 콘텐츠 유형·공개여부 필터, 노드 수 통계 | `flows`, `flow_nodes`, `member_profiles` |

도서 메타 출처 규칙(한국어판 카카오·영문 원서 OpenLibrary만 허용)은 [external-services.md](../platform/external-services.md)를 따른다. 스키마는 [db-core.md](../data/db-core.md)에 있다.

### 책과 사람

나레이터가 인물 한 명을 소개하고 읽은 책을 이어서 말하는 세로 쇼츠다. **원천은 파일**이다. 테이블을 만들지 않는다. 목록은 셀럽 전원을 보여 주고, 저장할 때만 `ko.json`이 생긴다. 감상기록·책 유무는 조건이 아니다. `REMOTION_LOCAL=1`인 로컬에서만 저장이 동작한다. 시리즈 규격은 [`book-person/`](../remotion/book-person/README.md)다.

| 라우트 | 화면 | 하는 일 | 주요 원천 |
| --- | --- | --- | --- |
| `/book-person` | 인물 목록 | 셀럽마다 들어가 고친다. 원고 있음·책 수·문장 제목을 보여 준다 | `celebs` + 있으면 `ko.json` |
| `/book-person/[name]` | (인물) | 문장 제목·소개·책 목록을 고치고 저장한다. 스튜디오로 바로 연다 | `sw/remotion/public/book-person/<slug>/ko.json` |

서버 액션은 `src/actions/admin/book-person/episodes.ts`다. 저장은 `ko.json`을 덮어쓴다. 사진·음성 폴더는 코드로 지우지 않는다.

사진 창구는 담화와 같다. `/api/book-person/media`에서 목록·올리기·주소 받기·삭제를 하고, 폴더 정리와 탐색기 열기는 `/api/book-person/media/folder`다. 화면의 사진 목록·칸은 공용 부품 `@feelandnote/shared/bo/media`다. 창구마다 `guardBookPersonRoute()`(로컬 + 관리자)를 첫 줄에 둔다.

### 세력도감

> 26.07.25 신설 — 팩션(세력도감) 영상의 제작 화면이 remotion-bo에서 이곳으로 옮겨 왔다. remotion-bo의 팩션 구역은 전량 폐기됐고 그 주소는 404다.

영상 시리즈 「세력도감」의 **텍스트·구성 단일 원천은 DB 5테이블**(`faction_episodes`·`faction_groups`·`faction_clusters`·`faction_people`·`faction_episode_parts`)이다. 렌더 엔진이 읽는 `sw/remotion/public/factions/<편>/faction-data.json`은 **저장할 때 DB에서 만들어 내는 산출물**이며 직접 편집하지 않는다(첫 키 `_generated` 마커의 checksum이 어긋나면 내보내기가 중단된다). **서비스 웹·BO의 도감 인물 읽기는 DB 뷰 `faction_atlas_members` 직독이다(26.08.03 단일화)** — 제작 유래(한줄=직함 첫 항목, 상세=`web_long_desc` 손질 우선) ∪ 웹 전용 배정(`celeb_tag_assignments`). 시리즈 자체의 SSoT는 [`faction/`](../remotion/faction/README.md), 통합 설계는 [`faction/unification.md`](../remotion/faction/unification.md) §4-3다.

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/factions` | 세력도감 | **표 하나.** 한 줄 = 편집 화면 하나다. 영상 편은 편 편집기로, 영상 없는 웹 전용 테마는 「영상 없음」 표찰을 달고 테마 화면으로 간다. 제작 편에 연결된 테마는 제 줄 없이 그 편 줄의 배지로만 보인다. `faction_people`는 실제 출연 인물 배치이며 CELEB 연결·세력도감 노출 대상이다. 이야기 본문은 장면의 `beats`가 소유하고, 구 `is_person=false` 서사 행은 읽을 때 beats로 승격한다. 회사·조직·제품·기계·기체·부대·집단을 개인샷으로 등록하지 않는다. 모든 실물과 DB 키는 **`sw/remotion/public/factions/<folder>` 한 단계**이며 활성 여부는 DB `registered`가 쥔다. 목록은 폴더가 아니라 DB에서 센다 | `faction_episodes`, `celeb_tags` |
| `/factions/themes/[tagId]` | 도감 테마 편집 | 테마 하나가 화면 한 장. 메타(이름·영문·설명·색·slug·노출·기간)·인물(검색 추가·제거·끌어 정렬·소개문 ko/en)·단체샷 여러 장·인물별 개인샷. **영상 편이 없는 글 전용 테마도 여기서 다 만든다.** 인물 목록은 뷰 `faction_atlas_members`에서 읽고 **행마다 제작/수동 출처 배지**가 붙는다(26.08.03) — 제작 행의 한줄은 직함 1행 고정이고 상세 소개·개인샷·숨김만 `faction_people`의 `web_*` 칸에 기록된다. 제거는 숨김(`web_hidden`)으로 동작하며, 끌어 정렬은 수동 행 전용이다. 수동 행은 영상 원문이 없으므로 한줄·상세를 모두 직접 편집한다 | `celeb_tags`, `celeb_tag_assignments`, `faction_people`(web_* 칸) |
| `/factions/[episode]` | → 리다이렉트 | `…/ko/info`로 보낸다. `[lang]`만 있는 주소도 같은 탭으로 보낸다 | — |
| `/factions/[episode]/[lang]/[tab]` | (편 이름) | 편집기 본체. `info`의 최상위 레일에는 장면만 놓인다. 한 장면은 대표 사진과 `beats` 컷 배열을 소유하며, 말 없는 화면·해설·인물 대사는 같은 컷 UI에서 `speakerCelebId` 할당 여부로만 갈린다. 「앞에 컷」은 현재 장면의 첫 beat를 추가하고 「앞에 장면」은 독립 `cluster`를 추가한다. 할당된 컷은 현재 이름과 기본 음성을 인물에서 상속하고 컷 자체의 오버라이드만 우선한다. 인물 이름은 각 렌더 영상의 첫 대사에서만 자동 표시하며 대사별로 강제 표시·숨김할 수 있다. 이 설정은 대표 대사 선택과 별개다. 대표로 고른 대사 하나는 인물 기본 대사와 웹팩션 대사로 함께 쓴다. 미할당 화자명과 이름 화면 표시 여부도 컷에서 직접 고친다. 장면명 위치의 빈 값은 위 「대사·장면 자막」 위치를 상속한다. 각 컷 안에서 줄 단위 대사 분할과 기존 위치 음원의 재생·생성·싱크·후처리를 그대로 다룬다. 구 인물 `quote`와 `isPerson=false` 독립 장면은 로드할 때 소속 장면의 `beats`로 순서대로 승격하며 별도 카드로 열지 않는다. 항목 사이 쇼츠 경계는 다음 항목의 flag로 보존한다. 「인물 사진」 모드는 실제 출연 인물만 UUID로 중복 제거해 보여 준다 | 위 5테이블, `celebs` |
| `/factions/[episode]/[lang]/[tab]/card/…` | (편 이름) 카드 | 카드뉴스 편성·미리보기·출고. 정비 탭 아래에만 있어 다른 탭으로 들어오면 `info`로 보낸다 | — |

편집기 탭은 위 세 개다. **정비**는 장면 순서와 장면 안의 대사·음성·컷 효과·전역 설정을 다룬다. 최상위 `sequence`에는 `cluster` 장면과 장면 사이 `cut`만 둔다. 모든 본문은 `cluster.beats[]`가 소유하고 `speakerCelebId`가 실제 인물 할당을 표시한다. 대사 자체의 음성 오버라이드가 있을 때만 인물 기본값보다 우선한다. **인물 사진** 모드는 실제 출연 인물 프로필만 다룬다. **편성 쇼츠**와 **편성 롱폼**은 흐름을 나누고 화면·음악을 정하며 장면 본문은 정비가 소유한다.

화자 없는 본문 컷은 화자 선택에서 `나레이터 · 공용 화자`로 보인다. 나레이터는 출연진·대표 대사·웹 도감 인물에 들어가지 않고, 화면 아래 「나레이터」의 공용 음성을 상속한다. 자유 화자명이 있는 미할당 컷은 별도 화자로 유지한다.

사람이 결정하는 장면·컷·인물 기본값과 화면·음성 설정은 해당 통합 UI에서 편집한다. 음원·트랙의 실측 길이처럼 파이프라인이 산출하는 값은 편집값으로 열지 않는다.

**「렌더」 버튼은 창고 방식으로 돈다(26.07.26).** 영상·롱폼 썸네일 모두 `pnpm render:staged` 를 부르고, 그 스크립트가 렌더 직전에 **그 편 자산 + 공용(효과음·곡·글꼴)만** 임시 폴더에 하드링크로 모아 넘긴다. 예전에는 편마다 `public/` 7.3GB를 통째로 복사해 디스크가 찼다 — 실측 PayPal-Mafia 기준 **189MB**로 줄었다. 조립이 실패하면 조용히 통짜로 넘어가지 않고 멈춘다(사람이 `--full-public` 을 붙여야 옛 방식). 규칙은 `sw/remotion/scripts/render/stage.ts` 소유이고 함정은 `gotchas.md` 렌더 절에 있다.

#### 서버 액션

`src/actions/admin/factions/`의 서버 액션을 쓴다. 편집기는 창구(API)가 아니라 이 액션들을 부른다.

| 파일 | 담는 것 |
| --- | --- |
| `episodes.ts` | 편 목록·**한 편 상태 조회(`getFactionEpisodeMeta` — 편집기 상단 조작줄용)**·생성·복제·이름 변경·삭제·상태·노출 여부·순서 |
| `themes.ts` | 도감 테마 목록(`listFactionThemes`)·테마↔영상 편 역조회(`getThemeEpisodeLinks`, 근거는 `faction_groups.tag_id`). 테마 CRUD 자체는 `src/actions/admin/tags.ts`가 그대로 맡는다 |
| `script.ts` | 대본 불러오기(`loadFactionScript`)·저장(`saveFactionScript`). 저장은 원자 RPC 하나로 묶이고 기준 시각이 어긋나면 거부한다. 저장 절차 본체는 `src/lib/faction-save.ts`에 있다(인증 밖에 둬서 Next 밖에서도 검증할 수 있게 했다) |
| `export.ts` | `faction-data.json` 내보내기·노출 목록 재생성·파일 상태 조회. 저장 시 자동으로 따라 붙는다 |
| `publish.ts` | 세력도감 출간 — 진단(`diagnoseFactionPublish`)·출간(`publishFactionEpisode`) |
| `people.ts` | 편집기 인물 사진 모드 — 현재 대본이 넘긴 셀럽 UUID들의 아바타·대표 사진 프로필을 한 번에 조회 |

**음성 길이는 사람이 입력하지 않는다.** `quote_duration`·`epithet_duration`은 음성 파이프라인 소유라 DB에 값이 있으면 저장이 덮지 않고, 반영은 `pnpm faction:durations-pull`(wav 실측)이 한다.

#### 로컬 자산 창구 (`/api/faction/**`)

사진·음성·발화 시각·렌더 산출물은 용량이 커서 DB로 올리지 않고 `sw/remotion/` 디스크에 남긴다. 그래서 이 창구들은 **개발자 로컬에서만 동작한다**.

- `sw/web-bo/.env`의 `FACTION_LOCAL=1`이 없으면 **503과 사유**를 낸다(조용히 빈 결과를 주지 않는다). 렌더 저장소 위치는 `REMOTION_ROOT`로 옮긴다.
- 창구 묶음: `media`(목록·업로드·삭제)·`media/folder`·`media/[episode]/[...path]`·`asset/[...path]`·`voice`(+`[episode]`·`[file]`·`save`·`age`·`reorder`·`timing`·`analyze`)·`voice/{gemini,gemini-v3,elevenlabs}/preview`·`task`(+`[id]`)·`render`·`youtube/{status,sync,upload}`·`cards/[episode]`·`card-export`·`music`(+곡 서빙)·`sfx`·`comment/[episode]`·`faction-avatar`·`status`.
- 주소 첫 토막을 `faction`으로 잡은 이유는 공용 편집 부품이 `/api/${series}/media` 식으로 시리즈 이름을 넣어 부르기 때문이다. 하이픈(`api/faction-media`)으로 잡으면 그 부품을 포크해야 한다.

**⚠ 진입 검사가 이미지 확장자를 건너뛴다.** `src/proxy.ts`의 matcher가 `.svg|.png|.jpg|.jpeg|.gif|.webp`로 끝나는 주소를 제외하므로 `/api/faction/asset/x/y.png`는 로그인 검사를 지나쳐 라우트에 곧바로 닿는다(실측). 그래서 팩션 창구는 라우트마다 `guardFactionRoute()`(로컬 가드 + 자체 관리자 확인)를 **첫 줄에** 두고, 경로 잠금은 `src/lib/faction-asset.ts`로 분리했다. 화면 인증만 믿으면 뚫린다. 같은 함정으로 이미지 프록시가 무방비였던 이력이 있다.

**카드 출고의 한 번짜리 열쇠.** 카드 출고는 서버가 아니라 헤드리스 브라우저가 사진을 가져가고 그 프로세스에는 로그인 정보가 없다. 그래서 열쇠를 경로 앞 토막에 실어 통과시킨다 — `/api/rm-asset/_k/<열쇠>/…`(`src/lib/faction-render-token.ts`, 메모리 보관 30분). 물음표 뒤 질의가 아니라 경로인 이유는 렌더 쪽이 `기준주소/상대경로`로 이어 붙이기 때문이다. 엉뚱한 열쇠는 401이다.

#### 출간 (세력도감 반영)

> **26.08.03 단일화 — 텍스트 복사는 폐기됐다.** 인물 텍스트(대사·직함·소개)의 유일 원천은 `faction_people`이고 웹은 뷰 `faction_atlas_members`를 직독하므로, 제작에서 고치면 캐시 주기(또는 `/api/revalidate` tags·celebs) 안에 웹에 반영된다. 출간 패널은 **사진(개인샷→`faction_people.web_image_url`, 그룹샷→`celeb_tags.team_images`)·영상·음악 업로드 도구**로 축소됐다. 노출 결정은 `celeb_tags.is_featured` 스위치 하나다.

팩션 인물 검색창은 **기존 DB CELEB를 고르는 기능만** 가진다. 검색 결과가 없다고 팩션 편집 흐름에서 임시·최소 프로필을 즉석 생성하지 않는다. 신규 인물은 `/celebs/new`의 정식 셀럽 등록을 먼저 마친 뒤 검색해서 추가한다. 저장 코어·가져오기 CLI·DB 트리거도 미연결 인물을 각각 거부한다.

편집기 헤더 「출간」 버튼이 `src/components/factions/FactionPublishPanel.tsx`를 펼친다. 배관은 `src/lib/faction-sync/` 8파일(`types`·`database`·`r2`·`image`·`manifest`·`collect`·`diagnose`·`publish`)이고, 창구는 API 라우트가 아니라 위 서버 액션 2개다 — **`curl`로 찌를 수 없다.**

제작과 서비스가 같은 DB 안에 있어 **텍스트 대조는 사라졌다.** 진단 항목은 5종이다.

| 진단 | 판정 기준 |
| --- | --- |
| DB 개인샷 연결 무결성 | `faction_people.is_person=true`면 `celeb_id` 필수 + 삭제되지 않은 CELEB + slug 미러. `is_person=false`면 `celeb_id`·slug가 없어야 하며 출간 인물에서 제외한다 |
| 태그 미지정 세력 | `faction_groups.tag_id`가 null |
| 개인샷·그룹샷 저장소 동기 상태 | 로컬 파일 해시 ↔ 매니페스트(`_db-sync.json`) 대조 |
| 얼굴 사진(아바타) 유무 | `celebs.avatar_url` |
| 신화 표시 ↔ 셀럽 등급 어긋남 | `mythical`과 `fiction` 등급이 서로 다름 |

남은 규칙(사진·영상·음악):

- 이미지는 개인샷 `faction/{tagId}/celeb-{celebId}.webp`(고정 키 + `?v=`), 그룹샷 `faction/{tagId}/team/g{NN}c{NN}-{hash8}.webp`. 개인샷 주소는 **`faction_people.web_image_url`에 기록한다**(26.08.03 이전에는 배정 행의 `faction_image_url`). 그룹샷 배열(`team_images`)은 **태그 단위로 다시 만든다** — 그 태그를 나눠 쓰는 편 전체 세력의 사진을 세력→묶음 순으로 모으며, 한 장이라도 실패하면 배열 교체를 보류한다.
- 태그가 없으면 출간이 만들 수 있다(항상 숨김 `is_featured=false`). 만든 뒤 `faction_groups.tag_id`를 되쓴다. 연결 키(`tagSlug`)조차 없으면 `tag-slug-missing`으로 막힌다.
- 사진 범위를 켰는데 `FACTION_LOCAL`이 없으면 조용히 건너뛰지 않고 사유를 들고 실패한다.

폐기된 옛 투영 규칙(26.08.03) — 배정 upsert·소개문 채움 전용 보호·`sort_order` 전역 재기록·같은 셀럽 앞자리 채택은 배정 사본이 사라지면서 대상이 없어졌다. 앞자리 채택·정렬(제작 순번 우선, 웹 전용 10000+)·숨김은 이제 뷰 `faction_atlas_members`의 조회 규칙이다.

캐시 무효화는 **출간할 때만** 돈다 — `faction-sync/publish.ts`가 앱 공용 `revalidateWebCache([TAGS, CELEBS])`를 부른다(`src/lib/revalidate-web.ts` — 내부적으로 web `/api/revalidate`를 `CRON_SECRET`으로 호출하고, 값이 없는 로컬에서는 건너뛴다). 제작 데이터는 서비스에 나오지 않으므로 그 밖의 태그는 건드리지 않는다. faction-sync가 `WEB_BASE_URL`을 직접 읽어 부르던 remotion-bo 시절 배선은 폐기했다.

### 가상 담화

> 26.07.26 신설 — 가상 담화 영상의 제작 화면이 remotion-bo에서 이곳으로 옮겨 왔다. remotion-bo의 담화 구역은 전량 폐기됐고 그 주소는 404다.

영상 시리즈 「가상 담화」의 **텍스트·구성 단일 원천은 DB 3테이블**(`discourse_episodes`·`discourse_speakers`·`discourse_turns`)이다. 렌더 엔진이 읽는 `sw/remotion/public/discourses/<편>/` 의 **세 파일**(`discourse-data.json` 메타 · `cast.json` 인물 · `turns.json` 발언)은 저장할 때 DB에서 만들어 내는 산출물이며 직접 편집하지 않는다. 시리즈 자체의 SSoT는 [`discourse/`](../remotion/discourse/README.md), 통합 설계는 [`discourse/unification.md`](../remotion/discourse/unification.md)다.

⚠ **손 편집 감시가 세력도감와 다르다.** 마커(`_generated`)는 메타 파일 첫 키에 **하나뿐**인데 checksum은 **세 파일을 합친 전체**로 계산한다. 뒤 두 파일은 최상위가 배열이라 마커를 박을 자리가 없어서다. 덕분에 `cast.json`·`turns.json` 을 손으로 고쳐도 내보내기가 중단되고 어긋난 자리를 짚어 준다.

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/discourses` | 가상 담화 | 편 목록 표 하나. 편 이름·논제·인물 수·발언 수·진행 상태·노출(편성 순번). 위쪽이 노출로 켠 편(편성 순서), 아래 구분 줄 밑이 아직 안 켠 편. 「새 담화」·「영상 목록 다시 만들기」는 표 위. 목록은 폴더가 아니라 DB에서 센다 | `discourse_episodes`, `discourse_speakers`, `discourse_turns` |
| `/discourses/[episode]` | → 리다이렉트 | `…/both/shorts`(원고 탭)로 보낸다. `[lang]`만 있는 주소도 원고 탭으로 보낸다 | — |
| `/discourses/[episode]/[lang]/[tab]` | (편 이름) | 편집기 본체. `[lang]`은 `ko`·`en`·`both`, `[tab]`은 `shorts`(원고)·`info`(인물) | 위 3테이블 |

편집기 탭은 둘이다. **원고**는 대사와 발언 순서를 글로 다루는 곳(이 담화의 본문), **인물**은 말하는 사람의 실체와 영상 전체 설정이다. 상단 조작줄에 「미리보기」·「대사 뽑기」가 있다.

#### 서버 액션 (`actions/admin/discourses/`)

| 파일 | 하는 일 |
| --- | --- |
| `episodes.ts` | 목록(DB 집계)·만들기·복제·이름 변경·삭제·진행 상태·노출 전환·편성 순서 |
| `script.ts` | 대본 불러오기(`loadDiscourseScript`)·저장(`saveDiscourseScript`, 낙관적 잠금 + 자동 내보내기)·원천 독백 조회 |
| `export.ts` | 세 파일 내보내기·`_episodes.json` 재생성·파일 상태 판정 |

저장 절차는 `lib/discourse-save.ts`(분해 → 원자 저장 RPC `discourse_replace_episode`), 조립·분해 규칙은 `@feelandnote/shared/lib/discourse-assemble`, 파일 쓰기 규칙은 `@feelandnote/shared/bo/discourse-export` 소유다. 렌더 저장소의 CLI(`pnpm discourse:export`)가 **같은 코어**를 쓴다.

⚠ **음성 길이는 사람이 입력하지 않는다.** 저장할 때 편집기가 보낸 값으로 덮지 않고 DB 값을 유지하는데, 그 조회 기준이 자리(순번)가 아니라 **「사람 + 그 사람의 n번째 발언」** 이다. 담화는 한 인물이 여러 번 말하는 것이 기본이라, 자리 기준으로 붙여 두면 발언을 하나 끼워 넣는 순간 음원과 컷 길이가 통째로 어긋난다.

#### 로컬 자산 창구 (`/api/discourse/**`)

사진·음원은 DB로 옮기지 않고 렌더 저장소(`sw/remotion/public/discourses/`)에 남는다. 그래서 그 파일을 만지는 창구 8종은 **개발자 컴퓨터에서만** 산다 — `.env`의 `REMOTION_LOCAL=1`(옛 이름 `FACTION_LOCAL=1`도 인정)이 없으면 503과 사유를 돌려준다.

`media` · `media/folder` · `media/[episode]/[...path]` · `asset/[...path]` · `music` · `music/[...path]` · `voice/[episode]` · `voice/[episode]/[file]`.

주소 첫 토막을 시리즈 이름(`discourse`)으로 둔 것은 공용 사진 부품이 `/api/{시리즈}/media`를 부르기 때문이다 — 그 부품을 한 줄도 고치지 않고 쓴다(세력도감와 같은 판단).

⚠ 세력도감와 같은 함정을 그대로 안고 있다. `src/proxy.ts`의 matcher가 **이미지 확장자로 끝나는 주소를 로그인 검사에서 제외**하므로 라우트마다 `guardDiscourseRoute()`(로컬 스위치 + 관리자 확인)를 첫 줄에 두고, 경로 잠금(`lib/discourse-asset.ts`)을 겹친다. 둘 중 하나만 있으면 뚫린다.

### 랭킹

영상 시리즈 「랭킹」의 텍스트·구성 원천은 `sw/remotion/public/rankings/<편>/ranking-data.json`이다. 새 테이블은 없다. 인물마다 화보 위에 설명이 한 컷으로 붙는다. 인물 대사는 없다.

| 라우트 | 화면 | 하는 일 | 주요 원천 |
| --- | --- | --- | --- |
| `/rankings` | 랭킹 | 편 목록 표 하나. 축 수·인물 수. 「새 랭킹」은 표 위 | `public/rankings/*/ranking-data.json` |
| `/rankings/[episode]` | (편 이름) | 도감 테마를 걸고, 제목·축·순위·설명을 고친다. 「인물 사진」에서 아바타·대표 사진을 셀럽에 바로 등록하거나, 테마에 없는 이름을 연결한다. 오른쪽 사진 목록은 그 칸에 놓는다 | 위 JSON(`themeSlug`) + `celeb_tags`·`celebs`·개인화보 |

목록·저장·사진 창구는 렌더 저장소가 같은 컴퓨터에 있을 때만 동작한다(`.env`의 `REMOTION_LOCAL=1`). 사진 창구는 `/api/ranking/media`이며 라우트마다 `guardRankingRoute()`로 막는다. `src/proxy.ts` matcher가 이미지 확장자 주소를 로그인 검사에서 빼기 때문이다.

### 게임

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/blind-game` | 블라인드 게임 | 점수 랭킹(30건 단위), 최고점·최고 연승·평균, 상위 3명 | `blind_game_scores`, `member_profiles` |
| `/scores` | 점수 / 랭킹 | 랭킹과 점수 로그 두 탭, 총합·평균·최고 점수 | `member_scores`, `member_score_logs`, `member_profiles` |
| `/tier-lists` | 티어 리스트 관리 | 티어 리스트 목록, 유형·공개여부 필터와 통계 | `tier_lists`, `member_profiles` |

### 운영

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/today-figure` | 오늘의 인물 | 오늘 기준 앞뒤 7일(15건) 날짜별 선정 셀럽 확인. 출처 배지(뉴스·시드·예측). 조회 전용 | `daily_figures`, `celebs`, `celeb_contents` |
| `/guestbooks` | 방명록 관리 | 회원·셀럽 방명록 목록, 비공개·미확인 필터와 미확인 배지 | `member_guestbook_entries`, `celeb_guestbook_entries`, `member_profiles`, `celebs` |
| `/free-board` | 자유게시판 관리 | 글·댓글 탭, 노출·숨김 필터. 부적절한 글과 댓글을 숨김 처리 | `free_posts`, `free_post_comments`, `member_profiles` |
| `/reports` | 신고 관리 | 신고 목록. 상태·대상 종류 필터, 대기 건 우선 배치, 신고 대상 작성자 표시, 같은 대상에 쌓인 신고 묶음, 반복 신고·남발 집계(카운트 조회) | `reports`, `user_accounts`, `member_profiles` |
| `/reports/[id]` | 신고 상세 | 신고자·대상 작성자·처리 이력. **대상 원문 스냅샷**(글·댓글·방명록·감상 기록·프로필. 이미 지워졌으면 "삭제됨" 표시). 조치: 처리·반려·되돌리기 + 처리 메모, 대상 숨김·삭제, 계정 정지·해제 | `reports`, `user_accounts`, `member_profiles`, `free_posts`, `free_post_comments`, `board_comments`, 두 방명록 테이블, `feedbacks`, `member_contents` |

**신고는 사용자 웹에서 들어온다.** 접수 창구는 `sw/web`의 자유게시판 글·댓글, 방명록, 사용자 프로필이다. 신고 사유 목록의 정본은 `sw/web/src/constants/moderation.ts`이며 `sw/web-bo/src/constants/moderation.ts`가 같은 값을 들고 있다 — **한쪽만 고치면 운영 화면의 사유 라벨이 어긋난다.** 원문 조회는 `sw/web-bo/src/lib/report-snapshot.ts`가 대상 종류별 테이블·숨김 수단·삭제 가능 여부를 쥔다. 배경과 Play 정책 요건은 [안드로이드 앱 SSoT](./android-app-feasibility-review-2026-07-29.md) §5.1·§14.

⚠️ **관리자는 남의 차단 내역을 볼 수 없다.** `blocks`의 RLS가 차단한 본인 행만 select를 허용한다. 운영 화면에서 차단 관계를 다뤄야 하면 `SECURITY DEFINER` RPC 신설이 선행돼야 한다.
| `/titles` | 칭호 안내 | 코드 상수의 칭호 카드 그리드. DB 편집·획득자 수 집계는 제공하지 않는 읽기 전용 화면 | `sw/web/src/constants/titles.ts` |

`/free-board`는 `(admin)` **화면** 중 유일하게 service-role 클라이언트(`createAdminClient()`)를 직접 사용한다. 다른 화면은 모두 일반 클라이언트로 읽는다. 단 서버 액션은 별개다 — `celebs.ts`, `contents.ts`, `records.ts`, `reports/`, `dialogues.ts`, `today-figure.ts`, `members.ts`가 service-role을 쓴다.

### 시스템

| 라우트 | 화면 | 하는 일 | 주요 테이블 |
| --- | --- | --- | --- |
| `/activity-logs` | 활동 로그 | 활동 로그(30건 단위), 동작 유형 필터와 유형별 개수. 화면 안내상 90일 보관 | `activity_logs`, `member_profiles` |
| `/api-usage` | API 사용량 | 외부 API 키 호출 로그(50건 단위), 키·성공여부 필터, 성공률·키별·동작별 통계 | `api_keys`, `api_key_usage` |
| `/settings` | 운영 상태·설정 | 사용자 웹 응답, Oracle 웹 VM의 서비스·메모리·스왑·릴리스, DB VM의 PostgreSQL·연결·백업 상태를 조회하고 미구현 설정을 구분해 표시 | 읽기 전용 SSH + DB 시스템 통계 RPC |

## API 라우트

서비스 운영용 창구는 `src/app/api/` 아래 4개다. 모두 GET만 받는다. 영상 제작용 로컬 자산 창구(`api/faction/**`·`api/discourse/**`·`api/rm-asset/**`)는 별개이므로 위 [세력도감](#세력도감)·[가상 담화](#가상-담화) 절을 본다.

| 라우트 | 입력 | 하는 일 |
| --- | --- | --- |
| `/api/image-proxy` | `?url=` | 외부 이미지를 서버에서 받아 중계한다. **허용 호스트 11종만 통과**(아래 참조). `books.google.com`은 https로 강제한다. 429·403은 원본 URL로 넘기고, 204는 404로, 그 밖의 실패는 투명 1x1 PNG로 응답한다. 하루 캐시 |
| `/api/contents/search` | `?q=` (2자 이상) | 판본 제목으로 콘텐츠를 찾아 최대 20건 반환. 한국어 우선, 없으면 영문 |
| `/api/celebs/search` | `?q=` (1자 이상) | 셀럽을 한글·영문 닉네임으로 찾아 최대 10건 반환. 상태가 `active`·`inactive`인 것만 |
| `/api/voice/[...path]` | 경로 세그먼트 | 로컬 `sw/remotion/public/voice/` 아래 wav 파일을 서빙한다. 경로에 `..`이 있으면 400 |

`/api/voice`는 로컬 파일시스템에 직접 의존하므로 remotion 프로젝트가 같은 위치에 있어야 동작한다.

### image-proxy 허용 호스트 (26.07.16 신설)

`proxy.ts:15`가 이 창구만 로그인 검사에서 제외한다. 즉 **인증 없이 호출된다.** 대상 주소 제한이 없으면 임의 호스트로 서버 요청이 나가므로(SSRF) 허용 목록이 유일한 방어선이다.

허용 11종은 `content_locales.thumbnail_url` 전량을 실측해 확정했다 — 네이버(쇼핑·책), Apple Music, TMDB, Goodreads, OpenLibrary, Google Books, IGDB, 알라딘, YES24, 위키미디어. **R2는 이 창구를 타지 않는다**(셀럽 아바타 전용)라 제외했다.

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
| `actions/admin/fiction-sources.ts` | `/fiction-sources` |
| `actions/admin/records.ts` | `/records`, `/records/[id]` |
| `actions/admin/reports/` | `/reports`, `/reports/[id]` — 단일 파일에서 5개로 나눴다(`list`·`detail`·`history`·`abuse`·`moderation`) |
| `actions/admin/titles.ts` | `/titles` |
| `actions/admin/free-board.ts` | `/free-board` |
| `actions/admin/users.ts` | `/users`, `/users/[id]` |
| `actions/admin/members.ts` | `/members` 계열 (아래 결함 참조) |
| `actions/admin/tags.ts` | `/factions`·`/factions/[episode]`. 세력도감 편성은 셀럽 편집 화면에서 관리하지 않는다 |
| `actions/admin/celebs.ts` | `/celebs` 계열 일부 + `/members` 계열 잔재 + 죽은 `/celebs/quotes` |
| `actions/admin/dialogues.ts` | `/celebs/voice-gen` + 죽은 `/celebs/dialogues` |
| `actions/admin/api-keys.ts` | `/celebs` (아래 결함 참조) |

조회 전용 화면(`/`, `/notes`, `/playlists`, `/guestbooks`, `/today-figure`, `/blind-game`, `/scores`, `/tier-lists`, `/activity-logs`, `/settings`)은 무효화 대상이 없다.

서비스(web) 쪽 캐시 정책과 `/api/revalidate` 사용은 [external-services.md](../platform/external-services.md)를 참조한다.

## 역사적 정리 기록

26.07.16 조사에서 확인하고 교정한 이력이다. 아래에서 현재형으로 적힌 리다이렉트만 남아
있으며, 취소선 항목은 완료 기록이다.

### members 경로 — 리다이렉트 통로 9개

`(admin)/members/` 아래 9개 page.tsx는 전부 화면 없는 리다이렉트다. 과거 셀럽과 유저를
저장형 `profile_type` 탭으로 함께 보던 통합 "멤버 관리" 화면이 커밋 `ce9fc57c`에서
`/celebs`와 `/users` 둘로 갈라졌고, 옛 경로만 URL 하위호환용으로 남았다. 현재 분기는 전용
테이블을 읽어 만든 출력 필드 `subject_kind`를 사용하며 DB에 공용 유형을 다시 저장하지 않는다.

| 경로 | 보내는 곳 |
| --- | --- |
| `/members` | `/users` |
| `/members/new` | `/celebs/new` |
| `/members/[id]` | `subject_kind`로 분기해 `/celebs/[slug]` 또는 `/users/[id]` |
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
- ~~api-keys 무효화 대상~~ → `/api-usage`로 교정(3건).
- ~~죽은 컴포넌트·고아 라우트~~ → `celebs/dialogues/`·`celebs/quotes/` 디렉토리와 죽은 컴포넌트 3종 제거(945줄). **`members/` 트리는 보존** — `CelebForm`·`StatusToggle`·`MemberActions`·`NationalityBadge`가 살아 있다.

> **함께 잡은 것**: `/celebs/[slug]`는 slug 주소인데 여러 액션이 `/celebs/${id}`로 무효화하고 있었다. 키가 어긋나 무효화가 빗나간다. 라우트 패턴(`'/celebs/[slug]', 'page'`)으로 정확히 지정했다.
>
> 여기서 고친 `revalidatePath`는 **백오피스 자체 캐시**다. egress 사고와 직결된 `revalidateWebCache`(서비스 캐시 태그)는 이미 국소화돼 있어 건드리지 않았다.

**2차 조치 (26.07.16)**

- ~~1x1 픽셀 폴백이 실패를 은폐~~ → 제거. 네트워크 예외는 502, 원본에 없으면 404로 응답한다. **429·403 원본 리다이렉트와 204→404 변환은 의도된 처리라 보존했다** — 전자는 이 서버가 대신 뚫을 수 없는 제한이라 브라우저가 자기 쿠키로 직접 받으면 성공할 여지가 있고, 후자는 본문 없는 200이 나가면 브라우저가 빈 이미지로 읽기 때문이다.
- ~~고아 서버 액션 3개~~ → 제거. `getCelebsForQuotesEdit`·`updateCelebQuotes`·`getCelebsForDialogueEdit` 모두 `/celebs/voice-gen`이 대체한다(목록=`getCelebsForVoiceGen`, 저장=`voice-gen.ts`의 `saveQuote`). 제거한 쪽은 ko만 저장했고 voice-gen은 ko·en 둘 다 하는 상위 호환이었다.
- ~~`/celebs/stats` 404~~ → `getCelebStats` 조회에 slug 추가, 링크를 slug 기반으로 교정. **셀럽 1,674명 전원이 slug를 보유하므로(26.07.16 실측) 링크는 전부 유효해진다.** slug 없는 경우 링크를 걸지 않는 폴백은 안전장치다.
- ~~`/today-figure` 404~~ → 위와 **동일 결함**이라 같은 방식으로 교정.
- ~~`/settings` 거짓 문구~~ → "unstable_cache 적용으로 해결 완료" 삭제(근거 없음). 미구현 카드 4종은 갈 곳 없는 주소를 떼고 점선 테두리 + "준비 중" 배지로 바꿔 눌러지지 않음을 드러냈다.
- ~~`/login` 자동 로그인~~ → 체크박스와 `bo_auto_login` 저장·복원 코드 제거. 구현하지 않았다. 한번 로그인하면 Auth가 세션을 유지하므로 실사용 손해는 없다.

**남은 메모**

- **회원 → 셀럽 승격은 폐기했다.** 같은 사람이 회원과 등록 인물 양쪽에 필요하면 서로 다른 행으로 등록하고 명시적인 관계로 연결한다.
- **위키미디어 썸네일 2행이 비승인 크기다.** 저장된 주소가 위키미디어 정책상 거부된다("Use thumbnail sizes listed on..."). 데이터 문제.
- **생성 직후 `/members/${id}` 이동**. 스텁이 전용 테이블에서 만든 `subject_kind`로
  `/celebs/[slug]`에 정상 도달하므로 동작은 하지만 한 번 우회한다.

## 변경 후 확인

```bash
pnpm --filter @feelandnote/web-bo lint
pnpm --filter @feelandnote/web-bo build
```

메뉴를 바꿀 때는 `src/components/layout/Sidebar.tsx`의 `menuGroups`가 단일원천임을 지킨다. 화면만 추가하고 메뉴에 등록하지 않으면 위 `members` 사례처럼 접근할 수 없는 경로가 쌓인다.
