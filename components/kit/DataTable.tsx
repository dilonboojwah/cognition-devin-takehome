"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          className="h-8 w-64 text-[13px]"
          aria-label="Text filter"
        />
        {allFacets.map((facet) => (
          <Select
            key={facet.key}
            value={selected[facet.key] ?? ALL}
            onValueChange={(value) =>
              setSelected((current) => ({ ...current, [facet.key]: value }))
            }
          >
            <SelectTrigger className="h-8 w-44 text-[13px]" aria-label={`${facet.label} filter`}>
              <SelectValue placeholder={facet.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL} className="text-[13px]">
                {facet.label}
              </SelectItem>
              {facet.options.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-[13px]">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <span className="section-index ml-1">
          {visible.length} / {rows.length}
        </span>
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
                        className="font-medium underline-offset-4 hover:text-primary hover:underline"
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
