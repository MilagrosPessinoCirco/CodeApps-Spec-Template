// STUB GENERADO A MANO — NO es la salida real de `pac code generate`.
// Ver Office365UserModel.ts para el detalle de por qué existe este archivo y
// cómo reemplazarlo por la generación real.
//
// A diferencia de las operaciones de adjuntos (AttachmentService.ts),
// `SearchUserV2` SÍ forma parte de la superficie estándar del conector
// Office 365 Users — un `pac code generate` real produciría esta entrada de
// `apis` automáticamente, sin necesidad de registrarla a mano (ver
// research.md §5 de 002-attachments-people-picker). Acá se declara a mano
// únicamente porque este stub simula esa salida.

import { getClient } from "@microsoft/power-apps/data"
import type { Office365UserModel } from "../models/Office365UserModel"

const CONNECTOR_NAME = "Office365Users"

// `DataSourcesInfo`/`IDataSourceInfo` no se exportan públicamente desde
// "@microsoft/power-apps/data"; se pasa un objeto con la misma forma
// (tipado estructuralmente) en vez de importar el tipo interno.
const dataSourcesInfo = {
  [CONNECTOR_NAME]: {
    tableId: CONNECTOR_NAME,
    dataSourceType: "connector",
    apis: {
      SearchUserV2: {
        path: "/codeless/v1.0/users",
        method: "GET",
        parameters: [
          { name: "searchTerm", in: "query", required: false, type: "string" },
          { name: "top", in: "query", required: false, type: "integer" },
        ],
      },
    },
  },
}

export class Office365UsersService {
  private client = getClient(dataSourcesInfo)

  async searchUserV2(query: string, top = 10): Promise<Office365UserModel[]> {
    const result = await this.client.executeAsync<Record<string, unknown>, Office365UserModel[]>({
      connectorOperation: {
        tableName: CONNECTOR_NAME,
        operationName: "SearchUserV2",
        parameters: { searchTerm: query, top },
      },
    })
    if (!result.success) throw result.error ?? new Error("Error al buscar usuarios")
    return result.data
  }
}

export const office365UsersService = new Office365UsersService()
