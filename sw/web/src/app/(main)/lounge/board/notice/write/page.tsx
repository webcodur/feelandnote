import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/checkAdmin'
import NoticeForm from '@/components/features/board/notices/NoticeForm'

export const metadata = {
  title: '공지사항 작성',
}

export default async function NoticeWritePage() {
  const supabase = await createClient()
  const admin = await isAdmin(supabase)

  if (!admin) {
    redirect('/lounge/board/notice')
  }

  return <NoticeForm mode="create" />
}
