# 가상 독백

> `celebs.virtual_monologue`과 `virtual_monologue_en`의 유일한 규칙 SSoT다.
> DB 컬럼은 `docs/project/data/db-celeb.md`, 과거 작업 이력은
> `docs/archive/celeb/virtual-monologue-quality-overhaul-2026-07.md`에서 확인한다.

## 정의

한 인물이 자기 삶과 철학을 자기 목소리로 설파한다.

## 작성 원칙

- 인물마다 할 말과 말하는 방식이 다르다. 공통 문단 수, 전개 순서, 도입 형식,
  결말 형식을 정하지 않는다.
- 이력 소개, 생애 요약, 업적 목록, 제삼자의 인물평을 독백처럼 바꾸지 않는다.
- 기존 독백과 AI 초안은 아이디어나 재료일 뿐이다. 문장과 구성을 이어받지 않는다.
- 실존 인물은 확인된 삶, 행동, 저술과 발언을 바탕으로 쓴다. 허구 인물은 대표
  원전을 바탕으로 쓴다. 확인되지 않은 생각, 감정, 동기, 후회, 교훈은 만들지 않는다.
- 직접 인용이 아닌 문장은 실제 발언을 흉내 낸 인용문이 아니라, 확인된 재료로
  구성한 가상의 1인칭 서술이다.
- 자연스러운 현대 한국어로 쓴다. 한국어 문장 검수에는
  `docs/project/production/writing-rules.md`를 참고하되, 그 문서의 특정 영상·책 요약용 형식을
  가상 독백의 구성으로 가져오지 않는다.
- 필요한 만큼만 쓴다. 한 문장이면 한 문장으로, 여러 문단이 필요하면 인물에 맞게
  나눈다.

## 운영 상태

2026-08-04부터 서비스 화면 노출과 신규 DB 작성은 중단했다. 기존 값은 삭제하지 않고
담화와 `인물 읽어보기` 제작 재료로만 보존한다. 사용자가 별도로 요청한 작성과 시험은
후보 원고만 만들며 DB에는 자동 반영하지 않는다.

## 보존된 과거 도구

아래 파일은 기존 값 감사·이력 재현용이다. 신규 독백 생성·번역·DB 반영에 실행하지 않는다.

- 실존 후보 생성 이력: `sw/web-bo/scripts/fill-virtual-monologue-gpt.ts`
- 영문 후보 생성 이력: `sw/web-bo/scripts/translate-virtual-monologue.ts`
- 실존 조건부 게시 이력: `sw/web-bo/scripts/apply-virtual-monologue-batch.ts`
- fiction 연결 읽기 감사: `.agents/skills/fiction-profile-audit/`
- 기존 확정값 잠금 관리: `sw/web-bo/scripts/lock-virtual-monologue.ts`
