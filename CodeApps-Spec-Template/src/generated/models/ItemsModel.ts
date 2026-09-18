// STUB GENERADO A MANO — NO es la salida real de `pac code generate`.
//
// Este archivo imita la forma esperada de los tipos que `pac code generate`
// produciría para la tabla de Dataverse `Items` (ver research.md §1 y
// data-model.md). Se creó a mano porque este entorno de desarrollo no tiene
// un `pac` CLI ni un environment de Power Platform conectado.
//
// Reemplazar corriendo, contra un environment real con la tabla `Items` ya
// creada (ver quickstart.md):
//   pac code add-data-source -a dataverse -t Items
//   pac code generate
//
// Los nombres de columna física (prefijo "cr123_") y los valores numéricos
// del choice `cr123_status` son placeholders — se confirman al generar contra
// el environment real y probablemente cambien.

export interface ItemsModel {
  cr123_itemsid: string
  cr123_title: string
  cr123_description: string | null
  /** Choice: 1 = Pendiente, 2 = En Progreso, 3 = Completado (placeholder). */
  cr123_status: number
  cr123_assignedto: string | null
  /** Fecha ISO (solo fecha, sin hora), p. ej. "2026-09-17". */
  cr123_duedate: string | null
  cr123_active: boolean
}
