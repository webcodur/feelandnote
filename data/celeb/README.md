# 인물 데이터 작업 자료

이 디렉터리는 DB 반영 전 검토가 필요한 인물별 원고만 보관한다. 서비스 값의 단일 원천은 DB다.

## 디렉터리

```text
data/celeb/
├── README.md
├── dialogue/
│   ├── 01-괴테.md ... 12-박상영.md
│   └── _unregistered/{nickname}.json
├── headline-rewrite/
│   ├── ledger/lane-NN.json
│   ├── packs/
│   └── drafts/
├── timeline-life-rewrite/
│   ├── korean-diagnostic/
│   └── pilots/
└── viewing-research/
    └── YYYY-MM-DD-<scope>.md
```

### `headline-rewrite/`

한 줄 정의 전량 개편의 레인별 원장·팩·초안이다. 호출은 `celeb-headline-rewrite` 스킬, 룰은
`docs/project/celeb/celeb-1-basic-profile.md` 한 줄 정의 절이다. 서비스 값의 원천은 DB다.

### `dialogue/`

인물별 고유 대사의 등록 전 원고와 등록 완료 참고본이다. 작성·등록 규칙은
`docs/project/celeb/celeb-speech.md`를 따른다. 실제 서비스 값의 원천은
`celeb_dialogues` 테이블이다.

### `viewing-research/`

인물군의 콘텐츠 감상 언급을 조사한 날짜별 스냅샷이다. 실제 서비스 관계와 출처는 DB 반영·감사 절차를 통과한 값만 정본으로 본다.

### `timeline-life-rewrite/`

실존 인물 연표 전면 개편의 DB 반영 전 국문 진단과 사실 감사 표본이다. 재개 근거는 이 폴더의
`README.md`, 실행 규칙은 `docs/project/celeb/celeb-timeline-grok-relay.md`가 쥔다. JSON은 승인된
서비스 값이 아니며 DB에 그대로 반영하지 않는다.

## 타임라인

타임라인의 서비스 값은 `public.celeb_timeline_events`에 저장하며 이 디렉터리에서 관리하지
않는다. 위 중간 데이터는 작업 재개용 스냅샷일 뿐이다. 사건 필드·화면 표시·백오피스 수동 편집
규칙은 `docs/project/celeb/celeb-timeline.md`를 따른다.
