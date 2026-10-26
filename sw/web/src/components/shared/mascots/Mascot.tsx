import Image from 'next/image'
import type { ReactNode } from 'react'
import styles from './Mascot.module.css'

const ART = {
  flame: { src: '/images/mascots/flame.webp', width: 512, height: 512 },
  owl: { src: '/images/mascots/owl.webp', width: 384, height: 384 },
  lion: { src: '/images/mascots/lion.webp', width: 640, height: 427 },
} as const

export type MascotKind = keyof typeof ART

/** Service roles and reuse: docs/project/service/service-07-mascots.md. Adjacent text carries meaning. */
export default function Mascot({ kind, size = 96, className = '', eager = false }: {
  kind: MascotKind; size?: number; className?: string; eager?: boolean
}) {
  const art = ART[kind]
  return <span aria-hidden="true" className={`${styles.art} ${className}`} style={{ width: size }} data-mascot={kind}>
    <Image {...art} alt="" sizes={`${size}px`} loading={eager ? 'eager' : 'lazy'} draggable={false} />
  </span>
}

export function MascotEmptyState({ kind, message, description, compact = false, children }: {
  kind: MascotKind; message: string; description?: string; compact?: boolean; children?: ReactNode
}) {
  return <div className={`${styles.empty} ${compact ? styles.compact : ''}`}>
    <Mascot kind={kind} size={compact ? 72 : kind === 'lion' ? 160 : 104} />
    <p className={styles.message}>{message}</p>
    {description && <p className={styles.description}>{description}</p>}
    {children && <div className={styles.action}>{children}</div>}
  </div>
}

export function MascotFeedback({ message }: { message: string }) {
  return <span className={styles.feedback}>
    <Mascot kind="flame" size={40} className={styles.kindled} />
    <span>{message}</span>
  </span>
}
