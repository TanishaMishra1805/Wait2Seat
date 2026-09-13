const Passenger = require("../models/Passenger");

/**
 * Parses "WL1", "WL12", "RAC3" -> numeric rank for sorting.
 * RAC passengers are treated as lower priority than WL of the same number
 * since WL passengers have no seat at all yet.
 */
function parseRank(waitlistStatus) {
  const match = waitlistStatus.match(/(\d+)/);
  const num = match ? parseInt(match[1], 10) : 9999;
  const isRAC = /RAC/i.test(waitlistStatus);
  return isRAC ? num + 0.5 : num; // RAC3 (3.5) sits just behind WL3 (3)
}

/**
 * Returns the next passenger in line for a given train, ordered so that
 * WL1 is always served before WL2, WL3, ... (lower rank number = higher priority).
 */
async function getNextInQueue(trainNumber) {
  const waiting = await Passenger.find({
    trainNumber,
    status: "WAITING",
  }).lean();

  if (waiting.length === 0) return null;

  waiting.sort((a, b) => a.waitlistRank - b.waitlistRank);
  return waiting[0];
}

/**
 * Called whenever a berth frees up on a train. Notifies the highest-priority
 * waiting passenger and opens their 200-second claim window.
 */
async function notifyNextPassenger(trainNumber, seatLabel) {
  const next = await getNextInQueue(trainNumber);
  if (!next) return null;

  const CLAIM_WINDOW_MS = 200 * 1000; // 200-second countdown timer
  const notifiedAt = new Date();
  const claimDeadline = new Date(notifiedAt.getTime() + CLAIM_WINDOW_MS);

  const updated = await Passenger.findByIdAndUpdate(
    next._id,
    {
      status: "NOTIFIED",
      notifiedAt,
      claimDeadline,
      seatAssigned: seatLabel,
    },
    { new: true }
  );

  // In production: trigger SMS/push notification here.
  console.log(
    `🔔 Notified ${updated.name} (${updated.waitlistStatus}) — seat ${seatLabel} on train ${trainNumber}. Claim by ${claimDeadline.toISOString()}`
  );

  scheduleExpiry(updated._id, CLAIM_WINDOW_MS, trainNumber, seatLabel);
  return updated;
}

/**
 * If the passenger doesn't claim within 200 seconds, mark them EXPIRED and
 * automatically cascade the offer to the next passenger in the priority queue.
 */
function scheduleExpiry(passengerId, delayMs, trainNumber, seatLabel) {
  setTimeout(async () => {
    const passenger = await Passenger.findById(passengerId);
    if (passenger && passenger.status === "NOTIFIED") {
      passenger.status = "EXPIRED";
      await passenger.save();
      console.log(`⌛ Claim window expired for ${passenger.name}. Passing seat to next in line.`);
      await notifyNextPassenger(trainNumber, seatLabel); // cascade to next WL
    }
  }, delayMs);
}

module.exports = { getNextInQueue, notifyNextPassenger, parseRank };
