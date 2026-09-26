/**
 * 「더 보기」로 이어 붙인 첫 카드는 가로 레일 끝이라 화면 밖에 선다 — 눌러도 겉으로 아무 변화가
 * 없어 보이므로, 붙인 자리로 레일을 옮겨 새 묶음을 보여 준다. index는 이어 붙인 첫 카드의 순번이다.
 */
export function revealShelfItem(wrapper: HTMLElement | null, index: number): void {
  const rail = wrapper?.querySelector<HTMLElement>('.overflow-x-auto')
  const target = rail?.children.item(index) as HTMLElement | null
  if (!rail || !target) return
  const railRect = rail.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  rail.scrollTo({ left: rail.scrollLeft + targetRect.left - railRect.left - 12, behavior: 'smooth' })
}
