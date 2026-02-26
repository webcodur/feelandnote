import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      {/* 장식 아이콘 */}
      <div className="text-5xl mb-6 opacity-30">🏛️</div>

      <h2 className="font-serif text-xl sm:text-2xl text-text-primary mb-3">
        페이지를 찾을 수 없습니다
      </h2>

      <p className="text-text-secondary text-sm sm:text-base mb-8 max-w-md">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>

      <Link
        href="/"
        className="px-6 py-2.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 font-serif text-sm"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
