# Quickstart: Adjuntos por Item y People Picker (Patrones de Referencia)

Guía para levantar y validar manualmente los dos patrones ampliados end-to-end. No reemplaza `tasks.md`; esto es la guía de **validación** una vez implementado.

## Prerrequisitos

1. Todo lo de [001 quickstart](../001-datasource-example/quickstart.md#prerrequisitos): environment de Power Platform con Code Apps habilitado, `pac code init` corrido localmente, `npm install`.
2. Una **lista de SharePoint** llamada `Items` con las mismas columnas que 001 (Title, Description, Status, DueDate, Active) más `AssignedTo` y `Collaborators` como columnas de texto multilínea (ver `research.md` §1 y §4) — reemplaza a la tabla de Dataverse de 001 para este patrón ampliado.
3. El conector **Office 365 Users** disponible en el environment (viene preinstalado en la mayoría de los tenants de Power Platform).
4. El GUID de la lista `Items` (`listId`), visible en la URL de configuración de la lista en SharePoint (Configuración de lista → la URL contiene `List=%7B...%7D`).

## Setup de las fuentes de datos (una sola vez por environment)

```powershell
pac code add-data-source -a sharepoint -t Items
pac code add-data-source -a shared_office365users
pac code generate
```

Esto agrega/actualiza `src/generated/` con los tipos y hooks para la lista `Items` y el conector Office 365 Users. **No editar `src/generated/` a mano** (principio 2.2) — las operaciones de adjuntos se registran aparte, en `src/services/AttachmentService.ts` (ver `research.md` §2).

## Levantar la app

```powershell
npm run dev
```

Abrir la URL local indicada por Vite y navegar a `/items`.

## Escenarios de validación manual

Cada escenario corresponde a una user story de `spec.md`.

### 1. Ver adjuntos existentes (US1 / P1)

1. Con un Item que ya tiene 1-2 adjuntos cargados directamente en SharePoint, abrir su formulario de edición.
2. **Esperado**: la lista de adjuntos muestra el nombre de cada uno; hacer clic abre/descarga el archivo.
3. Abrir el formulario de un Item sin adjuntos.
4. **Esperado**: mensaje claro de "sin adjuntos" en vez de una lista vacía sin contexto.

### 2. Agregar adjuntos nuevos (US2 / P2)

1. En el formulario de un Item, seleccionar 1-2 archivos nuevos.
2. **Esperado**: aparecen en la lista marcados como "pendiente de subir", sin ninguna llamada de red todavía.
3. Guardar el formulario.
4. **Esperado**: toast de éxito; al reabrir el formulario del mismo Item, los archivos aparecen como adjuntos existentes (SC-002, <5s).
5. Repetir seleccionando un archivo y quitándolo antes de guardar.
6. **Esperado**: el archivo nunca se sube (verificar en SharePoint que no existe como adjunto).

### 3. Eliminar un adjunto existente (US3 / P3)

1. En el formulario de un Item con adjuntos, marcar uno para eliminar.
2. **Esperado**: se muestra tachado/distinto visualmente, pero sigue existiendo hasta guardar.
3. Revertir la marca antes de guardar.
4. **Esperado**: el adjunto vuelve a su estado normal; al guardar, sigue existiendo en SharePoint.
5. Marcar un adjunto para eliminar y guardar.
6. **Esperado**: el adjunto deja de estar asociado al Item (verificar directamente en SharePoint).

### 4. Buscar y asignar una persona (US4 / P1)

1. En el campo AssignedTo, escribir 1-2 caracteres del nombre de una persona real del directorio.
2. **Esperado**: no se dispara ninguna búsqueda (FR-011).
3. Escribir un tercer carácter y esperar un instante.
4. **Esperado**: aparecen resultados coincidentes en menos de 1 segundo (SC-003).
5. Seleccionar una persona.
6. **Esperado**: aparece como chip con iniciales; el input de búsqueda se limpia.
7. Escribir una búsqueda, cambiarla rápidamente por otra antes de que responda.
8. **Esperado**: solo se muestran los resultados de la búsqueda más reciente (SC-006), sin importar el orden de llegada de las respuestas.
9. Buscar un texto sin coincidencias.
10. **Esperado**: mensaje claro de "sin resultados".
11. Guardar el Item y reabrir su edición.
12. **Esperado**: la persona asignada se muestra correctamente (displayName + chip).

### 5. Asignar varias personas con deduplicación (US5 / P4)

1. En el campo Collaborators (modo múltiple), buscar y seleccionar a una persona.
2. **Esperado**: aparece como chip.
3. Buscar y seleccionar a una segunda persona distinta.
4. **Esperado**: ambos chips visibles simultáneamente.
5. Buscar de nuevo a la primera persona y seleccionarla otra vez.
6. **Esperado**: no se duplica (SC-005) — el chip sigue apareciendo una sola vez.

### 6. Quitar una persona seleccionada (US6 / P5)

1. Con una o más personas seleccionadas (AssignedTo o Collaborators), hacer clic en el botón "×" de un chip.
2. **Esperado**: esa persona deja de estar seleccionada; las demás (si las hay) no se ven afectadas.

## Referencias

- Contrato de adjuntos: [contracts/attachments.md](./contracts/attachments.md)
- Contrato de people picker: [contracts/people-picker.md](./contracts/people-picker.md)
- Modelo de datos: [data-model.md](./data-model.md)
- Decisiones técnicas: [research.md](./research.md)
