# 참고 저장소·도구와 작업 원칙

AI 글쓰기, 문서 변환·출판, 에이전트 작업 품질, 브라우저 작업공간, 조사·자료 구조화에 쓸 만한 공개 저장소와 그 주제의 짧은 작업 원칙을 모은다. 기능 설명은 2026년 8월 각 README 기준이다. 성능·별 수·릴리스 상태처럼 변하는 값은 판단 근거로 쓰지 않고, 도입 전 라이선스·권한·비용을 다시 확인한다.

## 0. 공통 기준

- 사실·인용·숫자·날짜·링크는 먼저 보호한다.
- 이미 자연스럽고 구체적인 문장은 고치지 않는다.
- 정보 없는 추상 평가와 자동 결말은 구체적인 행동·장면으로 바꾼다.
- 출처가 불명확한 성능·가격·법령·탐지기 통과 주장은 `VERIFY`로 둔다.
- 계정 우회, 크랙, 침투, 성인 프롬프트, 표절성 재창작, 가짜 작업 기록은 보관하지 않는다.

## 1. AI 문체·AI slop

| 저장소 | 대화에서 건질 내용 | 판단 |
|---|---|---|
| [blader/humanizer](https://github.com/blader/humanizer) | Markdown만으로 동작하는 에이전트 스킬. 중요성 부풀리기, 홍보어, 모호한 출처, 동의어 돌려쓰기, 챗봇 마무리 등 33개 패턴과 음성 샘플 보정, 무창작 규칙, 마지막 감사 패스를 제공한다. | 한국어 단어 치환기가 아니라 문단·주장 점검 목록으로 사용 |
| [CreatoonForge/korean-writing-reviewer](https://github.com/CreatoonForge/korean-writing-reviewer) | 원문·인용·수치·조건·코드·링크·고유명사를 보호하고, 번역투·명사화·반복 종결·AI 상투 문체를 검사한다. `evaluate / improve / evaluate-and-improve`를 분리한다. | 한국어 편집의 주 기준 |
| [scanaislop/aislop](https://github.com/scanaislop/aislop) | 코드에 남는 서술형 주석, 삼킨 예외, 숨은 fallback, `as any`, 죽은 코드, 중복 등을 결정론적으로 검사한다. CLI·CI·hook·agent handoff가 있다. | 글이 아니라 코드용. “AI 출력은 생성 후 검증해야 한다”는 운영 사례 |
| [peakoss/anti-slop](https://github.com/peakoss/anti-slop) | PR 브랜치·크기·제목·본문·커밋·파일 변경·기여자 신호 등을 검사하는 GitHub Action. | 문체 편집기가 아니라 PR 품질 게이트. v0 계열이므로 도입 전 고정 버전 검토 |
| [Wikipedia WikiProject](https://en.wikipedia.org/wiki/WikiProject) | Humanizer가 참고한 ‘Signs of AI writing’의 출발점. 상투성·홍보성·출처 없는 평가를 여러 흔적의 묶음으로 본다. | 원문 링크와 각주가 있을 때만 직접 인용하고, 깨진 링크는 검증 대기 |

## 2. 문서 변환·출판

원문을 출판물로 만드는 안정적인 순서: ① HTML·Markdown·DOCX·PDF 원문 확보 → ② 본문 구조와 코드 블록을 보존한 중간 Markdown → ③ 문서 유형별 편집 규칙 → ④ 표지·도표·이미지 → ⑤ PDF 렌더링 → ⑥ 실제 페이지를 눈으로 검수. HTML이 깔끔해도 PDF로 바꾸면 여백·표·코드·이미지 배치가 무너질 수 있으므로 「생성 완료」와 「출판 가능한 결과」를 구분한다. 저작권 안내가 붙은 원문은 출처·허가·상업 이용 조건을 확인하기 전까지 출판 자료로 쓰지 않는다.

| 저장소 | 대화에서 건질 내용 | 판단 |
|---|---|---|
| [klic-co-kr/KLIC-BOOK](https://github.com/klic-co-kr/KLIC-BOOK) | 책·강의 보관 구조와 한국어 원고를 출판형 A4 PDF로 편집·렌더링·검수하는 스킬을 함께 둔다. | 한국어 전자책 제작 참고 |
| [firecrawl/anydoc](https://github.com/firecrawl/anydoc) | Word·PowerPoint·Excel·ODF·RTF·EPUB·CSV·PDF를 공통 Markdown으로 변환하는 Rust 라이브러리와 Node/Python/WASM 바인딩, Agent Skill을 제공한다. | 원문 정규화 후보. 실제 변환 결과는 문서별로 검수 |
| [magicrew/doc7](https://github.com/magicrew/doc7) | 페이지 이미지를 읽어 표·차트·배치·스크린샷까지 AI-ready Markdown으로 만들고, 페이지별 Markdown·이미지·메타데이터를 보존한다. | 시각 구조가 중요한 PDF/문서 후보. 모델·렌더러·민감 파일 권한 확인 |
| [DoHyun468/claw-hwp](https://github.com/DoHyun468/claw-hwp) | HWP/HWPX를 읽고 만들고 고치는 Agent Skill. rhwp WASM과 브라우저 미리보기 기반으로 로컬에서 동작한다. | 한글 문서 작업 후보. 실제 서식 보존은 한컴 호환성 검수 |

## 3. 에이전트 작업 품질·컨텍스트

| 저장소 | 대화에서 건질 내용 | 판단 |
|---|---|---|
| [djfksjd/ironcode](https://github.com/djfksjd/ironcode) | `evidence before claims`, `spec before style`, `root cause before fix`, 비용도 정확성의 일부라는 게이트. 보안·리소스·데이터 접근·방어 코드·배포 준비를 단계별로 확인한다. | “완료”라는 말보다 실행 결과를 남기는 규칙으로 흡수 |
| [kunal12203/graperoot](https://github.com/kunal12203/graperoot) | 파일·심볼·import·호출 관계를 그래프로 만들고, 질문 전에 관련 코드를 컨텍스트로 미리 넣는 엔진이다. | 컨텍스트 탐색 비용을 줄이는 아이디어. README 벤치마크 수치는 독립 재검증 전까지 주장으로 사용하지 않음 |
| [PrimeIntellect-ai/prime-agent](https://github.com/PrimeIntellect-ai/prime-agent) | 지속 REPL, Recursive Language Model, continual harness, 하위 에이전트, 장기 실행·재접속을 묶은 코딩·연구 에이전트다. | 장기 작업 구조 참고. 모델이 Python·프로젝트 명령을 사용자 권한으로 실행하므로 샌드박스로 오해하지 않음 |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `grill-me`, 공통 용어 문서, `tdd`, 버그 진단, 조사, 코드 리뷰, 장기 작업 지도 등 작고 조합 가능한 스킬 모음이다. | AI가 장황해지는 원인을 목표·용어·피드백 루프의 부재로 보는 부분이 유용 |

## 4. 화면·브라우저·에이전트 작업공간

**X-Ray UI** — 개발 환경에서만 켜지는 컴포넌트 경계 오버레이. `Ctrl+Alt`를 누르는 동안 경계를 그리고, hover 강조·클릭 시 inspector 패널(컴포넌트명·DOM·소스 경로·크기·z-index·주요 props)을 연다. React Portal로 띄우고, 오버레이가 pointer event와 레이아웃을 방해하지 않게 하며, 자기 UI는 탐색 대상에서 뺀다. `data-xray-component`·`data-xray-source`로 대상을 식별하고 `Esc`로 끈다. 스크린샷만 보고 컴포넌트 구조를 추측하는 시간을 줄이는 것이 목적이다.
**Explain Mode** — 외부 분석기가 추측하게 두는 대신 앱이 자기 기술 스택·컴포넌트·동작을 직접 설명하는 모드. 공개 서비스에서는 소스 경로·props·내부 구조의 노출 범위를 제한한다.

| 저장소 | 대화에서 건질 내용 | 판단 |
|---|---|---|
| [klic-co-kr/KLIC-FrontScope](https://github.com/klic-co-kr/KLIC-FrontScope) | Chrome 사이드 패널에서 스크린샷·CSS/Tailwind·폰트·접근성·React 컴포넌트 검사·콘솔·리소스 네트워크 등을 제공한다. | X-Ray UI와 Explain Mode의 실제 참고 사례 |
| [pinchtab/pinchtab](https://github.com/pinchtab/pinchtab) | 로컬 우선 Go 서버와 HTTP API로 Chrome을 제어한다. headless/headed, 프로필, 다중 인스턴스, 접근성 기반 요소 참조, 텍스트 추출을 제공한다. | 로컬 기본값을 유지하고 외부 바인딩·원격 포트·인증 프로필 노출을 금지하는 보안 검토가 필수 |
| [cloudflare/computer](https://github.com/cloudflare/computer) | Durable Object와 SQLite를 기준으로 한 가상 파일시스템, 컨테이너·isolate shell·isolate JavaScript 실행 백엔드. | 실험·프로토타입용. README가 preview-only라고 명시하므로 운영 인프라로 바로 채택하지 않음 |
| [cloudflare/cloudflare-os](https://github.com/cloudflare/cloudflare-os) | 에이전트 채팅, 샌드박스형 앱(gadget), 외부 접근을 좁히고 승인·로그를 남기는 Gatekeeper를 묶은 AI 작업공간. | Explain Mode·작업공간·지연 승인 설계 참고. early access 상태와 권한 범위 확인 |
| [WebMCP 소개](https://blog.cloudflare.com/webmcp/) | 웹사이트가 에이전트에게 임의의 화면 조작 대신 명시적인 도구를 제공하자는 구상. | 저장소가 아닌 표준·브라우저 지원 논의. 실제 지원 범위는 별도 확인 |

## 5. 조사·검색·자료 구조화

```text
문서·웹 자료 수집 → 중복 제거·출처 기록 → Markdown·구조화 데이터로 정규화
→ 검색·RAG·그래프에 적재 → 문장별 근거 연결 → 생성·검증·발행
```

검색량을 늘리는 것보다 출처가 유지되고 다시 찾을 수 있는 형태로 저장하는 것이 중요하다. 블로그·X·Reddit 등은 크롤링 가능 여부와 이용 조건을 따로 확인한다. 반복적인 파일명 변경·PDF 분할·보고서 생성은 자동화 효과가 크지만, 단일 「딸깍」보다 입력·변환·검증·출력 로그를 갖춘 작은 파이프라인이 유지보수에 유리하다. 크롤링·문서 추출 서비스 [Firecrawl](https://www.firecrawl.dev/)은 요금·이용 조건을 확인하고 쓴다.

| 저장소 | 대화에서 건질 내용 | 판단 |
|---|---|---|
| [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) | Reddit·X·YouTube·HN 등 여러 출처를 병렬 검색하고 최근 반응과 출처를 묶어 조사 브리프를 만든다. | 최신 동향 조사 참고. 출처의 원문·검색 범위·편향을 재확인 |
| [hike-lab/public-data-lens](https://github.com/hike-lab/public-data-lens) | 한국 공공데이터를 찾고 비교·판정하는 MCP 계층. JSON-LD/DCAT 메타데이터, 버전 있는 결정론적 규칙, 근거 수준을 함께 반환한다. | 자료 수집에서 `근거 수준`과 스냅샷을 남기는 사례 |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) | 기술 SEO·콘텐츠·스키마·GEO/AEO·백링크·국제 SEO 등을 여러 스킬·에이전트로 나눈다. | SEO 자동화 후보. 설치 스크립트·외부 API·출력 부가문구·비용을 먼저 감사 |
| [robert-mcdermott/ai-knowledge-graph](https://github.com/robert-mcdermott/ai-knowledge-graph) | 긴 텍스트를 청크로 나누고 Subject-Predicate-Object 관계를 추출한 뒤 엔티티 표준화·관계 추론·HTML 그래프를 만든다. | 구조화 아이디어 참고. 추론 관계는 원문 사실과 분리해 표시 |

## 6. 사용 순서

1. AI 문장 자체는 `humanizer`의 패턴 목록과 `korean-writing-reviewer`의 원문 보호 규칙으로 진단한다.
2. 코드 산출물은 `aislop`·`ironcode`처럼 규칙과 실행 증거를 남기는 게이트를 둔다.
3. 문서가 섞여 있으면 `anydoc` 또는 `doc7`로 중간 Markdown을 만든 뒤 PDF/HWP 화면을 검수한다.
4. 장기 작업은 `mattpocock/skills`, `Prime Agent`, `GrapeRoot`의 아이디어를 참고하되, 권한·비용·샌드박스 경계를 별도로 확인한다.
