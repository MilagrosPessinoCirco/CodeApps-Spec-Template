import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import * as ItemService from "@/services/ItemService"
import type { Item } from "@/entities"
import type { IForm } from "@/pages/items/types"

export function useItems(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false

  return useQuery({
    queryKey: ["items", { includeInactive }],
    queryFn: () => (includeInactive ? ItemService.listAll() : ItemService.listActive()),
  })
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ["items", id],
    queryFn: () => ItemService.getById(id),
    enabled: !!id,
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IForm) => ItemService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      toast.success("Item creado correctamente")
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: IForm }) => ItemService.update(id, input),
    onSuccess: (_updated: Item, variables) => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      queryClient.invalidateQueries({ queryKey: ["items", variables.id] })
      toast.success("Item actualizado correctamente")
    },
  })
}

export function useDeactivateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => ItemService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      toast.success("Item desactivado correctamente")
    },
  })
}
