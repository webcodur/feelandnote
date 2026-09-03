import type { Metadata } from 'next'
import { getCelebProfessionLabel } from '@feelandnote/shared/constants/celeb-professions'
import { getTodayFigureSchedule } from '@/actions/admin/today-figure'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '오늘의 인물',
}

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  news: { label: '뉴스', className: 'bg-blue-500/20 text-blue-400' },
  seed: { label: '시드', className: 'bg-amber-500/20 text-amber-400' },
  seed_prediction: { label: '예측', className: 'bg-gray-500/20 text-gray-400' },
}

export default async function TodayFigurePage() {
  const today = new Date().toISOString().slice(0, 10)
  const start = new Date(today)
  start.setDate(start.getDate() - 7)
  const startDate = start.toISOString().slice(0, 10)

  const schedule = await getTodayFigureSchedule(startDate, 15)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">오늘의 인물</h1>
        <p className="text-sm text-text-secondary mt-1">
          날짜별 선택되는 셀럽 스케줄 (오늘 기준 전후 7일)
        </p>
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-sm font-medium text-text-secondary">날짜</th>
              <th className="px-4 py-3 text-sm font-medium text-text-secondary">아바타</th>
              <th className="px-4 py-3 text-sm font-medium text-text-secondary">이름</th>
              <th className="px-4 py-3 text-sm font-medium text-text-secondary">직군</th>
              <th className="px-4 py-3 text-sm font-medium text-text-secondary">출처</th>
              <th className="px-4 py-3 text-sm font-medium text-text-secondary text-right">콘텐츠 수</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((item) => {
              const isToday = item.date === today
              const badge = SOURCE_BADGE[item.source] || SOURCE_BADGE.seed_prediction
              return (
                <tr
                  key={item.date}
                  className={`border-b border-border last:border-b-0 ${
                    isToday ? 'bg-accent/10' : 'hover:bg-bg-card'
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className={`text-sm ${isToday ? 'font-bold text-accent' : 'text-text-primary'}`}>
                      {item.date}
                      {isToday && <span className="ml-2 text-xs bg-accent text-white px-1.5 py-0.5 rounded">오늘</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.celeb?.avatar_url ? (
                      <img
                        src={item.celeb.avatar_url}
                        alt={item.celeb.nickname || ''}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-bg-card flex items-center justify-center text-text-secondary text-xs">
                        ?
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!item.celeb ? (
                      <span className="text-sm text-text-secondary">-</span>
                    ) : item.celeb.slug ? (
                      // 상세 주소는 slug로 잡힌다(/celebs/[slug]). 예전엔 id를 끼워 넣어 전부 404였다.
                      <Link
                        href={`/celebs/${item.celeb.slug}`}
                        className="text-sm text-accent hover:underline font-medium"
                      >
                        {item.celeb.nickname || '(이름 없음)'}
                      </Link>
                    ) : (
                      // slug가 없는 인물은 갈 곳이 없으므로 링크를 걸지 않는다.
                      <span className="text-sm text-text-primary font-medium">
                        {item.celeb.nickname || '(이름 없음)'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-secondary">
                      {item.celeb?.profession
                        ? getCelebProfessionLabel(item.celeb.profession)
                        : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    {item.source === 'news' && item.newsCount > 0 && (
                      <span className="ml-1 text-xs text-text-secondary">{item.newsCount}건</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-text-primary">
                      {item.celeb?.contentCount ?? '-'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
