import { useState } from "react"
import { X } from "lucide-react"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { usePeopleSearch } from "@/hooks/usePeopleSearch"
import { dedupKey, getInitials, type AssignedPerson } from "@/entities"

interface PeoplePickerProps {
  mode: "single" | "multiple"
  value: AssignedPerson | AssignedPerson[] | null
  onChange: (next: AssignedPerson | AssignedPerson[] | null) => void
  disabled?: boolean
}

/**
 * Componente genérico y controlado de selección de personas (principio 4.4 —
 * no conoce la entidad Item). Busca contra Office 365 Users vía
 * usePeopleSearch; ver contracts/people-picker.md.
 */
export function PeoplePicker({ mode, value, onChange, disabled }: PeoplePickerProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const { results, isSearching, error } = usePeopleSearch(query)

  const selected: AssignedPerson[] =
    mode === "single" ? (value ? [value as AssignedPerson] : []) : ((value as AssignedPerson[]) ?? [])

  function handleSelect(person: AssignedPerson) {
    setQuery("")
    setOpen(false)

    if (mode === "single") {
      onChange(person) // reemplaza la selección anterior (FR-018)
      return
    }

    const alreadySelected = selected.some((p) => dedupKey(p) === dedupKey(person))
    if (alreadySelected) return // deduplicación case-insensitive por claims/email (FR-017)
    onChange([...selected, person])
  }

  function handleRemove(person: AssignedPerson) {
    if (mode === "single") {
      onChange(null)
      return
    }
    onChange(selected.filter((p) => dedupKey(p) !== dedupKey(person)))
  }

  // En modo single, una vez hay una persona seleccionada, el input de búsqueda
  // se oculta (el chip ocupa su lugar); en modo multiple siempre queda visible.
  const showInput = mode === "multiple" || selected.length === 0
  const trimmedQuery = query.trim()

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((person) => (
            <span
              key={dedupKey(person)}
              className="flex items-center gap-1.5 rounded-full border bg-muted px-2 py-1 text-xs"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {getInitials(person.displayName)}
              </span>
              {person.displayName}
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemove(person)}
                aria-label={`Quitar ${person.displayName}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {showInput && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverAnchor asChild>
            <Input
              value={query}
              disabled={disabled}
              placeholder="Buscar persona..."
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
            />
          </PopoverAnchor>
          <PopoverContent
            align="start"
            className="w-72 p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command shouldFilter={false}>
              <CommandList>
                {trimmedQuery.length < 3 ? (
                  <CommandEmpty>Escribe al menos 3 caracteres para buscar.</CommandEmpty>
                ) : error ? (
                  <CommandEmpty>Error al buscar, intenta de nuevo.</CommandEmpty>
                ) : isSearching ? (
                  <CommandEmpty>Buscando...</CommandEmpty>
                ) : results.length === 0 ? (
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {results.map((person) => (
                      <CommandItem
                        key={dedupKey(person)}
                        value={dedupKey(person)}
                        onSelect={() => handleSelect(person)}
                      >
                        <span>{person.displayName}</span>
                        <span className="ml-1 text-xs text-muted-foreground">{person.email}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
