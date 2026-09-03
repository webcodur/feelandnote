# 실존 인물 연표 개편 중간 데이터

국문 중간 개선의 입력·기계 산출물·반영 전 백업·왕복 검증 결과를 보존한다. 서비스 정본은
`public.celeb_timeline_events`이며, 이 폴더의 진단 JSON은 독립 사실 감사까지 끝난 최종본이 아니다.

- `recent-473-slugs.json`: 현재 부분 수리 대상의 원래 순서를 가진 활성 실존 인물 명단
- `korean-diagnostic/`: 국·영문 의미를 대조한 과거 진단 결과. payload의 상태명은 당시 출력 형식일
  뿐 현행 파이프라인의 종료 상태가 아니다
- `pilots/`: 사건 index 사실 문제와 생애 구성 문제를 확인한 과거 표본. 현행에서는 해당 index 수리·
  교체 또는 additions 입력으로 해석한다
- `db-before-korean-prose-update.json`: 국문 중간 개선 반영 전 DB 원본과 롤백 근거
- `db-korean-prose-update-result.json`: 당시 국문 반영 뒤 DB 왕복 검증 결과

국문 중간 개선은 제목·서술만 바꾸고 연도·종류·영문·장소·좌표는 보존했다. 이 반영 이력은 사실
감사 완료를 뜻하지 않으며, 현재 라이브 DB 값이 다음 작업의 seed다.

현행 실행은 `docs/project/celeb/celeb-06-02-timeline-real-relay.md`를 따른다. 현재 DB 또는 DB 지문이 같은
최신 미반영 산출물을 후보로 잡고, 문제 index만 수정·교체하며 생애 공백만 추가한다. 이 폴더의 과거
JSON을 전체 재작성 지시나 완료 집계로 사용하지 않는다.
