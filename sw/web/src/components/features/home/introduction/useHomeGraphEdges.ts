'use client'

import { useEffect, useRef, useState } from 'react'

interface Geometry { width: number; height: number; paths: string[] }

export function useHomeGraphEdges(enabled = true) {
  const ref = useRef<HTMLDivElement>(null)
  const [geometry, setGeometry] = useState<Geometry>({ width: 1, height: 1, paths: [] })

  useEffect(() => {
    if (!enabled) return
    const graph = ref.current
    if (!graph) return
    let frame = 0
    let mounted = true
    const draw = () => {
      const root = graph.querySelector<HTMLElement>('[data-graph-root]')
      if (!root) return
      const box = graph.getBoundingClientRect(), hub = root.getBoundingClientRect()
      if (!box.width || !box.height) return
      const targets = [...graph.querySelectorAll<HTMLElement>('[data-graph-branch]')].map(node =>
        (node.querySelector('[data-graph-target]') ?? node).getBoundingClientRect())
      const horizontal = !!targets[0] && hub.right < targets[0].left
      const portrait = (root.querySelector('[data-graph-origin]') ?? root).getBoundingClientRect()
      const sx = portrait.right - box.x + 6, spine = sx + 12
      const sideY = portrait.top + portrait.height / 2 - box.y
      const lane = Math.min(...targets.map(target => target.top - box.y)) - 25
      const cx = hub.x + hub.width / 2 - box.x, sy = hub.bottom - box.y + 4
      const paths = targets.map(target => {
        const ex = target.x + target.width / 2 - box.x, ey = target.top - box.y - 9
        if (horizontal) return `M ${sx} ${sideY} H ${spine - 6} Q ${spine} ${sideY}, ${spine} ${sideY - 6} V ${lane + 12} Q ${spine} ${lane}, ${spine + 12} ${lane} H ${ex - 12} Q ${ex} ${lane}, ${ex} ${lane + 12} V ${ey}`
        const direction = Math.sign(ex - cx), radius = Math.min(12, Math.abs(ex - cx) / 2)
        return `M ${cx} ${sy} V ${ey - 24} Q ${cx} ${ey - 12}, ${cx + direction * radius} ${ey - 12} H ${ex - direction * radius} Q ${ex} ${ey - 12}, ${ex} ${ey}`
      })
      setGeometry(previous => previous.width === box.width && previous.height === box.height && paths.every((path, index) => path === previous.paths[index])
        ? previous : { width: box.width, height: box.height, paths })
    }
    const schedule = () => {
      if (!mounted) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(graph)
    graph.querySelectorAll<HTMLElement>('[data-graph-root], [data-graph-branch]').forEach(node => observer.observe(node))
    document.fonts.ready.then(schedule)
    schedule()
    return () => { mounted = false; observer.disconnect(); cancelAnimationFrame(frame) }
  }, [enabled])

  return { ref, geometry }
}
