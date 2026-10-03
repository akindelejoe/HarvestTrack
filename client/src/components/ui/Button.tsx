import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-ink hover:opacity-90 shadow-sm',
  accent: 'bg-[#D9A040] text-[#17181A] hover:bg-[#E3AF55]',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2 hover:border-line-strong',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-red-soft text-red border border-transparent hover:border-red/30',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-[background,opacity,border-color,color] disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  clsx(
    'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-[background,opacity,border-color,color]',
    variants[variant],
    sizes[size],
    className,
  );
