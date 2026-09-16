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
    lastWatchedStatus = null;
    document.getElementById("claimPanel").hidden = true;

    trackTrainBtn.disabled = true;
    trackMsg.textContent = "Loading live queue…";
    trackMsg.className = "track-msg";

    await loadQueue();

    saveRecentTrain({
      number: TRAIN_NUMBER,
      name: trainNameInput.value.trim(),
      from: fromStationInput.value.trim(),
      to: toStationInput.value.trim(),
      departure: departureInput.value,
    });

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
        <div class="board-row ${p.pnr === watchedPnr ? "is-me" : ""}" data-id="${p._id}">
          <span class="rank-badge ${i === 0 && !destinationFilter ? "next" : ""}">${i === 0 && !destinationFilter ? "NEXT" : "#" + (i + 1)}</span>
          <span>${p.name}</span>
          <span class="pnr hide-sm">${p.pnr}</span>
          <span class="status-${p.status}">${p.waitlistStatus}</span>
          <span class="hide-sm">${p.boardingStation} → ${p.destinationStation}</span>
        </div>`
      )
      .join("");
  }

  updateWatchBanner();

  // The berth is always offered to the true first-in-line passenger for the
  // whole train, regardless of which destination the viewer is filtering by.
  flipTo("flapName", latestQueue[0].name);
  flipTo("flapStatus", "Waiting · " + latestQueue[0].waitlistStatus);
}

// ---- Last updated + manual refresh ----
const lastUpdatedText = document.getElementById("lastUpdatedText");
const refreshNowBtn = document.getElementById("refreshNowBtn");

function updateLastUpdatedText() {
  if (!lastUpdatedText) return;
  lastUpdatedText.textContent = TRAIN_NUMBER
    ? `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : "Not loaded yet";
}

if (refreshNowBtn) {
  refreshNowBtn.addEventListener("click", () => loadQueue());
}

// ---- Track my PNR — highlights their row and alerts them when it's their turn ----
let watchedPnr = "";
let lastWatchedStatus = null;
const watchPnrInput = document.getElementById("watchPnrInput");
const watchPnrBtn = document.getElementById("watchPnrBtn");
const watchPnrBanner = document.getElementById("watchPnrBanner");
const notifyPermBtn = document.getElementById("notifyPermBtn");

if (watchPnrBtn) {
  watchPnrBtn.addEventListener("click", () => {
    watchedPnr = watchPnrInput.value.trim();
    lastWatchedStatus = null;
    watchPnrBtn.textContent = watchedPnr ? "Watching" : "Watch";
    renderQueue();
  });
}

if (notifyPermBtn) {
  notifyPermBtn.addEventListener("click", () => {
    if (!("Notification" in window)) {
      alert("Browser notifications aren't supported here.");
      return;
    }
    Notification.requestPermission().then((perm) => {
      notifyPermBtn.textContent = perm === "granted" ? "🔔 Alerts on" : "🔔 Enable alerts";
    });
  });
}

// A short two-tone beep, generated on the fly — no audio file needed.
function playAlertTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1174].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.start(start);
      osc.stop(start + 0.17);
    });
  } catch (err) {
    // Audio not available in this context — silently skip.
  }
}

function updateWatchBanner() {
  if (!watchPnrBanner) return;
  if (!watchedPnr) {
    watchPnrBanner.hidden = true;
    return;
  }

  const p = latestQueue.find((x) => x.pnr === watchedPnr);
  watchPnrBanner.hidden = false;

  if (!p) {
    watchPnrBanner.className = "watch-banner";
    watchPnrBanner.textContent = TRAIN_NUMBER
      ? `PNR ${watchedPnr} isn't in this train's current queue.`
      : "Track a train first, then I'll watch this PNR for you.";
    return;
  }

  const rank = latestQueue.indexOf(p) + 1;
  const statusClass = p.status.toLowerCase();
  watchPnrBanner.className = `watch-banner ${statusClass}`;

  const labels = {
    WAITING: `You're #${rank} in the queue (${p.waitlistStatus}) — still waiting.`,
    NOTIFIED: `🎉 It's your turn! Seat ${p.seatAssigned || ""} has been offered — claim it below before the timer runs out.`,
    CONFIRMED: `✅ Your seat is confirmed!`,
    EXPIRED: `⚠️ Your claim window expired — you've moved back in the queue.`,
  };
  watchPnrBanner.textContent = labels[p.status] || `Status: ${p.waitlistStatus}`;

  if (p.status === "NOTIFIED" && lastWatchedStatus !== "NOTIFIED") {
    playAlertTone();
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Your berth is ready!", { body: `Seat ${p.seatAssigned || ""} — claim it before the timer runs out.` });
    }
  }
  lastWatchedStatus = p.status;
}

// ---- Recently tracked trains ----
const RECENT_TRAINS_KEY = "wait2seat.recentTrains";

function getRecentTrains() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_TRAINS_KEY)) || [];
  } catch (err) {
    return [];
  }
}

function saveRecentTrain(entry) {
  try {
    let list = getRecentTrains().filter((t) => t.number !== entry.number);
    list.unshift(entry);
    list = list.slice(0, 5);
    localStorage.setItem(RECENT_TRAINS_KEY, JSON.stringify(list));
    renderRecentTrains();
  } catch (err) {
    // localStorage unavailable — skip silently, not essential to core function.
  }
}

function renderRecentTrains() {
  const container = document.getElementById("recentTrains");
  if (!container) return;
  const list = getRecentTrains();
  if (!list.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML =
    `<span class="recent-trains-label">Recent:</span> ` +
    list
      .map((t) => `<button type="button" class="recent-chip" data-train-number="${t.number}">${t.number} · ${t.name || "Untitled"}</button>`)
      .join("");
  container.querySelectorAll(".recent-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = list.find((x) => x.number === btn.dataset.trainNumber);
      if (!t) return;
      trainNumberInput.value = t.number;
      trainNameInput.value = t.name || "";
      fromStationInput.value = t.from || "";
      toStationInput.value = t.to || "";
      if (departureInput) departureInput.value = t.departure || "";
      trackTrainBtn.click();
    });
  });
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
  updateLastUpdatedText();
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

  let passenger = null;
  try {
    const res = await fetch(`/api/trains/${TRAIN_NUMBER}/berth-freed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatLabel }),
    });
    if (res.ok) {
      const data = await res.json();
      passenger = data.passenger || null;
    }
  } catch (err) {
    // No live backend for this train — fall back to offering it locally, below.
  }

  if (!passenger) {
    // Offer the freed berth to the actual first waiting passenger in the queue.
    passenger = latestQueue.find((p) => p.status === "WAITING") || null;
    if (passenger) {
      passenger.status = "NOTIFIED";
      passenger.seatAssigned = seatLabel;
    }
  }

  if (passenger) {
    flipTo("flapSeat", passenger.seatAssigned);
    flipTo("flapStatus", "Offer sent");
    showClaimPanel(passenger);
    renderQueue();
    highlightRow(passenger._id);
  } else {
    alert("No one is waiting.");
  }
});

// ---- Claim panel + 200-second countdown ----
// Runs entirely client-side with setInterval, so the 200s window always
// works reliably even when there's no backend to poll for remaining time.
const CLAIM_WINDOW_SECONDS = 200;
let claimSecondsLeft = 0;

function showClaimPanel(passenger) {
  activeClaimId = passenger._id;
  const panel = document.getElementById("claimPanel");
  panel.hidden = false;
  document.getElementById("claimText").textContent =
    `${passenger.name} (${passenger.waitlistStatus}) — seat ${passenger.seatAssigned}`;
  document.getElementById("claimResult").textContent = "";

  const countdownEl = document.getElementById("countdown");
  countdownEl.classList.remove("danger");
  claimSecondsLeft = CLAIM_WINDOW_SECONDS;
  countdownEl.textContent = claimSecondsLeft;

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(tickCountdown, 1000);
}

function tickCountdown() {
  claimSecondsLeft -= 1;
  const el = document.getElementById("countdown");
  el.textContent = Math.max(claimSecondsLeft, 0);
  el.classList.toggle("danger", claimSecondsLeft <= 20 && claimSecondsLeft > 0);

  if (claimSecondsLeft <= 0) {
    clearInterval(countdownTimer);
    const p = latestQueue.find((x) => x._id === activeClaimId);
    if (p) p.status = "EXPIRED";
    document.getElementById("claimResult").textContent = "Claim window expired — offer passed to next in queue.";
    document.getElementById("claimResult").style.color = "var(--red-alert)";
    flipTo("flapStatus", "Expired · next up");
    renderQueue();
  }
}

document.getElementById("claimBtn").addEventListener("click", async () => {
  if (!activeClaimId) return;
  const resultEl = document.getElementById("claimResult");

  let success = false;
  let message = "";

  try {
    const res = await fetch(`/api/passengers/${activeClaimId}/claim`, { method: "POST" });
    if (res.ok) {
      const result = await res.json();
      success = !!result.success;
      message = result.message;
    }
  } catch (err) {
    // No live backend for this — confirm it locally below.
  }

  if (!message) {
    const p = latestQueue.find((x) => x._id === activeClaimId);
    if (p) p.status = "CONFIRMED";
    success = true;
    message = "Seat confirmed!";
  }

  resultEl.textContent = message;
  resultEl.style.color = success ? "var(--green)" : "var(--red-alert)";
  if (success) {
    clearInterval(countdownTimer);
    flipTo("flapStatus", "Confirmed");
    renderQueue();
  }
});

// ---- AI travel assistant ----
const BOT_AVATAR_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></svg>`;

function appendChatNode(node, sender) {
  const win = document.getElementById("chatWindow");
  const row = document.createElement("div");
  row.className = `msg-row ${sender}`;
  const avatar = document.createElement("span");
  avatar.className = `msg-avatar ${sender === "bot" ? "bot-avatar-sm" : "user-avatar-sm"}`;
  avatar.innerHTML = sender === "bot" ? BOT_AVATAR_SVG : "You";
  if (sender === "bot") {
    row.appendChild(avatar);
    row.appendChild(node);
  } else {
    row.appendChild(node);
    row.appendChild(avatar);
  }
  win.appendChild(row);
  win.scrollTop = win.scrollHeight;
}

function appendMessage(text, sender) {
  const bubble = document.createElement("div");
  bubble.className = `msg ${sender}`;
  bubble.textContent = text;
  appendChatNode(bubble, sender);
}

function appendTrainResultsToChat(matches, note, destination) {
  const wrap = document.createElement("div");
  wrap.className = "msg bot chat-trains";

  if (!matches.length) {
    wrap.innerHTML = `<p>No trains found to "${destination}" in our directory yet — try a nearby major station.</p>`;
    appendChatNode(wrap, "bot");
    return;
  }

  const noteHtml = note ? `<p class="search-note">${note}</p>` : `<p>Found ${matches.length} train${matches.length > 1 ? "s" : ""} to ${destination}:</p>`;
  wrap.innerHTML = noteHtml + matches.map((t, i) => buildTrainCardHtml(t, `chatwl-${i}-${t.number}`)).join("");
  appendChatNode(wrap, "bot");
  matches.forEach((t, i) => attachLiveWaitlist(t.number, `chatwl-${i}-${t.number}`));
}

// Understands real questions about the train currently being tracked,
// answered from this app's own live state — not guesses.
function detectIntent(message) {
  const m = message.toLowerCase();
  if (/\bpnr\b/.test(m)) return "pnr";
  if (/berth|seat/.test(m)) return "berth";
  if (/how many|queue length|total (waiting|passengers)|people waiting/.test(m)) return "queue-count";
  if (/who.?s next|next up|next passenger/.test(m)) return "next-up";
  if (/\bstatus\b/.test(m)) return "status";
  if (/depart|arriv|what time|when does/.test(m)) return "timing";
  if (/\broute\b|\bvia\b|stops?|stations? (on|along)/.test(m)) return "route";
  return null;
}

function answerPnr(message) {
  const match = message.match(/pnr\D*(\d{4,10})/i);
  if (!match) return 'Share the PNR number too, e.g. "PNR 4507839216".';
  const pnr = match[1];
  const p = latestQueue.find((x) => x.pnr === pnr);
  if (!p) return TRAIN_NUMBER ? `I couldn't find PNR ${pnr} in train ${TRAIN_NUMBER}'s current queue.` : "Track a train first so I can look up PNRs in its queue.";
  const rank = latestQueue.indexOf(p) + 1;
  return `PNR ${pnr}: ${p.name}, ${p.waitlistStatus} (rank #${rank} in queue), ${p.boardingStation} → ${p.destinationStation}.`;
}

function answerBerth() {
  if (!TRAIN_NUMBER) return "Track a train first, then I can tell you about berth offers.";
  const seatText = document.getElementById("flapSeat").textContent;
  return seatText && seatText !== "— —" ? `The most recently offered berth is ${seatText}.` : "No berth has been offered yet on this train.";
}

function answerQueueCount() {
  if (!TRAIN_NUMBER) return "Track a train first so I can check its queue.";
  if (lastLoadFailed) return `I couldn't reach live data for train ${TRAIN_NUMBER} just now.`;
  const counts = { WAITING: 0, NOTIFIED: 0, CONFIRMED: 0, EXPIRED: 0 };
  latestQueue.forEach((p) => { if (counts[p.status] !== undefined) counts[p.status] += 1; });
  return `Train ${TRAIN_NUMBER} has ${latestQueue.length} passenger(s) in the queue — ${counts.WAITING} waiting, ${counts.NOTIFIED} notified, ${counts.CONFIRMED} confirmed, ${counts.EXPIRED} expired.`;
}

function answerNextUp() {
  if (!TRAIN_NUMBER) return "Track a train first, then I can tell you who's next in line.";
  if (!latestQueue.length) return `No one is currently waiting on train ${TRAIN_NUMBER}.`;
  return `${latestQueue[0].name} (${latestQueue[0].waitlistStatus}) is next in line.`;
}

function answerStatus() {
  if (!TRAIN_NUMBER) return "Track a train first and I'll tell you its live status.";
  return document.getElementById("flapStatus").textContent;
}

function answerTiming() {
  const dep = departureInput ? departureInput.value : "";
  const arr = arrivalInput ? arrivalInput.value : "";
  if (!dep && !arr) return "Departure/arrival time hasn't been set — add it in the setup bar above.";
  return `Departs ${dep || "--:--"} · Arrives ${arr || "--:--"}.`;
}

function answerRoute() {
  const from = fromStationInput ? fromStationInput.value.trim() : "";
  const to = toStationInput ? toStationInput.value.trim() : "";
  if (!from && !to) return "The route hasn't been set yet — fill in From/To in the setup bar above.";
  return `This train runs from ${from || "—"} to ${to || "—"}.`;
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

  const intentAnswers = {
    pnr: answerPnr,
    berth: answerBerth,
    "queue-count": answerQueueCount,
    "next-up": answerNextUp,
    status: answerStatus,
    timing: answerTiming,
    route: answerRoute,
  };

  const intent = detectIntent(message);
  if (intent) {
    appendMessage(intentAnswers[intent](message), "bot");
    return;
  }

  let destination = document.getElementById("toInput").value.trim();
  if (!destination) {
    const m = message.match(/(?:to|for|reach)\s+([a-zA-Z\s]{3,})$/i);
    if (m) destination = m[1].trim().replace(/[?.!]+$/, "");
  }

  if (destination) {
    const { matches, note } = await searchDirectoryForDestination(destination);
    appendTrainResultsToChat(matches, note, destination);
    return;
  }

  const from = document.getElementById("fromInput").value.trim();
  let botReply = null;
  try {
    const res = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, from, to: destination }),
    });
    if (res.ok) {
      const data = await res.json();
      botReply = data.reply;
    }
  } catch (err) {
    // No live chatbot backend reachable — fall back to the help message below.
  }

  appendMessage(
    botReply ||
      'I can answer things like "what\'s my berth", "how many are waiting", "who\'s next", "when does it depart", "trains to Bhopal", or "PNR 4507839216".',
    "bot"
  );
}

// ---- init ----
renderRecentTrains();
loadQueue();
setInterval(loadQueue, 5000);
