import { ArrowRight, Bell, CalendarRange, CloudRain, Database, LineChart, MessageSquare, Snowflake, Sprout, Wheat } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { buttonClass } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/services/api';
import { DEMO } from './AuthPages';

const FEATURES = [
  { icon: Sprout, title: 'Crop Tracking', body: 'Record every planting by farm and field, with variety, location and a running field journal.' },
  { icon: CalendarRange, title: 'Harvest Forecasting', body: 'Estimated harvest windows and readiness from each crop’s typical growing range — clearly labelled as estimates.' },
  { icon: CloudRain, title: 'Weather Monitoring', body: 'Current conditions and a 7-day outlook for each farm location, cached and resilient to provider outages.' },
  { icon: Bell, title: 'Smart Alerts', body: 'Server-side rules compare forecasts to crop sensitivity for frost, heat, heavy rain, wind and dry spells.' },
  { icon: Database, title: 'Farm Records', body: 'Season-over-season harvest history with yields, quality and timing against the original estimate.' },
  { icon: MessageSquare, title: 'SMS Notifications', body: 'Opt-in text messages for alerts at the severity you choose — delivered from the backend via Twilio.' },
];

const PIPELINE = ['Record planting', 'Estimate harvest window', 'Monitor forecast', 'Detect hazards', 'Alert & SMS', 'Record harvest'];

export default function LandingPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const viewDemo = async () => {
    if (status === 'authenticated') return navigate('/app');
    setDemoLoading(true);
    try {
      await login(DEMO.email, DEMO.password);
      navigate('/app');
    } catch (e) {
      setDemoError(errorMessage(e));
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg">
      <section className="relative overflow-hidden bg-charcoal text-[#ECE9E2]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_75%_20%,rgba(217,160,64,0.10),transparent_60%),radial-gradient(ellipse_50%_50%_at_10%_90%,rgba(124,159,224,0.08),transparent_60%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link to={status === 'authenticated' ? '/app' : '/login'} className="rounded-lg px-3 py-2 text-[14px] font-medium text-[#C9C6BE] hover:text-white">
              {status === 'authenticated' ? 'Open app' : 'Sign in'}
            </Link>
            <Link to="/register" className={buttonClass('accent', 'sm')}>Get Started</Link>
          </nav>
        </header>

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pt-12 pb-20 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:pt-20 lg:pb-28">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12.5px] text-[#C9C6BE]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D9A040]" aria-hidden="true" /> Crop operations & decision support
            </p>
            <h1 className="text-[42px] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-[56px]">
              Harvest Smarter.
              <br />
              <span className="text-[#A3A19A]">Plan With Better Data.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-[#B9B6AE]">
              Track crops, estimate harvest windows, monitor weather risks, and manage your growing season from one platform.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/register" className={buttonClass('accent', 'lg')}>
                Get Started <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button onClick={viewDemo} disabled={demoLoading} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/20 px-6 text-[15px] font-medium text-[#ECE9E2] transition-colors hover:border-white/35 hover:bg-white/[0.06] disabled:opacity-60">
                {demoLoading ? 'Opening demo…' : 'View Demo'}
              </button>
            </div>
            {demoError && <p role="alert" className="mt-3 text-[13px] text-[#F2877C]">{demoError}</p>}
          </div>
          <DashboardPreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28" aria-labelledby="features-heading">
        <div className="max-w-2xl">
          <p className="text-[12.5px] font-medium uppercase tracking-[0.1em] text-amber">Platform</p>
          <h2 id="features-heading" className="mt-2 text-[32px] font-semibold tracking-[-0.03em] text-ink">From planting to harvest, one operational record.</h2>
          <p className="mt-3 text-[16px] text-ink-3">Built for growers who want their field decisions grounded in data — without pretending forecasts are certainties.</p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="bg-surface p-7">
              <f.icon className="h-5 w-5 text-ink-2" aria-hidden="true" />
              <h3 className="mt-5 text-[16px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-3">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface-2/50" aria-labelledby="pipeline-heading">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <h2 id="pipeline-heading" className="text-[20px] font-semibold tracking-[-0.02em] text-ink">How HarvestTrack works</h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PIPELINE.map((step, i) => (
              <li key={step} className="relative rounded-xl border border-line bg-surface p-4">
                <span className="num text-[12px] font-medium text-amber">0{i + 1}</span>
                <p className="mt-1.5 text-[14px] font-medium text-ink">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-8">
        <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-ink">Ready to plan your next season?</h2>
        <p className="mt-2 text-ink-3">Create a free account or explore a fully populated demo farm.</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/register" className={buttonClass('primary', 'lg')}>Get Started</Link>
          <button onClick={viewDemo} className={buttonClass('secondary', 'lg')}>View Demo</button>
        </div>
      </section>

      <footer className="bg-charcoal text-[#A3A19A]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-[13.5px] leading-relaxed">Crop lifecycle tracking, harvest forecasting and weather-risk alerts for growers.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-[13.5px] sm:grid-cols-3">
            <div>
              <h3 className="mb-3 font-medium text-[#ECE9E2]">Product</h3>
              <ul className="space-y-2"><li>Crop tracking</li><li>Harvest forecasting</li><li>Weather alerts</li></ul>
            </div>
            <div>
              <h3 className="mb-3 font-medium text-[#ECE9E2]">Account</h3>
              <ul className="space-y-2">
                <li><Link to="/login" className="hover:text-white">Sign in</Link></li>
                <li><Link to="/register" className="hover:text-white">Create account</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 font-medium text-[#ECE9E2]">Data</h3>
              <ul className="space-y-2"><li>Weather: Open-Meteo / OpenWeatherMap</li><li>SMS: Twilio</li></ul>
            </div>
          </div>
        </div>
        <div className="border-t border-white/[0.06]">
          <p className="mx-auto max-w-7xl px-5 py-5 text-[12.5px] sm:px-8">
            © {new Date().getFullYear()} HarvestTrack. Harvest estimates and weather alerts are informational guidance, not guarantees.
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Static, illustrative product preview for the hero (not live data). */
function DashboardPreview() {
  const bars = [62, 74, 70, 58, 66, 80, 77];
  return (
    <div className="relative" aria-label="Illustrative HarvestTrack dashboard preview" role="img">
      <div className="rounded-2xl border border-white/10 bg-[#1F2023]/90 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <span className="text-[11.5px] text-[#8C8A84]">Harvest Valley Farm · 3 fields</span>
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#8C8A84]">Harvest readiness · Corn</div>
            <div className="mt-3 flex items-center gap-4">
              <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="#D9A040" strokeWidth="6" strokeLinecap="round" strokeDasharray="163.4" strokeDashoffset="21" />
              </svg>
              <div>
                <div className="num text-[26px] font-semibold tracking-[-0.03em]">87%</div>
                <div className="text-[12px] text-[#A3A19A]">Harvest approaching</div>
              </div>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-white/[0.08]"><div className="h-full w-[78%] rounded-full bg-[#7C9FE0]" /></div>
            <div className="mt-2 flex justify-between text-[10.5px] text-[#8C8A84]"><span>Planted Apr 15</span><span>Est. Jul 24 – Aug 13</span></div>
          </div>

          <div className="col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#8C8A84]">Weather</div>
            <div className="num mt-2 text-[28px] font-semibold tracking-[-0.03em]">24°</div>
            <div className="text-[12px] text-[#A3A19A]">Partly cloudy · 61%</div>
            <div className="mt-3 flex h-10 items-end gap-1">
              {bars.map((h, i) => <div key={i} className="flex-1 rounded-t-sm bg-[#7C9FE0]/70" style={{ height: `${h}%` }} />)}
            </div>
          </div>

          <div className="col-span-5 flex items-start gap-3 rounded-xl border border-[#E07A5A]/25 bg-[#E07A5A]/[0.07] p-3.5">
            <Snowflake className="mt-0.5 h-4 w-4 shrink-0 text-[#EC8A68]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[12.5px] font-semibold"><span className="rounded bg-[#F2877C]/15 px-1.5 py-px text-[10px] tracking-wide text-[#F2877C]">HIGH</span> Frost Warning</div>
              <div className="mt-0.5 truncate text-[12px] text-[#B9B6AE]">Lows near -1°C tomorrow at South Field — potatoes may be at risk.</div>
            </div>
          </div>

          <div className="col-span-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-[#8C8A84]"><Wheat className="h-3.5 w-3.5" aria-hidden="true" /> Upcoming harvest</div>
            {[['Tomato · Greenhouse', 'In window'], ['Corn · North Field', '8 days'], ['Lettuce · Field A', '15 days']].map(([a, b]) => (
              <div key={a} className="mt-2.5 flex justify-between text-[12.5px]"><span className="text-[#C9C6BE]">{a}</span><span className="num text-[#ECE9E2]">{b}</span></div>
            ))}
          </div>
          <div className="col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-[#8C8A84]"><LineChart className="h-3.5 w-3.5" aria-hidden="true" /> Farm</div>
            <dl className="mt-2 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between"><dt className="text-[#A3A19A]">Active</dt><dd className="num">6</dd></div>
              <div className="flex justify-between"><dt className="text-[#A3A19A]">Ready</dt><dd className="num">1</dd></div>
              <div className="flex justify-between"><dt className="text-[#A3A19A]">Alerts</dt><dd className="num text-[#EC8A68]">3</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
