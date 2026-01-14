import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ path?: string[] }>
}

export default async function UsersRedirectPage({ params }: PageProps) {
  const { path } = await params
  const targetPath = path?.length ? `/members/${path.join('/')}` : '/members?tab=user'
  redirect(targetPath)
}
