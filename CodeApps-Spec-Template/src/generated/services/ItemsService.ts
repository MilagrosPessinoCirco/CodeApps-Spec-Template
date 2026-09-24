// STUB GENERADO A MANO — NO es la salida real de `pac code generate`.
// Ver ItemsModel.ts para el detalle de por qué existe este archivo y cómo
// reemplazarlo por la generación real.
//
// La forma de esta clase (getAll/getById/create/update/delete envolviendo
// getClient() de "@microsoft/power-apps/data") sigue el patrón público del
// SDK del template. `dataSourcesInfo` normalmente lo produce `pac code
// generate` a partir de la conexión configurada en `power.config.json`; aquí
// se deja un placeholder mínimo para que el resto del código compile.
//
// A partir de 002-attachments-people-picker, `Items` es una lista de
// SharePoint (dataSourceType "sharepoint") en vez de una tabla de Dataverse
// (ver research.md §1 de esa feature). El GUID de la lista (`tableId`) es un
// placeholder — se confirma al correr `pac code add-data-source -a
// sharepoint -t Items` + `pac code generate` contra un environment real.

import { getClient } from "@microsoft/power-apps/data"
import type { ItemsModel } from "../models/ItemsModel"

const TABLE_NAME = "Items"

// `DataSourcesInfo`/`IDataSourceInfo` no se exportan públicamente desde
// "@microsoft/power-apps/data"; se pasa un objeto con la misma forma
// (tipado estructuralmente) en vez de importar el tipo interno.
const dataSourcesInfo = {
  [TABLE_NAME]: {
    tableId: "00000000-0000-0000-0000-000000000000", // GUID placeholder de la lista SharePoint `Items`
    primaryKey: "Id",
    dataSourceType: "sharepoint",
    apis: {},
  },
}

export class ItemsService {
  private client = getClient(dataSourcesInfo)

  async getAll(): Promise<ItemsModel[]> {
    const result = await this.client.retrieveMultipleRecordsAsync<ItemsModel>(TABLE_NAME)
    if (!result.success) throw result.error ?? new Error("Error al obtener Items")
    return result.data
  }

  async getById(id: string): Promise<ItemsModel> {
    const result = await this.client.retrieveRecordAsync<ItemsModel>(TABLE_NAME, id)
    if (!result.success) throw result.error ?? new Error(`Item ${id} no encontrado`)
    return result.data
  }

  async create(record: Partial<ItemsModel>): Promise<ItemsModel> {
    const result = await this.client.createRecordAsync<Partial<ItemsModel>, ItemsModel>(TABLE_NAME, record)
    if (!result.success) throw result.error ?? new Error("Error al crear Item")
    return result.data
  }

  async update(id: string, record: Partial<ItemsModel>): Promise<ItemsModel> {
    const result = await this.client.updateRecordAsync<Partial<ItemsModel>, ItemsModel>(TABLE_NAME, id, record)
    if (!result.success) throw result.error ?? new Error(`Error al actualizar Item ${id}`)
    return result.data
  }

  async delete(id: string): Promise<void> {
    const result = await this.client.deleteRecordAsync(TABLE_NAME, id)
    if (!result.success) throw result.error ?? new Error(`Error al eliminar Item ${id}`)
  }
}

export const itemsService = new ItemsService()
