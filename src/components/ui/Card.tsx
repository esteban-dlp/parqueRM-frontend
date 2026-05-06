import type { ReactNode, CSSProperties } from 'react'
import styles from './Card.module.css'

interface Props {
  children: ReactNode
  className?: string
  padding?: 'default' | 'sm' | 'flush'
  style?: CSSProperties
}

export function Card({ children, className, padding = 'default', style }: Props) {
  const cls = [
    styles.card,
    padding === 'sm' ? styles.sm : '',
    padding === 'flush' ? styles.flush : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={cls} style={style}>{children}</div>
}
