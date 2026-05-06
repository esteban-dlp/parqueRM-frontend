import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useParkConfig } from '@/hooks/useParkConfig'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS } from '@/utils/permissions'
import styles from './Sidebar.module.css'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  badge?: string
}

function NavItem({ to, icon, label, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [styles.navItem, isActive ? styles.active : ''].filter(Boolean).join(' ')
      }
    >
      <span className={styles.navIcon}>{icon}</span>
      {label}
      {badge && <span className={styles.navBadge}>{badge}</span>}
    </NavLink>
  )
}

function NavSub({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [styles.navSub, isActive ? styles.active : ''].filter(Boolean).join(' ')
      }
    >
      {label}
    </NavLink>
  )
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const { parkName, config } = useParkConfig()
  const navigate = useNavigate()

  const canViewDashboard = usePermission(PERMISSIONS.REPORTES_READ)
  const canViewVisitors = usePermission(PERMISSIONS.VISITANTES_READ)
  const canViewVehicles = usePermission(PERMISSIONS.VEHICULOS_READ)
  const canViewLodging = usePermission(PERMISSIONS.HOSPEDAJE_READ)
  const canViewCaja = usePermission(PERMISSIONS.CAJA_READ)
  const canViewReceipts = usePermission(PERMISSIONS.RECEIPTS_READ)
  const canViewReports = usePermission(PERMISSIONS.REPORTES_READ)
  const canViewConfig = usePermission(PERMISSIONS.CONFIG_READ)
  const canViewCatalogs = usePermission(PERMISSIONS.CATALOGS_READ)
  const canViewUsers = usePermission(PERMISSIONS.USERS_READ)
  const canViewRoles = usePermission(PERMISSIONS.ROLES_READ)
  const canViewAudit = usePermission(PERMISSIONS.AUDIT_READ)

  const initials = user?.fullName
    ? user.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('')
    : user?.username?.slice(0, 2).toUpperCase() ?? 'U'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoCircle}>
          {config?.logoUrl ? (
            <img src={config.logoUrl} alt={parkName} />
          ) : (
            '🌿'
          )}
        </div>
        <div>
          <div className={styles.parkName}>{parkName}</div>
          {config?.municipality && (
            <div className={styles.parkSub}>
              {config.municipality}, {config.department}
            </div>
          )}
          {config?.sigapCode && (
            <div className={styles.sigapBadge}>SIGAP · {config.sigapCode}</div>
          )}
        </div>
      </div>

      {/* Principal */}
      {canViewDashboard && (
        <div className={styles.navSection}>
          <div className={styles.navLabel}>Principal</div>
          <NavItem
            to="/dashboard"
            label="Dashboard"
            badge="Hoy"
            icon={
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            }
          />
        </div>
      )}

      {/* Operaciones */}
      {(canViewVisitors || canViewVehicles || canViewLodging || canViewCaja || canViewReceipts) && (
        <div className={styles.navSection}>
          <div className={styles.navLabel}>Operaciones</div>
          {canViewVisitors && (
            <NavItem
              to="/visitantes"
              label="Registro visitantes"
              icon={
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="6" cy="5" r="3" />
                  <path d="M1 14c0-3 2-5 5-5s5 2 5 5" />
                  <circle cx="12" cy="4" r="2" />
                  <path d="M12 9c2 0 3.5 1.5 3.5 4" />
                </svg>
              }
            />
          )}
          {canViewVehicles && (
            <NavItem
              to="/vehiculos"
              label="Registro vehículos"
              icon={
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="6" width="14" height="7" rx="1.5" />
                  <path d="M3 6l2-4h6l2 4" />
                  <circle cx="4.5" cy="12" r="1.5" />
                  <circle cx="11.5" cy="12" r="1.5" />
                </svg>
              }
            />
          )}
          {canViewLodging && (
            <NavItem
              to="/hospedaje"
              label="Hospedaje"
              icon={
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 14V5l6-3 6 3v9" />
                  <path d="M6 14v-4h4v4" />
                  <rect x="5" y="6" width="2" height="2" />
                  <rect x="9" y="6" width="2" height="2" />
                </svg>
              }
            />
          )}
          {canViewReceipts && (
            <NavItem
              to="/recibos"
              label="Recibos"
              icon={
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 2h8a1 1 0 011 1v11l-2-1.5L9 14l-2-1.5L5 14l-2-1.5V3a1 1 0 011-1z" />
                  <path d="M6 6h4M6 9h3" />
                </svg>
              }
            />
          )}
          {canViewCaja && (
            <NavItem
              to="/caja"
              label="Control financiero"
              icon={
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="3" width="14" height="10" rx="1.5" />
                  <path d="M1 7h14M5 11h2" />
                </svg>
              }
            />
          )}
        </div>
      )}

      {/* Análisis */}
      {canViewReports && (
        <div className={styles.navSection}>
          <div className={styles.navLabel}>Análisis</div>
          <NavItem
            to="/reportes"
            label="Reportes y estadísticas"
            icon={
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 12V8l3-3 3 3 4-5" />
                <path d="M1 14h14" />
              </svg>
            }
          />
        </div>
      )}

      {/* Sistema */}
      {(canViewConfig || canViewCatalogs || canViewUsers || canViewRoles || canViewAudit) && (
        <div className={styles.navSection}>
          <div className={styles.navLabel}>Sistema</div>
          {canViewConfig && (
            <NavItem
              to="/configuracion"
              label="Configuración"
              icon={
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="2.5" />
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13" />
                </svg>
              }
            />
          )}
          {canViewCatalogs && <NavSub to="/catalogos" label="Catálogos" />}
          {canViewCatalogs && <NavSub to="/tarifas" label="Tarifas" />}
          {canViewUsers && <NavSub to="/usuarios" label="Usuarios" />}
          {canViewRoles && <NavSub to="/roles" label="Roles y permisos" />}
          {canViewAudit && <NavSub to="/auditoria" label="Auditoría" />}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.userChip}>
          <div className={styles.userAvatar}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.userName}>{user?.fullName ?? user?.username}</div>
            <div className={styles.userRole}>{user?.role?.name ?? '—'}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 4px',
            }}
          >
            ⏏
          </button>
        </div>
      </div>
    </div>
  )
}
