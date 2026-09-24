/** Convierte un File a base64 (sin el prefijo `data:...;base64,`), para AddAttachment. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.slice(result.indexOf(",") + 1)
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error("Error al leer el archivo"))
    reader.readAsDataURL(file)
  })
}
