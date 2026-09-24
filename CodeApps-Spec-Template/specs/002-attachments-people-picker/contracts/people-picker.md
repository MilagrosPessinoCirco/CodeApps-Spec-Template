# Contract: People Picker (`PeopleService`, `usePeopleSearch`, `PeoplePicker`)

Contrato interno entre `PeoplePicker` (UI), `usePeopleSearch` (búsqueda con debounce/concurrencia) y `PeopleService` (acceso al conector Office 365 Users) — patrón reutilizable por cualquier campo de persona del template.

## Service: `PeopleService` (`src/services/PeopleService.ts`)

Funciones puras y async, sin manejo de estado de UI (principio 2.3). A diferencia de `AttachmentService`, no registra operaciones a mano — usa la operación `searchUserV2` que el codegen del conector Office 365 Users ya produce (ver `research.md` §5).

```ts
searchUsers(query: string): Promise<AssignedPerson[]>
// Llama a office365UsersService.searchUserV2(query) (generado en src/generated/services/Office365UsersService.ts).
// Mapea cada resultado a AssignedPerson, construyendo claims = `i:0#.f|membership|${userPrincipalName.toLowerCase()}`.
// Filtra (no incluye en el resultado) a las personas sin userPrincipalName resoluble.
```

## Hook: `usePeopleSearch` (`src/hooks/usePeopleSearch.ts`)

```ts
usePeopleSearch(query: string): {
  results: AssignedPerson[]
  isSearching: boolean
  error: Error | null
}
```

Comportamiento (ver `research.md` §6):

- Debounce de 250ms sobre `query` antes de llamar a `PeopleService.searchUsers`.
- Si el valor debounced tiene menos de 3 caracteres: `results: []`, `isSearching: false`, ninguna llamada de red (FR-011).
- `requestIdRef` interno: cada búsqueda disparada incrementa el id; al resolver, si el id de esa búsqueda ya no es el más reciente, la respuesta se descarta sin tocar `results`/`error` (FR-013).
- No usa Tanstack Query (ver `research.md` §6 para el porqué).

## Componente: `PeoplePicker` (`src/components/PeoplePicker.tsx`)

Componente genérico y controlado — no conoce la entidad `Item` (principio 4.4).

```ts
interface PeoplePickerProps {
  mode: "single" | "multiple"
  value: AssignedPerson | AssignedPerson[] | null
  onChange: (next: AssignedPerson | AssignedPerson[] | null) => void
  disabled?: boolean
}
```

- Input de texto que alimenta `usePeopleSearch`; los resultados se muestran en un `Popover` anclado al input (`command.tsx`/`cmdk`).
- Debajo del input, cada persona seleccionada se muestra como chip: iniciales del `displayName` (avatar), nombre, botón "×" para quitar (FR-014, FR-015).
- **Modo `single`**: `value` es `AssignedPerson | null`; seleccionar una persona nueva reemplaza el valor y limpia el input de búsqueda (FR-018). El chip único ocupa el lugar del input cuando hay selección.
- **Modo `multiple`**: `value` es `AssignedPerson[]`; seleccionar agrega al array solo si no hay ya una persona con el mismo `claims` (o `email`, sin distinguir mayúsculas/minúsculas) — ver deduplicación en `data-model.md` (FR-017). El input de búsqueda permanece visible junto a los chips ya seleccionados.
- Cuando `usePeopleSearch` no tiene resultados para una búsqueda válida (≥3 caracteres), o `error` no es `null`, el popover muestra un mensaje ("Sin resultados" / "Error al buscar, intenta de nuevo") en vez de una lista vacía (FR-020).

### Nota para features de negocio que reutilicen este patrón

Este ejemplo guarda `{displayName, email, claims}` tal cual (ver `research.md` §4). Si una feature real necesita escribir contra el campo nativo "Person or Group" de SharePoint, el paso adicional es resolver `claims` a un `Id` de la User Information List del sitio vía `/_api/web/ensureuser` antes de guardar — ese paso queda fuera de este patrón de referencia.

## Integración en `ItemForm.tsx`

```ts
// AssignedTo (modo single)
<PeoplePicker mode="single" value={formData.assignedTo} onChange={(v) => handleFieldChange("assignedTo", v)} />

// Collaborators (modo multiple — demuestra FR-016/US5, ver plan.md → Complexity Tracking)
<PeoplePicker mode="multiple" value={formData.collaborators} onChange={(v) => handleFieldChange("collaborators", v)} />
```

`IForm` (`src/pages/items/types.ts`) se extiende: `assignedTo: AssignedPerson | null`, `collaborators: AssignedPerson[]`. Ninguno de los dos es requerido — `validateForm` no cambia sus reglas existentes (title/status siguen siendo los únicos campos obligatorios).
