import clsx from 'clsx';
import {
  Bell,
  CloudSun,
  History,
  LayoutDashboard,
  ListTree,
  LogOut,
  Map,
  Menu,
  Moon,
  PlusCircle,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { Logo } from '../brand/Logo';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/crops', label: 'My Crops', icon: ListTree, end: true },
  { to: '/app/crops/new', label: 'Add Planting', icon: PlusCircle },
  { to: '/app/farms', label: 'Farms & Fields', icon: Map },
  { to: '/app/harvests', label: 'Harvest History', icon: History },
  { to: '/app/alerts', label: 'Alerts', icon: Bell, badge: true },
  { to: '/app/weather', label: 'Weather', icon: CloudSun },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-8">
        <Link to="/app" onClick={onNavigate} aria-label="HarvestTrack dashboard">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                isActive ? 'bg-white/[0.08] text-white' : 'text-[#A3A19A] hover:bg-white/[0.04] hover:text-[#ECE9E2]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={clsx('h-[18px] w-[18px]', isActive ? 'text-[#D9A040]' : 'text-[#7D7B75] group-hover:text-[#A3A19A]')} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.badge && unread > 0 && (
                  <span className="num rounded-full bg-[#C2573A] px-1.5 py-px text-[11px] font-semibold text-white" aria-label={`${unread} unread`}>
                    {unread}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2E3035] text-[12px] font-semibold text-[#ECE9E2]" aria-hidden="true">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-[#ECE9E2]">{user?.name}</div>
            <div className="truncate text-[12px] text-[#8C8A84]">{user?.email}</div>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            className="rounded-md p-1.5 text-[#8C8A84] hover:bg-white/[0.06] hover:text-white"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { data } = useDashboard();
  const location = useLocation();
  const unread = data?.kpis.unreadAlerts ?? 0;

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-charcoal lg:block">
        <SidebarContent unread={unread} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-charcoal shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-6 right-4 rounded-md p-1 text-[#A3A19A] hover:text-white" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent unread={unread} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
          <button className="-ml-1 rounded-md p-1.5 text-ink-2 hover:bg-surface-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-[13px] text-ink-3 max-sm:hidden">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Link to="/app/alerts" className="relative rounded-lg p-2 text-ink-2 hover:bg-surface-2" aria-label={`Alerts${unread ? `, ${unread} unread` : ''}`}>
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-terra ring-2 ring-bg" aria-hidden="true" />}
            </Link>
            <button onClick={toggle} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <AppLayout />;
}

/**
 * Login/register guard. Only redirects visitors who arrive already signed in; when the
 * user signs in on this page, the page itself navigates (to the dashboard, onboarding,
 * or the route they were sent away from).
 */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const sawAnonymous = useRef(false);
  if (status === 'anonymous') sawAnonymous.current = true;
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated' && !sawAnonymous.current) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg" role="status">
      <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-3">
        <div className="skeleton h-full w-full" />
      </div>
      <span className="sr-only">Loading HarvestTrack…</span>
    </div>
  );
}
