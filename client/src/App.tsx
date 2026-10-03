import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { PublicOnly, RequireAuth } from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/States';
import { LoginPage, RegisterPage } from '@/pages/AuthPages';
import LandingPage from '@/pages/LandingPage';
import NotFoundPage from '@/pages/NotFoundPage';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const CropsPage = lazy(() => import('@/pages/CropsPage'));
const NewPlantingPage = lazy(() => import('@/pages/NewPlantingPage'));
const PlantingDetailPage = lazy(() => import('@/pages/PlantingDetailPage'));
const FarmsPage = lazy(() => import('@/pages/FarmsPage'));
const HarvestHistoryPage = lazy(() => import('@/pages/HarvestHistoryPage'));
const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
const WeatherPage = lazy(() => import('@/pages/WeatherPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

const page = (el: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="/app" element={<RequireAuth />}>
        <Route index element={page(<DashboardPage />)} />
        <Route path="crops" element={page(<CropsPage />)} />
        <Route path="crops/new" element={page(<NewPlantingPage />)} />
        <Route path="crops/:id" element={page(<PlantingDetailPage />)} />
        <Route path="farms" element={page(<FarmsPage />)} />
        <Route path="harvests" element={page(<HarvestHistoryPage />)} />
        <Route path="alerts" element={page(<AlertsPage />)} />
        <Route path="weather" element={page(<WeatherPage />)} />
        <Route path="settings" element={page(<SettingsPage />)} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
