# 인물 문서

인물 데이터 생성부터 상세 화면·이미지·행적·읽어보기까지의 현역 규격을 관리한다. DB 테이블 구조는 [`../data/db-celeb.md`](../data/db-celeb.md)가 쥔다.

## 생성·검수 파이프라인

| 단계 | 문서 | 책임 |
|---:|---|---|
| 전체 | [`celeb-pipeline.md`](celeb-pipeline.md) | 전체 파이프라인과 작업 큐 |
| 1 | [`celeb-1-basic-profile.md`](celeb-1-basic-profile.md) | 기본 정보 |
| 2 | [`celeb-2-content-collector.md`](celeb-2-content-collector.md) | 콘텐츠 수집 |
| 3 | [`retire/celeb-3-cultural-journey.md`](retire/celeb-3-cultural-journey.md) | 폐기된 감상 여정 단계. 번호는 이력 보존을 위해 비워 두지 않음 |
| 4 | [`celeb-4-influence.md`](celeb-4-influence.md) | 영향력 평가 |
| 5 | [`celeb-5-spectrum.md`](celeb-5-spectrum.md) | 스펙트럼 |

말투·번역·콘텐츠 감사는 번호 파이프라인을 가로지르는 별도 트랙이다.

| 문서 | 책임 |
|---|---|
| [`celeb-speech.md`](celeb-speech.md) | 말투·명언·대사 트랙의 작성 규칙 |
| [`celeb-speech-pipeline.md`](celeb-speech-pipeline.md) | 그 규칙을 실행하는 5단계 도구 흐름 |
| [`celeb-i18n.md`](celeb-i18n.md) | 영문 데이터 |
| [`celeb-content-audit.md`](celeb-content-audit.md) | 콘텐츠 출처·locale·thumbnail 감사 |

## 상세 화면·이미지·읽어보기

| 문서 | 책임 |
|---|---|
| [`celeb-timeline.md`](celeb-timeline.md) | 인물 생애·서사 연표와 활동 반경 |
| [`celeb-timeline-grok-relay.md`](celeb-timeline-grok-relay.md) | 그록으로 연표를 채울 때의 조사·의심 릴레이 |
| [`celeb-detail-themes.md`](celeb-detail-themes.md) | 인물 상세 세계 표현 |
| [`celeb-world-banners.md`](celeb-world-banners.md) | 세계 배너 이미지 규격 |
| [`celeb-avatar-spec.md`](celeb-avatar-spec.md) | 아바타 구도·프레이밍 규격 |
| [`person-image-map.md`](person-image-map.md) | 인물 이미지가 쓰이는 자리와 SSoT 연결 지도 |
| [`hero-photo-status.md`](hero-photo-status.md) | 대표 화보 현황과 남은 작업 |
| [`person-reading.md`](person-reading.md) | 인물 안내·인물 탐구 작성과 게시 규칙 |

## 감사·보존·진행 자료

| 문서 | 성격 |
|---|---|
| [`retire/`](retire/README.md) | 비활성인 감상 여정·가상 독백 보존 규칙. 신규 작업 기준으로 사용하지 않음 |
| [`docs/todo/celeb/`](../../todo/celeb/README.md) | 보이스 생성·아바타·읽어보기 등 아직 남은 인물 작업 |
