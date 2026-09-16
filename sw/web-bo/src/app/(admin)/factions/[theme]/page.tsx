import { notFound } from 'next/navigation'
import { resolveThemeEditorData } from '@/actions/admin/factions/themes'
import { ThemeEditor } from '@/components/factions/ThemeAtlas/ThemeEditor'

/** `/factions/{테마 slug 또는 id}` — 세력도감 테마 편집 화면 */
export default async function FactionThemePage({
  params,
}: {
  params: Promise<{ theme: string }>
}) {
  const { theme } = await params
  const data = await resolveThemeEditorData(decodeURIComponent(theme))
  if (!data) notFound()
  return <ThemeEditor data={data} />
}
