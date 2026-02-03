import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string; type?: string; search?: string }>
}

// 기존 /members/[id]/contents 경로를 /celebs/[id]/contents로 리다이렉트
export default async function MemberContentsPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const queryParams = new URLSearchParams()
  if (sp.page) queryParams.set('page', sp.page)
  if (sp.type) queryParams.set('type', sp.type)
  if (sp.search) queryParams.set('search', sp.search)
  const qs = queryParams.toString()
  redirect(`/celebs/${id}/contents${qs ? `?${qs}` : ''}`)
}
