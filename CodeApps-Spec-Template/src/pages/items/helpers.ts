import type { ItemStatus } from "@/entities"
import type { IForm, IFormErrors } from "./types"

const VALID_STATUSES: ItemStatus[] = ["Pendiente", "En Progreso", "Completado"]

export function emptyErrors(): IFormErrors {
  return { title: "", status: "" }
}

export function validateForm(formData: IForm): [IFormErrors, boolean] {
  const errors = emptyErrors()

  if (!formData.title.trim()) {
    errors.title = "Title es requerido"
  }

  if (!formData.status || !VALID_STATUSES.includes(formData.status)) {
    errors.status = "Status es requerido"
  }

  const isValid = !errors.title && !errors.status
  return [errors, isValid]
}
