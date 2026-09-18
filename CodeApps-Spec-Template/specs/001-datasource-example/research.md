# Research: Ejemplo de Referencia CRUD (Items)

## 1. Fuente de datos y generación de tipos

**Decision**: La tabla `Items` se modela como una tabla de **Dataverse** con las siguientes columnas lógicas:

| Campo lógico  | Tipo Dataverse           | Requerido |
| ------------- | ------------------------ | --------- |
| Title         | Texto de una línea       | Sí        |
| Description   | Texto de varias líneas   | No        |
| Status        | Choice (Option Set) de un solo valor: Pendiente / En Progreso / Completado | Sí |
| AssignedTo    | Texto de una línea (nombre visible de la persona) | No |
| DueDate       | Fecha (solo fecha, sin hora) | No |
| Active        | Sí/No (bit), default `true` | Sí (gestionado por el sistema, no por el usuario) |

El acceso a esta tabla se agrega al proyecto con `pac code add-data-source` y los tipos/hooks se generan con `pac code generate` hacia `src/generated/`, según el principio 2.1 de la constitution. Estos comandos requieren un environment real de Power Platform con la tabla `Items` ya creada — **no se pueden ejecutar en este entorno de desarrollo del ejemplo**; se documentan como prerequisito manual en `quickstart.md`.

**Rationale**: Es el flujo estándar del template para cualquier tabla de Dataverse y es el que la constitution exige seguir. Los nombres exactos de columna generados dependerán del prefijo del publisher del environment (p. ej. `cr123_title`); `data-model.md` documenta el mapeo lógico y deja el nombre físico como detalle a confirmar en el momento de correr `pac code generate`.

**Alternatives considered**: Usar SharePoint (lista) en lugar de Dataverse — descartado porque el enunciado usa el término "tabla" (terminología de Dataverse) y porque la constitution mantiene ambos conectores como opciones per-feature, no globales; Dataverse es la opción por defecto más representativa del stack confirmado.

## 2. Modelado del campo AssignedTo ("persona")

**Decision**: Para este ejemplo de referencia, `AssignedTo` se modela como un campo de **texto simple** que almacena el nombre visible de la persona asignada, no como un lookup a la tabla `systemuser` de Dataverse.

**Rationale**: Un lookup real a `systemuser` requeriría agregar una segunda fuente de datos y un segundo service solo para resolver nombres de usuario, lo cual diluye el objetivo del ejemplo (mostrar el patrón CRUD completo sobre **una** tabla). Un campo de texto sigue demostrando el manejo de un campo opcional de tipo "persona" en el formulario y en la tabla sin esa complejidad adicional.

**Alternatives considered**: Lookup a `systemuser` con un componente de búsqueda (Combobox) — descartado por alcance; Choice de usuarios predefinidos — descartado porque no refleja un campo de persona real y agrega mantenimiento.

## 3. Soft delete

**Decision**: El soft delete se implementa con una columna booleana `Active` (default `true`), separada del choice `Status`. "Desactivar" un Item es una operación de `update` que pone `Active = false`; nunca se llama a una operación de borrado físico del SDK generado.

**Rationale**: Los valores de `Status` (Pendiente/En Progreso/Completado) no incluyen un estado "Inactivo", y mezclar el ciclo de vida de negocio (Status) con el de archivado (soft delete) generaría ambigüedad. Mantenerlos separados es el patrón más claro para que el equipo lo replique.

**Alternatives considered**: Sobrecargar `Status` con un cuarto valor "Inactivo" — descartado porque un Item completado también debería poder desactivarse sin perder su Status real.

## 4. Componentes de UI existentes reutilizables

**Decision**: Reutilizar los componentes ya instalados en `src/components/ui/` sin agregar dependencias nuevas:

- Tabla: `table.tsx` + `@tanstack/react-table` (ya en `package.json`).
- Formulario: `input.tsx`, `textarea.tsx`, `select.tsx` (Status), `label.tsx`.
- Fecha: `calendar.tsx` + `popover.tsx` (ya soporta `react-day-picker`, ya instalado) para `DueDate`.
- Confirmación de soft delete: `dialog.tsx` (no hay `alert-dialog` instalado; se construye la confirmación con `Dialog` + botones "Confirmar" / "Cancelar").
- Feedback de éxito/error: `sonner` (ya integrado vía `src/providers/sonner-provider.tsx`).

**Rationale**: El template ya trae todo lo necesario; agregar un componente `alert-dialog` de shadcn sería válido pero no es obligatorio — `Dialog` cubre el caso de confirmación sin nueva dependencia.

**Alternatives considered**: Instalar `npx shadcn@latest add alert-dialog` — se deja como opción documentada en `quickstart.md` por si el equipo prefiere el componente semántico dedicado, pero no es requerido para cumplir FR-012.

## 5. Estrategia de testing

**Decision**: El template no tiene un framework de testing automatizado configurado (`package.json` no incluye `vitest`/`jest`/`@testing-library`). La validación de este ejemplo se hace mediante los escenarios manuales documentados en `quickstart.md`, que recorren cada acceptance scenario de `spec.md`.

**Rationale**: Agregar un framework de testing sería una decisión de alcance mayor al del template base y no es parte de lo solicitado. Introducirlo unilateralmente violaría el principio de no agregar abstracciones fuera de lo pedido.

**Alternatives considered**: Agregar Vitest + Testing Library — queda fuera de alcance de este ejemplo; puede proponerse como una spec/ampliación de constitution separada si el equipo lo decide.

## 6. Ruteo

**Decision**: Se agregan rutas anidadas bajo `/items` en `src/router.tsx`, reutilizando el `Layout` existente:

- `/items` → `ItemList`
- `/items/new` → `ItemForm` (modo creación)
- `/items/:id/edit` → `ItemForm` (modo edición)

**Rationale**: Sigue el patrón de ruteo ya presente (`createBrowserRouter` con rutas hijas de `Layout`) sin introducir un router paralelo.

**Alternatives considered**: Modal de creación/edición en la misma página de listado — descartado porque el patrón de referencia debe mostrar formularios como páginas independientes (`<Feature>Form.tsx`) según el principio 4.1 de la constitution.
