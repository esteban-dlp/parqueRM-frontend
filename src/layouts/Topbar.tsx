import { useLocation } from 'react-router-dom'
import { GUATEMALA_TIME_ZONE } from '@/utils/formatters'
import styles from './Topbar.module.css'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/visitantes': 'Operaciones / Registro de visitantes',
  '/vehiculos': 'Operaciones / Registro de vehículos',
  '/hospedaje': 'Operaciones / Hospedaje',
  '/recibos': 'Operaciones / Tickets',
  '/cobro': 'Operaciones / Nuevo cobro',
  '/caja': 'Finanzas / Control financiero',
  '/caja/cierres': 'Finanzas / Cierre de caja',
  '/reportes': 'Análisis / Reportes y estadísticas',
  '/configuracion': 'Sistema / Configuración general',
  '/catalogos': 'Sistema / Catálogos',
  '/tarifas': 'Sistema / Tarifas',
  '/usuarios': 'Sistema / Administración de usuarios',
  '/roles': 'Sistema / Roles y permisos',
  '/auditoria': 'Sistema / Auditoría',
}

interface TopbarProps {
  onMenuToggle: () => void
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const location = useLocation()
  const label = ROUTE_LABELS[location.pathname] ?? 'Parque RM'

  const parts = label.split(' / ')
  const currentDate = new Date().toLocaleDateString('es-GT', {
    timeZone: GUATEMALA_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className={styles.topbar}>
      <button
        className={styles.menuBtn}
        onClick={onMenuToggle}
        aria-label="Abrir menú"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="2" y1="4.5" x2="16" y2="4.5" />
          <line x1="2" y1="9" x2="16" y2="9" />
          <line x1="2" y1="13.5" x2="16" y2="13.5" />
        </svg>
      </button>
      <span className={styles.breadcrumb}>
        {parts.length > 1 ? (
          <>
            <span className={styles.breadcrumbParent}>{parts.slice(0, -1).join(' / ')}</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{parts[parts.length - 1]}</span>
          </>
        ) : (
          <span className={styles.breadcrumbCurrent}>{label}</span>
        )}
      </span>
      <div className={styles.actions}>
        <span className={styles.dateChip}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3l2 2" />
          </svg>
          <span className={styles.dateText}>{currentDate}</span>
        </span>
      </div>
    </div>
  )
}
