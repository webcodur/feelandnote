import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DesktopSidebar, MobileSidebar } from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { MobileSidebarProvider } from '@/contexts/MobileSidebarContext'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role || '')) {
    redirect('/login')
  }

  return (
    <MobileSidebarProvider>
      <div className="flex min-h-screen bg-bg-main">
        <DesktopSidebar />
        <MobileSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            user={{
              email: user.email || '',
              nickname: profile.nickname,
              role: profile.role,
            }}
          />
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  )
}
