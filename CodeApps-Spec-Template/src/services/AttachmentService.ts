import { getClient } from "@microsoft/power-apps/data"
import { fileToBase64 } from "@/lib/files"
import type { Attachment } from "@/entities"

const TABLE_NAME = "Items"

// Debe coincidir con el GUID real de la lista `Items` (mismo valor que
// `tableId` en src/generated/services/ItemsService.ts) una vez reemplazado
// el STUB por la generación real (ver quickstart.md).
const LIST_ID = "00000000-0000-0000-0000-000000000000"

/**
 * El codegen del conector de SharePoint no incluye el endpoint nativo de
 * adjuntos (AttachmentFiles) — se registra a mano en un `dataSourcesInfo`
 * propio, separado de `src/generated/` (principio 2.2, ver research.md §2).
 */
function registerAttachmentOperations(listId: string) {
  return {
    [TABLE_NAME]: {
      tableId: listId,
      primaryKey: "Id",
      dataSourceType: "sharepoint",
      apis: {
        GetAttachments: {
          path: `_api/web/lists(guid'${listId}')/items({itemId})/AttachmentFiles`,
          method: "GET",
          parameters: [{ name: "itemId", in: "path", required: true, type: "string" }],
        },
        AddAttachment: {
          path: `_api/web/lists(guid'${listId}')/items({itemId})/AttachmentFiles/add(FileName='{fileName}')`,
          method: "POST",
          parameters: [
            { name: "itemId", in: "path", required: true, type: "string" },
            { name: "fileName", in: "path", required: true, type: "string" },
            { name: "body", in: "body", required: true, type: "string", format: "binary" },
          ],
        },
        DeleteAttachment: {
          path: `_api/web/lists(guid'${listId}')/items({itemId})/AttachmentFiles('{fileName}')`,
          method: "DELETE",
          parameters: [
            { name: "itemId", in: "path", required: true, type: "string" },
            { name: "fileName", in: "path", required: true, type: "string" },
          ],
        },
      },
    },
  }
}

const client = getClient(registerAttachmentOperations(LIST_ID))

interface SharePointAttachment {
  FileName: string
  ServerRelativeUrl: string
}

function toAttachment(raw: SharePointAttachment): Attachment {
  return { name: raw.FileName, url: raw.ServerRelativeUrl }
}

export async function listAttachments(itemId: string): Promise<Attachment[]> {
  const result = await client.executeAsync<Record<string, unknown>, SharePointAttachment[]>({
    connectorOperation: {
      tableName: TABLE_NAME,
      operationName: "GetAttachments",
      parameters: { itemId },
    },
  })
  if (!result.success) throw result.error ?? new Error(`Error al obtener adjuntos del Item ${itemId}`)
  return result.data.map(toAttachment)
}

export async function uploadAttachment(itemId: string, file: File): Promise<Attachment> {
  const body = await fileToBase64(file)
  const result = await client.executeAsync<Record<string, unknown>, SharePointAttachment>({
    connectorOperation: {
      tableName: TABLE_NAME,
      operationName: "AddAttachment",
      parameters: { itemId, fileName: file.name, body },
    },
  })
  if (!result.success) throw result.error ?? new Error(`Error al subir el adjunto ${file.name}`)
  return toAttachment(result.data)
}

export async function deleteAttachment(itemId: string, fileName: string): Promise<void> {
  const result = await client.executeAsync<Record<string, unknown>, void>({
    connectorOperation: {
      tableName: TABLE_NAME,
      operationName: "DeleteAttachment",
      parameters: { itemId, fileName },
    },
  })
  // Un adjunto que ya no existe (borrado desde otra sesión) se trata como
  // éxito idempotente, no como error de guardado (edge case de spec.md).
  if (!result.success && !isAlreadyDeleted(result.error)) {
    throw result.error ?? new Error(`Error al eliminar el adjunto ${fileName}`)
  }
}

function isAlreadyDeleted(error: unknown): boolean {
  const status = (error as { status?: number } | undefined)?.status
  return status === 404
}
