'use client'

import { useEffect, useState } from 'react'
import type { BattleAnimation } from '@/lib/game/suikoden/types'

interface Props {
  animation: BattleAnimation | null
  onAnimationEnd: () => void
}

export default function BattleSVGOverlay({ animation, onAnimationEnd }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!animation) {
      setVisible(false)
      return
    }
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onAnimationEnd()
    }, 800)
    return () => clearTimeout(timer)
  }, [animation, onAnimationEnd])

  if (!visible || !animation) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 400 200">
        {animation.type === 'melee' && (
          <g className="animate-pulse">
            {/* 검 슬래시 */}
            <line
              x1="120" y1="100" x2="280" y2="100"
              stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"
              opacity="0.8"
            >
              <animate attributeName="x2" from="120" to="280" dur="0.4s" fill="freeze" />
              <animate attributeName="opacity" from="1" to="0" dur="0.8s" fill="freeze" />
            </line>
            <line
              x1="140" y1="80" x2="260" y2="120"
              stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"
              opacity="0.6"
            >
              <animate attributeName="opacity" from="0.8" to="0" dur="0.6s" fill="freeze" />
            </line>
          </g>
        )}

        {animation.type === 'ranged' && (
          <g>
            {/* 화살 */}
            <line
              x1="80" y1="100" x2="80" y2="100"
              stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"
              markerEnd="url(#arrowhead)"
            >
              <animate attributeName="x2" from="80" to="320" dur="0.5s" fill="freeze" />
              <animate attributeName="opacity" from="1" to="0" dur="0.8s" fill="freeze" />
            </line>
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <polygon points="0 0, 6 2, 0 4" fill="#a78bfa" />
              </marker>
            </defs>
          </g>
        )}

        {animation.type === 'fire' && (
          <g>
            {/* 화공 — 불꽃 파티클 */}
            {[0, 1, 2, 3, 4].map(i => (
              <circle key={i} r="8" fill="#ef4444" opacity="0">
                <animate
                  attributeName="cx"
                  from={200 + (i - 2) * 30}
                  to={200 + (i - 2) * 40}
                  dur="0.6s"
                  fill="freeze"
                />
                <animate
                  attributeName="cy"
                  from={120}
                  to={80 + i * 8}
                  dur="0.6s"
                  fill="freeze"
                />
                <animate attributeName="opacity" values="0;0.9;0" dur="0.8s" fill="freeze" />
                <animate attributeName="r" from="4" to="12" dur="0.8s" fill="freeze" />
              </circle>
            ))}
            <text x="200" y="60" textAnchor="middle" fill="#fbbf24" fontSize="24" opacity="0">
              🔥
              <animate attributeName="opacity" values="0;1;0" dur="0.8s" fill="freeze" />
            </text>
          </g>
        )}

        {animation.type === 'heal' && (
          <g>
            {/* 치유 — 녹색 십자가 + 파티클 */}
            <text x="200" y="110" textAnchor="middle" fill="#22c55e" fontSize="28" opacity="0">
              ✚
              <animate attributeName="opacity" values="0;1;0.5;0" dur="0.8s" fill="freeze" />
              <animate attributeName="y" from="120" to="80" dur="0.8s" fill="freeze" />
            </text>
            {[0, 1, 2].map(i => (
              <circle key={i} cx={190 + i * 10} cy={100} r="3" fill="#4ade80" opacity="0">
                <animate attributeName="cy" from="110" to={70 + i * 10} dur="0.6s" fill="freeze" />
                <animate attributeName="opacity" values="0;0.8;0" dur="0.8s" fill="freeze" />
              </circle>
            ))}
          </g>
        )}

        {animation.type === 'buff' && (
          <g>
            {/* 버프 — 상승 화살 */}
            <text x="200" y="110" textAnchor="middle" fill="#60a5fa" fontSize="20" opacity="0">
              ▲
              <animate attributeName="opacity" values="0;1;0" dur="0.8s" fill="freeze" />
              <animate attributeName="y" from="120" to="70" dur="0.8s" fill="freeze" />
            </text>
            <circle cx="200" cy="100" r="0" fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0">
              <animate attributeName="r" from="10" to="40" dur="0.6s" fill="freeze" />
              <animate attributeName="opacity" values="0;0.6;0" dur="0.8s" fill="freeze" />
            </circle>
          </g>
        )}

        {animation.type === 'debuff' && (
          <g>
            {/* 디버프 — 하강 */}
            <text x="200" y="90" textAnchor="middle" fill="#f87171" fontSize="20" opacity="0">
              ▼
              <animate attributeName="opacity" values="0;1;0" dur="0.8s" fill="freeze" />
              <animate attributeName="y" from="70" to="130" dur="0.8s" fill="freeze" />
            </text>
            <circle cx="200" cy="100" r="0" fill="none" stroke="#f87171" strokeWidth="1" opacity="0">
              <animate attributeName="r" from="30" to="5" dur="0.6s" fill="freeze" />
              <animate attributeName="opacity" values="0;0.6;0" dur="0.8s" fill="freeze" />
            </circle>
          </g>
        )}

        {animation.type === 'defend' && (
          <g>
            {/* 방어 — 실드 이펙트 */}
            <circle cx="200" cy="100" r="0" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0">
              <animate attributeName="r" from="5" to="30" dur="0.4s" fill="freeze" />
              <animate attributeName="opacity" values="0;0.8;0.4;0" dur="0.8s" fill="freeze" />
            </circle>
            <text x="200" y="108" textAnchor="middle" fill="#fbbf24" fontSize="22" opacity="0">
              🛡️
              <animate attributeName="opacity" values="0;1;0.6;0" dur="0.8s" fill="freeze" />
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
