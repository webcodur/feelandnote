# 인물 이미지 지도

인물에 붙는 이미지 슬롯과 각 규격의 소유자를 정리한다. 이 문서는 저장·fallback 지도이며 구도와 발주 규칙은 각 자산 문서나 스킬이 쥔다.

서비스 용어는 다음처럼 구분한다.

- **아바타**: 얼굴 중심의 정사각 이미지
- **대표 사진**: 인물 상세 상단의 세로 환경 사진
- **개인화보·단체화보**: 세력도감의 인물·그룹 이미지

대표 사진을 `초상`이라 부르지 않는다. `초상`은 아바타를 가리키는 문맥과 게임 고유명에 이미 쓰인다.

## 슬롯

| 자리 | 저장 원천 | 파일·소비 | 규격 소유자 |
|---|---|---|---|
| 아바타 | `celebs.avatar_url` | R2 `celebs/{id}/avatar.webp`; 원형·작은 카드·식별자 | [`celeb-08-01-avatar.md`](celeb-08-01-avatar.md), `celeb-avatar-register` 스킬 |
| 아바타 작은 판 | 원본 아바타에서 파생 | 같은 R2 경로의 `avatar-sm.webp`; 작은 고정 크기 카드 | `packages/shared/src/constants/celeb-avatar-small.ts` |
| 대표 사진 | `celebs.portrait_url`, `portrait_caption(_en)` | R2 `celebs/{id}/photo.webp`; 인물 상세 입장부 | [`celeb-08-02-hero-photo.md`](celeb-08-02-hero-photo.md), `CELEB_HERO_PHOTO_SPEC` |
| 각성 이미지 | `celebs.awakened_image_url` | R2 `celebs/{id}/awakened.webp`; 화면 소비 방식은 미확정 | [`../../todo/celeb/awakened-mode.md`](../../todo/celeb/awakened-mode.md) |
| 세력도감 개인화보 | 제작 `faction_people.web_image_url` 또는 웹 전용 `celeb_tag_assignments.faction_image_url` | 화면은 `faction_atlas_members` 뷰에서 읽고 원본 비율로 표시 | `faction-celeb-sync`, `faction-image` 스킬 |
| 세력도감 단체화보 | `celeb_tags.team_images` | 태그별 단체 이미지 배열 | `faction-celeb-sync` 스킬 |
| 관계 외부 인물 | `celeb_relations_external.image_url` | 명단 밖 인물 식별 이미지 | [`celeb-07-01-relations.md`](celeb-07-01-relations.md) |
| 세계 배너 | 저장소 정적 파일 | `sw/web/public/images/worlds/`의 PC·모바일 파생본 | [`celeb-08-04-world-banners.md`](celeb-08-04-world-banners.md) |

세력도감 영상 제작 원본은 `factions/`에 있고 출간 도구가 운영 자산으로 올린다. 영상 원본 경로와 웹 DB 슬롯을 같은 값으로 다루지 않는다.

## fallback

- 인물 상세 대표 사진은 `portrait_url`을 우선하고, 없으면 연결된 세력도감 개인화보를 사용한다. 둘 다 없으면 상단은 아바타 레이아웃으로 바뀐다.
- 세력도감 큰 인물 자리는 개인화보가 없으면 아바타로 물러난다.
- 대표 사진에서 fallback 개인화보를 사용하면 `portrait_caption(_en)`을 표시하지 않는다. 그 캡션은 대표 사진 원본만 설명한다.

## 불변사항

- 얼굴로 자르는 것은 아바타뿐이다. 대표 사진과 세력도감 화보에 아바타 크롭을 적용하지 않는다.
- 아바타와 대표 사진은 독립 자산이다. 한쪽 갱신이 다른 쪽 생성·덮어쓰기 신호가 아니다.
- `avatar-sm.webp`는 같은 시점의 `avatar.webp`에서 만든다. 대표 사진이나 개인화보로 작은 판을 만들지 않는다.
- 아바타를 교체하면 원본·작은 판·`avatar_url` 캐시 버전을 같은 작업에서 갱신한다.
- 투명 아바타는 원본 확대만 보지 않고 서비스 배경과 실제 표시 크기로 합성해 확인한다.
- 대표 사진의 비율·저장 크기는 `CELEB_HERO_PHOTO_SPEC`만 바꾼다.
- 세력도감 개인화보의 운영 읽기 창구는 `faction_atlas_members`다. 제작 행과 웹 전용 배정을 화면에서 따로 합치지 않는다.

대표 사진과 각성 이미지 시안을 함께 비교할 때는 인물별 폴더에 나란히 둔다. 슬롯별 폴더로 갈라 같은 사람의 기본형과 각성형 비교를 어렵게 만들지 않는다.
