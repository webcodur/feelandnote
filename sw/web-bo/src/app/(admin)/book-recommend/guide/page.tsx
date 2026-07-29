import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '서재 탐방 제작 가이드',
  robots: { index: false, follow: false },
}

const STEPS = [
  {
    title: '1. 에피소드 생성',
    body: '본 서비스의 셀럽과 공개 콘텐츠를 불러와 meta.ko.json과 책별 book.ko.json 뼈대를 만듭니다. 콘텐츠 ID와 사용자 콘텐츠 ID도 함께 기록되어 이후 리소스 동기화가 끊기지 않습니다.',
    href: '/book-recommend/search',
    action: '새 에피소드',
  },
  {
    title: '2. 원고와 이미지 편집',
    body: '시나리오 화면에서 롱폼·쇼츠·SOLO의 공통 원고와 이미지 앵커를 편집합니다. 책 본문이 단일 원천이며 SOLO는 별도 원고를 만들지 않습니다.',
  },
  {
    title: '3. 음성 제작과 타이밍',
    body: 'TTS 결과를 로컬 에피소드 폴더에서 관리하고, 발음 규칙·받아쓰기·정렬·청킹 결과를 확인합니다. 유료 TTS 실행은 기존 운영 규칙대로 수동입니다.',
  },
  {
    title: '4. 렌더와 배포',
    body: '롱폼·쇼츠·카드 렌더를 실행하고 작업 큐에서 로그를 확인합니다. YouTube 화면에서는 편성과 업로드 메타데이터를 관리합니다.',
  },
  {
    title: '5. 본 서비스 리소스 정비',
    body: '리소스 탭에서 DB 콘텐츠와 Remotion 책 항목의 연결, 표지 원본, 로컬 WebP 캐시를 함께 검사하고 정비합니다.',
    href: '/book-recommend?view=resources',
    action: '리소스 열기',
  },
]

export default function GuidePage() {
  return (
    <div className="max-w-3xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">서재 탐방 제작 가이드</h1>
          <p className="mt-1 text-sm text-text-secondary">
            원고부터 음성·렌더·배포·본 서비스 리소스까지 web-bo 한곳에서 관리합니다.
          </p>
        </div>
        <Link href="/book-recommend" className="text-sm font-semibold text-accent hover:text-accent-hover">
          제작 현황으로
        </Link>
      </header>

      <section className="rounded-xl border border-border bg-bg-card p-5">
        <h2 className="font-semibold text-text-primary">운영 원칙</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
          <li>• 본 서비스 DB는 셀럽·콘텐츠 관계와 표지 출처의 원천입니다.</li>
          <li>• <code className="text-text-primary">sw/remotion/public/episodes</code>는 영상 원고·음성·이미지·타이밍의 제작 원천입니다.</li>
          <li>• 제작 기능은 로컬 파일과 렌더 프로세스를 쓰므로 <code className="text-text-primary">REMOTION_LOCAL=1</code> 환경에서만 활성화됩니다.</li>
          <li>• 깊은 감상배경을 본 서비스에 노출하는 기능은 후속 기획입니다. 이번 통합은 제작 작업대와 중복 리소스 관리의 단일화가 범위입니다.</li>
        </ul>
      </section>

      <div className="space-y-3">
        {STEPS.map(step => (
          <section key={step.title} className="rounded-xl border border-border bg-bg-secondary/30 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <h2 className="font-semibold text-text-primary">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{step.body}</p>
              </div>
              {step.href && (
                <Link href={step.href} className="text-sm font-semibold text-accent hover:text-accent-hover">
                  {step.action}
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
