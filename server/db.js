// server/db.js
const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://akindelejoe:AUlFZn9eMoeiMX4n@cluster0.jl56hjp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

let db;

async function connect() {
  if (!db) {
    await client.connect();
    db = client.db('cropTracker'); 
  }
  return db.collection('crops'); 
}

async function getCrops() {
  const crops = await connect();
  return crops.find().toArray();
}

async function addCrop(crop) {
  const crops = await connect();
  await crops.insertOne(crop);
}

async function deleteCrop(id) {
  const crops = await connect();
  await crops.deleteOne({ _id: new ObjectId(id) });
}

module.exports = {
  getCrops,
  addCrop,
  deleteCrop,
};
