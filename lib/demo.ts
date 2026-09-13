/**
 * The hosted demo is a shared database: anything one reviewer approves, the
 * next reviewer sees already approved. `DEMO_MODE=1` exposes a reset control so
 * the dataset can be restored without a redeploy. It is off by default, and it
 * is the one write path that deliberately sits outside `runMutation()`, because
 * it is an operator action on the demo itself rather than a business action.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1";
}
