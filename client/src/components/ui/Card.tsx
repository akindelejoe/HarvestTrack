import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('rounded-2xl border border-line bg-surface', className)} {...rest} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
  as: Heading = 'h2',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-ink-3">{icon}</span>}
        <div className="min-w-0">
          <Heading className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</Heading>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
