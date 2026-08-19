---
name: ui-hover
description: UI 상호작용 즉각 반응 원칙. 버튼·카드·칩 등 조작용 요소의 hover/active를 설계·구현·수정할 때 적용한다. 호버 효과, 트랜지션, 애니메이션, 인터랙션, 마우스오버, hover:, transition, duration, delay 관련 UI 작업에 항상 참조한다. "버튼 만들어", "카드 스타일", "호버 효과", "인터랙션 추가", "UI 컴포넌트" 등에 호출.
---

# UI 상호작용 — 즉각 반응 원칙

전 앱(web·web-bo·lab·audio-bo) 공통. 조작용 요소의 hover는 **손을 올린 즉시** 바뀐다.

## 핵심 규칙

1. **즉각 축 최소 하나 필수.** 한 요소의 hover에는 지연 없이 즉시 바뀌는 반응이 반드시 하나는 있어야 한다. 보통 테두리·글자색·배경의 색 강조가 맡는다. 이 축에는 `transition-*`·`duration-*`·`delay-*`를 얹지 않는다.
2. **즉각 축이 있으면 곁들이는 연출은 애니메이션 허용.** 배경 확대, 장식 페이드인, 밑줄 차오름 등. 단 **즉각 축과 다른 엘리먼트에 나눠 걸고**, `transition-transform`·`transition-opacity`처럼 속성을 특정한다. 한 엘리먼트에 `transition-all`을 걸면 즉각 축까지 딸려 느려진다.
3. **즉각 축이 하나도 없는 카드·버튼은 금지.** 전부 애니메이션이면 굼뜨다.
4. **애니메이션 자체를 금지하는 규칙이 아니다.** 공간·레이아웃이 실제로 열리고 닫히는 전환은 애니메이션이 본질이다.
5. **판별 한 줄**: 요소가 자기 상태를 강조하면 → 즉각. 공간이 이동·개폐하거나 곁들이는 연출이면 → 애니메이션.

참고 구현: `sw/web/src/components/shared/HubCard.tsx` — 즉각 축(테두리·제목 금색) + 연출 축(배경 확대·모서리 장식·하단 금선).

## 즉각 축이 맡는 것 (transition 금지)

| 대상 | 즉각 축 예 |
|------|-----|
| 버튼 | 배경/글자색 hover, 아이콘 버튼, FAB |
| 카드 | 테두리·제목 색 강조 |
| 칩·태그 | 선택/hover 강조 |
| 리스트 행 | hover 하이라이트 |
| 탭·토글 | 활성 상태 전환 |

```tsx
// ✅ 즉각 축 — 색·상태만 즉시 강조
<button className="hover:bg-white/5 hover:text-accent">

// ❌ 지연 — 즉각 축에 transition을 얹으면 굼뜨다
<button className="transition-all duration-200 hover:bg-white/5">

// ❌ 요소 자체가 들썩임 — 위로 뜸·확대는 금지
<button className="hover:-translate-y-0.5 hover:scale-105">

// ✅ 즉각 축 + 연출 축 분리 (연출은 자식 엘리먼트에서 애니메이션)
<button className="group hover:border-accent/60 hover:text-accent">
  <Image className="transition-transform duration-700 group-hover:scale-105" />
</button>
```

> **요소 자체의 이동(translate/scale) 금지**: hover 시 **카드·버튼 본체**가 위로 뜨거나 커지는 변화는 넣지 않는다. 다만 **카드 안쪽 배경 이미지가 서서히 확대**되는 것은 본체가 들썩이는 게 아니라 곁들이는 연출이므로 허용한다(연출 축).

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

- `docs/project/platform/code-rules.md` "상호작용" 절
- `AGENTS.md` 「전역 불변사항 > UI 상호작용」
