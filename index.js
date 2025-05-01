const readline = require('readline');
const { calculateHarvestDate, daysUntilHarvest } = require('./harvest');
const { loadCrops, saveCrops } = require('./storage');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let crops = loadCrops();

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
  
  function handleMenu(option) {
    switch (option) {
      case '1':
        addCrop();
        break;
      case '2':
        viewCrops();
        break;
      case '3':
        deleteCrop();
        break;
      case '4':
        rl.close();
        break;
      default:
        console.log('❌ Invalid option\n');
        showMenu();
    }
  }
  

function addCrop() {
  rl.question('Enter crop name: ', (type) => {
    rl.question('Enter location: ', (location) => {
      rl.question('Enter planting date (YYYY-MM-DD): ', (date) => {
        const harvestDate = calculateHarvestDate(date, type);
        crops.push({ type, location, plantingDate: date, harvestDate });
        saveCrops(crops);
        console.log(`${type} added. Harvest: ${harvestDate.toDateString()}\n`);
        showMenu();
      });
    });
  });
}

function viewCrops() {
  if (crops.length === 0) {
    console.log('No crops added yet.\n');
  } else {
    console.log('\n🌾 TRACKED CROPS:\n');
    crops.forEach((crop, i) => {
      const daysLeft = daysUntilHarvest(crop.harvestDate);
      console.log(`${i + 1}. ${crop.type} (${crop.location})`);
      console.log(`   🌱 Planted: ${crop.plantingDate}`);
      console.log(`   🧮 Harvest: ${new Date(crop.harvestDate).toDateString()} (${daysLeft} days left)\n`);
    });
  }
  showMenu();
}


function deleteCrop() {
    if (crops.length === 0) {
      console.log('No crops to delete.\n');
      return showMenu();
    }
  
    console.log('\n🗑️  Select a crop to delete:\n');
    crops.forEach((crop, i) => {
      console.log(`${i + 1}. ${crop.type} (${crop.location}) - Harvest: ${new Date(crop.harvestDate).toDateString()}`);
    });
  
    rl.question('\nEnter the number of the crop to delete: ', (input) => {
      const index = parseInt(input) - 1;
      if (isNaN(index) || index < 0 || index >= crops.length) {
        console.log('❌ Invalid selection\n');
      } else {
        const removed = crops.splice(index, 1);
        saveCrops(crops);
        console.log(`✅ Deleted ${removed[0].type} successfully\n`);
      }
      showMenu();
    });
  }
  

showMenu();
