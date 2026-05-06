# ParqueRM Frontend — Estado del Proyecto

**Última actualización:** Sprint 6 completado — sistema de toasts, loading states y empty states verificados. Build pasa sin errores.

---

## Estado actual

`npm run build` → **✓ Compila exitosamente** (300 módulos, sin errores TS)

---

## Estructura de archivos principales

```
src/
├── api/              # 16 archivos de API (todos implementados)
├── components/
│   ├── shared/       # PageHeader, PaginationBar, ProtectedRoute, SearchBar
│   └── ui/           # Button, Badge, Card, Input, Select, Textarea, Modal, Table,
│                     # Loading, EmptyState, Toast (ToastContainer)
├── hooks/            # useAuth, useParkConfig, usePermission, useToast
├── layouts/          # AppLayout (monta ToastContainer), AuthLayout, Sidebar, Topbar
├── pages/
│   ├── auth/         # LoginPage ✅
│   ├── dashboard/    # DashboardPage ✅
│   ├── visitors/     # VisitorsPage ✅ (form SIGAP + edición + toasts)
│   ├── vehicles/     # VehiclesPage ✅ (edición + toasts)
│   ├── lodging/      # LodgingPage ✅ (edición + toasts)
│   ├── receipts/     # ReceiptsPage ✅, CobroPage ✅ (toasts)
│   ├── cash/         # CashPage ✅, ClosuresPage ✅ (toasts)
│   ├── reports/      # ReportsPage ✅
│   ├── config/       # ConfigPage ✅, CatalogsPage ✅, TariffsPage ✅,
│   │                 # UsersPage ✅, RolesPage ✅ (todos con toasts)
│   └── audit/        # AuditPage ✅
├── router.tsx        # ✅ todas las rutas lazy-loaded
├── store/            # auth.store.ts, toast.store.ts (Zustand)
├── styles/           # tokens.css, globals.css
├── types/            # 15 archivos de tipos
└── utils/            # formatters.ts, permissions.ts
```

---

## Módulos completamente funcionales

- **Auth**: Login con JWT, redirect automático
- **Dashboard**: 4 tarjetas de resumen + ocupación + últimos movimientos
- **Visitantes**: Form completo SIGAP (categoría, geografía cascade, razones/actividades chips, tarifa auto-resolve, edición)
- **Vehículos**: Registro con tarifa auto-resolve, checkout, habilitar salida, edición
- **Hospedaje**: Registro con tipos y tarifa, edición
- **Recibos**: Lista con filtros, cancel/print, EmptyState
- **Cobro**: Form completo con líneas dinámicas, calculadora de cambio, pre-relleno desde origen
- **Caja**: Movimientos con create/cancel, filtros, resumen del día, EmptyState
- **Cierres**: Preview en tiempo real + historial + modal detalles, EmptyState
- **Reportes**: 3 tabs (general, visitantes, ingresos) + export Excel/PDF
- **Configuración**: Datos del parque + toggle servicios
- **Catálogos**: 11 catálogos con CRUD completo en tabs, EmptyState
- **Tarifas**: CRUD completo con filtros por tipo
- **Usuarios**: CRUD + toggle status + cambio de contraseña admin, EmptyState
- **Roles**: CRUD + asignación de permisos por módulo con checkboxes, EmptyState
- **Auditoría**: Lista filtrable + modal con diff JSON

---

## Qué falta implementar

### Funcionalidad pendiente (no rompe build):
1. **Impresión real** — `receiptsApi.triggerPrint` llama al endpoint pero la impresora necesita configuración de red local
2. **Export de reportes** — la descarga de blob funciona si el backend responde con el archivo correcto
3. **Auto-resolve de tarifa al cambiar tipo en modo edición** — deshabilitado intencionalmente; el usuario debe ajustar la tarifa manualmente si cambia el tipo durante edición
4. **Paginación en catálogos** — actualmente carga todos los elementos sin paginar

---

## Sprint 6 — UX básica: toasts, loading states, empty states

### Archivos creados

| Archivo | Propósito |
|---------|----------|
| `src/store/toast.store.ts` | Zustand store: lista de toasts, `push(msg, variant)`, auto-dismiss en 3.5s |
| `src/hooks/useToast.ts` | Hook de conveniencia: `toast.success(msg)` / `toast.error(msg)` |
| `src/components/ui/Toast.tsx` | `ToastContainer` — lista fija bottom-right, click para dismiss |
| `src/components/ui/Toast.module.css` | Estilos: verde=success, rojo=error, animación slideIn |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/layouts/AppLayout.tsx` | Montaje de `<ToastContainer />` global |
| `src/pages/visitors/VisitorsPage.tsx` | Toasts: crear, actualizar, registrar salida |
| `src/pages/vehicles/VehiclesPage.tsx` | Toasts: crear, actualizar, salida, habilitar salida |
| `src/pages/lodging/LodgingPage.tsx` | Toasts: crear, actualizar |
| `src/pages/receipts/ReceiptsPage.tsx` | Toasts: anular recibo |
| `src/pages/receipts/CobroPage.tsx` | Toasts: emitir recibo |
| `src/pages/cash/CashPage.tsx` | Toasts: crear movimiento, anular movimiento |
| `src/pages/cash/ClosuresPage.tsx` | Toasts: cierre de caja |
| `src/pages/config/ConfigPage.tsx` | Toasts: guardar configuración |
| `src/pages/config/CatalogsPage.tsx` | Toasts: crear elemento, actualizar elemento |
| `src/pages/config/UsersPage.tsx` | Toasts: crear usuario, actualizar, toggle status, cambiar contraseña |
| `src/pages/config/RolesPage.tsx` | Toasts: crear rol, actualizar rol, asignar permisos |

### Comportamiento del sistema de toasts

- Aparecen en la esquina inferior derecha (z-index: 9999)
- Se auto-descartan a los 3.5 segundos
- Click sobre un toast lo descarta inmediatamente
- Animación de entrada desde la derecha (0.2s)
- **Success**: fondo `var(--success)` (#166534) con texto blanco
- **Error**: fondo `var(--danger)` (#dc2626) con texto blanco
- Los toasts de error se muestran ADEMÁS de los `errorBox` inline en formularios (no reemplazan)

### Loading states verificados (ya existían)

Todos los botones de guardar/actualizar/cerrar ya tenían `disabled` y texto de "cargando" correctos:
- Modales: `disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}`
- Botones de acción inline: `disabled={mutation.isPending}`

### Empty states verificados (ya existían)

Todas las tablas principales ya tenían `<EmptyState>` con ícono y mensaje descriptivo:
- VisitorsPage, VehiclesPage, LodgingPage, ReceiptsPage, CashPage, ClosuresPage, UsersPage, RolesPage, CatalogsPage, AuditPage

### Resultado final

```
npm run build → ✓ built in 520ms — 0 errores TS — 300 módulos
```

---

## Sprint 5 — Edición de registros

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/utils/permissions.ts` | Agregado `HOSPEDAJE_UPDATE: 'HOSPEDAJE_UPDATE'` (faltaba) |
| `src/pages/visitors/VisitorsPage.tsx` | Edit completo: `editId`, `editRecord` query, pre-fill `useEffect` (incluyendo `reasonIds`/`activityIds`), `updateMutation`, `handleEdit`, `onSubmit` con branch, botón "Editar", modal dinámico |
| `src/pages/vehicles/VehiclesPage.tsx` | Edit completo: mismo patrón que Visitors; guard `&& !editId` en efecto de tarifa |
| `src/pages/lodging/LodgingPage.tsx` | Edit completo: mismo patrón; guard `&& !editId` en efecto de tarifa |

### Endpoints usados

| Endpoint | Propósito |
|----------|----------|
| `GET /visitors/{id}` | Carga datos para pre-rellenar modal de edición |
| `PATCH /visitors/{id}` | Actualiza registro del visitante |
| `GET /vehicles/{id}` | Carga datos para pre-rellenar modal de edición |
| `PATCH /vehicles/{id}` | Actualiza registro del vehículo |
| `GET /lodging/{id}` | Carga datos para pre-rellenar modal de edición |
| `PATCH /lodging/{id}` | Actualiza registro de hospedaje |

### Comportamiento implementado
- Modal reutilizado para crear y editar (título dinámico: "Nuevo…" / "Editar…")
- Botón principal dinámico: "Registrar" / "Actualizar"
- Al abrir edición: se llama `GET /{entity}/{id}` con `staleTime: 0` (siempre fresco)
- `reset()` pre-rellena todos los campos del formulario con datos del registro
- Guard `&& !editId` en el efecto de auto-resolve de tarifa: evita sobrescribir la tarifa almacenada al abrir edición
- `handleClose` limpia tanto `showForm` como `editId`
- Errores de create y update mostrados en el mismo `errorBox`

### Listo para probar manualmente

1. Visitantes → botón "Editar" → modal con datos precargados (incluyendo chips de razones/actividades seleccionados) → modificar → "Actualizar" → lista actualizada
2. Vehículos → botón "Editar" → modal con tipo, placa, tarifa → modificar → "Actualizar"
3. Hospedaje → botón "Editar" → modal con tipo, noches, huéspedes, tarifa → modificar → "Actualizar"
4. En modo edición: cambiar el tipo no sobreescribe automáticamente la tarifa (comportamiento intencional MVP)

### Limitación conocida

- **Tarifa en edición**: el auto-resolve de tarifa está desactivado en modo edición (`&& !editId`). Si el usuario cambia el tipo durante edición, debe ajustar la tarifa manualmente. Aceptable para MVP.

### Resultado final

```
npm run build → ✓ built in 622ms — 0 errores TS — 296 módulos
```

---

## Sprint 4 — Filtros y búsqueda

### Filtros implementados por pantalla

| Pantalla | Filtros | Backend | Notas |
|----------|---------|---------|-------|
| **VisitorsPage** | Búsqueda texto, desde, hasta, categoría | ✅ todos | Usa `GET /visitors?search=&from=&to=&visitorCategoryId=` |
| **VehiclesPage** | Búsqueda texto, desde, hasta, tipo de vehículo | ✅ todos | Usa `GET /vehicles?search=&from=&to=&vehicleTypeId=` |
| **LodgingPage** | Desde, hasta, tipo de hospedaje | ✅ todos | No hay `search` en `LodgingQueryParams` del backend |
| **ReceiptsPage** | Desde, hasta, estado, origen, método de pago | ✅ todos | No hay `search` en `ReceiptQueryParams`; búsqueda de texto no disponible |
| **CashPage** | Desde, hasta, tipo (ingreso/egreso), método de pago | ✅ todos | `conceptId` disponible en API pero omitido para no sobrecomplicar la UI |

### Comportamiento
- Cada cambio de filtro resetea `page` a 1 automáticamente
- Botón "✕ Limpiar" aparece solo cuando hay filtros activos
- SearchBar (VisitorsPage, VehiclesPage) usa `key` para resetear al limpiar
- Todos los filtros se pasan como `undefined` cuando están vacíos (no envían parámetro al backend)

### Lo que falta (no urgente)
- Búsqueda de texto en LodgingPage, ReceiptsPage, CashPage (no hay endpoint de search en esas APIs)
- Filtro por concepto en CashPage (disponible en API, omitido por simplicidad de UI)
- Filtro por número de recibo (no en `ReceiptQueryParams`, requeriría endpoint nuevo)

---

## Sprint 3 — Flujo completo de cobro

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `pages/visitors/VisitorsPage.tsx` | Botón "Cobrar" en cada fila → navega a `/cobro/VISITANTE/{id}` |
| `pages/vehicles/VehiclesPage.tsx` | Botón "Cobrar" en filas sin salida → navega a `/cobro/VEHICULO/{id}` |
| `pages/lodging/LodgingPage.tsx` | Columna de acciones nueva con botón "Cobrar" → navega a `/cobro/HOSPEDAJE/{id}` |
| `pages/receipts/CobroPage.tsx` | Auto-carga datos del origen + pre-rellena formulario + botón "← Volver" |

### Flujo implementado

```
[Visitantes] "Cobrar" → /cobro/VISITANTE/{id}
[Vehículos]  "Cobrar" → /cobro/VEHICULO/{id}
[Hospedaje]  "Cobrar" → /cobro/HOSPEDAJE/{id}
                ↓
           CobroPage carga el registro origen (GET /visitors/{id}, /vehicles/{id}, /lodging/{id})
           y pre-rellena:
           • VISITANTE: contributorName, contributorDocument, línea con categoría + cantidad + tarifa
           • VEHICULO:  línea con tipo + placa + monto total
           • HOSPEDAJE: línea con tipo + noches + tarifa/noche
                ↓
           Usuario completa: método de pago, monto recibido / referencia
                ↓
           POST /receipts → Recibo emitido con originType + originId
```

### Endpoints usados

| Endpoint | Propósito |
|----------|----------|
| `GET /visitors/{id}` | Carga datos del visitante para pre-rellenar |
| `GET /vehicles/{id}` | Carga datos del vehículo para pre-rellenar |
| `GET /lodging/{id}` | Carga datos del hospedaje para pre-rellenar |
| `GET /receipts/next-number` | Muestra el próximo número de recibo |
| `POST /receipts` | Crea el recibo con `originType` + `originId` |
| `GET /catalogs/payment-methods` | Opciones de método de pago |
| `GET /catalogs/financial-concepts` | Conceptos frecuentes en sidebar |

### Listo para probar manualmente

1. Crear un visitante → aparece botón "Cobrar" → click → CobroPage con línea pre-rellena
2. Crear un vehículo → botón "Cobrar" (solo si sin salida) → pre-rellena tipo + monto
3. Crear hospedaje → botón "Cobrar" → pre-rellena tipo + noches + tarifa
4. Completar pago → recibo visible en `/recibos`
5. Botón "← Volver" regresa a la página de origen

### Dependencias del backend para verificar

- **Recibo en Caja**: el backend debe crear automáticamente un `FinancialMovement` al crear el recibo con `originType` vinculado. Si no lo hace, el movimiento debe crearse manualmente en `/caja`. **No hay endpoint de caja que el frontend llame explícitamente al crear un recibo** — esto depende de lógica en el servicio de recibos del backend.
- **Vinculación recibo↔origen**: el recibo se guarda con `originType` + `originId`. Si el backend relaciona esos campos con el registro de visitante/vehículo/hospedaje en su capa de servicios, el vínculo queda persistido. Si no, la referencia existe solo en la tabla de recibos.

---

## Correcciones Sprint 2 — Alineación con backend real

| Archivo | Problema | Fix |
|---------|---------|-----|
| `types/vehicles.ts` | Campos incorrectos: `parkingRate`, `entryAt`, `driverName`, `driverDocument` | Reescrito con `appliedRate`, `checkInAt`, `checkOutAt`, `exitEnabled`, `source` |
| `pages/vehicles/VehiclesPage.tsx` | Usaba campos del tipo anterior | Reescrito completo con campos correctos |
| `types/lodging.ts` | Modelo completamente distinto: `guestName`, `quantity`, `rate` | Reescrito con `nights`, `guests`, `appliedRate`, `totalAmount` |
| `pages/lodging/LodgingPage.tsx` | Formulario con campos inexistentes | Reescrito completo con campos reales del backend |
| `types/receipts.ts` | `ReceiptOriginType` tenía `'GENERAL'`, `'MOVIMIENTO'`; campos `cancellationReason`, `cancelledBy` | Corregido a `'SERVICIO_GENERAL'`, `'MOVIMIENTO_MANUAL'`; campos `cancelReason`, `cancelledByUserId` |
| `types/cash.ts` | `MovementOriginType` tenía `'MANUAL'`, `'CIERRE'`; campo `closingNotes` en `CreateClosureDto` | Corregido a `'MOVIMIENTO_MANUAL'`; campo renombrado a `observations` |
| `pages/cash/CashPage.tsx` | Enviaba `originType: 'MANUAL'`; comparación `=== 'MANUAL'` | Corregido a `'MOVIMIENTO_MANUAL'` en ambos lugares |
| `pages/cash/ClosuresPage.tsx` | Usaba `closingNotes` en form, DTO y render | Renombrado a `observations` en todos los usos |
| `pages/receipts/CobroPage.tsx` | Schema zod con `'MOVIMIENTO'`, `'GENERAL'`; defaults con valor incorrecto | Corregido a `'MOVIMIENTO_MANUAL'`, `'SERVICIO_GENERAL'` en schema y 2 defaultValues |

---

## Instrucciones para continuar sin rehacer desde cero

1. **No tocar** `src/api/`, `src/types/`, `src/utils/` — son estables.
2. **Para agregar funcionalidad a una página**, editar el archivo existente en `src/pages/`.
3. **Para agregar un componente compartido**, agregar en `src/components/ui/` o `src/components/shared/`.
4. **Siempre correr** `npm run build` después de cambios.
5. **El alias `@`** apunta a `src/` — usarlo en todos los imports.
6. **Los tokens CSS** están en `src/styles/tokens.css` — usar `var(--nombre)` en los CSS Modules.
7. **Para toasts**: importar `useToast` de `@/hooks/useToast` → `toast.success(msg)` / `toast.error(msg)`.
8. **Resolver tipos Zod+RHF**: usar `zodResolver(schema) as unknown as Resolver<FormValues>` cuando haya campos `z.coerce`.
7. **Resolver tipos Zod+RHF**: usar `zodResolver(schema) as unknown as Resolver<FormValues>` cuando haya campos `z.coerce`.

---

## Variables de entorno requeridas

```env
VITE_API_URL=http://<IP_DEL_SERVIDOR>:3000/api
```

Configurar en `.env` (local) o `.env.production` (producción Docker).
