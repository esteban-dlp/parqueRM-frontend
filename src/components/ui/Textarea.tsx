import type { TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import styles from './Input.module.css'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, id, className, ...rest }, ref) => {
    const taId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className={styles.group}>
        {label && (
          <label htmlFor={taId} className={styles.label}>
            {label}
          </label>
        )}
        <textarea
          id={taId}
          ref={ref}
          className={[
            styles.input,
            error ? styles.error : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ height: 'auto', minHeight: 64, padding: '7px 9px', resize: 'vertical' }}
          {...rest}
        />
        {error && <span className={styles.errorMsg}>{error}</span>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
