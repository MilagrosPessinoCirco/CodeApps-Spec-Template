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
import { useCreateItem, useItem, useUpdateItem } from "@/hooks/useItems"
import { emptyErrors, validateForm } from "./helpers"
import type { IForm } from "./types"

const EMPTY_FORM: IForm = {
  title: "",
  description: "",
  status: "",
  assignedTo: "",
  dueDate: null,
}

export default function ItemForm() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const navigate = useNavigate()

  const { data: existingItem } = useItem(id ?? "")
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()

  const [formData, setFormData] = useState<IForm>(EMPTY_FORM)
  const [errors, setErrors] = useState(emptyErrors())
  const prevItemIdRef = useRef<string | undefined>(undefined)

  // Reset sincrónico al llegar el Item a editar, sin useEffect (principio 6 de la constitution)
  if (existingItem && prevItemIdRef.current !== existingItem.id) {
    prevItemIdRef.current = existingItem.id
    setFormData({
      title: existingItem.title,
      description: existingItem.description ?? "",
      status: existingItem.status,
      assignedTo: existingItem.assignedTo ?? "",
      dueDate: existingItem.dueDate,
    })
    setErrors(emptyErrors())
  }

  function handleFieldChange(field: keyof IForm, value: string | Date | null) {
    setFormData((prev) => ({ ...prev, [field]: value }) as IForm)
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
      updateItem.mutate({ id, input: formData }, { onSuccess: () => navigate("/items") })
    } else {
      createItem.mutate(formData, { onSuccess: () => navigate("/items") })
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
          <Select value={formData.status} onValueChange={(value) => handleFieldChange("status", value)}>
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
          <Label htmlFor="assignedTo">AssignedTo</Label>
          <Input
            id="assignedTo"
            value={formData.assignedTo}
            onChange={(e) => handleFieldChange("assignedTo", e.target.value)}
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
