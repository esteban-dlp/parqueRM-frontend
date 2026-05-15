import { useState } from 'react'
import { useDebouncedCallback } from '@/hooks/useDebounce'
import styles from './SearchBar.module.css'

interface Props {
  placeholder?: string
  onSearch: (query: string) => void
  debounceMs?: number
}

export function SearchBar({ placeholder = 'Buscar…', onSearch, debounceMs = 400 }: Props) {
  const [value, setValue] = useState('')

  const debouncedSearch = useDebouncedCallback(onSearch, debounceMs)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setValue(q)
    debouncedSearch(q)
  }

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
