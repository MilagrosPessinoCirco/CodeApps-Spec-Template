# Feature Specification: Ejemplo de Referencia CRUD (Items)

**Feature Branch**: `[001-datasource-example]`

**Created**: 2026-09-17

**Status**: Draft

**Input**: User description: "Crear un ejemplo de referencia que demuestre el patrón completo de CRUD contra una tabla genérica llamada 'Items'. La tabla tiene estos campos: Title (texto, requerido), Description (texto largo, opcional), Status (choice: Pendiente/En Progreso/Completado, requerido), AssignedTo (persona, opcional), DueDate (fecha, opcional). La app debe listar items en una tabla con Tanstack Table, permitir crear items nuevos con un formulario, editar items existentes, y hacer soft delete (marcar como inactivo). Este ejemplo NO es una feature de negocio — es el patrón canónico que todo el equipo va a seguir como referencia."

## User Scenarios & Testing *(mandatory)*

> **Nota de alcance**: Este feature no resuelve un proceso de negocio real. Es un artefacto de referencia/enseñanza: su "usuario" es cualquier desarrollador del equipo que necesita ver el patrón completo (listar → crear → editar → desactivar) implementado de punta a punta antes de construir su propia feature de negocio. El "valor" entregado es la capacidad del equipo de replicar el patrón correctamente, no un resultado de negocio.

### User Story 1 - Ver el listado de Items (Priority: P1)

Un desarrollador o usuario final abre la app y ve una tabla con todos los Items activos, con sus columnas principales visibles y ordenables.

**Why this priority**: Sin una vista de listado funcional no hay forma de verificar visualmente el resultado de crear, editar o desactivar un Item. Es la base sobre la que se apoyan las demás historias y la primera pieza que un desarrollador copia al construir su propia feature.

**Independent Test**: Con Items ya existentes en la fuente de datos (creados directamente en Dataverse), se puede verificar completamente esta historia abriendo la página de listado y confirmando que los Items activos aparecen con sus datos correctos, sin necesitar que el formulario de creación/edición esté implementado.

**Acceptance Scenarios**:

1. **Given** existen Items activos en la fuente de datos, **When** el usuario abre la página de listado, **Then** ve una tabla con una fila por cada Item activo, mostrando Title, Status, AssignedTo y DueDate.
2. **Given** la tabla está mostrando Items, **When** el usuario hace clic en el encabezado de una columna ordenable, **Then** las filas se reordenan según esa columna.
3. **Given** no existen Items activos, **When** el usuario abre la página de listado, **Then** ve un mensaje claro indicando que no hay Items para mostrar (no una tabla vacía sin contexto).

---

### User Story 2 - Crear un Item nuevo (Priority: P2)

Un usuario completa un formulario para crear un Item nuevo con Title y Status obligatorios, y Description, AssignedTo y DueDate opcionales.

**Why this priority**: Es la segunda pieza del patrón CRUD y depende del listado (P1) para poder verificar visualmente el resultado, pero es independientemente comprobable contra la fuente de datos.

**Independent Test**: Se puede probar completamente llenando el formulario de creación y verificando que el registro nuevo existe en la fuente de datos con los valores correctos, sin necesitar que la edición o el soft delete estén implementados.

**Acceptance Scenarios**:

1. **Given** el usuario abre el formulario de creación, **When** completa Title y Status y guarda, **Then** el Item se crea, aparece en el listado, y el usuario recibe una confirmación de éxito.
2. **Given** el usuario abre el formulario de creación, **When** intenta guardar sin completar Title, **Then** el sistema muestra un error de validación en el campo y no guarda el registro.
3. **Given** el usuario abre el formulario de creación, **When** completa Title, Status y deja Description, AssignedTo y DueDate vacíos, **Then** el Item se guarda correctamente con esos campos en blanco.
4. **Given** el guardado falla (por ejemplo, error de red), **When** el usuario ve el mensaje de error, **Then** los datos que ya había ingresado en el formulario se mantienen visibles para reintentar sin volver a escribir todo.

---

### User Story 3 - Editar un Item existente (Priority: P3)

Un usuario abre un Item existente desde el listado, modifica uno o más campos y guarda los cambios.

**Why this priority**: Completa el patrón de escritura del CRUD. Depende de que existan Items (creados vía P2 o precargados) pero es una pieza independiente del patrón que el equipo debe poder copiar por separado.

**Independent Test**: Con un Item existente, se puede abrir su formulario de edición, verificar que los campos aparecen prellenados con los valores actuales, modificar un campo, guardar, y confirmar en la fuente de datos que el cambio se persistió.

**Acceptance Scenarios**:

1. **Given** un Item activo existe, **When** el usuario abre su formulario de edición, **Then** todos los campos aparecen prellenados con los valores actuales del Item.
2. **Given** el usuario modifica el Status de un Item y guarda, **Then** el cambio se persiste y el listado refleja el nuevo valor sin necesidad de recargar la página manualmente.
3. **Given** el usuario abre el formulario de edición y borra el valor de Title, **When** intenta guardar, **Then** el sistema muestra un error de validación y no guarda el cambio.

---

### User Story 4 - Marcar un Item como inactivo (soft delete) (Priority: P4)

Un usuario marca un Item como inactivo desde el listado, sin eliminarlo físicamente de la fuente de datos.

**Why this priority**: Es la pieza final del patrón CRUD completo y la que más frecuentemente se implementa mal (borrado físico en vez de lógico). Depende de que existan Items pero es la historia más independiente de verificar contra el dato crudo.

**Independent Test**: Con un Item activo existente, se puede ejecutar la acción de desactivar, confirmar que desaparece del listado por defecto, y verificar directamente en la fuente de datos que el registro sigue existiendo con su flag de actividad en falso (no fue borrado).

**Acceptance Scenarios**:

1. **Given** un Item activo aparece en el listado, **When** el usuario ejecuta la acción de desactivar y confirma, **Then** el Item deja de aparecer en la vista por defecto del listado.
2. **Given** un Item fue desactivado, **When** se consulta la fuente de datos directamente, **Then** el registro sigue existiendo con todos sus campos intactos y su flag de actividad marcado como inactivo.
3. **Given** el usuario inicia la acción de desactivar un Item, **When** se le presenta la confirmación, **Then** puede cancelar la acción sin que el Item cambie de estado.
4. **Given** existen Items inactivos, **When** el usuario activa el filtro/toggle para verlos, **Then** el listado los muestra distinguibles visualmente de los Items activos.

---

### Edge Cases

- ¿Qué pasa si el usuario intenta guardar un Item con un valor de Status que no sea uno de los tres válidos (Pendiente/En Progreso/Completado)? El sistema debe rechazar el guardado y señalar el campo.
- ¿Qué pasa si dos usuarios editan el mismo Item al mismo tiempo? Gana el último guardado (last-write-wins); no se implementa bloqueo optimista en este ejemplo.
- ¿Qué pasa si el usuario intenta desactivar un Item que ya está inactivo? La acción no debe estar disponible sobre Items ya inactivos en la vista por defecto.
- ¿Qué pasa si DueDate se deja vacío? El Item se guarda sin fecha límite y el listado debe mostrar esa celda vacía o con un indicador claro de "sin fecha", sin error.
- ¿Qué pasa si AssignedTo se deja vacío? El Item se guarda sin asignar y el listado debe mostrarlo como "sin asignar", sin error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar todos los Items activos en una tabla con columnas ordenables (Title, Status, AssignedTo, DueDate).
- **FR-002**: El sistema DEBE ocultar los Items inactivos de la vista de listado por defecto.
- **FR-003**: El sistema DEBE ofrecer una forma de ver también los Items inactivos (filtro o toggle), distinguiéndolos visualmente de los activos.
- **FR-004**: El sistema DEBE mostrar un mensaje claro cuando no hay Items para mostrar en la vista actual (activos o inactivos).
- **FR-005**: Los usuarios DEBEN poder crear un Item nuevo mediante un formulario que capture Title, Description, Status, AssignedTo y DueDate.
- **FR-006**: El sistema DEBE requerir Title y Status al crear o editar un Item; Description, AssignedTo y DueDate son opcionales.
- **FR-007**: El sistema DEBE validar que Status sea uno de los tres valores permitidos: Pendiente, En Progreso, Completado.
- **FR-008**: Los usuarios DEBEN poder editar un Item existente a través de un formulario prellenado con sus valores actuales.
- **FR-009**: El sistema DEBE persistir los cambios de creación y edición, y reflejar el resultado en el listado sin requerir una recarga manual de la página.
- **FR-010**: Los usuarios DEBEN poder marcar un Item activo como inactivo (soft delete) desde el listado.
- **FR-011**: El sistema NO DEBE eliminar físicamente un registro de Item de la fuente de datos al desactivarlo; el registro y todos sus campos deben permanecer recuperables.
- **FR-012**: El sistema DEBE pedir confirmación antes de marcar un Item como inactivo, para evitar desactivaciones accidentales.
- **FR-013**: El sistema DEBE mostrar retroalimentación clara de éxito o error para las acciones de crear, editar y desactivar.
- **FR-014**: El sistema DEBE conservar los datos ya ingresados en un formulario si el guardado falla, permitiendo reintentar sin perder lo escrito.

### Key Entities *(include if feature involves data)*

- **Item**: Unidad de trabajo genérica usada como ejemplo canónico del patrón CRUD. Atributos: Title (texto, requerido), Description (texto largo, opcional), Status (choice de un único valor: Pendiente / En Progreso / Completado, requerido), AssignedTo (persona, opcional), DueDate (fecha, opcional), y un indicador de actividad (activo/inactivo) usado exclusivamente para el soft delete y separado del campo Status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un desarrollador nuevo en el equipo puede identificar el flujo completo (listar → crear → editar → desactivar) leyendo únicamente esta carpeta de referencia, sin necesitar explicación adicional.
- **SC-002**: Un usuario puede crear un Item nuevo completando solo los campos obligatorios en menos de 30 segundos.
- **SC-003**: El listado refleja un Item recién creado o editado dentro de los 2 segundos posteriores a un guardado exitoso, sin refresco manual.
- **SC-004**: El 100% de los Items marcados como inactivos permanecen recuperables en la fuente de datos (ninguno se elimina físicamente).
- **SC-005**: Un usuario puede localizar y desactivar un Item específico entre 100 o más Items en menos de 15 segundos usando el ordenamiento de la tabla.

## Assumptions

- La fuente de datos de este ejemplo es una tabla de **Dataverse** llamada `Items` (el enunciado usa el término "tabla", consistente con la terminología de Dataverse; si el proyecto necesitara usar SharePoint en su lugar, se documentaría explícitamente en una nueva spec de referencia).
- El soft delete se implementa mediante un campo booleano de actividad (activo/inactivo) separado del campo Status, ya que los valores de Status (Pendiente/En Progreso/Completado) no incluyen un estado "Inactivo".
- AssignedTo es un campo de persona única (no selección múltiple).
- DueDate captura solo fecha, sin componente de hora.
- La vista de listado por defecto muestra únicamente Items activos; el filtro/toggle para ver inactivos es un mecanismo de referencia, no una funcionalidad de auditoría completa.
- No se implementan restricciones de permisos por rol más allá de la seguridad estándar de la tabla en Power Platform; este ejemplo no demuestra lógica de autorización custom.
- Este feature es un artefacto de referencia y enseñanza para el equipo, no una feature de negocio real; una vez creado, el código permanece como documentación viva y no se elimina (según el principio 9.5 de la constitution).
