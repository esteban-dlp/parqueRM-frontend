import type { ReactNode } from 'react'
import styles from './Table.module.css'

interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => ReactNode
  width?: string
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  className?: string
}

export function Table<T>({ columns, data, keyExtractor, className }: Props<T>) {
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={keyExtractor(row)}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render
                    ? col.render(row, i)
                    : String((row as Record<string, unknown>)[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TableActions({ children }: { children?: ReactNode }) {
  return <div className={styles.actions}>{children}</div>
}
