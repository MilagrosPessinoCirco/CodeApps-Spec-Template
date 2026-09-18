import type { ItemsModel } from "@/generated"

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

export class Item {
  id: string
  title: string
  description: string | null
  status: ItemStatus
  assignedTo: string | null
  dueDate: Date | null
  active: boolean

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- principio 3: el constructor recibe el dato crudo del SDK generado
  constructor(raw: any) {
    this.id = raw.cr123_itemsid
    this.title = raw.cr123_title
    this.description = raw.cr123_description ?? null
    this.status = STATUS_BY_CHOICE[raw.cr123_status] ?? "Pendiente"
    this.assignedTo = raw.cr123_assignedto ?? null
    this.dueDate = raw.cr123_duedate ? new Date(raw.cr123_duedate) : null
    this.active = raw.cr123_active ?? true
  }

  toRecord(): Partial<ItemsModel> {
    return {
      cr123_title: this.title,
      cr123_description: this.description,
      cr123_status: CHOICE_BY_STATUS[this.status],
      cr123_assignedto: this.assignedTo,
      cr123_duedate: this.dueDate ? this.dueDate.toISOString().slice(0, 10) : null,
      cr123_active: this.active,
    }
  }

  /** Construye un Item nuevo (sin id) a partir de campos de dominio, para create/update. */
  static create(fields: {
    title: string
    description: string | null
    status: ItemStatus
    assignedTo: string | null
    dueDate: Date | null
  }): Item {
    const item = new Item({})
    item.title = fields.title
    item.description = fields.description
    item.status = fields.status
    item.assignedTo = fields.assignedTo
    item.dueDate = fields.dueDate
    item.active = true
    return item
  }
}
