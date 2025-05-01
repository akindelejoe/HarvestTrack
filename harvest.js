const cropHarvestDurations = {
    maize: 110,
    rice: 120,
    tomatoes: 90,
    cassava: 270,
    groundnut: 100
  };
  
  function calculateHarvestDate(plantingDate, cropType) {
    const duration = cropHarvestDurations[cropType.toLowerCase()] || 100;
    const date = new Date(plantingDate);
    date.setDate(date.getDate() + duration);
    return date;
  }
  
  function daysUntilHarvest(harvestDate) {
    const today = new Date();
    const diff = new Date(harvestDate) - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  module.exports = { calculateHarvestDate, daysUntilHarvest };
  