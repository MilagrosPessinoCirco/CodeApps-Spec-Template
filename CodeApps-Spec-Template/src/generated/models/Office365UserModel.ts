// STUB GENERADO A MANO — NO es la salida real de `pac code generate`.
//
// Imita la forma mínima que produce el conector estándar Office 365 Users
// para la acción SearchUserV2 (ver research.md §5 de
// 002-attachments-people-picker). Se creó a mano porque este entorno de
// desarrollo no tiene un `pac` CLI ni un environment de Power Platform
// conectado.
//
// Reemplazar corriendo, contra un environment real con el conector Office
// 365 Users disponible (ver quickstart.md):
//   pac code add-data-source -a shared_office365users
//   pac code generate

export interface Office365UserModel {
  DisplayName: string
  Mail: string | null
  UserPrincipalName: string | null
}
