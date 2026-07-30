# 인물 상세 테마

> **최종 실측 체크: 26.07.30** — 테마 결정 함수·운영 상세 연결·lab 비교 화면·프로덕션 빌드 대조

인물 상세(`/[locale]/celeb/[slug]`)는 하나의 금색 네오 판테온 화면을 모든 인물에게 반복하지 않는다. 인물의 성격에 맞는 8개 분위기 계열 가운데 하나를 서버에서 정하고, 같은 계열 안에서도 인물마다 색과 배경 초점을 조금씩 달리한다.

## 결정 원칙

DB에 테마 컬럼을 추가하거나 별도 요청을 보내지 않는다. `profession`·`celeb_tier`·`birth_date`·`slug`만 받는 순수 함수 `resolveCelebTheme`이 서버 렌더링 중 결과를 확정한다.

우선순위는 다음과 같다.

1. `celeb_tier === "fiction"`이면 직군과 무관하게 「신화의 밤」이다.
2. 나머지는 직군으로 큰 계열을 정한다.
3. 직군이 없거나 알 수 없는 값이면 slug 해시로 fiction을 제외한 계열에 안정적으로 배정한다.
4. 같은 계열의 강조색 3종 가운데 하나, 빛의 가로 위치, 배경 각도를 slug 해시로 고른다. 같은 인물은 빌드·로케일·기기와 무관하게 항상 같은 결과를 얻는다.
5. 출생연도는 고대·유산·현대의 배경 결만 바꾼다. 인물의 큰 계열은 바꾸지 않는다.

## 계열

| 계열 | 직군 | 분위기 |
|---|---|---|
| 왕관의 전당 (`regalia`) | 지도자·정치인·지휘관 | 금빛 석조 전당 |
| 잉크의 서고 (`archive`) | 작가·인문학자 | 세피아 서고 |
| 탐구의 궤도 (`orbit`) | 과학자·사회과학자 | 청색 관측실 |
| 장면의 극장 (`stage`) | 감독·배우·인플루언서 | 장밋빛 암전 무대 |
| 공명의 방 (`resonance`) | 음악인·미술인 | 보랏빛 공명실 |
| 개척의 공방 (`venture`) | 기업가·투자자 | 녹색 공방 |
| 승부의 경기장 (`arena`) | 스포츠인 | 적동빛 경기장 |
| 신화의 밤 (`mythic`) | fiction 전체 | 은빛 밤 |

공유 직군 단일원천 `packages/shared/src/constants/celeb-professions.ts`의 15종을 모두 명시적으로 처리한다. 신규 직군을 추가하면 이 문서의 표와 `PROFESSION_THEMES`를 함께 갱신한다.

## 적용 범위

최상위 `CelebThemeScope`가 아래 CSS 변수를 인물별 값으로 덮는다.

- 강조색: `--color-accent`, `--color-accent-hover`, `--color-accent-dim`, `--color-accent-rgb`
- 배경: `--color-bg-main`, `--color-bg-secondary`, `--color-bg-card`
- 선: `--color-border`, `--color-border-gold`

따라서 서가·행적·관계·분석·미디어·방명록의 기존 부품은 별도 분기 없이 현재 인물의 색을 이어받는다. 사이트 헤더·풋터와 다른 화면에는 변수가 새지 않는다. 상단 배너는 `CelebThemeHero`를 공용으로 사용하며 계열별 Lucide 문양과 CSS 기하 장식을 보여준다. 추가 이미지·폰트·클라이언트 계산은 없다.

## 비교 화면

`/[locale]/lab/celeb-themes`에서 다음을 한 번에 확인한다.

- 8개 계열의 대표 인물과 자동 배정 결과
- 계열마다 제공하는 인물별 강조색 3종
- 실제 상단 배너와 `ClassicalBox` 축소 예시
- 강조색과 기본 배경의 WCAG 대비
- 직군·시대·색상 변형 번호

lab의 모형과 운영 상세는 같은 resolver·스코프·배너를 import한다. 비교 화면만 고치고 운영 화면이 갈라지는 별도 구현을 두지 않는다.

## 접근성·성능 기준

- 강조색 텍스트와 기본 배경의 대비는 모든 24개 색에서 WCAG AA 4.5:1 이상이어야 한다. 26.07.30 실측 최저는 승부의 경기장 3번 색의 **6.66:1**이다.
- 색만으로 계열을 구분하지 않는다. 이름·문양·선 형태를 함께 쓴다.
- 서버가 첫 HTML에서 CSS 변수를 확정하므로 하이드레이션 뒤 색이 바뀌지 않는다.
- resolver는 DB·네트워크·브라우저 API를 사용하지 않는다.
- 테마를 새로 만들 때 lab 비교와 3색 대비 계산을 먼저 통과시킨다.

## 코드 위치

| 파일 | 역할 |
|---|---|
| `sw/web/src/lib/celeb/theme.ts` | 계열 정의·직군 매핑·결정 함수·대비 계산 |
| `sw/web/src/components/features/celeb/CelebTheme.tsx` | 공용 스코프·상단 배너 |
| `sw/web/src/components/features/celeb/CelebTheme.module.css` | 배경 결·문양·반응형 표현 |
| `sw/web/src/app/[locale]/(main)/celeb/[slug]/layout.tsx` | 운영 상세 연결 |
| `sw/web/src/components/lab/CelebThemesPreview.tsx` | 8개 계열 비교 |
| `sw/web/src/app/[locale]/lab/celeb-themes/page.tsx` | lab 주소 |
