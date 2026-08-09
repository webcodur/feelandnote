import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DesktopSidebar, MobileSidebar } from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { MobileSidebarProvider } from '@/contexts/MobileSidebarContext'
import { ToastProvider } from '@/contexts/ToastContext'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // 이름은 사람 기록에, 권한은 계정 기록에 있다(26.08.07 분리).
  const [profileResult, accountResult, adminResult] = await Promise.all([
    supabase.from('member_profiles').select('nickname').eq('id', user.id).maybeSingle(),
    supabase.from('user_accounts').select('role').eq('id', user.id).maybeSingle(),
    supabase.rpc('is_admin'),
  ])

  if (profileResult.error || accountResult.error || adminResult.error) {
    throw new Error(
      `Failed to load administrator identity: ${
        profileResult.error?.message ?? accountResult.error?.message ?? adminResult.error?.message
      }`
    )
  }

  const profile = profileResult.data
  const account = accountResult.data
  const isAdmin = adminResult.data

  if (!profile || !account || !isAdmin) {
    redirect('/login')
  }

  return (
    <ToastProvider>
      <MobileSidebarProvider>
        {/*
          화면 높이를 창에 고정하고 본문만 스크롤한다(영상 관리 대시보드와 같은 틀).
          이래야 본문 안에서 화면에 따라붙는 요소(이미지 풀 등)가 실제로 따라붙는다 —
          예전처럼 높이 제한 없이 overflow 만 걸어두면 창이 스크롤되므로 따라붙기가 죽는다.
        */}
        <div className="flex h-screen overflow-hidden bg-bg-main">
          <DesktopSidebar />
          <MobileSidebar />
          <div className="flex min-h-0 flex-1 flex-col min-w-0">
            <Header
              user={{
                email: user.email || '',
                nickname: profile.nickname,
                role: account.role,
              }}
            />
            {/* 맺음말은 본문과 함께 스크롤된다(창 아래에 상주하면 작업 공간을 잡아먹는다) */}
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 md:p-6 [overflow-anchor:none]">
              <div className="min-w-0 flex-1">{children}</div>
              <Footer />
            </main>
          </div>
        </div>
      </MobileSidebarProvider>
    </ToastProvider>
  )
}
