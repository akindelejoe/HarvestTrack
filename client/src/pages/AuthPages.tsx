import { ArrowLeft } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { FormField, Input } from '@/components/ui/Form';
import { InlineError } from '@/components/ui/States';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, errorMessage } from '@/services/api';

export const DEMO = { email: 'demo@harvesttrack.app', password: 'HarvestDemo1' };

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-charcoal p-12 text-[#ECE9E2] lg:flex lg:flex-col lg:justify-between">
        <Link to="/" aria-label="HarvestTrack home"><Logo /></Link>
        <FieldLines />
        <div className="relative max-w-md">
          <p className="text-[26px] leading-snug font-medium tracking-[-0.02em]">“Every planting, every forecast and every harvest — in one operational view.”</p>
          <p className="mt-4 text-[14px] text-[#A3A19A]">Estimate harvest windows, monitor weather risk and keep season-over-season records.</p>
        </div>
      </aside>
      <main className="flex flex-col justify-center bg-bg px-5 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink lg:hidden"><ArrowLeft className="h-4 w-4" /> Home</Link>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">{title}</h1>
          <p className="mt-1.5 text-[14px] text-ink-3">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-[13.5px] text-ink-3">{footer}</p>
        </div>
      </main>
    </div>
  );
}

/** Decorative crop-row lines converging on a horizon. */
function FieldLines() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 w-full opacity-60" viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: 15 }).map((_, i) => (
        <line key={i} x1={300} y1={60} x2={-300 + i * 85} y2={400} stroke="#ECE9E2" strokeOpacity={0.07} strokeWidth={1} />
      ))}
      <line x1={0} y1={60} x2={600} y2={60} stroke="#D9A040" strokeOpacity={0.5} strokeWidth={1.5} />
    </svg>
  );
}

export function LoginPage() {
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  async function doLogin(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Incorrect email or password.' : errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Enter a valid email address.';
    if (!form.password) er.password = 'Password is required.';
    setErrors(er);
    if (!Object.keys(er).length) doLogin(form.email, form.password);
  }

  return (
    <AuthShell title="Sign in" subtitle="Welcome back to HarvestTrack." footer={<>New to HarvestTrack? <Link to="/register" className="font-medium text-ink hover:underline">Create an account</Link></>}>
      {sessionExpired && !error && <div className="mb-4"><InlineError message="Your session expired. Please sign in again." /></div>}
      <form onSubmit={submit} noValidate className="space-y-4">
        <InlineError message={error} />
        <FormField label="Email" error={errors.email}>{(p) => <Input {...p} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</FormField>
        <FormField label="Password" error={errors.password}>{(p) => <Input {...p} type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</FormField>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Sign in</Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-[12px] text-ink-3"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <Button variant="secondary" className="w-full" onClick={() => doLogin(DEMO.email, DEMO.password)} disabled={loading}>Explore the demo account</Button>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (form.name.trim().length < 2) er.name = 'Name must be at least 2 characters.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Enter a valid email address.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) er.password = 'Use at least 8 characters with a letter and a number.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setLoading(true);
    setError(null);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate('/app/farms', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v[0]])));
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start tracking your growing season in minutes." footer={<>Already have an account? <Link to="/login" className="font-medium text-ink hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <InlineError message={error} />
        <FormField label="Full name" error={errors.name}>{(p) => <Input {...p} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</FormField>
        <FormField label="Email" error={errors.email}>{(p) => <Input {...p} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</FormField>
        <FormField label="Password" error={errors.password} hint="At least 8 characters, including a letter and a number.">{(p) => <Input {...p} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</FormField>
        <Button type="submit" className="w-full" size="lg" loading={loading}>Create account</Button>
      </form>
    </AuthShell>
  );
}
