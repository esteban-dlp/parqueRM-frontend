import type { SelectHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import styles from './Select.module.css'

interface Option {
  value: string | number
  label: string
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Option[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, options, placeholder, className, id, ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className={styles.group}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={[styles.select, error ? styles.error : '', className]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          {placeholder && (
            <option value="">
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <span className={styles.errorMsg}>{error}</span>}
      </div>
    )
  },
)
Select.displayName = 'Select'
