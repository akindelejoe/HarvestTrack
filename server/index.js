// server/index.js
const readline = require('readline');
const { calculateHarvestDate, daysUntilHarvest } = require('./harvest');
const { getCrops, addCrop, deleteCrop } = require('./db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Menu
function showMenu() {
  console.log(`
🌱 CROP HARVEST TRACKER
1. Add a new crop
2. View all crops
3. Delete a crop
4. Exit
`);
  rl.question('Select an option: ', handleMenu);
}

// Menu handler
async function handleMenu(option) {
  switch (option) {
    case '1':
      await addCropCLI();
      break;
    case '2':
      await viewCrops();
      break;
    case '3':
      await deleteCropCLI();
      break;
    case '4':
      rl.close();
      process.exit();
    default:
      console.log('❌ Invalid option\n');
      showMenu();
  }
}

// Add crop
async function addCropCLI() {
  rl.question('Enter crop name: ', (type) => {
    rl.question('Enter location: ', (location) => {
      rl.question('Enter planting date (YYYY-MM-DD): ', async (date) => {
        const harvestDate = calculateHarvestDate(date, type);
        const crop = { type, location, plantingDate: date, harvestDate };
        await addCrop(crop);
        console.log(`${type} added. Harvest: ${new Date(harvestDate).toDateString()}\n`);
        showMenu();
      });
    });
  });
}

// View crops
async function viewCrops() {
  const crops = await getCrops();
  if (crops.length === 0) {
    console.log('No crops added yet.\n');
  } else {
    console.log('\n🌾 TRACKED CROPS:\n');
    crops.forEach((crop, i) => {
      const daysLeft = daysUntilHarvest(crop.harvestDate);
      const alert = daysLeft <= 7 ? '⚠️  Less than a week to harvest!' : '';
      console.log(`${i + 1}. ${crop.type} (${crop.location})`);
      console.log(`   🌱 Planted: ${crop.plantingDate}`);
      console.log(`   🧮 Harvest: ${new Date(crop.harvestDate).toDateString()} (${daysLeft} days left) ${alert}\n`);
    });
  }
  showMenu();
}

// Delete crop
async function deleteCropCLI() {
  const crops = await getCrops();
  if (crops.length === 0) {
    console.log('No crops to delete.\n');
    return showMenu();
  }

  console.log('\n🗑️  Select a crop to delete:\n');
  crops.forEach((crop, i) => {
    console.log(`${i + 1}. ${crop.type} (${crop.location}) - Harvest: ${new Date(crop.harvestDate).toDateString()}`);
  });

  rl.question('\nEnter the number of the crop to delete: ', async (input) => {
    const index = parseInt(input) - 1;
    if (isNaN(index) || index < 0 || index >= crops.length) {
      console.log('❌ Invalid selection\n');
    } else {
      const id = crops[index]._id;
      await deleteCrop(id);
      console.log(`✅ Deleted ${crops[index].type} successfully\n`);
    }
    showMenu();
  });
}

// Start the app
showMenu();
