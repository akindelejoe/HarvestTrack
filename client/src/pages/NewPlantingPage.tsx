import { CalendarRange, Info, Map } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField, Input, Select, Textarea } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, InlineError, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useCreatePlanting, useCropTypes, useFarms } from '@/hooks/queries';
import { formatDate, todayISO } from '@/lib/format';
import { ApiError } from '@/services/api';

const NEW_FIELD = '__new__';

function addDays(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function NewPlantingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const crops = useCropTypes();
  const farms = useFarms();
  const create = useCreatePlanting();

  const [form, setForm] = useState({ cropTypeId: '', variety: '', plantingDate: todayISO(), farmId: '', fieldId: '', newFieldName: '', plotLocation: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.farmId && farms.data?.length) setForm((f) => ({ ...f, farmId: farms.data[0].id }));
  }, [farms.data, form.farmId]);

  const farm = farms.data?.find((f) => f.id === form.farmId);
  const crop = crops.data?.find((c) => c.id === form.cropTypeId);
  const preview = useMemo(() => {
    if (!crop || !/^\d{4}-\d{2}-\d{2}$/.test(form.plantingDate)) return null;
    return { start: addDays(form.plantingDate, crop.minDaysToHarvest), end: addDays(form.plantingDate, crop.maxDaysToHarvest) };
  }, [crop, form.plantingDate]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value, ...(key === 'farmId' && { fieldId: '' }) }));
    setErrors((er) => ({ ...er, [key]: '' }));
  };

  function validate() {
    const e: Record<string, string> = {};
    if (!form.cropTypeId) e.cropTypeId = 'Select a crop.';
    if (!form.plantingDate) e.plantingDate = 'Planting date is required.';
    else if (form.plantingDate > todayISO()) e.plantingDate = 'Planting date cannot be in the future.';
    if (!form.farmId) e.farmId = 'Select a farm.';
    if (!form.fieldId) e.fieldId = 'Select a field.';
    if (form.fieldId === NEW_FIELD && !form.newFieldName.trim()) e.newFieldName = 'Enter a name for the new field.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    try {
      const planting = await create.mutateAsync({
        cropTypeId: form.cropTypeId,
        farmId: form.farmId,
        ...(form.fieldId === NEW_FIELD ? { newFieldName: form.newFieldName.trim() } : { fieldId: form.fieldId }),
        variety: form.variety,
        plantingDate: form.plantingDate,
        plotLocation: form.plotLocation,
        notes: form.notes,
      });
      toast('success', `${planting.crop.name} recorded. Estimated harvest window ${formatDate(planting.estimatedHarvestStart, { year: false })} – ${formatDate(planting.estimatedHarvestEnd)}.`);
      navigate(`/app/crops/${planting.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v[0]])));
        setFormError(err.message);
      } else setFormError('Could not save the planting.');
    }
  }

  if (crops.isLoading || farms.isLoading) return <Skeleton className="h-[560px] rounded-2xl" />;
  if (crops.error || farms.error) return <ErrorState error={crops.error ?? farms.error} onRetry={() => { crops.refetch(); farms.refetch(); }} />;
  if (!farms.data?.length) {
    return (
      <Card>
        <EmptyState icon={<Map className="h-5 w-5" />} title="Create a farm first" description="Plantings belong to a field on one of your farms." action={<Link to="/app/farms" className={buttonClass('primary')}>Add a farm</Link>} />
      </Card>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Plantings" title="Record New Planting" description="HarvestTrack estimates a harvest window from the crop's typical growing range and starts monitoring local weather risks." />
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <form onSubmit={onSubmit} noValidate className="space-y-6 p-5 sm:p-6">
            <InlineError message={formError} />
            <fieldset className="grid gap-5 sm:grid-cols-2">
              <legend className="mb-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">Crop</legend>
              <FormField label="Crop name" required error={errors.cropTypeId}>
                {(p) => (
                  <Select {...p} value={form.cropTypeId} onChange={set('cropTypeId')}>
                    <option value="">Select a crop…</option>
                    {crops.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                )}
              </FormField>
              <FormField label="Crop variety" optional error={errors.variety}>
                {(p) => <Input {...p} value={form.variety} onChange={set('variety')} placeholder="e.g. Silver Queen" maxLength={120} />}
              </FormField>
              <FormField label="Planting date" required error={errors.plantingDate}>
                {(p) => <Input {...p} type="date" value={form.plantingDate} max={todayISO()} onChange={set('plantingDate')} />}
              </FormField>
            </fieldset>

            <fieldset className="grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
              <legend className="sr-only">Location</legend>
              <div className="sm:col-span-2 -mb-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3" aria-hidden="true">Location</div>
              <FormField label="Farm" required error={errors.farmId}>
                {(p) => (
                  <Select {...p} value={form.farmId} onChange={set('farmId')}>
                    {farms.data.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </Select>
                )}
              </FormField>
              <FormField label="Field" required error={errors.fieldId}>
                {(p) => (
                  <Select {...p} value={form.fieldId} onChange={set('fieldId')}>
                    <option value="">Select a field…</option>
                    {farm?.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    <option value={NEW_FIELD}>+ New field…</option>
                  </Select>
                )}
              </FormField>
              {form.fieldId === NEW_FIELD && (
                <FormField label="New field name" required error={errors.newFieldName} className="sm:col-span-2">
                  {(p) => <Input {...p} value={form.newFieldName} onChange={set('newFieldName')} placeholder="e.g. Field B" autoFocus maxLength={120} />}
                </FormField>
              )}
              <FormField label="Location within field" optional hint={farm ? `Farm location: ${farm.location}` : undefined} error={errors.plotLocation} className="sm:col-span-2">
                {(p) => <Input {...p} value={form.plotLocation} onChange={set('plotLocation')} placeholder="e.g. Rows 1–12, east block" maxLength={160} />}
              </FormField>
            </fieldset>

            <div className="border-t border-line pt-6">
              <FormField label="Notes" optional error={errors.notes}>
                {(p) => <Textarea {...p} value={form.notes} onChange={set('notes')} placeholder="Seed source, spacing, fertiliser plan…" maxLength={2000} />}
              </FormField>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <Link to="/app/crops" className={buttonClass('ghost')}>Cancel</Link>
              <Button type="submit" loading={create.isPending}>Save planting</Button>
            </div>
          </form>
        </Card>

        <aside className="lg:col-span-4">
          <Card className="p-5 lg:sticky lg:top-20">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <CalendarRange className="h-4 w-4 text-amber" aria-hidden="true" /> Estimated Harvest Window
            </div>
            {preview && crop ? (
              <>
                <div className="num mt-3 text-[22px] font-semibold tracking-[-0.02em] text-ink">
                  {formatDate(preview.start, { year: false })} – {formatDate(preview.end)}
                </div>
                <dl className="mt-4 space-y-2 text-[13px]">
                  <div className="flex justify-between"><dt className="text-ink-3">Growing range</dt><dd className="num text-ink">{crop.minDaysToHarvest}–{crop.maxDaysToHarvest} days</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-3">Ideal temperature</dt><dd className="num text-ink">{crop.idealTempMinC}–{crop.idealTempMaxC}°C</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-3">Sensitive to</dt><dd className="text-right text-ink">{[crop.frostSensitive && 'frost', crop.excessRainSensitive && 'excess rain', crop.droughtSensitive && 'drought', crop.windSensitive && 'wind'].filter(Boolean).join(', ') || '—'}</dd></div>
                </dl>
                {crop.notes && <p className="mt-4 rounded-lg bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-2">{crop.notes}</p>}
              </>
            ) : (
              <p className="mt-3 text-[13.5px] text-ink-3">Choose a crop and planting date to see the estimate.</p>
            )}
            <p className="mt-4 flex gap-1.5 text-[12px] leading-relaxed text-ink-3">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Calculated as planting date + typical minimum and maximum growing days. Actual maturity depends on variety, weather and management.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
