import type { Metadata } from 'next'
import { listBookPersonPeople } from '@/actions/admin/book-person/episodes'
import { REMOTION_LOCAL } from '@/lib/remotion-local'
import BookPersonBoard from '@/features/book-person/unit/BookPersonBoard'

export const metadata: Metadata = {
  title: '책과 사람',
}

export default async function BookPersonPage() {
  const people = await listBookPersonPeople()

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">책과 사람</h1>
        <p className="mt-1 text-sm text-text-secondary">
          인물마다 들어가 고친다. 감상기록이 없어도 되고, 책이 없어도 된다. 저장하면 그 인물 편이 생긴다.
        </p>
      </div>
      <BookPersonBoard people={people} remotionLocal={REMOTION_LOCAL} />
    </div>
  )
}
