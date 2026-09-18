# Quickstart: Ejemplo de Referencia CRUD (Items)

Guía para levantar y validar manualmente el ejemplo de referencia end-to-end. No reemplaza `tasks.md` (que detalla la implementación); esto es la guía de **validación** una vez implementado.

## Prerrequisitos

1. Un environment de Power Platform con **Code Apps** habilitado (Admin Center → Settings → Product → Features), según principio 7 de la constitution.
2. Una tabla de Dataverse llamada `Items` creada en ese environment con las columnas descritas en `data-model.md` (Title, Description, Status, AssignedTo, DueDate, Active).
3. `pac code init` corrido localmente contra ese environment (genera `power.config.json`, ignorado por git — cada developer usa el suyo).
4. Dependencias instaladas: `npm install`.

## Setup de la fuente de datos (una sola vez por environment)

```powershell
pac code add-data-source -a dataverse -t Items
pac code generate
```

Esto agrega/actualiza `src/generated/` con los tipos y hooks para la tabla `Items`. **No editar `src/generated/` a mano** (principio 2.2).

## Levantar la app

```powershell
npm run dev
```

Abrir la URL local indicada por Vite.

## Escenarios de validación manual

Cada escenario corresponde a una user story de `spec.md`.

### 1. Listado (US1 / P1)

1. Con al menos 2 Items activos ya creados en Dataverse, navegar a `/items`.
2. **Esperado**: aparece una tabla con columnas Title, Status, AssignedTo, DueDate; una fila por Item activo.
3. Hacer clic en el encabezado de "Title" u otra columna.
4. **Esperado**: las filas se reordenan.
5. Con la tabla `Items` vacía (o filtrando a un estado sin resultados), recargar `/items`.
6. **Esperado**: mensaje claro de "no hay Items" en vez de una tabla vacía sin contexto.

### 2. Crear (US2 / P2)

1. En `/items`, ir a "Nuevo Item" (`/items/new`).
2. Completar solo Title y Status, guardar.
3. **Esperado**: toast de éxito, redirección o refresco del listado, el nuevo Item visible en `/items` en menos de 2 segundos sin recargar manualmente (SC-003).
4. Repetir dejando Title vacío.
5. **Esperado**: error de validación en el campo Title, el formulario no se envía.
6. Simular un fallo de guardado (por ejemplo, desconectando la red antes de guardar).
7. **Esperado**: mensaje de error visible y los datos ingresados permanecen en el formulario (FR-014).

### 3. Editar (US3 / P3)

1. Desde `/items`, abrir la edición de un Item existente.
2. **Esperado**: todos los campos prellenados con los valores actuales.
3. Cambiar el Status y guardar.
4. **Esperado**: el listado refleja el nuevo Status sin recarga manual.
5. Borrar el Title y guardar.
6. **Esperado**: error de validación, el cambio no se persiste.

### 4. Soft delete (US4 / P4)

1. Desde `/items`, ejecutar la acción de desactivar sobre un Item activo.
2. **Esperado**: aparece una confirmación (FR-012); cancelar no cambia el estado del Item.
3. Confirmar la desactivación.
4. **Esperado**: el Item desaparece del listado por defecto.
5. Activar el filtro/toggle de "ver inactivos".
6. **Esperado**: el Item desactivado aparece, visualmente distinguible de los activos.
7. Verificar directamente en Dataverse (make.powerapps.com o `pac` ) que el registro sigue existiendo con `Active = false` y todos sus demás campos intactos (FR-011, SC-004).

## Referencias

- Contrato de service/hooks: [contracts/item-service.md](./contracts/item-service.md)
- Modelo de datos: [data-model.md](./data-model.md)
- Decisiones técnicas: [research.md](./research.md)
