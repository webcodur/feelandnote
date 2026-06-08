import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { UiLabelProvider, UiLabelToggle } from '@/components/ui-label'

export const metadata: Metadata = {
  title: { default: 'Remotion BO', template: '%s — Remotion BO' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" spellCheck={false}>
      <body spellCheck={false}>
        <UiLabelProvider>
          <div className="flex flex-col h-screen">
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-6">
                {children}
              </main>
            </div>
          </div>
          <UiLabelToggle />
        </UiLabelProvider>
      </body>
    </html>
  )
}
