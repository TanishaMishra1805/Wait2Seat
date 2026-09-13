const express = require("express");
const router = express.Router();

const Passenger = require("../models/Passenger");
const Train = require("../models/Train");
const { parseRank, notifyNextPassenger, getNextInQueue } = require("../services/priorityQueue");
const { claimSeat, getCountdown } = require("../services/seatClaim");
const { handleMessage } = require("../services/chatbot");

// ---------- Passengers / Waitlist ----------

// Register a waitlisted passenger
router.post("/passengers", async (req, res) => {
  try {
    const { name, phone, pnr, trainNumber, waitlistStatus, boardingStation, destinationStation } = req.body;
    const passenger = await Passenger.create({
      name,
      phone,
      pnr,
      trainNumber,
      waitlistStatus,
      waitlistRank: parseRank(waitlistStatus),
      boardingStation,
      destinationStation,
    });
    res.status(201).json(passenger);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// View live queue for a train, ordered by priority (WL1 first)
router.get("/queue/:trainNumber", async (req, res) => {
  const queue = await Passenger.find({
    trainNumber: req.params.trainNumber,
    status: "WAITING",
  }).sort({ waitlistRank: 1 });
  res.json(queue);
});

// Simulate a berth opening up -> notifies highest-priority passenger (WL1 first)
router.post("/trains/:trainNumber/berth-freed", async (req, res) => {
  const { seatLabel } = req.body;
  const notified = await notifyNextPassenger(req.params.trainNumber, seatLabel || "B3-45");
  if (!notified) return res.json({ message: "No one waiting for this train." });
  res.json({ message: "Passenger notified.", passenger: notified });
});

// Passenger claims their seat within the 200-second window
router.post("/passengers/:id/claim", async (req, res) => {
  const result = await claimSeat(req.params.id);
  res.json(result);
});

// Countdown timer value for the frontend
router.get("/passengers/:id/countdown", async (req, res) => {
  const secondsLeft = await getCountdown(req.params.id);
  res.json({ secondsLeft });
});

// ---------- Trains ----------

router.post("/trains", async (req, res) => {
  try {
    const train = await Train.create(req.body);
    res.status(201).json(train);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/trains", async (req, res) => {
  res.json(await Train.find());
});

// ---------- NLP Chatbot ----------

router.post("/chatbot", async (req, res) => {
  const { message, from, to } = req.body;
  const result = await handleMessage(message, { from, to });
  res.json(result);
});

module.exports = router;
