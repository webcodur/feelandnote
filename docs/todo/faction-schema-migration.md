# 도감 스키마 이관 — celeb_tags 계열 → faction_lv1/lv2/lv3 + faction_members

`celeb_tags` 계열을 걷어내고 층 이름 그대로의 전용 스키마로 이관한다(26.09.17 사용자 지시).
「신화의 세계」와 「세력도감」은 같은 뼈대의 화면 둘이고, 구분은 플래그다.

## 용어 — 층 이름이 곧 테이블명

| 층 | 테이블 | 화면에서 | 비고 |
|---|---|---|---|
| L1 | `faction_lv1` | 테마 — 세력도감의 분야(인공지능·산업…), 신화의 지역(한국·그리스·로마…) | 자식이 lv2인 행 |
| L2 | `faction_lv2` | 세력 카드 — 신화(일리아스·서유기) 또는 팩션(OpenAI·삼국지) | 인물을 거느린 행 |
| L3 | `faction_lv3` | 그룹 — 세력 안의 인물 묶음(올림포스 신·기초를 놓은 세대) | lv2 소속 |
| — | `faction_members` | 인물 배정 — celeb ↔ lv2(↔lv3) | `celebs`를 참조 |
| — | `faction_member_rows` | 배정 + 그룹 이름 읽기 뷰(단일 읽기 창구) | lv3 조인 |

- 「테마·신화·팩션·그룹·인물」은 화면·문서 어휘고, 스키마는 lv 계열로 통일한다.
- `is_fiction`(가상 세력 표시)은 기존 뜻 그대로 lv2 속성 — 신화 화면 소속이 아니다.
- `is_myth`(신설)는 「신화의 세계 가지 소속」 — lv1 지역 테마와 lv2 신화 카드 둘 다에 둔다.
- `lead_person_ids`(신설)는 lv2 속성 — 타이틀 아트 대표 인물, 배열 순서 = 세우는 순서.
- `atlas_published`는 서비스 어휘라 `published`로 바꿨다.

## 적용된 스키마 (20260917120000_faction_level_schema.sql, 운영 적용 완료)

```
faction_lv1(id, name, name_en, slug, color, sort_order, is_myth, is_featured,
            description, description_en, created_at, updated_at)
faction_lv2(id, lv1_id→faction_lv1 not null, name, name_en, slug, color, sort_order,
            description, description_en, is_myth, is_fiction, is_featured,
            published, lead_person_ids uuid[], team_images jsonb, theme_music,
            youtube_videos, start_date, end_date, created_at, updated_at)
faction_lv3(id, lv2_id→faction_lv2, name, name_en, description, description_en, sort_order)
faction_members(id, lv2_id→faction_lv2, lv3_id→faction_lv3 null,
                celeb_id→celebs, sort_order, hidden,
                short_desc, short_desc_en, long_desc, long_desc_en, image_url)
```

- `신화와 이야기` 뿌리 행은 폐기했다 — `is_myth`가 판정을 대신한다. 지역 테마는 `is_myth=true`인 lv1.
- 행 id는 옛 `celeb_tags`/`celeb_tag_groups`/`celeb_tag_assignments`의 id를 그대로 이어받는다 — URL·RPC 인자가 무효화되지 않는다.
- 죽은 컬럼(spotlight_image_url·quote 계열·group_subtitle·group_color·group_logo_url·person_id·source)은 이관하지 않았다.
- RPC 4개(count_celebs_filtered·get_celebs_sorted·get_celebs_trending·get_tracker_candidates)는 새 표를 읽게 갈아끼웠다. 죽은 `get_tag_celeb_counts`는 삭제.
- 웹 공개 트리거 `web_revalidate_trigger`는 `faction_members`에도 단다(인자는 `lv2_id`·`celeb_id`).

## 이관 상태

- [x] **스키마 생성 + 데이터 이관** — 운영 적용 완료. lv1=30(분야 12+지역 18)·lv2=244(팩션 207+신화 37)·lv3=802·members=4564. 신화 37개 전부 지역 lv1 소속·lead_person_ids 3인 이식. published 백필 대조 불일치 0.
- [x] **웹 읽기 전환** — `sw/web` 전 경로가 새 표·뷰를 읽는다. `MythTradition`→`Myth`·`?tradition=`→`?myth=` 개명 포함. tsc·테스트 통과.
- [x] **BO 쓰기·편집 전환** — `tags.ts`→`factions/entries.ts`, `factions/themes.ts`→`factions/board.ts`, `myths.ts`·`myth-music.ts`·`celebs.ts`·`content-research.ts`·`rankings/celebs.ts` 전환. 컴포넌트는 `ThemeAtlas/`→`entry/`, `AtlasRows`→`EntryRows` 등으로 개명. 신화 편집은 `?myth=`로 고른다. 스크립트(seed-inactive·audit·founding-myth·_flag)도 새 표로 전환.
- [x] **배포 + 구표 제거** — 웹 f5b071ce로 운영 배포(카나리·Cloudflare 퍼지 완료) 뒤 `20260917140000_drop_celeb_tag_schema.sql`을 적용했다. `celebs`·`celeb_contents`·`celeb_metrics`의 공개 RLS 3건이 옛 뷰를 읽고 있어 `faction_member_rows`로 갈아끼운 뒤 `celeb_tag_assignments`·`celeb_tag_groups`·`celeb_tags`·`faction_atlas_members`(public)·`faction_atlas_members_source`(private)·`get_tag_celeb_counts`를 한 트랜잭션으로 드롭했다. 생성 타입은 수동 정합 상태 — 다음 스키마 변경 때 재생성으로 마무리한다.
- [x] **이름 정리 잔여** — 카드명 「건국 전승」7건 → 「건국 신화」로 DB 변경 완료(영문 `Founding Lore` → `Founding Myth`). 「사부육」→「철선공주」도 함께 정정했다.

## 후속 정리 (26.09.18 완료)

- [x] **RPC 인자명** — `p_tag_id`→`p_faction_id`. `20260918120000_faction_naming_cleanup.sql`이 `count_celebs_filtered`·`get_celebs_sorted`를 DROP+재생성하고, 호출부(web getCelebs·BO celebs)도 함께 바꿨다. 생성 타입의 Args·Returns도 라이브 서명과 대조해 맞췄다(빠져 있던 `p_celeb_realities`·생년 범위·`consumption_philosophy`·`celeb_reality` 보정, stale `cultural_journey` 제거).
- [x] **캐시 태그 `'tags'`→`'factions'`** — `CACHE_TAGS.FACTIONS`, DB 허용 도메인·트리거 인자를 같은 마이그레이션으로. 전환기 호환은 `normalizeLegacyCacheTag`가 `'tags'`→`'factions'`를 정규화해 받는다.
- [x] **코드 명명 잔재 전수 개명** — `getTag*`→`getFaction*` 파일·함수, `getFeaturedTags`→`getFeaturedFactions`, `FeaturedTag`→`FeaturedFaction`, `FactionTagItem`→`FactionItem`, `CelebTagInfo`→`CelebFactionInfo`, `CelebProfile.tags`→`factions`, `CelebTagsModal`→`CelebFactionsModal`, `getFactionTagName`→`getFactionName`, `faction-theme-*`→`faction-*`, `FactionAtlasScreen`→`FactionScreen`, `faction/atlas/`→`faction/entry/`(`FactionThemeView`→`FactionEntryView`·`FactionThemeMusic`→`FactionMusic`·`FactionAtlasNav`→`FactionNav`), `getMythAtlas`→`getMythData`+`mythAtlas*`→`myth*`(`MythAtlas`→`MythScreen`), 공용 선택기 `AtlasNav`→`ExploreNav`·`AtlasPickerSheet`→`ExplorePickerSheet`·`AtlasStage`→`RankingStage`, `FactionSection.tag/themes`→`faction/entries`, 내부 `tagId`/`tagIds`→`factionId`/`factionIds`, 게임 `axis: "tag"`·엣지 `type: "tag"`→`"faction"`.
- [x] **BO `RankingEditor.tsx` hook 경고** — `names`/`slugs`를 effect 안에서 key로부터 펼쳐 의존성 누락 해소.
- [x] **저장소 스크래프 삭제** — `sw/web-bo/.tmp/`, `sw/web/.next-html-size-audit/`, `.claude/worktrees/expressive-whistling-lollipop/`.
- [x] **BO 대표 인물 UI 실사용 검증** — aside 브라우저로 `/myths?myth=` 편집기 진입, `MythLeadPanel` 대표 3인 재배치→저장→`lead_person_ids` 반영→공개 타이틀 아트 순서 반영→원복까지 확인.

## 주의

- 남긴 옛 이름(외부 계약·자산): URL 파라미터 `?tag=`(`/explore/faction` 리다이렉트)·`?tagId=`(`/explore/figures` 공유 링크), 랭킹 JSON `themeSlug`, `/images/myth-atlas/` 정적 자산 경로, `CelebAtlasRails` 내부 컴포넌트명(CSS 변수·i18n 키 결합), 게시판 태그 도메인 `searchTags`(faction과 무관), i18n 키 `home.ui.tags`, revalidate API 요청 본문의 `tag` 필드.
- 배정의 `hidden`·`sort_order`·`image_url`(옛 faction_image_url)·한 줄 소개(ko·en)는 members로 그대로 갔다.
- 셀럽 모달·연대기 서가·게임처럼 도감 밖에서 쓰는 읽기도 같은 표를 읽는다 — 전환 누락 없음 확인됨.
- L2는 `lv1_id` NOT NULL — BO의 새 세력 만들기는 분류 선택이 필수다.
- `celeb:seed:factions`(신규 인물 일괄 배정)는 원격에서 추가될 때 옛 표를 쓰고 있어 후속 커밋으로 전환됐다. 새 스크립트를 가져올 때 표 참조를 확인하는 습관이 필요하다.
- 배포 과정에서 `FloatingMusicPlayer.tsx`처럼 개명된 모듈을 쓰는 미커밋 파일이 빌드를 깼다 — 이관 커밋 전에 `git status`의 미커밋 파일도 임포트 대조 대상이다.
