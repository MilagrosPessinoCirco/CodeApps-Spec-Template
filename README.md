# CodeApps-Spec-Template

Template base para Power Apps Code Apps gobernado por [GitHub Spec Kit](https://github.com/github/spec-kit). No es una app final: es el punto de partida para cualquier futura Code App del equipo.

## Qué trae este repo

- **`.specify/memory/constitution.md`**: los principios no negociables de arquitectura, datos, estilos, convenciones y proceso para cualquier Code App construida a partir de este template (Tanstack Query para server state, React Context para estado global, código generado en `src/generated/` que no se toca, services custom en `src/services/`, formularios con `handleFieldChange` + `validateForm`, etc.).

- **`specs/001-datasource-example/`**: la especificación completa (spec, plan, research, data-model, contracts, tasks) de un ejemplo de referencia CRUD contra una tabla genérica `Items`. Documenta cómo se ve un service + hook + componente que cumple la constitución.

- **Código de ejemplo ya implementado**:
  - `src/generated/` — stub del SDK que simula lo que `pac code generate` produciría (se reemplaza con el SDK real al conectar un environment)
  - `src/entities/Item.ts` — entidad tipada con constructor y `toRecord()`
  - `src/services/ItemService.ts` — service con `listActive`, `listAll`, `getById`, `create`, `update`, `deactivate`
  - `src/hooks/useItems.ts` — hooks de Tanstack Query (`useItems`, `useItem`, `useCreateItem`, `useUpdateItem`, `useDeactivateItem`)
  - `src/pages/items/ItemList.tsx` — lista con Tanstack Table
  - `src/pages/items/ItemForm.tsx` — formulario con `handleFieldChange` + `validateForm`
  - `src/pages/items/types.ts` + `helpers.ts` — interfaces `IForm`, `IFormErrors` y validación

## Cómo usar este template para una app nueva

1. **Cloná este repo** como punto de partida de tu proyecto (o usá "Use this template" en GitHub).
2. **No corras `/speckit-constitution` de cero** — ya heredás los principios del template. Solo corré `/speckit-constitution` de nuevo si tu app necesita ampliar esas reglas con algo propio (nunca para borrar lo heredado).
3. **Corré `/speckit-specify`** directamente para tu feature real de negocio. Spec Kit va a numerar tu especificación como `specs/002-...` en adelante, sin tocar `specs/001-datasource-example/`.
4. **Corré `/speckit-plan`** y decile al agente que siga el patrón de `src/services/ItemService.ts`, `src/hooks/useItems.ts` y `src/pages/items/` como referencia.
5. **Corré `/speckit-tasks`** y **`/speckit-implement`** como siempre.
6. **Conectá tu environment** de Power Platform con `pac code init` + `pac code add-data-source` + `pac code generate` para reemplazar los stubs de `src/generated/` con el SDK real.

`specs/001-datasource-example/` y el código de ejemplo quedan como documentación viva del patrón — no se eliminan al construir la app real sobre este template.

## Prerrequisitos

| Herramienta | Cómo verificar | Qué tenés que ver |
|---|---|---|
| **Node.js 22+** | `node -v` | `v22.x.x` |
| **npm** | `npm -v` | `10.x.x` o similar |
| **Git** | `git --version` | Cualquier versión |
| **Claude Code** | `claude --version` | `2.x.x (Claude Code)` |
| **uv** | `uv --version` | `0.7.x` o similar |
| **Spec Kit** | `specify version` | Número de versión |
| **Power Platform CLI** | `pac --version` | Número de versión |
| **VS Code** | Abrirlo | Que abra |

Si te falta algo, consultá la guía de setup del equipo.

## Comandos

```bash
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm run build    # build de producción
npm run lint     # lint
```

## Deploy a Power Platform

```bash
pac auth create                              # loguearte
pac env list                                 # ver environments
pac env select --environment <env-id>        # seleccionar environment
pac code init --displayname "Mi App"         # inicializar Code App
pac code add-data-source -a dataverse -t <tabla>   # agregar data source
pac code generate                            # generar SDK (reemplaza src/generated/)
npm run build                                # build
pac code push                                # deploy
```

> El toggle de **Code Apps** tiene que estar habilitado en Power Platform Admin Center (Settings → Product → Features) antes del primer deploy.

## Stack confirmado

| Capa | Tecnología |
|---|---|
| Build | Vite |
| UI | React 18+ con TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Routing | React Router |
| Server state | Tanstack Query |
| Estado global | React Context |
| Tablas | Tanstack Table |
| SDK | `@microsoft/power-apps` |
| CLI | `pac` (Power Platform CLI) |
| Agente IA | Claude Code con Spec Kit |

## Estructura del proyecto

```
CodeApps-Spec-Template/
├── .specify/
│   ├── memory/
│   │   └── constitution.md          ← principios no negociables
│   └── templates/                   ← templates de Spec Kit
├── .claude/
│   └── skills/                      ← skills /speckit-* para Claude Code
├── specs/
│   └── 001-datasource-example/
│       ├── spec.md                  ← qué hace el ejemplo
│       ├── plan.md                  ← cómo se implementa
│       ├── research.md              ← decisiones de investigación
│       ├── data-model.md            ← modelo de datos
│       ├── contracts/
│       │   └── item-service.md      ← contrato del service
│       ├── quickstart.md            ← validación manual
│       └── tasks.md                 ← tareas desglosadas
├── src/
│   ├── generated/                   ← SDK generado por pac (NO TOCAR)
│   │   ├── models/
│   │   │   └── ItemsModel.ts
│   │   ├── services/
│   │   │   └── ItemsService.ts
│   │   └── index.ts
│   ├── entities/
│   │   ├── Item.ts                  ← entidad tipada
│   │   └── index.ts
│   ├── services/
│   │   └── ItemService.ts           ← lógica de negocio
│   ├── hooks/
│   │   └── useItems.ts              ← hooks de Tanstack Query
│   ├── pages/
│   │   └── items/
│   │       ├── ItemList.tsx          ← lista con Tanstack Table
│   │       ├── ItemForm.tsx          ← formulario
│   │       ├── types.ts             ← IForm, IFormErrors
│   │       └── helpers.ts           ← validateForm, emptyErrors
│   ├── components/
│   │   └── ui/                      ← componentes shadcn/ui
│   ├── context/                     ← React Context
│   └── router.tsx                   ← rutas
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

## Qué NO tocar

| Carpeta / Archivo | Qué es | Por qué no se toca |
|---|---|---|
| `.specify/memory/constitution.md` | Principios de arquitectura del equipo | Solo se amplía, nunca se borra |
| `specs/001-datasource-example/` | Spec de referencia | Tus specs van en `specs/002-...` en adelante |
| Código de ejemplo (`entities/Item.ts`, `services/ItemService.ts`, `hooks/useItems.ts`, `pages/items/`) | Patrón canónico | Es la referencia que el agente copia para tu código |
