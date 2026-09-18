import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDeactivateItem, useItems } from "@/hooks/useItems"
import type { Item } from "@/entities"

function sortableHeader(label: string) {
  return ({ column }: { column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => string | false } }) => (
    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
      {label}
      <ArrowUpDown className="size-3.5" />
    </Button>
  )
}

export default function ItemList() {
  const [includeInactive, setIncludeInactive] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [itemToDeactivate, setItemToDeactivate] = useState<Item | null>(null)

  const { data: items, isLoading } = useItems({ includeInactive })
  const deactivateItem = useDeactivateItem()

  const columns = useMemo<ColumnDef<Item>[]>(
    () => [
      {
        accessorKey: "title",
        header: sortableHeader("Title"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span>{row.original.title}</span>
            {!row.original.active && <Badge variant="secondary">Inactivo</Badge>}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: sortableHeader("Status"),
      },
      {
        accessorKey: "assignedTo",
        header: sortableHeader("AssignedTo"),
        cell: ({ row }) => row.original.assignedTo ?? "sin asignar",
      },
      {
        accessorKey: "dueDate",
        header: sortableHeader("DueDate"),
        cell: ({ row }) => (row.original.dueDate ? row.original.dueDate.toLocaleDateString() : "sin fecha"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/items/${row.original.id}/edit`}>Editar</Link>
            </Button>
            {row.original.active && (
              <Button variant="outline" size="sm" onClick={() => setItemToDeactivate(row.original)}>
                Desactivar
              </Button>
            )}
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Items</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={includeInactive}
              onCheckedChange={(checked) => setIncludeInactive(checked === true)}
            />
            Ver inactivos
          </label>
          <Button asChild>
            <Link to="/items/new">Nuevo Item</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !items || items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay Items {includeInactive ? "" : "activos "}para mostrar.
        </p>
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className={!row.original.active ? "opacity-60" : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!itemToDeactivate} onOpenChange={(open) => !open && setItemToDeactivate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar Item</DialogTitle>
            <DialogDescription>
              ¿Confirmas que quieres desactivar "{itemToDeactivate?.title}"? El registro no se elimina, solo deja de
              aparecer en el listado por defecto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToDeactivate(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!itemToDeactivate) return
                deactivateItem.mutate(itemToDeactivate.id)
                setItemToDeactivate(null)
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
