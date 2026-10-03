import clsx from 'clsx';
import { Plus, Search, Sprout } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { PlantingTable } from '@/components/crops/PlantingTable';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { usePlantings } from '@/hooks/queries';

const TABS = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'HARVESTED', label: 'Harvested' },
  { key: 'ALL', label: 'All' },
] as const;

export default function CropsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('ACTIVE');
  const [query, setQuery] = useState('');
  const { data, isLoading, error, refetch } = usePlantings(tab);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((p) =>
      [p.crop.name, p.variety, p.field.name, p.farm.name].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, query]);

  return (
    <>
      <PageHeader
        title="My Crops"
        description="Every planting with its estimated harvest window, readiness and current weather risk."
        actions={<Link to="/app/crops/new" className={buttonClass('primary')}><Plus className="h-4 w-4" aria-hidden="true" /> Record planting</Link>}
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Filter plantings" className="inline-flex rounded-lg bg-surface-2 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={clsx('rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors', tab === t.key ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink')}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="relative block sm:w-72">
            <span className="sr-only">Search crops</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search crop, variety or field"
              className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-[13.5px] text-ink placeholder:text-ink-3 focus:border-focus focus:ring-2 focus:ring-focus/30 focus:outline-none"
            />
          </label>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : filtered.length ? (
          <PlantingTable plantings={filtered} showFarm />
        ) : (
          <EmptyState
            icon={<Sprout className="h-5 w-5" />}
            title={query ? 'No matching crops' : tab === 'ACTIVE' ? 'No crops yet' : 'Nothing here yet'}
            description={query ? 'Try a different search term.' : 'Record your first planting to start tracking your growing season.'}
            action={!query && <Link to="/app/crops/new" className={buttonClass('primary', 'sm')}>Record planting</Link>}
          />
        )}
      </Card>
    </>
  );
}
