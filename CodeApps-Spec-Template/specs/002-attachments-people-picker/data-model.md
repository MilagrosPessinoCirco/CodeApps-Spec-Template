# Data Model: Adjuntos por Item y People Picker (Patrones de Referencia)

## Entidad: `Item` (modificaciones sobre 001)

Sigue viviendo en `src/entities/Item.ts`. Cambios respecto de [001](../001-datasource-example/data-model.md#entidad-item):

| Campo | Tipo TS (001) | Tipo TS (002) | Notas |
|-------|----------------|----------------|-------|
| `id` | `string` | `string` | Sin cambio de tipo; ahora el valor viene del `Id` numérico del list item de SharePoint, convertido a `string` (ver `research.md` §1) |
| `assignedTo` | `string \| null` | `AssignedPerson \| null` | Antes texto libre; ahora el objeto seleccionado vía `PeoplePicker` en modo `single` |
| `collaborators` | *(no existía)* | `AssignedPerson[]` | Nuevo, opcional, default `[]`. Demuestra el modo `multiple` del `PeoplePicker` (ver `plan.md` → Complexity Tracking) |

El resto de los campos (`title`, `description`, `status`, `dueDate`, `active`) no cambian respecto de 001.

### Construcción y serialización (actualizado)

- `new Item(raw: any)`: además de lo que ya hacía en 001, parsea `raw.AssignedTo`/`raw.Collaborators` (columnas de texto que guardan JSON, ver `research.md` §4) a `AssignedPerson | null` / `AssignedPerson[]`, con manejo defensivo si el campo está vacío o el JSON es inválido (se trata como `null`/`[]`).
- `item.toRecord()`: serializa `assignedTo`/`collaborators` de vuelta a JSON string antes de enviarlos al `update`/`create` de la lista de SharePoint.

## Entidad: `AssignedPerson`

Vive en `src/entities/AssignedPerson.ts`. Representa una persona resuelta desde el conector Office 365 Users y seleccionada en un `PeoplePicker`.

| Campo | Tipo TS | Requerido | Notas |
|-------|---------|-----------|-------|
| `displayName` | `string` | Sí | Nombre para mostrar; usado también para calcular las iniciales del chip/avatar |
| `email` | `string` | Sí | Correo de la persona; usado para deduplicar en modo `multiple` (case-insensitive) cuando no hay `claims` comparable |
| `claims` | `string` | Sí | `i:0#.f\|membership\|<userPrincipalName en minúsculas>` — formato de identity claims que espera SharePoint (ver `research.md` §4). Clave primaria de deduplicación en modo `multiple` |

### Reglas de validación / deduplicación

- En modo `multiple`, antes de agregar una persona nueva al array de seleccionados, se compara su `claims` (o, si falta, su `email`) contra los ya seleccionados sin distinguir mayúsculas/minúsculas (`toLowerCase()`); si hay coincidencia, no se agrega (FR-017).
- En modo `single`, seleccionar una persona nueva siempre reemplaza el valor anterior — no hay deduplicación posible con un solo valor.
- Una persona sin `userPrincipalName` resoluble no puede seleccionarse (edge case de `spec.md`): `PeopleService.searchUsers` filtra del resultado a las personas para las que no se puede construir un `claims` válido.

## Entidad: `Attachment` / `AttachmentFormState`

Viven en `src/entities/Attachment.ts`. `Attachment` es la forma "persistida" (lo que devuelve `GetAttachments`); `AttachmentFormState` es la forma que maneja `FilesComponent` mientras el formulario está abierto, siguiendo el patrón de `InternalId` para arrays paralelos del principio 4.3 de la constitution.

```ts
interface Attachment {
  name: string   // FileName de SharePoint
  url: string    // ServerRelativeUrl de SharePoint
}

interface AttachmentFormState extends Attachment {
  internalId: number                       // Math.max(...existingIds) + 1 — nunca índice posicional
  status: "existing" | "new" | "deleted"   // "deleted" = marcado para borrar, no filtrado del array hasta guardar
  file?: File                              // solo presente cuando status === "new"; se descarta después de subir
}
```

### Reglas de validación / transiciones de estado

- Al abrir el formulario de edición, cada adjunto existente entra al array como `{ ...attachment, internalId, status: "existing" }` (US1).
- Seleccionar un archivo nuevo agrega una entrada `status: "new"` con `file` seteado y `url: ""` (aún no existe en SharePoint) (US2).
- Marcar un adjunto `existing` para eliminar cambia su `status` a `"deleted"` sin quitarlo del array (US3); revertir la marca antes de guardar lo vuelve a `"existing"`.
- Quitar un adjunto `new` antes de guardar sí lo filtra del array (nunca llegó a existir en SharePoint, no hay nada que "revertir").
- Al guardar (ver `research.md` §8): las entradas `status: "new"` se suben vía `AttachmentService.uploadAttachment` y las `status: "deleted"` se eliminan vía `AttachmentService.deleteAttachment`; las `status: "existing"` no generan ninguna llamada.

## Relación con la fuente de datos generada

`src/generated/` se produce con `pac code generate` después de `pac code add-data-source -a sharepoint` (para `Items`) y `pac code add-data-source -a shared_office365users` (para la búsqueda de personas) — ver `research.md` §1 y §5. En este repo de ejemplo (sin environment real conectado) ambos quedan representados por STUBs hand-authored equivalentes al de `ItemsService.ts` en 001, con el mismo disclaimer explícito de que no son la salida real del comando. Las operaciones de adjuntos (`GetAttachments`/`AddAttachment`/`DeleteAttachment`) **no** viven en `src/generated/` bajo ningún escenario — se registran siempre desde `AttachmentService.ts` (principio 2.2, ver `research.md` §2).
