# 셀럽 데이터 함정 모음

셀럽(profiles·celeb_dialogues·celeb_influence·user_contents·content_locales) 데이터를 다루다 실제로 사고가 났던 지점과 그 진단·복구 절차를 모은 문서다. 셀럽 등록·승격·대사/명언 작업, 목록·상세 페이지가 안 뜨는 문제, 세력도감 태그 개편, 책 메타 출처 선택을 할 때 착수 전에 읽는다. 파이프라인 정의 자체는 `docs/project/celeb/celeb-pipeline.md`, 스키마는 `docs/project/db-celeb.md`가 SSoT이고 이 문서는 그 위의 "밟으면 터지는 곳" 목록이다.

---

## 1. 목록 노출 기준 — celeb_tier

셀럽 목록 노출 기준은 `status` 게이트가 아니라 **등급(`celeb_tier`) 필터**다(2026-07-16 전환). fiction 48명 + relation 5명 = 53명을 `status='active'`로 올렸고, 그 결과 **상세 페이지는 열리되 목록에는 안 뜨는** 상태가 정상이다.

- **SSoT**: `packages/shared/src/constants/celeb-tiers.ts` — `CelebTier`, `LISTING_DEFAULT_TIERS`(full·light), `INDEXABLE_TIERS`(full), `parseCelebTiers`. 등급 타입 정의는 이 파일 하나뿐이며 `getUserProfile`·`types/home`도 여기서 가져다 쓴다.
- **RPC**: `get_celebs_sorted` / `count_celebs_filtered`의 인자는 `p_celeb_tier text`가 아니라 **`p_celeb_tiers text[]`**다. NULL은 "제한 없음"이라 **인자를 안 주면 신화(fiction)·관계(relation) 등급이 목록에 샌다.** `getCelebs`가 기본값을 넣어 막는다. web-bo는 의도적으로 null을 넘겨 전체를 노출한다.
- **필터 UI**: `/explore/figures?tier=` — `fiction`·`relation`·`all`·쉼표 복수(`fiction,light`)를 지원한다. 미지정이면 기본 등급.
- `get_top_celebs_across_eras`·`get_celeb_feed_type_counts`·타입별 수치는 손댈 필요가 없다. `user_contents` 기반이라 콘텐츠 0건인 fiction·relation은 구조상 낄 수 없다.

### 목록이 조용히 비고 캐시에 박히는 사고

DB 함수 **시그니처 변경이 배포 시차 사고**를 만든다. 옛 시그니처를 지우면 배포 전 코드가 함수를 못 찾는데, `getCelebs`가 rpc error를 검사하지 않아 **에러 없이 빈 목록**이 되고 그 빈 결과가 `unstable_cache`(1시간)에 그대로 박힌다.

- **복구**: `/api/revalidate` 호출(tag=`celebs`, `CRON_SECRET`).
- **재발 방지**: 시그니처를 바꿀 때 구 시그니처 shim을 함께 배포하고, 배포 완료 후에 DROP한다. 그리고 rpc error를 검사해 던진다(조용한 폴백 금지 — `docs/project/tooling-gotchas.md` 참조).

---

## 2. 셀럽 페이지가 안 뜰 때 — 증상별 원인

| 증상 | 원인 | 조치 |
|---|---|---|
| 404 "페이지를 찾을 수 없습니다" | `profiles.slug`에 비ASCII 문자(강세부호)가 박힘 | slug 생성 표현식의 문자 대치쌍 보강 |
| SSR 500 | `celeb_dialogues.lines` 원소가 문자열이 아니라 객체 `{text, quote}` | 문자열 배열로 정정 |

### 404 — slug 비ASCII

`profiles.slug`는 `nickname_en` 기반 **generated column**이다(직접 UPDATE 불가, 이름을 고치면 자동 반영). 옛 표현식이 강세부호를 떼지 않아 `Camilo José Cela` → `camilo-josé-cela`처럼 URL에 비ASCII가 새어나가 404가 났다.

- 2026-07-14 마이그레이션 `slug_strip_diacritics`가 표현식에 `translate()` 문자 대치를 넣어 ASCII로 자동 변환한다(José→jose, André→andre, Müller→muller, Shōwa→showa, Jokić→jokic 등 11명 일괄 교정).
- `translate`는 IMMUTABLE이라 generated column에 쓸 수 있다. `unaccent` extension은 STABLE이라 못 쓴다.
- 점(`.`)·어퍼스트로피(`'`)는 URL에서 정상 동작하므로 보존한다(`dr.-dre`, `shaquille-o'neal`은 그대로 둔다).
- **재발 조건**: 대치쌍에 없는 희귀 문자(ß, æ 등)가 새 인물에서 나오면 slug에 남아 404가 난다. `translate` from/to 쌍을 추가해 대응하고, from/to 길이를 반드시 일치시킨다.

### 500 — 대사 원소가 객체

스키마 SSoT(`docs/project/celeb/celeb-speech.md`)는 `lines`가 `"[emotion] 대사"` 형태의 **문자열 배열**이다. 원소가 객체면 `DialogueSection`의 `l.trim()`이 `l.trim is not a function`으로 터져 SSR 500이 난다.

- 진단 쿼리: `jsonb_typeof(lines 값 -> 0) = 'object'`.
- 2026-07-14 18명 교정(마이그레이션 `fix_dialogue_object_lines_to_string`, 백업 테이블 `celeb_dialogues_bak_20260714`).

### 교정했는데도 그대로일 때 — 캐시

조회 결과가 slug 키로 `unstable_cache`에 7일 캐싱된다(`STATIC_REVALIDATE=604800`). 교정 후에도 옛 404/500이 계속 보일 수 있다.

- 프로덕션: `POST /api/revalidate {tag:'celebs', secret: CRON_SECRET}` 또는 재배포로 즉시 해소.
- dev 함정: 아직 존재하지 않는 slug를 미리 curl로 찔러 404를 받으면 그 null이 캐싱돼, slug를 고쳐도 dev에서 계속 404가 난다. 프로덕션(새 URL)은 무관하다.

---

## 3. 대사 데이터 3대 결함 (celeb_dialogues)

2026-07-16 세션2 전수 감사(영문 대사 미번역 746명 처리)에서 드러난 유형이다. 대사·명언 작업 시 이 셋을 먼저 의심한다.

**1) 옛 키 `answer`가 표준 키 `roll_call` 자리를 점유** — 가장 흔하다(세션2에서 91명 정리). ko/en 상황키별 대사 개수를 대조하면 `roll_call`이 비어 보여 **"부분 미번역"으로 오인**하게 되는 주범이다. 표준 상황키는 `roll_call`(SSoT: `sw/web/src/lib/game/voice/types.ts`)이고 `answer`는 옛 잔재이며 그 내용은 대개 원문과 무관한 범용 문구다.
- `roll_call`이 이미 채워졌으면 answer만 제거: `lines_en = lines_en - 'answer'`.
- `roll_call`이 비었으면 ko 원문 기준으로 재번역해 채우고 answer 제거.
- ko `lines`에도 answer가 2행 있었다(장 드 묑·가의) → `(lines - 'answer') || jsonb_build_object('roll_call', lines->'answer')`로 rename.

**2) 원문 무관 오염 대사** — 일부 인물의 `lines_en`에 한국어 원문과 무관한 창작 전투 대사나 딴 인물 내용이 박혀 있었다(예: 사토시 나카모토가 불교 수행자풍). 한국어 원문이 빈 문자열인 상황키는 영문도 같은 개수의 빈 문자열로 정정한다(창작 금지). ko가 21개 완비면 en도 21개 완비가 목표다.

**3) 동명이인 혼입(프로필 통째 뒤섞임)** — 조 샐다나(bio·대사는 배우인데 `nickname_en`이 `Joe Tsai`로 오염), 칼 어번(`nickname_en`·ko 대사는 배우 Karl Urban인데 bio·en 대사가 가수 Keith Urban), 톰 브라운(bio·이름·주소·en은 AI 연구자 Tom Brown인데 ko 대사만 패션 디자이너 Thom Browne). 정본은 **증거 다수결**로 판단하되 방향이 모호하면 유저에게 확인한다.

**세션2 최종 무결(실측)**: 영문 대사 미번역 0, `answer` 잔재 영·한 모두 0, ko↔en 대사 배열 길이 불일치 0, 명언 한·영 1,411쌍 완전 일치(한쪽만 0인 경우·역전 해소), ko 21개 완비 인물 중 en 완비 1,547명. 명언 정본은 `lines.quote` / `lines_en.quote`다. 인물 발언 조사 시 모국어 키워드 검색을 병행한다.

**부수 함정**: `profiles`에는 `updated_at` 컬럼이 없다(`celeb_dialogues`에는 있다). 기존 감정 태그 표기는 영문이지만, 이는 AI가 문장 인상으로 배정하는 분류가 아니다. **ELE 보이스를 실제로 들은 사용자가 발화를 보완하는 합성 지시**이므로 AI 대사 작업자는 새 태그를 만들거나 기존 태그를 고치지 않는다. 기존 값은 보존하고 본문만 다룬다(`celeb-speech.md` 「발화 지시 태그 운영권」).

---

## 4. 등급 승격 조건 — full은 콘텐츠 필수

`profiles.celeb_tier='full'`은 감상 콘텐츠(`user_contents`)가 1건 이상 있어야 유효하다. 콘텐츠 0개인데 full이면 프로필 콘텐츠 탭이 빈 채로 full로 표시되는 룰북 위반이다.

- **왜 생기나**: `celeb_tier` 기본값이 `'full'`이고 제약이 없어 콘텐츠 없이 full이 쉽게 만들어진다(트리거 설치 전 full 1,286명 중 23명이 콘텐츠 0개였다).
- **강제 장치**: 2026-06-22 트리거 `trg_celeb_full_requires_content`(함수 `public.enforce_celeb_full_requires_content`) 설치. `profile_type='CELEB'`이면서 **full로 새로 전환되는 시점**만 검증한다(INSERT, 또는 OLD가 full/CELEB이 아니던 행의 UPDATE). 콘텐츠 0건이면 `check_violation` 예외를 던진다. 이미 full인 행의 다른 필드 수정·일반 유저·강등(full→light)은 통과한다.
- **적용**: full이 필요하면 콘텐츠 수집(celeb-2-content-collector)을 먼저 하고 승격한다. 콘텐츠 없이 프로필만 풍부하게 채울 거면 light로 둔다. light도 페르소나·발화·영향력·감상여정을 모두 가질 수 있고 콘텐츠 탭만 숨는다.

---

## 5. 셀럽 선정 기준 — 그 사람을 다룬 책이 있는가

등록·유지 기준은 **그 사람에 대해 언급·서술하는 책(전기·평전·연구서·사상사 등)이 충분히 존재할 만한 인물인가**다. 그가 쓴 책이 아니라 그를 다룬 책이다.

- **왜**: 감상 기록 건수는 기준이 아니다. 진시황·마리 퀴리·괴테·관우도 기록이 1~2건이지만 누구도 가볍게 보지 않는다. 문제는 인물의 격(格)이다. 인지도만 높고 격이 약한 "일반인 느낌" 인물이 위대한 역사 인물과 같은 풀에 섞이면 서비스 전체 품격이 떨어진다. 한국 청년층 인지도를 1순위로 둔 큐 기준이 이 혼입을 만들었다.
- **기준 강도**: "단독 정식 전기가 출간됐는가"로 좁게 보면 안 된다. 생존 현역이라 아직 전기가 없을 뿐인 세계적 톱스타(오스카 수상 배우·그래미 다관급 가수 등)는 영화사·음악사 책에서 충분히 언급되므로 유지 대상이다. 기준은 "언급되는 책이 충분한가"다.
- **미달 예시**: 현대 웹툰 작가, 무명 AI 스타트업 공동창업자·임원, 유튜버·팟캐스터, 양산형 대중 장르작가, 무명 조연 배우.
- **적용 범위(2026-05-25 결정)**: 이미 등록된 인물은 소급 제거하지 않는다. 이 게이트는 **신규 발주(큐에서 새로 추가)** 시에만 적용한다. 파괴적 제거(DB 삭제)는 유저가 명시 지시할 때만 한다.

---

## 6. 책 메타 출처 제한 — kakao_book / openlibrary만

> ✅ **26.08.01 네이버 흔적을 전량 제거했다.** `naver_book`은 허용값 목록에서 빠졌고 DB·코드에 0건이다(표지 97장은 대체재가 없어 빈칸으로 뒀다). 아래는 그 전환 기록이다.
>
> 🔄 **26.08.01 한국어판 출처가 네이버 → 카카오로 바뀌었다.** 네이버가 검색 API 중 「쇼핑·책·전문자료」를 2026-07-31자로 종료했고([공지 32564](https://developers.naver.com/notice/article/32564)), 래퍼와 전용 스크립트는 전량 제거했다. **`naver_book`을 신규 등록에 쓰지 마라. `naver-books` 래퍼를 다시 만들지도 마라** — 되살릴 API가 없다. 기존 `naver_book` 4,021건은 데이터로 보존한다. 전환 내역은 `docs/project/external-services.md`의 「외부 콘텐츠 검색 API」 절이 SSoT다.

celeb-2-content-collector 파이프라인에서 `contents.external_source` 값은 BOOK일 때 **kakao_book**(한국어판) 또는 **openlibrary**(영문 원서)를 쓴다. 카카오에 없어 서점 상품 페이지로 직접 잡은 경우만 **aladin**을 쓴다. 룰북: `docs/project/celeb/celeb-2-content-collector.md`의 "영문판 매칭 분기" / "external_source 값" 절.

- **google_books 금지**: 키 만료가 잦고 동양 고전에서 한자 음차본·해설서 false positive가 많다. 기존 250건은 보존을 위해 enum에 남아 있으나 신규 사용 금지.
  - **서지 조회뿐 아니라 「책 본문에 이 문장이 있는지」 확인 용도로도 쓰지 마라.** 같은 일일 할당량을 공유해 금방 막힌다(26.07.27 실제로 소진). 본문 대조는 OpenLibrary로 아카이브 아이템 id를 찾는 데까지만 되고, 그 다음이 전부 막혀 있다(실측): 전문 텍스트 `_djvu.txt`는 대출 제한 도서면 401/403, 아카이브 본문 검색 `BookReader/BookReaderSearch.php`는 404로 폐기, `api.archivelab.org` 접속 거부, `ia-pub-fts-api.archive.org` DNS 부재, HathiTrust 전문 검색 403. **즉 저작권 있는 현대 서적의 본문 인용 확정은 온라인으로 불가하다** — 못 하는 일에 시간을 쓰지 말고 미확인으로 보고하라.
- **amazon 금지**: 공식 API가 없고 상품 페이지 스크래핑은 접근권 제한·신뢰도가 빈약하다. 영문 줄 `sources.primary` 분포에서 실사용 0건이라 룰북에서 제거했다.
- **wikipedia 금지**: ISBN 없는 책은 독자가 그 책으로 도달할 수단이 없다. 영역본이 없는 동양 고전은 **영문 줄 등록 자체를 폐기**하고 ko 줄만 유지한다.

**적용 분기**
- 한국어판 있는 책: `external_source='kakao_book'`, ko 줄 채움, en 줄은 OpenLibrary로 영문 메타를 잡아 채운다.
- 영문 원서만 있는 책: `external_source='openlibrary'`, en 줄만 채운다(ko 줄 미등록 또는 음역).
- 영역본도 OpenLibrary로 못 잡는 책: 영문 줄 등록 폐기. 무리해서 등록하지 않는다.

**자리 구분(혼동 방지)**
- `contents.external_source`: 책 1권당 1개. **이 책의 ISBN·표지를 어느 외부 데이터 DB에서 잡았는가**. 인터뷰 출처가 아니다.
- `user_contents.source_url`: 셀럽이 그 책을 추천한 **인터뷰·기사·블로그 URL**. 자유 입력, 제약 없음.
- `content_locales.sources.primary`: 영문 줄·한국어 줄 각각의 메타 출처. 자유 형식, 제약 없음. OpenLibrary가 늘 자유롭게 들어와 왔다.

---

## 7. ko 작업 시 en 동시 수정 금지

ko 관련 작업(콘텐츠 수집, DB 등록, ko.json 작성·수정, review 작성 등)을 요청받았을 때 en 데이터(en.json, `review_en`, `content_locales` en 로케일 등)를 함께 자동으로 손대지 않는다.

- **왜**: 유저가 명시적으로 금지했다. DB 정비에서 ko만 손봐달라 했는데 en 로케일까지 자동 등록한 것이 계기다.
- 유저가 "en 검토/수정/번역"을 명시적으로 지시한 경우에는 당연히 수정 대상이다.
- 모호하면 임의 해석하지 말고 객관식으로 되묻는다.

---

## 8. 세력도감 태그 상위 그룹 — `celeb_tags.parent_id`

`/explore/faction` 태그는 상위 그룹으로 계층화돼 있다(2026-07-05 개편). 처음엔 코드 상수(`sw/web/src/constants/factionGroups.ts`)로 관리했으나 **26.07.26에 DB 컬럼 `celeb_tags.parent_id`로 승격했고 그 상수 파일은 삭제됐다.**

- **SSoT**: `celeb_tags.parent_id`(자기참조 FK, `on delete set null`, 인덱스 `idx_celeb_tags_parent_id`). 마이그레이션 `add_celeb_tags_parent_id`.
- **그룹 헤더는 플래그가 아니라 판정 결과다** — 자식을 하나라도 가진 태그가 곧 그룹이다. 헤더 자신도 배정 인물 0인 일반 태그 행이다. 8개 그룹 — `ai`, `rulers-and-empires`, `heroes-of-turbulent-times`, `the-thinkers`, `revolutions-and-founding`, `art-movements`, `self-made-innovators`, `against-adversity`. 맨해튼(`manhattan-project`)은 단독이다.
- **조회**: `getFeaturedTags`가 태그 전량의 `parent_id`를 세어 `isGroup`(자식 보유)·`parentSlug`(부모 slug)를 부착하고, 그룹 헤더는 `if (!assignments.length && !isGroup) continue` 예외로 목록에 남긴다(평면 배열 유지).
- **자식 표시 순서는 `sort_order`뿐이다** — 별도 순서 컬럼이 없다. 그래서 `sort_order`는 그룹 → 그 자식 차례로 이어지게 유지해야 한다(승격 백필 때 0~39로 재부여). 이 규칙이 깨지면 자식이 엉뚱한 자리에 뜬다.
- **위계는 두 단계까지**. 자식을 가진 태그는 다른 그룹에 못 들어가고, 이미 속한 태그는 부모가 못 된다 — `updateTag`가 막는다.
- **UI**: web은 `factionGrouping.ts`(`topLevelTags`·`childTags`·`groupPreviewCelebs`·`groupCelebCount`) + 섹션 헤더형 렌더(`FactionIntroView`/Drawer/Sheet). 관리는 web-bo `/factions` 목록(들여쓰기 표시)과 `/factions/themes/[tagId]`의 「상위 묶음」.
- 설계 경위는 `docs/project/faction-ai-group-refactor.md`(상수 시대 기록).

---

## 9. 인물 관계망(`celeb_relations` / `celeb_relations_external`)

- **비공개(`status='inactive'`) 셀럽이 관계망에서 통째로 사라졌다(26.07.26 교정).** 관계 상대가 우리 명단에 있으면 `celeb_relations`에 들어가고 위키데이터 수집분(`celeb_relations_external`)에서는 빠진다. 그런데 화면이 `status='active'`만 통과시켜, 명단에 있으나 비공개인 상대는 **양쪽 어디에도 안 뜨는 사각지대**였다(엘론 머스크의 동생 킴벌, 관계 57건·인물 39명). 지금은 비공개 상대도 이름 노드로 세우고 이동만 막는다(`slug=null`, 위키데이터 링크는 `profiles.wikidata_qid`).
- **혈연에는 인원 상한을 적용하지 않는다.** 세대 자리가 곧 정보라 자식 44명·형제 43명인 인물도 가계도에 전부 세운다. 접이식 목록(ROW_CAP 8)은 사회 관계 전용. 화면 폭에 접혀 여러 줄이 되면 줄마다 모선을 놓고 세로 줄기로 잇는다.
- **관계 근거 한 줄은 `note`(한국어) + `note_en` 짝이다.** 캐시가 언어를 안 타므로 둘 다 내리고 화면에서 고른다. `label_ko`/`label_en` 컬럼은 전량 비어 있고 아무도 안 읽는 죽은 칸이다 — 쓰지 마라.
- **수집 스크립트(`sw/web-bo/scripts/sync-celeb-relations.ts`)는 `source='wikidata'` 행을 지우고 다시 쓴다.** 수동 수록분(`manual`)은 보존되지만 위키데이터 출처 행에 손으로 넣은 값은 재실행 때 날아간다. 공동 창업 근거는 스크립트가 ko/en 조직명으로 양쪽을 함께 생성한다.
- **위키데이터 인물의 한국어 이름이 절반 넘게 없다(7,807건 중 4,178건).** 이름이 없으면 영문 표기로 대신 띄우므로 한국어 화면에 `Arcadia Musk` 같은 표기가 나온다. 영문 이름 결측은 36건뿐. 미해결.

## 10. Supabase MCP가 죽었을 때 셀럽 등록 우회

Supabase MCP(`mcp__supabase__*`)가 `Unauthorized. SUPABASE_ACCESS_TOKEN` 에러로 막힐 때 REST로 직접 등록하는 통로다. 토큰이 왜 반복해서 죽는지는 `docs/project/tooling-gotchas.md`를 본다.

- 서비스 키: `sw/web-bo/.env`의 `SUPABASE_SERVICE_ROLE_KEY`. 프로젝트 ref `wouqtpvfctednlffross`.
- **계정 생성**: `POST /auth/v1/admin/users {email, email_confirm:true}`로 id 확보 → `PUT /auth/v1/admin/users/{id} {email:"celeb_{id}@feelandnote.local"}`. 트리거가 `profiles` 행을 `profile_type=USER`로 자동 생성하니 PATCH로 CELEB 전환한다. **`profiles.email`에도 임시 email이 잔존**하므로 PATCH 본문에 `email: celeb_{id}@feelandnote.local`을 포함해 정정한다.
- **한글 저장은 `curl.exe` + `--data-binary @파일` 필수.** PowerShell `Invoke-RestMethod`와 node fetch(POST+body)는 한글 이중 인코딩·DNS 오류로 DB를 파손시킨다. body를 UTF-8 파일로 쓰고 curl로 보낸다. GET(읽기)은 `Invoke-RestMethod`로 무방하다.
- 파일럿 검증을 마친 헬퍼: `create-celeb.mjs`(계정 + profiles + 중복 스킵).

### 컬럼 함정

1. `profiles`에 `quotes` 컬럼은 **없다**. 명언은 `celeb_dialogues.lines.quote`에 넣는다.
2. 감상여정 저장 칸은 `consumption_philosophy`다(`cultural_journey`는 generated).
3. `celeb_influence`는 평면 컬럼이다(`political`·`political_exp`·`..._exp_en`·`transhistoricity`, `total_score`는 트리거 자동).
4. `celeb_dialogues`의 실제 컬럼은 `celeb_id`·`lines`·`lines_en` 셋뿐이다.
5. `slug`는 `nickname_en` 기반 generated이므로 악센트를 넣으면 slug에 박힌다. ASCII로 쓴다(2절 참조).
