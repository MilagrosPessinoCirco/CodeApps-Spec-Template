import { useRef, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { FilesComponent } from "@/components/FilesComponent"
import { PeoplePicker } from "@/components/PeoplePicker"
import { useCreateItem, useItem, useUpdateItem } from "@/hooks/useItems"
import { useAttachments } from "@/hooks/useAttachments"
import { emptyErrors, validateForm } from "./helpers"
import type { IForm } from "./types"
import type { AssignedPerson } from "@/entities"

const EMPTY_FORM: IForm = {
  title: "",
  description: "",
  status: "",
  assignedTo: null,
  collaborators: [],
  dueDate: null,
  attachments: [],
}

export default function ItemForm() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const navigate = useNavigate()

  const { data: existingItem } = useItem(id ?? "")
  const { data: existingAttachments } = useAttachments(id ?? "")
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()

  const [formData, setFormData] = useState<IForm>(EMPTY_FORM)
  const [errors, setErrors] = useState(emptyErrors())
  const prevItemIdRef = useRef<string | undefined>(undefined)
  const prevAttachmentsItemIdRef = useRef<string | undefined>(undefined)

  // Reset sincrónico al llegar el Item a editar, sin useEffect (principio 6 de la constitution)
  if (existingItem && prevItemIdRef.current !== existingItem.id) {
    prevItemIdRef.current = existingItem.id
    setFormData((prev) => ({
      ...prev,
      title: existingItem.title,
      description: existingItem.description ?? "",
      status: existingItem.status,
      assignedTo: existingItem.assignedTo,
      collaborators: existingItem.collaborators,
      dueDate: existingItem.dueDate,
    }))
    setErrors(emptyErrors())
  }

  // Sembrado sincrónico de adjuntos existentes al llegar (US1), mismo patrón que arriba
  if (existingAttachments && prevAttachmentsItemIdRef.current !== id) {
    prevAttachmentsItemIdRef.current = id
    setFormData((prev) => ({
      ...prev,
      attachments: existingAttachments.map((attachment, index) => ({
        ...attachment,
        internalId: index + 1,
        status: "existing" as const,
      })),
    }))
  }

  function handleFieldChange<K extends keyof IForm>(field: K, value: IForm[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === "title" || field === "status") {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const [validationErrors, isValid] = validateForm(formData)
    setErrors(validationErrors)
    if (!isValid) return

    if (isEditMode && id) {
      updateItem.mutate(
        { id, input: formData, attachments: formData.attachments },
        { onSuccess: () => navigate("/items") }
      )
    } else {
      createItem.mutate({ input: formData, attachments: formData.attachments }, { onSuccess: () => navigate("/items") })
    }
  }

  const isSaving = createItem.isPending || updateItem.isPending

  return (
    <div className="p-6 max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">{isEditMode ? "Editar Item" : "Nuevo Item"}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleFieldChange("title", e.target.value)}
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => handleFieldChange("status", value as IForm["status"])}
          >
            <SelectTrigger id="status" aria-invalid={!!errors.status} className="w-full">
              <SelectValue placeholder="Selecciona un status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
              <SelectItem value="En Progreso">En Progreso</SelectItem>
              <SelectItem value="Completado">Completado</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
        </div>

        <div className="space-y-2">
          <Label>AssignedTo</Label>
          <PeoplePicker
            mode="single"
            value={formData.assignedTo}
            onChange={(value) => handleFieldChange("assignedTo", value as AssignedPerson | null)}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-2">
          <Label>Collaborators</Label>
          <PeoplePicker
            mode="multiple"
            value={formData.collaborators}
            onChange={(value) => handleFieldChange("collaborators", (value as AssignedPerson[]) ?? [])}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-2">
          <Label>DueDate</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button" className="w-full justify-start font-normal">
                <CalendarIcon className="mr-2 size-4" />
                {formData.dueDate ? format(formData.dueDate, "PPP") : "Sin fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.dueDate ?? undefined}
                onSelect={(date) => handleFieldChange("dueDate", date ?? null)}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Adjuntos</Label>
          <FilesComponent
            value={formData.attachments}
            onChange={(next) => handleFieldChange("attachments", next)}
            disabled={isSaving}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/items")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
