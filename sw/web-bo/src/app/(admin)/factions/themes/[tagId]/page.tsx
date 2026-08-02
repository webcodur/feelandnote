import { redirect } from 'next/navigation'

/**
 * 옛 테마 편집기 주소 — 26.08.03 편집 화면 통합으로 폐기됐다.
 *
 * 통합 진입점(`/factions/{토막}`)이 테마 id 도 해석한다. 웹 전용 테마는 그 자리에서
 * 도감 구획만으로 열리고, 제작 편에 연결된 테마는 그 편의 편집기로 이어진다.
 */
export default async function LegacyThemeEditorPage({
  params,
}: {
  params: Promise<{ tagId: string }>
}) {
  const { tagId } = await params
  redirect(`/factions/${encodeURIComponent(tagId)}`)
}
