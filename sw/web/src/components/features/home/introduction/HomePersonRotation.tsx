'use client'

import AnimatedHeight from '@/components/ui/AnimatedHeight'
import HomeGraph from './HomeGraph'
import HomeReadingList from './HomeReadingList'
import { useHomePersonRotation } from './useHomePersonRotation'
import type { HomeGraphData, HomeGraphMode } from './types'
import styles from './HomePersonRotation.module.css'

export default function HomePersonRotation({ mode, people }: { mode: HomeGraphMode; people: HomeGraphData[] }) {
  const { ref, index, move, interact } = useHomePersonRotation(people.length, mode)
  const data = people[index]
  function navigate(direction: -1 | 1) {
    move(direction)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>(`[data-person-direction="${direction}"]`)?.focus({ preventScroll: true }))
  }
  return <div ref={ref} className={styles.container} data-home-rotation={mode} data-person={data.person.slug}>
    <AnimatedHeight>
      <div className={styles.stage} onClickCapture={interact} onFocusCapture={interact}>
        <div key={data.person.id} data-person-stage>
          {mode === 'appreciations' && <HomeGraph data={data} onNavigate={people.length > 1 ? navigate : undefined} />}
          {mode === 'books' && <HomeReadingList data={data} onNavigate={people.length > 1 ? navigate : undefined} />}
        </div>
      </div>
    </AnimatedHeight>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{data.person.name}</span>
  </div>
}
