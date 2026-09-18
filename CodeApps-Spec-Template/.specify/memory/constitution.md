# Constitution — Power Apps Code Apps Template

> Principios no negociables de arquitectura, datos, estilos, convenciones y proceso
> para cualquier Code App construida a partir de este template.
> Toda spec, plan y tarea generada por un agente de IA DEBE respetar estos principios.
> Solo se amplían, nunca se eliminan.

---

## 1. Stack confirmado

| Capa              | Tecnología / Versión                |
| ----------------- | ----------------------------------- |
| Build             | Vite                                |
| UI                | React 18+ con TypeScript            |
| Estilos           | Tailwind CSS + shadcn/ui            |
| Routing           | React Router                        |
| Server state      | Tanstack Query                      |
| Estado global     | React Context                       |
| Tablas            | Tanstack Table                      |
| SDK               | `@microsoft/power-apps`             |
| CLI               | `pac` (Power Platform CLI)          |
| Agente IA         | Claude Code con Spec Kit            |

---

## 2. Capa de datos

### 2.1 Fuentes de datos

Las Code Apps pueden conectarse a **Dataverse** (tablas de Power Platform) y a **SharePoint** (listas), según el proyecto. La fuente se define en la spec de cada feature.

- `pac code add-data-source` agrega un conector al proyecto.
- `pac code generate` genera los tipos y hooks en `src/generated/`.

### 2.2 Código generado vs. código custom

| Carpeta             | Quién lo escribe | Se edita a mano |
| ------------------- | ---------------- | --------------- |
| `src/generated/`    | `pac code generate` | **NUNCA** — se regenera |
| `src/services/`     | El desarrollador | Sí              |
| `src/hooks/`        | El desarrollador | Sí              |

Los archivos en `src/generated/` se sobreescriben cada vez que se corre `pac code generate`. Nunca se modifican a mano.

### 2.3 Services custom

Cuando la lógica de negocio necesita algo que el SDK generado no resuelve solo (transformaciones, combinación de fuentes, cálculos), se crea un service en `src/services/<Entidad>Service.ts`.

Un service:

- Importa los hooks o funciones generadas de `src/generated/`.
- Expone funciones puras y async que encapsulan la lógica de negocio.
- Nunca maneja estado de UI (loading, error) — eso lo hace Tanstack Query.

### 2.4 Tanstack Query como capa de server state

Toda comunicación con el backend (Dataverse, SharePoint, conectores) pasa por Tanstack Query:

- **Lectura**: `useQuery` con una `queryKey` descriptiva y una `queryFn` que llama al SDK o al service.
- **Escritura**: `useMutation` con `onSuccess` que invalida las queries afectadas (`queryClient.invalidateQueries`).
- **Nunca** se guarda data del servidor en `useState` o en Context. Si viene del backend, va en Tanstack Query.

```ts
// ✅ Correcto
const { data: items, isLoading, error } = useQuery({
  queryKey: ["items"],
  queryFn: () => sdk.items.list(),
});

// ❌ Incorrecto — no duplicar server state en useState
const [items, setItems] = useState([]);
useEffect(() => { fetchItems().then(setItems); }, []);
```

### 2.5 React Context para estado global de la app

React Context se usa **solo** para estado que no viene del servidor:

- Datos del usuario logueado y su rol.
- Permisos y configuración de la app.
- Preferencias de UI (tema, idioma, sidebar abierto/cerrado).

Cada contexto tiene su propio archivo en `src/context/<Nombre>Context.tsx` y expone un hook `use<Nombre>Context()`.

---

## 3. Entidades

Cada entidad vive en `src/entities/<Entidad>.ts` y se re-exporta desde `src/entities/index.ts`.

- Campos opcionales se tipan como `T | null`, nunca `T | undefined` en la entidad.
- El constructor recibe `any` (el dato crudo del SDK) y mapea los campos.
- Si la entidad necesita ir de vuelta al backend, expone `toRecord()` que retorna el shape esperado por el SDK.

---

## 4. Componentes y UI

### 4.1 Estructura de carpetas

```
src/
  pages/
    <feature>/
      <Feature>List.tsx              ← página de lista
      <Feature>Form.tsx              ← página de formulario
      <Feature>Detail.tsx            ← página de detalle (si aplica)
      helpers.ts                     ← validateForm, emptyErrors
      types.ts                       ← IForm, IFormErrors
  components/
    ui/                              ← componentes shadcn/ui (generados)
    <ComponenteCompartido>.tsx       ← componentes reutilizables
  services/
    <Entidad>Service.ts             ← lógica de negocio
  hooks/
    use<Feature>.ts                 ← hooks custom de la feature
  context/
    <Nombre>Context.tsx             ← contextos de React
  entities/
    <Entidad>.ts                    ← entidades tipadas
  generated/
    ...                             ← NO TOCAR — generado por pac
```

### 4.2 Formularios

- `formData` se maneja con `useState<IForm>`.
- Errores con `useState<IFormErrors>` (un string por campo, vacío = sin error).
- `handleFieldChange(fieldName, value)` limpia el error del campo al escribir.
- Validación con `validateForm(formData)` que retorna `[errors, isValid]`.
- El guardado usa `useMutation` de Tanstack Query, no un `try/catch` suelto.
- Mensaje de éxito **dentro del `onSuccess`** del mutation, nunca en `finally`.

### 4.3 InternalId para arrays paralelos

Cuando se manejan arrays de sub-entidades junto con arrays paralelos de errores:

- Cada item tiene un `InternalId` estable, generado como `Math.max(...existingIds) + 1`.
- **NUNCA** usar `array.length` ni índices posicionales como `InternalId` — causa colisiones tras borrados.
- Al borrar un item se marca `deleted: true`, no se filtra del array hasta el guardado.
- El array de errores debe tener la misma longitud que los items visibles (no borrados).
- Los handlers (`onChange`, `onDelete`) reciben `InternalId`, no índice posicional.

### 4.4 Componentes genéricos

Los componentes son genéricos y reutilizables. La lógica de dominio va en el hook o en helpers, no en el componente visual. Un componente `Banner`, `Button`, etc. no tiene lógica de negocio — usa `className` para customización visual.

---

## 5. Estilos

- **Tailwind CSS** como framework principal. No se escriben archivos CSS/SCSS custom salvo excepciones justificadas.
- **shadcn/ui** para componentes base (Button, Input, Select, Dialog, Table, etc.). Se instalan con `npx shadcn@latest add <componente>`.
- Los colores y tokens del tema se definen en `tailwind.config.ts` y `src/app/globals.css`. No se repiten valores hex sueltos en los componentes.
- Clases de Tailwind directo en el JSX. No se crean archivos `.module.css` ni `.module.scss`.

---

## 6. Manejo de estado y efectos

- **Tanstack Query para server state**: nunca duplicar data del servidor en `useState`.
- **`useEffect` para resets es peligroso**: Para resetear estado al cambiar de ruta, preferir resets sincrónicos con `useRef` (`prevIdRef` pattern) en vez de `useEffect`.
- **`finally` no es un success handler**: Mensajes de éxito y limpieza de estado van dentro de `onSuccess` del mutation, no en `finally` ni en `onSettled`.
- **`await` es obligatorio** en toda operación async secuencial. Missing `await` causa race conditions.

---

## 7. Deploy y Power Platform

- **`pac code push`** deploya la app al environment seleccionado.
- **`power.config.json`** contiene datos específicos del environment. Va en `.gitignore` — cada developer corre `pac code init` con su propio environment.
- El toggle de **Code Apps** tiene que estar habilitado en el Power Platform Admin Center (Settings → Product → Features) antes del primer deploy.

---

## 8. Convenciones de código

- **Español** para nombres de dominio (variables, interfaces de negocio, labels de UI).
- **Inglés** para patrones técnicos (`handleFieldChange`, `isLoading`, `useQuery`, `useMutation`).
- Interfaces de formulario: `IForm`, `IFormErrors`.
- Entidades: PascalCase sin prefijo `I` (`Ticket`, `Incidente`, `Item`).
- Archivos de páginas: PascalCase (`TicketList.tsx`, `TicketForm.tsx`).
- Services: PascalCase (`TicketService.ts`).
- Hooks: camelCase con prefijo `use` (`useTickets.ts`).

---

## 9. Proceso Spec-Driven (Spec Kit)

1. La constitution (**este archivo**) se hereda — no se reescribe. Se amplía si la app lo necesita.
2. Cada feature de negocio es una spec nueva en `specs/NNN-<nombre>/`.
3. Una spec contiene: `spec.md`, `plan.md`, `tasks.md` y opcionalmente `research.md`, `data-model.md`, `contracts.md`.
4. El agente sigue `specs/001-datasource-example/` como referencia de cómo se ve un service + hook + componente correcto.
5. El código de ejemplo es documentación viva — no se borra.
6. El equipo corre `/speckit-specify` para su feature. **No** corre `/speckit-constitution`.