const mongoose = require("mongoose");

// Connects to MongoDB using MONGO_URI from .env
// (Get a free cluster at https://www.mongodb.com/cloud/atlas or run mongod locally)
async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/wait2seat";
  try {
    await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${uri}`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.error(
      "   Set MONGO_URI in a .env file, or run a local MongoDB instance (mongod)."
    );
    process.exit(1);
  }
}

module.exports = connectDB;
