import styles from './Loading.module.css'

interface Props {
  inline?: boolean
  text?: string
}

export function Loading({ inline = false, text = 'Cargando…' }: Props) {
  if (inline) {
    return (
      <span className={styles.inline}>
        <span className={styles.spinner} />
        {text}
      </span>
    )
  }
  return (
    <div className={styles.wrap}>
      <span className={styles.spinner} />
      <span>{text}</span>
    </div>
  )
}
