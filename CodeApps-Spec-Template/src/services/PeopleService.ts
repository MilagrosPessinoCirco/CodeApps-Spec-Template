import { office365UsersService } from "@/generated"
import type { AssignedPerson } from "@/entities"

export async function searchUsers(query: string): Promise<AssignedPerson[]> {
  const results = await office365UsersService.searchUserV2(query)
  return results
    .filter((user) => !!user.UserPrincipalName)
    .map((user) => ({
      displayName: user.DisplayName,
      email: user.Mail ?? "",
      claims: `i:0#.f|membership|${(user.UserPrincipalName as string).toLowerCase()}`,
    }))
}
