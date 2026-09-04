# 인물 문서

인물 작업은 [`celeb-00-01-pipeline.md`](celeb-00-01-pipeline.md)에서 티어 축과 실존 축을 먼저 가른다. 공개 여부는 [`celeb-00-02-publication.md`](celeb-00-02-publication.md), 물리 테이블과 제약은 [`../data/03-celeb.md`](../data/03-celeb.md)가 쥔다.

파일명의 두 자리 숫자는 실행 단계가 아니라 탐색기 정렬용 도메인 주소다. 두 번째 숫자는 같은 도메인 안의 읽기 순서이며 문서 제목에는 번호를 붙이지 않는다.

## 실존 축별 범위

| 도메인 | `REAL`·`BOTH` | `FICTION` |
|---|---|---|
| 기본 프로필·아바타·공개 상태 | 적용 | 적용 |
| 일반 감상 콘텐츠 `celeb_contents` | 적용 | 사용하지 않음 |
| 등장·연관 도서 `figure_book_*` | 적용 | 적용 |
| 영향력·스펙트럼 | 적용 | 만들지 않음 |
| Speech | 한영 | 한국어, 영문은 요청 범위 |
| 인물 안내·연표·관계 | 적용 | 원전 근거로 적용 |

`celeb_tier`는 이 표와 독립이다. 신규 인물은 실존 축과 무관하게 `light`로 시작하고 첫 `celeb_contents` 관계가 생기면 DB가 `full`로 자동 승격한다. 따라서 `full`과 `light`는 별도 제작 등급이 아니라 감상 콘텐츠의 진행 단계이며, `FICTION`은 `celeb_contents`를 쓰지 않으므로 사실상 `light`에 머문다.

등장·연관 도서는 두 축 어느 쪽과도 무관하게 모든 인물에 붙는다. 관우가 『삼국지연의』를 가지듯 실존 인물도 자신이 등장하는 도서를 가진다.

## 문서 지도

| 주소 | 책임 | 문서 |
|---|---|---|
| 00 | 두 축 분기와 공개 경계 | [`celeb-00-01-pipeline.md`](celeb-00-01-pipeline.md) · [`celeb-00-02-publication.md`](celeb-00-02-publication.md) |
| 01 | 기본 프로필 | [`celeb-01-00-profile.md`](celeb-01-00-profile.md) · [`celeb-01-01-profile-facts.md`](celeb-01-01-profile-facts.md) · [`celeb-01-02-profile-intro.md`](celeb-01-02-profile-intro.md) |
| 02 | 감상 콘텐츠와 인물 등장·연관 도서 | [`celeb-02-01-content-research.md`](celeb-02-01-content-research.md) · [`celeb-02-02-content-registration.md`](celeb-02-02-content-registration.md) · [`celeb-02-03-content-review.md`](celeb-02-03-content-review.md) · [`celeb-02-04-content-audit.md`](celeb-02-04-content-audit.md) · [`celeb-02-05-figure-books.md`](celeb-02-05-figure-books.md) |
| 03 | 영향력·스펙트럼 | [`celeb-03-01-influence.md`](celeb-03-01-influence.md) · [`celeb-03-02-spectrum.md`](celeb-03-02-spectrum.md) |
| 04 | 말투·한마디·상황 대사·가상독백 | [`celeb-04-01-speech.md`](celeb-04-01-speech.md) · [`celeb-04-02-speech-pipeline.md`](celeb-04-02-speech-pipeline.md) · [`celeb-04-03-virtual-monologue.md`](celeb-04-03-virtual-monologue.md) |
| 05 | 읽어보기 인물 안내 | [`celeb-05-01-reading.md`](celeb-05-01-reading.md) |
| 06 | 생애·서사 연표 | [`celeb-06-01-timeline.md`](celeb-06-01-timeline.md) · [`celeb-06-02-timeline-real-relay.md`](celeb-06-02-timeline-real-relay.md) · [`celeb-06-03-timeline-fiction-relay.md`](celeb-06-03-timeline-fiction-relay.md) |
| 07 | 인물 관계 | [`celeb-07-01-relations.md`](celeb-07-01-relations.md) |
| 08 | 이미지와 상세 세계 표현 | [`celeb-08-00-image-map.md`](celeb-08-00-image-map.md) · [`celeb-08-01-avatar.md`](celeb-08-01-avatar.md) · [`celeb-08-02-hero-photo.md`](celeb-08-02-hero-photo.md) · [`celeb-08-03-detail-themes.md`](celeb-08-03-detail-themes.md) · [`celeb-08-04-world-banners.md`](celeb-08-04-world-banners.md) |
| 09 | 영문 필드 책임과 누락 백필 | [`celeb-09-01-i18n.md`](celeb-09-01-i18n.md) |

팩션 소속·세력도감은 [`../remotion/faction/README.md`](../remotion/faction/README.md), BookRecommend 연결은 [`../remotion/book-recommend/README.md`](../remotion/book-recommend/README.md)가 쥔다. 대사 음원은 `celeb-dialogue-voice-publish` 스킬, 아바타 등록은 `celeb-avatar-register` 스킬을 실행점으로 삼는다.

조회수·방명록·캐시·팔로우 수는 제작 데이터가 아니라 런타임 값이므로 데이터 문서와 서비스 코드에서 관리한다. 남은 유한 작업은 [`../../todo/celeb/`](../../todo/celeb/README.md)에만 두며 진행 건수와 완료 회차를 이 디렉터리에 기록하지 않는다.
