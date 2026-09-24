import { useEffect, useRef, useState } from "react"
import * as PeopleService from "@/services/PeopleService"
import type { AssignedPerson } from "@/entities"

const DEBOUNCE_MS = 250
const MIN_CHARS = 3

/**
 * Búsqueda de personas con debounce y control de concurrencia (requestIdRef):
 * una respuesta tardía de una búsqueda vieja nunca pisa resultados de una
 * búsqueda más nueva (FR-013, research.md §6). No usa Tanstack Query — ver
 * research.md §6 para el porqué.
 */
export function usePeopleSearch(query: string) {
  const [results, setResults] = useState<AssignedPerson[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < MIN_CHARS) {
      requestIdRef.current += 1
      setResults([])
      setIsSearching(false)
      setError(null)
      return
    }

    const timeoutId = setTimeout(() => {
      const requestId = ++requestIdRef.current
      setIsSearching(true)
      PeopleService.searchUsers(trimmed)
        .then((people) => {
          if (requestId !== requestIdRef.current) return // respuesta obsoleta, se descarta
          setResults(people)
          setError(null)
        })
        .catch((err: Error) => {
          if (requestId !== requestIdRef.current) return
          setError(err)
          setResults([])
        })
        .finally(() => {
          if (requestId !== requestIdRef.current) return
          setIsSearching(false)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeoutId)
  }, [query])

  return { results, isSearching, error }
}
