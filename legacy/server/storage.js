const fs = require('fs');
const path = './cropsData.json';

function loadCrops() {
  if (!fs.existsSync(path)) return [];
  const data = fs.readFileSync(path);
  return JSON.parse(data);
}

function saveCrops(crops) {
  fs.writeFileSync(path, JSON.stringify(crops, null, 2));
}

module.exports = { loadCrops, saveCrops };

