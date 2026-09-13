const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    pnr: { type: String, required: true },
    trainNumber: { type: String, required: true },
    // e.g. "WL1", "WL2", "RAC3" — lower waitlist number = higher priority
    waitlistStatus: { type: String, required: true },
    waitlistRank: { type: Number, required: true }, // parsed numeric rank, e.g. WL1 -> 1
    boardingStation: String,
    destinationStation: String,

    // Queue / alert lifecycle
    status: {
      type: String,
      enum: ["WAITING", "NOTIFIED", "CLAIMED", "EXPIRED", "CONFIRMED"],
      default: "WAITING",
    },
    notifiedAt: Date,
    claimDeadline: Date, // notifiedAt + 200 seconds
    seatAssigned: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Passenger", passengerSchema);
