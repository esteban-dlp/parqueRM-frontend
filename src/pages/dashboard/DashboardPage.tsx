import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard.api'
import { networkApi } from '@/api/network.api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/hooks/useToast'
import { formatCurrency, formatTime } from '@/utils/formatters'
import type { LatestMovement } from '@/types/dashboard'
import type { LocalAccessInfo } from '@/types/network'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const toast = useToast()
  const [localAccess, setLocalAccess] = useState<LocalAccessInfo | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(false)

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

  async function generateLocalAccessUrl() {
    setLoadingAccess(true)
    try {
      const info = await networkApi.localAccess()
      setLocalAccess(info)

      if (info.loginUrl) {
        await copyText(info.loginUrl)
        toast.success('URL por IP generada y copiada')
      } else {
        toast.error('No se detectó una IP de red local')
      }
    } catch {
      toast.error('No se pudo generar la URL por IP')
    } finally {
      setLoadingAccess(false)
    }
  }

  async function copyNetworkUrl() {
    if (!localAccess?.loginUrl) return
    try {
      await copyText(localAccess.loginUrl)
      toast.success('URL copiada')
    } catch {
      toast.error('No se pudo copiar la URL')
    }
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen del día"
        actions={
          <Button
            type="button"
            size="sm"
            onClick={generateLocalAccessUrl}
            disabled={loadingAccess}
            title="Generar URL con IP para usuarios conectados a la red"
          >
            {loadingAccess ? 'Generando...' : 'Generar URL por IP'}
          </Button>
        }
      />

      {localAccess && (
        <div className={styles.localAccessPanel}>
          {localAccess.loginUrl ? (
            <>
              <div className={styles.localAccessInfo}>
                <span className={styles.localAccessLabel}>URL para trabajadores en la red</span>
                <a className={styles.localAccessUrl} href={localAccess.loginUrl} target="_blank" rel="noreferrer">
                  {localAccess.loginUrl}
                </a>
                <span className={styles.localAccessIp}>IP del servidor: {localAccess.primaryIp}</span>
              </div>
              <Button type="button" size="sm" variant="primary" onClick={copyNetworkUrl}>
                Copiar URL
              </Button>
            </>
          ) : (
            <div className={styles.localAccessInfo}>
              <span className={styles.localAccessLabel}>No se detectó una IP LAN útil</span>
              <span className={styles.localAccessIp}>
                Revisá que la computadora esté conectada a la red local.
              </span>
            </div>
          )}
        </div>
      )}
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

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Some LAN HTTP contexts deny Clipboard API; fall back to a local textarea.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('copy_failed')
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
