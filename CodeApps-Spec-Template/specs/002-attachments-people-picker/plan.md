# Implementation Plan: Adjuntos por Item y People Picker (Patrones de Referencia)

**Branch**: `002-attachments-people-picker` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-attachments-people-picker/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Ampliar el ejemplo de referencia de [001-datasource-example](../001-datasource-example/plan.md) con dos patrones que el codegen estándar de `pac code generate` no resuelve: (1) adjuntos por Item contra la REST API nativa de adjuntos de SharePoint, registrando a mano las operaciones `GetAttachments`/`AddAttachment`/`DeleteAttachment` en un `dataSourcesInfo` propio porque el conector generado no las incluye; y (2) un selector de personas real (`PeoplePicker`) que busca contra el conector estándar Office 365 Users (`SearchUserV2`), con debounce, mínimo de caracteres y control de concurrencia. Ambos se integran en `ItemForm.tsx` a través de dos componentes reutilizables nuevos (`FilesComponent`, `PeoplePicker`) que quedan documentados como patrones canónicos, igual que 001.

## Technical Context

**Language/Version**: TypeScript ~5.9 (`tsconfig.json`), React 19.1 (satisface el mínimo de React 18+ del stack confirmado)

**Primary Dependencies**: Las mismas de 001 (Vite 7, Tailwind CSS 4 + shadcn/ui, React Router 7, `@tanstack/react-query` 5, `@microsoft/power-apps` SDK, `sonner`) más `cmdk` 1.1 (ya instalado, usado para el combobox de búsqueda de personas vía `components/ui/command.tsx`) y `@radix-ui/react-popover` (ya instalado, usado para anclar los resultados de búsqueda y el input de personas). No se agregan dependencias nuevas a `package.json`.

**Storage**: Para este patrón ampliado, `Items` se modela contra una **lista de SharePoint** (no Dataverse) — ver `research.md` §1 para la justificación de este cambio respecto de 001. Los adjuntos se leen/escriben contra el endpoint nativo de adjuntos de esa misma lista (`_api/web/lists(guid'{listId}')/items({itemId})/AttachmentFiles`, ver `research.md` §2), invocado a través de una operación `connectorOperation` registrada a mano en un `dataSourcesInfo` propio de `AttachmentService`. La búsqueda de personas usa el conector estándar **Office 365 Users** (acción `SearchUserV2`) agregado vía `pac code add-data-source`.

**Testing**: Igual que 001 — sin framework de testing automatizado configurado (`package.json` no tiene `vitest`/`jest`). Validación manual guiada por `quickstart.md`.

**Target Platform**: Navegador web, embebido como Power Platform Code App (igual que 001).

**Project Type**: Single project — frontend-only Code App. SharePoint y el conector Office 365 Users actúan como backend a través de la capa de datos del SDK (`getClient`/`executeAsync`), sin código de servidor propio.

**Performance Goals**: Resultados de búsqueda de personas visibles en <1s tras dejar de escribir (SC-003); adjunto nuevo reflejado en la lista en <5s tras un guardado exitoso (SC-002). Sin metas de throughput — es material de referencia, no una feature de alto volumen.

**Constraints**: Upload/delete de adjuntos ocurre únicamente al guardar el formulario, nunca en tiempo real (FR-007); búsqueda de personas nunca se dispara con <3 caracteres (FR-011); solo se muestran resultados de la búsqueda más reciente, incluso con respuestas fuera de orden (FR-013, vía `requestIdRef`); selección múltiple nunca admite duplicados por `claims`/email case-insensitive (FR-017); `src/generated/` nunca se edita a mano (principio 2.2) — las operaciones que el codegen no cubre se registran en un `dataSourcesInfo` propio dentro de `src/services/`, no dentro de `src/generated/`.

**Scale/Scope**: Dos componentes reutilizables nuevos (`FilesComponent`, `PeoplePicker`), dos services nuevos (`AttachmentService`, `PeopleService`), dos hooks nuevos (`useAttachments`, `usePeopleSearch`), cambios acotados en `Item` (tipo de `assignedTo`, campo `collaborators` agregado solo para demostrar el modo múltiple — ver `research.md` §4) y en `ItemForm.tsx`/`ItemList.tsx` para integrarlos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principio | Cómo lo cumple este plan | Estado |
|---|-----------|---------------------------|--------|
| 1 | Stack confirmado | Reutiliza exactamente el stack de 001; no se agregan dependencias nuevas (`cmdk` y Popover ya estaban instalados) | ✅ PASS |
| 2.1 | Fuentes de datos | SharePoint (lista) + conector Office 365 Users, ambos soportados explícitamente por la constitution ("según el proyecto") | ✅ PASS |
| 2.2 | Código generado vs. custom | Las operaciones de adjuntos que el codegen no cubre se registran en un `dataSourcesInfo` propio dentro de `src/services/AttachmentService.ts`; `src/generated/` no se edita a mano para agregarlas | ✅ PASS |
| 2.3 | Services custom | `AttachmentService.ts` y `PeopleService.ts`: funciones puras/async, sin estado de UI (ver `contracts/`) | ✅ PASS |
| 2.4 | Tanstack Query | `useAttachments` (lectura) + mutations de subida/borrado ejecutadas dentro del `onSuccess` de guardar el Item; `usePeopleSearch` no usa Tanstack Query (es búsqueda interactiva con debounce propio, no server state cacheable por Item — ver `research.md` §6) | ✅ PASS |
| 2.5 | Context solo para estado no-servidor | No se necesita Context nuevo | ✅ PASS (no aplica) |
| 3 | Entidades | `Item.assignedTo` pasa a `AssignedPerson \| null`; se agrega `Item.collaborators: AssignedPerson[]`; opcionales siguen tipados `T \| null`, no `T \| undefined` | ✅ PASS |
| 4.1 | Estructura de carpetas | Componentes nuevos en `src/components/`, services en `src/services/`, hooks en `src/hooks/` — sin desviaciones | ✅ PASS |
| 4.2 | Formularios | `FilesComponent` y `PeoplePicker` se integran como campos controlados más de `IForm`; guardado sigue vía `useMutation`, éxito en `onSuccess` | ✅ PASS |
| 4.3 | InternalId para arrays paralelos | El estado interno de `FilesComponent` (adjuntos existentes + pendientes + marcados para borrar) usa `InternalId` estable (`Math.max(...existingIds) + 1`), nunca índice posicional; borrar marca `status: "deleted"` en vez de filtrar del array (ver `data-model.md`) | ✅ PASS |
| 4.4 | Componentes genéricos | `FilesComponent` y `PeoplePicker` no conocen la entidad `Item`; reciben `value`/`onChange` genéricos, reutilizables por cualquier formulario del template | ✅ PASS |
| 5 | Estilos | Solo Tailwind + shadcn/ui ya instalados (`command.tsx`, `popover.tsx`, `checkbox.tsx`); avatar de iniciales se construye con `div` + Tailwind, sin agregar `@radix-ui/react-avatar` | ✅ PASS |
| 6 | Estado y efectos | Sin `useEffect` para resets de formulario (sigue usando `prevIdRef`); `usePeopleSearch` sí usa `useEffect` para el debounce, pero es sincronización de un efecto externo legítimo (búsqueda de red), no un reset — `requestIdRef` descarta respuestas de búsqueda obsoletas; mensajes de éxito solo en `onSuccess` | ✅ PASS |
| 8 | Convenciones de código | Nombres de dominio en español donde aplica (`colaboradores`, mensajes), patrones técnicos en inglés (`useDebouncedValue`, `requestIdRef`); tipos `AssignedPerson`/`Attachment` sin prefijo `I` | ✅ PASS |
| 9.4–9.5 | Proceso Spec-Driven | `specs/002-attachments-people-picker/` amplía la referencia citada en la constitution; el código resultante queda como documentación viva, no se borra | ✅ PASS |

Una decisión requiere justificación explícita — ver `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/002-attachments-people-picker/
├── plan.md                        # This file (/speckit-plan command output)
├── research.md                    # Phase 0 output (/speckit-plan command)
├── data-model.md                  # Phase 1 output (/speckit-plan command)
├── quickstart.md                  # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── attachments.md             # Phase 1 output (/speckit-plan command)
│   └── people-picker.md           # Phase 1 output (/speckit-plan command)
└── tasks.md                       # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── entities/
│   ├── Item.ts                    # MODIFICADO: assignedTo: AssignedPerson | null; + collaborators: AssignedPerson[]
│   ├── AssignedPerson.ts          # NUEVO: tipo + helpers (initials, dedupKey)
│   ├── Attachment.ts              # NUEVO: tipo Attachment + AttachmentFormState (InternalId, status)
│   └── index.ts                   # re-export (se agregan AssignedPerson, Attachment)
├── services/
│   ├── ItemService.ts             # MODIFICADO: mapea assignedTo/collaborators al guardar (ver contracts/)
│   ├── AttachmentService.ts       # NUEVO: registerAttachmentOperations + listAttachments/uploadAttachment/deleteAttachment
│   └── PeopleService.ts           # NUEVO: searchUsers(query) sobre el conector Office 365 Users generado
├── hooks/
│   ├── useItems.ts                # MODIFICADO: useCreateItem/useUpdateItem orquestan el guardado de adjuntos al guardar
│   ├── useAttachments.ts          # NUEVO: useAttachments(itemId) (useQuery) + helpers de mutación usados al guardar
│   └── usePeopleSearch.ts         # NUEVO: debounce 250ms + mínimo 3 caracteres + requestIdRef
├── lib/
│   ├── utils.ts                   # existente (cn) — sin cambios
│   └── files.ts                   # NUEVO: fileToBase64(file: File): Promise<string>
├── components/
│   ├── ui/                        # componentes shadcn/ui ya existentes (command, popover, checkbox, button)
│   ├── FilesComponent.tsx         # NUEVO: componente genérico de adjuntos (ver contracts/attachments.md)
│   └── PeoplePicker.tsx           # NUEVO: componente genérico de selección de personas (ver contracts/people-picker.md)
├── pages/
│   └── items/
│       ├── ItemForm.tsx           # MODIFICADO: integra FilesComponent (adjuntos) y PeoplePicker (AssignedTo, Collaborators)
│       ├── ItemList.tsx           # MODIFICADO: columna AssignedTo renderiza assignedTo?.displayName
│       ├── helpers.ts             # sin cambios en las reglas existentes (title/status siguen igual)
│       └── types.ts               # MODIFICADO: IForm.assignedTo: AssignedPerson | null; + collaborators, attachments (AttachmentFormState[])
├── generated/
│   ├── models/ItemsModel.ts       # STUB actualizado: refleja columnas del list de SharePoint (ver research.md §1)
│   ├── services/ItemsService.ts   # STUB actualizado: dataSourceType "sharepoint", id numérico de list item
│   └── services/Office365UsersService.ts  # NUEVO STUB: mismo disclaimer "STUB GENERADO A MANO" que ItemsService, expone searchUserV2
└── router.tsx                     # sin cambios de rutas — misma URL /items, /items/new, /items/:id/edit
```

No hay carpeta `tests/` — mismo motivo que 001 (sin framework de testing automatizado configurado); la validación es manual vía `quickstart.md`.

**Structure Decision**: Se mantiene la opción de proyecto único (frontend-only Code App) de 001. La única desviación estructural es que, para este patrón ampliado, `Items` pasa de Dataverse a una lista de SharePoint (ver `research.md` §1); el resto de la estructura de carpetas sigue exactamente el principio 4.1 de la constitution, agregando los archivos nuevos en las carpetas ya definidas (`components/`, `services/`, `hooks/`, `entities/`, `lib/`) sin introducir carpetas nuevas.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| `Items` pasa de Dataverse (001) a SharePoint (002) para este ejemplo ampliado | El endpoint de adjuntos que el usuario pidió documentar (`_api/web/lists(guid'...')/items({itemId})/AttachmentFiles`) es una capacidad nativa y exclusiva de listas de SharePoint; Dataverse no tiene un equivalente de "varios adjuntos nombrados por registro" accesible con esa misma forma de REST | Mantener `Items` en Dataverse y simular adjuntos con el file/image column nativo (`uploadFileToRecord`/`downloadFileFromRecord`) — rechazado porque esas columnas son de **un solo archivo por columna**, no una lista de adjuntos con nombre y URL como pide el patrón; usar la entidad de Notes/anotaciones de Dataverse — rechazado porque requeriría una segunda entidad generada y un segundo service solo para adjuntos, diluyendo el patrón que el usuario pidió documentar explícitamente contra la REST API de SharePoint |
| Se agrega `collaborators` (multi-persona) a `Item`, sin pedido explícito en el input original | FR-016/US5 exigen que el patrón demuestre el modo `multiple` del `PeoplePicker` de punta a punta en la app real, no solo como capacidad no verificable del componente; `AssignedTo` es de persona única por diseño de 001 | Documentar el modo múltiple solo a nivel de props del componente sin un campo real que lo ejercite en `ItemForm` — rechazado porque el objetivo explícito del ejemplo es mostrar el patrón funcionando end-to-end, igual que las demás historias de 001, no solo declararlo en el código del componente |
