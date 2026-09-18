---

description: "Task list template for feature implementation"
---

# Tasks: Ejemplo de Referencia CRUD (Items)

**Input**: Design documents from `/specs/001-datasource-example/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/item-service.md, quickstart.md

**Tests**: No se incluyen tareas de test automatizado — el template no tiene framework de testing configurado (`research.md` §5); la validación es manual vía `quickstart.md`.

**Organization**: Tareas agrupadas por user story (spec.md) para permitir implementación y prueba independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: User story a la que pertenece la tarea (US1, US2, US3, US4)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Proyecto único (frontend-only Code App): `src/` en la raíz del repositorio, según `plan.md` (no hay `backend/` ni `tests/`).

---

## Phase 1: Setup

**Purpose**: Preparar dependencias y la fuente de datos antes de escribir código custom

- [X] T001 Verificar dependencias instaladas del proyecto corriendo `npm install` en la raíz del repositorio (`package.json`)
- [X] T002 ⚠️ **STUB, no la tarea real** — Este entorno de desarrollo no tiene `pac` CLI ni un environment de Power Platform conectado (sin `power.config.json`), así que no se pudo correr `pac code add-data-source` / `pac code generate` de verdad. Con aprobación explícita del usuario, se creó a mano `src/generated/models/ItemsModel.ts` + `src/generated/services/ItemsService.ts` que imitan la forma esperada de esa salida (comentados como STUB). **Pendiente real**: correr `pac code add-data-source -a dataverse -t Items` + `pac code generate` contra un environment con la tabla `Items` creada, y reemplazar `src/generated/` por la salida real (ver quickstart.md)

**Checkpoint**: `src/generated/` contiene un stand-in tipado para `Items` que permite compilar el resto del código; ningún archivo de `src/generated/` se edita a mano una vez reemplazado por la generación real (principio 2.2 de la constitution)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Entidad tipada y contratos de formulario compartidos por todas las user stories

**⚠️ CRITICAL**: Ninguna user story puede empezar hasta completar esta fase

- [X] T003 Crear la entidad `Item` en `src/entities/Item.ts`: campos `id: string`, `title: string`, `description: string | null`, `status: "Pendiente" | "En Progreso" | "Completado"`, `assignedTo: string | null`, `dueDate: Date | null`, `active: boolean`; constructor `new Item(raw: any)` que mapea el registro crudo del SDK generado (parseando `DueDate` a `Date | null` y el choice numérico de Dataverse al union type de `status`); método `toRecord()` que retorna el shape esperado por el SDK generado para create/update, incluyendo la conversión inversa de `status` (`data-model.md`)
- [X] T004 Re-exportar `Item` desde `src/entities/index.ts`
- [X] T005 [P] Crear `src/pages/items/types.ts` con `interface IForm { title: string; description: string; status: "Pendiente" | "En Progreso" | "Completado" | ""; assignedTo: string; dueDate: Date | null }` y `interface IFormErrors { title: string; status: string }` (`contracts/item-service.md`)
- [X] T006 Crear `src/pages/items/helpers.ts` con `validateForm(formData: IForm): [IFormErrors, boolean]` que aplica las reglas de `data-model.md` ("`title`: requerido, no vacío después de `trim()`"; "`status`: requerido, debe ser uno de los tres valores del union type"; `""` es inválido para `status` según `contracts/item-service.md`) y `emptyErrors(): IFormErrors` que retorna `{ title: "", status: "" }` (depende de T005)

**Checkpoint**: Entidad y contratos de formulario listos — las user stories pueden empezar

---

## Phase 3: User Story 1 - Ver el listado de Items (Priority: P1) 🎯 MVP

**Goal**: Un usuario abre `/items` y ve una tabla ordenable con los Items activos, o un mensaje claro si no hay ninguno

**Independent Test**: Con Items ya existentes en Dataverse (creados directamente ahí), abrir `/items` y confirmar que los Items activos aparecen con Title, Status, AssignedTo y DueDate correctos, sin depender del formulario de creación/edición

### Implementation for User Story 1

- [X] T007 [US1] Implementar `ItemService.listActive(): Promise<Item[]>` en `src/services/ItemService.ts`: retorna solo Items con `active === true`, ordenados por Title asc (`contracts/item-service.md`)
- [X] T008 [US1] Implementar el hook `useItems(options?: { includeInactive?: boolean })` en `src/hooks/useItems.ts` con `useQuery`, `queryKey: ["items", { includeInactive }]`, llamando a `ItemService.listActive()` cuando `includeInactive` es `false`/`undefined` (principio 2.4 — nunca duplicar server state en `useState`)
- [X] T009 [US1] Crear la página `src/pages/items/ItemList.tsx`: tabla con Tanstack Table (columnas Title, Status, AssignedTo, DueDate) ordenables por encabezado (FR-001); celdas `AssignedTo`/`DueDate` vacías muestran "sin asignar"/"sin fecha" en vez de error (edge cases de `spec.md`); mensaje claro cuando no hay Items para mostrar (FR-004)
- [X] T010 [US1] Agregar la ruta `/items` en `src/router.tsx` que renderiza `ItemList` dentro del `Layout` existente

**Checkpoint**: User Story 1 completamente funcional y comprobable de forma independiente (listado, orden, mensaje vacío)

---

## Phase 4: User Story 2 - Crear un Item nuevo (Priority: P2)

**Goal**: Un usuario completa un formulario y crea un Item nuevo con Title y Status obligatorios

**Independent Test**: Llenar el formulario de creación y verificar en la fuente de datos que el registro nuevo existe con los valores correctos, sin necesitar edición ni soft delete implementados

### Implementation for User Story 2

- [X] T011 [US2] Implementar `ItemService.create(input: IForm): Promise<Item>` en `src/services/ItemService.ts`: `input` no incluye `id` ni `active`; `active` se fija en `true` en el service antes de llamar al SDK generado (`contracts/item-service.md`)
- [X] T012 [US2] Implementar el hook `useCreateItem()` (`useMutation`) en `src/hooks/useItems.ts`: `onSuccess` llama `queryClient.invalidateQueries({ queryKey: ["items"] })` y muestra el toast de éxito **dentro** de `onSuccess` (principio 6 de la constitution — nunca en `finally`)
- [X] T013 [US2] Crear la página `src/pages/items/ItemForm.tsx` en modo creación: `formData` con `useState<IForm>`, errores con `useState<IFormErrors>` (inicializado con `emptyErrors()`), campos Title, Description, Status (`select`, tres opciones), AssignedTo, DueDate (`calendar` + `popover`); `handleFieldChange(fieldName, value)` limpia el error del campo al escribir; guardado vía `validateForm` + `useCreateItem` de T012; si falla el guardado, los datos ingresados permanecen visibles para reintentar (FR-014); retroalimentación de éxito/error visible (FR-013)
- [X] T014 [US2] Agregar la ruta `/items/new` en `src/router.tsx` que renderiza `ItemForm` en modo creación

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Editar un Item existente (Priority: P3)

**Goal**: Un usuario abre un Item existente, modifica campos y guarda los cambios

**Independent Test**: Abrir el formulario de edición de un Item existente, confirmar que los campos aparecen prellenados, modificar un campo, guardar, y confirmar en la fuente de datos que el cambio se persistió

### Implementation for User Story 3

- [X] T015 [US3] Implementar `ItemService.getById(id: string): Promise<Item>` en `src/services/ItemService.ts`: lanza error si el Item no existe (`contracts/item-service.md`)
- [X] T016 [US3] Implementar `ItemService.update(id: string, input: IForm): Promise<Item>` en `src/services/ItemService.ts`: actualiza `title`/`description`/`status`/`assignedTo`/`dueDate`; nunca modifica `active` (`contracts/item-service.md`)
- [X] T017 [US3] Implementar `useItem(id: string)` (`useQuery`, `queryKey: ["items", id]`) y `useUpdateItem()` (`useMutation`) en `src/hooks/useItems.ts`: `onSuccess` de `useUpdateItem` invalida `["items"]` y `["items", id]` y muestra el toast de éxito dentro de `onSuccess`
- [X] T018 [US3] Extender `src/pages/items/ItemForm.tsx` para soportar modo edición: lee el parámetro de ruta `:id`, prellena `formData` con `useItem(id)`, usa `useUpdateItem` en vez de `useCreateItem` cuando está en modo edición; si el usuario borra Title y guarda, `validateForm` rechaza el guardado con error visible (US3 escenario 3)
- [X] T019 [US3] Agregar la ruta `/items/:id/edit` en `src/router.tsx` que renderiza `ItemForm` en modo edición

**Checkpoint**: User Stories 1, 2 y 3 funcionan de forma independiente

---

## Phase 6: User Story 4 - Marcar un Item como inactivo (soft delete) (Priority: P4)

**Goal**: Un usuario desactiva un Item desde el listado sin borrarlo físicamente de la fuente de datos

**Independent Test**: Con un Item activo existente, ejecutar la acción de desactivar, confirmar que desaparece del listado por defecto, y verificar directamente en la fuente de datos que el registro sigue existiendo con su flag de actividad en falso

### Implementation for User Story 4

- [X] T020 [US4] Implementar `ItemService.deactivate(id: string): Promise<void>` en `src/services/ItemService.ts`: único punto de la app que cambia `active` a `false` mediante una operación de `update`; nunca llama a una operación de borrado físico del SDK generado (FR-011)
- [X] T021 [US4] Implementar `ItemService.listAll(): Promise<Item[]>` en `src/services/ItemService.ts`: retorna todos los Items (activos e inactivos) para el toggle "ver inactivos" (FR-003)
- [X] T022 [US4] Actualizar `useItems` en `src/hooks/useItems.ts` para llamar `ItemService.listAll()` cuando `includeInactive` es `true` (en vez de `listActive()`), e implementar `useDeactivateItem()` (`useMutation`) con `onSuccess` que invalida `["items"]` y muestra el toast de éxito dentro de `onSuccess`
- [X] T023 [US4] Agregar a `src/pages/items/ItemList.tsx` un toggle "ver inactivos" que usa `useItems({ includeInactive: true })`, mostrando los Items inactivos visualmente distinguibles de los activos (FR-003)
- [X] T024 [US4] Agregar a `src/pages/items/ItemList.tsx` la acción de desactivar: botón visible solo sobre Items activos (oculto para Items ya inactivos, edge case de `spec.md`), confirmación mediante `Dialog` de shadcn/ui con botones "Confirmar"/"Cancelar" (FR-012 — cancelar no cambia el estado del Item), y ejecución de `useDeactivateItem` de T022 al confirmar

**Checkpoint**: Las 4 user stories funcionan de forma independiente — patrón CRUD completo

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validación final del ejemplo de referencia completo

- [ ] T025 [P] **Pendiente — requiere environment real.** Ejecutar manualmente los 4 escenarios de validación de `quickstart.md` (listado, crear, editar, soft delete) contra un environment real con la tabla `Items`. No se pudo ejecutar en este entorno de desarrollo (sin `pac`/Power Platform/navegador interactivo disponibles); `npm run build`, `tsc -b` y `eslint` pasan, y las rutas `/items`, `/items/new`, `/items/:id/edit` responden 200 en `npm run dev`, pero no hay verificación end-to-end contra Dataverse real
- [X] T026 [P] Revisar todos los archivos tocados contra la tabla de Constitution Check de `plan.md` (sin server state en `useState`/Context, éxito solo dentro de `onSuccess`, `src/generated/` no editado a mano, nombres de dominio en español / patrones técnicos en inglés) — ver nota en T002 sobre la única desviación conocida (stub de `src/generated/`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: Depende de Setup — BLOQUEA todas las user stories
- **User Stories (Phase 3-6)**: Todas dependen de Foundational
  - US1 (P1) no depende de otras stories
  - US2 (P2) no depende de US1, pero reutiliza `ItemForm.tsx` que US3 extiende después
  - US3 (P3) depende de que `ItemForm.tsx` exista (creado en US2, T013) para extenderlo en modo edición
  - US4 (P4) no depende de US2/US3 en su lógica de service/hooks, pero agrega controles a `ItemList.tsx` creado en US1 (T009)
- **Polish (Phase 7)**: Depende de que las user stories deseadas estén completas

### Dentro de cada User Story

- Service (`ItemService.ts`) antes de hooks (`useItems.ts`)
- Hooks antes de páginas (`ItemList.tsx` / `ItemForm.tsx`)
- Páginas antes de rutas (`router.tsx`)

### Parallel Opportunities

- T005 (`types.ts`) puede ejecutarse en paralelo con T003/T004 (`Item.ts` / `index.ts`) — archivos distintos, sin dependencia
- T025 y T026 (Polish) pueden ejecutarse en paralelo entre sí
- Las tareas dentro de una misma user story que tocan `ItemService.ts`, `useItems.ts`, `ItemList.tsx` o `ItemForm.tsx` son secuenciales (mismo archivo) y no se marcan `[P]`

---

## Parallel Example: Foundational Phase

```bash
# T003 y T005 pueden lanzarse juntos (archivos distintos, sin dependencia cruzada):
Task: "Crear la entidad Item en src/entities/Item.ts"
Task: "Crear src/pages/items/types.ts con IForm/IFormErrors"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las stories)
3. Completar Phase 3: User Story 1
4. **DETENER y VALIDAR**: probar el listado de forma independiente contra Dataverse
5. Demo si está listo

### Incremental Delivery

1. Setup + Foundational → base lista
2. Agregar US1 (listado) → validar → MVP
3. Agregar US2 (crear) → validar
4. Agregar US3 (editar) → validar
5. Agregar US4 (soft delete) → validar → patrón CRUD completo de referencia

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes
- `[Story]` mapea cada tarea a su user story para trazabilidad
- No hay tareas de test automatizado — el template no tiene framework configurado; la validación es manual vía `quickstart.md` (T025)
- Este feature es un artefacto de referencia: una vez implementado, el código permanece como documentación viva (principio 9.5 de la constitution) — no se borra al terminar
