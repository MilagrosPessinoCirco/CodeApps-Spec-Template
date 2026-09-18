import type { ItemStatus } from "@/entities"

export interface IForm {
  title: string
  description: string
  status: ItemStatus | ""
  assignedTo: string
  dueDate: Date | null
}

export interface IFormErrors {
  title: string
  status: string
}
