export const metadata = { title: '가이드' }

export default function GuidePage() {
  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-xl font-bold mb-1">Remotion BO 가이드</h1>
        <p className="text-sm text-text-secondary">영상 제작 관리 대시보드 사용법</p>
      </div>

      {/* 전체 구조 */}
      <Section title="전체 구조">
        <pre className="bg-bg-card border border-border rounded-lg p-4 text-xs font-mono leading-relaxed overflow-x-auto">{`┌─ 헤더 ───────────────────────────────────────────────┐
│  Remotion BO    [인물 검색]    [가이드]                │
├─ 1단 사이드바 ─┬─ 2단 ────────┬──────────────────────┤
│                │              │                      │
│  📺 서재 탐방   │  (에피소드    │   메인 콘텐츠 영역    │
│  (향후 추가)   │   목록)       │                      │
│                │              │                      │
│  ────────     │  ● 알렉산더   │                      │
│  💾 인프라     │  ◐ 다빈치    │                      │
│                │  ○ 나폴레옹   │                      │
└────────────────┴──────────────┴──────────────────────┘

● = R2 동기화 완료   ◐ = 음성만 완료   ○ = JSON만 존재`}</pre>
        <Desc>
          1단 사이드바에서 시리즈를 클릭하면 2단이 펼쳐진다.
          시리즈가 추가되면 1단에 아이콘이 자동으로 늘어난다.
        </Desc>
      </Section>

      {/* 대시보드 */}
      {/*
        TODO(26.07.16): 아래 R2 설명문은 거짓이다. R2 음성 동기화는 26.03.23 폐기됐고
        src/에 R2 코드가 없어 ● 지표는 항상 0이다(영상 음성은 로컬 전용).
        대시보드 지표(app/page.tsx의 synced)와 함께 걷어내거나 음성 저장소 상태로 갈아끼운다.
        상세: docs/project/remotion-bo-plan.md
      */}
      <Section title="대시보드" path="/">
        <Desc>
          시리즈별 제작 현황을 한눈에 보여준다.
          각 카드는 전체 에피소드 수, 음성 완료 수, R2 동기화 수를 표시한다.
          카드를 클릭하면 해당 시리즈 홈으로 이동한다.
        </Desc>
        <InfoGrid items={[
          { label: '● 숫자', desc: 'R2 동기화 완료 에피소드 수' },
          { label: '◐ 숫자', desc: '음성은 있으나 R2 미동기화' },
          { label: '○ 숫자', desc: 'JSON만 존재 (음성 미생성)' },
        ]} />
      </Section>

      {/* 시리즈 홈 */}
      <Section title="시리즈 홈" path="/book-recommend">
        <Desc>
          시리즈에 속한 에피소드를 그리드로 보여준다.
          검색창으로 인물명을 필터링할 수 있다.
          각 카드를 클릭하면 에피소드 관리 페이지로 이동한다.
        </Desc>
      </Section>

      {/* 에피소드 관리 */}
      <Section title="에피소드 관리" path="/book-recommend/[name]">
        <Desc>
          단일 에피소드의 모든 제작 작업을 한 페이지에서 수행한다.
          상단의 &quot;시나리오 보기&quot; 링크로 시나리오 전용 뷰를 열 수 있다.
        </Desc>
        <div className="space-y-3 mt-3">
          <SubSection title="VOICE 섹션">
            <InfoGrid items={[
              { label: '엔진 선택', desc: 'Gemini / Cloud TTS 중 선택' },
              { label: '역할 필터', desc: '전체 / 나레이터 / 요약맨 / 셀럽' },
              { label: 'only 입력', desc: '특정 파일만 생성 (예: book-0-title)' },
              { label: 'TTS 생성', desc: '선택한 조건으로 음성 생성 시작' },
              { label: '+ R2 업로드', desc: 'TTS 생성 후 R2에 자동 업로드' },
              { label: '▶ 버튼', desc: '브라우저에서 음성 미리듣기' },
            ]} />
          </SubSection>
          <SubSection title="R2 STORAGE 섹션">
            <InfoGrid items={[
              { label: 'R2 업로드', desc: '변경된 WAV만 R2에 업로드' },
              { label: 'R2 다운로드', desc: 'R2에서 로컬로 WAV 다운로드' },
              { label: '전체 재업로드', desc: '해시 무시, 전체 파일 강제 업로드' },
            ]} />
          </SubSection>
          <SubSection title="RENDER 섹션">
            <InfoGrid items={[
              { label: '전체 렌더', desc: '롱폼 + 쇼츠 모두 렌더링' },
              { label: '롱폼만 / 쇼츠만', desc: '선택적 렌더링' },
            ]} />
          </SubSection>
          <SubSection title="JSON EDITOR 섹션">
            <Desc>
              에피소드 JSON을 직접 편집할 수 있다. 저장 시 JSON 파싱 검증을 거친다.
              새로고침 버튼은 마지막 저장 상태로 되돌린다.
            </Desc>
          </SubSection>
        </div>
      </Section>

      {/* 시나리오 뷰 */}
      <Section title="시나리오 뷰" path="/book-recommend/[name]/scenario">
        <Desc>
          에피소드의 시나리오를 읽기 전용으로 보여준다. 롱폼/쇼츠 탭으로 전환한다.
        </Desc>
        <InfoGrid items={[
          { label: '롱폼 탭', desc: '서비스 인사 → 인물 소개 → 감상철학 → 도서별(요약·경위·인용) → 아웃트로' },
          { label: '쇼츠 탭', desc: '구간별 역할·비주얼·대사·duration 표시' },
        ]} />
        <div className="mt-2">
          <p className="text-xs text-text-secondary">역할별 색상:</p>
          <div className="flex gap-4 mt-1 text-xs">
            <span className="text-[#888]">■ 나레이터</span>
            <span className="text-[#8bb8a8]">■ 요약맨</span>
            <span className="text-[#c8a46e]">■ 셀럽</span>
          </div>
        </div>
      </Section>

      {/* 인물 검색 */}
      <Section title="인물 검색" path="/search">
        <Desc>
          Supabase DB에서 셀럽을 검색하여 새 에피소드를 생성한다.
          검색 결과 테이블에서 기존 에피소드가 있으면 바로 이동하고,
          없으면 &quot;스캐폴딩&quot; 버튼으로 JSON 뼈대를 자동 생성한다.
        </Desc>
        <InfoGrid items={[
          { label: '이름 검색', desc: '한글/영문 닉네임, slug으로 검색' },
          { label: '직군 필터', desc: '정치/군사, 과학/기술 등 직군별 필터' },
          { label: '음성 보유', desc: 'ElevenLabs 음성이 등록된 셀럽만 표시' },
          { label: '생성 대상', desc: '스캐폴딩할 시리즈 선택 (기본: 서재 탐방)' },
          { label: '스캐폴딩', desc: 'DB 데이터 → JSON 뼈대 자동 생성' },
        ]} />
        <SubSection title="스캐폴딩으로 자동 채워지는 필드">
          <InfoGrid items={[
            { label: 'host.*', desc: 'nickname, speech_tone, avatar_url, voice_id' },
            { label: 'books[].title/creator', desc: 'DB에 등록된 도서 제목·저자' },
            { label: 'books[].thumbnail_url', desc: '도서 표지 이미지' },
            { label: 'narrator.serviceIntro', desc: '"오늘 함께할 인물은 ○○○입니다."' },
            { label: 'narrator.outro', desc: '템플릿 + 인물명/책 수 자동 삽입' },
          ]} />
        </SubSection>
        <SubSection title="수동으로 채워야 하는 필드">
          <InfoGrid items={[
            { label: 'host.philosophy', desc: '감상철학 (AI 초안 또는 수동 작성)' },
            { label: 'books[].summary', desc: '핵심 요약 (AI 초안 또는 수동 작성)' },
            { label: 'books[].contextMain', desc: '감상 배경 (AI 초안 또는 수동 작성)' },
            { label: 'books[].contextQuote', desc: '직접 인용 — 검증된 인용문만. AI 창작 금지' },
            { label: 'narrator.celebIntro', desc: '인물 소개 (AI 초안 또는 수동 작성)' },
            { label: 'shorts.segments', desc: '쇼츠 구성 — 크리에이티브 판단 필요' },
          ]} />
        </SubSection>
      </Section>

      {/* 시리즈 확장 */}
      <Section title="시리즈 확장 방법">
        <Desc>
          새 시리즈를 추가하려면 <code className="text-accent">lib/series-registry.ts</code>에 정의 1개를 추가한다.
          사이드바·라우팅·API 가 이 정의를 읽어 대응한다. 시리즈별 차이는 코드 분기가 아니라
          <code className="text-accent">dataModel</code>·<code className="text-accent">episodeHome</code>·
          <code className="text-accent">langTabEditor</code> 필드로 표현한다.
        </Desc>
        <pre className="bg-bg-card border border-border rounded-lg p-4 text-xs font-mono leading-relaxed overflow-x-auto mt-2">{`// lib/series-registry.ts
SERIES.push({
  id: 'rival-talk',
  label: '라이벌 대담',
  icon: '🎭',
  composition: 'RivalTalk',
  episodeDir: 'rival-talk',
  dataModel: 'book',       // 데이터 구조 계열 (book | discourse)
  episodeHome: 'scenario', // /[series]/[name] 진입 시 보낼 경로
  langTabEditor: false,    // true 면 /[lang]/[tab] 자체 편집 화면
  render: { codec: 'prores', proresProfile: '4444' },
})`}</pre>
        <Desc>
          기존 계열을 그대로 쓰면 추가 후 <code className="text-accent">episodes/rival-talk/</code> 디렉토리만 만들면 된다.
          데이터 구조가 다른 시리즈는 <code className="text-accent">dataModel</code>을 새로 하나 만들고
          IO(<code className="text-accent">server-utils</code>) · 목록(<code className="text-accent">Sidebar</code>) ·
          홈 · 편집기 등록표에 한 줄씩 얹는다.
        </Desc>
      </Section>

      {/* TASKS */}
      <Section title="작업 패널 (TASKS)">
        <Desc>
          TTS 생성, R2 업로드/다운로드, 렌더링 등의 작업은 백그라운드로 실행된다.
          TASKS 패널은 2초 간격으로 상태를 폴링하여 실시간 로그를 표시한다.
        </Desc>
        <InfoGrid items={[
          { label: 'running (파란색)', desc: '진행 중 — stdout/stderr 실시간 표시' },
          { label: 'done (초록색)', desc: '완료' },
          { label: 'error (빨간색)', desc: '실패 — 로그에서 원인 확인' },
        ]} />
      </Section>
    </div>
  )
}

/* ── 공통 컴포넌트 ── */

function Section({ title, path, children }: { title: string; path?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2">
        <h2 className="text-base font-bold">{title}</h2>
        {path && <code className="text-xs text-accent">{path}</code>}
      </div>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3">
      <h4 className="text-xs font-bold text-text-secondary mb-2">{title}</h4>
      {children}
    </div>
  )
}

function Desc({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-text-secondary leading-relaxed">{children}</p>
}

function InfoGrid({ items }: { items: { label: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 mt-2 text-xs">
      {items.map(({ label, desc }) => (
        <div key={label} className="contents">
          <span className="font-semibold text-text-primary whitespace-nowrap">{label}</span>
          <span className="text-text-secondary">{desc}</span>
        </div>
      ))}
    </div>
  )
}
