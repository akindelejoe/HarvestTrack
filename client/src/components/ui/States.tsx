import clsx from 'clsx';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '@/services/api';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={clsx('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-16', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface-2 text-ink-3">{icon}</div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13.5px] leading-relaxed text-ink-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "We couldn't load this", compact }: { error: unknown; onRetry?: () => void; title?: string; compact?: boolean }) {
  return (
    <div role="alert" className={clsx('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14')}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-terra-soft text-terra">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13.5px] text-ink-3">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red/20 bg-red-soft px-3 py-2.5 text-[13px] text-red">
      <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
