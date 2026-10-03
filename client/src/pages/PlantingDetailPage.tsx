import clsx from 'clsx';
import { ArrowLeft, Bell, CalendarRange, MapPin, MessageSquarePlus, MoreHorizontal, Pencil, Trash2, Wheat, XCircle } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AlertCard } from '@/components/alerts/AlertCard';
import { CropTimeline, daysRemainingLabel } from '@/components/crops/CropTimeline';
import { HarvestReadiness } from '@/components/crops/HarvestReadiness';
import { ForecastStrip, CurrentConditions } from '@/components/weather/WeatherPanels';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { FormField, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { ErrorState, InlineError, PageSkeleton, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAddNote, useAlerts, useDeletePlanting, useMarkAlertRead, usePlanting, useRecordHarvest, useUpdatePlanting, useWeather } from '@/hooks/queries';
import { formatDate, formatNumber, formatWindow, QUALITY_LABEL, relativeTime, todayISO, UNIT_LABEL } from '@/lib/format';
import { ApiError, errorMessage } from '@/services/api';
import type { Activity, PlantingDetail } from '@/types';

export default function PlantingDetailPage() {
  const { id = '' } = useParams();
  const { data: p, isLoading, error, refetch } = usePlanting(id);
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) return <PageSkeleton />;
  if (error || !p) {
    return (
      <>
        <BackLink />
        <Card><ErrorState error={error} title={error instanceof ApiError && error.status === 404 ? 'Planting not found' : undefined} onRetry={() => refetch()} /></Card>
      </>
    );
  }

  const active = p.status === 'ACTIVE';

  return (
    <>
      <BackLink />
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-ink">{p.variety ? `${p.crop.name} · ${p.variety}` : p.crop.name}</h1>
            <StatusBadge status={p.displayStatus} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] text-ink-3">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {p.field.name} · {p.farm.name}{p.plotLocation && ` · ${p.plotLocation}`}
          </p>
        </div>
        <div className="flex gap-2">
          {active && (
            <Button onClick={() => setHarvestOpen(true)}>
              <Wheat className="h-4 w-4" aria-hidden="true" /> Record Harvest
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </Button>
          <MoreMenu planting={p} />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-5 lg:col-span-8 lg:space-y-6">
          <Card>
            <CardHeader title="Harvest estimate" icon={<CalendarRange className="h-4 w-4" />} />
            <div className="space-y-6 p-5">
              <HarvestReadiness progress={p.progress} cropName={p.crop.name} />
              <CropTimeline planting={p} />
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
                {[
                  ['Planted', formatDate(p.plantingDate)],
                  ['Days growing', `${p.progress.daysGrowing} days`],
                  ['Estimated Harvest Window', formatWindow(p.estimatedHarvestStart, p.estimatedHarvestEnd)],
                  [p.harvest ? 'Harvested' : 'Days remaining', p.harvest ? formatDate(p.harvest.actualHarvestDate) : daysRemainingLabel(p)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-surface p-3.5">
                    <dt className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">{k}</dt>
                    <dd className="num mt-1 text-[14px] font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-[12.5px] text-ink-3">
                Based on a typical {p.crop.name.toLowerCase()} growing range of {p.crop.minDaysToHarvest}–{p.crop.maxDaysToHarvest} days. This is an estimate, not a guarantee of maturity.
              </p>
            </div>
          </Card>

          {p.harvest && (
            <Card className="border-sage/30">
              <CardHeader title="Harvest record" icon={<Wheat className="h-4 w-4" />} />
              <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                <Stat label="Harvest date" value={formatDate(p.harvest.actualHarvestDate)} />
                <Stat label="Yield" value={`${formatNumber(p.harvest.quantity, 2)} ${UNIT_LABEL[p.harvest.unit]}`} />
                <Stat label="Quality" value={QUALITY_LABEL[p.harvest.quality]} />
                <Stat label="Vs. estimate" value={deviation(p)} />
                {p.harvest.notes && <div className="col-span-full text-[13.5px] text-ink-2">{p.harvest.notes}</div>}
              </dl>
            </Card>
          )}

          <WarningsSection plantingId={p.id} />
          <ActivitySection planting={p} />
        </div>

        <div className="space-y-5 lg:col-span-4 lg:space-y-6">
          <Card>
            <CardHeader title="Planting information" />
            <dl className="space-y-3 p-5 text-[13.5px]">
              <Row label="Crop" value={p.crop.name} />
              <Row label="Variety" value={p.variety ?? '—'} />
              <Row label="Farm" value={p.farm.name} />
              <Row label="Field" value={p.field.name} />
              <Row label="Location" value={p.plotLocation ?? p.farm.location} />
              <Row label="Ideal temperature" value={`${p.cropProfile.idealTempMinC}–${p.cropProfile.idealTempMaxC}°C`} />
              <Row
                label="Sensitivities"
                value={[p.cropProfile.frostSensitive && 'Frost', p.cropProfile.excessRainSensitive && 'Excess rain', p.cropProfile.droughtSensitive && 'Drought', p.cropProfile.windSensitive && 'Wind'].filter(Boolean).join(', ') || '—'}
              />
            </dl>
            <div className="border-t border-line p-5">
              <h3 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Notes</h3>
              <p className="mt-1.5 text-[13.5px] whitespace-pre-line text-ink-2">{p.notes || 'No notes yet.'}</p>
            </div>
          </Card>
          <FarmWeather farmId={p.farm.id} />
        </div>
      </div>

      <HarvestModal planting={p} open={harvestOpen} onClose={() => setHarvestOpen(false)} />
      <EditModal planting={p} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}

function BackLink() {
  return (
    <Link to="/app/crops" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My Crops
    </Link>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <dt className="text-ink-3">{label}</dt>
    <dd className="text-right font-medium text-ink">{value}</dd>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">{label}</dt>
    <dd className="num mt-1 text-[15px] font-semibold text-ink">{value}</dd>
  </div>
);

function deviation(p: PlantingDetail) {
  if (!p.harvest) return '—';
  const d = Math.round((Date.parse(p.harvest.actualHarvestDate) - Date.parse(p.estimatedHarvestStart)) / 86_400_000);
  const end = Math.round((Date.parse(p.harvest.actualHarvestDate) - Date.parse(p.estimatedHarvestEnd)) / 86_400_000);
  if (d < 0) return `${-d}d before window`;
  if (end > 0) return `${end}d after window`;
  return 'Within window';
}

function WarningsSection({ plantingId }: { plantingId: string }) {
  const { data, isLoading, error, refetch } = useAlerts({ plantingId });
  const markRead = useMarkAlertRead();
  return (
    <section aria-labelledby="warnings-heading">
      <h2 id="warnings-heading" className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Bell className="h-4 w-4 text-ink-3" aria-hidden="true" /> Warnings
      </h2>
      {isLoading ? (
        <Skeleton className="h-36 rounded-2xl" />
      ) : error ? (
        <Card><ErrorState compact error={error} onRetry={() => refetch()} /></Card>
      ) : data?.length ? (
        <div className="space-y-3">
          {data.slice(0, 4).map((a) => (
            <AlertCard key={a.id} alert={a} onMarkRead={() => markRead.mutate(a.id)} marking={markRead.isPending && markRead.variables === a.id} />
          ))}
        </div>
      ) : (
        <Card className="px-5 py-6 text-[13.5px] text-ink-3">No weather warnings for this planting.</Card>
      )}
    </section>
  );
}

const ACTIVITY_DOT: Record<Activity['type'], string> = {
  PLANTED: 'bg-slate',
  UPDATED: 'bg-gray',
  ALERT_RAISED: 'bg-terra',
  HARVESTED: 'bg-sage',
  NOTE: 'bg-amber',
};

function ActivitySection({ planting }: { planting: PlantingDetail }) {
  const [note, setNote] = useState('');
  const add = useAddNote(planting.id);
  const toast = useToast();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    add.mutate(note.trim(), { onSuccess: () => setNote(''), onError: (err) => toast('error', errorMessage(err)) });
  };

  return (
    <Card>
      <CardHeader title="Activity history" subtitle="Field journal and system events" />
      <form onSubmit={submit} className="flex gap-2 px-5 pt-4">
        <label htmlFor="note" className="sr-only">Add a field note</label>
        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a field note — scouting, irrigation, treatments…" maxLength={1000} />
        <Button type="submit" variant="secondary" loading={add.isPending} disabled={!note.trim()} aria-label="Add note">
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          <span className="max-sm:hidden">Add</span>
        </Button>
      </form>
      <ol className="p-5">
        {planting.activities.map((a, i) => (
          <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < planting.activities.length - 1 && <span className="absolute top-4 bottom-0 left-[4px] w-px bg-line" aria-hidden="true" />}
            <span className={clsx('relative mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full ring-4 ring-surface', ACTIVITY_DOT[a.type])} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[13.5px] text-ink">{a.description}</p>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {a.type.replace('_', ' ').toLowerCase()} · <time dateTime={a.createdAt}>{relativeTime(a.createdAt)}</time>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function FarmWeather({ farmId }: { farmId: string }) {
  const { data, isLoading, error, refetch } = useWeather(farmId);
  return (
    <Card>
      <CardHeader title="Weather" subtitle="At this farm" />
      <div className="p-5 pt-3">
        {isLoading ? <Skeleton className="h-48" /> : error ? <ErrorState compact title="Weather unavailable" error={error} onRetry={() => refetch()} /> : data?.weather ? (
          <div className="space-y-5">
            <CurrentConditions weather={data.weather} />
            <div className="[&_ol]:grid-cols-4 [&_ol>li:nth-child(n+5)]:hidden">
              <ForecastStrip weather={data.weather} />
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function MoreMenu({ planting }: { planting: PlantingDetail }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const del = useDeletePlanting();
  const update = useUpdatePlanting(planting.id);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl">
          {planting.status === 'ACTIVE' && (
            <button
              role="menuitem"
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13.5px] text-ink-2 hover:bg-surface-2"
              onClick={() =>
                update.mutate({ status: 'FAILED' }, { onSuccess: () => { toast('success', 'Planting marked as failed.'); setOpen(false); }, onError: (e) => toast('error', errorMessage(e)) })
              }
            >
              <XCircle className="h-4 w-4" aria-hidden="true" /> Mark as failed
            </button>
          )}
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13.5px] text-red hover:bg-red-soft"
            onClick={() => {
              if (!confirm(`Delete this ${planting.crop.name.toLowerCase()} planting and its history? This cannot be undone.`)) return;
              del.mutate(planting.id, { onSuccess: () => { toast('success', 'Planting deleted.'); navigate('/app/crops'); }, onError: (e) => toast('error', errorMessage(e)) });
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete planting
          </button>
        </div>
      )}
    </div>
  );
}

function HarvestModal({ planting, open, onClose }: { planting: PlantingDetail; open: boolean; onClose: () => void }) {
  const record = useRecordHarvest(planting.id);
  const toast = useToast();
  const [form, setForm] = useState({ actualHarvestDate: todayISO(), quantity: '', unit: 'KG', quality: 'GOOD', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!form.actualHarvestDate) er.actualHarvestDate = 'Harvest date is required.';
    else if (form.actualHarvestDate < planting.plantingDate) er.actualHarvestDate = `Harvest date cannot be before the planting date (${formatDate(planting.plantingDate)}).`;
    else if (form.actualHarvestDate > todayISO()) er.actualHarvestDate = 'Harvest date cannot be in the future.';
    const qty = Number(form.quantity);
    if (form.quantity === '' || Number.isNaN(qty)) er.quantity = 'Enter the harvested quantity.';
    else if (qty < 0) er.quantity = 'Quantity cannot be negative.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setFormError(null);
    try {
      await record.mutateAsync({ ...form, quantity: qty });
      toast('success', `Harvest recorded — ${planting.crop.name} marked as harvested.`);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v[0]])));
      setFormError(errorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Harvest" description={`${planting.crop.name} · ${planting.field.name} · planted ${formatDate(planting.plantingDate)}`}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <InlineError message={formError} />
        <FormField label="Actual harvest date" required error={errors.actualHarvestDate}>
          {(p) => <Input {...p} type="date" min={planting.plantingDate} max={todayISO()} value={form.actualHarvestDate} onChange={set('actualHarvestDate')} />}
        </FormField>
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <FormField label="Quantity" required error={errors.quantity}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min={0} step="any" value={form.quantity} onChange={set('quantity')} placeholder="0" />}
          </FormField>
          <FormField label="Unit" required>
            {(p) => (
              <Select {...p} value={form.unit} onChange={set('unit')}>
                {Object.entries(UNIT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            )}
          </FormField>
        </div>
        <FormField label="Crop quality" required>
          {(p) => (
            <Select {...p} value={form.quality} onChange={set('quality')}>
              {Object.entries(QUALITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          )}
        </FormField>
        <FormField label="Notes" optional>
          {(p) => <Textarea {...p} value={form.notes} onChange={set('notes')} placeholder="Moisture, grading, buyer…" maxLength={2000} />}
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={record.isPending}>Save harvest</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({ planting, open, onClose }: { planting: PlantingDetail; open: boolean; onClose: () => void }) {
  const update = useUpdatePlanting(planting.id);
  const toast = useToast();
  const [form, setForm] = useState({ variety: '', plantingDate: '', plotLocation: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  const harvested = planting.status === 'HARVESTED';

  useEffect(() => {
    if (open) setForm({ variety: planting.variety ?? '', plantingDate: planting.plantingDate, plotLocation: planting.plotLocation ?? '', notes: planting.notes ?? '' });
  }, [open, planting]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!harvested && form.plantingDate > todayISO()) return setError('Planting date cannot be in the future.');
    setError(null);
    try {
      const { plantingDate, ...rest } = form;
      await update.mutateAsync(harvested || plantingDate === planting.plantingDate ? rest : form);
      toast('success', 'Planting updated.');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit planting" description="Changing the planting date recalculates the estimated harvest window.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <InlineError message={error} />
        <FormField label="Variety" optional>{(p) => <Input {...p} value={form.variety} onChange={set('variety')} maxLength={120} />}</FormField>
        <FormField label="Planting date" hint={harvested ? 'Locked after harvest.' : undefined}>
          {(p) => <Input {...p} type="date" max={todayISO()} value={form.plantingDate} onChange={set('plantingDate')} disabled={harvested} />}
        </FormField>
        <FormField label="Location within field" optional>{(p) => <Input {...p} value={form.plotLocation} onChange={set('plotLocation')} maxLength={160} />}</FormField>
        <FormField label="Notes" optional>{(p) => <Textarea {...p} value={form.notes} onChange={set('notes')} maxLength={2000} />}</FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={update.isPending}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}
