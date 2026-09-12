export const ROLES = [
  "ops_analyst",
  "kyc_reviewer",
  "finance_admin",
  "eng_admin",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ops_analyst: "Ops analyst",
  kyc_reviewer: "KYC reviewer",
  finance_admin: "Finance admin",
  eng_admin: "Eng admin",
};

export type Action =
  | "tool.view"
  | "audit.view"
  | "refund.request"
  | "refund.approve"
  | "refund.reject"
  | "kyc.decide"
  | "kyc.decide_escalated"
  | "flag.update";

type PermissionRow = {
  /** Label used by the permission matrix on the home page. */
  label: string;
  /** Actions granted together. `runMutation` and `authorize` take these. */
  actions: Action[];
  roles: Role[];
};

/**
 * The single source of truth for who may do what. The home page renders this
 * at request time, so the published matrix cannot drift from the enforced one.
 */
export const PERMISSIONS: PermissionRow[] = [
  {
    label: "View any tool",
    actions: ["tool.view"],
    roles: ["ops_analyst", "kyc_reviewer", "finance_admin", "eng_admin"],
  },
  {
    label: "Request refund",
    actions: ["refund.request"],
    roles: ["ops_analyst", "finance_admin"],
  },
  {
    label: "Approve or reject refund",
    actions: ["refund.approve", "refund.reject"],
    roles: ["finance_admin"],
  },
  { label: "Decide KYC case", actions: ["kyc.decide"], roles: ["kyc_reviewer"] },
  {
    label: "Decide escalated KYC case",
    actions: ["kyc.decide_escalated"],
    roles: ["finance_admin"],
  },
  { label: "Change feature flag", actions: ["flag.update"], roles: ["eng_admin"] },
  {
    label: "View audit log",
    actions: ["audit.view"],
    roles: ["ops_analyst", "kyc_reviewer", "finance_admin", "eng_admin"],
  },
];

export class AuthorizationError extends Error {
  readonly action: Action;

  constructor(action: Action, role: string) {
    super(`Role ${role} may not perform ${action}`);
    this.name = "AuthorizationError";
    this.action = action;
  }
}

export function can(role: string, action: Action): boolean {
  return PERMISSIONS.some(
    (row) => row.actions.includes(action) && (row.roles as string[]).includes(role),
  );
}

export function authorize(actor: { role: string }, action: Action): void {
  if (!can(actor.role, action)) throw new AuthorizationError(action, actor.role);
}
