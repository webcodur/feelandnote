---
name: remo-write-0-draft
description: 에피소드 초안을 작성한다. 테마 설계부터 필드별 텍스트, 감정 곡선, 책 간 연결까지. /remo-write-0-draft <에피소드명> 으로 실행.
---

# 초안 작성

실행 전 반드시 아래 문서를 Read tool로 읽는다:

- `docs/project/remotion/book-recommend/writer/0-draft.md` — 초안 작성 가이드 (SSoT)
- `docs/project/remotion/book-recommend/rules.md` — 불변 규칙

## 초안 제출 직전 필수 체크

본문에 `N,NNN명`/`NN척`/`NNNN년` 등 `숫자+단위` 패턴이 있으면, **반드시 `tts.replace`에 단위까지 포함해 선등록한 뒤 제출**한다. 숫자만 매핑하면 whisper diff 경계가 꼬여 세그먼트 `duration`이 0.5초대로 망가진다.

```json
"tts": {
  "replace": {
    "1,704명": "천칠백사 명",
    "12척": "열두 척",
    "1594년": "천오백구십사 년",
    "(母也天只)": ""
  }
}
```

**고유어/한자어 수사는 문맥 판단 필수** — 하드코딩 불가. 같은 단위도 문맥에 따라 달라진다 (5권의 책→다섯 권, 제7권→제칠권). 한자 괄호는 괄호째 빈 문자열로 제거. 상세 규칙은 `voice/tts.md`의 "고유어 수사 vs 한자어 수사" / "한자·외국어 괄호 처리" 섹션.
