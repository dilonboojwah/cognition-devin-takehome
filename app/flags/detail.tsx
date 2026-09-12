import { ActionDialog } from "@/components/kit/ActionDialog";
import { ActivityList } from "@/components/kit/ActivityList";
import { DetailPanel } from "@/components/kit/DetailPanel";
import { RoleBadge } from "@/components/kit/RoleBadge";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { requireCurrentUser } from "@/lib/auth";
import { can, ROLE_LABELS, type Role } from "@/lib/authorize";
import { ROLLOUT_PERCENT_MAX, ROLLOUT_PERCENT_MIN } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { FLAG_RESOURCE_TYPE, getFeatureFlag } from "@/lib/flags";
import { setRolloutAction, toggleFlagAction } from "./actions";

/** Detail card rendered beside the flags table when a row is selected. */
export async function FlagDetail({ id }: { id: string }) {
  const flag = await getFeatureFlag(id);
  const user = await requireCurrentUser();
  if (!flag) {
    return <p className="text-[13px] text-muted-foreground">Flag not found.</p>;
  }

  // The server re-checks this inside the transaction; hiding the buttons is
  // only a convenience.
  const mayUpdate = can(user.role, "flag.update");

  return (
    <DetailPanel
      compact
      title={flag.key}
      description={flag.description}
      actions={
        mayUpdate ? (
          <>
            <ActionDialog
              trigger={flag.enabled ? "Disable" : "Enable"}
              variant={flag.enabled ? "destructive" : "default"}
              title={`${flag.enabled ? "Disable" : "Enable"} ${flag.key}`}
              description="This takes effect for everyone inside the rollout immediately."
              confirmLabel={flag.enabled ? "Disable" : "Enable"}
              action={toggleFlagAction.bind(null, flag.id)}
            />
            <ActionDialog
              trigger="Set rollout"
              variant="secondary"
              title="Set rollout percent"
              description={`Between ${ROLLOUT_PERCENT_MIN} and ${ROLLOUT_PERCENT_MAX}.`}
              confirmLabel="Save"
              action={setRolloutAction.bind(null, flag.id)}
              fields={[
                {
                  name: "rolloutPercent",
                  label: "Rollout percent",
                  type: "number",
                  required: true,
                  placeholder: String(flag.rolloutPercent),
                },
              ]}
            />
          </>
        ) : (
          <p className="max-w-56 text-right text-[13px] text-muted-foreground">
            {ROLE_LABELS[user.role as Role] ?? user.role} cannot change feature flags.
          </p>
        )
      }
      fields={[
        {
          label: "State",
          value: <StatusBadge status={flag.enabled ? "enabled" : "disabled"} />,
        },
        { label: "Rollout", value: `${flag.rolloutPercent}%` },
        {
          label: "Last changed by",
          value: flag.updatedBy ? (
            <span className="flex items-center gap-2">
              {flag.updatedBy.name}
              <RoleBadge role={flag.updatedBy.role} />
            </span>
          ) : (
            <span className="text-muted-foreground">Nobody yet</span>
          ),
        },
        { label: "Last changed", value: formatDateTime(flag.updatedAt) },
      ]}
    >
      <div className="border-t pt-5">
        <h3 className="eyebrow">Activity</h3>
        <ActivityList resourceType={FLAG_RESOURCE_TYPE} resourceId={flag.id} />
      </div>
    </DetailPanel>
  );
}
