import clsx from 'clsx';

/**
 * HarvestTrack mark: two crop rows form an "H", joined by an amber horizon line
 * (the harvest point on a growth timeline). Short tick marks read as planted rows.
 */
export function LogoMark({ className = 'h-8 w-8', framed = true }: { className?: string; framed?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {framed && <rect width="32" height="32" rx="8" className="fill-charcoal" />}
      <path d="M9 8v16M23 8v16" stroke="#ECE9E2" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M9 16h14" stroke="#D9A040" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 21h6M13 11h6" stroke="#8A8C92" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'auto' }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark framed={tone === 'auto'} className="h-8 w-8 shrink-0" />
      <span
        className={clsx(
          'text-[17px] font-semibold tracking-[-0.02em]',
          tone === 'light' ? 'text-[#F3F0E8]' : 'text-ink',
        )}
      >
        Harvest<span className={tone === 'light' ? 'text-[#9C9A93]' : 'text-ink-3'}>Track</span>
      </span>
    </span>
  );
}
