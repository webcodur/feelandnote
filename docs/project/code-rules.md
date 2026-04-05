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
- transition, delay 금지 (즉각 반응)
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
- 호버: `hover:bg-white/5`, `hover:-translate-y-0.5`
- 활성: `bg-accent/10 text-accent`
- 비활성: `opacity-50 cursor-not-allowed`
- 반응형: 모바일 우선, `md:`(768px) 데스크톱

## 명칭 규칙 (Thematic Naming)
- 컬렉션 → 유산(Legacy), 방명록 → 방명석, 팔로우 → 지혜의 결속
- 스타일: Pillar(기둥), Sarcophagus/Slab(석판)
