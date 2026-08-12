# 진행 중 작업

현역 규격이 아니라 아직 끝나지 않은 실행 과제와 재개 지점을 보관한다. 상세 규칙은 각 과제가 연결하는 `docs/project/` 문서를 따른다.

## 영역

| 경로 | 내용 |
|---|---|
| [`celeb/`](celeb/README.md) | 인물 데이터 결손, 아바타, 읽어보기, 화제성 조사와 보이스 생성 |
| [`external-api-migration-2026-08-01.md`](external-api-migration-2026-08-01.md) | 외부 API 종료·전환 뒤 남은 일 |
| [`document-audit.md`](document-audit.md) | 현역 문서와 코드·DB의 실측 대조 |
| [`scriptures-timeline-images.md`](scriptures-timeline-images.md) | 서가 역사 타임라인의 빠진 이미지 38건 선별과 생성 |

## 이동 규칙

- 작업이 끝나면 현역 규칙은 해당 `docs/project/` SSoT에 흡수하고 문서는 지운다. 경위가 필요하면 커밋 이력에서 꺼낸다.
- 다음 착수 지점이 없는 완료 문서를 `todo/`에 남기지 않는다.
- 파일을 추가·완료·이동하면 이 README와 직접 참조하는 스킬·코드 주석을 함께 갱신한다. 루트 `AGENTS.md`에는 개별 TODO를 나열하지 않는다.
