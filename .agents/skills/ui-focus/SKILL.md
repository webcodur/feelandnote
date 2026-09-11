---
name: ui-focus
description: 조작 요소의 포커스 표시 원칙. 버튼·카드·칩·목록 칸을 누르면 브라우저 기본 포커스 테두리(흰색·파란색 외곽선)가 생기는 문제를 없애고, 키보드 포커스 표시를 강조색으로 바꿀 때 적용한다. "포커스 테두리", "누르면 흰 테두리", "outline 없애", "focus ring", "focus-visible", "탭 이동 표시" 등에 호출.
---

# UI 포커스 표시 — 기본 테두리 대신 강조색

전 앱(web·web-bo·lab·audio-bo) 공통. 조작 요소에는 브라우저 기본 포커스 테두리를 쓰지 않고, 키보드로 옮겨 왔을 때만 강조색 표시를 준다.

## 핵심 규칙

1. **기본 테두리는 끈다.** 브라우저가 그리는 흰·파란 외곽선은 어두운 화면에서 튀고 모서리 둥글기와 어긋난다. 조작 요소에 `focus-visible:outline-none`을 건다. 마우스로 눌렀을 때도 기본 테두리가 보이면 `outline-none`으로 전부 끈다(신화 탐색 인물 칸이 이 경우였다).
2. **끄기만 하고 끝내지 않는다.** 키보드(Tab)로 옮기는 사람은 포커스 표시가 없으면 지금 어디 있는지 모른다. 끈 자리에는 반드시 `focus-visible:` 강조색 표시를 둔다.
3. **표시는 `focus-visible`에만 건다.** `focus:`에 걸면 마우스로 누를 때도 켜져 기본 테두리와 같은 문제가 된다.
4. **눈에 보이는 틀에 건다.** 단추 안쪽 칸(사진 틀·카드 본체)이 보이는 경계라면 단추에 `group`을 주고 그 칸에 `group-focus-visible:`로 건다. 단추 바깥 상자에 링을 두르면 이름 칸까지 감싼 엉뚱한 네모가 생긴다.
5. **즉시 켠다.** 포커스 표시에도 `transition`을 걸지 않는다. `ui-hover`의 즉각 축과 같다.

## 관례 값

| 경우 | 클래스 |
|---|---|
| 단추·링크 자체가 경계 | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent` |
| 안쪽 칸이 경계(사진 타일 등) | 단추 `group outline-none` + 칸 `group-focus-visible:border-accent` |

```tsx
// ❌ 끄기만 함 — 키보드 사용자가 위치를 잃는다
<button className="outline-none">

// ❌ focus:에 걸음 — 마우스로 눌러도 켜진다
<button className="outline-none focus:ring-2 focus:ring-accent">

// ✅ 단추 자체가 경계
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">

// ✅ 안쪽 사진 틀이 경계 (MythPersonPicker.tsx)
<button className="group outline-none">
  <span className="rounded-[14px] border border-white/[0.07] group-focus-visible:border-accent">…</span>
  <span>이름</span>
</button>
```

## 기본 테두리가 아닌 경우

폰에서 누를 때 칸 위에 반투명 네모 음영이 잠깐 깔리면 포커스 테두리가 아니라 모바일 탭 강조다. `-webkit-tap-highlight-color`가 만든다. 사용자 웹은 이 값을 전역에서 끄지 않았다.

## 관련 스킬

- hover 즉각 반응: `ui-hover`
- 가로 목록 칸: `ui-rail`
