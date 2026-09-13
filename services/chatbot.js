const { NlpManager } = require("node-nlp");
const Train = require("../models/Train");

const manager = new NlpManager({ languages: ["en"], forceNER: true });

// ---- Train the intents the chatbot needs to understand ----
function addDocs() {
  const alternateRouteDocs = [
    "suggest an alternate route",
    "find another way to reach",
    "show me multi leg trains",
    "is there another route",
    "give me connecting trains",
    "no direct train available what are my options",
    "how else can I travel",
    "break my journey",
  ];
  alternateRouteDocs.forEach((d) => manager.addDocument("en", d, "route.alternate"));

  const fareDocs = [
    "what is the fare",
    "how much will it cost",
    "give me fare breakdown",
    "ticket price for this route",
    "total cost of the journey",
  ];
  fareDocs.forEach((d) => manager.addDocument("en", d, "route.fare"));

  const statusDocs = [
    "what is my waitlist status",
    "check my queue position",
    "where do I stand in the queue",
    "am I confirmed yet",
  ];
  statusDocs.forEach((d) => manager.addDocument("en", d, "status.check"));

  const greetDocs = ["hi", "hello", "hey", "good morning", "good evening"];
  greetDocs.forEach((d) => manager.addDocument("en", d, "greeting"));

  manager.addAnswer("en", "greeting", "Hi! I'm the Wait2Seat assistant. Ask me for alternate routes, fare breakdowns, or your waitlist status.");
  manager.addAnswer("en", "status.check", "Tell me your PNR and I'll check your live queue position.");
}

let trained = false;
async function trainChatbot() {
  if (trained) return;
  addDocs();
  await manager.train();
  manager.save();
  trained = true;
  console.log("🤖 NLP.js chatbot trained.");
}

/**
 * Looks up pre-computed alternate multi-leg routes for a train pair and
 * formats a segment-wise fare breakdown.
 */
async function suggestAlternateRoutes(fromStation, toStation) {
  const train = await Train.findOne({
    from: new RegExp(`^${fromStation}$`, "i"),
    to: new RegExp(`^${toStation}$`, "i"),
  }).lean();

  if (!train || !train.alternateRoutes || train.alternateRoutes.length === 0) {
    return {
      found: false,
      message: `No alternate multi-leg routes found from ${fromStation} to ${toStation} yet.`,
    };
  }

  const options = train.alternateRoutes.map((route, idx) => ({
    option: idx + 1,
    legs: route.legs.map((leg) => ({
      train: `${leg.trainName} (${leg.trainNumber})`,
      segment: `${leg.from} → ${leg.to}`,
      departure: leg.departure,
      arrival: leg.arrival,
      fare: leg.fare,
      availableBerths: leg.availableBerths,
    })),
    totalFare: route.totalFare,
  }));

  return { found: true, from: fromStation, to: toStation, options };
}

/**
 * Main entry point: takes a free-text user message, classifies intent via
 * NLP.js, and returns a chatbot reply (+ structured route data when relevant).
 */
async function handleMessage(message, context = {}) {
  await trainChatbot();
  const response = await manager.process("en", message);

  switch (response.intent) {
    case "route.alternate":
    case "route.fare": {
      const { from, to } = context;
      if (!from || !to) {
        return {
          reply:
            "Sure — which station are you boarding from, and what's your destination?",
          intent: response.intent,
        };
      }
      const result = await suggestAlternateRoutes(from, to);
      if (!result.found) {
        return { reply: result.message, intent: response.intent };
      }
      const summary = result.options
        .map(
          (o) =>
            `Option ${o.option}: ${o.legs.map((l) => l.segment).join(" → ")} — total fare ₹${o.totalFare}`
        )
        .join("\n");
      return {
        reply: `Here are alternate multi-leg routes:\n${summary}`,
        intent: response.intent,
        data: result.options,
      };
    }
    case "greeting":
      return { reply: response.answer, intent: "greeting" };
    case "status.check":
      return { reply: response.answer, intent: "status.check" };
    default:
      return {
        reply:
          "I can help with alternate routes, fare breakdowns, or your waitlist status. Could you rephrase that?",
        intent: "None",
      };
  }
}

module.exports = { trainChatbot, handleMessage, suggestAlternateRoutes };
