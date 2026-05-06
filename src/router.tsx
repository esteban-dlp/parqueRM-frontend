/**
 * Definición central de rutas de ParqueRM.
 * Cada página usa lazy loading para dividir el bundle.
 * Las rutas protegidas requieren autenticación (ProtectedRoute).
 * Algunas rutas exigen un permiso específico además de estar autenticado.
 */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { Loading } from '@/components/ui/Loading'
import { PERMISSIONS } from '@/utils/permissions'

// ─── Carga diferida de páginas ────────────────────────────────────────────────
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const VisitorsPage = lazy(() => import('@/pages/visitors/VisitorsPage'))
const VehiclesPage = lazy(() => import('@/pages/vehicles/VehiclesPage'))
const LodgingPage = lazy(() => import('@/pages/lodging/LodgingPage'))
const ReceiptsPage = lazy(() => import('@/pages/receipts/ReceiptsPage'))
const CobroPage = lazy(() => import('@/pages/receipts/CobroPage'))
const CashPage = lazy(() => import('@/pages/cash/CashPage'))
const ClosuresPage = lazy(() => import('@/pages/cash/ClosuresPage'))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'))
const ConfigPage = lazy(() => import('@/pages/config/ConfigPage'))
const CatalogsPage = lazy(() => import('@/pages/config/CatalogsPage'))
const TariffsPage = lazy(() => import('@/pages/config/TariffsPage'))
const UsersPage = lazy(() => import('@/pages/config/UsersPage'))
const RolesPage = lazy(() => import('@/pages/config/RolesPage'))
const AuditPage = lazy(() => import('@/pages/audit/AuditPage'))

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  // ─── Rutas públicas (solo login) ──────────────────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: (
          <Lazy>
            <LoginPage />
          </Lazy>
        ),
      },
    ],
  },

  // ─── Rutas protegidas (requieren auth) ────────────────────────────────────
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: '/dashboard',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.REPORTES_READ}>
              <DashboardPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/visitantes',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.VISITANTES_READ}>
              <VisitorsPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/vehiculos',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.VEHICULOS_READ}>
              <VehiclesPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/hospedaje',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.HOSPEDAJE_READ}>
              <LodgingPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/recibos',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.RECEIPTS_READ}>
              <ReceiptsPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/cobro',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.RECEIPTS_CREATE}>
              <CobroPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/cobro/:originType/:originId',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.RECEIPTS_CREATE}>
              <CobroPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/caja',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.CAJA_READ}>
              <CashPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/caja/cierres',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.CAJA_READ}>
              <ClosuresPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/reportes',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.REPORTES_READ}>
              <ReportsPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/configuracion',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.CONFIG_READ}>
              <ConfigPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/catalogos',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.CATALOGS_READ}>
              <CatalogsPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/tarifas',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.CATALOGS_READ}>
              <TariffsPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/usuarios',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.USERS_READ}>
              <UsersPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/roles',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.ROLES_READ}>
              <RolesPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
      {
        path: '/auditoria',
        element: (
          <Lazy>
            <ProtectedRoute permission={PERMISSIONS.AUDIT_READ}>
              <AuditPage />
            </ProtectedRoute>
          </Lazy>
        ),
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
