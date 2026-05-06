import { useToastStore } from '@/store/toast.store'
import styles from './Toast.module.css'

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore()
  if (toasts.length === 0) return null
  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[styles.toast, styles[t.variant]].join(' ')}
          onClick={() => dismiss(t.id)}
          role="alert"
        >
          <span className={styles.icon}>{t.variant === 'success' ? '✓' : '✕'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
