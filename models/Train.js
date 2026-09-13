const mongoose = require("mongoose");

const legSchema = new mongoose.Schema(
  {
    trainNumber: String,
    trainName: String,
    from: String,
    to: String,
    departure: String,
    arrival: String,
    fare: Number,
    availableBerths: { type: Number, default: 0 },
  },
  { _id: false }
);

const trainSchema = new mongoose.Schema({
  trainNumber: { type: String, required: true, unique: true },
  trainName: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  departure: String,
  arrival: String,
  totalBerths: { type: Number, default: 72 },
  availableBerths: { type: Number, default: 0 },
  // Pre-computed alternate multi-leg routes used when a direct train is full/unavailable
  alternateRoutes: [
    {
      legs: [legSchema],
      totalFare: Number,
    },
  ],
});

module.exports = mongoose.model("Train", trainSchema);
