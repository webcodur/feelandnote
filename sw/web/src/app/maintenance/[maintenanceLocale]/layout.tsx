import type { Metadata } from 'next'
import '../../globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://feelandnote.com'),
  title: '서비스 운영 안내 | Feel&Note',
  description: 'Feel&Note 서비스 운영 작업 안내입니다.',
  robots: { index: false, follow: false },
}

export default async function MaintenanceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ maintenanceLocale: string }>
}>) {
  const { maintenanceLocale } = await params

  return (
    <html lang={maintenanceLocale === 'en' ? 'en' : 'ko'}>
      <body>{children}</body>
    </html>
  )
}
