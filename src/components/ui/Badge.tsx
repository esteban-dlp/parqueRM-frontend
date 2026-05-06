import type { ReactNode } from 'react'
import styles from './Badge.module.css'

type BadgeVariant = 'green' | 'blue' | 'amber' | 'teal' | 'purple' | 'red' | 'gray'

interface Props {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'gray', children, className }: Props) {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
}
