import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import * as ItemService from "@/services/ItemService"
import * as AttachmentService from "@/services/AttachmentService"
import type { Item, AttachmentFormState } from "@/entities"
import type { IForm } from "@/pages/items/types"

async function saveAttachments(itemId: string, attachments: AttachmentFormState[]): Promise<void> {
  for (const attachment of attachments) {
    if (attachment.status === "new" && attachment.file) {
      await AttachmentService.uploadAttachment(itemId, attachment.file)
    } else if (attachment.status === "deleted") {
      await AttachmentService.deleteAttachment(itemId, attachment.name)
    }
  }
}

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
    mutationFn: async ({ input, attachments }: { input: IForm; attachments: AttachmentFormState[] }) => {
      const item = await ItemService.create(input)
      // En creación no puede haber adjuntos "deleted" (todavía no existían).
      await saveAttachments(item.id, attachments)
      return item
    },
    onSuccess: (item: Item) => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      queryClient.invalidateQueries({ queryKey: ["items", item.id, "attachments"] })
      toast.success("Item creado correctamente")
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      input,
      attachments,
    }: {
      id: string
      input: IForm
      attachments: AttachmentFormState[]
    }) => {
      const item = await ItemService.update(id, input)
      await saveAttachments(id, attachments)
      return item
    },
    onSuccess: (_updated: Item, variables) => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      queryClient.invalidateQueries({ queryKey: ["items", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["items", variables.id, "attachments"] })
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
