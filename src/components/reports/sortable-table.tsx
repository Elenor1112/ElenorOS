"use client";
import * as React from "react";
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
  type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";

/** A numeric column: right-aligned, sorts high → low first. */
export function numCol<T>(key: keyof T & string, header: string): ColumnDef<T> {
  return {
    accessorKey: key,
    header,
    sortDescFirst: true,
    sortUndefined: "last",
    meta: { numeric: true },
  };
}

/** A percentage column where null means "no basis" and sorts below a real 0%. */
export function pctCol<T>(key: keyof T & string, header: string): ColumnDef<T> {
  return {
    ...numCol<T>(key, header),
    accessorFn: (r) => (r[key] as number | null) ?? undefined,
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      return v === undefined ? "—" : `${v}%`;
    },
  };
}

/** Per-person report table with click-to-sort headers. */
export function SortableTable<T>({ rows, columns }: { rows: T[]; columns: ColumnDef<T>[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-border text-xs text-muted-foreground">
              {hg.headers.map((h) => {
                const numeric = (h.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric;
                const dir = h.column.getIsSorted();
                return (
                  <th key={h.id} className={`whitespace-nowrap px-2 py-2 font-medium ${numeric ? "text-end" : "text-start"}`}>
                    <button
                      onClick={h.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 hover:text-foreground print:pointer-events-none"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {dir === "asc" && <ArrowUp className="size-3" />}
                      {dir === "desc" && <ArrowDown className="size-3" />}
                    </button>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60 last:border-0">
              {row.getVisibleCells().map((cell) => {
                const numeric = (cell.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric;
                return (
                  <td key={cell.id} className={`whitespace-nowrap px-2 py-2 ${numeric ? "text-end tabular-nums" : ""}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
