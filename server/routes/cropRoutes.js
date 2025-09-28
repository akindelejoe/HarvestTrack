const express = require('express');
const router = express.Router();
const Crop = require('../models/crop');
const { calculateHarvestDate } = require('../harvest');

// GET all crops
router.get('/', async (req, res) => {
  try {
    const crops = await Crop.find();
    res.json(crops);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching crops', error: err.message });
  }
});

// POST new crop
router.post('/', async (req, res) => {
  try {
    const { type, location, plantingDate } = req.body;
    const harvestDate = calculateHarvestDate(plantingDate, type);

    const newCrop = new Crop({ type, location, plantingDate, harvestDate });
    await newCrop.save();

    res.status(201).json({ message: 'Crop added successfully', crop: newCrop });
  } catch (err) {
    res.status(400).json({ message: 'Error adding crop', error: err.message });
  }
});

// DELETE crop by ID
router.delete('/:id', async (req, res) => {
  try {
    await Crop.findByIdAndDelete(req.params.id);
    res.json({ message: 'Crop deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting crop', error: err.message });
  }
});

module.exports = router;
