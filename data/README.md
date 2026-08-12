# 데이터 창고

서비스와 제작이 쓰는 데이터 파일을 여기에 둔다. 규칙과 설명은 `docs/`가 쥐고, 이 폴더는 값만 담는다.

| 경로 | 내용 | 현역 규격 |
|---|---|---|
| [`celeb/`](celeb/README.md) | DB 반영 전 인물 대사 원고, 조사 스냅샷, 보존된 가상 독백 작업 자료 | [`docs/project/celeb/`](../docs/project/celeb/README.md) |
| [`curated-lists/`](curated-lists/README.md) | 기관·시상·분야별 선정 목록과 수집·매칭 보고서 | [`docs/project/service/curated-lists.md`](../docs/project/service/curated-lists.md) |
| `coupang/` | 제휴 상품 연결 대상과 선별 결과 | [`docs/project/operations/monetization.md`](../docs/project/operations/monetization.md) |

## 배치 원칙

- 서비스 값의 단일 원천은 DB다. 이 폴더에는 DB에 넣기 전 원고와 기계가 만든 중간 산출물만 둔다.
- 문서 폴더에 데이터를 쌓지 않는다. 반대로 이 폴더에 규격 문서를 쓰지 않는다.
- 앱이 직접 읽어야 하는 값(다국어 문구, 화면 상수)은 각 앱 안에 두고 여기로 옮기지 않는다.
- 제작 자산 옆에서 짝으로 관리하는 데이터(에피소드·세력도감 폴더 안의 JSON)는 자산과 함께 둔다.
