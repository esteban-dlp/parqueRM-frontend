import { Button } from '@/components/ui/Button'
import styles from './PaginationBar.module.css'
import type { PaginatedMeta } from '@/types/api'

interface Props {
  meta: PaginatedMeta | undefined
  onPageChange: (page: number) => void
}

export function PaginationBar({ meta, onPageChange }: Props) {
  if (!meta || meta.totalPages <= 1) return null

  return (
    <div className={styles.bar}>
      <span>
        Mostrando {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
      </span>
      <div className={styles.controls}>
        <Button
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          ← Anterior
        </Button>
        <Button
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Siguiente →
        </Button>
      </div>
    </div>
  )
}
