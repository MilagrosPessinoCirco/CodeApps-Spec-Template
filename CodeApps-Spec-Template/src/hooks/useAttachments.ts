import { useQuery } from "@tanstack/react-query"
import * as AttachmentService from "@/services/AttachmentService"

export function useAttachments(itemId: string) {
  return useQuery({
    queryKey: ["items", itemId, "attachments"],
    queryFn: () => AttachmentService.listAttachments(itemId),
    enabled: !!itemId,
  })
}
