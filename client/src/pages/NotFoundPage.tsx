import { Link } from 'react-router';
import { LogoMark } from '@/components/brand/Logo';
import { buttonClass } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <LogoMark className="h-10 w-10" />
      <p className="num mt-8 text-[13px] font-medium tracking-[0.1em] text-ink-3">404</p>
      <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.025em] text-ink">This page isn’t on the map</h1>
      <p className="mt-2 text-ink-3">The page you’re looking for doesn’t exist or has moved.</p>
      <Link to="/" className={buttonClass('primary', 'md', 'mt-8')}>Back to HarvestTrack</Link>
    </div>
  );
}
