import clsx from 'clsx';
import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDot, Clock, Info, Sprout, Wheat, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { RISK_META, SEVERITY_META, STATUS_META, type Tone } from '@/lib/format';
import type { DisplayStatus, RiskLevel, Severity } from '@/types';

const tones: Record<Tone, string> = {
  slate: 'bg-slate-soft text-slate',
  amber: 'bg-amber-soft text-amber',
  gold: 'bg-gold-soft text-gold',
  terra: 'bg-terra-soft text-terra',
  red: 'bg-red-soft text-red',
  sage: 'bg-sage-soft text-sage',
  gray: 'bg-gray-soft text-gray',
  violet: 'bg-surface-2 text-violet',
};

export function Badge({ tone, icon, children, className }: { tone: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const textTones: Record<Tone, string> = {
  slate: 'text-slate', amber: 'text-amber', gold: 'text-gold', terra: 'text-terra',
  red: 'text-red', sage: 'text-sage', gray: 'text-gray', violet: 'text-violet',
};

const statusIcons: Record<DisplayStatus, ReactNode> = {
  GROWING: <Sprout className="h-3.5 w-3.5" aria-hidden="true" />,
  HARVEST_SOON: <Clock className="h-3.5 w-3.5" aria-hidden="true" />,
  READY: <Wheat className="h-3.5 w-3.5" aria-hidden="true" />,
  AT_RISK: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
  HARVESTED: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
  FAILED: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} icon={statusIcons[status]}>
      {meta.label}
    </Badge>
  );
}

const severityIcons: Record<Severity, ReactNode> = {
  HIGH: <AlertOctagon className="h-3.5 w-3.5" aria-hidden="true" />,
  MODERATE: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
  LOW: <Info className="h-3.5 w-3.5" aria-hidden="true" />,
};

/** Severity is always conveyed by icon + text, never color alone. */
export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Badge tone={SEVERITY_META[severity].tone} icon={severityIcons[severity]} className={clsx('uppercase tracking-wide text-[11px]', className)}>
      {severity}
    </Badge>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const meta = RISK_META[level];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 whitespace-nowrap">
      {level === 'NONE' ? (
        <CircleDot className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
      ) : (
        <span className={clsx('inline-flex', textTones[meta.tone])}>{severityIcons[level as Severity]}</span>
      )}
      {meta.label}
    </span>
  );
}
