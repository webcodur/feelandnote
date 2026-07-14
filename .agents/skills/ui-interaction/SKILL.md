---
name: ui-interaction
description: UI 상호작용 즉각 반응 원칙. 버튼·카드·칩 등 조작용 요소의 hover/active를 설계·구현·수정할 때 적용한다. 호버 효과, 트랜지션, 애니메이션, 인터랙션, 마우스오버, hover:, transition, duration, delay 관련 UI 작업에 항상 참조한다. "버튼 만들어", "카드 스타일", "호버 효과", "인터랙션 추가", "UI 컴포넌트" 등에 호출.
---

# UI 상호작용 — 즉각 반응 원칙

전 앱(web·web-bo·remotion-bo·lab·audio-bo) 공통. 조작용 요소의 hover는 **손을 올린 즉시** 바뀐다.

## 핵심 규칙

1. **버튼·카드·칩 등 클릭·조작용 요소의 hover/active 피드백에 `transition-*`·`duration-*`·`delay-*`를 얹지 않는다.** 배경·색·이동값을 지연 없이 즉시 적용한다.
2. **애니메이션 자체를 금지하는 규칙이 아니다.** 공간·레이아웃이 실제로 열리고 닫히는 전환은 애니메이션이 본질이다.
3. **판별 한 줄**: 요소가 자기 상태를 강조하면 → 즉각. 공간이 이동·개폐하면 → 애니메이션.

## 즉각 반응 (transition 금지)

| 대상 | 예 |
|------|-----|
| 버튼 | 배경/글자색 hover, 아이콘 버튼, FAB |
| 카드 | hover 시 배경 강조, 살짝 떠오름(`-translate-y-0.5`) |
| 칩·태그 | 선택/hover 강조 |
| 리스트 행 | hover 하이라이트 |
| 탭·토글 | 활성 상태 전환 |

```tsx
// ✅ 즉각
<button className="hover:bg-white/5 hover:-translate-y-0.5 active:scale-95">

// ❌ 지연 — 굼떠 보임
<button className="transition-all duration-200 hover:bg-white/5">
```

## 애니메이션 허용 (transition 유지)

공간·레이아웃이 실제로 개폐·이동하는 전환:

- 사이드바 여닫기 (폭·translate)
- 아코디언 펼침/접힘 (height·grid-rows)
- 모달·드로어·팝오버 등장/퇴장 (opacity·scale·translate)
- 페이지·라우트 전환
- 스켈레톤 → 콘텐츠 로드

```tsx
// ✅ 사이드바 — 공간이 열림
<aside className="transition-[width] duration-300 ease-out" style={{ width: open ? 240 : 64 }}>
```

## 작업 전 자가 점검

UI에 hover/transition을 넣기 전:
> "이건 요소가 자기 상태를 강조하는 건가(→ transition 빼라), 공간이 열리고 닫히는 건가(→ transition 유지)?"

## SSoT

- `docs/project/code-rules.md` "상호작용" 절
- `AGENTS.md` "UI 상호작용 원칙" 절
