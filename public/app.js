// The train being tracked — set by the user via the trip-setup fields in the
// hero, not hardcoded. Nothing loads until they enter a train number.
let TRAIN_NUMBER = "";
let activeClaimId = null;
let countdownTimer = null;

// Full unfiltered queue as last fetched from the server, and the
// destination the user has chosen to filter the visible list by.
let latestQueue = [];
let destinationFilter = "";

// ---- Split-flap board update helper ----
function flipTo(elId, newText) {
  const el = document.getElementById(elId);
  if (el.textContent === newText) return;
  el.classList.remove("flipping");
  void el.offsetWidth; // restart animation
  el.classList.add("flipping");
  setTimeout(() => { el.textContent = newText; }, 250);
}

// ---- Find trains to a destination ----
// A built-in directory (illustrative demo data, not a live IRCTC feed —
// there's no live national train database wired up here) covering the
// major corridors out of Kanpur, plus a couple of local passenger trains
// for smaller Bundelkhand-region stations.
const TRAIN_DIRECTORY = [
  { number: "12417", name: "Prayagraj Express", from: "Kanpur Central", to: "New Delhi", departure: "22:35", via: ["Kanpur Central", "Etawah", "Tundla", "Aligarh", "New Delhi"] },
  { number: "12559", name: "Shiv Ganga Express", from: "Kanpur Central", to: "New Delhi", departure: "04:50", via: ["Kanpur Central", "Kanpur Anwarganj", "Tundla", "New Delhi"] },
  { number: "12034", name: "Kanpur Shatabdi", from: "Kanpur Central", to: "New Delhi", departure: "19:20", via: ["Kanpur Central", "Tundla", "New Delhi"] },
  { number: "12303", name: "Poorva Express", from: "Kanpur Central", to: "Howrah Junction", departure: "03:10", via: ["Kanpur Central", "Prayagraj", "Varanasi", "Patna", "Howrah Junction"] },
  { number: "13005", name: "Amritsar Mail", from: "Kanpur Central", to: "Kolkata", departure: "01:20", via: ["Kanpur Central", "Lucknow", "Patna", "Kolkata"] },
  { number: "11016", name: "Kushinagar Express", from: "Kanpur Central", to: "Mumbai CST", departure: "14:05", via: ["Kanpur Central", "Jhansi", "Bhopal", "Itarsi", "Mumbai CST"] },
  { number: "12141", name: "Patna–LTT Express", from: "Kanpur Central", to: "Mumbai LTT", departure: "09:40", via: ["Kanpur Central", "Jhansi", "Bhopal", "Nagpur", "Mumbai LTT"] },
  { number: "11077", name: "Jhelum Express", from: "Kanpur Central", to: "Pune", departure: "10:05", via: ["Kanpur Central", "Jhansi", "Bhopal", "Itarsi", "Manmad", "Pune"] },
  { number: "12724", name: "Telangana Express", from: "Kanpur Central", to: "Hyderabad", departure: "02:30", via: ["Kanpur Central", "Jhansi", "Bhopal", "Nagpur", "Hyderabad"] },
  { number: "12622", name: "Tamil Nadu Express", from: "Kanpur Central", to: "Chennai Central", departure: "05:15", via: ["Kanpur Central", "Jhansi", "Bhopal", "Nagpur", "Chennai Central"] },
  { number: "12627", name: "Karnataka Express", from: "Kanpur Central", to: "Bengaluru", departure: "08:40", via: ["Kanpur Central", "Jhansi", "Bhopal", "Nagpur", "Secunderabad", "Bengaluru"] },
  { number: "19168", name: "Sabarmati Express", from: "Kanpur Central", to: "Ahmedabad", departure: "12:15", via: ["Kanpur Central", "Jhansi", "Kota", "Ahmedabad"] },
  { number: "19038", name: "Avantika Express", from: "Kanpur Central", to: "Indore", departure: "19:15", via: ["Kanpur Central", "Jhansi", "Bhopal", "Ujjain", "Indore"] },
  { number: "14853", name: "Marudhar Express", from: "Kanpur Central", to: "Jaipur", departure: "17:10", via: ["Kanpur Central", "Agra", "Jaipur"] },
  { number: "14649", name: "Amritsar Express", from: "Kanpur Central", to: "Amritsar", departure: "23:10", via: ["Kanpur Central", "Tundla", "Ambala", "Amritsar"] },
  { number: "13009", name: "Doon Express", from: "Kanpur Central", to: "Dehradun", departure: "18:30", via: ["Kanpur Central", "Lucknow", "Bareilly", "Dehradun"] },
  { number: "15933", name: "Kamrup Express", from: "Kanpur Central", to: "Guwahati", departure: "15:20", via: ["Kanpur Central", "Lucknow", "Patna", "Guwahati"] },
  { number: "12876", name: "Neelachal Express", from: "Kanpur Central", to: "Bhubaneswar", departure: "20:00", via: ["Kanpur Central", "Prayagraj", "Varanasi", "Bhubaneswar"] },
  { number: "12489", name: "Seemanchal Express", from: "Kanpur Central", to: "Patna", departure: "11:45", via: ["Kanpur Central", "Lucknow", "Varanasi", "Patna"] },
  { number: "12403", name: "Bhopal–Kanpur Express", from: "Kanpur Central", to: "Bhopal", departure: "06:20", via: ["Kanpur Central", "Jhansi", "Bhopal"] },
  { number: "14211", name: "Chambal Express", from: "Kanpur Central", to: "Gwalior", departure: "13:35", via: ["Kanpur Central", "Etawah", "Jhansi", "Gwalior"] },
  { number: "51905", name: "Kanpur–Manikpur Passenger", from: "Kanpur Central", to: "Manikpur", departure: "06:10", via: ["Kanpur Central", "Fatehpur", "Banda", "Atarra", "Manikpur"] },
];

// Smaller stations that aren't a direct destination in the directory above,
// mapped to the nearest major junction we do have trains for.
const NEARBY_MAJOR_STATION = {
  chitrakoot: "Manikpur",
  karwi: "Manikpur",
  banda: "Manikpur",
  hamirpur: "Jhansi",
  mahoba: "Jhansi",
  orai: "Jhansi",
  auraiya: "Kanpur Central",
  unnao: "Lucknow",
  raebareli: "Lucknow",
  sitapur: "Lucknow",
  moradabad: "Bareilly",
};

const searchDestinationInput = document.getElementById("searchDestination");
const searchTrainsBtn = document.getElementById("searchTrainsBtn");
const searchResults = document.getElementById("searchResults");

function findTrainsTo(needle) {
  const q = needle.toLowerCase();
  return TRAIN_DIRECTORY.filter(
    (t) => t.to.toLowerCase().includes(q) || t.via.some((v) => v.toLowerCase().includes(q))
  );
}

// Shared by the search panel and the route-assistant chatbot: looks up a
// destination in the directory, falling back to the nearest major junction.
//
// This first tries a real backend endpoint (/api/trains/search) so that if
// you later wire up a licensed provider server-side (IRCTC only offers
// authorized B2B/agent access, never a public client-side API — see
// https://www.irctc.co.in/nget/train-search for what a legitimate partner
// integration looks like), the app switches to live data automatically
// with zero frontend changes. Until then, it falls back to the local
// illustrative directory below.
async function searchDirectoryForDestination(raw) {
  if (!raw) return { matches: [], note: "" };

  try {
    const res = await fetch(`/api/trains/search?to=${encodeURIComponent(raw)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        return { matches: data, note: "" };
      }
    }
  } catch (err) {
    // No live train-search backend configured — fall back to the local directory.
  }

  let matches = findTrainsTo(raw);
  let note = "";
  if (!matches.length) {
    const key = raw.toLowerCase().replace(/\s+/g, "");
    const majorStation = NEARBY_MAJOR_STATION[key];
    if (majorStation) {
      matches = findTrainsTo(majorStation);
      note = `No direct trains found to "${raw}" — showing trains to ${majorStation}, the nearest major junction in our directory.`;
    }
  }
  return { matches, note };
}

async function attachLiveWaitlist(number, cellId) {
  const cell = document.getElementById(cellId);
  if (!cell) return;
  try {
    const res = await fetch(`/api/queue/${number}`);
    if (!res.ok) throw new Error("bad status");
    const data = await res.json();
    cell.textContent = `${data.length} in waitlist`;
  } catch (err) {
    cell.textContent = "Live waitlist unavailable";
  }
}

function buildTrainCardHtml(t, cellId) {
  return `
    <div class="train-result" data-number="${t.number}">
      <div class="train-result-info">
        <span class="train-result-title">${t.number} · ${t.name}</span>
        <span class="train-result-route mono">${t.from} → ${t.to} · departs ${t.departure}</span>
        <span class="train-result-wl mono" id="${cellId}">Checking live waitlist…</span>
      </div>
      <button type="button" class="track-result-btn" data-train-number="${t.number}">Track this train</button>
    </div>`;
}

// Delegated so it works for cards rendered in either the search panel or the chat window.
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".track-result-btn");
  if (!btn) return;
  const t = TRAIN_DIRECTORY.find((x) => x.number === btn.dataset.trainNumber);
  if (!t) return;
  trainNumberInput.value = t.number;
  trainNameInput.value = t.name;
  fromStationInput.value = t.from;
  toStationInput.value = t.to;
  if (departureInput) departureInput.value = t.departure;
  trackTrainBtn.click();
  document.querySelector(".queue-panel").scrollIntoView({ behavior: "smooth", block: "start" });
});

function renderTrainResults(matches, needle, note) {
  if (!matches.length) {
    searchResults.innerHTML = `<p class="search-empty">No trains found for "${needle}" in our directory — try a nearby major station, or enter a train number above if you already know it. This is a demo directory, not a live national database.</p>`;
    return;
  }
  const noteHtml = note ? `<p class="search-note">${note}</p>` : "";
  searchResults.innerHTML =
    noteHtml + matches.map((t, i) => buildTrainCardHtml(t, `wl-${i}-${t.number}`)).join("");
  matches.forEach((t, i) => attachLiveWaitlist(t.number, `wl-${i}-${t.number}`));
}

if (searchTrainsBtn) {
  searchTrainsBtn.addEventListener("click", async () => {
    const raw = searchDestinationInput.value.trim();
    if (!raw) {
      searchResults.innerHTML = `<p class="search-empty">Type a destination station to search.</p>`;
      return;
    }
    searchResults.innerHTML = `<p class="search-empty">Searching…</p>`;
    const { matches, note } = await searchDirectoryForDestination(raw);
    renderTrainResults(matches, raw, note);
  });
  searchDestinationInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchTrainsBtn.click();
  });
}

// ---- Trip setup (train number, name, route) — all user-entered ----
const trainNumberInput = document.getElementById("trainNumberInput");
const trainNameInput = document.getElementById("trainNameInput");
const fromStationInput = document.getElementById("fromStationInput");
const toStationInput = document.getElementById("toStationInput");
const departureInput = document.getElementById("departureInput");
const arrivalInput = document.getElementById("arrivalInput");
const stubCode = document.getElementById("stubCode");
const trackTrainBtn = document.getElementById("trackTrainBtn");
const trackMsg = document.getElementById("trackMsg");
let lastLoadFailed = false;

function updateStubCode() {
  if (stubCode) stubCode.textContent = `WL · ${TRAIN_NUMBER || "— —"}`;
}

if (trackTrainBtn) {
  trackTrainBtn.addEventListener("click", async () => {
    const number = trainNumberInput ? trainNumberInput.value.trim() : "";
    if (!number) {
      trackMsg.textContent = "Enter a train number first.";
      trackMsg.className = "track-msg error";
      trainNumberInput.focus();
      return;
    }

    TRAIN_NUMBER = number;
    updateStubCode();

    const passNumber = document.getElementById("passNumber");
    const passTitle = document.getElementById("passTitle");
    const passFrom = document.getElementById("passFrom");
    const passTo = document.getElementById("passTo");
    if (passNumber) passNumber.textContent = TRAIN_NUMBER;
    if (passTitle) passTitle.textContent = trainNameInput.value.trim() || "Your train";
    if (passFrom) passFrom.textContent = fromStationInput.value.trim() || "—";
    if (passTo) passTo.textContent = toStationInput.value.trim() || "—";

    const passTiming = document.getElementById("passTiming");
    if (passTiming) {
      const dep = departureInput.value || "--:--";
      const arr = arrivalInput.value || "--:--";
      passTiming.textContent = (departureInput.value || arrivalInput.value)
        ? `Departs ${dep} · Arrives ${arr}`
        : "Timing not set";
    }

    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    activeClaimId = null;
    document.getElementById("claimPanel").hidden = true;

    trackTrainBtn.disabled = true;
    trackMsg.textContent = "Loading live queue…";
    trackMsg.className = "track-msg";

    await loadQueue();

    trackTrainBtn.disabled = false;
    if (lastLoadFailed) {
      trackMsg.textContent = `Couldn't reach live data for train ${TRAIN_NUMBER}.`;
      trackMsg.className = "track-msg error";
    } else {
      trackMsg.textContent = `Tracking train ${TRAIN_NUMBER}${trainNameInput.value.trim() ? " — " + trainNameInput.value.trim() : ""}.`;
      trackMsg.className = "track-msg success";
    }
  });
}

// ---- Destination filter ----
// The datalist is built from whatever destinations actually exist in the
// live queue, so it always matches real data instead of a hardcoded list.
function populateDestinationOptions(queue) {
  const list = document.getElementById("destinationOptions");
  if (!list) return;
  const unique = [...new Set(queue.map((p) => p.destinationStation).filter(Boolean))];
  list.innerHTML = unique.map((d) => `<option value="${d}"></option>`).join("");
}

function getFilteredQueue() {
  if (!destinationFilter) return latestQueue;
  const needle = destinationFilter.trim().toLowerCase();
  return latestQueue.filter(
    (p) => p.destinationStation && p.destinationStation.toLowerCase().includes(needle)
  );
}

const destinationInput = document.getElementById("destinationFilter");
if (destinationInput) {
  destinationInput.addEventListener("input", () => {
    destinationFilter = destinationInput.value;
    // Keep the route assistant in sync with what the user is looking for.
    const toInput = document.getElementById("toInput");
    if (toInput) toInput.value = destinationFilter;
    renderQueue();
  });
}

const clearDestinationBtn = document.getElementById("clearDestinationBtn");
if (clearDestinationBtn) {
  clearDestinationBtn.addEventListener("click", () => {
    destinationFilter = "";
    if (destinationInput) destinationInput.value = "";
    renderQueue();
  });
}

// ---- Add yourself to the queue ----
const toggleJoinFormBtn = document.getElementById("toggleJoinFormBtn");
const joinQueueForm = document.getElementById("joinQueueForm");
const cancelJoinBtn = document.getElementById("cancelJoinBtn");
const joinFormMsg = document.getElementById("joinFormMsg");

function setJoinFormOpen(open) {
  if (!joinQueueForm) return;
  joinQueueForm.hidden = !open;
  if (toggleJoinFormBtn) {
    toggleJoinFormBtn.textContent = open ? "− Hide form" : "+ Add yourself to the queue";
  }
  if (open && joinFormMsg) {
    joinFormMsg.textContent = "";
    joinFormMsg.className = "join-msg";
  }
}

if (toggleJoinFormBtn) {
  toggleJoinFormBtn.addEventListener("click", () => {
    const opening = joinQueueForm.hidden;
    if (opening) {
      // Default to the route already entered above — still fully editable.
      document.getElementById("joinFrom").value = fromStationInput ? fromStationInput.value : "";
      document.getElementById("joinTo").value = toStationInput ? toStationInput.value : "";
    }
    setJoinFormOpen(opening);
  });
}

if (cancelJoinBtn) {
  cancelJoinBtn.addEventListener("click", () => {
    joinQueueForm.reset();
    setJoinFormOpen(false);
  });
}

if (joinQueueForm) {
  joinQueueForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const passengerData = {
      name: document.getElementById("joinName").value.trim(),
      pnr: document.getElementById("joinPnr").value.trim(),
      boardingStation: document.getElementById("joinFrom").value.trim(),
      destinationStation: document.getElementById("joinTo").value.trim(),
      waitlistStatus: document.getElementById("joinStatus").value.trim(),
    };

    if (!TRAIN_NUMBER) {
      joinFormMsg.textContent = "Enter a train number above first.";
      joinFormMsg.className = "join-msg error";
      return;
    }

    if (Object.values(passengerData).some((v) => !v)) {
      joinFormMsg.textContent = "Please fill in every field.";
      joinFormMsg.className = "join-msg error";
      return;
    }

    const submitBtn = joinQueueForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    let addedPassenger = null;

    try {
      const res = await fetch(`/api/queue/${TRAIN_NUMBER}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passengerData),
      });
      if (res.ok) {
        const data = await res.json();
        addedPassenger = data.passenger || data;
      }
    } catch (err) {
      // No live server for this action — fall through to the local queue below.
    }

    if (!addedPassenger) {
      addedPassenger = {
        _id: `local-${Date.now()}`,
        status: "WAITING",
        ...passengerData,
      };
      latestQueue.push(addedPassenger);
      populateDestinationOptions(latestQueue);
    } else {
      await loadQueue();
    }

    renderQueue();
    highlightRow(addedPassenger._id);

    joinFormMsg.textContent = `Added — you're #${latestQueue.findIndex((p) => p._id === addedPassenger._id) + 1} in the queue.`;
    joinFormMsg.className = "join-msg success";
    joinQueueForm.reset();
    submitBtn.disabled = false;
  });
}

// ---- Queue board ----
function updateQueueStats() {
  const counts = { WAITING: 0, NOTIFIED: 0, CONFIRMED: 0, EXPIRED: 0 };
  latestQueue.forEach((p) => {
    if (counts[p.status] !== undefined) counts[p.status] += 1;
  });
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set("statTotal", latestQueue.length);
  set("statWaiting", counts.WAITING);
  set("statNotified", counts.NOTIFIED);
  set("statConfirmed", counts.CONFIRMED);
  set("statExpired", counts.EXPIRED);
}

function renderQueue() {
  const board = document.getElementById("queueBoard");
  updateQueueStats();

  if (!TRAIN_NUMBER) {
    board.innerHTML = `<p class="empty-msg">Enter a train number above and press "Track this train" to load its live queue.</p>`;
    flipTo("flapName", "— — —");
    flipTo("flapStatus", "Enter a train number");
    return;
  }

  if (lastLoadFailed) {
    board.innerHTML = `<p class="empty-msg">Couldn't reach live data for train ${TRAIN_NUMBER}. Check the number and press "Track this train" again.</p>`;
    flipTo("flapName", "— — —");
    flipTo("flapStatus", "Couldn't load");
    return;
  }

  if (!latestQueue.length) {
    board.innerHTML = `<p class="empty-msg">No one currently waiting for train ${TRAIN_NUMBER}.</p>`;
    flipTo("flapName", "— — —");
    flipTo("flapStatus", "None waiting");
    return;
  }

  const filtered = getFilteredQueue();

  if (!filtered.length) {
    board.innerHTML = `<p class="empty-msg">No one currently waiting for ${destinationFilter}. <button type="button" id="clearFilterInline" class="link-btn">Show everyone</button></p>`;
    const inlineClear = document.getElementById("clearFilterInline");
    if (inlineClear) inlineClear.addEventListener("click", () => clearDestinationBtn && clearDestinationBtn.click());
  } else {
    board.innerHTML = filtered
      .map(
        (p, i) => `
        <div class="board-row" data-id="${p._id}">
          <span class="rank-badge ${i === 0 && !destinationFilter ? "next" : ""}">${i === 0 && !destinationFilter ? "NEXT" : "#" + (i + 1)}</span>
          <span>${p.name}</span>
          <span class="pnr hide-sm">${p.pnr}</span>
          <span class="status-${p.status}">${p.waitlistStatus}</span>
          <span class="hide-sm">${p.boardingStation} → ${p.destinationStation}</span>
        </div>`
      )
      .join("");
  }

  // The berth is always offered to the true first-in-line passenger for the
  // whole train, regardless of which destination the viewer is filtering by.
  flipTo("flapName", latestQueue[0].name);
  flipTo("flapStatus", "Waiting · " + latestQueue[0].waitlistStatus);
}

async function loadQueue() {
  if (!TRAIN_NUMBER) {
    latestQueue = [];
    lastLoadFailed = false;
    renderQueue();
    return;
  }
  try {
    const res = await fetch(`/api/queue/${TRAIN_NUMBER}`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    latestQueue = await res.json();
    lastLoadFailed = false;
  } catch (err) {
    latestQueue = [];
    lastLoadFailed = true;
  }
  populateDestinationOptions(latestQueue);
  renderQueue();
}

function highlightRow(passengerId) {
  const row = document.querySelector(`.board-row[data-id="${passengerId}"]`);
  if (row) {
    row.classList.remove("just-notified");
    void row.offsetWidth;
    row.classList.add("just-notified");
  }
}

// ---- Simulate a berth freeing up ----
document.getElementById("freeBerthBtn").addEventListener("click", async () => {
  if (!TRAIN_NUMBER) {
    alert("Enter a train number above first.");
    return;
  }
  const seatLabel = document.getElementById("seatLabel").value || "B3-45";
  const res = await fetch(`/api/trains/${TRAIN_NUMBER}/berth-freed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seatLabel }),
  });
  const data = await res.json();

  if (data.passenger) {
    flipTo("flapSeat", data.passenger.seatAssigned);
    flipTo("flapStatus", "Offer sent");
    showClaimPanel(data.passenger);
    await loadQueue();
    highlightRow(data.passenger._id);
  } else {
    alert(data.message || "No one is waiting.");
  }
});

// ---- Claim panel + countdown ----
function showClaimPanel(passenger) {
  activeClaimId = passenger._id;
  const panel = document.getElementById("claimPanel");
  panel.hidden = false;
  document.getElementById("claimText").textContent =
    `${passenger.name} (${passenger.waitlistStatus}) — seat ${passenger.seatAssigned}`;
  document.getElementById("claimResult").textContent = "";
  document.getElementById("countdown").classList.remove("danger");

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(pollCountdown, 1000);
  pollCountdown();
}

async function pollCountdown() {
  if (!activeClaimId) return;
  const res = await fetch(`/api/passengers/${activeClaimId}/countdown`);
  const { secondsLeft } = await res.json();
  const el = document.getElementById("countdown");
  el.textContent = secondsLeft;
  el.classList.toggle("danger", secondsLeft <= 20 && secondsLeft > 0);

  if (secondsLeft <= 0) {
    clearInterval(countdownTimer);
    document.getElementById("claimResult").textContent = "Claim window expired — offer passed to next in queue.";
    document.getElementById("claimResult").style.color = "var(--red)";
    flipTo("flapStatus", "Expired · next up");
    loadQueue();
  }
}

document.getElementById("claimBtn").addEventListener("click", async () => {
  if (!activeClaimId) return;
  const res = await fetch(`/api/passengers/${activeClaimId}/claim`, { method: "POST" });
  const result = await res.json();
  const resultEl = document.getElementById("claimResult");
  resultEl.textContent = result.message;
  resultEl.style.color = result.success ? "var(--green)" : "var(--red)";
  if (result.success) {
    clearInterval(countdownTimer);
    flipTo("flapStatus", "Confirmed");
    loadQueue();
  }
});

// ---- NLP.js chatbot ----
function appendMessage(text, sender) {
  const win = document.getElementById("chatWindow");
  const div = document.createElement("div");
  div.className = `msg ${sender}`;
  div.textContent = text;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function appendTrainResultsToChat(matches, note, destination) {
  const win = document.getElementById("chatWindow");
  const wrap = document.createElement("div");
  wrap.className = "msg bot chat-trains";

  if (!matches.length) {
    wrap.innerHTML = `<p>No trains found to "${destination}" in our directory yet — try a nearby major station.</p>`;
    win.appendChild(wrap);
    win.scrollTop = win.scrollHeight;
    return;
  }

  const noteHtml = note ? `<p class="search-note">${note}</p>` : `<p>Found ${matches.length} train${matches.length > 1 ? "s" : ""} to ${destination}:</p>`;
  wrap.innerHTML = noteHtml + matches.map((t, i) => buildTrainCardHtml(t, `chatwl-${i}-${t.number}`)).join("");
  win.appendChild(wrap);
  matches.forEach((t, i) => attachLiveWaitlist(t.number, `chatwl-${i}-${t.number}`));
  win.scrollTop = win.scrollHeight;
}

document.getElementById("chatSendBtn").addEventListener("click", sendChat);
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

async function sendChat() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;
  appendMessage(message, "user");
  input.value = "";

  const from = document.getElementById("fromInput").value.trim();
  const to = document.getElementById("toInput").value.trim();

  let botReply = null;
  try {
    const res = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, from, to }),
    });
    if (res.ok) {
      const data = await res.json();
      botReply = data.reply;
    }
  } catch (err) {
    // No live chatbot backend reachable — fall back to the local directory below.
  }

  if (botReply) appendMessage(botReply, "bot");

  const asksForRoute = /route|train|suggest|alternate|reach|go(?:ing)? to/i.test(message);

  let destination = to;
  if (!destination) {
    const m = message.match(/(?:to|for|reach)\s+([a-zA-Z\s]{3,})$/i);
    if (m) destination = m[1].trim().replace(/[?.!]+$/, "");
  }

  if (destination) {
    // A destination is set — always back the reply with real results
    // (live backend if one's configured, directory otherwise).
    const { matches, note } = await searchDirectoryForDestination(destination);
    appendTrainResultsToChat(matches, note, destination);
  } else if (asksForRoute || !botReply) {
    appendMessage('Tell me a destination — e.g. "trains to Bhopal", or fill in the "To" field above — and I\'ll list trains that actually go there.', "bot");
  }
}

// ---- init ----
loadQueue();
setInterval(loadQueue, 5000);
