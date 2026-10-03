import type { ReactNode } from 'react';

export function PageHeader({ title, description, eyebrow, actions }: { title: ReactNode; description?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">{eyebrow}</div>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
