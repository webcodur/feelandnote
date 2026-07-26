import type { Metadata } from 'next'
import { listDiscourseEpisodes } from '@/actions/admin/discourses/episodes'
import { REMOTION_LOCAL } from '@/lib/remotion-local'
import DiscourseBoard from './DiscourseBoard'

export const metadata: Metadata = {
  title: '가상 담화',
}

/**
 * 가상 담화 — 편 목록 표 하나.
 *
 * 한 줄이 담화 한 편이다. 인물 수·발언 수는 **DB 에서 센다.** 영상 관리 대시보드 시절에는
 * 목록을 만들려고 전 편의 대본 파일을 통째로 읽었는데(설계 §1 R5), 그러면 파일이 없는 편이
 * 목록에서 사라져 "만들었는데 안 보인다"가 된다.
 *
 * 팩션과 달리 도감 테마가 없다 — 담화는 세력도감에 투영되지 않는다(설계 §3 차이 ③).
 */
export default async function DiscoursesPage() {
  const episodes = await listDiscourseEpisodes()

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">가상 담화</h1>
        <p className="mt-1 text-sm text-text-secondary">
          인물이 마주 앉아 논제를 다투는 영상 편을 관리합니다. 노출로 켠 편만 영상으로 만들어집니다.
        </p>
      </div>

      <DiscourseBoard episodes={episodes} remotionLocal={REMOTION_LOCAL} />
    </div>
  )
}
