# Implementation Plan: Ejemplo de Referencia CRUD (Items)

**Branch**: `001-datasource-example` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-datasource-example/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Construir el ejemplo de referencia canónico del equipo: patrón CRUD completo (listar, crear, editar, soft delete) contra una tabla de Dataverse genérica `Items`, siguiendo al pie de la letra la estructura de carpetas y convenciones de la constitution (entidad tipada, service puro, hooks de Tanstack Query, páginas de lista/formulario, tabla con Tanstack Table). No resuelve un proceso de negocio; es documentación viva que el resto del equipo copia al construir sus propias features.

## Technical Context

**Language/Version**: TypeScript ~5.9 (`tsconfig.json`), React 19.1 (satisface el mínimo de React 18+ del stack confirmado)

**Primary Dependencies**: Vite 7, Tailwind CSS 4 + shadcn/ui (Radix primitives ya instalados: dialog, select, popover, calendar, dropdown-menu, checkbox, tabs), React Router 7, `@tanstack/react-query` 5, `@tanstack/react-table` 8, `@microsoft/power-apps` SDK, `sonner` para toasts, `date-fns` + `react-day-picker` para el date picker

**Storage**: Tabla de Dataverse `Items` (ver `research.md` §1 y `data-model.md`), accedida vía SDK generado en `src/generated/` (`pac code add-data-source` + `pac code generate`)

**Testing**: Sin framework de testing automatizado configurado en el template (no hay `vitest`/`jest` en `package.json`). Validación manual guiada por `quickstart.md`, recorriendo cada acceptance scenario de `spec.md`

**Target Platform**: Navegador web, embebido como Power Platform Code App (basename dinámico ya resuelto en `src/router.tsx`)

**Project Type**: Single project — frontend-only Code App; Dataverse actúa como backend a través del SDK generado, sin código de servidor propio en este repo

**Performance Goals**: Reflejar cambios de creación/edición en el listado en <2s tras un guardado exitoso (SC-003); sin metas de throughput — es un ejemplo de referencia, no una feature de alto volumen

**Constraints**: Nunca borrar físicamente un registro de Item (FR-011); `src/generated/` nunca se edita a mano (principio 2.2); server state solo en Tanstack Query, nunca duplicado en `useState`/Context (principio 2.4); mensajes de éxito solo dentro de `onSuccess` de la mutation, nunca en `finally` (principio 6)

**Scale/Scope**: Una sola entidad (`Item`), 2 páginas (`ItemList`, `ItemForm` reutilizada para crear/editar), 1 service, 1 archivo de hooks — alcance intencionalmente mínimo por ser material de referencia

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principio | Cómo lo cumple este plan | Estado |
|---|-----------|---------------------------|--------|
| 1 | Stack confirmado | Usa exactamente Vite, React, Tailwind+shadcn, React Router, Tanstack Query, Tanstack Table, SDK `@microsoft/power-apps`, `pac` CLI — todos ya presentes en el template | ✅ PASS |
| 2.1–2.2 | Fuente de datos / código generado | Dataverse vía `pac code add-data-source` + `pac code generate`; `src/generated/` nunca se edita a mano | ✅ PASS |
| 2.3 | Services custom | `ItemService.ts` con funciones puras/async, sin estado de UI (ver `contracts/item-service.md`) | ✅ PASS |
| 2.4 | Tanstack Query | `useItems`/`useItem` con `useQuery`; `useCreateItem`/`useUpdateItem`/`useDeactivateItem` con `useMutation` + `invalidateQueries`; ningún server state en `useState` | ✅ PASS |
| 2.5 | Context solo para estado no-servidor | No se necesita Context nuevo — este ejemplo no tiene estado de usuario/permisos/tema propio | ✅ PASS (no aplica) |
| 3 | Entidades | `src/entities/Item.ts`, opcionales como `T \| null`, constructor desde raw SDK, `toRecord()` | ✅ PASS |
| 4.1 | Estructura de carpetas | `src/pages/items/{ItemList.tsx, ItemForm.tsx, helpers.ts, types.ts}`, `src/services/ItemService.ts`, `src/hooks/useItems.ts` | ✅ PASS |
| 4.2 | Formularios | `IForm`/`IFormErrors`, `handleFieldChange`, `validateForm`, guardado vía `useMutation`, éxito en `onSuccess` | ✅ PASS |
| 4.3 | InternalId para arrays paralelos | No aplica — `Item` no tiene sub-arrays de entidades hijas | N/A |
| 4.4 | Componentes genéricos | Reutiliza componentes `ui/` existentes sin lógica de negocio embebida | ✅ PASS |
| 5 | Estilos | Solo Tailwind + shadcn/ui ya instalados; sin CSS/SCSS custom nuevo | ✅ PASS |
| 6 | Estado y efectos | Sin `useEffect` para resets; sin lógica en `finally` | ✅ PASS |
| 8 | Convenciones de código | Nombres de dominio en español donde aplica (`activo`, mensajes), patrones técnicos en inglés (`useQuery`, `handleFieldChange`); entidad `Item` sin prefijo `I` | ✅ PASS |
| 9.4–9.5 | Proceso Spec-Driven | Esta carpeta (`specs/001-datasource-example/`) es explícitamente la referencia citada en la constitution; el código resultante queda como documentación viva, no se borra | ✅ PASS |

Sin violaciones — no se requiere `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/001-datasource-example/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── item-service.md  # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── entities/
│   ├── Item.ts                  # entidad tipada + constructor + toRecord()
│   └── index.ts                 # re-export (ya existente, se agrega Item)
├── services/
│   └── ItemService.ts           # listActive, listAll, getById, create, update, deactivate
├── hooks/
│   └── useItems.ts              # useItems, useItem, useCreateItem, useUpdateItem, useDeactivateItem
├── pages/
│   └── items/
│       ├── ItemList.tsx         # página de listado (Tanstack Table)
│       ├── ItemForm.tsx         # página de formulario, reutilizada para crear y editar
│       ├── helpers.ts           # validateForm, emptyErrors
│       └── types.ts             # IForm, IFormErrors
├── components/
│   └── ui/                      # componentes shadcn/ui ya existentes (table, dialog, select, calendar, popover, textarea, input, label, badge)
├── generated/
│   └── ...                      # NO TOCAR — salida de `pac code generate` para la tabla Items
└── router.tsx                   # se agregan rutas /items, /items/new, /items/:id/edit
```

No hay carpeta `tests/` porque el template no tiene un framework de testing automatizado configurado (ver `research.md` §5); la validación es manual vía `quickstart.md`.

**Structure Decision**: Opción de proyecto único (frontend-only Code App). No hay backend propio en este repo: Dataverse cumple ese rol a través del SDK generado en `src/generated/`. La estructura sigue exactamente el layout de carpetas del principio 4.1 de la constitution, sin desviaciones.

## Complexity Tracking

No aplica — el Constitution Check no registró violaciones que requieran justificación.
