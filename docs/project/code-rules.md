# 코드 규칙

## 필수
- 파일당 200줄 이하
- if/else보다 삼항식, switch보다 객체 맵핑
- early return 적극 활용
- 컴포넌트 조건부 렌더링은 && (삼항 금지)
- any, Record<string, unknown> 금지
- ENUM은 "ENUM_" 접두사 + 언더바 형식
- 아이콘: lucide-react (범용)

## 컴포넌트
- left/right 대신 start/end
- **조작용 요소(버튼·카드·칩)의 hover는 즉각 반응** — transition/delay 금지, 위로 뜸·확대 등 이동 지양. 상세는 아래 "상호작용" 참조
- 반복 UI는 상수 배열 + map 렌더링

## Suspense + i18n (필수)
- Suspense 내부의 비동기 서버 컴포넌트가 클라이언트 컴포넌트를 렌더링할 때, `AsyncIntlProvider`로 감싼다
- Next.js 16 스트리밍 SSR에서 `NextIntlClientProvider` 컨텍스트가 Suspense 경계를 넘지 못하는 문제 해결
- 위치: `@/components/shared/AsyncIntlProvider`
```tsx
// 올바른 패턴
async function Content() {
  const data = await fetchData();
  return (
    <AsyncIntlProvider>
      <ClientComponent data={data} />
    </AsyncIntlProvider>
  );
}
export default function Page() {
  return <Suspense fallback={<Skeleton />}><Content /></Suspense>;
}
```

## 주석/경로
- 한국어, JSDoc 금지, region/endregion 그룹화
- 대규모 외부: 절대경로(@/), 소규모 내부: 상대경로(./)

# 디자인 시스템

**컨셉**: 고대 신전의 권위 + 현대적 선명함. 다크 스톤 테마.

## 컬러
- 배경: `bg-main`(#121212), `bg-secondary`(#0a0a0a), `bg-card`(#1a1a1a), `stone-heavy/light`
- 액센트: `accent`(#d4af37 골드), `accent-hover`(#f9d76e), `accent-dim`(#8a732a)
- 텍스트: `text-primary`(#e0e0e0), `text-secondary`(#a0a0a0)
- 상태: watching(#3fb950), completed(#9e7aff), paused(#db4d4d), wish(#d4af37)

## 텍스트 색상 규칙 (필수)

| 용도 | 클래스 | 비고 |
|------|--------|------|
| 본문·제목 | `text-text-primary` | 기본 텍스트. Tailwind gray 계열(`text-gray-*`, `text-neutral-*`, `text-zinc-*`, `text-slate-*`) 사용 금지 |
| 보조·부제목 | `text-text-secondary` | |
| 강조·라벨 | `text-accent` | |
| 힌트·캡션 | `text-text-tertiary` | 메타정보, 타임스탬프 등 부가 정보에만 사용 |

**금지 사항**:
- 임의 hex/rgb 색상 직접 지정 금지. 반드시 `globals.css` @theme 토큰만 사용
- **opacity 남용 금지**: `text-text-secondary/60`, `text-accent/40` 등 불투명도를 낮춰 읽기 어렵게 만드는 패턴 금지. 가독성이 최우선이다
- 사용자가 읽어야 하는 텍스트(소개글, 명언, 설명문 등)에 `text-xs`(12px) 이하 사용 금지. 최소 `text-sm`(14px) 이상
- "고급스러움 = 작고 흐린 텍스트"가 아니다. 선명하고 읽기 쉬운 것이 좋은 디자인이다

## 타이포그래피
- 본문: Noto Sans KR (sans) / 제목·버튼: Noto Serif KR (serif)
- 영문 장식: Cinzel (권위), Cormorant Garamond (로고)

## 효과/텍스처
- `bg-texture-noise/marble`, `effect-bevel/engraved`, `card-sarcophagus`
- `shadow-glow`, `text-3d-gold/marble`, `engraved-plate`

## Z-Index (`@/constants/zIndex.ts`)
```
background(-10) < base(0) < sticky(10) < cardBadge(20) < cardMenu(30) < fab(50)
< nav(100) < floatingPlayer(150) < dropdown(200) < tooltip(250)
< overlay(500) < modal(600) < toast(700) < top(9999)
```

## 상호작용

### 즉각 반응 원칙 (필수)
조작용 요소는 **손을 올린 즉시** 상태가 바뀌어야 한다. 클릭·조작을 유도하는 요소에 hover 지연·전환을 얹으면 반응이 굼떠 보인다.

- **대상**: 버튼, 카드, 칩 등 클릭·조작용 요소의 hover/active 피드백
- **최소 보장(핵심)**: 한 요소의 hover에 **지연 없이 즉시 바뀌는 반응이 최소 하나는 반드시 있어야 한다.** 보통 테두리·글자색·배경의 색 강조가 그 축을 맡는다. 이 축이 있으면 **곁들이는 연출은 애니메이션으로 돌려도 된다**(배경 확대, 장식 페이드인, 밑줄 차오름 등).
- **금지**: 즉각 축을 맡은 속성에 `transition-*`·`duration-*`·`delay-*` 부여 금지. 즉각 축이 **하나도 없는** 카드·버튼도 금지(전부 애니메이션이면 굼뜨다)
- **구현 요령**: 즉각 축과 연출 축을 **서로 다른 엘리먼트에 나눠 건다.** 한 엘리먼트에 `transition-all`을 걸면 즉각 축까지 딸려 느려진다. 연출 축에는 `transition-transform`·`transition-opacity`처럼 **속성을 특정**해 건다
- **허용(오해 주의)**: 애니메이션 자체를 막는 규칙이 아니다. **공간·레이아웃이 실제로 열리고 닫히는 전환**(사이드바 여닫기, 아코디언 펼침, 모달 등장, 페이지 전환)은 애니메이션이 본질이므로 `transition`을 그대로 쓴다
- **판별 기준**: "요소가 자기 상태를 강조하는가(→ 즉각 축)" vs "공간이 이동·개폐하거나 곁들이는 연출인가(→ 애니메이션)"
- **참고 구현**: `src/components/shared/HubCard.tsx` — 즉각 축(테두리·제목 금색) + 연출 축(배경 확대·모서리 장식·하단 금선)

### 값
- 호버: `hover:bg-white/5`, `hover:text-accent`, `hover:brightness-110` 등 **색·밝기 강조**를 transition 없이 즉시 적용
- **이동 지양**: hover 시 `-translate-y`(위로 뜸)·`scale`(확대) 같은 위치·크기 이동은 넣지 않는다. 색·상태 강조로 대신한다
- 활성: `bg-accent/10 text-accent`
- 비활성: `opacity-50 cursor-not-allowed`
- 반응형: 모바일 우선, `md:`(768px) 데스크톱

## 명칭 규칙 (Thematic Naming)
- 컬렉션 → 유산(Legacy), 방명록 → 방명석, 팔로우 → 지혜의 결속
- 스타일: Pillar(기둥), Sarcophagus/Slab(석판)
