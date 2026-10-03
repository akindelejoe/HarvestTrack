import type { ReactNode } from 'react';

/** Shared tooltip shell: text in ink tokens, a colored swatch carries series identity. */
export function TooltipShell({ title, rows }: { title: ReactNode; rows: { color: string; label: string; value: ReactNode }[] }) {
  return (
    <div className="min-w-36 rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] shadow-lg">
      <div className="mb-1 font-medium text-ink">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: r.color }} aria-hidden="true" />
            {r.label}
          </span>
          <span className="num font-medium text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
