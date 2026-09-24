# Feature Specification: Adjuntos por Item y People Picker (Patrones de Referencia)

**Feature Branch**: `[002-attachments-people-picker]`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Ampliar el ejemplo canónico existente (specs/001-datasource-example) con dos patrones avanzados que quedan como documentación viva del template: 1. ADJUNTOS POR ITEM: El conector generado por pac code generate no soporta adjuntos. Hay que usar httpRequest contra la REST API de SharePoint. El flujo es: convertir archivo a base64 con fileToBase64(), registrar dinámicamente la operación httpRequest en dataSourcesInfo (registerAttachmentOperations) porque el codegen no la incluye, y hacer POST/GET/DELETE contra /_api/web/lists(guid'...')/items({itemId})/AttachmentFiles. Cada archivo tiene name y url. Se necesita un componente FilesComponent reutilizable que muestre adjuntos existentes, permita agregar nuevos y eliminar existentes. Upload y delete se ejecutan al guardar, no en tiempo real. 2. PEOPLE PICKER: El campo AssignedTo pasa de texto libre a un selector de personas real que busca usuarios de Office 365 via conector Office365Users.SearchUserV2. Búsqueda con debounce de 250ms, mínimo 3 caracteres, control de concurrencia con requestIdRef para evitar que respuestas tardías pisen resultados nuevos. Al seleccionar se guarda { displayName, email, claims } donde claims es i:0#.f|membership|<userPrincipalName en minúsculas> (formato que espera SharePoint). Soporta modo single y multiple. Personas seleccionadas se muestran como chips con iniciales como avatar y botón X para quitar. Deduplicación en modo multiple por claims o email case-insensitive. Ambos patrones se integran en el ItemForm.tsx existente y quedan como parte del ejemplo de referencia del template. No son features de negocio — son patrones canónicos que el equipo copia."

## User Scenarios & Testing *(mandatory)*

> **Nota de alcance**: Al igual que [001-datasource-example](../001-datasource-example/spec.md), este feature no resuelve un proceso de negocio real. Amplía el mismo ejemplo de referencia con dos patrones que el codegen estándar de `pac code generate` no cubre: adjuntos de archivo contra la REST API de SharePoint, y un selector de personas real contra el directorio de la organización. El "usuario" es cualquier desarrollador del equipo que necesita ver estos dos patrones implementados de punta a punta antes de replicarlos en su propia feature de negocio.

### User Story 1 - Ver los adjuntos existentes de un Item (Priority: P1)

Un usuario abre el formulario de edición de un Item que ya tiene archivos adjuntos y los ve listados, cada uno identificable por su nombre y accesible para abrir o descargar.

**Why this priority**: Sin poder ver los adjuntos existentes no hay forma de verificar visualmente el resultado de agregar o eliminar archivos. Es la base sobre la que se apoyan las demás historias de este patrón.

**Independent Test**: Con un Item que ya tiene adjuntos cargados directamente en la fuente de datos, se puede verificar completamente esta historia abriendo su formulario de edición y confirmando que los adjuntos aparecen listados con su nombre, sin necesitar que agregar o eliminar adjuntos esté implementado.

**Acceptance Scenarios**:

1. **Given** un Item tiene uno o más adjuntos, **When** el usuario abre su formulario de edición, **Then** ve una lista con el nombre de cada adjunto existente.
2. **Given** un Item no tiene adjuntos, **When** el usuario abre su formulario de edición, **Then** ve un indicador claro de que no hay adjuntos, en vez de una lista vacía sin contexto.
3. **Given** la lista de adjuntos está visible, **When** el usuario hace clic en un adjunto, **Then** puede abrirlo o descargarlo.

---

### User Story 2 - Agregar adjuntos nuevos a un Item (Priority: P2)

Un usuario selecciona uno o más archivos desde su dispositivo para adjuntarlos a un Item, y los archivos quedan asociados al Item recién cuando el formulario se guarda.

**Why this priority**: Es la segunda pieza del patrón de adjuntos y depende de poder ver la lista (P1) para verificar el resultado, pero es independientemente comprobable contra la fuente de datos.

**Independent Test**: Se puede probar completamente seleccionando uno o más archivos en el formulario, guardando, y verificando que los archivos existen como adjuntos del Item en la fuente de datos con el nombre correcto, sin necesitar que la eliminación de adjuntos esté implementada.

**Acceptance Scenarios**:

1. **Given** el usuario está en el formulario de un Item, **When** selecciona uno o más archivos nuevos y guarda, **Then** los archivos quedan adjuntos al Item y aparecen en la lista de adjuntos al recargar el formulario.
2. **Given** el usuario seleccionó un archivo nuevo pero todavía no guardó, **When** revisa la lista de adjuntos, **Then** el archivo aparece marcado visualmente como pendiente de subir (distinto de los ya existentes).
3. **Given** el usuario seleccionó un archivo nuevo, **When** decide quitarlo antes de guardar, **Then** el archivo se descarta y nunca se sube a la fuente de datos.
4. **Given** el guardado del Item falla, **When** el usuario ve el mensaje de error, **Then** los archivos que había seleccionado para adjuntar siguen presentes en el formulario para reintentar sin volver a seleccionarlos.

---

### User Story 3 - Eliminar un adjunto existente (Priority: P3)

Un usuario marca uno o más adjuntos existentes de un Item para eliminación, y la eliminación se concreta cuando el formulario se guarda.

**Why this priority**: Completa el patrón de adjuntos. Depende de que existan adjuntos (creados vía P2 o precargados) pero es una pieza independiente del patrón que el equipo debe poder copiar por separado.

**Independent Test**: Con un Item que ya tiene un adjunto existente, se puede marcarlo para eliminar, guardar, y confirmar en la fuente de datos que el adjunto ya no está asociado al Item.

**Acceptance Scenarios**:

1. **Given** un Item tiene un adjunto existente, **When** el usuario lo marca para eliminar, **Then** el adjunto se muestra visualmente distinto (tachado o similar) pero sigue existiendo hasta que se guarde.
2. **Given** el usuario marcó un adjunto existente para eliminar, **When** decide revertir esa marca antes de guardar, **Then** el adjunto vuelve a su estado normal y no se elimina.
3. **Given** el usuario marcó adjuntos para eliminar y guarda el formulario, **When** la operación se completa, **Then** esos adjuntos dejan de estar asociados al Item en la fuente de datos.

---

### User Story 4 - Buscar y asignar una persona real como responsable (Priority: P1)

Un usuario escribe parte del nombre de una persona de la organización en el campo AssignedTo y selecciona a la persona correcta de una lista de resultados en vivo, en lugar de escribir texto libre.

**Why this priority**: Es el punto de entrada del patrón de selección de personas y, junto con la Historia 1, la pieza mínima demostrable del ejemplo ampliado: sin búsqueda funcional no hay nada que seleccionar ni mostrar.

**Independent Test**: Se puede probar completamente escribiendo al menos 3 caracteres del nombre de una persona existente en el directorio de la organización, verificando que aparecen resultados coincidentes, seleccionando uno, y confirmando que el Item guardado tiene esa persona asociada.

**Acceptance Scenarios**:

1. **Given** el campo de búsqueda de personas está vacío, **When** el usuario escribe menos de 3 caracteres, **Then** el sistema no ejecuta ninguna búsqueda.
2. **Given** el usuario escribe 3 o más caracteres, **When** deja de escribir por un instante breve, **Then** el sistema ejecuta la búsqueda y muestra los resultados coincidentes de la organización.
3. **Given** los resultados de búsqueda están visibles, **When** el usuario selecciona una persona, **Then** esa persona queda representada visualmente (chip con iniciales) y el campo de búsqueda se limpia.
4. **Given** el usuario escribe una búsqueda y, antes de que responda, escribe una búsqueda distinta, **When** ambas respuestas llegan (posiblemente fuera de orden), **Then** el sistema muestra únicamente los resultados de la búsqueda más reciente.
5. **Given** una búsqueda no encuentra ninguna persona coincidente, **When** el usuario ve los resultados, **Then** el sistema muestra un mensaje claro de "sin resultados" en vez de una lista vacía sin contexto.

---

### User Story 5 - Asignar varias personas con deduplicación (Priority: P4)

Un usuario, en un campo configurado en modo múltiple, busca y selecciona más de una persona como responsables, sin poder agregar a la misma persona dos veces.

**Why this priority**: Extiende el patrón de selección de personas a su variante multi-selección, que el equipo también necesita como referencia, pero depende de que la búsqueda y selección individual (Historia 4) ya funcionen.

**Independent Test**: En un campo configurado en modo múltiple, se puede seleccionar a una persona, buscar y seleccionar a una segunda, y verificar que ambas quedan representadas como chips independientes; luego se puede intentar seleccionar de nuevo a la primera persona y verificar que no se duplica.

**Acceptance Scenarios**:

1. **Given** un campo de personas en modo múltiple sin selecciones, **When** el usuario busca y selecciona a una persona, **Then** esa persona se agrega a la lista de seleccionados como chip.
2. **Given** ya hay una o más personas seleccionadas, **When** el usuario busca y selecciona a otra persona distinta, **Then** ambas quedan visibles como chips independientes.
3. **Given** una persona ya está seleccionada, **When** el usuario busca y selecciona nuevamente a esa misma persona (por el mismo identificador de cuenta o el mismo correo, sin distinguir mayúsculas/minúsculas), **Then** el sistema no agrega un duplicado.

---

### User Story 6 - Quitar una persona seleccionada (Priority: P5)

Un usuario elimina una persona previamente seleccionada (en modo single o multiple) antes de guardar el formulario.

**Why this priority**: Es un complemento de las Historias 4 y 5, necesario para que el patrón esté completo, pero de menor riesgo y menor prioridad de implementación que la búsqueda y selección en sí.

**Independent Test**: Con al menos una persona ya seleccionada en el formulario, se puede hacer clic en el botón de quitar de su chip y verificar que la persona deja de estar en la lista de seleccionados, sin afectar a otras personas seleccionadas.

**Acceptance Scenarios**:

1. **Given** una persona está seleccionada, **When** el usuario hace clic en el botón de quitar de su chip, **Then** la persona deja de estar seleccionada y su chip desaparece.
2. **Given** varias personas están seleccionadas en modo múltiple, **When** el usuario quita una de ellas, **Then** las demás permanecen seleccionadas sin cambios.

---

### Edge Cases

- ¿Qué pasa si el usuario intenta guardar el Item mientras un archivo todavía se está subiendo o un adjunto todavía se está eliminando? El sistema debe completar esas operaciones como parte del guardado antes de confirmar éxito, o informar claramente si alguna falla.
- ¿Qué pasa si sube un archivo pero el guardado del resto del formulario falla? El usuario debe poder reintentar sin perder la selección de archivos pendientes.
- ¿Qué pasa si se intenta eliminar un adjunto que otro usuario ya eliminó desde otra sesión? El sistema debe informar el error sin romper el resto del guardado.
- ¿Qué pasa si el usuario escribe y borra rápidamente en el campo de búsqueda de personas antes de llegar a 3 caracteres? No debe dispararse ninguna búsqueda ni mostrarse un estado de carga.
- ¿Qué pasa si una persona encontrada en la búsqueda no tiene un nombre principal de usuario (UPN) válido para construir su identificador de reclamo? Esa persona no debe poder seleccionarse, o debe mostrarse claramente como no disponible.
- ¿Qué pasa si el campo de personas está en modo single y el usuario selecciona una persona nueva teniendo ya una seleccionada? La nueva selección reemplaza a la anterior.
- ¿Qué pasa si la búsqueda de personas falla por un error de red? El usuario ve un mensaje de error claro y puede reintentar la búsqueda.

## Requirements *(mandatory)*

### Functional Requirements

**Adjuntos por Item**

- **FR-001**: El sistema DEBE mostrar los adjuntos existentes de un Item al abrir su formulario de edición, identificando cada uno por su nombre.
- **FR-002**: El sistema DEBE indicar claramente cuando un Item no tiene adjuntos.
- **FR-003**: Los usuarios DEBEN poder abrir o descargar un adjunto existente desde el formulario.
- **FR-004**: Los usuarios DEBEN poder seleccionar uno o más archivos nuevos para adjuntar a un Item.
- **FR-005**: El sistema DEBE distinguir visualmente los adjuntos ya existentes, los pendientes de subir y los marcados para eliminar.
- **FR-006**: Los usuarios DEBEN poder deshacer la selección de un archivo pendiente de subir, o la marca de eliminación de un adjunto existente, antes de guardar.
- **FR-007**: El sistema DEBE ejecutar la subida de archivos nuevos y la eliminación de adjuntos marcados únicamente como parte del guardado del formulario, no en el momento en que el usuario selecciona o marca un archivo.
- **FR-008**: El sistema DEBE informar claramente si la subida o eliminación de un adjunto falla durante el guardado, sin descartar el resto de los cambios ya ingresados en el formulario.
- **FR-009**: El componente de manejo de adjuntos DEBE ser reutilizable por cualquier formulario del template que necesite adjuntar archivos a un registro, sin quedar acoplado específicamente a la entidad Item.

**People Picker**

- **FR-010**: El sistema DEBE permitir buscar personas de la organización escribiendo texto libre en el campo de asignación.
- **FR-011**: El sistema NO DEBE ejecutar una búsqueda de personas con menos de 3 caracteres ingresados.
- **FR-012**: El sistema DEBE esperar una breve pausa después de que el usuario deja de escribir antes de ejecutar la búsqueda, para evitar disparar una búsqueda por cada tecla presionada.
- **FR-013**: El sistema DEBE garantizar que, si hay varias búsquedas en curso, solo los resultados de la búsqueda más reciente se muestren al usuario, descartando respuestas tardías de búsquedas anteriores.
- **FR-014**: Los usuarios DEBEN poder seleccionar una persona de los resultados de búsqueda, quedando representada como una selección visual identificable (nombre e iniciales).
- **FR-015**: Los usuarios DEBEN poder quitar una persona ya seleccionada antes de guardar el formulario.
- **FR-016**: El campo de selección de personas DEBE soportar un modo de una sola persona seleccionada y un modo de varias personas seleccionadas, según cómo se configure el campo.
- **FR-017**: En modo de selección múltiple, el sistema NO DEBE permitir que la misma persona quede seleccionada más de una vez, comparándola sin distinguir mayúsculas de minúsculas.
- **FR-018**: En modo de una sola persona, seleccionar una nueva persona DEBE reemplazar la selección anterior.
- **FR-019**: El sistema DEBE conservar de cada persona seleccionada su nombre para mostrar, su correo electrónico y un identificador de reclamo compatible con la fuente de datos, de forma que la asignación pueda guardarse y volver a mostrarse correctamente.
- **FR-020**: El sistema DEBE mostrar un mensaje claro cuando una búsqueda de personas no encuentra resultados o cuando falla por un error de red.

### Key Entities *(include if feature involves data)*

- **Adjunto (Attachment)**: Archivo asociado a un Item. Atributos: nombre del archivo, URL de acceso, y un estado local en el formulario (existente sin cambios / pendiente de subir / marcado para eliminar) que solo se resuelve contra la fuente de datos al guardar.
- **Persona asignada (Assigned Person)**: Resultado de una búsqueda de personas de la organización, usado para poblar AssignedTo u otros campos de asignación. Atributos: nombre para mostrar, correo electrónico, e identificador de reclamo (claims) requerido por la fuente de datos para representar a la persona de forma inequívoca.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un desarrollador del equipo puede identificar cómo implementar adjuntos de archivo y un selector de personas real leyendo únicamente esta carpeta de referencia y el `ItemForm.tsx` resultante, sin necesitar explicación adicional.
- **SC-002**: Un usuario puede adjuntar un archivo nuevo a un Item y verlo reflejado en la lista de adjuntos la próxima vez que abre el formulario, en menos de 5 segundos después de un guardado exitoso.
- **SC-003**: Un usuario puede encontrar a una persona específica de la organización escribiendo su nombre y viendo resultados en menos de 1 segundo después de dejar de escribir.
- **SC-004**: El 100% de las búsquedas de personas disparadas antes de completar 3 caracteres no generan ninguna llamada de búsqueda.
- **SC-005**: El 100% de las selecciones múltiples de personas quedan libres de duplicados, incluso si el usuario intenta seleccionar a la misma persona varias veces.
- **SC-006**: En escenarios de respuestas de búsqueda fuera de orden, el 100% de las veces el usuario ve únicamente los resultados correspondientes a su última búsqueda escrita.

## Assumptions

- Este feature amplía el mismo ejemplo de referencia de [001-datasource-example](../001-datasource-example/spec.md) (entidad Item) y no introduce una entidad de negocio nueva; adjuntos y AssignedTo son capacidades adicionales sobre ese mismo Item.
- La fuente de datos para adjuntos y para la búsqueda de personas es **SharePoint** (listas) más el directorio de Office 365 de la organización, ya que el conector generado para Dataverse/SharePoint por `pac code generate` no cubre adjuntos ni búsqueda de personas de forma nativa; este es justamente el motivo por el que el patrón queda documentado como referencia.
- Como el codegen estándar no soporta operaciones de adjuntos, el patrón de referencia registra manualmente una operación adicional del tipo `httpRequest` contra la REST API de SharePoint (endpoint de `AttachmentFiles` de una lista/item) en la información de fuentes de datos de la app, en vez de depender de un método generado.
- Los archivos se codifican a base64 antes de enviarse, siguiendo el formato que espera la operación `httpRequest` registrada.
- La búsqueda de personas usa el conector estándar de Office 365 Users disponible en Power Platform (operación de búsqueda de usuarios), no un directorio o API custom.
- El identificador de reclamo (claims) de una persona seleccionada sigue el formato de "claims encoding" que SharePoint espera para usuarios de membership (`i:0#.f|membership|<userPrincipalName en minúsculas>`), ya que es el formato que la fuente de datos requiere para resolver la identidad de la persona.
- El tiempo de espera antes de ejecutar una búsqueda de personas (debounce) y el mínimo de caracteres son parámetros fijos del patrón de referencia (250 ms y 3 caracteres), replicables tal cual en features de negocio que reutilicen el patrón.
- El componente reutilizable de adjuntos y el de selección de personas se documentan como componentes genéricos del template (no específicos de Item), consistente con el principio de componentes genéricos de la constitution.
- No se valida tipo ni tamaño máximo de archivo adjunto en este ejemplo de referencia; una feature de negocio que lo necesite lo agrega sobre este mismo patrón.
- Este feature es, igual que 001-datasource-example, un artefacto de referencia y enseñanza para el equipo, no una feature de negocio real; una vez creado, el código permanece como documentación viva y no se elimina (principio 9.5 de la constitution).
