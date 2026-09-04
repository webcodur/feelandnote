import type { Metadata } from 'next'
import { getFigureBookAdminData } from '@/actions/admin/figure-books'
import FigureBooksManager from './FigureBooksManager'

export const metadata: Metadata = {
  title: '인물 도서 관리',
}

export default async function FigureBooksPage() {
  const data = await getFigureBookAdminData()

  return <FigureBooksManager initialData={data} />
}
