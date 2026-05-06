import { useLocation } from 'react-router-dom'
import styles from './Topbar.module.css'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/visitantes': 'Operaciones / Registro de visitantes',
  '/vehiculos': 'Operaciones / Registro de vehículos',
  '/hospedaje': 'Operaciones / Hospedaje',
  '/recibos': 'Operaciones / Recibos',
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

export function Topbar() {
  const location = useLocation()
  const label = ROUTE_LABELS[location.pathname] ?? 'Parque RM'

  const parts = label.split(' / ')
  const currentDate = new Date().toLocaleDateString('es-GT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className={styles.topbar}>
      <span className={styles.breadcrumb}>
        {parts.length > 1 ? (
          <>
            {parts.slice(0, -1).join(' / ')}
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
          {currentDate}
        </span>
      </div>
    </div>
  )
}
