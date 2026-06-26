import { Button } from '@/components/ui/Button'
import { useLocalAccess } from '@/hooks/useLocalAccess'
import styles from './LocalAccessPanel.module.css'

interface LocalAccessPanelProps {
  /** Texto del botón que dispara la detección de IP. */
  triggerLabel?: string
}

/**
 * Detecta y muestra la URL/IP LAN del servidor (vía GET /health/local-access, público).
 * Usado en Login, Configuración y Dashboard para que el operador pueda
 * compartir "entren a esta URL" con otras computadoras de la red.
 */
export function LocalAccessPanel({ triggerLabel = 'Ver URL de acceso' }: LocalAccessPanelProps) {
  const { localAccess, loading, errorMessage, generate, copyUrl } = useLocalAccess()

  return (
    <div>
      <Button type="button" size="sm" onClick={generate} disabled={loading} title="Detecta la IP del servidor en la red local">
        {loading ? 'Detectando...' : triggerLabel}
      </Button>

      {(localAccess || errorMessage) && (
        <div className={styles.panel} style={{ marginTop: 10 }}>
          {localAccess?.loginUrl ? (
            <>
              <div className={styles.info}>
                <span className={styles.label}>URL para otras computadoras de la red</span>
                <a className={styles.url} href={localAccess.loginUrl} target="_blank" rel="noreferrer">
                  {localAccess.loginUrl}
                </a>
                <span className={styles.ip}>
                  {localAccess.primaryIp ? `IP del servidor: ${localAccess.primaryIp}` : `URL reportada por backend: ${localAccess.url}`}
                </span>
              </div>
              <Button type="button" size="sm" variant="primary" onClick={copyUrl}>
                Copiar URL
              </Button>
            </>
          ) : (
            <div className={styles.info}>
              <span className={styles.label}>No se pudo generar una URL de red local</span>
              <span className={styles.ip}>
                {errorMessage ?? 'El backend no devolvio una URL util. Revisa que la computadora este conectada a la red local.'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
