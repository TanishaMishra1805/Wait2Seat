# Wait2Seat — Smart Railway Seat Alert & Route Assistant

Full working build using exactly the stack listed on your resume: **HTML, CSS, JS, Node.js, Express, MongoDB, NLP.js**.

## What it does
- Notifies waitlisted passengers the moment a berth frees up.
- **Priority queue logic**: WL1 is always alerted before WL2, WL3, ... (RAC ranked just behind the matching WL number).
- **200-second seat claim countdown**: if the passenger doesn't confirm in time, the offer automatically cascades to the next person in line.
- **NLP.js chatbot**: understands free-text questions ("suggest an alternate route", "what's the fare") and returns multi-leg route suggestions with a segment-wise fare breakdown when a direct train isn't available.
- Live dashboard (HTML/CSS/JS) showing the queue board, countdown timer, and chat widget.

## Project structure
```
wait2seat/
├── server.js              # Express app entry point
├── config/
│   ├── db.js               # MongoDB connection
│   └── seed.js             # Sample train + waitlisted passengers
├── models/
│   ├── Passenger.js         # Waitlist status, rank, claim lifecycle
│   └── Train.js              # Train + pre-computed alternate multi-leg routes
├── services/
│   ├── priorityQueue.js     # WL-rank sorting, notify-next-in-line, cascade on expiry
│   ├── seatClaim.js         # Claim confirmation + countdown logic
│   └── chatbot.js           # NLP.js intents + route/fare lookup
├── routes/api.js            # REST endpoints
└── public/                  # Dashboard (index.html, style.css, app.js)
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:
   ```
   MONGO_URI=mongodb://127.0.0.1:27017/wait2seat
   PORT=5000
   ```
   (Use a free MongoDB Atlas connection string instead if you don't have MongoDB installed locally: https://www.mongodb.com/cloud/atlas)

3. Seed sample data (one train, three waitlisted passengers — WL1, WL2, RAC1):
   ```bash
   npm run seed
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open **http://localhost:5000** in your browser.

## Try it out
1. On the dashboard, click **"Simulate berth release"** — this notifies whoever is at the top of the priority queue (WL1 first).
2. Watch the 200-second countdown. Click **"Claim this seat"** before it hits zero, or let it expire to see the offer automatically cascade to the next passenger.
3. In the **Route Assistant**, fill in From/To (try `Kanpur` → `Delhi`) and type something like *"suggest an alternate route"* or *"what's the fare"* — the NLP.js chatbot classifies your intent and returns multi-leg options with fare breakdowns pulled from MongoDB.

## Notes for your resume/project writeup
- Priority queue: `services/priorityQueue.js` — `parseRank()` converts "WL1"/"WL12"/"RAC3" into a sortable number so WL always beats RAC of the same number, and lower numbers are served first.
- Countdown timer: `services/priorityQueue.js` schedules a 200-second `setTimeout`; `services/seatClaim.js` exposes the remaining seconds so the frontend can render a live countdown.
- Chatbot: `services/chatbot.js` trains an `NlpManager` (node-nlp) on route/fare/status/greeting intents, then looks up `Train.alternateRoutes` in MongoDB for the actual multi-leg segments and fares.
