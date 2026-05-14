# ParqueRM Frontend — Estado del Proyecto

**Última actualización:** Sprint 10 — Mejoras post-QA + verificación final (2026-05-14)

---

## Estado actual

`npm run build` → **✓ Compila exitosamente** (503 módulos, 0 errores TS, ~764ms)
`backend build` → **✓ Compila exitosamente** (nest build, 0 errores TS)
Docker: backend **Up** · frontend **Up** · sqlserver **Up**
E2E: 10/10 pasos verificados — login, visitor, cobro, recibo, movimiento automático, reportes, cancel, audit

---

## Sprint 10 — Mejoras post-demo (2026-05-14)

### Cambios en el frontend

**`src/utils/pdf.ts`** *(nuevo)*
- `downloadReceiptPdf(receipt)` — genera PDF de recibo con jsPDF (lazy import): encabezado con nombre del parque, líneas de cobro, total, cambio
- `downloadReportPdf(opts)` — genera PDF del tab activo en Reportes (General, Visitantes, Ingresos)

**`src/pages/receipts/CobroPage.tsx`**
- Agrega botón "Descargar PDF" en la vista de éxito post-cobro (llama `downloadReceiptPdf`)
- Elimina nota obsoleta que decía que los recibos no generan movimientos en Caja (ya no es cierto tras Phase 1)

**`src/pages/reports/ReportsPage.tsx`**
- Reemplaza función `handleExportPdf` (solo mostraba toast de error) por generación real de PDF via `downloadReportPdf`
- Reemplaza export CSV de `handleExportExcel` por export `.xlsx` nativo via SheetJS (lazy import)
- Elimina funciones `buildCsv` y `downloadCsv` ya no necesarias
- Columnas Excel en español con nombres legibles (en lugar de keys del objeto)

**Dependencias nuevas**
- `jspdf` — PDF client-side, lazy-loaded (~399 kB, solo al hacer clic)
- `xlsx` (SheetJS) — Excel client-side, lazy-loaded (~425 kB, solo al hacer clic)

### Cambios en el backend (`parqueRM-backend`)

**`src/receipts/receipts.module.ts`**
- Agrega `FinancialConcept`, `FinancialMovement` a `TypeOrmModule.forFeature`
- Agrega `CashModule` a imports

**`src/receipts/receipts.service.ts`**
- Inyecta `CashService`, `FinancialConcept`, `FinancialMovement`
- `autoCreateMovement()`: al crear un recibo crea automáticamente un movimiento INGRESO en Caja (concept resuelto por `originType`, dedup guard, soft fail con audit)
- `autoCancelMovement()`: al anular un recibo cancela el movimiento si no está en cierre cerrado; si está cerrado registra `RECEIPT_CANCELLED_MOVEMENT_LOCKED` en auditoría

### Cambios en infraestructura (`parqueRM-root`)

**`db/init/07_seed_demo_data.sql`** *(nuevo)*
- Script idempotente de datos demo: 3 visitantes, 2 vehículos, 2 hospedajes, 4 recibos con sus movimientos de caja, 1 movimiento EGRESO manual
- TKT-DEMO-001 no tiene recibo (para que el presentador demuestre el flujo de cobro en vivo)

**`docker-compose.yml`**
- Agrega `07_seed_demo_data.sql` al chain de `db-init`

### Bug fix incluido en Sprint 10

**`src/reports/reports.service.ts`** — fix de filtrado de fechas en reportes de Caja
- El filtro `m.movementDate <= :to` con valor `'2026-05-14'` en SQL Server se interpreta como `00:00:00`, excluyendo todos los movimientos del mismo día
- Fix: `CAST(m.movementDate AS DATE) <= :to` — aplicado en `getGeneral`, `getIncome`, `getExpenses`
- Impacto: el tab Ingresos en Reportes ahora muestra los movimientos del día correctamente

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

- **Auth**: Login con JWT, redirect automático, refresh token transparente
- **Dashboard**: 4 tarjetas de resumen + ocupación + últimos movimientos
- **Visitantes**: Form completo SIGAP (categoría, geografía cascade, razones/actividades chips, tarifa auto-resolve, edición)
- **Vehículos**: Registro con tarifa auto-resolve, checkout, habilitar salida, edición
- **Hospedaje**: Registro con tipos y tarifa, edición
- **Recibos**: Lista con filtros, cancel/print, EmptyState
- **Cobro**: Form completo con líneas dinámicas, calculadora de cambio, pre-relleno desde origen
- **Caja**: Movimientos con create/cancel, filtros, resumen del día, EmptyState
- **Cierres**: Preview en tiempo real + historial + modal detalles, EmptyState
- **Reportes**: 3 tabs (general, visitantes, ingresos) + export CSV client-side
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
2. **Export PDF real** — el backend devuelve JSON, no binario; el botón muestra toast explicativo
3. **Export XLSX nativo** — implementado como CSV client-side (funcional pero no .xlsx real)
4. **Auto-resolve de tarifa al cambiar tipo en modo edición** — deshabilitado intencionalmente; el usuario debe ajustar la tarifa manualmente si cambia el tipo durante edición
5. **Paginación en catálogos** — actualmente carga todos los elementos sin paginar

---

## Sprint 9 — QA Final y Demo Readiness Review (2026-05-14)

### Revisión realizada

#### Sistema Docker
- **Estado:** Todos los contenedores Up (backend, frontend, sqlserver)
- **URLs:** Frontend en `http://localhost:8080`, Backend en `http://localhost:3000/api`
- **API Health:** `GET /api/health` responde `{"status":"ok"}`

#### Build local
- **Estado anterior:** Fallaba por `node_modules` incompleto (faltaban axios, zustand, react-router-dom)
- **Causa:** Paquetes no instalados localmente (el Docker build sí los instala)
- **Fix:** `npm install` restauró los paquetes faltantes
- **Estado actual:** `npm run build` → ✓ 301 módulos, 0 errores TS

#### Endpoints API verificados
| Endpoint | Estado | Datos |
|----------|--------|-------|
| `GET /api/health` | ✅ ok | `{"status":"ok"}` |
| `POST /api/auth/login` | ✅ ok | admin / Admin2026! → 29 permisos |
| `GET /api/dashboard/summary` | ✅ ok | hoy=0, semana=0 |
| `GET /api/park-config` | ✅ ok | El Refugio del Quetzal |
| `GET /api/visitors` | ✅ ok | total: 0 |
| `GET /api/vehicles` | ✅ ok | total: 1 |
| `GET /api/receipts` | ✅ ok | total: 0 |
| `GET /api/cash/movements` | ✅ ok | total: 0 |
| `GET /api/reports/general` | ✅ ok | estadísticas correctas |
| `GET /api/audit-logs` | ✅ ok | total: 39 |
| `GET /api/dashboard/occupancy` | ✅ ok | 0/150 personas (0%) |

### Bugs encontrados y fixes aplicados

| Bug | Causa raíz | Fix aplicado |
|-----|-----------|--------------|
| `06_seed_park_config.sql` nunca se ejecutaba | Faltaba en la lista de comandos del `db-init` en `docker-compose.yml` | Agregado al final de la cadena de comandos |
| `park_config` tabla vacía en DB en ejecución | Bug anterior + DB ya existente | INSERT manual de la fila inicial vía SQLCMD |
| `node_modules` incompleto localmente | Paquetes no instalados (axios, zustand, react-router-dom, etc.) | `npm install` restauró 35 paquetes |
| Contraseña del admin desconocida | Hash bcrypt en seed sin documentar la contraseña plana | Restablecida a `Admin2026!` vía UPDATE en DB |

### Archivos cambiados en Sprint 9

| Archivo | Cambio |
|---------|--------|
| `parqueRM-root/docker-compose.yml` | Agregado `06_seed_park_config.sql` al comando `db-init` |
| `parqueRM-root/DEMO_CHECKLIST.md` | Creado — guía completa para demo |
| `parqueRM-frontend/PROGRESS.md` | Actualizado — este archivo |

### Pendiente de backend (fuera de alcance sin autorización)

- Integración automática Receipt → FinancialMovement (requiere `ReceiptsService` crear el movimiento al emitir)
- Export binario PDF/Excel real (requiere librería como `exceljs` o `pdfmake` en el backend)
- Usar `ADMIN_BOOTSTRAP` en lugar de hash hardcodeado en SQL seed

### Resultado final Sprint 9

```
npm run build → ✓ built in 868ms — 0 errores TS — 301 módulos
docker compose ps → backend Up, frontend Up, sqlserver Up
Admin login → ✓ admin / Admin2026! (29 permisos, rol Administrador)
park_config → ✓ El Refugio del Quetzal, PRM-SM-001, capacidad 150
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

*(ver historial anterior — sin cambios desde Sprint 6)*

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
En desarrollo local: `http://localhost:3000/api`
En despliegue LAN: `http://192.168.1.10:3000/api` (ajustar a IP real del servidor)
