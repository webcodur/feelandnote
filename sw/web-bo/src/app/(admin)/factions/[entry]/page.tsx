import { notFound } from 'next/navigation'
import { resolveFactionEditorData } from '@/actions/admin/factions/board'
import { EntryEditor } from '@/components/factions/entry/EntryEditor'

/** `/factions/{세력·분류 slug 또는 id}` — 도감 행 편집 화면 */
export default async function FactionEntryPage({
  params,
}: {
  params: Promise<{ entry: string }>
}) {
  const { entry } = await params
  const data = await resolveFactionEditorData(decodeURIComponent(entry))
  if (!data) notFound()
  return <EntryEditor data={data} />
}
