---
name: fiction-profile-audit
description: 보존된 fiction 프로필·대표 원전·기존 가상 독백의 연결 상태를 읽기 전용으로 감사한다. "fiction 독백 상태 확인", "기존 허구 인물 독백 감사", "fiction 프로필 연결 점검" 요청에 사용한다. 신규 독백 작성·번역·DB 반영이나 신규 프로필 등록에는 사용하지 않는다.
---

# fiction 가상 독백 보존 감사

먼저 `docs/project/celeb/retire/virtual-monologue.md`를 전부 읽는다. 가상 독백은 서비스 노출과 신규 DB 작성이 중단됐고, 빈 값도 결손이 아니다.

## 절차

1. 사용자가 지정한 에피소드만 범위에 넣는다.
2. 아래 읽기 전용 감사기로 팩션 명단과 기존 fiction 프로필 연결을 대조한다.

```bash
node .agents/skills/fiction-profile-audit/scripts/audit-fiction-episode.mjs <episode>
```

3. `slug`, `celeb_tier='fiction'`, 대표 원전 연결, 기존 독백 보존 여부를 보고한다. 독백이 비어 있다는 이유만으로 신규 작업이나 활성화 결손으로 판정하지 않는다.

## 금지

- 독백 생성기·번역기·manifest 반영기·잠금 해제를 실행하지 않는다.
- `virtual_monologue`·`virtual_monologue_en`을 INSERT·UPDATE하지 않는다.
- 신규 fiction 프로필은 현행 셀럽 등록 파이프라인으로 만들고 독백은 비워 둔다.
- 팩션 대사에 기존 독백을 참고할 수는 있지만, 독백을 먼저 만들거나 DB에 백필하지 않는다.
