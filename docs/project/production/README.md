# 제작 공통 규칙

서비스 이미지, 영상 대본용 그림, 합성 음성에 공통으로 적용하는 품질 기준과 이 저장소의 배선이다.

| 주소 | 문서 | 책임 |
|---|---|---|
| 01 | [`prod-01-image-generation.md`](prod-01-image-generation.md) | 이미지 발주, 구도, 행동·시선, 얼굴 REF와 생성 도구 운용 |
| 02 | [`prod-02-myth-image-captions.md`](prod-02-myth-image-captions.md) | 신화 대표 그림 설명, 신화·팩션 주요 장면 선별·제작·한영 해설·표시용 최적화 |
| 03 | [`prod-03-voice-pipeline.md`](prod-03-voice-pipeline.md) | 음성 파이프라인의 이 저장소 배선 — 시리즈별 엔진·보이스·명령 인덱스, 저장·DB·R2 계약, 상수 SSoT 소유권 |
| 04 | [`prod-04-voice-cleanup.md`](prod-04-voice-cleanup.md) | TTS 합성 음성의 들숨 제거·쉼 정리 규칙과 모든 합성 경로의 적용 지점 |

프로젝트와 무관한 범용 명세는 [`docs/resource/`](../../resource/README.md)에 있다 — 음성 파이프라인 구현 명세 [`res-11`](../../resource/res-11-voice-pipeline.md), 이미지 생성기의 구조적 한계와 프롬프트 골격 [`res-21`](../../resource/res-21-image-generator-physics.md).
