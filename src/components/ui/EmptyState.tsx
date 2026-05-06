import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface Props {
  icon?: string
  title?: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  icon = '📋',
  title = 'Sin resultados',
  description,
  action,
}: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.desc}>{description}</div>}
      {action}
    </div>
  )
}
