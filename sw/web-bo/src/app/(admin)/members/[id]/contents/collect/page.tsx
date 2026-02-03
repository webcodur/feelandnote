import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CollectPage({ params }: PageProps) {
  const { id } = await params
  redirect(`/celebs/${id}/contents/collect`)
}
