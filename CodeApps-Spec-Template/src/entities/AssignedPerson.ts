export interface AssignedPerson {
  displayName: string
  email: string
  /** Formato de claims que espera SharePoint: i:0#.f|membership|<userPrincipalName en minúsculas> */
  claims: string
}

/** Iniciales para el avatar del chip, a partir del nombre para mostrar. */
export function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0]![0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : ""
  return (first + last).toUpperCase()
}

/** Clave de deduplicación case-insensitive: claims si existe, si no email (FR-017). */
export function dedupKey(person: AssignedPerson): string {
  return (person.claims || person.email).toLowerCase()
}
