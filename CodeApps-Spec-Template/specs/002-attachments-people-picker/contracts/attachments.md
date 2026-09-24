# Contract: Adjuntos (`AttachmentService`, `useAttachments`, `FilesComponent`)

Igual que en 001, esta app no expone una API pública externa; el contrato relevante es la interfaz interna entre `FilesComponent` (UI), `useAttachments`/`useItems` (Tanstack Query) y `AttachmentService` (acceso a datos) — lo que el equipo va a copiar como patrón para cualquier lista de SharePoint que necesite adjuntos.

## Service: `AttachmentService`

Funciones puras y async, sin manejo de estado de UI (principio 2.3). Registra a mano las operaciones que el codegen del conector de SharePoint no produce (ver `research.md` §2).

```ts
// src/services/AttachmentService.ts

registerAttachmentOperations(listId: string): DataSourcesInfo
// Construye (no muta un objeto compartido) el fragmento de dataSourcesInfo con las
// tres operaciones GetAttachments/AddAttachment/DeleteAttachment para la lista `listId`.
// Uso interno del propio AttachmentService — no se expone a componentes/hooks.

listAttachments(itemId: string): Promise<Attachment[]>
// GET AttachmentFiles del item. Mapea {FileName, ServerRelativeUrl} -> {name, url}.

uploadAttachment(itemId: string, file: File): Promise<Attachment>
// 1) fileToBase64(file) (src/lib/files.ts)
// 2) POST AddAttachment con el base64 en el body y el nombre de archivo como parámetro de path
// 3) Devuelve el Attachment resultante ({name, url})

deleteAttachment(itemId: string, fileName: string): Promise<void>
// DELETE DeleteAttachment. No lanza si el adjunto ya no existe (ver Edge Cases de spec.md) —
// lo trata como éxito idempotente y lo reporta como advertencia, no como error de guardado.
```

## Hooks: `useAttachments` (`src/hooks/useAttachments.ts`)

```ts
useAttachments(itemId: string): UseQueryResult<Attachment[]>
// queryKey: ["items", itemId, "attachments"]
// enabled: !!itemId (no dispara en modo creación, donde el Item todavía no tiene id)
// queryFn: () => AttachmentService.listAttachments(itemId)
```

No hay `useMutation` dedicado para subir/borrar adjuntos de forma aislada — la subida/borrado se ejecuta como parte de `useCreateItem`/`useUpdateItem` (ver `contracts` de `useItems` más abajo), consistente con "upload y delete se ejecutan al guardar" (`research.md` §8).

### Orquestación en `useCreateItem` / `useUpdateItem` (`src/hooks/useItems.ts`, modificado)

```ts
useCreateItem(): UseMutationResult<Item, Error, { input: IForm; attachments: AttachmentFormState[] }>
// mutationFn:
//   1. crea el Item (ItemService.create)
//   2. para cada attachment con status "new": AttachmentService.uploadAttachment(item.id, file)
//      (status "deleted" no aplica en creación — no puede haber adjuntos existentes todavía)
// onSuccess: invalidateQueries(["items"]) + invalidateQueries(["items", item.id, "attachments"]) + toast de éxito

useUpdateItem(): UseMutationResult<Item, Error, { id: string; input: IForm; attachments: AttachmentFormState[] }>
// mutationFn:
//   1. actualiza el Item (ItemService.update)
//   2. para cada attachment con status "new": AttachmentService.uploadAttachment(id, file)
//   3. para cada attachment con status "deleted": AttachmentService.deleteAttachment(id, name)
// onSuccess: invalidateQueries(["items"]) + invalidateQueries(["items", id]) +
//            invalidateQueries(["items", id, "attachments"]) + toast de éxito
```

Si algún `uploadAttachment`/`deleteAttachment` individual falla, la mutation completa se rechaza (no hay éxito parcial silencioso); el formulario conserva el estado de `attachments` para reintentar (FR-008), consistente con FR-014 de 001 para el resto de los campos.

## Componente: `FilesComponent` (`src/components/FilesComponent.tsx`)

Componente genérico y controlado — no conoce la entidad `Item` (principio 4.4).

```ts
interface FilesComponentProps {
  value: AttachmentFormState[]
  onChange: (next: AttachmentFormState[]) => void
  disabled?: boolean // true mientras la mutation de guardado está en curso
}
```

- Renderiza cada entrada de `value` según su `status`: `existing` (nombre + link a `url` + botón "Eliminar"), `new` (nombre del archivo local + botón "Quitar"), `deleted` (nombre tachado + botón "Deshacer").
- Un input de tipo archivo (múltiple) agrega entradas `status: "new"` con `internalId = Math.max(0, ...value.map(a => a.internalId)) + 1`.
- Nunca llama a `AttachmentService` directamente — toda la persistencia ocurre en el `onSubmit` de `ItemForm` a través de los hooks de arriba.
