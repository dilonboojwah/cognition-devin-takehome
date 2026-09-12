import type { Role } from "@/lib/authorize";

/** Role given to an Entra ID user with no RoleAssignment row. */
export const DEFAULT_ROLE: Role = "ops_analyst";
