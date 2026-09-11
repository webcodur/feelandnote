---
name: ui-rail
description: 손으로 밀어 넘기는 가로 목록(인물 칸·작품 칸 줄)을 만들거나 고칠 때 적용한다. 스크롤바 숨김, 터치는 브라우저 기본 스크롤, 마우스 끌기와 놓은 뒤 미끄러짐, 칸 맞춤(스냅)을 터치에만 거는 규칙을 다룬다. "가로 스크롤", "가로 목록", "옆으로 밀기", "드래그 스크롤", "모바일에서 끊김", "부드럽게 안 밀림", "마우스로 끌면 튄다", "스크롤바 없애", "snap" 등에 호출.
---

# 가로 목록 — 손으로 밀어 넘기는 줄

전 앱(web·web-bo·lab·audio-bo) 공통. 칸 여러 개를 옆으로 늘어놓고 손이나 마우스로 밀어 보는 줄에 적용한다.

## 먼저 고를 것

| 모양 | 쓸 것 |
|---|---|
| 한두 장씩 넘기고 점·이름표로 위치를 알린다 | `sw/web/src/components/ui/SnapCarousel.tsx`의 `Carousel`. 새로 짜지 않는다 |
| 이름이 긴 분류 칩 줄(모바일) | 옆으로 넘기며 찾기 어렵다. 모바일은 지금 고른 이름을 단 버튼으로 접고 누르면 `BottomSheet`에서 고른다. PC는 칩 줄 그대로. 선례 `sw/web/src/components/ui/FilterTabs.tsx`, `sw/web/src/components/features/user/explore/myth/MythMobilePicker.tsx` |
| 작은 칸·칩 여러 개를 자유롭게 민다(인물 칸 줄, 분류 칩 줄 등) | 아래 규칙. 마우스 끌기는 공용 훅 `sw/web/src/hooks/useMouseDragScroll.ts`를 쓴다(4·5·7번을 훅이 처리한다). 새로 짜지 않는다. 사용 예 `sw/web/src/components/features/user/explore/myth/MythAtlas.tsx`(지역·신화·인물 세 줄) |

## 핵심 규칙

1. **스크롤바는 숨긴다.** `scrollbar-hide`를 건다. 폰은 손으로 밀고, PC는 마우스로 끌어 옮긴다. 로딩 틀(스켈레톤)의 같은 줄에도 같은 클래스를 걸어 불러오기 전후 높이를 맞춘다.
2. **터치는 브라우저에 맡긴다.** `touch-pan-y`로 가로 터치를 막고 JS로 `scrollLeft`를 옮기는 구성을 쓰지 않는다. 관성이 사라져 손을 떼면 뚝 서고 모바일에서 끊겨 보인다. JS 끌기는 `event.pointerType === "mouse"`일 때만 받는다.
3. **칸 맞춤은 터치에만 건다.** 줄에 `pointer-coarse:snap-x`, 칸에 `snap-start`를 건다. 마우스 끌기 동안 스냅을 껐다가 놓을 때 다시 켜면 가까운 칸으로 확 끌려가 튄다.
4. **끌기 시작에서 건너뛰지 않는다.** 끌기 판정 문턱(6px)을 넘은 순간의 포인터 위치를 새 기준점으로 삼는다. 누른 지점을 기준으로 두면 문턱만큼 한 번에 건너뛴다.
5. **놓으면 미끄러진다.** 끄는 동안 속도를 재 두었다가 놓은 뒤 `requestAnimationFrame`으로 감속하며 더 민다. 마지막 움직임 뒤 80ms 넘게 멈췄다 놓았으면 미끄러지지 않는다. 다시 누르거나 넘김 단추를 누르면 미끄러짐을 즉시 끊고, 언마운트 때도 끊는다.
6. **끄는 줄에 `scroll-smooth`를 걸지 않는다.** `scrollLeft`를 줄 때마다 애니메이션이 붙어 손보다 늦게 따라온다. 전역 `html { scroll-behavior: smooth }`는 상속되지 않아 줄에는 영향이 없다. 페이지(window)를 JS로 옮길 때는 전역 값을 타므로 `behavior: "instant"`를 명시한다(`CelebSwipeRail.tsx`).
7. **끈 뒤의 클릭은 막는다.** 끌기로 판정되면 손을 뗀 직후 칸 클릭을 한 번 막는다. 밀려고 잡은 칸이 선택되지 않게 한다.
8. **칸 아래 이름은 한 줄이다.** `truncate`로 말줄임한다. 두 줄 자리를 비워 두면 줄이 높아진다. 전체 이름은 칸을 눌러서 본다.
9. **여러 줄로 접지 않는다.** 줄은 한 줄로 두고 민다. 칩이 적어 폭이 남으면 `justify-center-safe`로 가운데 둔다. 넘치는 줄에 `justify-center`를 걸면 앞쪽 칩이 잘려 닿을 수 없다.

```tsx
// ❌ 가로 터치 차단 + JS 이동 — 관성 없음, 스냅 껐다 켜며 튐
<div className={`overflow-x-auto touch-pan-y ${dragging ? "snap-none" : "snap-x"}`} onPointerDown={startDragForAllPointers}>

// ✅ 공용 훅 — 터치는 기본 스크롤, 끌기는 마우스만, 스냅은 터치에만
const { ref, cursorClassName, dragProps } = useMouseDragScroll();
<div ref={ref} {...dragProps} className={`scrollbar-hide flex overflow-x-auto overscroll-x-contain select-none pointer-coarse:snap-x ${cursorClassName}`}>
  <button className="shrink-0 snap-start">…</button>
</div>
```

## 작업 후 점검

- 폰: 손으로 밀고 떼면 관성으로 더 가다가 칸에 부드럽게 안착하는가
- PC: 끌기를 시작할 때와 놓을 때 튀지 않는가, 끈 뒤 칸이 선택되지 않는가
- 스크롤바가 안 보이는가, 로딩 틀과 높이가 같은가

## 관련 스킬

- 칸을 눌렀을 때 포커스 표시: `ui-focus`
- 칸 hover 반응: `ui-hover`
- 세로로 늘어날 때 화면이 튐: `ui-scroll`
