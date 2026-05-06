import { useState, useCallback } from 'react'
import styles from './SearchBar.module.css'

interface Props {
  placeholder?: string
  onSearch: (query: string) => void
  debounceMs?: number
}

export function SearchBar({ placeholder = 'Buscar…', onSearch, debounceMs = 400 }: Props) {
  const [value, setValue] = useState('')

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value
      setValue(q)
      const timer = setTimeout(() => onSearch(q), debounceMs)
      return () => clearTimeout(timer)
    },
    [onSearch, debounceMs],
  )

  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>⌕</span>
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={styles.input}
      />
    </div>
  )
}
