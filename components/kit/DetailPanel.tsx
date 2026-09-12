import type { ReactNode } from "react";

export type DetailField = { label: string; value: ReactNode };

type Props = {
  title: string;
  description?: ReactNode;
  fields: DetailField[];
  actions?: ReactNode;
  children?: ReactNode;
  /** Narrow rendering for inside a card: tighter spacing, two field columns. */
  compact?: boolean;
};

export function DetailPanel({ title, description, fields, actions, children, compact }: Props) {
  return (
    <div className={compact ? "space-y-6" : "space-y-8"}>
      <div
        className={
          compact
            ? "flex flex-wrap items-start justify-between gap-4"
            : "flex flex-wrap items-start justify-between gap-4 border-t pt-5"
        }
      >
        <div>
          <h2 className={compact ? "text-xl tabular-nums" : "text-2xl tabular-nums"}>{title}</h2>
          {description && (
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      <dl className={compact ? "grid grid-cols-2 gap-x-6 gap-y-4" : "grid gap-x-10 gap-y-5 sm:grid-cols-3"}>
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="eyebrow">{field.label}</dt>
            <dd className="mt-1.5 text-[13px]">{field.value}</dd>
          </div>
        ))}
      </dl>

      {children}
    </div>
  );
}
