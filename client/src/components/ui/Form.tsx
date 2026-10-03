import clsx from 'clsx';
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const control =
  'w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors focus:outline-none focus:ring-2 focus:ring-focus/30 focus:border-focus disabled:opacity-60 aria-[invalid=true]:border-red aria-[invalid=true]:focus:ring-red/25';

interface FieldWrapperProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
  className?: string;
}

/** Label + control + hint/error, wired up with ids for screen readers. */
export function FormField({ label, hint, error, required, optional, children, className }: FieldWrapperProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-[13px] font-medium text-ink-2">
        <span>
          {label}
          {required && <span className="ml-0.5 text-terra" aria-hidden="true">*</span>}
        </span>
        {optional && <span className="text-[12px] font-normal text-ink-3">Optional</span>}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[12.5px] text-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={clsx(control, 'h-10 border-line', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={clsx(control, 'h-10 appearance-none border-line bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238c8a84' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={clsx(control, 'min-h-24 border-line py-2.5', className)} {...rest} />;
});

export function Toggle({ checked, onChange, label, description, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; id?: string }) {
  const autoId = useId();
  const tid = id ?? autoId;
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <label htmlFor={tid} className="text-sm font-medium text-ink">{label}</label>
        {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
      </div>
      <button
        id={tid}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx('relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-slate' : 'bg-surface-3')}
      >
        <span className={clsx('inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}
