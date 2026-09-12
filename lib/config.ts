/** Named business constants. Never inline these numbers at a call site. */

/** Refunds at or above this amount need two distinct finance_admin approvals. */
export const REFUND_DUAL_APPROVAL_THRESHOLD_CENTS = 50000;

/** KYC risk bands, used for the risk level column and the escalation rule. */
export const KYC_RISK_MEDIUM_MIN = 40;
export const KYC_RISK_HIGH_MIN = 70;
