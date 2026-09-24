export interface Attachment {
  /** FileName de SharePoint. */
  name: string
  /** ServerRelativeUrl de SharePoint. */
  url: string
}

/**
 * Estado de un adjunto mientras el formulario está abierto (principio 4.3 de
 * la constitution: InternalId estable para arrays paralelos, nunca índice
 * posicional; "deleted" marca el borrado sin filtrar del array hasta guardar).
 */
export interface AttachmentFormState extends Attachment {
  internalId: number
  status: "existing" | "new" | "deleted"
  /** Solo presente cuando status === "new"; se descarta después de subir. */
  file?: File
}

/** Próximo InternalId estable — nunca usar array.length ni índice posicional. */
export function nextAttachmentInternalId(items: AttachmentFormState[]): number {
  return Math.max(0, ...items.map((item) => item.internalId)) + 1
}
