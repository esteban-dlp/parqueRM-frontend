import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard.api'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { PageHeader } from '@/components/shared/PageHeader'
import { LocalAccessPanel } from '@/components/shared/LocalAccessPanel'
import { formatCurrency, formatTime } from '@/utils/formatters'
import type { LatestMovement } from '@/types/dashboard'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { data: summary, isLoading: loadingSum } = useQuery({
    queryKey: ['dashboard/summary'],
    queryFn: dashboardApi.summary,
  })
  const { data: occupancy, isLoading: loadingOcc } = useQuery({
    queryKey: ['dashboard/occupancy'],
    queryFn: dashboardApi.occupancy,
  })
  const { data: movements, isLoading: loadingMov } = useQuery({
    queryKey: ['dashboard/latest-movements'],
    queryFn: dashboardApi.latestMovements,
  })

  const isLoading = loadingSum || loadingOcc || loadingMov

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen del día" />

      <div style={{ marginBottom: 18 }}>
        <LocalAccessPanel triggerLabel="Generar URL por IP" />
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          {/* Tarjetas de resumen */}
          <div className={styles.statsRow}>
            <StatCard
              label="Visitantes hoy"
              value={String(summary?.visitorsToday ?? 0)}
              sub="registrados"
            />
            <StatCard
              label="Vehículos hoy"
              value={String(summary?.vehiclesToday ?? 0)}
              sub="ingresados"
            />
            <StatCard
              label="Ingresos del día"
              value={formatCurrency(summary?.incomeToday ?? 0)}
              sub="recaudado"
              isUp
            />
            <StatCard
              label="Hospedaje hoy"
              value={String(summary?.lodgingToday ?? 0)}
              sub="registros"
            />
          </div>

          <div className={styles.grid2}>
            {/* Ocupación */}
            <Card>
              <div className={styles.sectionTitle}>Ocupación actual</div>
              {occupancy ? (
                <div className={styles.occupancyWrap}>
                  <div className={styles.occupancyBar}>
                    <div
                      className={styles.occupancyFill}
                      style={{
                        width: `${Math.min(occupancy.percentage, 100)}%`,
                        background:
                          occupancy.percentage > 90
                            ? 'var(--danger)'
                            : occupancy.percentage > 70
                              ? 'var(--warning)'
                              : 'var(--primary)',
                      }}
                    />
                  </div>
                  <div className={styles.occupancyMeta}>
                    <span>
                      {occupancy.current} / {occupancy.capacity} personas
                    </span>
                    <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                      {Math.round(occupancy.percentage)}%
                    </span>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  No hay datos de ocupación disponibles.
                </p>
              )}
            </Card>

            {/* Últimos movimientos */}
            <Card>
              <div className={styles.sectionTitle}>Últimos movimientos</div>
              {movements && movements.length > 0 ? (
                movements.slice(0, 8).map((m: LatestMovement) => (
                  <div key={m.id} className={styles.movementRow}>
                    <span
                      className={[
                        styles.movType,
                        m.movementType === 'INGRESO' ? styles.movTypeIn : styles.movTypeOut,
                      ].join(' ')}
                    />
                    <span className={styles.movDesc}>{m.description ?? m.conceptName ?? '—'}</span>
                    <span
                      className={[
                        styles.movAmt,
                        m.movementType === 'INGRESO' ? styles.movAmtIn : styles.movAmtOut,
                      ].join(' ')}
                    >
                      {m.movementType === 'INGRESO' ? '+' : '-'}
                      {formatCurrency(m.amount)}
                    </span>
                    <span className={styles.movTime}>{formatTime(m.createdAt)}</span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Sin movimientos recientes.
                </p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  isUp,
}: {
  label: string
  value: string
  sub?: string
  isUp?: boolean
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {sub && (
        <div className={[styles.statSub, isUp ? styles.statUp : ''].filter(Boolean).join(' ')}>
          {sub}
        </div>
      )}
    </div>
  )
}
