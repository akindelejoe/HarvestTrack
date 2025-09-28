// bin/cli.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// initialize DB first
require('../server/db');

const readline = require('readline');
const { calculateHarvestDate, daysUntilHarvest } = require('../server/harvest');
const Crop = require('../server/models/crop');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// small helper to await user input
const ask = (q) => new Promise((res) => rl.question(q, (ans) => res(ans.trim())));

async function showMenu() {
  console.log('\n=== CROP HARVEST TRACKER ===');
  console.log('1. Add a new crop');
  console.log('2. View all crops');
  console.log('3. Delete a crop by type');
  console.log('4. Exit\n');

  const option = await ask('Select an option: ');
  await handleMenu(option);
}

async function handleMenu(option) {
  try {
    switch (option) {
      case '1':
        await addCrop();
        break;
      case '2':
        await viewCrops();
        break;
      case '3':
        await deleteCrop();
        break;
      case '4':
        await shutdown(0);
        return;
      default:
        console.log('Invalid option. Try again.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  await showMenu();
}

async function addCrop() {
  const type = await ask('Enter crop type: ');
  const location = await ask('Enter location: ');
  const dateStr = await ask('Enter planting date (YYYY-MM-DD): ');

  // basic validation
  const plantingDate = new Date(dateStr);
  if (Number.isNaN(plantingDate.getTime())) {
    console.log(' Invalid date format. Use YYYY-MM-DD.');
    return;
  }

  const harvestDate = calculateHarvestDate(dateStr, type);
  const crop = new Crop({ type, location, plantingDate, harvestDate });
  await crop.save();

  console.log(' Crop added successfully.');
}

async function viewCrops() {
  const crops = await Crop.find({}).sort({ harvestDate: 1 }).lean();

  if (crops.length === 0) {
    console.log('ℹ  No crops found.');
    return;
  }

  for (const crop of crops) {
    const daysLeft = daysUntilHarvest(crop.harvestDate);
    const line = `${crop.type} in ${crop.location} | Plant: ${fmt(crop.plantingDate)} | Harvest: ${fmt(crop.harvestDate)} | In ${daysLeft} day(s)`;
    console.log(line);
    if (daysLeft <= 7) console.log('   Less than a week to harvest!');
  }
}

async function deleteCrop() {
  const type = await ask('Enter the crop type to delete: ');
  const res = await Crop.deleteMany({ type });
  console.log(` Deleted ${res.deletedCount} record(s) of type "${type}".`);
}

function fmt(d) {
  return new Date(d).toISOString().slice(0, 10);
}

async function shutdown(code) {
  const mongoose = require('mongoose');
  await mongoose.connection.close().catch(() => {});
  rl.close();
  process.exit(code);
}

// exits
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

showMenu();
