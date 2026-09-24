---

description: "Task list template for feature implementation"
---

# Tasks: Adjuntos por Item y People Picker (Patrones de Referencia)

**Input**: Design documents from `/specs/002-attachments-people-picker/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/attachments.md, contracts/people-picker.md, quickstart.md

**Tests**: No se incluyen tareas de test automatizado — el template no tiene framework de testing configurado (`research.md` §9); la validación es manual vía `quickstart.md`.

**Organization**: Tareas agrupadas por user story (spec.md) para permitir implementación y prueba independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: User story a la que pertenece la tarea (US1–US6)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Proyecto único (frontend-only Code App): `src/` en la raíz del repositorio, según `plan.md` (no hay `backend/` ni `tests/`).

---

## Phase 1: Setup

**Purpose**: Preparar los stand-ins de la capa generada antes de escribir código custom

- [X] T001 Verificar dependencias instaladas del proyecto corriendo `npm install` en la raíz del repositorio (`package.json`) — sin dependencias nuevas respecto de 001 (`research.md` §7)
- [X] T002 ⚠️ **STUB, no la tarea real** — Actualizar `src/generated/models/ItemsModel.ts` y `src/generated/services/ItemsService.ts` para reflejar que, en este patrón ampliado, `Items` es una **lista de SharePoint** en vez de una tabla de Dataverse: `dataSourceType: "sharepoint"`, `tableId` reemplazado por el GUID de la lista, y el `id` del registro mapeado desde el `Id` numérico nativo de SharePoint (convertido a `string`, `research.md` §1). Mantener el mismo comentario "STUB GENERADO A MANO — NO es la salida real de `pac code generate`" que ya usa el archivo. **Pendiente real**: correr `pac code add-data-source -a sharepoint -t Items` + `pac code generate` contra un environment con la lista `Items` creada (ver `quickstart.md`)
- [X] T003 [P] ⚠️ **STUB, no la tarea real** — Crear `src/generated/models/Office365UserModel.ts` y `src/generated/services/Office365UsersService.ts` con el mismo disclaimer "STUB GENERADO A MANO" que `ItemsService.ts`, exponiendo `searchUserV2(query: string): Promise<Office365UserModel[]>` con la forma mínima que produce ese conector (`DisplayName`, `Mail`, `UserPrincipalName`). **Pendiente real**: correr `pac code add-data-source -a shared_office365users` + `pac code generate` contra un environment con el conector Office 365 Users disponible (`research.md` §5, ver `quickstart.md`)

**Checkpoint**: `src/generated/` contiene stand-ins tipados para la lista `Items` (SharePoint) y el conector Office 365 Users que permiten compilar el resto del código; ningún archivo de `src/generated/` se edita a mano una vez reemplazado por la generación real (principio 2.2 de la constitution)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tipos y entidades compartidos por los dos patrones (adjuntos y people picker) y por las seis user stories

**⚠️ CRITICAL**: Ninguna user story puede empezar hasta completar esta fase

- [X] T004 Crear `src/entities/AssignedPerson.ts`: `interface AssignedPerson { displayName: string; email: string; claims: string }` (`claims` con formato `i:0#.f|membership|<userPrincipalName en minúsculas>`, `data-model.md`); helper `getInitials(displayName: string): string` para el avatar del chip; helper `dedupKey(person: AssignedPerson): string` que retorna `(person.claims || person.email).toLowerCase()`, usado para deduplicar en modo `multiple` (FR-017)
- [X] T005 [P] Crear `src/entities/Attachment.ts`: `interface Attachment { name: string; url: string }` y `interface AttachmentFormState extends Attachment { internalId: number; status: "existing" | "new" | "deleted"; file?: File }` — `internalId` se genera como `Math.max(0, ...existingIds) + 1`, **nunca** índice posicional (principio 4.3 de la constitution, `data-model.md`)
- [X] T006 Modificar `src/entities/Item.ts`: cambiar `assignedTo: string | null` por `assignedTo: AssignedPerson | null` (parseado/serializado como JSON contra la columna de texto multilínea `AssignedTo`, con manejo defensivo si el campo está vacío o el JSON es inválido → `null`); agregar `collaborators: AssignedPerson[]` (default `[]`, misma serialización JSON contra la columna `Collaborators`); actualizar `Item.create(fields)` para aceptar `assignedTo: AssignedPerson | null` y `collaborators: AssignedPerson[]`; actualizar `toRecord()` para serializar ambos campos de vuelta a JSON string (`data-model.md`)
- [X] T007 [P] Re-exportar `AssignedPerson` y `Attachment`/`AttachmentFormState` desde `src/entities/index.ts` (depende de T004, T005)
- [X] T008 [P] Crear `src/lib/files.ts` con `fileToBase64(file: File): Promise<string>`, implementado con `FileReader.readAsDataURL` recortando el prefijo `data:...;base64,` antes de devolver el string (`research.md` §3)
- [X] T009 Actualizar `src/pages/items/types.ts`: `IForm.assignedTo: AssignedPerson | null` (antes `string`), agregar `collaborators: AssignedPerson[]` y `attachments: AttachmentFormState[]` (`contracts/people-picker.md`, `contracts/attachments.md`) — depende de T004–T007

**Checkpoint**: Entidades y contratos de formulario listos — las seis user stories pueden empezar

---

## Phase 3: User Story 1 - Ver los adjuntos existentes de un Item (Priority: P1) 🎯 MVP (patrón adjuntos)

**Goal**: Al abrir el formulario de edición de un Item, ver sus adjuntos existentes listados por nombre, o un mensaje claro si no tiene ninguno

**Independent Test**: Con un Item que ya tiene adjuntos cargados directamente en SharePoint, abrir su formulario de edición y confirmar que aparecen listados con su nombre y se pueden abrir/descargar, sin necesitar que agregar o eliminar adjuntos esté implementado

### Implementation for User Story 1

- [X] T010 [US1] Implementar `registerAttachmentOperations(listId: string): DataSourcesInfo` y `listAttachments(itemId: string): Promise<Attachment[]>` en `src/services/AttachmentService.ts`: registra a mano la operación `GetAttachments` (GET, path `_api/web/lists(guid'{listId}')/items({itemId})/AttachmentFiles`) en un `dataSourcesInfo` propio del servicio (no en `src/generated/`, principio 2.2); invoca vía `client.executeAsync({ connectorOperation: { tableName: "Items", operationName: "GetAttachments", parameters } })`; mapea cada resultado `{FileName, ServerRelativeUrl}` a `{name, url}` (`contracts/attachments.md`, `research.md` §2)
- [X] T011 [US1] Implementar el hook `useAttachments(itemId: string)` en `src/hooks/useAttachments.ts` con `useQuery`, `queryKey: ["items", itemId, "attachments"]`, `enabled: !!itemId` (no dispara en modo creación), `queryFn: () => AttachmentService.listAttachments(itemId)` (`contracts/attachments.md`)
- [X] T012 [US1] Crear `src/components/FilesComponent.tsx`: componente genérico y controlado (`value: AttachmentFormState[]`, `onChange`, `disabled?: boolean`, principio 4.4 — sin conocer la entidad `Item`); en esta historia solo renderiza entradas con `status: "existing"` (nombre + link a `url`) y un mensaje claro de "sin adjuntos" cuando `value` está vacío (FR-001, FR-002, FR-003). *Nota: se implementó junto con T015/T019 en el mismo componente (una sola pasada, ver esas tareas) en vez de tres ediciones separadas, para no dejar estados intermedios con `onChange`/`disabled` sin usar.*
- [X] T013 [US1] Integrar `FilesComponent` en el modo edición de `src/pages/items/ItemForm.tsx`: al llegar `existingItem` (mismo patrón de reset síncrono con `prevItemIdRef` ya usado para el resto del formulario, principio 6), sembrar `formData.attachments` a partir de `useAttachments(id)` convirtiendo cada `Attachment` en `{ ...attachment, internalId, status: "existing" }`

**Checkpoint**: User Story 1 completamente funcional y comprobable de forma independiente (ver adjuntos existentes)

---

## Phase 4: User Story 2 - Agregar adjuntos nuevos a un Item (Priority: P2)

**Goal**: Seleccionar uno o más archivos nuevos en el formulario y que queden adjuntos al Item recién al guardar

**Independent Test**: Seleccionar uno o más archivos nuevos en el formulario, guardar, y verificar que existen como adjuntos del Item en SharePoint con el nombre correcto, sin necesitar que la eliminación de adjuntos esté implementada

### Implementation for User Story 2

- [X] T014 [US2] Implementar `uploadAttachment(itemId: string, file: File): Promise<Attachment>` en `src/services/AttachmentService.ts`: convierte `file` con `fileToBase64` (T008), registra/invoca la operación `AddAttachment` (POST, path `_api/web/lists(guid'{listId}')/items({itemId})/AttachmentFiles/add(FileName='{fileName}')`) con el base64 en el body, retorna el `Attachment` resultante (`contracts/attachments.md`, `research.md` §2) — depende de T010, T008
- [X] T015 [US2] Extender `src/components/FilesComponent.tsx`: agregar un input de archivo (múltiple) que agrega entradas `status: "new"` con `internalId = Math.max(0, ...value.map(a => a.internalId)) + 1` (`nextAttachmentInternalId`, nunca índice posicional, principio 4.3) y `file` seteado; permitir quitar una entrada `status: "new"` antes de guardar filtrándola del array (nunca llegó a existir en SharePoint, FR-006)
- [X] T016 [US2] Extender `useCreateItem()` y `useUpdateItem()` en `src/hooks/useItems.ts` para aceptar `attachments: AttachmentFormState[]` junto al `input`: después de crear/actualizar el Item exitosamente, ejecutar `AttachmentService.uploadAttachment` para cada entrada con `status: "new"`; `onSuccess` invalida `["items"]`, `["items", id]` e `["items", id, "attachments"]` y muestra el toast de éxito solo después de que todas las subidas terminan (principio 6 — éxito solo dentro de `onSuccess`) — depende de T014
- [X] T017 [US2] Actualizar el `handleSubmit` de `src/pages/items/ItemForm.tsx` para pasar `formData.attachments` a `useCreateItem`/`useUpdateItem` (T016); si el guardado falla, `formData.attachments` permanece intacto en el formulario para reintentar sin volver a seleccionar los archivos (FR-008, mismo patrón que FR-014 de 001)

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente (ver y agregar adjuntos)

---

## Phase 5: User Story 3 - Eliminar un adjunto existente (Priority: P3)

**Goal**: Marcar uno o más adjuntos existentes para eliminación, y que la eliminación se concrete al guardar

**Independent Test**: Con un Item que ya tiene un adjunto existente, marcarlo para eliminar, guardar, y confirmar en SharePoint que el adjunto ya no está asociado al Item

### Implementation for User Story 3

- [X] T018 [US3] Implementar `deleteAttachment(itemId: string, fileName: string): Promise<void>` en `src/services/AttachmentService.ts`: registra/invoca la operación `DeleteAttachment` (DELETE, path `_api/web/lists(guid'{listId}')/items({itemId})/AttachmentFiles('{fileName}')`); si el adjunto ya no existe (error 404), se trata como éxito idempotente en vez de error (edge case de `spec.md`) — depende de T010
- [X] T019 [US3] Extender `src/components/FilesComponent.tsx`: permitir marcar una entrada `status: "existing"` como `status: "deleted"` (se muestra tachada, con botón "Deshacer" que la vuelve a `"existing"`) **sin** quitarla del array hasta que se guarde (principio 4.3 — el borrado se marca, no se filtra, FR-005, FR-006)
- [X] T020 [US3] Extender `useUpdateItem()` en `src/hooks/useItems.ts` para, como parte de la misma mutation de guardado, ejecutar `AttachmentService.deleteAttachment` para cada entrada de `attachments` con `status: "deleted"` (además de las `status: "new"` de T016) antes de invalidar queries y mostrar el toast de éxito — depende de T018, T016

**Checkpoint**: User Stories 1, 2 y 3 funcionan de forma independiente — patrón de adjuntos completo

---

## Phase 6: User Story 4 - Buscar y asignar una persona real como responsable (Priority: P1) 🎯 MVP (patrón people picker)

**Goal**: Escribir parte del nombre de una persona en el campo AssignedTo y seleccionarla de resultados de búsqueda en vivo, en vez de texto libre

**Independent Test**: Escribir al menos 3 caracteres del nombre de una persona existente en el directorio, verificar que aparecen resultados coincidentes, seleccionar uno, y confirmar que el Item guardado tiene esa persona asociada

### Implementation for User Story 4

- [X] T021 [US4] Implementar `searchUsers(query: string): Promise<AssignedPerson[]>` en `src/services/PeopleService.ts`: llama a `office365UsersService.searchUserV2(query)` (T003); mapea cada resultado a `AssignedPerson` construyendo `claims = \`i:0#.f|membership|${userPrincipalName.toLowerCase()}\`` (`data-model.md`); filtra del resultado a las personas sin `userPrincipalName` resoluble (edge case de `spec.md`, `contracts/people-picker.md`) — depende de T003, T004
- [X] T022 [US4] Implementar el hook `usePeopleSearch(query: string)` en `src/hooks/usePeopleSearch.ts`: debounce de 250ms sobre `query` con `useEffect` + `setTimeout` (uso legítimo de `useEffect` para sincronizar un efecto externo con `cleanup` vía `clearTimeout` — no es el patrón de "reset" que el principio 6 desaconseja, ver `research.md` §6); **no** ejecuta ninguna búsqueda si el valor debounced tiene menos de 3 caracteres (FR-011); mantiene un `requestIdRef` que se incrementa por cada búsqueda disparada y descarta cualquier respuesta cuyo id ya no sea el más reciente (FR-013); retorna `{ results: AssignedPerson[]; isSearching: boolean; error: Error | null }` (`contracts/people-picker.md`, `research.md` §6) — depende de T021
- [X] T023 [US4] Crear `src/components/PeoplePicker.tsx` con soporte inicial para `mode="single"`: `interface PeoplePickerProps { mode: "single" | "multiple"; value: AssignedPerson | AssignedPerson[] | null; onChange: (next: AssignedPerson | AssignedPerson[] | null) => void; disabled?: boolean }`; input de texto alimentando `usePeopleSearch` (T022), resultados en un `Popover` + `Command` (`cmdk`, ya instalado); en modo `single`, seleccionar una persona reemplaza `value` y limpia el input (FR-018); mensaje claro de "sin resultados" cuando la búsqueda válida (≥3 caracteres) no encuentra coincidencias, y mensaje de error cuando `usePeopleSearch` reporta `error` (FR-020); persona seleccionada se muestra como chip con iniciales (`getInitials`, T004) y botón "×" (FR-014, FR-015) — depende de T004, T022. *Nota: se implementó en la misma pasada junto con T026/T028 (soporte `multiple` + deduplicación + remoción), ver esas tareas.*
- [X] T024 [US4] Integrar `PeoplePicker` `mode="single"` en `src/pages/items/ItemForm.tsx`, reemplazando el `Input` de texto libre de `assignedTo` (bindeado a `formData.assignedTo: AssignedPerson | null`); actualizar `draftFromForm` en `src/services/ItemService.ts` para pasar `assignedTo: input.assignedTo` a `Item.create(...)` (T006) — depende de T023, T009
- [X] T025 [US4] Actualizar la columna `AssignedTo` de `src/pages/items/ItemList.tsx` para renderizar `row.original.assignedTo?.displayName ?? "sin asignar"` en vez del string plano (rompe con el cambio de tipo de T006)

**Checkpoint**: User Story 4 completamente funcional y comprobable de forma independiente (buscar y asignar una persona, modo single) — no depende de US1–US3

---

## Phase 7: User Story 5 - Asignar varias personas con deduplicación (Priority: P4)

**Goal**: En un campo configurado en modo múltiple, buscar y seleccionar más de una persona sin poder duplicar la misma

**Independent Test**: En un campo en modo múltiple, seleccionar a una persona, buscar y seleccionar a una segunda, verificar que ambas quedan como chips independientes; intentar seleccionar de nuevo a la primera y verificar que no se duplica

### Implementation for User Story 5

- [X] T026 [US5] Extender `src/components/PeoplePicker.tsx` para soportar `mode="multiple"` (`value: AssignedPerson[]`): antes de agregar una selección nueva, comparar `dedupKey(person)` (T004, `claims` o `email` en minúsculas) contra los ya seleccionados; si hay coincidencia, no se agrega (FR-017); el input de búsqueda permanece visible junto a los chips ya seleccionados — depende de T004, T023
- [X] T027 [US5] Integrar `PeoplePicker` `mode="multiple"` en `src/pages/items/ItemForm.tsx` bindeado a `formData.collaborators: AssignedPerson[]` (default `[]`); actualizar `draftFromForm` en `src/services/ItemService.ts` para pasar `collaborators: input.collaborators` a `Item.create(...)` (T006) — depende de T026, T009

**Checkpoint**: User Stories 1–5 funcionan de forma independiente — modo múltiple demostrado end-to-end

---

## Phase 8: User Story 6 - Quitar una persona seleccionada (Priority: P5)

**Goal**: Quitar una persona ya seleccionada (modo single o multiple) antes de guardar

**Independent Test**: Con al menos una persona ya seleccionada, hacer clic en el botón "×" de su chip y verificar que deja de estar seleccionada, sin afectar a otras personas seleccionadas en modo múltiple

### Implementation for User Story 6

- [X] T028 [US6] Implementar el handler de remoción en `src/components/PeoplePicker.tsx` para el botón "×" de cada chip (creado en T023): en modo `single`, `onChange(null)`; en modo `multiple`, `onChange(value.filter(p => dedupKey(p) !== dedupKey(personToRemove)))`, dejando intactas las demás personas seleccionadas (FR-015) — depende de T023, T026

**Checkpoint**: Las seis user stories funcionan de forma independiente — ambos patrones (adjuntos y people picker) completos

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Validación final de los dos patrones ampliados

- [ ] T029 [P] **Pendiente — requiere environment real.** Ejecutar manualmente los 6 escenarios de validación de `quickstart.md` (ver adjuntos, agregar adjuntos, eliminar adjuntos, buscar/asignar persona, multi-selección con deduplicación, quitar persona) contra un environment real con la lista `Items` (SharePoint) y el conector Office 365 Users conectado. No se pudo ejecutar en este entorno de desarrollo (sin `pac`/Power Platform/navegador interactivo disponibles); `npx tsc -b` y `npx eslint .` pasan sobre todos los archivos nuevos/modificados (los 3 errores preexistentes de `eslint` en `badge.tsx`/`button.tsx`/`theme-provider.tsx` son de archivos no tocados por esta feature), pero no hay verificación end-to-end contra SharePoint/Office 365 Users real
- [X] T030 [P] Revisar todos los archivos tocados contra la tabla de Constitution Check de `plan.md` (server state solo en Tanstack Query salvo el estado local controlado de `attachments`/personas dentro del formulario, que es estado de UI legítimo per principio 4.2/4.3; éxito solo dentro de `onSuccess`; `src/generated/` no editado a mano fuera de los STUBs de T002/T003; `InternalId` nunca posicional en `FilesComponent`; nombres de dominio en español / patrones técnicos en inglés — campos como `collaborators`/`assignedTo` siguen en inglés porque reflejan el nombre físico de columna, igual que `title`/`dueDate` en 001) — sin desviaciones nuevas más allá de las ya documentadas en `plan.md` → Complexity Tracking

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: Depende de Setup — BLOQUEA todas las user stories
- **User Stories (Phase 3–8)**: Todas dependen de Foundational
  - US1 (P1, adjuntos) y US4 (P1, people picker) son los dos puntos de entrada de cada patrón — no dependen entre sí y pueden desarrollarse en paralelo (por ejemplo, por dos personas distintas)
  - US2 (P2) depende de US1 (extiende `FilesComponent` y `ItemForm.tsx` creados en US1)
  - US3 (P3) depende de US1 y US2 (extiende el mismo `FilesComponent` y la misma mutation de guardado)
  - US5 (P4) depende de US4 (extiende `PeoplePicker` creado en US4)
  - US6 (P5) depende de US4 y US5 (el botón "×" de modo múltiple necesita que US5 exista)
- **Polish (Phase 9)**: Depende de que las user stories deseadas estén completas

### Dentro de cada User Story

- Service (`AttachmentService.ts` / `PeopleService.ts`) antes de hooks (`useAttachments.ts` / `usePeopleSearch.ts` / cambios en `useItems.ts`)
- Hooks antes de componentes (`FilesComponent.tsx` / `PeoplePicker.tsx`)
- Componentes antes de su integración en `ItemForm.tsx` / `ItemList.tsx`

### Parallel Opportunities

- T003 (Setup, Office 365 Users) puede ejecutarse en paralelo con T002 (Setup, Items) — archivos distintos, sin dependencia cruzada
- T005 (`Attachment.ts`) puede ejecutarse en paralelo con T004 (`AssignedPerson.ts`) dentro de Foundational — archivos distintos
- T007 y T008 (Foundational) pueden ejecutarse en paralelo entre sí y con T006 — archivos distintos
- US1 (Phase 3) y US4 (Phase 6) pueden desarrollarse en paralelo una vez completada Foundational — tocan archivos de servicio/hook/componente completamente distintos; solo convergen en `ItemForm.tsx`, donde sus cambios son secuenciales entre sí (mismo archivo)
- T029 y T030 (Polish) pueden ejecutarse en paralelo entre sí
- Las tareas dentro de una misma user story que tocan `FilesComponent.tsx`, `PeoplePicker.tsx`, `useItems.ts`, `ItemForm.tsx` o `ItemList.tsx` son secuenciales (mismo archivo) y no se marcan `[P]`

---

## Parallel Example: Foundational Phase

```bash
# T004 y T005 pueden lanzarse juntos (archivos distintos, sin dependencia cruzada):
Task: "Crear src/entities/AssignedPerson.ts"
Task: "Crear src/entities/Attachment.ts"
```

## Parallel Example: Entrada de cada patrón

```bash
# US1 (adjuntos) y US4 (people picker) pueden lanzarse en paralelo una vez completada Foundational:
Task: "Implementar AttachmentService.listAttachments en src/services/AttachmentService.ts"
Task: "Implementar PeopleService.searchUsers en src/services/PeopleService.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 4)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las stories)
3. Completar Phase 3: User Story 1 (ver adjuntos) y/o Phase 6: User Story 4 (buscar y asignar persona) — ambas son P1, cada una demuestra un patrón completo por sí sola
4. **DETENER y VALIDAR**: probar cada patrón de forma independiente
5. Demo si está listo

### Incremental Delivery

1. Setup + Foundational → base lista
2. Agregar US1 (ver adjuntos) → validar → MVP del patrón de adjuntos
3. Agregar US2 (agregar adjuntos) → validar
4. Agregar US3 (eliminar adjuntos) → validar → patrón de adjuntos completo
5. Agregar US4 (buscar/asignar persona) → validar → MVP del patrón people picker
6. Agregar US5 (multi-selección con deduplicación) → validar
7. Agregar US6 (quitar persona seleccionada) → validar → patrón people picker completo

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes
- `[Story]` mapea cada tarea a su user story para trazabilidad
- No hay tareas de test automatizado — el template no tiene framework configurado; la validación es manual vía `quickstart.md` (T029)
- Este feature amplía un artefacto de referencia: una vez implementado, el código permanece como documentación viva junto a 001 (principio 9.5 de la constitution) — no se borra al terminar
