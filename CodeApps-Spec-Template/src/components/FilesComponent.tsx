import { useRef } from "react"
import { Paperclip, RotateCcw, Trash2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { nextAttachmentInternalId, type AttachmentFormState } from "@/entities"

interface FilesComponentProps {
  value: AttachmentFormState[]
  onChange: (next: AttachmentFormState[]) => void
  disabled?: boolean
}

/**
 * Componente genérico y controlado de adjuntos (principio 4.4 — no conoce la
 * entidad Item). Upload/delete no ocurren acá: solo mantiene estado local y
 * notifica cambios vía onChange; la persistencia ocurre al guardar el
 * formulario que lo contiene (ver contracts/attachments.md, research.md §8).
 */
export function FilesComponent({ value, onChange, disabled }: FilesComponentProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    const additions: AttachmentFormState[] = []
    let internalId = nextAttachmentInternalId(value)
    for (const file of Array.from(files)) {
      additions.push({ internalId, name: file.name, url: "", status: "new", file })
      internalId += 1
    }
    onChange([...value, ...additions])
    if (inputRef.current) inputRef.current.value = ""
  }

  function removeNew(internalId: number) {
    onChange(value.filter((a) => a.internalId !== internalId))
  }

  function markDeleted(internalId: number) {
    onChange(value.map((a) => (a.internalId === internalId ? { ...a, status: "deleted" } : a)))
  }

  function undoDelete(internalId: number) {
    onChange(value.map((a) => (a.internalId === internalId ? { ...a, status: "existing" } : a)))
  }

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin adjuntos.</p>
      ) : (
        <ul className="space-y-1">
          {value.map((attachment) => (
            <li
              key={attachment.internalId}
              className={cn(
                "flex items-center gap-2 text-sm",
                attachment.status === "deleted" && "text-muted-foreground line-through"
              )}
            >
              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
              {attachment.status === "new" ? (
                <span className="flex-1">
                  {attachment.name} <span className="text-xs text-muted-foreground">(pendiente de subir)</span>
                </span>
              ) : (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 underline underline-offset-2"
                >
                  {attachment.name}
                </a>
              )}

              {attachment.status === "new" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => removeNew(attachment.internalId)}
                  aria-label={`Quitar ${attachment.name}`}
                >
                  <X className="size-3.5" />
                </Button>
              )}
              {attachment.status === "existing" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => markDeleted(attachment.internalId)}
                  aria-label={`Eliminar ${attachment.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
              {attachment.status === "deleted" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => undoDelete(attachment.internalId)}
                  aria-label={`Deshacer eliminación de ${attachment.name}`}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <Upload className="size-3.5" />
          Agregar archivo
        </Button>
      </div>
    </div>
  )
}
