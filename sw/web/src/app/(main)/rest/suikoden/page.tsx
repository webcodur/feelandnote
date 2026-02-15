/*
  파일명: /app/(main)/rest/suikoden/page.tsx
  기능: 천도 — 셀럽 전략 시뮬레이션
  책임: 게임 데이터를 서버에서 로딩하고 클라이언트 게임 컴포넌트에 전달한다.
*/ // ------------------------------

import { loadSuikodenCharacters, loadSuikodenItems } from '@/actions/game/suikoden'
import SuikodenGame from '@/components/features/game/suikoden/SuikodenGame'

export const metadata = {
  title: '천도 | 쉼터',
  description: '역사 속 인물들로 세력을 키우고 문명을 통일하는 전략 시뮬레이션',
}

export default async function SuikodenPage() {
  const characters = await loadSuikodenCharacters()
  const characterIds = characters.slice(0, 100).map(c => c.id)
  const items = await loadSuikodenItems(characterIds)

  return <SuikodenGame characters={characters} items={items} />
}
