import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('auth.login')
  return { title: t('title') }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
