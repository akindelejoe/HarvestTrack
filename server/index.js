const readline = require('readline');
const { calculateHarvestDate, daysUntilHarvest } = require('../server/harvest');
const Crop = require('../server/models/crop');
require('dotenv').config();
const connectDB = require('../server/db');  // ⬅️ import connection function

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log(`\n CROP HARVEST TRACKER\n1. Add a new crop\n2. View all crops\n3. Delete a crop\n4. Exit\n`);
  rl.question('Select an option: ', handleMenu);
}

async function handleMenu(option) {
  switch (option.trim()) {
    case '1':
      return addCrop();
    case '2':
      return viewCrops();
    case '3':
      return deleteCrop();
    case '4':
      rl.close();
      process.exit(0);
    default:
      console.log('Invalid option. Try again.');
      showMenu();
  }
}

function addCrop() {
  rl.question('Enter crop type: ', (type) => {
    rl.question('Enter location: ', (location) => {
      rl.question('Enter planting date (YYYY-MM-DD): ', async (dateStr) => {
        const harvestDate = calculateHarvestDate(dateStr, type);
        const crop = new Crop({ type, location, plantingDate: dateStr, harvestDate });
        await crop.save();
        console.log('✅ Crop added successfully.');
        showMenu();
      });
    });
  });
}

async function viewCrops() {
  const crops = await Crop.find({});
  if (crops.length === 0) {
    console.log(' No crops found.');
  } else {
    crops.forEach(crop => {
      const daysLeft = daysUntilHarvest(crop.harvestDate);
      console.log(`${crop.type} in ${crop.location} | Harvest in ${daysLeft} day(s)`);
      if (daysLeft <= 7) {
        console.log('⚠️  Less than a week to harvest!');
      }
    });
  }
  showMenu();
}

async function deleteCrop() {
  rl.question('Enter the crop type to delete: ', async (type) => {
    await Crop.deleteMany({ type });
    console.log(`🗑️  Deleted all crops of type: ${type}`);
    showMenu();
  });
}

// Start the menu only after DB is connected
connectDB().then(() => {
  showMenu();
});
