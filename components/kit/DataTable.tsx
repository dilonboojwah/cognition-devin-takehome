"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { humanizeStatus } from "@/components/kit/StatusBadge";
import { cn } from "@/lib/utils";

export type DataTableColumn = { key: string; label: string; className?: string };

export type DataTableRow = {
  id: string;
  /** Optional detail page for the row. */
  href?: string;
  /** Value matched by the status filter. */
  status?: string;
  /** Values matched by any extra facet filters, keyed by facet key. */
  facets?: Record<string, string>;
  /** Value matched by the text filter. */
  searchText: string;
  cells: Record<string, ReactNode>;
};

export type DataTableFacet = {
  key: string;
  /** Shown as the "no filter" option. */
  label: string;
  options: { value: string; label: string }[];
};

type Props = {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  filterPlaceholder?: string;
  /** Sugar for the common status facet, matched against `row.status`. */
  statusOptions?: string[];
  statusLabel?: string;
  facets?: DataTableFacet[];
  emptyMessage?: string;
};

const ALL = "__all__";

export function DataTable({
  columns,
  rows,
  filterPlaceholder = "Filter…",
  statusOptions,
  statusLabel = "All statuses",
  facets = [],
  emptyMessage = "Nothing to show.",
}: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});

  const allFacets: DataTableFacet[] = useMemo(
    () => [
      ...(statusOptions?.length
        ? [
            {
              key: "status",
              label: statusLabel,
              options: statusOptions.map((option) => ({
                value: option,
                label: humanizeStatus(option),
              })),
            },
          ]
        : []),
      ...facets,
    ],
    [statusOptions, statusLabel, facets],
  );

  const visible = useMemo(() => {
    const needle = text.trim().toLowerCase();
    const valueOf = (row: DataTableRow, key: string) =>
      key === "status" ? row.status : row.facets?.[key];
    return rows.filter(
      (row) =>
        (!needle || row.searchText.toLowerCase().includes(needle)) &&
        allFacets.every((facet) => {
          const chosen = selected[facet.key] ?? ALL;
          return chosen === ALL || valueOf(row, facet.key) === chosen;
        }),
    );
  }, [rows, text, selected, allFacets]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={filterPlaceholder}
          className="h-8 w-64 text-[13px] placeholder:text-muted-foreground/60"
          aria-label="Text filter"
        />
        {allFacets.map((facet) => {
          const value = selected[facet.key] ?? ALL;
          const label =
            value === ALL
              ? facet.label
              : (facet.options.find((option) => option.value === value)?.label ?? facet.label);
          return (
            /* modal={false}: outside clicks pass through, so another filter
               opens in one click and nothing scroll-locks the page. */
            <DropdownMenu key={facet.key} modal={false}>
              <DropdownMenuTrigger
                aria-label={`${facet.label} filter`}
                className="flex h-8 w-44 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-[13px] whitespace-nowrap outline-none transition-colors select-none hover:bg-accent focus-visible:border-ring"
              >
                {label}
                <ChevronDown className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem
                  className={cn("text-[13px]", value === ALL && "bg-accent")}
                  onSelect={() =>
                    setSelected((current) => ({ ...current, [facet.key]: ALL }))
                  }
                >
                  {facet.label}
                </DropdownMenuItem>
                {facet.options.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className={cn("text-[13px]", value === option.value && "bg-accent")}
                    onSelect={() =>
                      setSelected((current) => ({ ...current, [facet.key]: option.value }))
                    }
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <Table className="w-auto text-[13px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "h-9 px-3 font-normal text-muted-foreground first:pl-0",
                    column.className,
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="px-3 pl-0 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {visible.map((row) => (
              <TableRow
                key={row.id}
                onClick={
                  row.href ? () => router.push(row.href!, { scroll: false }) : undefined
                }
                className={row.href ? "cursor-pointer" : undefined}
              >
                {columns.map((column, index) => (
                  <TableCell
                    key={column.key}
                    className={cn("px-3 py-2.5 align-middle first:pl-0", column.className)}
                  >
                    {index === 0 && row.href ? (
                      <Link
                        href={row.href}
                        onClick={(event) => event.stopPropagation()}
                        className="font-medium"
                      >
                        {row.cells[column.key]}
                      </Link>
                    ) : (
                      row.cells[column.key]
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
