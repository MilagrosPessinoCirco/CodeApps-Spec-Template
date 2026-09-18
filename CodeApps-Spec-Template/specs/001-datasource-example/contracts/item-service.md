# Contract: ItemService + hooks (`src/services/ItemService.ts`, `src/hooks/useItems.ts`)

Esta app no expone una API pública externa; el "contrato" relevante es la interfaz interna entre la capa de UI (páginas) y la capa de datos (service + hooks de Tanstack Query), que es lo que el equipo va a copiar como patrón.

## Service: `ItemService`

Funciones puras y async, sin manejo de estado de UI (principio 2.3).

```ts
// src/services/ItemService.ts

listActive(): Promise<Item[]>
// Retorna solo Items con active === true, ordenados por defecto por Title asc.

listAll(): Promise<Item[]>
// Retorna todos los Items (activos e inactivos), para el toggle "ver inactivos" (FR-003).

getById(id: string): Promise<Item>
// Lanza error si no existe.

create(input: IForm): Promise<Item>
// input no incluye `id` ni `active`. active se fija en true en el service.

update(id: string, input: IForm): Promise<Item>
// Actualiza title/description/status/assignedTo/dueDate. No modifica `active`.

deactivate(id: string): Promise<void>
// Único punto de la app que cambia `active` a false. Nunca borra el registro (FR-011).
```

## Hooks: `useItems`

```ts
// src/hooks/useItems.ts

useItems(options?: { includeInactive?: boolean }):
  UseQueryResult<Item[]>
// queryKey: ["items", { includeInactive }]
// queryFn: () => includeInactive ? ItemService.listAll() : ItemService.listActive()

useItem(id: string): UseQueryResult<Item>
// queryKey: ["items", id]

useCreateItem(): UseMutationResult<Item, Error, IForm>
// onSuccess: queryClient.invalidateQueries({ queryKey: ["items"] }) + toast de éxito

useUpdateItem(): UseMutationResult<Item, Error, { id: string; input: IForm }>
// onSuccess: invalidateQueries(["items"]) + invalidateQueries(["items", id]) + toast de éxito

useDeactivateItem(): UseMutationResult<void, Error, string>
// onSuccess: invalidateQueries(["items"]) + toast de éxito
```

## Forma del formulario (`src/pages/items/types.ts`)

```ts
interface IForm {
  title: string
  description: string
  status: "Pendiente" | "En Progreso" | "Completado" | ""
  assignedTo: string
  dueDate: Date | null
}

interface IFormErrors {
  title: string
  status: string
}
```

- `status: ""` representa "sin seleccionar" antes de que el usuario elija (necesario para que el `Select` de shadcn muestre el placeholder); `validateForm` rechaza `""` como inválido para `status`.
- `IFormErrors` solo tiene entradas para los campos requeridos (`title`, `status`); los campos opcionales no tienen mensaje de error propio.

## Contrato de validación (`src/pages/items/helpers.ts`)

```ts
validateForm(formData: IForm): [IFormErrors, boolean]
// Retorna los errores por campo y un booleano isValid.
// Reglas: ver "Reglas de validación" en data-model.md.

emptyErrors(): IFormErrors
// Retorna { title: "", status: "" }.
```
