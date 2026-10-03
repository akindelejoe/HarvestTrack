import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideProps } from 'lucide-react';
import type { WeatherCondition } from '@/types';

const icons: Record<WeatherCondition, React.ComponentType<LucideProps>> = {
  clear: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  'heavy-rain': CloudRain,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
};

export const CONDITION_LABEL: Record<WeatherCondition, string> = {
  clear: 'Clear',
  'partly-cloudy': 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  'heavy-rain': 'Heavy rain',
  snow: 'Snow',
  thunderstorm: 'Thunderstorm',
};

export function WeatherIcon({ condition, ...props }: { condition: WeatherCondition } & LucideProps) {
  const Icon = icons[condition] ?? Cloud;
  return <Icon aria-label={CONDITION_LABEL[condition]} {...props} />;
}
