# 인물 세계 배너

인물 상세 맨 위에 표시하는 세계별 무인 환경 사진의 제작·파생·검수 규격이다. 인물이 어느 세계에 속하는지는 `sw/web/src/lib/celeb/world.ts`, 화면 재질과 배치는 [`celeb-08-03-detail-themes.md`](celeb-08-03-detail-themes.md)가 쥔다.

## 자산 계약

- 원본은 처음부터 완결된 네이티브 3:1 파노라마 사진으로 만든다. 더 높은 비율에서 위아래를 잘라 맞추지 않는다.
- 원본은 `sw/web-bo/output/worlds-raw/`, 운영본은 `sw/web/public/images/worlds/`에 둔다.
- 파일명은 `CELEB_WORLDS`의 world ID를 그대로 사용한다.
- PC·모바일 픽셀값, WebP 품질, 모바일 크롭 범위와 출력 파일명은 `sw/web-bo/scripts/photo/world-banner.mjs`가 SSoT다.
- PC판은 원본 전체를 비율 그대로 줄이고, 모바일판은 세로를 보존한 채 좌우만 자른다.
- `--mobile-left`는 자동 중앙값이 아니라 랜드마크와 길·소품이 살아 있는 위치를 원본마다 눈으로 고른다.

```bash
node sw/web-bo/scripts/photo/world-banner.mjs \
  --id <world-id> --source <3:1 원본> --mobile-left <좌표> --dry-run
```

기존 운영본을 교체할 때는 원본과 출력 파일의 추적 여부를 확인해 백업한 뒤에만 `--force`를 사용한다.

## 사진 규격

- 세계를 알아볼 수 있는 실재 랜드마크나 구조물을 화면의 주인공으로 삼는다.
- 근경·중경·원경을 모두 채워 장소 전체가 보이게 한다.
- 등불·연기·수레·널린 천·발자국 같은 삶의 흔적은 둘 수 있지만 사람과 인체 실루엣은 넣지 않는다.
- 정상 노출과 자연스러운 색을 사용한다. 화면 톤을 맞추려고 원본을 어둡거나 저채도로 굽지 않는다.
- 사진 질감으로 만들고 회화·삽화·CG 렌더처럼 보이지 않게 한다.
- 글자·로고·간판 문구·워터마크를 넣지 않는다.
- 핵심 랜드마크는 모바일 가로 크롭에서도 알아볼 수 있는 중심 안전영역에 둔다.
- 시대와 문화권에 맞지 않는 구조·물건을 명시적으로 배제한다.

## 발주 뼈대

```text
Asset: final production website hero banner background
Canvas: native 3:1 panoramic landscape; compose directly for the final canvas
Subject: <세계의 구조적 특징이 드러나는 랜드마크>
Scene: <근경·중경·원경이 모두 찬 무인 환경>
Signs of life: <사람 없이 남길 생활 흔적>
Light: <시간대와 방향>, normal exposure and natural colour

The full landmark stays inside the canvas and remains readable in the central mobile crop.
Photographic real material detail; no painting, illustration or CGI look.
Absolutely no people or human silhouettes. No text, logos, signage or watermark.
```

거리·시장·궁궐처럼 사람이 등장하기 쉬운 장면은 무인과 무문자를 첫 문장부터 명시한다. 랜드마크 이름만 쓰지 말고 탑 수, 지붕·아치·재료처럼 다른 문화권과 구별되는 구조적 특징을 적는다.

## 세계별 장면 닻

아래 표는 교체 시 지켜야 할 장면의 정체성이다. 완성 프롬프트는 공통 규격과 구조적 특징·시대 금지물을 더해 인물별이 아니라 world ID별로 작성한다.

| world ID | 장면 닻 |
|---|---|
| `three-kingdoms-korea` | 장군총식 계단 돌무지, 산성 성벽과 마을 지붕 |
| `goryeo` | 불국사 전각과 두 석탑, 석등과 회랑 |
| `joseon` | 경복궁 근정전, 품계석이 선 박석 마당과 북악 |
| `modern-korea` | 숭례문과 현대 고층 건물·넓은 차도 |
| `warring-states-china` | 판축 성벽, 목조 성문·망루와 수레 자국 |
| `han-china` | 판축 군사 도시, 관청·창고·군영이 겹친 기와지붕 |
| `tang-song` | 장안 대안탑, 사찰 회랑과 멀리 보이는 성문·대로 |
| `ming-qing` | 자금성 태화전, 금빛 기와와 넓은 어도 |
| `modern-china` | 상하이 와이탄 석조 건물과 강 건너 마천루 |
| `ancient-japan` | 호류지 오층목탑, 회랑과 삼나무 숲 |
| `samurai-japan` | 히메지성 천수각, 흰 회벽·돌담·성문 |
| `edo` | 니혼바시 상점 거리의 빈 간판 틀·등롱, 젖은 길과 후지산 |
| `modern-japan` | 전선이 얽힌 좁은 골목, 빈 간판 틀과 도쿄타워 |
| `steppe` | 게르 군락, 돌 오보와 말 떼가 지난 초원 |
| `ancient-greece` | 아크로폴리스 파르테논·프로필라이아와 도시 지붕 |
| `rome` | 콜로세움·개선문과 포룸 열주 |
| `ancient-india` | 산치 대탑과 조각 토라나, 승원 터와 구릉 |
| `mughal` | 타지마할과 수로 정원·회랑 |
| `modern-india` | 인도문, 넓은 대로와 식민기 관청 건물 |
| `ancient-near-east` | 우르 지구라트, 진흙벽돌 성벽·대추야자·수레 |
| `islamic-golden-age` | 코르도바 메스키타의 이중 아치 숲과 안뜰 |
| `ottoman-persia` | 이스파한 이맘 광장, 푸른 돔·첨탑·바자르 회랑 |
| `modern-middle-east` | 암만 석회암 언덕 주거지, 옥상 설비·모스크·현대 고층 |
| `medieval-rus` | 노브고로드 성 소피아 대성당, 데티네츠 성벽과 눈 |
| `imperial-russia` | 겨울궁전 파사드, 궁전 광장과 알렉산드르 기둥 |
| `soviet-east-europe` | 스탈린 양식 첨탑 건물과 집합주택 |
| `colonial-america` | 인디펜던스 홀과 빈 벽돌 광장 |
| `frontier-america` | 대륙횡단철도 급수탑·역사, 선로와 전신주 |
| `modern-america` | 로어맨해튼 스카이라인, 브루클린 브리지와 강 |
| `medieval-europe` | 카르카손 이중 성벽·원형 탑과 성당 첨탑 |
| `renaissance` | 피렌체 두오모·조토 종탑과 붉은 기와 지붕 |
| `age-of-sail` | 리스본 타구스강 항구, 범선 마스트·석조 부두·궁전 |
| `industrial-europe` | 철교, 벽돌 공장 굴뚝·운하·바지선 |
| `world-wars` | 철골 기차역, 증기·화물과 멀리 보이는 도시 |
| `modern-west` | 베를린의 비 온 거리, 트램 선로·역사 건물·TV 타워 |
| `latin-america` | 식민풍 광장, 성당 종탑·채색 건물과 화산 능선 |
| `africa` | 젠네 대모스크, 진흙벽과 빈 시장 좌판 |
| `myth` | 특정 문화권을 복제하지 않은 구름 위 거석 문턱과 젖은 돌길 |
| `neutral` | 연대와 지역을 특정하지 않는 안개 속 돌 표면과 한 줄기 빛 |

## 검수

1. world ID와 장면이 맞고 랜드마크 전체를 알아볼 수 있는가.
2. 근경·중경·원경이 모두 있으며 빈 하늘이나 벽이 화면을 지배하지 않는가.
3. 사람 없이도 삶의 흔적이 남아 폐허처럼 보이지 않는가.
4. 사람·유사문자·로고·시대착오가 없는가.
5. 원본 전체가 자체로 완결된 3:1 사진인가.
6. PC판이 원본 전체를 보존하고 모바일 좌우 크롭에서도 핵심 장면이 남는가.
7. 다른 world ID의 운영본과 동일 파일이거나 잘못 이름 붙은 파일이 아닌가.

배너 파일 누락은 `CelebWorldBannerView`의 임시 무늬로 안전하게 물러난다. 현재 보유 수나 완료 현황은 정적 파일과 `CELEB_WORLDS`를 대조해 계산하고 문서에 기록하지 않는다.
