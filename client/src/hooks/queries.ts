import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type {
  Alert,
  CropType,
  DashboardSummary,
  Farm,
  HarvestHistory,
  NotificationPreferences,
  Planting,
  PlantingDetail,
  ScanResult,
  Severity,
  Weather,
} from '@/types';

export const keys = {
  dashboard: ['dashboard'] as const,
  farms: ['farms'] as const,
  cropTypes: ['crop-types'] as const,
  plantings: (status: string) => ['plantings', status] as const,
  planting: (id: string) => ['planting', id] as const,
  harvests: (season?: number) => ['harvests', season ?? 'latest'] as const,
  alerts: (filter: object) => ['alerts', filter] as const,
  weather: (farmId?: string) => ['weather', farmId ?? 'default'] as const,
  notifications: ['settings', 'notifications'] as const,
};

/** After any write, refresh everything derived from plantings/alerts. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ['dashboard', 'plantings', 'planting', 'harvests', 'alerts', 'farms'].map((k) => qc.invalidateQueries({ queryKey: [k] })),
    );
}

export const useDashboard = () =>
  useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<DashboardSummary>('/dashboard/summary') });

export const useFarms = () =>
  useQuery({ queryKey: keys.farms, queryFn: () => api.get<{ farms: Farm[] }>('/farms').then((r) => r.farms) });

export const useCropTypes = () =>
  useQuery({
    queryKey: keys.cropTypes,
    queryFn: () => api.get<{ cropTypes: CropType[] }>('/crop-types').then((r) => r.cropTypes),
    staleTime: 30 * 60_000,
  });

export const usePlantings = (status: 'ACTIVE' | 'HARVESTED' | 'FAILED' | 'ALL' = 'ACTIVE') =>
  useQuery({
    queryKey: keys.plantings(status),
    queryFn: () => api.get<{ plantings: Planting[] }>(`/plantings?status=${status}`).then((r) => r.plantings),
  });

export const usePlanting = (id: string) =>
  useQuery({
    queryKey: keys.planting(id),
    queryFn: () => api.get<{ planting: PlantingDetail }>(`/plantings/${id}`).then((r) => r.planting),
  });

export const useHarvestHistory = (season?: number) =>
  useQuery({
    queryKey: keys.harvests(season),
    queryFn: () => api.get<HarvestHistory>(`/harvests${season ? `?season=${season}` : ''}`),
    placeholderData: (prev) => prev,
  });

export const useAlerts = (filter: { severity?: Severity; unread?: boolean; plantingId?: string } = {}) =>
  useQuery({
    queryKey: keys.alerts(filter),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (filter.severity) qs.set('severity', filter.severity);
      if (filter.unread) qs.set('unread', 'true');
      if (filter.plantingId) qs.set('plantingId', filter.plantingId);
      return api.get<{ alerts: Alert[] }>(`/alerts?${qs}`).then((r) => r.alerts);
    },
  });

export const useWeather = (farmId?: string) =>
  useQuery({
    queryKey: keys.weather(farmId),
    queryFn: () =>
      api.get<{ weather: Weather | null; farms: { id: string; name: string; location: string }[] }>(
        `/weather${farmId ? `?farmId=${farmId}` : ''}`,
      ),
    staleTime: 10 * 60_000,
    retry: 1,
  });

export const useNotificationPrefs = () =>
  useQuery({
    queryKey: keys.notifications,
    queryFn: () => api.get<{ preferences: NotificationPreferences }>('/settings/notifications').then((r) => r.preferences),
  });

// ---------- Mutations ----------

export function useCreateFarm() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (body: { name: string; location: string; latitude?: number; longitude?: number }) =>
      api.post<{ farm: Farm }>('/farms', body).then((r) => r.farm),
    onSuccess: invalidate,
  });
}

export function useDeleteFarm() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.delete(`/farms/${id}`), onSuccess: invalidate });
}

export function useCreateField() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (body: { farmId: string; name: string; areaAcres?: number | null; soilType?: string | null }) =>
      api.post('/fields', body),
    onSuccess: invalidate,
  });
}

export function useDeleteField() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.delete(`/fields/${id}`), onSuccess: invalidate });
}

export function useCreatePlanting() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<{ planting: PlantingDetail }>('/plantings', body).then((r) => r.planting),
    onSuccess: invalidate,
  });
}

export function useUpdatePlanting(id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put<{ planting: PlantingDetail }>(`/plantings/${id}`, body),
    onSuccess: invalidate,
  });
}

export function useDeletePlanting() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.delete(`/plantings/${id}`), onSuccess: invalidate });
}

export function useAddNote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (description: string) => api.post(`/plantings/${id}/activities`, { description }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.planting(id) }),
  });
}

export function useRecordHarvest(id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/plantings/${id}/harvest`, body),
    onSuccess: invalidate,
  });
}

export function useMarkAlertRead() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.patch(`/alerts/${id}/read`), onSuccess: invalidate });
}

export function useMarkAllRead() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => api.patch('/alerts/read-all'), onSuccess: invalidate });
}

export function useScanAlerts() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () => api.post<{ result: ScanResult }>('/alerts/scan').then((r) => r.result),
    onSuccess: invalidate,
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { phoneNumber: string | null; smsEnabled: boolean; minimumSeverity: Severity }) =>
      api.put<{ preferences: NotificationPreferences }>('/settings/notifications', body).then((r) => r.preferences),
    onSuccess: (prefs) => qc.setQueryData(keys.notifications, prefs),
  });
}

export function useTestSms() {
  return useMutation({
    mutationFn: () => api.post<{ result: { delivered: boolean; simulated: boolean; provider: string } }>('/settings/notifications/test').then((r) => r.result),
  });
}
