import type { AssignedPerson, AttachmentFormState, ItemStatus } from "@/entities"

export interface IForm {
  title: string
  description: string
  status: ItemStatus | ""
  assignedTo: AssignedPerson | null
  collaborators: AssignedPerson[]
  dueDate: Date | null
  attachments: AttachmentFormState[]
}

export interface IFormErrors {
  title: string
  status: string
}
