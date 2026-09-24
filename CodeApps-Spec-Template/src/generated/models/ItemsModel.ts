// STUB GENERADO A MANO — NO es la salida real de `pac code generate`.
//
// Este archivo imita la forma esperada de los tipos que `pac code generate`
// produciría para la lista de SharePoint `Items` (ver research.md §1 y
// data-model.md de 002-attachments-people-picker). Se creó/actualizó a mano
// porque este entorno de desarrollo no tiene un `pac` CLI ni un environment
// de Power Platform conectado.
//
// A partir de 002-attachments-people-picker, `Items` pasa de ser una tabla
// de Dataverse (001-datasource-example) a una lista de SharePoint, porque el
// patrón de adjuntos (AttachmentFiles) que este feature documenta es una
// capacidad nativa exclusiva de listas de SharePoint (ver research.md §1).
//
// Reemplazar corriendo, contra un environment real con la lista `Items` ya
// creada (ver quickstart.md):
//   pac code add-data-source -a sharepoint -t Items
//   pac code generate
//
// El GUID real de la lista y los nombres internos de columna se confirman al
// generar contra el environment real y probablemente cambien.

export interface ItemsModel {
  /** Id numérico nativo del list item de SharePoint. */
  Id: number
  Title: string
  Description: string | null
  /** Choice: 1 = Pendiente, 2 = En Progreso, 3 = Completado (placeholder, igual que en 001). */
  Status: number
  /** Texto multilínea con el JSON serializado de AssignedPerson (ver research.md §4). */
  AssignedTo: string | null
  /** Texto multilínea con el JSON serializado de AssignedPerson[] (ver research.md §4). */
  Collaborators: string | null
  /** Fecha ISO (solo fecha, sin hora), p. ej. "2026-09-17". */
  DueDate: string | null
  Active: boolean
}
