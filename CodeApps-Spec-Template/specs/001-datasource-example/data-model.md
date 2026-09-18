# Data Model: Ejemplo de Referencia CRUD (Items)

## Entidad: Item

Representa una unidad de trabajo genérica, ejemplo canónico del patrón CRUD del equipo. Vive en `src/entities/Item.ts` (principio 3 de la constitution).

| Campo         | Tipo TS               | Origen (columna Dataverse lógica) | Requerido | Notas |
| ------------- | ---------------------- | ---------------------------------- | --------- | ----- |
| `id`          | `string`               | clave primaria generada por Dataverse | Sí | GUID; provisto por `pac code generate` |
| `title`       | `string`               | Title                               | Sí | No puede ser cadena vacía |
| `description` | `string \| null`       | Description                         | No | Texto largo |
| `status`      | `"Pendiente" \| "En Progreso" \| "Completado"` | Status | Sí | Mapea el choice/option set generado a un union type legible |
| `assignedTo`  | `string \| null`       | AssignedTo                          | No | Nombre visible de la persona (ver research.md §2) |
| `dueDate`     | `Date \| null`         | DueDate                             | No | Solo fecha, sin hora |
| `active`      | `boolean`              | Active                              | Sí | `true` por defecto; `false` = soft-deleted. Nunca se expone como campo editable en el formulario |

### Reglas de validación (aplicadas en `helpers.ts` vía `validateForm`)

- `title`: requerido, no vacío después de `trim()`.
- `status`: requerido, debe ser uno de los tres valores del union type.
- `description`, `assignedTo`, `dueDate`: sin restricciones adicionales — pueden quedar vacíos/`null`.

### Transiciones de estado

- **Creación**: `active` se fija en `true` automáticamente; el usuario no lo controla.
- **Edición**: `active` no es editable desde `ItemForm`; solo cambia vía la acción de desactivar.
- **Desactivación (soft delete)**: única transición válida es `active: true → false`. No existe transición inversa expuesta en la UI de este ejemplo (reactivar queda fuera de alcance, ver Assumptions de `spec.md`).
- `status` puede cambiar libremente entre sus tres valores en cualquier edición; no hay una máquina de estados que restrinja el orden (Pendiente → En Progreso → Completado no es forzado).

### Construcción y serialización

Siguiendo el principio 3 de la constitution:

- `new Item(raw: any)`: constructor que mapea el registro crudo del SDK generado (`src/generated/`) a los campos tipados de arriba, incluyendo el parseo de `DueDate` a `Date | null` y el mapeo del choice numérico de Dataverse al union type de `status`.
- `item.toRecord()`: retorna el shape esperado por las operaciones de escritura del SDK generado (create/update), incluyendo la conversión inversa de `status` al valor de choice esperado por Dataverse. `toRecord()` para la operación de desactivación solo necesita incluir `active: false`.

## Relación con la fuente de datos generada

`src/generated/` se produce con `pac code generate` después de `pac code add-data-source` (ver `research.md` §1). Los nombres físicos de columna (prefijo de publisher, p. ej. `cr123_title`) se confirman en el momento de correr esos comandos contra un environment real; el constructor de `Item` es el único punto del código que conoce esos nombres físicos, aislando el resto de la app del detalle de Dataverse (principio 2.3).
