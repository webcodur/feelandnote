# 인물 문서

인물 데이터 생성부터 상세 화면·이미지·타임라인·읽어보기까지의 현역 규격을 관리한다. DB 테이블 구조는 [`../data/db-celeb.md`](../data/db-celeb.md)가 쥔다.

## 생성·검수 파이프라인

| 단계 | 문서 | 책임 |
|---:|---|---|
| 전체 | [`celeb-pipeline.md`](celeb-pipeline.md) | 전체 파이프라인과 작업 큐 |
| 1 | [`celeb-1-basic-profile.md`](celeb-1-basic-profile.md) | 기본 정보. 한 줄 정의 전량 개편 호출은 `celeb-headline-rewrite` 스킬, 회차 중 원장은 `data/celeb/headline-rewrite/` |
| 2 | [`celeb-2-content-collector.md`](celeb-2-content-collector.md) | 콘텐츠 수집 |
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
| [`celeb-timeline.md`](celeb-timeline.md) | 인물 타임라인과 활동 반경 |
| [`celeb-timeline-grok-relay.md`](celeb-timeline-grok-relay.md) | 그록으로 연표를 채울 때의 조사·의심 릴레이 |
| [`celeb-detail-themes.md`](celeb-detail-themes.md) | 인물 상세 세계 표현 |
| [`celeb-world-banners.md`](celeb-world-banners.md) | 세계 배너 이미지 규격 |
| [`celeb-avatar-spec.md`](celeb-avatar-spec.md) | 아바타 구도·프레이밍 규격 |
| [`person-image-map.md`](person-image-map.md) | 인물 이미지가 쓰이는 자리와 SSoT 연결 지도 |
| [`hero-photo-status.md`](hero-photo-status.md) | 대표 화보 현황과 남은 작업 |
| [`person-reading.md`](person-reading.md) | 화면에 노출하는 인물 안내의 한영 작성·검수·게시 규칙. 인물 탐구 필드는 닫힌 상태로 보존 |

## 감사·보존·진행 자료

| 문서 | 성격 |
|---|---|
| [`docs/todo/celeb/`](../../todo/celeb/README.md) | 연표·아바타·인물 안내·스펙트럼 근거 검수 |
