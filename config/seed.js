require("dotenv").config();
const connectDB = require("./db");
const Train = require("../models/Train");
const Passenger = require("../models/Passenger");
const mongoose = require("mongoose");

async function seed() {
  await connectDB();
  await Train.deleteMany({});
  await Passenger.deleteMany({});

  await Train.create({
    trainNumber: "12345",
    trainName: "Kanpur Superfast Express",
    from: "Kanpur",
    to: "Delhi",
    departure: "22:10",
    arrival: "05:30",
    totalBerths: 72,
    availableBerths: 0,
    alternateRoutes: [
      {
        legs: [
          { trainNumber: "22401", trainName: "Kanpur-Lucknow Shuttle", from: "Kanpur", to: "Lucknow", departure: "21:00", arrival: "22:30", fare: 150, availableBerths: 10 },
          { trainNumber: "12561", trainName: "Lucknow-Delhi Swatantrata Exp", from: "Lucknow", to: "Delhi", departure: "23:15", arrival: "06:00", fare: 620, availableBerths: 6 },
        ],
        totalFare: 770,
      },
      {
        legs: [
          { trainNumber: "14217", trainName: "Kanpur-Kanpur Central Link", from: "Kanpur", to: "Kanpur Central", departure: "20:30", arrival: "20:50", fare: 20, availableBerths: 20 },
          { trainNumber: "12004", trainName: "Shatabdi Express", from: "Kanpur Central", to: "Delhi", departure: "21:30", arrival: "05:15", fare: 900, availableBerths: 4 },
        ],
        totalFare: 920,
      },
    ],
  });

  await Passenger.create([
    { name: "Aarav Sharma", phone: "9990000001", pnr: "PNR1001", trainNumber: "12345", waitlistStatus: "WL1", waitlistRank: 1, boardingStation: "Kanpur", destinationStation: "Delhi" },
    { name: "Priya Verma", phone: "9990000002", pnr: "PNR1002", trainNumber: "12345", waitlistStatus: "WL2", waitlistRank: 2, boardingStation: "Kanpur", destinationStation: "Delhi" },
    { name: "Rohan Gupta", phone: "9990000003", pnr: "PNR1003", trainNumber: "12345", waitlistStatus: "RAC1", waitlistRank: 1.5, boardingStation: "Kanpur", destinationStation: "Delhi" },
  ]);

  console.log("🌱 Seed data inserted.");
  await mongoose.disconnect();
}

seed();
