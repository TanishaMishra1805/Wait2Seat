# Wait2Seat 🚆

Smart Railway Seat Alert & Route Assistant — a project I built to solve a problem every Indian train traveler has faced: sitting on a waitlist with zero visibility into when (or if) you'll get a confirmed seat.

## The problem

If you've ever booked a waitlisted train ticket, you know the anxiety — you keep refreshing IRCTC hoping your status moves up, and if a berth actually opens up, there's no fair, real-time way to know who gets it next. Wait2Seat tries to fix that.

## What it actually does

- When a berth frees up (someone cancels), the system automatically figures out who should get it — WL1 gets priority over WL2, WL2 over WL3, and so on. RAC passengers are treated as slightly lower priority than the matching WL number since they already have a partial seat.
- Whoever's next gets a **200-second window** to claim the seat. If they don't respond in time, it automatically moves to the next person in line instead of the seat just sitting there.
- There's also a small chatbot (built with NLP.js) that can suggest alternate multi-leg routes with a fare breakdown if your direct train isn't available — so instead of just saying "no seats," it tries to actually help you get there.

## Tech stack

Node.js, Express, MongoDB, NLP.js, and plain HTML/CSS/JS for the frontend (no framework, kept it simple for now).

## Folder structure

```
config/       -> DB connection + seed script
models/       -> Passenger.js, Train.js
services/
  priorityQueue.js  -> WL-rank sorting, notify-next-in-line, cascades on expiry
  seatClaim.js       -> claim confirmation + countdown logic
  chatbot.js         -> NLP.js intents + route/fare lookup
routes/api.js -> REST endpoints
public/       -> dashboard (index.html, style.css, app.js)
```

## How to run it locally

1. `npm install`

2. Make a `.env` file in the root:
```
MONGO_URI=mongodb://127.0.0.1:27017/wait2seat
PORT=5000
```
(If you don't have MongoDB installed, just use a free Atlas cluster instead and paste that connection string here.)

3. Seed some sample data (one train + 3 waitlisted passengers — WL1, WL2, RAC1):
```
npm run seed
```

4. Start it up:
```
npm start
```

5. Go to `http://localhost:5000`

## Trying it out

- Hit "Simulate berth release" — it notifies whoever's at the top of the queue.
- Watch the countdown. Either claim the seat before it hits 0, or just let it expire and watch it auto-cascade to the next passenger.
- In the chatbot section, put in something like Kanpur → Delhi and ask "suggest an alternate route" — it'll pull multi-leg options with fares straight from MongoDB.

## A few implementation notes (for anyone reviewing the code)

- The priority logic lives in `parseRank()` inside `priorityQueue.js` — it converts things like "WL1", "WL12", "RAC3" into a number so they can be sorted properly.
- The 200-second timer is just a `setTimeout` — nothing fancy, but it does the job of simulating a real claim window and cascading automatically on expiry.
- The chatbot trains a small NLP.js model on a handful of intents (route/fare/status/greeting) and then looks up `Train.alternateRoutes` in MongoDB to actually answer with real data instead of a canned response.

This is still a work in progress — next things I want to add are SMS/push notifications instead of just console logs, and maybe a login system so passengers can check their own status instead of viewing the whole queue.
