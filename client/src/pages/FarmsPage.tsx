import { MapPin, Plus, Trash2, Warehouse } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField, Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, InlineError, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useCreateFarm, useCreateField, useDeleteFarm, useDeleteField, useFarms } from '@/hooks/queries';
import { plural } from '@/lib/format';
import { ApiError, errorMessage } from '@/services/api';
import type { Farm } from '@/types';

export default function FarmsPage() {
  const { data: farms, isLoading, error, refetch } = useFarms();
  const [farmOpen, setFarmOpen] = useState(false);
  const [fieldFarm, setFieldFarm] = useState<Farm | null>(null);

  return (
    <>
      <PageHeader
        title="Farms & Fields"
        description="Farms anchor weather monitoring to a location; fields hold individual plantings."
        actions={<Button onClick={() => setFarmOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" /> Add farm</Button>}
      />
      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : !farms?.length ? (
        <Card>
          <EmptyState icon={<Warehouse className="h-5 w-5" />} title="No farms yet" description="Create a farm to start organising fields and plantings. Its location is used for weather forecasts." action={<Button onClick={() => setFarmOpen(true)}>Create your first farm</Button>} />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {farms.map((farm) => <FarmCard key={farm.id} farm={farm} onAddField={() => setFieldFarm(farm)} />)}
        </div>
      )}
      <FarmModal open={farmOpen} onClose={() => setFarmOpen(false)} />
      <FieldModal farm={fieldFarm} onClose={() => setFieldFarm(null)} />
    </>
  );
}

function FarmCard({ farm, onAddField }: { farm: Farm; onAddField: () => void }) {
  const delFarm = useDeleteFarm();
  const delField = useDeleteField();
  const toast = useToast();
  const totalArea = farm.fields.reduce((s, f) => s + (f.areaAcres ?? 0), 0);
  const active = farm.fields.reduce((s, f) => s + f.activePlantings, 0);

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{farm.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-3">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {farm.location}
            <span className="num text-ink-3/80">· {farm.latitude.toFixed(2)}, {farm.longitude.toFixed(2)}</span>
          </p>
        </div>
        <button
          className="rounded-md p-1.5 text-ink-3 hover:bg-red-soft hover:text-red"
          aria-label={`Delete ${farm.name}`}
          onClick={() => {
            if (!confirm(`Delete ${farm.name}? All of its fields, plantings, harvests and alerts will be permanently removed.`)) return;
            delFarm.mutate(farm.id, { onSuccess: () => toast('success', `${farm.name} deleted.`), onError: (e) => toast('error', errorMessage(e)) });
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <dl className="mx-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {[['Fields', farm.fields.length], ['Active plantings', active], ['Area', totalArea ? `${totalArea.toLocaleString()} ac` : '—']].map(([k, v]) => (
          <div key={k} className="bg-surface-2/60 px-3 py-2.5">
            <dt className="text-[11.5px] text-ink-3">{k}</dt>
            <dd className="num text-[16px] font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-4 flex-1 divide-y divide-line border-t border-line">
        {farm.fields.length === 0 && <li className="px-5 py-4 text-[13.5px] text-ink-3">No fields yet.</li>}
        {farm.fields.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <FieldGlyph active={f.activePlantings > 0} />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-ink">{f.name}</div>
                <div className="text-[12px] text-ink-3">
                  {[f.areaAcres && `${f.areaAcres} ac`, f.soilType, f.activePlantings ? plural(f.activePlantings, 'active planting') : 'Idle'].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
            <button
              className="rounded-md p-1.5 text-ink-3 hover:bg-red-soft hover:text-red"
              aria-label={`Delete field ${f.name}`}
              onClick={() => {
                if (!confirm(`Delete ${f.name}${f.activePlantings ? ` and its ${plural(f.activePlantings, 'planting')}` : ''}?`)) return;
                delField.mutate(f.id, { onSuccess: () => toast('success', `${f.name} deleted.`), onError: (e) => toast('error', errorMessage(e)) });
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-line p-3">
        <Button variant="ghost" size="sm" onClick={onAddField} className="w-full"><Plus className="h-4 w-4" aria-hidden="true" /> Add field</Button>
      </div>
    </Card>
  );
}

/** Small field-grid glyph: filled rows when the field has active plantings. */
function FieldGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-8 w-8 shrink-0 rounded-lg border border-line bg-surface-2 p-1.5" aria-hidden="true">
      {[4, 8, 12, 16].map((y) => (
        <line key={y} x1="3" x2="17" y1={y} y2={y} stroke={active ? 'var(--amber-fill)' : 'var(--line-strong)'} strokeWidth="1.6" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function FarmModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateFarm();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', location: '', latitude: '', longitude: '' });
  const [manual, setManual] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (form.name.trim().length < 2) er.name = 'Farm name must be at least 2 characters.';
    if (form.location.trim().length < 2) er.location = 'Enter a town or region, e.g. "Columbus, Ohio".';
    if (manual) {
      const lat = Number(form.latitude), lon = Number(form.longitude);
      if (form.latitude === '' || Number.isNaN(lat) || lat < -90 || lat > 90) er.latitude = 'Latitude must be between -90 and 90.';
      if (form.longitude === '' || Number.isNaN(lon) || lon < -180 || lon > 180) er.longitude = 'Longitude must be between -180 and 180.';
    }
    setErrors(er);
    if (Object.keys(er).length) return;
    setFormError(null);
    try {
      const farm = await create.mutateAsync({
        name: form.name.trim(),
        location: form.location.trim(),
        ...(manual && { latitude: Number(form.latitude), longitude: Number(form.longitude) }),
      });
      toast('success', `${farm.name} created.`);
      setForm({ name: '', location: '', latitude: '', longitude: '' });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'INVALID_LOCATION' || err.code === 'GEOCODING_UNAVAILABLE')) setManual(true);
      setFormError(errorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add farm" description="We look up coordinates for the location to fetch local forecasts.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <InlineError message={formError} />
        <FormField label="Farm name" required error={errors.name}>{(p) => <Input {...p} value={form.name} onChange={set('name')} placeholder="e.g. Akindele Farm" autoFocus />}</FormField>
        <FormField label="Location" required error={errors.location} hint='Town and region, e.g. "Ibadan, Oyo" or "Fresno, California".'>
          {(p) => <Input {...p} value={form.location} onChange={set('location')} placeholder="City, Region" />}
        </FormField>
        <button type="button" className="text-[13px] font-medium text-slate hover:underline" onClick={() => setManual((m) => !m)} aria-expanded={manual}>
          {manual ? 'Look up coordinates automatically' : 'Enter coordinates manually'}
        </button>
        {manual && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Latitude" required error={errors.latitude}>{(p) => <Input {...p} inputMode="decimal" value={form.latitude} onChange={set('latitude')} placeholder="39.961" />}</FormField>
            <FormField label="Longitude" required error={errors.longitude}>{(p) => <Input {...p} inputMode="decimal" value={form.longitude} onChange={set('longitude')} placeholder="-82.998" />}</FormField>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Create farm</Button>
        </div>
      </form>
    </Modal>
  );
}

function FieldModal({ farm, onClose }: { farm: Farm | null; onClose: () => void }) {
  const create = useCreateField();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', areaAcres: '', soilType: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!farm) return;
    const er: Record<string, string> = {};
    if (!form.name.trim()) er.name = 'Field name is required.';
    if (form.areaAcres && !(Number(form.areaAcres) > 0)) er.areaAcres = 'Area must be a positive number.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setFormError(null);
    try {
      await create.mutateAsync({ farmId: farm.id, name: form.name.trim(), areaAcres: form.areaAcres ? Number(form.areaAcres) : null, soilType: form.soilType || null });
      toast('success', `${form.name.trim()} added to ${farm.name}.`);
      setForm({ name: '', areaAcres: '', soilType: '' });
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError && err.status === 409 ? `A field named "${form.name.trim()}" already exists on this farm.` : errorMessage(err));
    }
  }

  return (
    <Modal open={Boolean(farm)} onClose={onClose} title="Add field" description={farm ? `New field on ${farm.name}` : undefined}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <InlineError message={formError} />
        <FormField label="Field name" required error={errors.name}>{(p) => <Input {...p} value={form.name} onChange={set('name')} placeholder="e.g. North Field" autoFocus />}</FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Area (acres)" optional error={errors.areaAcres}>{(p) => <Input {...p} type="number" min={0} step="any" value={form.areaAcres} onChange={set('areaAcres')} />}</FormField>
          <FormField label="Soil type" optional>{(p) => <Input {...p} value={form.soilType} onChange={set('soilType')} placeholder="e.g. Silt loam" />}</FormField>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Add field</Button>
        </div>
      </form>
    </Modal>
  );
}
