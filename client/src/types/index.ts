export type Severity = 'LOW' | 'MODERATE' | 'HIGH';
export type RiskLevel = 'NONE' | Severity;
export type AlertType = 'FROST' | 'EXTREME_HEAT' | 'HEAVY_RAIN' | 'STRONG_WIND' | 'DROUGHT';
export type PlantingStatus = 'ACTIVE' | 'HARVESTED' | 'FAILED';
export type DisplayStatus = 'GROWING' | 'HARVEST_SOON' | 'READY' | 'AT_RISK' | 'HARVESTED' | 'FAILED';
export type ReadinessStage =
  | 'EARLY_GROWTH'
  | 'MID_GROWTH'
  | 'HARVEST_APPROACHING'
  | 'IN_HARVEST_WINDOW'
  | 'PAST_HARVEST_WINDOW'
  | 'HARVESTED';
export type HarvestUnit = 'KG' | 'LB' | 'TONS' | 'BUSHELS' | 'CRATES';
export type CropQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Field {
  id: string;
  farmId: string;
  name: string;
  areaAcres: number | null;
  soilType: string | null;
  activePlantings: number;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  fields: Field[];
}

export interface CropType {
  id: string;
  name: string;
  minDaysToHarvest: number;
  maxDaysToHarvest: number;
  idealTempMinC: number;
  idealTempMaxC: number;
  frostSensitive: boolean;
  excessRainSensitive: boolean;
  droughtSensitive: boolean;
  windSensitive: boolean;
  notes: string | null;
}

export interface GrowthProgress {
  daysGrowing: number;
  daysUntilWindowStart: number;
  daysUntilWindowEnd: number;
  readinessPercent: number;
  timelinePercent: number;
  stage: ReadinessStage;
}

export interface Harvest {
  id: string;
  actualHarvestDate: string;
  quantity: number;
  unit: HarvestUnit;
  quality: CropQuality;
  notes: string | null;
}

export interface Planting {
  id: string;
  variety: string | null;
  plotLocation: string | null;
  notes: string | null;
  status: PlantingStatus;
  displayStatus: DisplayStatus;
  plantingDate: string;
  estimatedHarvestStart: string;
  estimatedHarvestEnd: string;
  progress: GrowthProgress;
  risk: { level: RiskLevel; activeAlerts: number };
  crop: { id: string; name: string; minDaysToHarvest: number; maxDaysToHarvest: number };
  field: { id: string; name: string };
  farm: { id: string; name: string; location: string };
  harvest: Harvest | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: 'PLANTED' | 'UPDATED' | 'ALERT_RAISED' | 'HARVESTED' | 'NOTE';
  description: string;
  createdAt: string;
}

export interface PlantingDetail extends Planting {
  cropProfile: Omit<CropType, 'id' | 'name' | 'minDaysToHarvest' | 'maxDaysToHarvest'>;
  activities: Activity[];
}

export interface Alert {
  id: string;
  alertType: AlertType;
  severity: Severity;
  title: string;
  message: string;
  impact: string | null;
  recommendation: string;
  forecastDate: string;
  smsSent: boolean;
  readAt: string | null;
  createdAt: string;
  planting: { id: string; crop: string; field: string; farm: string } | null;
}

export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'thunderstorm';

export interface ForecastDay {
  date: string;
  condition: WeatherCondition;
  tempMinC: number;
  tempMaxC: number;
  precipitationMm: number;
  precipitationProbability: number;
  windSpeedMaxKph: number;
  windGustsMaxKph: number;
}

export interface Weather {
  provider: string;
  farm: { id: string; name: string; location: string };
  current: {
    temperatureC: number;
    condition: WeatherCondition;
    humidity: number;
    windSpeedKph: number;
    precipitationProbability: number;
  };
  daily: ForecastDay[];
  fetchedAt: string;
  stale: boolean;
}

export interface DashboardSummary {
  kpis: {
    activeCrops: number;
    readyForHarvest: number;
    harvestSoon: number;
    atRisk: number;
    weatherAlerts: number;
    unreadAlerts: number;
    totalHarvests: number;
  };
  plantings: Planting[];
  upcomingHarvests: Planting[];
  recentAlerts: {
    id: string;
    severity: Severity;
    alertType: AlertType;
    title: string;
    forecastDate: string;
    readAt: string | null;
    crop: string | null;
    field: string | null;
    plantingId: string | null;
  }[];
  farms: { id: string; name: string; location: string; fieldCount: number }[];
  fieldStatus: {
    id: string;
    name: string;
    farmName: string;
    areaAcres: number | null;
    activePlantings: number;
    crops: string[];
    risk: RiskLevel;
  }[];
  harvestsByMonth: { month: string; count: number }[];
}

export interface HarvestHistory {
  seasons: number[];
  season: number;
  records: Planting[];
  stats: {
    plantings: number;
    harvested: number;
    failed: number;
    avgDaysFromEstimate: number | null;
    harvestsByMonth: { month: string; count: number }[];
  };
}

export interface NotificationPreferences {
  phoneNumber: string | null;
  smsEnabled: boolean;
  minimumSeverity: Severity;
  smsProvider: string;
  smsLive: boolean;
}

export interface ScanResult {
  farmsScanned: number;
  plantingsEvaluated: number;
  alertsCreated: number;
  alertsEscalated: number;
  smsSent: number;
  errors: string[];
}
