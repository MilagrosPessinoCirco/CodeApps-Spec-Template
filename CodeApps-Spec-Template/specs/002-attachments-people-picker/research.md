# Research: Adjuntos por Item y People Picker (Patrones de Referencia)

## 1. Fuente de datos para este patrón ampliado

**Decision**: Para este ejemplo ampliado, `Items` se modela como una **lista de SharePoint** en lugar de la tabla de Dataverse usada en [001](../001-datasource-example/research.md#1-fuente-de-datos-y-generación-de-tipos). El identificador de cada Item pasa a ser el `Id` numérico nativo del list item de SharePoint (expuesto como `string` en la entidad, igual que en 001, para no romper el contrato de `Item.id: string`).

**Rationale**: El endpoint que el patrón necesita documentar (`_api/web/lists(guid'{listId}')/items({itemId})/AttachmentFiles`) es parte de la REST API de SharePoint y no tiene equivalente en Dataverse. Para que el ejemplo sea honesto y ejecutable, `Items` tiene que vivir físicamente en la misma lista de SharePoint contra la que se llaman esas operaciones — no alcanza con "simular" el patrón contra una tabla de Dataverse. La constitution (principio 2.1) ya contempla SharePoint como fuente de datos válida "según el proyecto", así que este cambio no viola ningún principio, solo elige la otra opción soportada.

**Alternatives considered**:
- Mantener `Items` en Dataverse y usar el file/image column nativo (`uploadFileToRecord`/`downloadFileFromRecord`/`deleteFileOrImageFromRecord`, ya expuestos por el SDK `@microsoft/power-apps/data`) — descartado porque esas columnas son de **un solo archivo por columna**, no una colección de adjuntos con nombre y URL propios como pide el patrón.
- Mantener `Items` en Dataverse y usar la entidad de Notes/anotaciones (`annotation`) de Dataverse para adjuntos — descartado porque requeriría agregar una segunda tabla generada y un segundo service solo para resolver adjuntos, además de que el usuario pidió explícitamente el flujo de REST API de SharePoint, no el de anotaciones de Dataverse.
- Mantener `Items` en Dataverse y usar una lista de SharePoint **paralela** solo para adjuntos, vinculada por un id externo — descartado por ser complejidad innecesaria para un ejemplo de referencia: agrega un segundo par service/hook y una relación 1:1 que no aporta nada al patrón que se quiere enseñar.

**Consecuencia documentada**: Este cambio hace que `src/generated/services/ItemsService.ts` y `ItemsModel.ts` (que en este repo son STUBs hand-authored, no salida real de `pac code generate` — ver nota en esos archivos) se actualicen para reflejar `dataSourceType: "sharepoint"` en vez de `"dataverse"`. Un equipo real correría `pac code add-data-source -a sharepoint` + `pac code generate` contra su propio environment; eso no se puede ejecutar en este entorno de desarrollo del ejemplo (mismo prerequisito documentado en 001 §1), así que se deja como paso manual en `quickstart.md`.

## 2. Registro dinámico de operaciones de adjuntos (`registerAttachmentOperations`)

**Decision**: `AttachmentService.ts` define su propio fragmento de `dataSourcesInfo` (misma forma estructural que usa el `ItemsService` generado: `Record<string, IDataSourceInfo>`, ver `node_modules/@microsoft/power-apps/dist/internal/data/core/types/index.d.ts`), agregando a mano tres entradas en `apis` que el codegen del conector de SharePoint no produce:

| Operación | Método | Path (relativo al sitio) |
|-----------|--------|---------------------------|
| `GetAttachments` | GET | `_api/web/lists(guid'{listId}')/items({itemId})/AttachmentFiles` |
| `AddAttachment` | POST | `_api/web/lists(guid'{listId}')/items({itemId})/AttachmentFiles/add(FileName='{fileName}')` |
| `DeleteAttachment` | DELETE | `_api/web/lists(guid'{listId}')/items({itemId})/AttachmentFiles('{fileName}')` |

Cada entrada sigue la forma real de `IApiDefinition` (`path`, `method`, `parameters: [{name, in, required, type}]`). Una vez registradas, se invocan exactamente igual que cualquier operación generada, vía `client.executeAsync({ connectorOperation: { tableName: "Items", operationName: "AddAttachment", parameters } })` sobre el `DataClient` que devuelve `getClient(dataSourcesInfo)` — el mismo mecanismo interno (`connectorDataOperationExecutor`) que usan las operaciones generadas, así que desde el resto de la app no hay diferencia entre una operación "generada" y una "registrada a mano".

**Rationale**: El conector de SharePoint que expone `pac code add-data-source` incluye las operaciones CRUD estándar sobre items de una lista, pero no expone el endpoint nativo de adjuntos (`AttachmentFiles`) porque no forma parte de la superficie estándar del conector — es una capacidad propia de la REST API de SharePoint. `executeAsync`/`connectorOperation` es el mecanismo público que el SDK ya ofrece para ejecutar operaciones "custom" contra un data source existente, así que registrar estas tres entradas es la extensión mínima y no invasiva: no requiere tocar `src/generated/`, no requiere una fuente de datos nueva, y reutiliza la misma conexión/autenticación que ya tiene la lista `Items`.

**Alternatives considered**: Usar `fetch`/`XMLHttpRequest` directo contra la REST API de SharePoint desde el navegador — descartado porque perdería el manejo de autenticación/headers que ya resuelve el conector (`x-ms-pa-client-custom-headers-options`, etc.) y rompería el principio de que toda comunicación con el backend pasa por la capa de datos del SDK (equivalente al principio 2.4, aplicado aquí a la fuente de datos en vez de a Tanstack Query).

## 3. Conversión de archivo a base64

**Decision**: `src/lib/files.ts` expone `fileToBase64(file: File): Promise<string>`, implementado con `FileReader.readAsDataURL` y recortando el prefijo `data:...;base64,` antes de devolver el string, ya que `AddAttachment` espera el contenido crudo en base64 en el body de la request.

**Rationale**: Es una utilidad genérica de navegador (no depende de ningún SDK), coherente con `src/lib/utils.ts` (que ya contiene `cn`, otro helper genérico sin estado). Vive en `lib/` y no en `AttachmentService.ts` porque cualquier otro patrón del template que necesite adjuntar binarios (no solo SharePoint) puede reutilizarla.

**Alternatives considered**: Convertir a `ArrayBuffer`/`Uint8Array` en vez de base64 — descartado porque el endpoint `AttachmentFiles/add` de SharePoint espera el body como contenido binario/base64 vía REST, no el shape que usan `uploadFileToRecord`/`downloadFileFromRecord` de Dataverse (que si trabajan con `Uint8Array`/`Blob` directo); se documenta la diferencia para que el equipo no mezcle ambos patrones por error.

## 4. `AssignedTo`, `Collaborators` y el formato de `claims`

**Decision**: `AssignedTo` pasa de texto libre a `AssignedPerson | null`, y se agrega `Collaborators: AssignedPerson[]` (opcional, default `[]`) exclusivamente para poder demostrar y validar de punta a punta el modo `multiple` del `PeoplePicker` (ver Complexity Tracking en `plan.md` — no estaba en el input original, se agrega porque FR-016/US5 exigen que el modo múltiple sea comprobable en la app real, no solo una capacidad no usada del componente). Ambos campos se guardan en la lista de SharePoint como columnas de texto (multilínea, formato JSON) que almacenan el array/objeto serializado de `AssignedPerson`, en vez de resolverse contra el campo nativo "Person or Group" de SharePoint.

```ts
interface AssignedPerson {
  displayName: string
  email: string
  claims: string // i:0#.f|membership|<userPrincipalName en minúsculas>
}
```

**Rationale**: Usar el campo nativo "Person or Group" de SharePoint requeriría resolver cada selección a un `Id` de la User Information List del sitio (típicamente vía `/_api/web/ensureuser`), un paso adicional de red por persona seleccionada que no aporta nada a lo que el patrón quiere enseñar (buscar, seleccionar, deduplicar, mostrar como chip). Guardar el objeto `{displayName, email, claims}` tal cual como texto/JSON es suficiente para que el valor se guarde, se recupere y se vuelva a mostrar correctamente, y dejar `claims` con el formato de encoding real de SharePoint (`i:0#.f|membership|<upn>`) es lo que hace que el patrón sea reutilizable el día que una feature de negocio sí necesite escribir contra el campo nativo.

**Alternatives considered**: Resolver contra el campo nativo "Person or Group" vía `ensureuser` — se documenta como próximo paso posible para quien copie el patrón (nota en `contracts/people-picker.md`), pero queda fuera de alcance de este ejemplo de referencia por la razón de arriba.

## 5. Búsqueda de personas: conector Office 365 Users

**Decision**: `PeopleService.searchUsers(query: string)` llama a la operación `searchUserV2` expuesta por el conector estándar **Office 365 Users**, agregado al proyecto con `pac code add-data-source` (acción `shared_office365users`) y generado con `pac code generate` hacia `src/generated/services/Office365UsersService.ts`. A diferencia de los adjuntos (§2), esta operación **sí** forma parte de la superficie estándar del conector (es una acción documentada de su definición OpenAPI/swagger), así que no requiere registro manual de `apis` — el codegen ya la produce. En este repo (sin environment real conectado) se deja un STUB hand-authored de ese archivo, con el mismo disclaimer que ya usa `ItemsService.ts` en 001, para que el resto del código compile y pueda ejercitarse manualmente.

**Rationale**: Es el conector estándar de Microsoft para resolver identidades de Office 365/Azure AD desde una Power Platform Code App; es exactamente lo que el input del usuario pide ("conector Office365Users.SearchUserV2") y es coherente con el principio 2.1 (conectores según el proyecto).

**Alternatives considered**: Llamar a Microsoft Graph directamente — descartado porque agrega una fuente de autenticación/autorización paralela a la que ya gestiona el conector, y el usuario pidió explícitamente el conector Office 365 Users.

## 6. Debounce y control de concurrencia en la búsqueda

**Decision**: `usePeopleSearch(query: string)` es un hook custom (no un `useQuery` de Tanstack Query) que:

1. Aplica debounce de 250ms sobre `query` antes de disparar la búsqueda.
2. No ejecuta ninguna búsqueda si el valor debounced tiene menos de 3 caracteres.
3. Mantiene un `requestIdRef` que se incrementa en cada búsqueda disparada; al recibir una respuesta, si su id no coincide con el id más reciente emitido, la respuesta se descarta sin actualizar el estado (evita que una respuesta tardía de una búsqueda vieja pise resultados de una búsqueda más nueva).

**Rationale**: Tanstack Query ya deduplica y cachea por `queryKey`, pero el requisito explícito es "descartar respuestas tardías de una búsqueda ya no vigente" en un input de tipeo libre — un caso de carrera clásico que se resuelve de forma más directa y explícita con un ref de request id que dejando que el cache de queryKey lo resuelva implícitamente (que además reintroduciría los resultados viejos al volver a escribir la misma query). El debounce en sí usa `useEffect` + `setTimeout` reaccionando a `query`, que es el uso correcto de `useEffect` (sincronizar un efecto externo — la búsqueda de red — con un valor que cambia, con `cleanup` vía `clearTimeout`). Esto **no** es el patrón que el principio 6 de la constitution advierte como peligroso: ese principio apunta puntualmente a usar `useEffect` para *resetear estado local al cambiar de ruta/id* (donde el patrón síncrono `prevIdRef` es preferible, como en `ItemForm.tsx`), no a prohibir `useEffect` para efectos legítimos como este. El `requestIdRef` es un mecanismo aparte, ortogonal al debounce, que sí evita depender de `useEffect`/estado para resolver la carrera de respuestas.

**Alternatives considered**: `useQuery` con `queryKey: ["people-search", query]` y `keepPreviousData` — descartado porque no resuelve por sí solo el control de concurrencia pedido explícitamente en el input (el usuario pidió `requestIdRef`, no depender del comportamiento de caché de Tanstack Query), y porque resultados de búsqueda interactiva no son "server state" que otras partes de la app necesiten leer o invalidar — viven y mueren dentro del campo de búsqueda.

## 7. Componentes de UI reutilizables

**Decision**: Reutilizar los componentes ya instalados en `src/components/ui/` sin agregar dependencias nuevas:

- `PeoplePicker`: `command.tsx` (`cmdk`, ya instalado) dentro de `popover.tsx` para el combobox de búsqueda-y-selección; los chips de personas seleccionadas se arman con `div`/`button` + Tailwind (iniciales calculadas del `displayName`, sin agregar `@radix-ui/react-avatar`, que no está instalado).
- `FilesComponent`: lista simple con `button`/`input[type=file]` + iconos de `lucide-react` (ya instalado) para distinguir adjunto existente / pendiente de subir / marcado para eliminar; sin dependencia de un componente de upload dedicado.

**Rationale**: El template ya trae todo lo necesario para ambos patrones sin instalar nada nuevo, igual que el criterio ya aplicado en 001 §4.

**Alternatives considered**: Instalar `npx shadcn@latest add avatar` para los chips de personas — se deja documentado como opción en `quickstart.md` por si el equipo prefiere el componente semántico dedicado, pero no es requerido para cumplir FR-014.

## 8. Guardado diferido (upload/delete al guardar, no en tiempo real)

**Decision**: `FilesComponent` es 100% controlado: mantiene únicamente estado local en memoria (`AttachmentFormState[]`, con `InternalId` por principio 4.3) y notifica los cambios vía `onChange` a `ItemForm`. Ninguna llamada de red ocurre mientras el usuario selecciona/marca archivos. Al enviar el formulario, `useCreateItem`/`useUpdateItem` — dentro del mismo flujo de guardado, después de que el Item se crea/actualiza exitosamente — recorren el array final y ejecutan `AttachmentService.uploadAttachment` para cada item con `status: "new"` y `AttachmentService.deleteAttachment` para cada item con `status: "deleted"`, antes de considerar la mutation completa (y por lo tanto, antes del toast de éxito).

**Rationale**: Es exactamente el requisito explícito del input ("Upload y delete se ejecutan al guardar, no en tiempo real") y es coherente con el principio 6 (mensajes de éxito solo dentro de `onSuccess`, nunca antes de que toda la operación haya terminado).

**Alternatives considered**: Subir/borrar cada archivo apenas el usuario lo selecciona/marca — es el comportamiento explícitamente rechazado por el input del usuario.

## 9. Estrategia de testing

**Decision**: Igual que 001 — sin framework de testing automatizado configurado. Validación manual vía los escenarios de `quickstart.md`, que recorren cada acceptance scenario de `spec.md`.

**Rationale**: Mismo razonamiento que 001 §5 — agregar un framework de testing es una decisión de alcance mayor y no fue solicitada.

**Alternatives considered**: Igual que 001 §5.
