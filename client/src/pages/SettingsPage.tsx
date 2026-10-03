import { MessageSquare, Moon, Send, Sun, User } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { FormField, Input, Select, Toggle } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, InlineError, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationPrefs, useTestSms, useUpdateNotificationPrefs } from '@/hooks/queries';
import { useTheme } from '@/hooks/useTheme';
import { api, ApiError, errorMessage } from '@/services/api';
import type { Severity, User as UserT } from '@/types';

const E164 = /^\+[1-9]\d{7,14}$/;

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Profile, notification preferences and appearance." />
      <div className="grid max-w-3xl gap-5 lg:gap-6">
        <NotificationsCard />
        <ProfileCard />
        <AppearanceCard />
      </div>
    </>
  );
}

function NotificationsCard() {
  const { data, isLoading, error, refetch } = useNotificationPrefs();
  const save = useUpdateNotificationPrefs();
  const test = useTestSms();
  const toast = useToast();
  const [form, setForm] = useState({ phoneNumber: '', smsEnabled: false, minimumSeverity: 'HIGH' as Severity });
  const [phoneError, setPhoneError] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm({ phoneNumber: data.phoneNumber ?? '', smsEnabled: data.smsEnabled, minimumSeverity: data.minimumSeverity });
  }, [data]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const normalized = form.phoneNumber.replace(/[\s().-]/g, '');
    if (normalized && !E164.test(normalized)) return setPhoneError('Use international format, e.g. +15551234567.');
    if (form.smsEnabled && !normalized) return setPhoneError('Add a phone number before enabling SMS alerts.');
    setPhoneError('');
    setFormError(null);
    try {
      await save.mutateAsync({ ...form, phoneNumber: normalized || null });
      toast('success', 'Notification preferences saved.');
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.phoneNumber) setPhoneError(err.fieldErrors.phoneNumber[0]);
      else setFormError(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader title="SMS alerts" subtitle="Get important weather warnings by text message." icon={<MessageSquare className="h-4 w-4" />} />
      {isLoading ? (
        <div className="p-5"><Skeleton className="h-40" /></div>
      ) : error ? (
        <ErrorState compact error={error} onRetry={() => refetch()} />
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5 p-5">
          <InlineError message={formError} />
          <Toggle label="Enable SMS alerts" description="Alerts are still shown in the dashboard regardless of this setting." checked={form.smsEnabled} onChange={(v) => setForm((f) => ({ ...f, smsEnabled: v }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone number" error={phoneError} hint="International format, e.g. +15551234567">
              {(p) => <Input {...p} type="tel" autoComplete="tel" value={form.phoneNumber} onChange={(e) => { setForm((f) => ({ ...f, phoneNumber: e.target.value })); setPhoneError(''); }} placeholder="+1 555 123 4567" />}
            </FormField>
            <FormField label="Minimum alert severity" hint="Only alerts at or above this level are texted.">
              {(p) => (
                <Select {...p} value={form.minimumSeverity} onChange={(e) => setForm((f) => ({ ...f, minimumSeverity: e.target.value as Severity }))}>
                  <option value="HIGH">High only</option>
                  <option value="MODERATE">Moderate and high</option>
                  <option value="LOW">All alerts (low and above)</option>
                </Select>
              )}
            </FormField>
          </div>
          {data && !data.smsLive && (
            <p className="rounded-lg bg-slate-soft px-3.5 py-2.5 text-[12.5px] text-ink-2">
              SMS delivery isn't configured on this server, so messages are logged instead of sent. Add Twilio credentials to the server environment to enable real delivery.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              disabled={!data?.phoneNumber}
              loading={test.isPending}
              onClick={() =>
                test.mutate(undefined, {
                  onSuccess: (r) => toast('success', r.simulated ? 'Test message logged on the server (SMS provider not configured).' : 'Test SMS sent.'),
                  onError: (e) => toast('error', errorMessage(e)),
                })
              }
            >
              {!test.isPending && <Send className="h-4 w-4" aria-hidden="true" />} Send test message
            </Button>
            <Button type="submit" loading={save.isPending}>Save preferences</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function ProfileCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Name must be at least 2 characters.');
    setSaving(true);
    try {
      const r = await api.put<{ user: UserT }>('/settings/profile', { name: name.trim() });
      setUser(r.user);
      setError('');
      toast('success', 'Profile updated.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Profile" icon={<User className="h-4 w-4" />} />
      <form onSubmit={submit} noValidate className="grid gap-4 p-5 sm:grid-cols-2">
        <FormField label="Name" error={error}>{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}</FormField>
        <FormField label="Email">{(p) => <Input {...p} value={user?.email ?? ''} disabled />}</FormField>
        <div className="sm:col-span-2 flex justify-end"><Button type="submit" variant="secondary" loading={saving}>Update profile</Button></div>
      </form>
    </Card>
  );
}

function AppearanceCard() {
  const { theme, toggle } = useTheme();
  return (
    <Card>
      <CardHeader title="Appearance" icon={theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} />
      <div className="p-5">
        <Toggle label="Dark mode" description="Charcoal interface tuned for low-light use." checked={theme === 'dark'} onChange={toggle} />
      </div>
    </Card>
  );
}
