import type { ItemsModel } from "@/generated"
import type { AssignedPerson } from "./AssignedPerson"

export type ItemStatus = "Pendiente" | "En Progreso" | "Completado"

const STATUS_BY_CHOICE: Record<number, ItemStatus> = {
  1: "Pendiente",
  2: "En Progreso",
  3: "Completado",
}

const CHOICE_BY_STATUS: Record<ItemStatus, number> = {
  Pendiente: 1,
  "En Progreso": 2,
  Completado: 3,
}

/** Parseo defensivo de una columna de texto con JSON — inválido/vacío se trata como null. */
function parseAssignedPerson(raw: string | null): AssignedPerson | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AssignedPerson
  } catch {
    return null
  }
}

/** Parseo defensivo de una columna de texto con JSON — inválido/vacío se trata como []. */
function parseAssignedPeople(raw: string | null): AssignedPerson[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AssignedPerson[]) : []
  } catch {
    return []
  }
}

export class Item {
  id: string
  title: string
  description: string | null
  status: ItemStatus
  assignedTo: AssignedPerson | null
  collaborators: AssignedPerson[]
  dueDate: Date | null
  active: boolean

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- principio 3: el constructor recibe el dato crudo del SDK generado
  constructor(raw: any) {
    this.id = raw.Id !== undefined && raw.Id !== null ? String(raw.Id) : ""
    this.title = raw.Title
    this.description = raw.Description ?? null
    this.status = STATUS_BY_CHOICE[raw.Status] ?? "Pendiente"
    this.assignedTo = parseAssignedPerson(raw.AssignedTo ?? null)
    this.collaborators = parseAssignedPeople(raw.Collaborators ?? null)
    this.dueDate = raw.DueDate ? new Date(raw.DueDate) : null
    this.active = raw.Active ?? true
  }

  toRecord(): Partial<ItemsModel> {
    return {
      Title: this.title,
      Description: this.description,
      Status: CHOICE_BY_STATUS[this.status],
      AssignedTo: this.assignedTo ? JSON.stringify(this.assignedTo) : null,
      Collaborators: this.collaborators.length > 0 ? JSON.stringify(this.collaborators) : null,
      DueDate: this.dueDate ? this.dueDate.toISOString().slice(0, 10) : null,
      Active: this.active,
    }
  }

  /** Construye un Item nuevo (sin id) a partir de campos de dominio, para create/update. */
  static create(fields: {
    title: string
    description: string | null
    status: ItemStatus
    assignedTo: AssignedPerson | null
    collaborators: AssignedPerson[]
    dueDate: Date | null
  }): Item {
    const item = new Item({})
    item.title = fields.title
    item.description = fields.description
    item.status = fields.status
    item.assignedTo = fields.assignedTo
    item.collaborators = fields.collaborators
    item.dueDate = fields.dueDate
    item.active = true
    return item
  }
}
