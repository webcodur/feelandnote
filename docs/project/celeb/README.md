# 인물 문서

인물 데이터는 먼저 [`celeb-pipeline.md`](celeb-pipeline.md)에서 실존과 fiction으로 나눈다. 공개 여부는 [`celeb-publication.md`](celeb-publication.md), 물리 테이블과 제약은 [`../data/db-celeb.md`](../data/db-celeb.md)가 쥔다.

파일명의 두 자리 숫자는 실행 단계가 아니라 탐색기 정렬용 도메인 번호다. 같은 도메인 안에서 다시 나뉘는 문서는 두 번째 두 자리 숫자로 정렬하고, 문서 제목에는 번호를 붙이지 않는다.

## 티어별 데이터 지도

| 도메인 | full | light | fiction | 규칙 |
|---|---|---|---|---|
| 기본 프로필 | 공통 | 공통 | 공통, 한영 동시 | [`celeb-01-00-profile.md`](celeb-01-00-profile.md) · [`celeb-01-01-profile-facts.md`](celeb-01-01-profile-facts.md) · [`celeb-01-02-profile-intro.md`](celeb-01-02-profile-intro.md) |
| 공개 상태·아바타 | 공통 | 공통 | 공통 | [`celeb-publication.md`](celeb-publication.md) · [`celeb-avatar-spec.md`](celeb-avatar-spec.md) |
| 콘텐츠 | 감상 관계 보유 | 조사 중 또는 0건 확정 | 원전·등장 작품 | 아래 콘텐츠 문서군 · [`celeb-fiction-sources.md`](celeb-fiction-sources.md) |
| 분석(영향력·스펙트럼) | 적용 | 적용 | 만들지 않음 | [`celeb-03-01-influence.md`](celeb-03-01-influence.md) · [`celeb-5-spectrum.md`](celeb-5-spectrum.md) |
| Speech | 한영 | 한영 | 한국어, 영문은 선택 | [`celeb-speech.md`](celeb-speech.md) · [`celeb-speech-pipeline.md`](celeb-speech-pipeline.md) |
| 인물 안내 | 한영 | 한영 | 한영 | [`person-reading.md`](person-reading.md) |
| 연표 | 생애 연표 | 생애 연표 | 원전 기반 서사 연표 | [`celeb-timeline.md`](celeb-timeline.md) · 아래 릴레이 문서 |
| 관계 | 확인분 | 확인분 | 원전 관계·대응 신격 포함 | [`celeb-relations.md`](celeb-relations.md) |
| 영문 누락 보완 | 일괄 트랙 | 일괄 트랙 | 각 생성 단계 | [`celeb-i18n.md`](celeb-i18n.md) |

full과 light는 별도 제작 등급이 아니다. 실존 인물은 light로 등록되고 첫 감상 콘텐츠가 연결되면 DB가 full로 자동 승격한다.

## 실존 인물 콘텐츠

| 문서 | 책임 |
|---|---|
| [`celeb-02-01-content-research.md`](celeb-02-01-content-research.md) | 감상 근거 조사와 0건 확정 |
| [`celeb-02-02-content-registration.md`](celeb-02-02-content-registration.md) | 작품·판본·외부 메타·locale·DB 등록 |
| [`celeb-02-03-content-review.md`](celeb-02-03-content-review.md) | 인물별 `review`·`review_en` |
| [`celeb-02-04-content-audit.md`](celeb-02-04-content-audit.md) | 출처·관계·locale·thumbnail 감사 |

## 연표·관계·읽어보기

| 문서 | 책임 |
|---|---|
| [`celeb-timeline-agent-relay.md`](celeb-timeline-agent-relay.md) | 실존 인물 생애 연표의 부분 수리와 반영 |
| [`celeb-timeline-fiction-agent-relay.md`](celeb-timeline-fiction-agent-relay.md) | fiction 원전을 통합한 서사 연표 반영 |
| [`celeb-relations.md`](celeb-relations.md) | 내부·명단 밖 인물 관계의 선정·정규화·검증 |
| [`person-reading.md`](person-reading.md) | 화면에 게시하는 인물 안내의 작성·검수 |

## 이미지와 상세 표현

| 문서 | 책임 |
|---|---|
| [`celeb-avatar-spec.md`](celeb-avatar-spec.md) | 아바타 제작·크롭·검수 규격 |
| [`person-image-map.md`](person-image-map.md) | 인물 이미지 슬롯과 SSoT 지도 |
| [`hero-photo-status.md`](hero-photo-status.md) | 대표 화보 규격과 현재 정비 대상 |
| [`celeb-detail-themes.md`](celeb-detail-themes.md) | 인물 상세의 세계 표현 |
| [`celeb-world-banners.md`](celeb-world-banners.md) | 세계 배너 이미지 규격 |

팩션 소속·세력도감은 [`../remotion/faction/README.md`](../remotion/faction/README.md), BookRecommend 영상 연결은 [`../remotion/book-recommend/README.md`](../remotion/book-recommend/README.md)가 쥔다. 대사 음원 등록은 `celeb-dialogue-voice-publish` 스킬을 실행점으로 삼는다. 조회수·방명록·캐시·팔로우 수는 제작 데이터가 아니라 런타임 값이므로 `db-celeb.md`와 서비스 코드에서 관리한다.

진행 건수와 완료 회차는 이 디렉터리에 기록하지 않는다. 남은 작업은 [`../../todo/celeb/`](../../todo/celeb/README.md)와 오케스트레이터에서 확인한다.
