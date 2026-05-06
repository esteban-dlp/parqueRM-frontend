# ParqueRM Frontend — Estado del Proyecto

**Última actualización:** Sprint 8 completado — QA funcional con Docker, flujo financiero, reportes, configuración, usuarios y auditoría.

---

## Estado actual

`npm run build` → **✓ Compila exitosamente** (301 módulos, sin errores TS)
Docker: `docker compose ps` → backend, frontend, sqlserver y db-init todos **Up**

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
│   ├── ErrorPage.tsx # Página de error global (404, 403, crash)
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

## Sprint 7B — QA real: mismatches backend/frontend, validaciones, errores legibles

### Causa raíz de cada error

| Error | Causa raíz | Fix |
|-------|-----------|-----|
| `I.map is not a function` en RolesPage | `/permissions/grouped-by-module` devuelve un **objeto plano** `{ MODULE: Permission[] }`, no un array. El frontend esperaba array y hacía `.map()` sobre el objeto | `permissionsApi.groupedByModule()` ahora transforma el objeto con `Object.entries()` a `PermissionGroup[]` |
| HTTP 400 en Configuración | El frontend enviaba `{ name, subtitle, lanUrl }` pero el backend espera `{ parkName, parkSubtitle, systemLanUrl }`. El DTO del backend y la entidad usan camelCase distinto | Se actualizaron `ParkConfig` type, `UpdateParkConfigDto` type, `ConfigPage`, `useParkConfig` hook |
| HTTP 400 en Cobro | `CreateReceiptLineDto` backend requiere `description` (no opcional) y `total` (no `amount`). Frontend enviaba `description: l.description \|\| undefined` (convertía a undefined) y campo `amount` inexistente en backend | Se corrigió el type y el payload: `description` siempre string, `total` en lugar de `amount` |
| Toggle servicios no funcionaba | `Service` entity usa `isEnabled` pero frontend type `ParkService` tenía `isActive` | Corregido `ParkService.isActive` → `isEnabled`, actualizado `ConfigPage` |
| Errores 400/500 mostraban "Request failed..." | `onError` handlers usaban `error.message` de Axios en lugar del mensaje real del backend | Todos los `onError` y `errorBox` ahora usan `getApiErrorMessage(err, fallback)` |

### Archivos cambiados en Sprint 7B

| Archivo | Cambio |
|---------|--------|
| `src/types/parkConfig.ts` | `name`→`parkName`, `subtitle`→`parkSubtitle`, `lanUrl`→`systemLanUrl` en `ParkConfig` y `UpdateParkConfigDto` |
| `src/types/catalogs.ts` | `ParkService.isActive`→`isEnabled`, añadido `code` |
| `src/types/receipts.ts` | `CreateReceiptLineDto`: `description` requerido, `total` requerido, eliminado `amount` |
| `src/hooks/useParkConfig.ts` | `data?.name` → `data?.parkName` |
| `src/api/permissions.api.ts` | `groupedByModule()`: transforma `{ MODULE: Permission[] }` a `PermissionGroup[]` |
| `src/pages/config/ConfigPage.tsx` | Usa `parkName`, `parkSubtitle`, `systemLanUrl`, `isEnabled`; error display con `getApiErrorMessage` |
| `src/pages/receipts/CobroPage.tsx` | Payload usa `total` (no `amount`), `description` sin fallback a undefined; validación efectivo>=total; `setError` en `amountReceived` |
| `src/pages/visitors/VisitorsPage.tsx` | `getApiErrorMessage` en errorBox y toasts |
| `src/pages/vehicles/VehiclesPage.tsx` | `getApiErrorMessage` en errorBox y toasts |
| `src/pages/lodging/LodgingPage.tsx` | `getApiErrorMessage` en errorBox y toasts |
| `src/pages/cash/CashPage.tsx` | `getApiErrorMessage` en errorBox y toasts |
| `src/pages/cash/ClosuresPage.tsx` | `getApiErrorMessage` en onError |
| `src/pages/receipts/ReceiptsPage.tsx` | `getApiErrorMessage` en onError |
| `src/pages/config/RolesPage.tsx` | `getApiErrorMessage` en todos los onError |
| `src/pages/config/UsersPage.tsx` | `getApiErrorMessage` en todos los onError |
| `src/pages/config/CatalogsPage.tsx` | `getApiErrorMessage` en todos los onError |

### Validaciones presentes en formularios (resumen)

| Página | Validaciones clave |
|--------|-------------------|
| CobroPage | descripción por línea min(1); paymentMethodId min(1); al menos 1 línea; **efectivo: monto recibido >= total** (nuevo) |
| VisitorsPage | visitorCategoryId requerido; quantity min(1); appliedRate min(0) |
| VehiclesPage | vehicleTypeId requerido; appliedRate min(0) |
| LodgingPage | lodgingTypeId requerido; nights min(1); guests min(1) |
| CashPage | conceptId requerido; paymentMethodId requerido; amount min(0.01) |
| ConfigPage | maxCapacity coerce a Number; campos opcionales → undefined si vacíos |
| RolesPage | name requerido en crear/editar |
| UsersPage | username, password requeridos en crear |

### Resultado final Sprint 7B

```
npm run build → ✓ built in 448ms — 0 errores TS — 301 módulos
docker compose ps → backend Up, frontend Up, sqlserver Up
```

---

## Sprint 8 — QA funcional con Docker: flujo financiero, reportes, configuración, usuarios, auditoría

### Diagnóstico de cada problema

#### 1. Recibos vs Caja — Diseño del backend (no bug de frontend)

**Causa raíz**: `ReceiptsService.create()` crea un `Receipt` con sus líneas pero NO crea un `FinancialMovement`. Son módulos independientes en el backend. Los recibos se registran en la tabla `receipts`, los movimientos en `financial_movements`. No hay código que los conecte automáticamente.

**Consecuencia**: Emitir un recibo desde `/cobro` no aparece en `/caja`. El reporte de ingresos (`/reports/income`) también usa `financial_movements`, por lo que tampoco incluirá los recibos.

**Acción frontend**: Nota informativa en `CobroPage` ("Los recibos no generan movimientos en Caja automáticamente — registrarlos manualmente si aplica"). Documentado aquí.

**Pendiente backend**: Si se quiere integración automática, el `ReceiptsService.create()` debería también crear un `FinancialMovement` con `originType = originType` del recibo. Esto requiere cambio en el backend (fuera de alcance de este sprint sin autorización).

#### 2. Reportes de ingresos vacíos — Flujo correcto

**Causa raíz**: El endpoint `/reports/income` consulta `FinancialMovement WHERE movementType = 'INGRESO'`. Si no hay movimientos manuales registrados en Caja, la lista estará vacía aunque existan recibos.

**Acción frontend**: La tab "Ingresos" muestra "Sin ingresos" cuando no hay movimientos en ese rango. Esto es correcto. Para ver ingresos en Reportes, el usuario debe registrar movimientos en `/caja` primero.

#### 3. Exportar PDF/Excel — Backend no genera binarios

**Causa raíz**: Los endpoints `/reports/*/export/excel` y `/reports/*/export/pdf` devuelven JSON (estructura `{ data: {..., export: true, format: 'excel'} }`), NO archivos binarios. El frontend solicitaba con `responseType: 'blob'`, descargando JSON como `.xlsx`/`.pdf` → archivo corrupto.

**Fix**: Se eliminó el uso de `responseType: 'blob'`. El botón Excel ahora genera un CSV desde los datos ya cargados en pantalla (no requiere librería externa). El botón PDF muestra un toast explicando que PDF no está disponible desde el servidor.

#### 4. Configuración "Park configuration not found" — Falta fila inicial en DB

**Causa raíz**: El `ParkConfigService.get()` hace `findOne({ where: {} })` y lanza `NotFoundException('Park configuration not found')` si no hay ninguna fila en `park_config`. El seed `03_seed_security.sql` solo inserta roles/permisos, no hay seed para `park_config`.

**Flujo correcto**: El administrador debe insertar manualmente una fila inicial en `park_config` desde SQL. El backend no tiene endpoint `POST /park-config` (solo `PATCH`).

**Fix frontend**: Si `GET /park-config` falla (isError), se muestra: "No existe una configuración inicial del parque en la base de datos. Un administrador debe insertar el registro inicial en la tabla `park_config`". El formulario queda oculto para no confundir al usuario.

#### 5. Crear usuarios "Validation failed" — Contraseña corta + array de errores no renderizaba

**Causa raíz A**: `CreateUserDto` requiere `@MinLength(8)` en `password`. El frontend no validaba esto, enviando contraseñas cortas al backend que respondía 400.

**Causa raíz B**: Cuando NestJS ValidationPipe falla, retorna `{ message: ["error1", "error2"] }` — array de strings. `getApiErrorMessage` retornaba el array directamente, y el toast intentaba renderizar un array como string → `[object Object]` o mensaje truncado.

**Fix**: 
- `getApiErrorMessage` ahora hace `Array.isArray(backendMsg) ? backendMsg.join('. ') : backendMsg`
- `UsersPage` agrega `minLength: { value: 8, message: 'Mínimo 8 caracteres' }` en el campo password con error visible bajo el campo

#### 6. Auditoría NaN/paginación — Meta incompleta del backend

**Causa raíz**: `AuditController.findAll()` retorna `meta: { total: N }` solamente (sin `page`, `limit`, `totalPages`). La `PaginationBar` usa `meta.page * meta.limit` → `undefined * undefined` → NaN.

**Fix**: `audit.api.ts` ahora construye la `PaginatedMeta` completa combinando los parámetros enviados (page/limit conocidos) con el `total` del backend: `{ total, page, limit, totalPages: Math.ceil(total/limit) }`.

#### 7. Anular recibo/movimiento daba 400 — Mismatch de campo

**Causa raíz**: `CancelReceiptDto` y `CancelMovementDto` del backend usan el campo `cancelReason`, pero el frontend enviaba `reason`. Al tener `@IsNotEmpty()`, el backend rechazaba la petición.

**Fix**: 
- `src/types/receipts.ts`: `CancelReceiptDto.reason` → `cancelReason`
- `src/types/cash.ts`: `CancelMovementDto.reason` → `cancelReason`
- `ReceiptsPage.tsx` y `CashPage.tsx`: form field y mutation actualizados a `cancelReason`

#### 8. Reporte general vacío — Tipo incorrecto en frontend

**Causa raíz**: El backend `getGeneral()` devuelve `{ totalVisitors, totalVehicles, totalLodging, totalIncome, totalExpense, net }`, pero el tipo `GeneralReport` del frontend tenía `{ visitors: [], vehicles: [], income: [] }` esperando arrays de categorías. El componente `GeneralReportView` iteraba sobre `report.visitors` que siempre era `undefined`.

**Fix**: Se actualizó `GeneralReport` type y `GeneralReportView` para mostrar los números de resumen reales del backend.

#### 9. Columnas de ingresos mostraban `[object Object]` — Campo anidado

**Causa raíz**: Los datos del reporte de ingresos son entidades `FinancialMovement` con relaciones cargadas: `{ concept: { id, name }, paymentMethod: { id, name } }`. Las columnas intentaban `String(r.concept)` → `[object Object]`.

**Fix**: Los renderers ahora acceden al campo anidado: `(r.concept as { name? })?.name`.

### Archivos cambiados en Sprint 8

| Archivo | Cambio |
|---------|--------|
| `src/types/receipts.ts` | `CancelReceiptDto.reason` → `cancelReason` |
| `src/types/cash.ts` | `CancelMovementDto.reason` → `cancelReason` |
| `src/types/reports.ts` | `GeneralReport` refleja estructura real del backend |
| `src/api/client.ts` | `getApiErrorMessage` maneja arrays (NestJS validation) con `.join('. ')` |
| `src/api/audit.api.ts` | Construye `PaginatedMeta` completa desde params + total del backend |
| `src/pages/reports/ReportsPage.tsx` | `GeneralReportView` corregido; export genera CSV client-side; columnas de ingresos acceden a campos anidados |
| `src/pages/config/ConfigPage.tsx` | Maneja `isError` (404) con mensaje en español; formulario oculto si no hay config |
| `src/pages/config/UsersPage.tsx` | Validación minLength(8) en password con mensaje bajo el campo |
| `src/pages/receipts/ReceiptsPage.tsx` | Form cancel usa `cancelReason`; mutation actualizada |
| `src/pages/cash/CashPage.tsx` | Form cancel usa `cancelReason`; mutation actualizada |
| `src/pages/receipts/CobroPage.tsx` | Nota informativa sobre desconexión recibos ↔ caja |

### Resultado final Sprint 8

```
npm run build → ✓ built in 694ms — 0 errores TS — 301 módulos
```

### Pendiente de backend (fuera de alcance sin autorización)

- Integración automática Receipt → FinancialMovement (requiere `ReceiptsService` crear el movimiento al emitir)
- Seed SQL inicial para `park_config` (insertar fila base en `03_seed_security.sql` o nuevo `04_seed_park_config.sql`)
- Export binario PDF/Excel real (requiere librería como `exceljs` o `pdfmake` en el backend)

---

## Sprint 7 — Corrección de errores de runtime

### Errores corregidos

| Error | Causa | Fix |
|-------|-------|-----|
| `toFixed is not a function` (VisitorsPage, LodgingPage, CobroPage) | Backend devuelve decimales como strings (`"25.00"`); llamar `.toFixed()` directamente en un string lanza excepción | Nuevo helper `toNum(value: unknown): number` en `formatters.ts`; `formatCurrency` acepta `unknown`; todas las multiplicaciones usan `toNum()` |
| `I.map is not a function` (RolesPage) | `rolesApi.list()` usaba `unwrap()` que devuelve `null` cuando backend no retorna datos; `{ data: roles = [] }` no aplica el default para `null` (solo para `undefined`); también puede llegar formato paginado `{data:[...], meta:{...}}` | `rolesApi.list()` ahora maneja null, paginado y array simple; guards `Array.isArray()` en todo RolesPage y en `openPerms()` |
| HTTP 400 en ConfigPage al guardar | Inputs `type="number"` devuelven strings; `maxCapacity: "100"` fallaba validación del backend | `onSubmit` coerce `maxCapacity` con `Number()` y convierte campos vacíos a `undefined` |
| HTTP 400 en CobroPage al emitir recibo | Ambigüedad en campo `amount` vs `total` en `CreateReceiptLineDto`; números sin coerción | Payload envía ambos `amount` y `total` (el backend acepta el que corresponda); todos los números usan `toNum()` |
| Pantalla de error por defecto de React Router | Sin `errorElement`, crashes mostraban pantalla blanca genérica | Nueva `ErrorPage` con mensaje claro, botón "Volver al dashboard", botón "Recargar", stack trace en modo dev; registrada en ambos grupos de rutas |

### Archivos creados

| Archivo | Propósito |
|---------|----------|
| `src/pages/ErrorPage.tsx` | Pantalla de error global — status HTTP + mensaje + acciones + stack trace en dev |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/utils/formatters.ts` | `toNum(value: unknown): number`; `formatCurrency` acepta `unknown` |
| `src/api/client.ts` | `getApiErrorMessage(error, fallback)` — extrae mensaje real de error Axios |
| `src/api/roles.api.ts` | `list()` maneja null / paginado / array simple |
| `src/api/permissions.api.ts` | `groupedByModule()` devuelve `[]` cuando no es array |
| `src/pages/config/RolesPage.tsx` | Guards `Array.isArray` en render, `openPerms`, EmptyState condition |
| `src/pages/config/ConfigPage.tsx` | `onSubmit` coerce número, convierte vacíos a undefined; error display usa `getApiErrorMessage` |
| `src/pages/receipts/CobroPage.tsx` | Payload usa `toNum()`; envía `amount` y `total`; error display usa `getApiErrorMessage` |
| `src/pages/visitors/VisitorsPage.tsx` | Multiplicación tarifa usa `toNum()` |
| `src/pages/lodging/LodgingPage.tsx` | Multiplicación tarifa usa `toNum()` |
| `src/router.tsx` | Import `ErrorPage`; `errorElement` en ambos grupos de rutas |
| `tsconfig.app.json` | `"ignoreDeprecations": "6.0"` para silenciar warning de `baseUrl` en TS 7.0 |

### Resultado final

```
npm run build → ✓ built in 798ms — 0 errores TS — 301 módulos
```

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
9. **Para mostrar errores de API**: usar `getApiErrorMessage(mutation.error, 'fallback')` importado de `@/api/client`.
10. **Para conversión segura de números**: usar `toNum(value)` importado de `@/utils/formatters` — maneja strings, null y undefined.

---

## Variables de entorno requeridas

```env
VITE_API_URL=http://<IP_DEL_SERVIDOR>:3000/api
```

Configurar en `.env` (local) o `.env.production` (producción Docker).
