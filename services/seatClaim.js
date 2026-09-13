const Passenger = require("../models/Passenger");

/**
 * Passenger actively claims their offered berth before claimDeadline.
 * Returns { success, message, secondsLeft? }
 */
async function claimSeat(passengerId) {
  const passenger = await Passenger.findById(passengerId);
  if (!passenger) return { success: false, message: "Passenger not found." };

  if (passenger.status !== "NOTIFIED") {
    return {
      success: false,
      message: `Cannot claim — current status is ${passenger.status}.`,
    };
  }

  const now = new Date();
  if (now > passenger.claimDeadline) {
    passenger.status = "EXPIRED";
    await passenger.save();
    return { success: false, message: "Claim window has expired." };
  }

  passenger.status = "CONFIRMED";
  await passenger.save();
  return {
    success: true,
    message: `Seat ${passenger.seatAssigned} confirmed for ${passenger.name}.`,
  };
}

/** Returns remaining seconds on the claim countdown, for the frontend timer. */
async function getCountdown(passengerId) {
  const passenger = await Passenger.findById(passengerId).lean();
  if (!passenger || passenger.status !== "NOTIFIED") return 0;
  const secondsLeft = Math.max(
    0,
    Math.floor((new Date(passenger.claimDeadline) - Date.now()) / 1000)
  );
  return secondsLeft;
}

module.exports = { claimSeat, getCountdown };
