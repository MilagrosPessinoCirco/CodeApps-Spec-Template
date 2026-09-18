import { itemsService } from "@/generated"
import { Item } from "@/entities"
import type { IForm } from "@/pages/items/types"

function draftFromForm(input: IForm): Item {
  return Item.create({
    title: input.title,
    description: input.description || null,
    status: (input.status || "Pendiente") as Exclude<IForm["status"], "">,
    assignedTo: input.assignedTo || null,
    dueDate: input.dueDate,
  })
}

export async function listActive(): Promise<Item[]> {
  const rows = await itemsService.getAll()
  return rows
    .map((row) => new Item(row))
    .filter((item) => item.active)
    .sort((a, b) => a.title.localeCompare(b.title))
}

export async function listAll(): Promise<Item[]> {
  const rows = await itemsService.getAll()
  return rows.map((row) => new Item(row)).sort((a, b) => a.title.localeCompare(b.title))
}

export async function getById(id: string): Promise<Item> {
  const row = await itemsService.getById(id)
  return new Item(row)
}

export async function create(input: IForm): Promise<Item> {
  const record = draftFromForm(input).toRecord()
  const created = await itemsService.create(record)
  return new Item(created)
}

export async function update(id: string, input: IForm): Promise<Item> {
  const record = draftFromForm(input).toRecord()
  delete record.cr123_active
  const updated = await itemsService.update(id, record)
  return new Item(updated)
}

export async function deactivate(id: string): Promise<void> {
  await itemsService.update(id, { cr123_active: false })
}
