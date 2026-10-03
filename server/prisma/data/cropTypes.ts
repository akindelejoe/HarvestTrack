/**
 * Crop knowledge catalogue — general, typical ranges (days from planting/transplant to
 * first harvest, ideal growing temperature in °C). Real outcomes vary by variety,
 * climate and management, which is why HarvestTrack only ever shows *estimates*.
 *
 * To add a crop: append an entry here and run `npm run db:seed` (upserts by name).
 */
export interface CropSeed {
  name: string;
  minDaysToHarvest: number;
  maxDaysToHarvest: number;
  idealTempMinC: number;
  idealTempMaxC: number;
  frostSensitive: boolean;
  excessRainSensitive: boolean;
  droughtSensitive: boolean;
  windSensitive: boolean;
  notes: string;
}

export const CROP_TYPES: CropSeed[] = [
  { name: 'Corn', minDaysToHarvest: 90, maxDaysToHarvest: 120, idealTempMinC: 18, idealTempMaxC: 32, frostSensitive: true, excessRainSensitive: false, droughtSensitive: true, windSensitive: true, notes: 'Most moisture-sensitive at tasseling and silking. Tall stalks are prone to lodging in strong wind.' },
  { name: 'Tomato', minDaysToHarvest: 60, maxDaysToHarvest: 85, idealTempMinC: 18, idealTempMaxC: 29, frostSensitive: true, excessRainSensitive: true, droughtSensitive: true, windSensitive: false, notes: 'Days from transplant. Fruit set drops above ~32°C; irregular watering can cause cracking.' },
  { name: 'Potato', minDaysToHarvest: 70, maxDaysToHarvest: 120, idealTempMinC: 15, idealTempMaxC: 24, frostSensitive: true, excessRainSensitive: true, droughtSensitive: false, windSensitive: false, notes: 'Waterlogged soils increase rot risk. Foliage is damaged by frost.' },
  { name: 'Soybean', minDaysToHarvest: 90, maxDaysToHarvest: 120, idealTempMinC: 20, idealTempMaxC: 30, frostSensitive: true, excessRainSensitive: false, droughtSensitive: true, windSensitive: false, notes: 'Pod fill is the most drought-sensitive stage.' },
  { name: 'Rice', minDaysToHarvest: 105, maxDaysToHarvest: 150, idealTempMinC: 20, idealTempMaxC: 35, frostSensitive: true, excessRainSensitive: false, droughtSensitive: true, windSensitive: true, notes: 'Paddy rice tolerates standing water; wind at heading can cause lodging.' },
  { name: 'Wheat', minDaysToHarvest: 110, maxDaysToHarvest: 130, idealTempMinC: 12, idealTempMaxC: 25, frostSensitive: false, excessRainSensitive: true, droughtSensitive: false, windSensitive: true, notes: 'Spring wheat range. Rain near harvest raises sprouting and disease risk.' },
  { name: 'Pepper', minDaysToHarvest: 60, maxDaysToHarvest: 90, idealTempMinC: 21, idealTempMaxC: 29, frostSensitive: true, excessRainSensitive: true, droughtSensitive: true, windSensitive: true, notes: 'Days from transplant. Very cold-sensitive; brittle branches break in wind.' },
  { name: 'Cucumber', minDaysToHarvest: 50, maxDaysToHarvest: 70, idealTempMinC: 18, idealTempMaxC: 30, frostSensitive: true, excessRainSensitive: true, droughtSensitive: true, windSensitive: true, notes: 'Fast-growing; harvest frequently once fruiting begins.' },
  { name: 'Lettuce', minDaysToHarvest: 45, maxDaysToHarvest: 65, idealTempMinC: 7, idealTempMaxC: 24, frostSensitive: false, excessRainSensitive: true, droughtSensitive: true, windSensitive: false, notes: 'Cool-season crop; heat triggers bolting and bitterness.' },
  { name: 'Carrot', minDaysToHarvest: 70, maxDaysToHarvest: 80, idealTempMinC: 10, idealTempMaxC: 24, frostSensitive: false, excessRainSensitive: true, droughtSensitive: false, windSensitive: false, notes: 'Light frost can sweeten roots; heavy rain can split them.' },
  { name: 'Onion', minDaysToHarvest: 90, maxDaysToHarvest: 150, idealTempMinC: 13, idealTempMaxC: 24, frostSensitive: false, excessRainSensitive: true, droughtSensitive: false, windSensitive: false, notes: 'Bulbing is driven by day length. Wet weather near harvest affects storage quality.' },
  { name: 'Cassava', minDaysToHarvest: 240, maxDaysToHarvest: 365, idealTempMinC: 25, idealTempMaxC: 35, frostSensitive: true, excessRainSensitive: true, droughtSensitive: false, windSensitive: false, notes: 'Highly drought tolerant once established; waterlogging causes root rot.' },
  { name: 'Peanut', minDaysToHarvest: 120, maxDaysToHarvest: 150, idealTempMinC: 22, idealTempMaxC: 32, frostSensitive: true, excessRainSensitive: true, droughtSensitive: true, windSensitive: false, notes: 'Also called groundnut. Needs dry conditions at digging.' },
  { name: 'Sweet Potato', minDaysToHarvest: 90, maxDaysToHarvest: 120, idealTempMinC: 21, idealTempMaxC: 30, frostSensitive: true, excessRainSensitive: true, droughtSensitive: false, windSensitive: false, notes: 'Harvest before soil temperatures drop below ~13°C.' },
  { name: 'Cabbage', minDaysToHarvest: 70, maxDaysToHarvest: 100, idealTempMinC: 7, idealTempMaxC: 24, frostSensitive: false, excessRainSensitive: false, droughtSensitive: true, windSensitive: false, notes: 'Cold-hardy; heads may split after heavy rain following drought.' },
];
